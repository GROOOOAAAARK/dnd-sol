use crate::character::{CharacterClass, CharacterStats};
use anchor_lang::prelude::*;
use solana_keccak_hasher as keccak;

pub const COMBAT_SEED: &[u8] = b"combat";
pub const D20: u8 = 20;

/// Nano id length (nano default). Fixed so the session stays zero-copy sized.
pub const MONSTER_ID_LEN: usize = 21;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, AnchorSerialize, AnchorDeserialize)]
pub enum CombatStatus {
    #[default]
    InProgress,
    Victory,
    Defeat,
    Draw,
}

/// One damage group of an attack, e.g. `2d8+3`. Mirrors the TS `Damage`:
/// `damage_type` is omitted on-chain (damage types/resistances are deferred).
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct DamageRoll {
    pub die: u8,
    pub num_die: u8,
    pub damage_bonus: i16,
}

/// Shared attack shape for the player and the monster. `to_hit` is the
/// attack-roll bonus added to the d20 (the `+5` of `+5 (2d8+3)`); `None` is
/// treated as `+0`.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct Attack {
    pub to_hit: Option<i8>,
    pub damages: Vec<DamageRoll>,
}

/// One reusable fight per character. Never accumulates; `start_combat`
/// overwrites. Monster identity/stats come from the encounter ticket, the
/// attacks from the per-round payload; only the payload hash sits on-chain.
#[account]
pub struct CombatSession {
    pub character: Pubkey,
    pub status: CombatStatus,
    pub round: u8,
    pub commit_pending: bool,
    pub monster_id: [u8; MONSTER_ID_LEN],
    pub monster_ac: u8,
    pub monster_hp: u16,
    pub character_hp: u16,
    pub encounter_id: u64,
    /// `keccak256(round_payload_bytes)`; bound at commit, re-checked on reveal.
    pub round_payload_hash: [u8; 32],
    /// Monotonic across encounters; a replayed encounter ticket is rejected.
    pub last_nonce: u64,
    pub bump: u8,
}

impl CombatSession {
    pub const SPACE: usize =
        32 + 1 + 1 + 1 + MONSTER_ID_LEN + 1 + 2 + 2 + 8 + 32 + 8 + 1;
}

/// Scalar round report. Only the hit roll is a d20; damage totals come from the
/// attack's own dice.
#[derive(Clone, Debug, PartialEq, Eq, AnchorSerialize, AnchorDeserialize)]
pub struct CombatRoundResult {
    pub round: u8,
    pub player_hit: u8,
    pub player_hit_success: bool,
    pub player_crit: bool,
    pub player_damages: u16,
    pub monster_hit: u8,
    pub monster_hit_success: bool,
    pub monster_damages: u16,
    pub monster_hp: u16,
    pub character_hp: u16,
    pub status: CombatStatus,
}

/// Floored `(stat - 10) / 2`, valid for negative results.
pub fn ability_modifier(stat: u8) -> i16 {
    (stat as i16 - 10).div_euclid(2)
}

pub fn proficiency(level: u8) -> i16 {
    2 + (level.max(1) as i16 - 1) / 4
}

fn attack_stat(class: &CharacterClass, stats: &CharacterStats) -> u8 {
    match class {
        CharacterClass::Barbarian | CharacterClass::Monk | CharacterClass::Warrior => {
            stats.strength
        }
        CharacterClass::Thief => stats.dexterity,
        CharacterClass::Wizard | CharacterClass::Sorcerer | CharacterClass::Druid => {
            stats.intelligence
        }
    }
}

/// Unarmored AC from stats + class only. Equipment and Draconic Resilience are
/// not modeled yet.
/// shortcut: no armor/shield/subclass bonuses, add when inventory lands.
pub fn armor_class(class: &CharacterClass, stats: &CharacterStats) -> u8 {
    let dex = ability_modifier(stats.dexterity);
    let total = match class {
        CharacterClass::Barbarian => 10 + dex + ability_modifier(stats.constitution),
        CharacterClass::Monk => 10 + dex + ability_modifier(stats.wisdom),
        _ => 10 + dex,
    };
    total.clamp(0, u8::MAX as i16) as u8
}

pub fn attack_bonus(class: &CharacterClass, level: u8, stats: &CharacterStats) -> i16 {
    proficiency(level) + ability_modifier(attack_stat(class, stats))
}

pub fn damage_die(class: &CharacterClass) -> u8 {
    match class {
        CharacterClass::Barbarian | CharacterClass::Warrior => 8,
        CharacterClass::Thief | CharacterClass::Monk => 6,
        CharacterClass::Wizard | CharacterClass::Sorcerer | CharacterClass::Druid => 4,
    }
}

fn lane_hash(parts: &[&[u8]]) -> [u8; 32] {
    let mut buf = Vec::new();
    for part in parts {
        buf.extend_from_slice(part);
    }
    keccak::hash(&buf).to_bytes()
}

/// Every round value derives from the one committed 32-byte raw, so aborting
/// after seeing the player's roll cannot change the monster's response. Each
/// die is indexed (round, attack, roll group, die) so it gets its own number.
pub fn derive_player_damage_roll(
    raw: &[u8; 32],
    character: &Pubkey,
    encounter_id: u64,
    round: u8,
    player_die: u8,
) -> u8 {
    let m = encounter_id.to_le_bytes();
    lane_hash(&[raw, character.as_ref(), &m, &[round], b"p-dmg"])[0] % player_die.max(1) + 1
}

pub fn derive_monster_d20(raw: &[u8; 32], encounter_id: u64, round: u8, attack_index: u8) -> u8 {
    let m = encounter_id.to_le_bytes();
    lane_hash(&[raw, &m, &[round], &[attack_index], b"m-atk"])[0] % D20 + 1
}

pub fn derive_monster_die(
    raw: &[u8; 32],
    encounter_id: u64,
    round: u8,
    attack_index: u8,
    roll_index: u8,
    die_index: u8,
    die: u8,
) -> u8 {
    let m = encounter_id.to_le_bytes();
    lane_hash(&[
        raw,
        &m,
        &[round],
        &[attack_index],
        &[roll_index],
        &[die_index],
        b"m-dmg",
    ])[0]
        % die.max(2)
        + 1
}

pub struct RoundInput<'a> {
    pub round: u8,
    pub player_d20: u8,
    pub raw: [u8; 32],
    pub character: Pubkey,
    pub encounter_id: u64,
    pub monster_ac: u8,
    pub monster_hp: u16,
    pub attacks: &'a [Attack],
    pub player_ac: u8,
    pub character_hp: u16,
    pub attack_bonus: i16,
    pub player_die: u8,
}

pub struct RoundOutcome {
    pub result: CombatRoundResult,
    pub monster_hp: u16,
    pub character_hp: u16,
    pub status: CombatStatus,
    pub next_round: u8,
}

fn hit(roll: u8, bonus: i16, target_ac: u8) -> bool {
    if roll == D20 {
        true
    } else if roll == 1 {
        false
    } else {
        roll as i16 + bonus >= target_ac as i16
    }
}

fn monster_attack_damage(
    attack: &Attack,
    raw: &[u8; 32],
    encounter_id: u64,
    round: u8,
    attack_index: u8,
) -> u16 {
    let mut total: i16 = 0;
    for (roll_index, roll) in attack.damages.iter().enumerate() {
        let mut group_total: i16 = roll.damage_bonus;
        for die_index in 0..roll.num_die {
            group_total += derive_monster_die(
                raw,
                encounter_id,
                round,
                attack_index,
                roll_index as u8,
                die_index,
                roll.die,
            ) as i16;
        }
        total += group_total;
    }
    total.max(1) as u16
}

pub fn resolve_round(input: RoundInput) -> RoundOutcome {
    let player_damage_roll = derive_player_damage_roll(
        &input.raw,
        &input.character,
        input.encounter_id,
        input.round,
        input.player_die,
    );
    let player_crit = input.player_d20 == D20;
    let player_hit = hit(input.player_d20, input.attack_bonus, input.monster_ac);
    // nat 20 doubles the damage dice; modeled as a doubled roll.
    let player_damage = if player_hit {
        player_damage_roll as u16 * if player_crit { 2 } else { 1 }
    } else {
        0
    };
    let monster_hp = input.monster_hp.saturating_sub(player_damage);

    // Simultaneous round: the monster still swings on the round it dies, so a
    // mutual kill is a Draw. Every attack gets its own d20 and damage.
    let mut monster_attacks = Vec::with_capacity(input.attacks.len());
    let mut monster_damage = 0u16;
    let mut monster_hit = false;
    for (index, attack) in input.attacks.iter().enumerate() {
        let index = index as u8;
        let d20 = derive_monster_d20(&input.raw, input.encounter_id, input.round, index);
        let landed = hit(d20, attack.to_hit.unwrap_or(0) as i16, input.player_ac);
        let damage = if landed {
            monster_attack_damage(attack, &input.raw, input.encounter_id, input.round, index)
        } else {
            0
        };
        monster_hit |= landed;
        monster_damage = monster_damage.saturating_add(damage);
        monster_attacks.push(MonsterAttackResult {
            index,
            d20,
            hit: landed,
            damage,
        });
    }
    let mut character_hp = input.character_hp.saturating_sub(monster_damage);

    let monster_dead = monster_hp == 0;
    let character_dead = character_hp == 0;

    let (status, next_round) = match (monster_dead, character_dead) {
        (true, true) => (CombatStatus::Draw, input.round),
        (true, false) => (CombatStatus::Victory, input.round),
        (false, true) => {
            character_hp = 1; // pinned on defeat, per plan
            (CombatStatus::Defeat, input.round)
        }
        (false, false) => (CombatStatus::InProgress, input.round + 1),
    };

    RoundOutcome {
        result: CombatRoundResult {
            round: input.round,
            player_d20: input.player_d20,
            player_hit,
            player_crit,
            player_damage,
            monster_attacks,
            monster_hit,
            monster_damage,
            monster_hp,
            character_hp,
            status,
        },
        monster_hp,
        character_hp,
        status,
        next_round,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn stats() -> CharacterStats {
        CharacterStats {
            strength: 10,
            dexterity: 14,
            constitution: 10,
            intelligence: 10,
            wisdom: 10,
            charisma: 10,
            health: 20,
            hit_points: 20,
        }
    }

    fn attack(to_hit: Option<i8>, die: u8, num_die: u8, damage_bonus: i16) -> Attack {
        Attack {
            to_hit,
            damages: vec![DamageRoll {
                die,
                num_die,
                damage_bonus,
            }],
        }
    }

    fn round_input<'a>(attacks: &'a [Attack]) -> RoundInput<'a> {
        RoundInput {
            round: 1,
            player_d20: 10,
            raw: [7u8; 32],
            character: Pubkey::new_from_array([3u8; 32]),
            encounter_id: 1,
            monster_ac: 12,
            monster_hp: 100,
            attacks,
            player_ac: 12,
            character_hp: 100,
            attack_bonus: 5,
            player_die: 8,
        }
    }

    #[test]
    fn ability_modifier_floors_negatives() {
        assert_eq!(ability_modifier(10), 0);
        assert_eq!(ability_modifier(14), 2);
        assert_eq!(ability_modifier(3), -4); // floor(-3.5)
        assert_eq!(ability_modifier(1), -5);
    }

    #[test]
    fn armor_class_is_class_dependent_and_unarmored() {
        let mut s = stats();
        s.dexterity = 14; // +2
        s.constitution = 16; // +3
        s.wisdom = 18; // +4
        assert_eq!(armor_class(&CharacterClass::Warrior, &s), 12);
        assert_eq!(armor_class(&CharacterClass::Barbarian, &s), 15);
        assert_eq!(armor_class(&CharacterClass::Monk, &s), 16);
    }

    #[test]
    fn proficiency_and_damage_die_follow_class_tables() {
        assert_eq!(proficiency(1), 2);
        assert_eq!(proficiency(5), 3);
        assert_eq!(damage_die(&CharacterClass::Warrior), 8);
        assert_eq!(damage_die(&CharacterClass::Thief), 6);
        assert_eq!(damage_die(&CharacterClass::Wizard), 4);
    }

    #[test]
    fn lanes_are_deterministic_and_in_bounds() {
        let key = Pubkey::new_from_array([1u8; 32]);
        assert_eq!(
            derive_player_damage_roll(&[9u8; 32], &key, 5, 2, 8),
            derive_player_damage_roll(&[9u8; 32], &key, 5, 2, 8)
        );
        assert!((1..=8).contains(&derive_player_damage_roll(&[9u8; 32], &key, 5, 2, 8)));
        assert!((1..=20).contains(&derive_monster_d20(&[9u8; 32], 5, 2, 0)));
    }

    #[test]
    fn every_die_gets_a_distinct_lane() {
        let raw = [3u8; 32];
        let first = derive_monster_die(&raw, 1, 1, 0, 0, 0, 6);
        let second = derive_monster_die(&raw, 1, 1, 0, 0, 1, 6);
        assert_ne!(first, second);
        assert!((1..=6).contains(&first));
    }

    #[test]
    fn round_continues_when_nobody_dies() {
        let attacks = [attack(Some(0), 6, 1, 0)];
        let outcome = resolve_round(round_input(&attacks));
        assert_eq!(outcome.status, CombatStatus::InProgress);
        assert_eq!(outcome.next_round, 2);
        assert!(outcome.result.player_hit);
        assert_eq!(outcome.result.monster_attacks.len(), 1);
    }

    #[test]
    fn natural_one_auto_misses() {
        let attacks = [attack(Some(0), 6, 1, 0)];
        let mut input = round_input(&attacks);
        input.player_d20 = 1;
        input.attack_bonus = 100; // still misses
        let outcome = resolve_round(input);
        assert!(!outcome.result.player_hit);
        assert_eq!(outcome.result.player_damage, 0);
    }

    #[test]
    fn natural_twenty_doubles_weapon_damage() {
        let attacks = [attack(Some(0), 6, 1, 0)];
        let mut input = round_input(&attacks);
        input.player_d20 = 20;
        let base = derive_player_damage_roll(
            &input.raw,
            &input.character,
            input.encounter_id,
            input.round,
            input.player_die,
        );
        let outcome = resolve_round(input);
        assert!(outcome.result.player_crit);
        assert_eq!(outcome.result.player_damage, base as u16 * 2);
    }

    #[test]
    fn multi_die_attack_sums_dice_and_bonus() {
        let attacks = [attack(Some(0), 6, 3, 5)];
        let outcome = resolve_round(round_input(&attacks));
        let expected = (0..3).fold(5u16, |sum, die_index| {
            sum + derive_monster_die(&[7u8; 32], 1, 1, 0, 0, die_index, 6) as u16
        });
        assert!(outcome.result.monster_hit);
        assert_eq!(outcome.result.monster_damage, expected);
    }

    #[test]
    fn killing_the_monster_is_victory() {
        let attacks = [attack(Some(-100), 6, 1, 0)]; // monster cannot hurt the player
        let mut input = round_input(&attacks);
        input.monster_hp = 1;
        input.attack_bonus = 100;
        let outcome = resolve_round(input);
        assert_eq!(outcome.status, CombatStatus::Victory);
        assert_eq!(outcome.monster_hp, 0);
    }

    #[test]
    fn dropped_character_is_defeat_pinned_at_one() {
        let attacks = [attack(Some(100), 6, 1, 0)];
        let mut input = round_input(&attacks);
        input.player_d20 = 1; // no player damage
        input.character_hp = 1;
        input.player_ac = 0;
        let outcome = resolve_round(input);
        assert_eq!(outcome.status, CombatStatus::Defeat);
        assert_eq!(outcome.character_hp, 1);
    }

    #[test]
    fn mutual_kill_is_draw() {
        let attacks = [attack(Some(100), 6, 1, 0)];
        let mut input = round_input(&attacks);
        input.monster_hp = 1;
        input.attack_bonus = 100;
        input.character_hp = 1;
        input.player_ac = 0;
        let outcome = resolve_round(input);
        assert_eq!(outcome.status, CombatStatus::Draw);
    }
}
