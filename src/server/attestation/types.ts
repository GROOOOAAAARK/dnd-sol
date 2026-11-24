import type { Monster } from "@/models/types";

/**
 * Canonical on-chain message shapes. These mirror the Rust structs in
 * `programs/dnd_sol/src/attestation.rs` + `combat.rs` byte-for-byte; see
 * `encode.ts`.
 */

export const TICKET_VERSION = 1;

/** Nano default length; the session stores the id as a fixed-size array. */
export const MONSTER_ID_LEN = 21;

/** Must match the Rust `validate_limits` caps. */
export const MAX_DAMAGE_GROUPS = 4;
export const MAX_DICE_PER_GROUP = 12;

/** Mirrors Rust `DamageRoll`. `damage_type` is intentionally absent on-chain. */
export type DamageRoll = {
	die: number;
	num_die: number;
	damage_bonus: number;
};

/**
 * Mirrors Rust `Attack`. `to_hit` is `Option<i8>` on-chain: omitted encodes as
 * `None` (treated as +0).
 */
export type AttackProfile = {
	to_hit?: number;
	damages: DamageRoll[];
};

export type EncounterTicketInput = {
	/** 32-byte pubkey, base58 string or raw bytes. */
	character: Uint8Array | string;
	encounterId: bigint;
	/** Monster nano uid (<= 21 chars). */
	monsterId: string;
	ac: number;
	hitPoints: number;
	nonce: bigint;
	/** Unix seconds. */
	expiry: bigint;
};

export type RoundPayloadInput = {
	character: Uint8Array | string;
	encounterId: bigint;
	round: number;
	player: AttackProfile;
	monster: AttackProfile;
	/** Unix seconds. */
	expiry: bigint;
};

export type EncounterTicketBuild = {
	character: string;
	monster: Monster;
	monsterId: string;
	encounterId: bigint;
	nonce: bigint;
	expiry: bigint;
};

export type SignedEncounterTicket = {
	ticketBytes: Uint8Array;
	signature: Uint8Array;
};

export type RoundPayloadBuild = {
	character: string;
	encounterId: bigint;
	round: number;
	player: AttackProfile;
	monster: AttackProfile;
	expiry: bigint;
};

export type SignedRoundPayload = {
	payloadBytes: Uint8Array;
	signature: Uint8Array;
};
