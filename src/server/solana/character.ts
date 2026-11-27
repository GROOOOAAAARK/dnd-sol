import { BorshAccountsCoder } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";

import { localnet } from "@/config/chains";
import DndSolIDL from "@/idl/dnd_sol.json";
import type { CharacterClassValue } from "@/models/types";

export type OnChainCharacter = {
	player: string;
	characterClass: CharacterClassValue;
	level: number;
	stats: {
		strength: number;
		dexterity: number;
		constitution: number;
		intelligence: number;
		wisdom: number;
		charisma: number;
		health: number;
		hit_points: number;
	};
};

const coder = new BorshAccountsCoder(DndSolIDL as never);

function rpcUrl() {
	return process.env.SOLANA_RPC_URL ?? localnet;
}

function enumVariant(value: unknown): string {
	if (typeof value === "string") {
		return value;
	}

	if (value && typeof value === "object") {
		const [variant] = Object.keys(value);
		return variant ?? "";
	}

	return String(value);
}

/**
 * Server-side read of the character account. The backend never trusts
 * client-supplied class/stats when signing an attack.
 */
export async function getOnChainCharacter(
	characterPubkey: string
): Promise<OnChainCharacter | null> {
	const connection = new Connection(rpcUrl(), "confirmed");
	const accountInfo = await connection.getAccountInfo(
		new PublicKey(characterPubkey),
		"confirmed"
	);

	if (!accountInfo) {
		return null;
	}

	const decoded = coder.decode("CharacterAccount", accountInfo.data);

	return {
		player: decoded.player.toBase58(),
		characterClass: enumVariant(
			decoded.character.attributes.class
		).toLowerCase() as CharacterClassValue,
		level: Number(decoded.character.attributes.level),
		stats: {
			strength: Number(decoded.character.stats.strength),
			dexterity: Number(decoded.character.stats.dexterity),
			constitution: Number(decoded.character.stats.constitution),
			intelligence: Number(decoded.character.stats.intelligence),
			wisdom: Number(decoded.character.stats.wisdom),
			charisma: Number(decoded.character.stats.charisma),
			health: Number(decoded.character.stats.health),
			hit_points: Number(decoded.character.stats.hit_points),
		},
	};
}
