import { NextResponse } from "next/server";
import { mockAdventures } from "@/assets/mocks/adventures";
import { getAdventureCheckpointRepository } from "@/server/adventure-checkpoints/repository";
import { parseIdentityFromSearchParams } from "@/app/api/adventures/[adventureId]/utils";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const identity = parseIdentityFromSearchParams(request);

  if (!identity) {
    return NextResponse.json([]);
  }

  const checkpointRepository = getAdventureCheckpointRepository();
  const checkpoints =
    await checkpointRepository.listActiveCheckpoints(identity);
  const ongoingAdventures = checkpoints
    .map((checkpoint) =>
      mockAdventures.find(
        (adventure) => adventure.id === checkpoint.adventure_id
      )
    )
    .filter((adventure) => adventure !== undefined);

  return NextResponse.json(ongoingAdventures);
}
