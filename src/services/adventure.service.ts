"use client"

import type { Adventure } from "@/models/types"
import { useIndexedDBService } from "@/services/indexed-db.service"
import type { AdventureStep } from "@/models/types"

export function useAdventureService() {
  const dbService = useIndexedDBService()
  const STORE_NAME = "adventures"
  const API_ENDPOINT = "/api/adventures"

  const getAvailableAdventures = async (): Promise<Adventure[]> => {
    try {
      // Try to get from IndexedDB first
      const adventures = await dbService.getAll<Adventure>(STORE_NAME)

      if (adventures && adventures.length > 0) {
        return adventures.filter((adv) => !adv.hasOwnProperty("inProgress"))
      }

      // Fallback to API
      const response = await fetch(`${API_ENDPOINT}/available`)
      if (!response.ok) {
        throw new Error("Failed to fetch available adventures from API")
      }

      const data = await response.json()

      // Store in IndexedDB for future use
      await Promise.all(data.map((adventure: Adventure) => dbService.add(STORE_NAME, adventure)))

      return data
    } catch (error) {
      console.error("Error fetching available adventures:", error)
      return []
    }
  }

  const getOngoingAdventures = async (): Promise<Adventure[]> => {
    try {
      // Try to get from IndexedDB first
      const adventures = await dbService.getAll<Adventure & { inProgress?: boolean }>(STORE_NAME)

      if (adventures && adventures.length > 0) {
        return adventures.filter((adv) => adv.inProgress === true)
      }

      // Fallback to API
      const response = await fetch(`${API_ENDPOINT}/ongoing`)
      if (!response.ok) {
        throw new Error("Failed to fetch ongoing adventures from API")
      }

      const data = await response.json()

      // Store in IndexedDB for future use
      await Promise.all(
        data.map((adventure: Adventure) => dbService.add(STORE_NAME, { ...adventure, inProgress: true })),
      )

      return data
    } catch (error) {
      console.error("Error fetching ongoing adventures:", error)
      return []
    }
  }

  const getAdventure = async (id: string): Promise<Adventure | null> => {
    try {
      // Try to get from IndexedDB first
      const adventure = await dbService.get<Adventure>(STORE_NAME, id)

      if (adventure) {
        return adventure
      }

      // Fallback to API
      const response = await fetch(`${API_ENDPOINT}/${id}`)
      if (!response.ok) {
        throw new Error("Failed to fetch adventure from API")
      }

      const data = await response.json()

      // Store in IndexedDB for future use
      await dbService.add(STORE_NAME, data)

      return data
    } catch (error) {
      console.error("Error fetching adventure:", error)
      return null
    }
  }

  const getFirstStep = async (adventureId: string): Promise<AdventureStep | null> => {
    try {
      // Call the API to get the first step
      const response = await fetch(`${API_ENDPOINT}/${adventureId}/steps/first`)
      if (!response.ok) {
        throw new Error("Failed to fetch first game step from API")
      }

      const data = await response.json()

      return data
    } catch (error) {
      console.error("Error fetching first game step:", error)
      return null
    }
  }

  const getCurrentStep = async (adventureId: string): Promise<AdventureStep | null> => {
    try {
      // Try to get from IndexedDB first
      const key = `${adventureId}_current`
      const step = await dbService.get<AdventureStep>(STORE_NAME, key)

      if (step) {
        return step
      }

      // Fallback to API
      const response = await fetch(`${API_ENDPOINT}/${adventureId}/current`)
      if (!response.ok) {
        throw new Error("Failed to fetch current game step from API")
      }

      const data = await response.json()

      // Store in IndexedDB for future use
      await dbService.add(STORE_NAME, { ...data, id: key })

      return data
    } catch (error) {
      console.error("Error fetching current game step:", error)
      return null
    }
  }

  const getNextStep = async (adventureId: string, stepId: string): Promise<AdventureStep | null> => {
    try {
      // Call the API to get the next step
      const response = await fetch(`${API_ENDPOINT}/${adventureId}/steps/${stepId}`, {
        method: "GET",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch next game step from API")
      }

      const data = await response.json()

      // Update the current step in IndexedDB
      const key = `${adventureId}_current`
      await dbService.put(STORE_NAME, { ...data, id: key })

      return data
    } catch (error) {
      console.error("Error fetching next game step:", error)
      return null
    }
  }

  return {
    getAvailableAdventures,
    getOngoingAdventures,
    getAdventure,
    getFirstStep,
    getCurrentStep,
    getNextStep,
  }
}
