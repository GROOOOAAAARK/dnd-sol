import type { CharacterClassValue } from "@/models/types";
import type { AttackProfile } from "@/server/attestation/types";
import type { OnChainCharacter } from "@/server/solana/character";

export const MAIN_HAND_ATTACK_ID = "main-hand";

/** Floored `(stat - 10) / 2`, same as the Rust `ability_modifier`. */
function abilityModifier(stat: number): number {
	return Math.floor((stat - 10) / 2);
}

function proficiency(level: number): number {
	return 2 + Math.floor((Math.max(level, 1) - 1) / 4);
}

function attackAbility(
	characterClass: CharacterClassValue,
	stats: OnChainCharacter["stats"]
): number {
	switch (characterClass) {
		case "thief":
			return stats.dexterity;
		case "wizard":
		case "sorcerer":
		case "druid":
			return stats.intelligence;
		default:
			return stats.strength;
	}
}

function damageDie(characterClass: CharacterClassValue): number {
	switch (characterClass) {
		case "barbarian":
		case "warrior":
			return 8;
		case "thief":
		case "monk":
			return 6;
		default:
			return 4;
	}
}

/** Class main hand: proficiency + ability mod to hit, one class die. */
export function mainHandAttack(character: OnChainCharacter): AttackProfile {
	return {
		to_hit:
			proficiency(character.level) +
			abilityModifier(attackAbility(character.characterClass, character.stats)),
		damages: [
			{
				die: damageDie(character.characterClass),
				num_die: 1,
				damage_bonus: 0,
			},
		],
	};
}

export type PlayerAttackOption = {
	id: string;
	label: string;
};

/** Attacks the UI may offer. The backend re-validates every request. */
export function listPlayerAttacks(
	_character: OnChainCharacter
): PlayerAttackOption[] {
	return [{ id: MAIN_HAND_ATTACK_ID, label: "Main hand" }];
}

export function getPlayerAttack(
	attackId: string,
	character: OnChainCharacter
): AttackProfile | null {
	if (attackId === MAIN_HAND_ATTACK_ID) {
		return mainHandAttack(character);
	}

	return null;
}
