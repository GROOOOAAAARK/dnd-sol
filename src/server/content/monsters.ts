import { keccak_256 } from "@noble/hashes/sha3";

import { Mimic, Zombie } from "@/assets/mocks/monsters";
import type { Monster } from "@/models/types";
import { MONSTER_ID_LEN } from "@/server/attestation/types";

// URL-safe, nano-compatible alphabet (64 chars).
const NANO_ALPHABET =
	"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-";

const textEncoder = new TextEncoder();

/**
 * Deterministic nano-style id derived from the monster name. Content-authored
 * ids would be better; this keeps ids stable across restarts without editing
 * every mock. Upgrade when monsters move to the DB.
 * shortcut: name-derived id, no collision handling.
 */
export function createMonsterId(name: string): string {
	const digest = keccak_256(textEncoder.encode(name));
	let id = "";

	for (let index = 0; id.length < MONSTER_ID_LEN; index++) {
		id += NANO_ALPHABET[digest[index % digest.length] % NANO_ALPHABET.length];
	}

	return id;
}

type MonsterRecord = {
	id: string;
	monster: Monster;
};

const MONSTER_RECORDS: MonsterRecord[] = [Mimic, Zombie].map((monster) => ({
	id: createMonsterId(monster.name),
	monster,
}));

const MONSTERS_BY_ID = new Map(
	MONSTER_RECORDS.map((record) => [record.id, record]),
);

export function listMonsters(): Monster[] {
	return MONSTER_RECORDS.map((record) => record.monster);
}

export function getMonster(monsterId: string): Monster | null {
	return MONSTERS_BY_ID.get(monsterId)?.monster ?? null;
}

export function getMonsterId(monster: Monster): string {
	const record = MONSTER_RECORDS.find((entry) => entry.monster === monster);
	return record?.id ?? createMonsterId(monster.name);
}
