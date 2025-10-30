"use client"

import type { Adventure } from "@/models/types"
import type { AdventureStep } from "@/models/types"

export function useAdventureService() {
  const STORE_NAME = "adventures"
  const API_ENDPOINT = "/api/adventures"

  const getAvailableAdventures = async (): Promise<Adventure[]> => {
    try {
      const response = await fetch(`${API_ENDPOINT}/available`)
      if (!response.ok) {
        throw new Error("Failed to fetch available adventures from API")
      }

      const data = await response.json()

      return data
    } catch (error) {
      console.error("Error fetching available adventures:", error)
      return []
    }
  }

  const getOngoingAdventures = async (): Promise<Adventure[]> => {
    try {
      const response = await fetch(`${API_ENDPOINT}/ongoing`)
      if (!response.ok) {
        throw new Error("Failed to fetch ongoing adventures from API")
      }

      const data = await response.json()

      return data
    } catch (error) {
      console.error("Error fetching ongoing adventures:", error)
      return []
    }
  }

  const getAdventure = async (id: string): Promise<Adventure | null> => {
    try {
      const response = await fetch(`${API_ENDPOINT}/${id}`)
      if (!response.ok) {
        throw new Error("Failed to fetch adventure from API")
      }

      const data = await response.json()

      return data
    } catch (error) {
      console.error("Error fetching adventure:", error)
      return null
    }
  }

  const getFirstStep = async (adventureId: string): Promise<AdventureStep | null> => {
    try {
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
      const response = await fetch(`${API_ENDPOINT}/${adventureId}/current`)
      if (!response.ok) {
        throw new Error("Failed to fetch current game step from API")
      }

      const data = await response.json()

      return data
    } catch (error) {
      console.error("Error fetching current game step:", error)
      return null
    }
  }

  const getNextStep = async (adventureId: string, stepId: string): Promise<AdventureStep | null> => {
    try {
      const response = await fetch(`${API_ENDPOINT}/${adventureId}/steps/${stepId}`, {
        method: "GET",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch next game step from API")
      }

      const data = await response.json()

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
