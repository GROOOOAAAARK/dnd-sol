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
			name: "bite",
			type: AttackType.Melee,
      damages: [
        {
       		damage_type: DamageType.Piercing,
          damage_bonus: 3,
          dice_roll: {
            die: DiceType.D8,
            num_die: 2,
          },
        }
			]
		},
    {
      name: "pseudopod",
      type: AttackType.Melee,
      damages: [
        {
          damage_type: DamageType.Bludgeoning,
          damage_bonus: 3,
          dice_roll: {
            die: DiceType.D8,
            num_die: 1,
          },
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

const Zombie: Monster = {
  name: "Zombie",
	monster_stats: {
		strength: 13,
		dexterity: 6,
		constitution: 16,
		intelligence: 3,
		wisdom: 6,
		charisma: 5,
		hit_points: 15,
		armor_class: 8,
	},
	loot: {
		xp: 50,
	},
	attacks: [
		{
			name: "Melee",
			type: AttackType.Melee,
      damages: [
        {
       		damage_type: DamageType.Bludgeoning,
          damage_bonus: 1,
          dice_roll: {
            die: DiceType.D8,
            num_die: 2,
          },
        }
			]
		},
   ],
   damage_modifiers: [
     {
       type: DamageModifierType.Immunity,
       damages: [DamageType.Acid]
     }
	]

}

export {
  Mimic,
  Zombie,
};
