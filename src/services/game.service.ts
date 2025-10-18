"use client"

import type { GameAction, Character, CharacterStats } from "@/models/types"
import { useIndexedDBService } from "@/services/indexed-db.service"

export function useGameService() {
  const dbService = useIndexedDBService()
  const STORE_NAME = "gameSteps"
  const API_ENDPOINT = "/api/game"

  const verifyRequirements = async (action: GameAction, character: Character): Promise<boolean> => {


    if (stats ) {
      // assert that, for all stats in requirements, the character has the required min value
      // TODO: improvement => allow requirements to need a specific operator on stats (i.e. stupid actions for low intelligence characters)
      for (const stat in stats) {
        if (character.stats[stat as keyof CharacterStats] < stats[stat as keyof CharacterStats]!) {
          return false
        }
      }
    }

    // TODO: Check items once the character has an inventory

    return true
  }

  return {
    verifyRequirements,
  }
}
