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

          // Helper function to extract enum variant name
          const getEnumVariant = (enumObj: any): string => {
            if (typeof enumObj === 'string') return enumObj
            if (typeof enumObj === 'object' && enumObj !== null) {
              const keys = Object.keys(enumObj)
              return keys[0] || ''
            }
            return String(enumObj)
          }

          // Parse the decoded data into your Character format
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

      const validCharacters = decodedCharacters.filter((character): character is Character => character !== null)
      return validCharacters
    } catch (error) {
      console.error("Failed to fetch characters from blockchain:", error)
      return []
    }
  }

  return {
    getCharacters,
  }
}

