use anchor_lang::prelude::*;
use anchor_lang::{AnchorDeserialize, AnchorSerialize};

declare_id!("5XQUKVykhN5D3WkJ1MdsRxaJDmEszjRzhje3e6TjF4Wd");

#[program]
pub mod dnd_sol {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Welcome to the world of DnD Sol: {:?}", ctx.program_id);
        Ok(())
    }

    pub fn create_character(
        ctx: Context<CreateCharacter>,
        name: String,
        character_class: String,
        character_race: String,
        strength: u8,
        dexterity: u8,
        constitution: u8,
        intelligence: u8,
        wisdom: u8,
        charisma: u8,
    ) -> Result<()> {
        let character = Character::create(
            &mut ctx.accounts.character,
            &ctx.accounts.player,
            name,
            character_class.into(),
            character_race.into(),
            strength,
            dexterity,
            constitution,
            intelligence,
            wisdom,
            charisma,
        )
        ?;
        msg!("Character created: {:?}", character.attributes.name);
        Ok(())
    }

    pub fn do_action(
        ctx: Context<CharacterScope>,
        dice_size: u8,
        success_floor: u8,
        bonus: u8,
    ) -> Result<bool> {
        let cpi_program = ctx.accounts.dice_rolling_program.to_account_info();
        let cpi_accounts = dice_rolling::cpi::accounts::DiceRoll {
            dice_rolling: ctx.accounts.dice_rolling_state.to_account_info(),
            randomness_account_data: ctx.accounts.randomness_account_data.to_account_info(),
            user: ctx.accounts.player.to_account_info(),
        };

        let action_committed =dice_rolling::cpi::commit_roll(
            CpiContext::new(cpi_program, cpi_accounts),
            dice_size,
            success_floor,
            bonus,
        )?;
        Ok(action_committed.get())
    }

    pub fn reveal_action_result(ctx: Context<CharacterScope>) -> Result<dice_rolling::DiceResult> {
        let cpi_program = ctx.accounts.dice_rolling_program.to_account_info();
        let cpi_accounts = dice_rolling::cpi::accounts::DiceRoll {
            dice_rolling: ctx.accounts.dice_rolling_state.to_account_info(),
            randomness_account_data: ctx.accounts.randomness_account_data.to_account_info(),
            user: ctx.accounts.player.to_account_info(),
        };

        Ok(dice_rolling::cpi::reveal_roll(CpiContext::new(cpi_program, cpi_accounts))?.get())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct CreateCharacter<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(
        init,
        payer=player,
        space = 8 + CharacterAccount::SPACE,
        seeds = [b"character", player.key().as_ref(), name.as_bytes()],
        bump,
        constraint = name.as_bytes().len() <= CharacterAttributes::MAX_NAME_LEN @ ErrorCode::NameTooLong
    )]
    pub character: Account<'info, CharacterAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CharacterScope<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(mut, has_one = player)]
    pub character: Account<'info, CharacterAccount>,

    /// CHECK: Checked by the dice_rolling program
    #[account(mut)]
    pub dice_rolling_state: UncheckedAccount<'info>,

    /// CHECK: Checked by the dice_rolling program
    /// This is the Switchboard Randomness Account
    pub randomness_account_data: UncheckedAccount<'info>,

    pub dice_rolling_program: Program<'info, dice_rolling::program::DiceRolling>,
}

#[account]
#[derive(Default)]
pub struct CharacterAccount {
    pub character: Character,
    pub player: Pubkey,
}

impl CharacterAccount {
    pub const SPACE: usize = Character::SPACE + 32;
}

#[account]
#[derive(Default)]
pub struct Character {
    pub attributes: CharacterAttributes,
    pub stats: CharacterStats,
}

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

#[derive(Clone, Default, AnchorSerialize, AnchorDeserialize)]
pub enum CharacterRace {
    #[default]
    Human,
    Elf,
    Dwarf,
    Halfling,
    Orc,
    Troll,
}

impl From<String> for CharacterRace {
    fn from(s: String) -> Self {
        match s.to_lowercase().as_str() {
            "human" => CharacterRace::Human,
            "elf" => CharacterRace::Elf,
            "dwarf" => CharacterRace::Dwarf,
            "halfling" => CharacterRace::Halfling,
            "orc" => CharacterRace::Orc,
            "troll" => CharacterRace::Troll,
            _ => CharacterRace::default(),
        }
    }
}

#[derive(Clone, Default, AnchorSerialize, AnchorDeserialize)]
pub enum CharacterClass {
    #[default]
    Warrior,
    Mage,
    Thief,
    Barbarian,
    Monk,
    Wizard,
}

impl From<String> for CharacterClass {
    fn from(s: String) -> Self {
        match s.to_lowercase().as_str() {
            "warrior" => CharacterClass::Warrior,
            "mage" => CharacterClass::Mage,
            "thief" => CharacterClass::Thief,
            "barbarian" => CharacterClass::Barbarian,
            "monk" => CharacterClass::Monk,
            "wizard" => CharacterClass::Wizard,
            _ => CharacterClass::default(),
        }
    }
}

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
    pub max_health: u16,
}

impl CharacterStats {
    pub const SPACE: usize = 1 + 1 + 1 + 1 + 1 + 1 + 2 + 2;
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
    ) -> Result<Character> {
        if name.as_bytes().len() > CharacterAttributes::MAX_NAME_LEN {
            return Err(ErrorCode::NameTooLong.into());
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
            max_health: 10 + constitution as u16,
        };

        character.attributes = attributes;
        character.stats = stats;

        if !character._is_character_creation_fair()? {
            return Err(ErrorCode::CharacterCreationNotFair.into());
        }

        character_account.character = character.clone();
        character_account.player = player.key();
        Ok(character.clone())
    }

    fn _is_character_creation_fair(&self) -> Result<bool> {
        let total_stats = self.stats.strength
            + self.stats.dexterity
            + self.stats.constitution
            + self.stats.intelligence
            + self.stats.wisdom
            + self.stats.charisma;
        if total_stats > 10 {
            return Err(ErrorCode::StatsTooHigh.into());
        }
        if total_stats < 10 {
            return Err(ErrorCode::StatsTooLow.into());
        }
        Ok(true)
    }
}

#[error_code]
pub enum ErrorCode {
    #[msg("Character stats are too high")]
    StatsTooHigh,
    #[msg("Character stats are too low")]
    StatsTooLow,
    #[msg("Character creation is not fair")]
    CharacterCreationNotFair,
    #[msg("Character name is too long")]
    NameTooLong,
}
