// TODO: Split in different files

// Character types
export interface CharacterStats {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface Character {
  id?: string; // Account PubKey
  name: string;
  character_class: string;
  race: string;
  stats: CharacterStats;
  level?: number;
  experience?: number;
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

export interface DiceRollParams {
  sides: number;
  rolls: number;
  min: number;
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
}
