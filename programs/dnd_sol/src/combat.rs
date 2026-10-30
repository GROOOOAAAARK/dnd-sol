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

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct Attack {
    /// The `+5` of a `+5 (2d8+3)` attack card: added to the monster's d20.
    pub to_hit: Option<i8>,
    pub damages: Vec<DamageRoll>,
}

/// One reusable fight per character. Never accumulates; `start_combat`
/// overwrites. The monster's attacks live in the encounter ticket (attester
/// signed); only its hash is kept on-chain so the PDA stays small.
#[account]
pub struct CombatSession {
    pub character: Pubkey,
    pub status: CombatStatus,
    pub round: u8,
    pub commit_pending: bool,
    pub monster_id: [u8; MONSTER_ID_LEN],
    pub monster_hp: u16,
    pub character_hp: u16,
    /// `keccak256(encounter_ticket_bytes)`; bound at start, re-checked on reveal.
    pub ticket_hash: [u8; 32],
    /// Monotonic across encounters; a replayed ticket is rejected.
    pub last_nonce: u64,
    pub bump: u8,
}

impl CombatSession {
    pub const SPACE: usize = 32 + 1 + 1 + 1 + MONSTER_ID_LEN + 2 + 2 + 32 + 8 + 1;
}

#[derive(Clone, Debug, PartialEq, Eq, AnchorSerialize, AnchorDeserialize)]
pub struct MonsterAttackResult {
    pub index: u8,
    pub d20: u8,
    pub hit: bool,
    pub damage: u16,
}

#[derive(Clone, Debug, PartialEq, Eq, AnchorSerialize, AnchorDeserialize)]
pub struct CombatRoundResult {
    pub round: u8,
    pub player_d20: u8,
    pub player_hit: bool,
    pub player_crit: bool,
    pub player_damage: u16,
    pub monster_attacks: Vec<MonsterAttackResult>,
    pub monster_hit: bool,
    pub monster_damage: u16,
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
