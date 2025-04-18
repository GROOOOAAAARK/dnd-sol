use anchor_lang::prelude::*;

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
            character_class,
            strength,
            dexterity,
            constitution,
            intelligence,
            wisdom,
            charisma
        ).unwrap();
        msg!("Character created: {:?}", character.name);
        Ok(())
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
    pub name: String,
    pub character_class: String,
    pub level: u8,
    pub experience: u32,
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
        character_class: String,
        strength: u8,
        dexterity: u8,
        constitution: u8,
        intelligence: u8,
        wisdom: u8,
        charisma: u8
    ) -> Result<Character> {
        let character: &mut Character = &mut Default::default();

        if strength + dexterity + constitution + intelligence + wisdom + charisma > 10 {
            return Err(ErrorCode::StatsTooHigh.into());
        }

        if strength + dexterity + constitution + intelligence + wisdom + charisma < 10 {
            return Err(ErrorCode::StatsTooLow.into());
        }

        character.name = name;
        character.character_class = character_class;
        character.level = 1;
        character.experience = 0;
        character.strength = strength;
        character.dexterity = dexterity;
        character.constitution = constitution;
        character.intelligence = intelligence;
        character.wisdom = wisdom;
        character.charisma = charisma;
        character.health = 10 + constitution as u16;
        character.max_health = character.health;

        ctx.accounts.character.character = character.clone();
        ctx.accounts.character.player = ctx.accounts.player.key();
        Ok(character.clone())
    }
}

#[error_code]
pub enum ErrorCode {
    #[msg("Character stats are too high")]
    StatsTooHigh,
    #[msg("Character stats are too low")]
    StatsTooLow,
}
