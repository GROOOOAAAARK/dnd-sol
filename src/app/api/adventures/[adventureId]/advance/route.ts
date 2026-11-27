import { NextResponse } from "next/server";
import {
	badRequest,
	buildCurrentCheckpointResponse,
	getAdventureId,
	parseIdentity,
	readJsonBody,
	validateAdventure,
} from "@/app/api/adventures/[adventureId]/utils";
import type { AdventureCheckpointIdentity } from "@/models/types";
import { getAdventureCheckpointRepository } from "@/server/adventure-checkpoints/repository";
import { getStep } from "@/server/content/steps";

export const runtime = "nodejs";

type AdvanceInput = AdventureCheckpointIdentity & {
	actionId: string;
	/** Whether the action succeeded (combat: Victory). Defaults to false. */
	success?: boolean;
};

export function resolveNextStepId(
	action: {
		success_next_step_id?: string;
		failure_next_step_id?: string;
		default_next_step_id?: string;
	},
	success: boolean,
): string | undefined {
	return success
		? (action.success_next_step_id ?? action.default_next_step_id)
		: (action.failure_next_step_id ?? action.default_next_step_id);
}

/**
 * Server-authoritative progression (CP1): the client says which action it took
 * and whether it succeeded; the server computes the next step. Combat steps
 * advance on Victory to `success_next_step_id` and on Defeat to
 * `failure_next_step_id`.
 */
export async function POST(
	request: Request,
	props: { params: Promise<{ adventureId: string }> },
) {
	const adventureId = await getAdventureId(props);
	const adventure = validateAdventure(adventureId);

	if (!adventure) {
		return NextResponse.json({ error: "Adventure not found" }, { status: 404 });
	}

	const body = await readJsonBody<AdvanceInput>(request);
	const identity = parseIdentity(body);

	if (!identity || !body?.actionId) {
		return badRequest("wallet_pubkey, character_id and actionId are required");
	}

	const repository = getAdventureCheckpointRepository();
	const checkpoint = await repository.getCheckpoint({
		...identity,
		adventure_id: adventureId,
	});

	if (!checkpoint || checkpoint.status !== "Active") {
		return badRequest("No active adventure for this character");
	}

	const step = getStep(checkpoint.current_step_id);
	const action = step?.actions.find((entry) => entry.id === body.actionId);

	if (!step || !action) {
		return badRequest("Action does not belong to the current step");
	}

	const success = body.success === true;

	const nextStepId = resolveNextStepId(action, success);

	if (!nextStepId) {
		return badRequest("Action has no next step for this outcome");
	}

	const updated = await repository.updateCheckpointStep(
		{ ...identity, adventure_id: adventureId },
		nextStepId,
	);

	return NextResponse.json(buildCurrentCheckpointResponse(updated));
}
