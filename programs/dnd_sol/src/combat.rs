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

