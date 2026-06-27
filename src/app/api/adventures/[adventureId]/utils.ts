import { NextResponse } from "next/server";

import { mockAdventures, mockGameSteps } from "@/assets/mocks/adventures";
import type {
  AdventureCheckpoint,
  AdventureCheckpointIdentity,
  CurrentAdventureCheckpointResponse,
} from "@/models/types";

import { getAdventureVersionHash } from "@/lib/hashing";

type AdventureParams = {
  adventureId: string;
};

export async function getAdventureId(props: {
  params: Promise<AdventureParams>;
}) {
  const params = await props.params;

  return params.adventureId;
}

export async function readJsonBody<T>(request: Request) {
  try {
    return (await request.json()) as Partial<T>;
  } catch {
    return null;
  }
}

export function parseIdentity(
  body: Partial<AdventureCheckpointIdentity> | null
) {
  if (!body?.wallet_pubkey || !body.character_id) {
    return null;
  }

  return {
    wallet_pubkey: body.wallet_pubkey,
    character_id: body.character_id,
  };
}

export function parseIdentityFromSearchParams(request: Request) {
  const url = new URL(request.url);
  const wallet_pubkey = url.searchParams.get("wallet_pubkey");
  const character_id = url.searchParams.get("character_id");

  if (!wallet_pubkey || !character_id) {
    return null;
  }

  return {
    wallet_pubkey,
    character_id,
  };
}

export function validateAdventure(adventureId: string) {
  return (
    mockAdventures.find((adventure) => adventure.id === adventureId) ?? null
  );
}

export function buildCurrentCheckpointResponse(
  checkpoint: AdventureCheckpoint
): CurrentAdventureCheckpointResponse {
  const adventureVersionHash = getAdventureVersionHash(checkpoint.adventure_id);

  if (checkpoint.adventure_version_hash !== adventureVersionHash) {
    return {
      checkpoint,
      currentStep: null,
      compatible: false,
      reason: "AdventureVersionChanged",
    };
  }

  const currentStep = mockGameSteps[checkpoint.current_step_id];

  if (!currentStep || currentStep.adventureId !== checkpoint.adventure_id) {
    return {
      checkpoint,
      currentStep: null,
      compatible: false,
      reason: "StepNotFound",
    };
  }

  return {
    checkpoint,
    currentStep,
    compatible: true,
  };
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
