"use client";

import type {
  Adventure,
  AdventureCheckpointIdentity,
  CompleteAdventureCheckpointInput,
  CurrentAdventureCheckpointResponse,
  ResetAdventureCheckpointInput,
  SaveAdventureCheckpointInput,
  StartAdventureCheckpointInput,
} from "@/models/types";
import type { AdventureStep } from "@/models/types";

export function useAdventureService() {
  const API_ENDPOINT = "/api/adventures";

  const getAvailableAdventures = async (): Promise<Adventure[]> => {
    try {
      const response = await fetch(`${API_ENDPOINT}/available`);
      if (!response.ok) {
        throw new Error("Failed to fetch available adventures from API");
      }

      const data = await response.json();

      return data;
    } catch (error) {
      console.error("Error fetching available adventures:", error);
      return [];
    }
  };

  const getOngoingAdventures = async (
    identity?: AdventureCheckpointIdentity
  ): Promise<Adventure[]> => {
    try {
      const query = identity
        ? `?${new URLSearchParams({
            wallet_pubkey: identity.wallet_pubkey,
            character_id: identity.character_id,
          }).toString()}`
        : "";
      const response = await fetch(`${API_ENDPOINT}/ongoing${query}`);
      if (!response.ok) {
        throw new Error("Failed to fetch ongoing adventures from API");
      }

      const data = await response.json();

      return data;
    } catch (error) {
      console.error("Error fetching ongoing adventures:", error);
      return [];
    }
  };

  const getAdventure = async (id: string): Promise<Adventure | null> => {
    try {
      const response = await fetch(`${API_ENDPOINT}/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch adventure from API");
      }

      const data = await response.json();

      return data;
    } catch (error) {
      console.error("Error fetching adventure:", error);
      return null;
    }
  };

  const startAdventureCheckpoint = async (
    adventureId: string,
    input: StartAdventureCheckpointInput
  ): Promise<CurrentAdventureCheckpointResponse | null> => {
    try {
      const response = await fetch(
        `${API_ENDPOINT}/${adventureId}/checkpoint/start`,
        {
          body: JSON.stringify(input),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to start adventure checkpoint");
      }

      return response.json();
    } catch (error) {
      console.error("Error starting adventure checkpoint:", error);
      return null;
    }
  };

  const getCurrentCheckpoint = async (
    adventureId: string,
    identity: AdventureCheckpointIdentity
  ): Promise<CurrentAdventureCheckpointResponse | null> => {
    try {
      const query = new URLSearchParams({
        wallet_pubkey: identity.wallet_pubkey,
        character_id: identity.character_id,
      }).toString();
      const response = await fetch(
        `${API_ENDPOINT}/${adventureId}/checkpoint/current?${query}`
      );

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch adventure checkpoint");
      }

      return response.json();
    } catch (error) {
      console.error("Error fetching adventure checkpoint:", error);
      return null;
    }
  };

  const saveAdventureCheckpoint = async (
    adventureId: string,
    input: SaveAdventureCheckpointInput
  ): Promise<CurrentAdventureCheckpointResponse | null> => {
    try {
      const response = await fetch(
        `${API_ENDPOINT}/${adventureId}/checkpoint/save`,
        {
          body: JSON.stringify(input),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save adventure checkpoint");
      }

      return response.json();
    } catch (error) {
      console.error("Error saving adventure checkpoint:", error);
      return null;
    }
  };

  const completeAdventureCheckpoint = async (
    adventureId: string,
    input: CompleteAdventureCheckpointInput
  ) => {
    try {
      const response = await fetch(
        `${API_ENDPOINT}/${adventureId}/checkpoint/complete`,
        {
          body: JSON.stringify(input),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to complete adventure checkpoint");
      }

      return response.json();
    } catch (error) {
      console.error("Error completing adventure checkpoint:", error);
      return null;
    }
  };

  const resetAdventureCheckpoint = async (
    adventureId: string,
    input: ResetAdventureCheckpointInput
  ): Promise<boolean> => {
    try {
      const response = await fetch(
        `${API_ENDPOINT}/${adventureId}/checkpoint/reset`,
        {
          body: JSON.stringify(input),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to reset adventure checkpoint");
      }

      return true;
    } catch (error) {
      console.error("Error resetting adventure checkpoint:", error);
      return false;
    }
  };

  const getFirstStep = async (
    adventureId: string
  ): Promise<AdventureStep | null> => {
    try {
      const response = await fetch(
        `${API_ENDPOINT}/${adventureId}/steps/first`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch first game step from API");
      }

      const data = await response.json();

      return data;
    } catch (error) {
      console.error("Error fetching first game step:", error);
      return null;
    }
  };

  const getCurrentStep = async (
    adventureId: string
  ): Promise<AdventureStep | null> => {
    try {
      const response = await fetch(`${API_ENDPOINT}/${adventureId}/current`);
      if (!response.ok) {
        throw new Error("Failed to fetch current game step from API");
      }

      const data = await response.json();

      return data;
    } catch (error) {
      console.error("Error fetching current game step:", error);
      return null;
    }
  };

  const getNextStep = async (
    adventureId: string,
    stepId: string
  ): Promise<AdventureStep | null> => {
    try {
      const response = await fetch(
        `${API_ENDPOINT}/${adventureId}/steps/${stepId}`,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch next game step from API");
      }

      const data = await response.json();

      return data;
    } catch (error) {
      console.error("Error fetching next game step:", error);
      return null;
    }
  };

  return {
    getAvailableAdventures,
    getOngoingAdventures,
    getAdventure,
    startAdventureCheckpoint,
    getCurrentCheckpoint,
    saveAdventureCheckpoint,
    completeAdventureCheckpoint,
    resetAdventureCheckpoint,
    getFirstStep,
    getCurrentStep,
    getNextStep,
  };
}
