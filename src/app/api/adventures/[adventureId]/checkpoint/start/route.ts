import { NextResponse } from "next/server";

import type { StartAdventureCheckpointInput } from "@/models/types";
import {
  createAdventureSecret,
  createSeedSalt,
  getAdventurePathHash,
  getAdventureVersionHash,
  hashString,
} from "@/lib/hashing";
import { getAdventureCheckpointRepository } from "@/server/adventure-checkpoints/repository";
import {
  badRequest,
  buildCurrentCheckpointResponse,
  getAdventureId,
  parseIdentity,
  readJsonBody,
  validateAdventure,
} from "@/server/adventure-checkpoints/routes";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  props: { params: Promise<{ adventureId: string }> }
) {
  const adventureId = await getAdventureId(props);
  const adventure = validateAdventure(adventureId);

  if (!adventure) {
    return NextResponse.json({ error: "Adventure not found" }, { status: 404 });
  }

  const body = await readJsonBody<StartAdventureCheckpointInput>(request);
  const identity = parseIdentity(body);

  if (!identity) {
    return badRequest("wallet_pubkey and character_id are required");
  }

  const checkpointRepository = getAdventureCheckpointRepository();
  const existingCheckpoint = await checkpointRepository.getCheckpoint({
    ...identity,
    adventure_id: adventureId,
  });

  if (existingCheckpoint && !body?.restart) {
    return NextResponse.json(
      buildCurrentCheckpointResponse(existingCheckpoint)
    );
  }

  const adventureSeed = createAdventureSecret();
  const seedSalt = createSeedSalt();
  const seedSaltHash = hashString(seedSalt);
  const checkpoint = await checkpointRepository.createCheckpoint({
    ...identity,
    adventure_id: adventureId,
    current_step_id: adventure.first_step_id,
    adventure_seed: adventureSeed,
    seed_salt: seedSalt,
    adventure_seed_hash: hashString(adventureSeed),
    seed_salt_hash: seedSaltHash,
    adventure_path_hash: getAdventurePathHash(seedSaltHash, adventureId),
    adventure_version_hash: getAdventureVersionHash(adventureId),
  });

  if (!checkpoint) {
    return NextResponse.json(
      { error: "Failed to create checkpoint" },
      { status: 500 }
    );
  }

  return NextResponse.json(buildCurrentCheckpointResponse(checkpoint));
}
