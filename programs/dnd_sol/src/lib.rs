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
