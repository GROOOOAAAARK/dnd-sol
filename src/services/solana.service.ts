"use client"

import { BorshAccountsCoder } from "@coral-xyz/anchor"
import { Connection, PublicKey } from "@solana/web3.js"
import type { Character } from "@/models/types"
import DndSolIDL from "@/idl/dnd_sol.json"

export function useSolanaService() {
  const { connection } = useConnection()
  const wallet = useAnchorWallet()
  const { selectedCharacter } = useCharacterStore()

  // Create provider and program only when wallet is available
  const program = useMemo(() => {
    if (!wallet) return null
    const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions())
    return new Program(DndSolIDL, provider)
  }, [connection, wallet])

  const createCharacter = async (character: Character): Promise<void> => {
    if (!wallet || !program) {
      throw new Error("Wallet not connected")
    }
    try {
      const characterKp = new Keypair();

      await program.methods.createCharacter(
        character.name,
        character.character_class,
        character.race,
        character.stats.strength,
        character.stats.dexterity,
        character.stats.constitution,
        character.stats.intelligence,
        character.stats.wisdom,
        character.stats.charisma
      ).accounts({
        player: wallet.publicKey,
        character: characterKp.publicKey,
        systemProgram: SystemProgram.programId,
      }).signers([characterKp]).rpc();
    } catch (error) {
      console.error("Failed to create character:", error)
      throw error
    }
  }

  const getCharacters = async (): Promise<Character[]> => {
    if (!wallet || !program) {
      throw new Error("Wallet not connected")
    }
    try {

      // Create a coder to decode the account data
      const coder = new BorshAccountsCoder(DndSolIDL as any)

      // Get all program accounts (this will return raw data for custom programs)
      const accountsResponse = await connection.getProgramAccounts(
        new PublicKey(process.env.NEXT_PUBLIC_DND_PROGRAM_ADDRESS!),
        {
          commitment: "confirmed",
        },
      )

      // Decode each account
      const decodedCharacters = accountsResponse.map((accountInfo) => {
        try {
          // The account data is in accountInfo.account.data (Buffer)
          const decoded = coder.decode("CharacterAccount", accountInfo.account.data)

          // Parse the decoded data into your Character format
          return {
            id: accountInfo.pubkey.toString(),
            name: decoded.character.attributes.name,
            race: decoded.character.attributes.race,
            character_class: decoded.character.attributes.class,
            level: decoded.character.attributes.level,
            experience: decoded.character.attributes.experience,
            stats: {
              strength: decoded.character.stats.strength,
              dexterity: decoded.character.stats.dexterity,
              constitution: decoded.character.stats.constitution,
              intelligence: decoded.character.stats.intelligence,
              wisdom: decoded.character.stats.wisdom,
              charisma: decoded.character.stats.charisma,
            },
            player: decoded.player.toString(),
          }
        } catch (decodeError) {
          console.error("Failed to decode account:", decodeError)
          return null
        }
      }).filter((char): char is NonNullable<typeof char> => char !== null)

      console.log("Decoded characters from blockchain:", decodedCharacters)
      return decodedCharacters
    } catch (error) {
      console.error("Failed to fetch characters from blockchain:", error)
      return []
    }
  }

  return {
    getCharacters,
  }
}

