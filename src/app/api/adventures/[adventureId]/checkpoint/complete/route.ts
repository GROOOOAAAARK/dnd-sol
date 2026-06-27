import { NextResponse } from "next/server";

import type { CompleteAdventureCheckpointInput } from "@/models/types";
import { getAdventureCheckpointRepository } from "@/server/adventure-checkpoints/repository";
import {
  badRequest,
  getAdventureId,
  parseIdentity,
  readJsonBody,
  validateAdventure,
} from "@/server/adventure-checkpoints/routes";

export async function POST(
  request: Request,
  props: { params: Promise<{ adventureId: string }> }
) {
  const adventureId = await getAdventureId(props);

  if (!validateAdventure(adventureId)) {
    return NextResponse.json({ error: "Adventure not found" }, { status: 404 });
  }

  const body = await readJsonBody<CompleteAdventureCheckpointInput>(request);
  const identity = parseIdentity(body);

  if (!identity) {
    return badRequest("wallet_pubkey and character_id are required");
  }

  const checkpointIdentity = {
    ...identity,
    adventure_id: adventureId,
  };

  const checkpointRepository = getAdventureCheckpointRepository();
  const existingCheckpoint =
    await checkpointRepository.getCheckpoint(checkpointIdentity);

  if (!existingCheckpoint) {
    return NextResponse.json(
      { error: "Checkpoint not found" },
      { status: 404 }
    );
  }

  const checkpoint =
    await checkpointRepository.completeCheckpoint(checkpointIdentity);

  if (!checkpoint) {
    return NextResponse.json(
      { error: "Failed to complete checkpoint" },
      { status: 500 }
    );
  }

  return NextResponse.json({ checkpoint });
}
