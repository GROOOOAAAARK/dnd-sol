import { DiceType } from "@/lib/diceTypes";
import { AttackType, DamageModifierType, DamageType, type Monster } from "@/models/types";

const Mimic: Monster = {
	name: "Mimic",
	monster_stats: {
		strength: 15,
		dexterity: 12,
		constitution: 13,
		intelligence: 5,
		wisdom: 13,
		charisma: 8,
		hit_points: 58,
		armor_class: 12,
	},
	loot: {
		xp: 200,
	},
	attacks: [
		{
			name: "mimic bite",
			type: AttackType.Hit,
			damage_type: DamageType.Piercing,
			dice_rolls: [
				{
					die: DiceType.D6,
					num_die: 2,
				},
			],
		},
  ],
  damage_modifiers: [
    {
      type: DamageModifierType.Immunity,
      damages: [DamageType.Acid]
    }
	]
};

export { Mimic };
