import { NextResponse } from "next/server";

import { mockGameSteps } from "@/assets/mocks/adventures";
import type { SaveAdventureCheckpointInput } from "@/models/types";
import { getAdventureCheckpointRepository } from "@/server/adventure-checkpoints/repository";
import {
  badRequest,
  buildCurrentCheckpointResponse,
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

  const body = await readJsonBody<SaveAdventureCheckpointInput>(request);
  const identity = parseIdentity(body);

  if (!identity) {
    return badRequest("wallet_pubkey and character_id are required");
  }

  if (!body?.current_step_id) {
    return badRequest("current_step_id is required");
  }

  const nextStep = mockGameSteps[body.current_step_id];

  if (!nextStep || nextStep.adventureId !== adventureId) {
    return badRequest("current_step_id does not belong to this adventure");
  }

  const checkpointIdentity = {
    ...identity,
    adventure_id: adventureId,
  };

  const checkpointRepository = getAdventureCheckpointRepository();
  const existingCheckpoint =
    await checkpointRepository.getCheckpoint(checkpointIdentity);

  if (!existingCheckpoint || existingCheckpoint.status !== "Active") {
    return NextResponse.json(
      { error: "Checkpoint not found" },
      { status: 404 }
    );
  }

  const checkpoint = await checkpointRepository.updateCheckpointStep(
    checkpointIdentity,
    body.current_step_id
  );

  if (!checkpoint) {
    return NextResponse.json(
      { error: "Failed to save checkpoint" },
      { status: 500 }
    );
  }

  return NextResponse.json(buildCurrentCheckpointResponse(checkpoint));
}
