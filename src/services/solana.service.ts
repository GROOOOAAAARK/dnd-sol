"use client"

import { BorshAccountsCoder } from "@coral-xyz/anchor"
import { Connection, PublicKey } from "@solana/web3.js"
import type { Character } from "@/models/types"
import DndSolIDL from "@/idl/dnd_sol.json"

export function useSolanaService() {
  const getCharacters = async (connection: Connection): Promise<Character[]> => {
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

