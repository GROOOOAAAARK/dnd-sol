use anchor_lang::prelude::*;
use anchor_lang::{AnchorDeserialize, AnchorSerialize, ToAccountInfo};
use anchor_lang::solana_program::{program::invoke, instruction::Instruction};

declare_id!("FsE3oPaYDdRvso1C9zLub9AEfbzN9kkHRBbnMxtUK4f4");

#[program]
pub mod dnd_sol {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Welcome to the world of DnD Sol: {:?}", ctx.program_id);
        Ok(())
    }

    pub fn create_character(
        ctx: Context<CharacterScope>,
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
            ctx,
            name,
            character_class.into(),
            character_race.into(),
            strength,
            dexterity,
            constitution,
            intelligence,
            wisdom,
            charisma,
        ).unwrap();
        msg!("Character created: {:?}", character.attributes.name);
        Ok(())
    }

    pub fn do_action(ctx: Context<CharacterScope>, dice_size: u8, success_floor: u8, bonus: u8) -> Result<()> {

        let dice_rolling_program = dice_rolling::id();
        let account_meta = vec![
            AccountMeta::new(dice_rolling_program, false),
            AccountMeta::new(ctx.accounts.player.key(), false),
            AccountMeta::new(ctx.accounts.player.key(), false),
            AccountMeta::new(ctx.accounts.system_program.key(), false),
        ];

        //INFO: dice_rolling.commit_roll function discriminator
        let instruction_discriminator: [u8; 8]= [225, 122, 182, 84, 21, 244, 202, 153];

        let mut instruction_data = Vec::with_capacity(2 + 8 + 8 + 8 + 32);
        instruction_data.extend_from_slice(&instruction_discriminator);
        instruction_data.extend_from_slice(&dice_size.to_le_bytes());
        instruction_data.extend_from_slice(&success_floor.to_le_bytes());
        instruction_data.extend_from_slice(&bonus.to_le_bytes());
        instruction_data.extend_from_slice(&ctx.accounts.player.key().to_bytes());

        let instruction = Instruction {
            program_id: dice_rolling_program,
            accounts: account_meta,
            data: instruction_data,
        };

        let dice_rolled = invoke(
            &instruction,
            &[
                ctx.accounts.character.to_account_info(),
                ctx.accounts.player.to_account_info(),
                ctx.accounts.system_program.to_account_info()
            ]
        )?;

        Ok(dice_rolled)
    }

    pub fn reveal_action_result(ctx: Context<CharacterScope>) -> Result<()> {
        let dice_rolling_program = dice_rolling::id();
        let account_meta = vec![
            AccountMeta::new(dice_rolling_program, false),
            AccountMeta::new(ctx.accounts.player.key(), false),
            AccountMeta::new(ctx.accounts.player.key(), false),
            AccountMeta::new(ctx.accounts.system_program.key(), false),
        ];

        //INFO: dice_rolling.settle_roll function discriminator
        let instruction_discriminator: [u8; 8]= [71, 48, 214, 3, 61, 20, 126, 255];

        let mut instruction_data: Vec<u8> = Vec::with_capacity(2 + 8);
        instruction_data.extend_from_slice(&instruction_discriminator);

        let instruction = Instruction {
            program_id: dice_rolling_program,
            accounts: account_meta,
            data: instruction_data,
        };

        let rolling_result = invoke(
            &instruction,
            &[
                ctx.accounts.character.to_account_info(),
                ctx.accounts.player.to_account_info(),
                ctx.accounts.system_program.to_account_info()
            ]
        )?;


        Ok(rolling_result)
    }

    // pub fn get_character()
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(init, payer=payer, space = 8+Character::SPACE, seeds = [b"dnd_sol"], bump)]
    pub character: Account<'info, CharacterAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CharacterScope<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(init, payer=player, space = 8+Character::SPACE)]
    pub character: Account<'info, CharacterAccount>,

    pub system_program: Program<'info, System>,
}

#[account]
#[derive(Default)]
pub struct CharacterAccount {
    pub character: Character,
    pub player: Pubkey,
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


impl Character {
    pub const SPACE: usize = 32 + // pubkey
                             50 + // name (variable, estimated)
                             20 + // class (variable, estimated)
                             1 +  // level
                             4 +  // experience
                             1 +  // strength
                             1 +  // dexterity
                             1 +  // constitution
                             1 +  // intelligence
                             1 +  // wisdom
                             1 +  // charisma
                             2 +  // health
                             2;   // max_health

    pub fn create(
        ctx: Context<CharacterScope>,
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
        let character: &mut Character = &mut Default::default();

        if strength + dexterity + constitution + intelligence + wisdom + charisma > 10 {
            return Err(ErrorCode::StatsTooHigh.into());
        }

        if strength + dexterity + constitution + intelligence + wisdom + charisma < 10 {
            return Err(ErrorCode::StatsTooLow.into());
        }

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

        ctx.accounts.character.character = character.clone();
        ctx.accounts.character.player = ctx.accounts.player.key();
        Ok(character.clone())
    }

    fn _is_character_creation_fair(&self) -> Result<bool> {
        let total_stats = self.stats.strength + self.stats.dexterity + self.stats.constitution + self.stats.intelligence + self.stats.wisdom + self.stats.charisma;
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
}
