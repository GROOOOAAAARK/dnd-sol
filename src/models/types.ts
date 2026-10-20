// TODO: Split in different files
import type { DiceType } from "@/lib/diceTypes";

export enum DamageType {
  Acid = "acid",
  Bludgeoning = "bludgeoning",
  Cold = "cold",
  Fire = "fire",
  Force = "force",
  Lightning = "lightning",
  Necrotic = "necrotic",
  Piercing = "piercing",
  Poison = "poison",
  Psychic = "psychic",
  Radiant = "radiant",
  Slashing = "slashing",
  Thunder = "thunder",
}

// Materializing resistances and weaknesses; this modifier will apply on damages
export enum DamageModifierType {
  Immunity = 0,
  VeryLow = 0.5,
  Low = 0.75,
  // Default value => Neutral
  Neutral = 1,
  High = 1.5,
  VeryHigh = 2,
}

export interface DamageModifier {
  type: DamageModifierType;
  damages: DamageType[];
}

export interface DiceRollInfos {
  die: DiceType;
  num_die: number;
}

export enum AttackType {
  Hit = "hit",
  Throw = "throw",
  Spell = "spell",
}

export interface Attack {
  id?: string;
	name: string;
	dice_rolls: DiceRollInfos[];
  damage_type: DamageType;
  type: AttackType;
}

// Character types
export interface CharacterStats {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  health?: number;
  hit_points?: number;
}

export enum CharacterRace {
  Human="human",
  Elf="elf",
  Dwarf="dwarf",
  Halfling="halfling",
  Tiefling="tiefling",
  Githyanki="githyanki",
  Orc="orc",
  Dragonborn="dragonborn",
}

export type CharacterRaceValue = `${CharacterRace}`;

export enum CharacterClass {
  Warrior="warrior",
  Thief="thief",
  Barbarian="barbarian",
  Monk="monk",
  Wizard="wizard",
  Sorcerer="sorcerer",
  Druid="druid",
}

export type CharacterClassValue = `${CharacterClass}`;

export interface Character {
  id?: string; // Account PubKey
  name: string;
  character_class: CharacterClassValue;
  race: CharacterRaceValue;
  stats: CharacterStats;
  level?: number;
  experience?: number;
}

export interface MonsterStats extends CharacterStats {
  hit_points: number;
  armor_class: number;
}

export interface MoneyCount {
  PP: number;
  GP: number;
  EP: number;
  SP: number;
  CP: number;
}

export interface ItemLoot {
		item_id: string;
		loot_chance: number; // 0..1
	}

export interface MonsterLoot {
  xp: number;
  items?: ItemLoot[];
  money?: MoneyCount;
}

export interface Monster {
  id?: string;
  name: string;
  monster_stats: MonsterStats;
  loot: MonsterLoot;
  attacks: Attack[];
  damage_modifiers: DamageModifier[];
}


// Adventure types
export interface Adventure {
  id: string;
  title: string;
  description: string;
  image?: string;
  level: number;
  first_step_id: string;
}

export type AdventureCheckpointStatus = "Active" | "Completed";

export interface AdventureCheckpoint {
  wallet_pubkey: string;
  character_id: string;
  adventure_id: string;
  current_step_id: string;
  adventure_seed_hash: string;
  seed_salt_hash: string;
  adventure_path_hash: string;
  adventure_version_hash: string;
  save_revision: number;
  status: AdventureCheckpointStatus;
  started_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface AdventureCheckpointIdentity {
  wallet_pubkey: string;
  character_id: string;
}

export interface StartAdventureCheckpointInput
  extends AdventureCheckpointIdentity {
  restart?: boolean;
}

export interface SaveAdventureCheckpointInput
  extends AdventureCheckpointIdentity {
  current_step_id: string;
}

export type CompleteAdventureCheckpointInput = AdventureCheckpointIdentity;

export type ResetAdventureCheckpointInput = AdventureCheckpointIdentity;

export interface AdventureCheckpointResponse {
  checkpoint: AdventureCheckpoint;
  currentStep: AdventureStep;
  compatible: true;
}

export interface IncompatibleAdventureCheckpointResponse {
  checkpoint: AdventureCheckpoint;
  currentStep: null;
  compatible: false;
  reason: "AdventureVersionChanged" | "StepNotFound";
}

export type CurrentAdventureCheckpointResponse =
  | AdventureCheckpointResponse
  | IncompatibleAdventureCheckpointResponse;

export interface DiceRollParams {
  sides: number;
  rolls: number;
  success_floor: number;
  bonus?: number;
}

// Game types

/*
 * @description: GameAction represents the possibilities
 * for a given adventure step
 * @attribute: requirements is here, it represents the static
 * conditions to perform the given action (character stats or items)
 * @attribute: if dice_roll_params is here, the player will need to perform
 * a dice roll and if the result is enough, the action will be a success. If not,
 * the action is a failure. In the future, a failure shoumld imply a malus (health points or else)
 */
export interface GameAction {
  id: string;
  title: string;
  description: string;
  success_next_step_id?: string;
  failure_next_step_id?: string;
  default_next_step_id?: string;
  requirements?: {
    stats?: Partial<CharacterStats>;
    items?: string[];
  };
  dice_roll_params?: DiceRollParams;
}

export interface AdventureStep {
  id: string;
  adventureId: string;
  title: string;
  description: string;
  image?: string;
  actions: GameAction[];
  is_win_step?: boolean;
  is_death_step?: boolean;
}

export interface DiceResult {
  raw_result: number;
  bonus: number;
  success: boolean;
  critical_success: boolean;
  critical_failure: boolean;
}
