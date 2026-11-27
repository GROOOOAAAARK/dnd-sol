import { NextResponse } from "next/server";
import {
	badRequest,
	getAdventureId,
	parseIdentity,
	readJsonBody,
	validateAdventure,
} from "@/app/api/adventures/[adventureId]/utils";
import type { AdventureCheckpointIdentity } from "@/models/types";
import { getAdventureCheckpointRepository } from "@/server/adventure-checkpoints/repository";
import {
	buildSignedRoundPayload,
	getAttesterSecretKey,
} from "@/server/attestation";
import { monsterToAttackProfile } from "@/server/attestation/builders";
import { ROUND_TTL_SECONDS } from "@/server/combat/constants";
import { getCurrentCombatEncounter } from "@/server/combat/encounters";
import { getMonster } from "@/server/content/monsters";
import {
	getPlayerAttack,
	listPlayerAttacks,
} from "@/server/content/player-attacks";
import { getStepMonsterId } from "@/server/content/steps";
import { getOnChainCharacter } from "@/server/solana/character";

export const runtime = "nodejs";

type RoundInput = AdventureCheckpointIdentity & {
	round: number;
	attackId: string;
};

/**
 * Signs the per-round payload. The player's attack is validated against the
 * on-chain character (never trusted from the request); the monster attack is
 * chosen here. The payload is hash-bound at `combat_commit`, so it is fixed
 * before the dice reveal.
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

	const body = await readJsonBody<RoundInput>(request);
	const identity = parseIdentity(body);

	if (
		!identity ||
		typeof body?.round !== "number" ||
		typeof body?.attackId !== "string"
	) {
		return badRequest(
			"wallet_pubkey, character_id, round and attackId are required",
		);
	}

	const checkpoint = await getAdventureCheckpointRepository().getCheckpoint({
		...identity,
		adventure_id: adventureId,
	});

	if (!checkpoint || checkpoint.status !== "Active") {
		return badRequest("No active adventure for this character");
	}

	const stepMonsterId = getStepMonsterId(checkpoint.current_step_id);

	if (!stepMonsterId) {
		return badRequest("Current step is not a combat encounter");
	}

	const encounter = await getCurrentCombatEncounter({
		...identity,
		adventure_id: adventureId,
	});

	if (!encounter) {
		return badRequest("No encounter has been started for this character");
	}

	const monster = getMonster(encounter.monster_id);

	if (!monster) {
		return NextResponse.json(
			{ error: `Unknown monster: ${encounter.monster_id}` },
			{ status: 500 },
		);
	}

	let character;

	try {
		character = await getOnChainCharacter(identity.character_id);
	} catch (error) {
		console.error("Failed to read character account:", error);
		return NextResponse.json(
			{ error: "Unable to verify the character on-chain" },
			{ status: 502 },
		);
	}

	if (!character) {
		return badRequest("Character account not found");
	}

	const playerAttack = getPlayerAttack(body.attackId, character);

	if (!playerAttack) {
		return NextResponse.json(
			{
				error: `Attack not allowed: ${body.attackId}`,
				allowed: listPlayerAttacks(character),
			},
			{ status: 400 },
		);
	}

	const expiry = BigInt(Math.floor(Date.now() / 1000) + ROUND_TTL_SECONDS);
	const { payloadBytes, signature } = buildSignedRoundPayload(
		{
			character: identity.character_id,
			encounterId: encounter.encounter_id,
			round: body.round,
			player: playerAttack,
			monster: monsterToAttackProfile(monster),
			expiry,
		},
		getAttesterSecretKey(),
	);

	return NextResponse.json({
		round: body.round,
		expiry: Number(expiry),
		payload: Buffer.from(payloadBytes).toString("base64"),
		signature: Buffer.from(signature).toString("base64"),
	});
}
