import { getPrismaClient } from "@/server/prisma/client";

export type CombatEncounterIdentity = {
	wallet_pubkey: string;
	character_id: string;
	adventure_id: string;
};

export type CreateCombatEncounterInput = CombatEncounterIdentity & {
	monster_id: string;
};

export type CombatEncounter = {
	id: number;
	/** On-chain lane seed (`encounter_id`). */
	encounter_id: bigint;
	/** Monotonic per character (`nonce`). */
	nonce: bigint;
	monster_id: string;
	round: number;
	/** Base64 signed encounter ticket, needed again on every reveal. */
	ticket: string | null;
	signature: string | null;
};

function toDomain(row: {
	id: number;
	monsterId: string;
	round: number;
	ticket: string | null;
	signature: string | null;
}): CombatEncounter {
	const encounterId = BigInt(row.id);

	return {
		id: row.id,
		encounter_id: encounterId,
		nonce: encounterId,
		monster_id: row.monsterId,
		round: row.round,
		ticket: row.ticket,
		signature: row.signature,
	};
}

/**
 * Allocates a fight. The DB autoincrement id is the single source for both
 * `encounter_id` and `nonce`, so it is unique per fight and strictly
 * increasing (the program only needs `nonce > session.last_nonce`).
 */
export async function createCombatEncounter(
	input: CreateCombatEncounterInput,
): Promise<CombatEncounter> {
	const row = await getPrismaClient().combatEncounter.create({
		data: {
			walletPubkey: input.wallet_pubkey,
			characterId: input.character_id,
			adventureId: input.adventure_id,
			monsterId: input.monster_id,
		},
	});

	return toDomain(row);
}

export async function saveEncounterTicket(
	id: number,
	ticket: string,
	signature: string,
): Promise<CombatEncounter> {
	const row = await getPrismaClient().combatEncounter.update({
		where: { id },
		data: { ticket, signature },
	});

	return toDomain(row);
}

/** Drops every fight recorded for a character's run of an adventure. */
export async function deleteCombatEncounters(
	identity: CombatEncounterIdentity,
): Promise<void> {
	await getPrismaClient().combatEncounter.deleteMany({
		where: {
			walletPubkey: identity.wallet_pubkey,
			characterId: identity.character_id,
			adventureId: identity.adventure_id,
		},
	});
}

export async function getCurrentCombatEncounter(
	identity: CombatEncounterIdentity,
): Promise<CombatEncounter | null> {
	const row = await getPrismaClient().combatEncounter.findFirst({
		orderBy: { id: "desc" },
		where: {
			walletPubkey: identity.wallet_pubkey,
			characterId: identity.character_id,
			adventureId: identity.adventure_id,
		},
	});

	return row ? toDomain(row) : null;
}
