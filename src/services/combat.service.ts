"use client";

import type {
  AdventureCheckpointIdentity,
  EncounterResponse,
  RoundPayloadResponse,
} from "@/models/types";

export function useCombatService() {
	const API_ENDPOINT = "/api/adventures";

	const startEncounter = async (
		adventureId: string,
		identity: AdventureCheckpointIdentity
	): Promise<EncounterResponse | null> => {
		const response = await fetch(`${API_ENDPOINT}/${adventureId}/encounter`, {
			body: JSON.stringify(identity),
			headers: { "Content-Type": "application/json" },
			method: "POST",
		});

		if (!response.ok) {
			throw new Error(await readError(response, "Failed to start the encounter"));
		}

		return response.json();
	};

	const getCurrentEncounter = async (
		adventureId: string,
		identity: AdventureCheckpointIdentity
	): Promise<EncounterResponse | null> => {
		const query = new URLSearchParams({
			wallet_pubkey: identity.wallet_pubkey,
			character_id: identity.character_id,
		}).toString();
		const response = await fetch(
			`${API_ENDPOINT}/${adventureId}/encounter/current?${query}`,
			{ cache: "no-store" }
		);

		if (response.status === 404) {
			return null;
		}

		if (!response.ok) {
			throw new Error(await readError(response, "Failed to load the encounter"));
		}

		return response.json();
	};

	const getRoundPayload = async (
		adventureId: string,
		identity: AdventureCheckpointIdentity,
		round: number,
		attackId: string
	): Promise<RoundPayloadResponse> => {
		const response = await fetch(`${API_ENDPOINT}/${adventureId}/combat/round`, {
			body: JSON.stringify({ ...identity, round, attackId }),
			headers: { "Content-Type": "application/json" },
			method: "POST",
		});

		if (!response.ok) {
			throw new Error(await readError(response, "Failed to sign the round"));
		}

		return response.json();
	};

	const advance = async (
		adventureId: string,
		identity: AdventureCheckpointIdentity,
		actionId: string,
		success: boolean
	) => {
		const response = await fetch(`${API_ENDPOINT}/${adventureId}/advance`, {
			body: JSON.stringify({ ...identity, actionId, success }),
			headers: { "Content-Type": "application/json" },
			method: "POST",
		});

		if (!response.ok) {
			throw new Error(await readError(response, "Failed to advance"));
		}

		return response.json();
	};

	return { startEncounter, getCurrentEncounter, getRoundPayload, advance };
}

async function readError(response: Response, fallback: string): Promise<string> {
	try {
		const body = await response.json();
		return typeof body?.error === "string" ? body.error : fallback;
	} catch {
		return fallback;
	}
}
