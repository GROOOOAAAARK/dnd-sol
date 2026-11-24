import type { Attack, Monster } from "@/models/types";
import {
	encodeEncounterTicket,
	encodeRoundPayload,
} from "@/server/attestation/encode";
import { signTicket } from "@/server/attestation/sign";
import type {
	AttackProfile,
	EncounterTicketBuild,
	RoundPayloadBuild,
	SignedEncounterTicket,
	SignedRoundPayload,
} from "@/server/attestation/types";

/** Content `Attack` → on-chain `AttackProfile`. */
export function contentAttackToProfile(attack: Attack): AttackProfile {
	return {
		to_hit: attack.to_hit,
		damages: attack.damages.map(({ dice_roll, damage_bonus }) => ({
			die: dice_roll.die,
			num_die: dice_roll.num_die,
			damage_bonus: damage_bonus ?? 0,
		})),
	};
}

/**
 * The monster resolves a single attack per round. Content may list more; the
 * backend picks the first for now.
 * shortcut: first monster attack only, add AI/rotation when content needs it.
 */
export function monsterToAttackProfile(monster: Monster): AttackProfile {
	const attack = monster.attacks[0];

	if (!attack) {
		throw new Error(`Monster ${monster.name} has no attacks`);
	}

	return contentAttackToProfile(attack);
}

export function buildEncounterTicketBytes(
	build: EncounterTicketBuild,
): Uint8Array {
	return encodeEncounterTicket({
		character: build.character,
		encounterId: build.encounterId,
		monsterId: build.monsterId,
		ac: build.monster.monster_stats.armor_class,
		hitPoints: build.monster.monster_stats.hit_points,
		nonce: build.nonce,
		expiry: build.expiry,
	});
}

export function buildSignedEncounterTicket(
	build: EncounterTicketBuild,
	secretKey: Uint8Array,
): SignedEncounterTicket {
	const ticketBytes = buildEncounterTicketBytes(build);

	return {
		ticketBytes,
		signature: signTicket(ticketBytes, secretKey),
	};
}

export function buildRoundPayloadBytes(build: RoundPayloadBuild): Uint8Array {
	return encodeRoundPayload({
		character: build.character,
		encounterId: build.encounterId,
		round: build.round,
		player: build.player,
		monster: build.monster,
		expiry: build.expiry,
	});
}

export function buildSignedRoundPayload(
	build: RoundPayloadBuild,
	secretKey: Uint8Array,
): SignedRoundPayload {
	const payloadBytes = buildRoundPayloadBytes(build);

	return {
		payloadBytes,
		signature: signTicket(payloadBytes, secretKey),
	};
}
