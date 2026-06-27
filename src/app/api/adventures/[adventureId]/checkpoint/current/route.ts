import { NextResponse } from "next/server";

import { getAdventureCheckpointRepository } from "@/server/adventure-checkpoints/repository";
import {
  buildCurrentCheckpointResponse,
  getAdventureId,
  parseIdentityFromSearchParams,
  validateAdventure,
} from "@/app/api/adventures/[adventureId]/utils";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  props: { params: Promise<{ adventureId: string }> }
) {
  const adventureId = await getAdventureId(props);

  if (!validateAdventure(adventureId)) {
    return NextResponse.json({ error: "Adventure not found" }, { status: 404 });
  }

  const identity = parseIdentityFromSearchParams(request);

  if (!identity) {
    return NextResponse.json(
      { error: "wallet_pubkey and character_id query params are required" },
      { status: 400 }
    );
  }

  const checkpointRepository = getAdventureCheckpointRepository();
  const checkpoint = await checkpointRepository.getCheckpoint({
    ...identity,
    adventure_id: adventureId,
  });

  if (!checkpoint || checkpoint.status !== "Active") {
    return NextResponse.json(
      { error: "Checkpoint not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(buildCurrentCheckpointResponse(checkpoint));
}
