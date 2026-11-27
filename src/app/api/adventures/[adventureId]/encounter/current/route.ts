import { NextResponse } from "next/server";
import {
	badRequest,
	getAdventureId,
	parseIdentityFromSearchParams,
	validateAdventure,
} from "@/app/api/adventures/[adventureId]/utils";
import {
	buildSignedEncounterTicket,
	getAttesterSecretKey,
} from "@/server/attestation";
import { ENCOUNTER_TTL_SECONDS } from "@/server/combat/constants";
import {
	getCurrentCombatEncounter,
	saveEncounterTicket,
} from "@/server/combat/encounters";
import { getMonster } from "@/server/content/monsters";
import { listPlayerAttacks } from "@/server/content/player-attacks";
import { getOnChainCharacter } from "@/server/solana/character";

export const runtime = "nodejs";

/**
 * Returns the stored encounter ticket so the client can start or resume a fight
 * after a reload. The ticket is re-signed with a fresh expiry on every read:
 * the encounter id/nonce stay the same, but the signature must not go stale
 * between a failed attempt and a retry.
 */
export async function GET(
	request: Request,
	props: { params: Promise<{ adventureId: string }> },
) {
	const adventureId = await getAdventureId(props);
	const adventure = validateAdventure(adventureId);

	if (!adventure) {
		return NextResponse.json({ error: "Adventure not found" }, { status: 404 });
	}

	const identity = parseIdentityFromSearchParams(request);

	if (!identity) {
		return badRequest("wallet_pubkey and character_id are required");
	}

	const encounter = await getCurrentCombatEncounter({
		...identity,
		adventure_id: adventureId,
	});

	if (!encounter || !encounter.ticket || !encounter.signature) {
		return NextResponse.json({ error: "No encounter found" }, { status: 404 });
	}

	const monster = getMonster(encounter.monster_id);

	if (!monster) {
		return NextResponse.json(
			{ error: `Unknown monster: ${encounter.monster_id}` },
			{ status: 500 },
		);
	}

	let playerAttacks: ReturnType<typeof listPlayerAttacks> = [];

	try {
		const character = await getOnChainCharacter(identity.character_id);

		if (character) {
			playerAttacks = listPlayerAttacks(character);
		}
	} catch (error) {
		console.error("Failed to read character account:", error);
	}

	const expiry = BigInt(Math.floor(Date.now() / 1000) + ENCOUNTER_TTL_SECONDS);
	const { ticketBytes, signature } = buildSignedEncounterTicket(
		{
			character: identity.character_id,
			monster,
			monsterId: encounter.monster_id,
			encounterId: encounter.encounter_id,
			nonce: encounter.nonce,
			expiry,
		},
		getAttesterSecretKey(),
	);
	const ticket = Buffer.from(ticketBytes).toString("base64");
	const signatureBase64 = Buffer.from(signature).toString("base64");

	await saveEncounterTicket(encounter.id, ticket, signatureBase64);

	return NextResponse.json(
		{
			encounter_id: encounter.encounter_id.toString(),
			nonce: encounter.nonce.toString(),
			expiry: Number(expiry),
			ticket,
			signature: signatureBase64,
			playerAttacks,
			monster: {
				id: encounter.monster_id,
				name: monster.name,
				ac: monster.monster_stats.armor_class,
				hit_points: monster.monster_stats.hit_points,
				attacks: monster.attacks,
				loot: monster.loot,
			},
		},
		{ headers: { "Cache-Control": "no-store" } },
	);
}
