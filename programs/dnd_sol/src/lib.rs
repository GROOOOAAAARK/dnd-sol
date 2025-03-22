use anchor_lang::prelude::*;

declare_id!("FsE3oPaYDdRvso1C9zLub9AEfbzN9kkHRBbnMxtUK4f4");

#[program]
pub mod dnd_sol {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Welcome to the world of DnD Sol: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
pub struct CreateCharacter<'info> {
    #[account(
        init,
        payer = player,
        space = 8 + Character::SPACE
    )]
    pub character: Account<'info, Character>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

