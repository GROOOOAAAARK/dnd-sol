use crate::character::{CharacterClass, CharacterStats};
use anchor_lang::prelude::*;
use dice_rolling::RollType;
use solana_keccak_hasher as keccak;

pub const COMBAT_SEED: &[u8] = b"combat";

#[derive(PartialEq)]
pub enum DiceType {
    D100 = 100,
    D20 = 20,
    D12 = 12,
    D10 = 10,
    D8 = 8,
    D6 = 6,
    D4 = 4,
    D2 = 2,
}

#[derive(PartialEq)]
pub enum Sender {
    Player,
    Monster,
}

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
    pub const SPACE: usize = 32 + 1 + 1 + 1 + MONSTER_ID_LEN + 1 + 2 + 2 + 8 + 32 + 8 + 1;
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

/// Main-hand attack bonus (proficiency + attack ability modifier), used by the
/// backend when it builds the player's signed attack.
/// TODO: pass type of attack here (melee, distant or magic) to determine ability_modifier use
pub fn attack_bonus(class: &CharacterClass, level: u8, stats: &CharacterStats) -> i16 {
    proficiency(level) + ability_modifier(attack_stat(class, stats))
}

/// Main-hand damage die per class.
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
/// after seeing the sender's roll cannot change the next sender's response. Each
/// die is indexed (round, roll group, die) so it gets its own number.
pub fn derive_die(
    sender: Sender,
    roll_type: RollType,
    raw: &[u8; 32],
    encounter_id: u64,
    round: u8,
    roll_index: u8,
    die_index: u8,
    die: u8,
    character: Option<&Pubkey>,
) -> u8 {
    let m = encounter_id.to_le_bytes();
    let str_sender = if sender == Sender::Player { "p" } else { "m" };
    let str_roll_type = if roll_type == RollType::Hit {
        "atk"
    } else {
        "dmg"
    };
    let join_vec = [str_sender, str_roll_type].join("-");
    let seed = join_vec.as_bytes();
    let character_enriched_seed: &[u8] = if character.is_some() {
        &[seed, character.unwrap().as_array()].concat().to_vec()
    } else {
        seed
    };
    lane_hash(&[
        raw,
        &m,
        &[round],
        &[roll_index],
        &[die_index],
        character_enriched_seed,
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
    pub player: &'a Attack,
    pub monster: &'a Attack,
    pub player_ac: u8,
    pub character_hp: u16,
}

pub struct RoundOutcome {
    pub result: CombatRoundResult,
    pub monster_hp: u16,
    pub character_hp: u16,
    pub status: CombatStatus,
    pub next_round: u8,
}

fn hit(roll: u8, bonus: i16, target_ac: u8) -> bool {
    if roll == 20 {
        true
    } else if roll == 1 {
        false
    } else {
        roll as i16 + bonus >= target_ac as i16
    }
}

fn attack_damage<F: Fn(u8, u8, u8) -> u8>(attack: &Attack, die_value: F) -> u16 {
    let mut total: i16 = 0;
    for (roll_index, roll) in attack.damages.iter().enumerate() {
        let mut group_total: i16 = roll.damage_bonus;
        for die_index in 0..roll.num_die {
            group_total += die_value(roll_index as u8, die_index, roll.die) as i16;
        }
        total += group_total;
    }
    total.max(1) as u16
}

pub fn resolve_round(input: RoundInput) -> RoundOutcome {
    let player_crit = input.player_d20 == 20;
    let player_hit_success = hit(
        input.player_d20,
        input.player.to_hit.unwrap_or(0) as i16,
        input.monster_ac,
    );
    let player_damages = if player_hit_success {
        let base = attack_damage(input.player, |roll_index, die_index, die| {
            derive_die(
                Sender::Player,
                RollType::Damage,
                &input.raw,
                input.encounter_id,
                input.round,
                roll_index,
                die_index,
                die,
                Some(&input.character),
            )
        });
        // nat 20 doubles the damage dice; modeled as a doubled total.
        base * if player_crit { 2 } else { 1 }
    } else {
        0
    };
    let monster_hp = input.monster_hp.saturating_sub(player_damages);

    // TODO: reevaluate this part, not sure it's really fair
    // Simultaneous round: the monster still swings on the round it dies, so a
    // mutual kill is a Draw.
    let monster_hit = derive_die(
        Sender::Monster,
        RollType::Hit,
        &input.raw,
        input.encounter_id,
        input.round,
        0,
        0,
        0,
        None,
    );
    let monster_hit_success = hit(
        monster_hit,
        input.monster.to_hit.unwrap_or(0) as i16,
        input.player_ac,
    );
    let monster_damages = if monster_hit_success {
        attack_damage(input.monster, |roll_index, die_index, die| {
            derive_die(
                Sender::Monster,
                RollType::Damage,
                &input.raw,
                input.encounter_id,
                input.round,
                roll_index,
                die_index,
                die,
                None,
            )
        })
    } else {
        0
    };
    let mut character_hp = input.character_hp.saturating_sub(monster_damages);

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
            player_hit: input.player_d20,
            player_hit_success,
            player_crit,
            player_damages,
            monster_hit,
            monster_hit_success,
            monster_damages,
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

    fn round_input<'a>(player: &'a Attack, monster: &'a Attack) -> RoundInput<'a> {
        RoundInput {
            round: 1,
            player_d20: 10,
            raw: [7u8; 32],
            character: Pubkey::new_from_array([3u8; 32]),
            encounter_id: 1,
            monster_ac: 12,
            monster_hp: 100,
            player,
            monster,
            player_ac: 12,
            character_hp: 100,
        }
    }

    /// Deterministic raw whose monster d20 satisfies `pred` (encounter 1, round 1).
    fn raw_where(mut pred: impl FnMut(u8) -> bool) -> [u8; 32] {
        for value in 0..=255u8 {
            let raw = [value; 32];
            if pred(derive_die(
                Sender::Monster,
                RollType::Hit,
                &raw,
                1,
                1,
                0,
                0,
                20,
                None,
            )) {
                return raw;
            }
        }
        panic!("no raw satisfies predicate");
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
            derive_die(
                Sender::Player,
                RollType::Damage,
                &[9u8; 32],
                5,
                2,
                0,
                0,
                8,
                Some(&key),
            ),
            derive_die(
                Sender::Monster,
                RollType::Damage,
                &[9u8; 32],
                5,
                2,
                0,
                0,
                8,
                Some(&key),
            )
        );
        assert!((1..=8).contains(&derive_die(
            Sender::Player,
            RollType::Damage,
            &[9u8; 32],
            5,
            2,
            0,
            0,
            8,
            Some(&key)
        )));
        assert!((1..=20).contains(&derive_die(
            Sender::Monster,
            RollType::Damage,
            &[9u8; 32],
            5,
            2,
            0,
            0,
            20,
            None,
        )));
    }

    #[test]
    fn every_die_gets_a_distinct_lane() {
        let values: Vec<u8> = (0..6)
            .map(|die_index| {
                derive_die(
                    Sender::Monster,
                    RollType::Damage,
                    &[3u8; 32],
                    1,
                    1,
                    0,
                    die_index,
                    6,
                    None,
                )
            })
            .collect();
        assert!(values.iter().all(|value| (1..=6).contains(value)));
        assert!(values.iter().any(|value| *value != values[0]));
    }

    #[test]
    fn round_continues_when_nobody_dies() {
        let player = attack(Some(5), 8, 1, 0);
        let monster = attack(Some(0), 6, 1, 0);
        let outcome = resolve_round(round_input(&player, &monster));
        assert_eq!(outcome.status, CombatStatus::InProgress);
        assert_eq!(outcome.next_round, 2);
        assert!(outcome.result.player_hit_success);
    }

    #[test]
    fn natural_one_auto_misses() {
        let player = attack(Some(100), 8, 1, 0); // still misses on a nat 1
        let monster = attack(Some(0), 6, 1, 0);
        let mut input = round_input(&player, &monster);
        input.player_d20 = 1;
        let outcome = resolve_round(input);
        assert!(!outcome.result.player_hit_success);
        assert_eq!(outcome.result.player_damages, 0);
    }

    #[test]
    fn natural_twenty_doubles_weapon_damage() {
        let player = attack(Some(5), 8, 1, 0);
        let monster = attack(Some(-100), 6, 1, 0);
        let mut input = round_input(&player, &monster);
        input.player_d20 = 20;
        let base = derive_die(
            Sender::Player,
            RollType::Damage,
            &input.raw,
            input.encounter_id,
            input.round,
            0,
            0,
            8,
            Some(&input.character),
        );
        let outcome = resolve_round(input);
        assert!(outcome.result.player_crit);
        assert_eq!(outcome.result.player_damages, base as u16 * 2);
    }

    #[test]
    fn multi_die_attack_sums_dice_and_bonus() {
        let player = attack(Some(5), 8, 1, 0);
        let monster = attack(Some(100), 6, 3, 5);
        let raw = raw_where(|d20| d20 != 1);
        let mut input = round_input(&player, &monster);
        input.raw = raw;
        let outcome = resolve_round(input);
        let expected = (0..3).fold(5u16, |sum, die_index| {
            sum + derive_die(
                Sender::Monster,
                RollType::Damage,
                &raw,
                1,
                1,
                0,
                die_index,
                6,
                None,
            ) as u16
        });
        assert!(outcome.result.monster_hit_success);
        assert_eq!(outcome.result.monster_damages, expected);
    }

    #[test]
    fn killing_the_monster_is_victory() {
        let player = attack(Some(100), 8, 1, 0);
        let monster = attack(Some(-100), 6, 1, 0); // cannot hurt the player
        let mut input = round_input(&player, &monster);
        input.monster_hp = 1;
        let outcome = resolve_round(input);
        assert_eq!(outcome.status, CombatStatus::Victory);
        assert_eq!(outcome.monster_hp, 0);
    }

    #[test]
    fn dropped_character_is_defeat_pinned_at_one() {
        let player = attack(Some(0), 8, 1, 0);
        let monster = attack(Some(100), 6, 1, 0);
        let mut input = round_input(&player, &monster);
        input.player_d20 = 1; // no player damage
        input.character_hp = 1;
        input.player_ac = 0;
        input.raw = raw_where(|d20| d20 != 1);
        let outcome = resolve_round(input);
        assert_eq!(outcome.status, CombatStatus::Defeat);
        assert_eq!(outcome.character_hp, 1);
    }

    #[test]
    fn mutual_kill_is_draw() {
        let player = attack(Some(100), 8, 1, 0);
        let monster = attack(Some(100), 6, 1, 0);
        let mut input = round_input(&player, &monster);
        input.monster_hp = 1;
        input.character_hp = 1;
        input.player_ac = 0;
        input.raw = raw_where(|d20| d20 != 1);
        let outcome = resolve_round(input);
        assert_eq!(outcome.status, CombatStatus::Draw);
    }
}
