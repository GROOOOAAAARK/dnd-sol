"use client"

import { BorshAccountsCoder, Program } from "@coral-xyz/anchor"
import { PublicKey, SystemProgram, SYSVAR_SLOT_HASHES_PUBKEY, Transaction } from "@solana/web3.js"
import type { Character, DiceResult } from "@/models/types"
import DndSolIDL from "@/idl/dnd_sol.json"
import DiceRollIDL from "@/idl/dice_rolling.json"
import { useAnchorWallet } from "@solana/wallet-adapter-react"
import { useCharacterStore } from "@/stores/selectedCharacter.store"
import { useAnchorProvider } from "@/hooks/useAnchorProvider"
import { useConnection } from "@solana/wallet-adapter-react"
import { useMemo } from "react"
import * as switchboard from "@switchboard-xyz/on-demand"
import bs58 from "bs58"

const randomnessStorageKey = (characterId: string) => `dnd-randomness:${characterId}`
const REVEAL_RETRY_BACKOFF_MS = 1500
const LOCALNET_RANDOMNESS_PLACEHOLDER = "localnet-mock"
const isLocalnet = process.env.NEXT_PUBLIC_SOLANA_CLUSTER === "localnet"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function useSolanaService() {
  const { connection } = useConnection()
  const wallet = useAnchorWallet()
  const provider = useAnchorProvider()
  const { selectedCharacter } = useCharacterStore()
  const dndSolProgramId = new PublicKey(process.env.NEXT_PUBLIC_DND_PROGRAM_ADDRESS!)
  const diceRollingProgramId = new PublicKey(process.env.NEXT_PUBLIC_DICE_ROLLING_PROGRAM_ADDRESS!)

  const program = useMemo(() => {
    if (!provider) return null
    return new Program(DndSolIDL as any, provider)
  }, [provider])

  const diceRollProgram = useMemo(() => {
    if (!provider) return null
    return new Program(DiceRollIDL as any, provider)
  }, [provider])

  const getDiceRollingStatePda = () => {
    if (!wallet) {
      throw new Error("Wallet not connected")
    }
    return PublicKey.findProgramAddressSync(
      [Buffer.from("dice_rolling"), wallet.publicKey.toBuffer()],
      diceRollingProgramId,
    )[0]
  }

  const ensureDiceRollingState = async () => {
    if (!wallet || !diceRollProgram) {
      throw new Error("Wallet not connected")
    }

    const diceRollingStatePda = getDiceRollingStatePda()
    const existing = await connection.getAccountInfo(diceRollingStatePda)
    if (existing) {
      return diceRollingStatePda
    }

    await diceRollProgram.methods
      .initialize()
      .accounts({
        diceRolling: diceRollingStatePda,
        user: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc()

    return diceRollingStatePda
  }

  const getSwitchboardContext = async () => {
    if (!provider) {
      throw new Error("Wallet not connected")
    }

    let switchboardProgramId: PublicKey
    let queue: PublicKey
    let randomnessGatewayUrl: string | undefined

    switchboardProgramId = process.env.NEXT_PUBLIC_SWITCHBOARD_PROGRAM_ADDRESS
      ? new PublicKey(process.env.NEXT_PUBLIC_SWITCHBOARD_PROGRAM_ADDRESS)
      : await switchboard.getProgramId(connection)
    queue = process.env.NEXT_PUBLIC_SWITCHBOARD_QUEUE_ADDRESS
      ? new PublicKey(process.env.NEXT_PUBLIC_SWITCHBOARD_QUEUE_ADDRESS)
      : switchboard.ON_DEMAND_DEVNET_QUEUE
    randomnessGatewayUrl = process.env.NEXT_PUBLIC_SWITCHBOARD_CROSSBAR_URL

    const switchboardProgram = await switchboard.AnchorUtils.loadProgramFromProvider(
      provider,
      switchboardProgramId,
    )

    return {
      Randomness: switchboard.Randomness,
      queue,
      switchboardProgram,
      randomnessGatewayUrl,
    }
  }

  const buildRevealRandomnessIx = async (
    randomness: switchboard.Randomness,
    payer: PublicKey,
    randomnessGatewayUrl?: string,
  ) => {
    if (!randomnessGatewayUrl) {
      return randomness.revealIx(payer)
    }

    const data = await randomness.loadData()
    const gateway = new switchboard.Gateway(randomnessGatewayUrl)
    const gatewayRevealResponse = await gateway.fetchRandomnessReveal({
      randomnessAccount: randomness.pubkey,
      slothash: bs58.encode(data.seedSlothash),
      slot: data.seedSlot.toNumber(),
      rpc: connection.rpcEndpoint,
    })
    const stats = PublicKey.findProgramAddressSync(
      [Buffer.from("OracleRandomnessStats"), data.oracle.toBuffer()],
      randomness.program.programId,
    )[0]

    return randomness.program.instruction.randomnessReveal(
      {
        signature: Buffer.from(gatewayRevealResponse.signature, "base64"),
        recoveryId: gatewayRevealResponse.recovery_id,
        value: gatewayRevealResponse.value,
      },
      {
        accounts: {
          randomness: randomness.pubkey,
          oracle: data.oracle,
          queue: data.queue,
          stats,
          authority: data.authority,
          payer,
          recentSlothashes: switchboard.SPL_SYSVAR_SLOT_HASHES_ID,
          systemProgram: SystemProgram.programId,
          rewardEscrow: switchboard.getAssociatedTokenAddressSync(
            switchboard.SOL_NATIVE_MINT,
            randomness.pubkey,
          ),
          tokenProgram: switchboard.SPL_TOKEN_PROGRAM_ID,
          associatedTokenProgram: switchboard.SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
          wrappedSolMint: switchboard.SOL_NATIVE_MINT,
          programState: switchboard.State.keyFromSeed(randomness.program),
        },
      },
    )
  }

  const persistRandomnessAccount = (characterId: string, randomnessAccount: string) => {
    sessionStorage.setItem(randomnessStorageKey(characterId), randomnessAccount)
  }

  const readRandomnessAccount = (characterId: string): string | null => {
    return sessionStorage.getItem(randomnessStorageKey(characterId))
  }

  const clearRandomnessAccount = (characterId: string) => {
    sessionStorage.removeItem(randomnessStorageKey(characterId))
  }

  const createCharacter = async (character: Character): Promise<void> => {
    if (!wallet || !program) {
      throw new Error("Wallet not connected")
    }

    const [characterAccountPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("character"), wallet.publicKey.toBuffer(), Buffer.from(character.name)],
      dndSolProgramId,
    )

    await program.methods
      .createCharacter(
        character.name,
        character.character_class,
        character.race,
        character.stats.strength,
        character.stats.dexterity,
        character.stats.constitution,
        character.stats.intelligence,
        character.stats.wisdom,
        character.stats.charisma,
      )
      .accounts({
        player: wallet.publicKey,
        character: characterAccountPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc()
  }

  const getCharacters = async (): Promise<Character[]> => {
    if (!wallet || !program) {
      throw new Error("Wallet not connected")
    }

    const coder = new BorshAccountsCoder(DndSolIDL as any)
    const accountsResponse = await connection.getProgramAccounts(dndSolProgramId, {
      commitment: "confirmed",
    })

    const decodedCharacters = accountsResponse.map((accountInfo) => {
      try {
        const decoded = coder.decode("CharacterAccount", accountInfo.account.data)
        const player = decoded.player.toBase58()

        if (player !== wallet.publicKey.toBase58()) {
          return null
        }

        const getEnumVariant = (enumObj: any): string => {
          if (typeof enumObj === "string") return enumObj
          if (typeof enumObj === "object" && enumObj !== null) {
            const keys = Object.keys(enumObj)
            return keys[0] || ""
          }
          return String(enumObj)
        }

        const character: Character = {
          id: accountInfo.pubkey.toString(),
          name: String(decoded.character.attributes.name),
          race: getEnumVariant(decoded.character.attributes.race),
          character_class: getEnumVariant(decoded.character.attributes.class),
          level: Number(decoded.character.attributes.level),
          experience: Number(decoded.character.attributes.experience),
          stats: {
            strength: Number(decoded.character.stats.strength),
            dexterity: Number(decoded.character.stats.dexterity),
            constitution: Number(decoded.character.stats.constitution),
            intelligence: Number(decoded.character.stats.intelligence),
            wisdom: Number(decoded.character.stats.wisdom),
            charisma: Number(decoded.character.stats.charisma),
          },
        }

        return character
      } catch (decodeError) {
        console.error("Failed to decode account:", decodeError)
        return null
      }
    })

    return decodedCharacters.filter((character): character is Character => character !== null)
  }

  const doAction = async (diceSize: number, successFloor: number, bonus: number): Promise<void> => {
    if (!wallet || !program || !provider) {
      throw new Error("Wallet not connected")
    }
    if (!selectedCharacter?.id) {
      throw new Error("No selected character")
    }

    const diceRollingStatePda = await ensureDiceRollingState()

    if (isLocalnet) {
      const actionIx = await program.methods
        .doAction(diceSize, successFloor, bonus)
        .accounts({
          player: wallet.publicKey,
          character: new PublicKey(selectedCharacter.id),
          diceRollingState: diceRollingStatePda,
          randomnessAccountData: SYSVAR_SLOT_HASHES_PUBKEY,
          diceRollingProgram: diceRollingProgramId,
        })
        .instruction()

      await provider.sendAndConfirm(new Transaction().add(actionIx), [])
      persistRandomnessAccount(selectedCharacter.id, LOCALNET_RANDOMNESS_PLACEHOLDER)
      return
    }

    const { Randomness, queue, switchboardProgram } = await getSwitchboardContext()
    const [randomness, randomnessKeypair, randomnessIxs] = await Randomness.createAndCommitIxs(
      switchboardProgram,
      queue,
      wallet.publicKey,
    )

    const actionIx = await program.methods
      .doAction(diceSize, successFloor, bonus)
      .accounts({
        player: wallet.publicKey,
        character: new PublicKey(selectedCharacter.id),
        diceRollingState: diceRollingStatePda,
        randomnessAccountData: randomness.pubkey,
        diceRollingProgram: diceRollingProgramId,
      })
      .instruction()

    await provider.sendAndConfirm(
      new Transaction().add(...randomnessIxs, actionIx),
      [randomnessKeypair],
    )

    persistRandomnessAccount(selectedCharacter.id, randomness.pubkey.toBase58())
  }

  const revealActionResult = async (): Promise<DiceResult> => {
    if (!wallet || !program || !diceRollProgram || !provider) {
      throw new Error("Wallet not connected")
    }
    if (!selectedCharacter?.id) {
      throw new Error("No selected character")
    }

    const randomnessAccount = readRandomnessAccount(selectedCharacter.id)
    if (!randomnessAccount) {
      throw new Error("No pending randomness account for selected character")
    }

    const diceRollingStatePda = getDiceRollingStatePda()
    const characterPk = new PublicKey(selectedCharacter.id)

    if (isLocalnet) {
      const revealActionIx = await program.methods.revealActionResult().accounts({
        character: characterPk,
        player: wallet.publicKey,
        diceRollingState: diceRollingStatePda,
        randomnessAccountData: SYSVAR_SLOT_HASHES_PUBKEY,
        diceRollingProgram: diceRollingProgramId,
      }).instruction()

      await provider.sendAndConfirm(new Transaction().add(revealActionIx), [])

      const diceState = await (diceRollProgram as any).account.diceRollingState.fetch(diceRollingStatePda)
      clearRandomnessAccount(selectedCharacter.id)

      const rawResult = Number(diceState.latestRollResult)
      const bonus = Number(diceState.bonus)
      const successFloor = Number(diceState.successFloor)
      const diceSize = Number(diceState.diceSize)

      console.debug("Dice rolling result:\n raw_result: ", rawResult, "\nbonus: ", bonus, "\ncritical_success: ", rawResult === diceSize, "\ncritical_failure: ", rawResult === 1)

      return {
        raw_result: rawResult,
        bonus,
        success: rawResult + bonus >= successFloor,
        critical_success: rawResult === diceSize,
        critical_failure: rawResult === 1,
      }
    }

    const { Randomness, switchboardProgram, randomnessGatewayUrl } = await getSwitchboardContext()
    const randomness = new Randomness(switchboardProgram, new PublicKey(randomnessAccount))

    const revealActionIx = await program.methods.revealActionResult().accounts({
      character: characterPk,
      player: wallet.publicKey,
      diceRollingState: diceRollingStatePda,
      randomnessAccountData: randomness.pubkey,
      diceRollingProgram: diceRollingProgramId,
    }).instruction()

    let lastError: unknown
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const revealRandomnessIx = await buildRevealRandomnessIx(
          randomness,
          wallet.publicKey,
          randomnessGatewayUrl,
        )
        await provider.sendAndConfirm(
          new Transaction().add(revealRandomnessIx, revealActionIx),
          [],
        )

        const diceState = await (diceRollProgram as any).account.diceRollingState.fetch(diceRollingStatePda)
        clearRandomnessAccount(selectedCharacter.id)

        const rawResult = Number(diceState.latestRollResult)
        const bonus = Number(diceState.bonus)
        const successFloor = Number(diceState.successFloor)
        const diceSize = Number(diceState.diceSize)

        return {
          raw_result: rawResult,
          bonus,
          success: rawResult + bonus >= successFloor,
          critical_success: rawResult === diceSize,
          critical_failure: rawResult === 1,
        }
      } catch (error) {
        lastError = error
        await sleep(REVEAL_RETRY_BACKOFF_MS)
      }
    }

    throw lastError
  }

  const performDiceAction = async (
    diceSize: number,
    successFloor: number,
    bonus: number,
  ): Promise<DiceResult> => {
    await doAction(diceSize, successFloor, bonus)
    return revealActionResult()
  }

  return {
    createCharacter,
    getCharacters,
    performDiceAction,
  }
}
