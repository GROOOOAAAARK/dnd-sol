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
	buildSignedEncounterTicket,
	getAttesterSecretKey,
} from "@/server/attestation";
import { ENCOUNTER_TTL_SECONDS } from "@/server/combat/constants";
import {
	createCombatEncounter,
	saveEncounterTicket,
} from "@/server/combat/encounters";
import { getMonster } from "@/server/content/monsters";
import { listPlayerAttacks } from "@/server/content/player-attacks";
import { getStepMonsterId } from "@/server/content/steps";
import { getOnChainCharacter } from "@/server/solana/character";

export const runtime = "nodejs";

/**
 * Signs an `EncounterTicket` for the monster bound to the current step.
 * Server-authoritative (CP1): only reachable from an Active run on a combat
 * step. Returns the ticket bytes + signature the client passes to
 * `start_combat`.
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

	const body = await readJsonBody<
		AdventureCheckpointIdentity & { step_id?: string }
	>(request);
	const identity = parseIdentity(body);

	if (!identity) {
		return badRequest("wallet_pubkey and character_id are required");
	}

	const checkpoint = await getAdventureCheckpointRepository().getCheckpoint({
		...identity,
		adventure_id: adventureId,
	});

	if (!checkpoint || checkpoint.status !== "Active") {
		return badRequest("No active adventure for this character");
	}

	const monsterId = getStepMonsterId(checkpoint.current_step_id);

	if (!monsterId) {
		return badRequest("Current step is not a combat encounter");
	}

	const monster = getMonster(monsterId);

	if (!monster) {
		return NextResponse.json(
			{ error: `Unknown monster: ${monsterId}` },
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

	if (!character || character.player !== identity.wallet_pubkey) {
		return badRequest("Character does not belong to this wallet");
	}

	const encounter = await createCombatEncounter({
		...identity,
		adventure_id: adventureId,
		monster_id: monsterId,
	});

	const expiry = BigInt(Math.floor(Date.now() / 1000) + ENCOUNTER_TTL_SECONDS);
	const { ticketBytes, signature } = buildSignedEncounterTicket(
		{
			character: identity.character_id,
			monster,
			monsterId,
			encounterId: encounter.encounter_id,
			nonce: encounter.nonce,
			expiry,
		},
		getAttesterSecretKey(),
	);

	const ticket = Buffer.from(ticketBytes).toString("base64");
	const signatureBase64 = Buffer.from(signature).toString("base64");

	await saveEncounterTicket(encounter.id, ticket, signatureBase64);

	return NextResponse.json({
		encounter_id: encounter.encounter_id.toString(),
		nonce: encounter.nonce.toString(),
		expiry: Number(expiry),
		ticket,
		signature: signatureBase64,
		playerAttacks: listPlayerAttacks(character),
		monster: {
			id: monsterId,
			name: monster.name,
			ac: monster.monster_stats.armor_class,
			hit_points: monster.monster_stats.hit_points,
			attacks: monster.attacks,
			loot: monster.loot,
		},
	});
}
