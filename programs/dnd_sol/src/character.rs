use anchor_lang::error::Error;
use anchor_lang::prelude::{borsh, Account, Pubkey, Signer};
use anchor_lang::{account, AnchorDeserialize, AnchorSerialize, Discriminator, Key};

use crate::error_codes::ErrorCodes;

/* Character Class */
#[derive(Clone, Default, AnchorSerialize, AnchorDeserialize)]
pub enum CharacterClass {
    #[default]
    Warrior,
    Thief,
    Barbarian,
    Monk,
    Wizard,
    Sorcerer,
    Druid,
}

impl From<String> for CharacterClass {
    fn from(s: String) -> Self {
        match s.to_lowercase().as_str() {
            "warrior" => CharacterClass::Warrior,
            "thief" => CharacterClass::Thief,
            "barbarian" => CharacterClass::Barbarian,
            "monk" => CharacterClass::Monk,
            "wizard" => CharacterClass::Wizard,
            "sorcerer" => CharacterClass::Sorcerer,
            "druid" => CharacterClass::Druid,
            _ => CharacterClass::default(),
        }
    }
}

/* Character Race */
#[derive(Clone, Default, AnchorSerialize, AnchorDeserialize)]
pub enum CharacterRace {
    #[default]
    Human,
    Elf,
    Dwarf,
    Halfling,
    Tiefling,
    Githyanki,
    Orc,
    Dragonborn,
}

impl From<String> for CharacterRace {
    fn from(s: String) -> Self {
        match s.to_lowercase().as_str() {
            "human" => CharacterRace::Human,
            "elf" => CharacterRace::Elf,
            "dwarf" => CharacterRace::Dwarf,
            "halfling" => CharacterRace::Halfling,
            "tiefling" => CharacterRace::Tiefling,
            "githyanki" => CharacterRace::Githyanki,
            "orc" => CharacterRace::Orc,
            "dragonborn" => CharacterRace::Dragonborn,
            _ => CharacterRace::default(),
        }
    }
}

/* Character Attributes */
#[account]
#[derive(Default)]
pub struct CharacterAttributes {
    pub name: String,
    pub class: CharacterClass,
    pub level: u8,
    pub experience: u32,
    pub race: CharacterRace,
}

impl CharacterAttributes {
    pub const MAX_NAME_LEN: usize = 32;
    pub const SPACE: usize = 4 + Self::MAX_NAME_LEN + 1 + 1 + 4 + 1;
}

/* Character Stats */
#[account]
#[derive(Default)]
pub struct CharacterStats {
    pub strength: u8,
    pub dexterity: u8,
    pub constitution: u8,
    pub intelligence: u8,
    pub wisdom: u8,
    pub charisma: u8,
    pub health: u16,
    pub hit_points: u16,
}

impl CharacterStats {
    pub const SPACE: usize = 1 + 1 + 1 + 1 + 1 + 1 + 2 + 2;
}

/* Character */
#[account]
#[derive(Default)]
pub struct Character {
    pub attributes: CharacterAttributes,
    pub stats: CharacterStats,
}

impl Character {
    pub const SPACE: usize = CharacterAttributes::SPACE + CharacterStats::SPACE;

    pub fn create(
        character_account: &mut Account<CharacterAccount>,
        player: &Signer,
        name: String,
        character_class: CharacterClass,
        character_race: CharacterRace,
        strength: u8,
        dexterity: u8,
        constitution: u8,
        intelligence: u8,
        wisdom: u8,
        charisma: u8,
    ) -> Result<Character, Error> {
        if name.as_bytes().len() > CharacterAttributes::MAX_NAME_LEN {
            return Err(ErrorCodes::NameTooLong.into());
        }

        let mut character = Character::default();

        let attributes = CharacterAttributes {
            name,
            class: character_class,
            level: 1,
            experience: 0,
            race: character_race,
        };

        let stats = CharacterStats {
            strength,
            dexterity,
            constitution,
            intelligence,
            wisdom,
            charisma,
            health: 10 + constitution as u16,
            hit_points: 10 + constitution as u16,
        };

        character.attributes = attributes;
        character.stats = stats;

        if !character._is_character_creation_fair()? {
            return Err(ErrorCodes::CharacterCreationNotFair.into());
        }

        character_account.character = character.clone();
        character_account.player = player.key();
        Ok(character.clone())
    }

    fn _is_character_creation_fair(&self) -> Result<bool, Error> {
        let total_stats = self.stats.strength
            + self.stats.dexterity
            + self.stats.constitution
            + self.stats.intelligence
            + self.stats.wisdom
            + self.stats.charisma;
        if total_stats > 10 {
            return Err(ErrorCodes::StatsTooHigh.into());
        }
        if total_stats < 10 {
            return Err(ErrorCodes::StatsTooLow.into());
        }
        Ok(true)
    }
}

/* Character Account */
#[account]
#[derive(Default)]
pub struct CharacterAccount {
    pub character: Character,
    pub player: Pubkey,
}

impl CharacterAccount {
    pub const SPACE: usize = Character::SPACE + 32;
}
