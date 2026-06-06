use anchor_lang::prelude::*;
use switchboard_on_demand::RandomnessAccountData;

declare_id!("LTwGJmVKw2FkgByX2JehTkS2AqddnniuA2jyV4zZzwv");

#[program]
pub mod dice_rolling {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Let's roll the dice ({:?})", ctx.program_id);
        let dice_rolling = &mut ctx.accounts.dice_rolling;
        dice_rolling.latest_roll_result = 0;
        dice_rolling.randomness_account = Pubkey::default(); // Placeholder, will be set in commit_roll
        dice_rolling.success_floor = 20;
        dice_rolling.bonus = 0;
        dice_rolling.bump = ctx.bumps.dice_rolling;
        dice_rolling.allowed_user = ctx.accounts.user.key();

        Ok(())
    }

    pub fn roll_and_reveal(
        ctx: Context<CommitRoll>,
        dice_size: u8,
        success_floor: u8,
        bonus: u8,
    ) -> Result<DiceResult> {
        let rolling_committed = DiceRollingState::roll(ctx, dice_size, success_floor, bonus, randomness_account)?;
        if !rolling_committed {
            return Err(ErrorCode::RollingNotCommitted.into());
        }
        let dice_result = DiceRollingState::settle(ctx)?;
        Ok(dice_result)
    }
}

impl DiceRollingState {
    pub const SPACE: usize = 8 + // allowed_user
    1 + // latest_roll_result
    32 + // randomness_account
    8 + // dice_size
    8 + // success_floor
    8 + // bonus
    1; // bump

    fn roll(
        ctx: Context<DiceRoll>,
        dice_size: u8,
        success_floor: u8,
        bonus: u8,
        randomness_account: Pubkey,
    ) -> Result<bool> {
        let dice_rolling = &mut ctx.accounts.dice_rolling;

        if dice_size < 2 {
            return Err(ErrorCode::DiceSizeTooLow.into());
        }

        dice_rolling.dice_size = dice_size;
        dice_rolling.success_floor = success_floor;
        dice_rolling.bonus = bonus;

        let clock: Clock = Clock::get()?;
        let randomness_data =
            RandomnessAccountData::parse(ctx.accounts.randomness_account_data.data.borrow())
                .unwrap();
        if randomness_data.seed_slot != clock.slot - 1 {
            msg!("seed_slot: {}", randomness_data.seed_slot);
            msg!("slot: {}", clock.slot);
            return Err(ErrorCode::RandomnessAlreadyRevealed.into());
        }

        dice_rolling.randomness_account = randomness_account;
        Ok(true)
    }

    fn settle(ctx: Context<DiceRoll>) -> Result<DiceResult> {
        let clock = Clock::get()?;
        let dice_rolling = &mut ctx.accounts.dice_rolling;

        if ctx.accounts.randomness_account_data.key() != dice_rolling.randomness_account {
            return Err(ErrorCode::RandomnessAccountMismatch.into());
        }

        let randomness_data =
        RandomnessAccountData::parse(ctx.accounts.randomness_account_data.data.borrow())
            .unwrap();

        if randomness_data.seed_slot != dice_rolling.commit_slot {
                return Err(ErrorCode::RandomnessExpired.into());
            }

        // call the switchboard on-demand get_value function to get the revealed random value
        let revealed_random_value = randomness_data
        .get_value(&clock)
        .map_err(|_| ErrorCode::RandomnessNotResolved)?;

        let modulated_random_value: u8 = revealed_random_value[0] % dice_rolling.dice_size;

        let critical_success = modulated_random_value == dice_rolling.dice_size;
        let critical_failure = modulated_random_value == 0;

        let success = modulated_random_value + dice_rolling.bonus >= dice_rolling.success_floor
            && !critical_failure;

        let dice_result = DiceResult {
            raw_result: modulated_random_value,
            bonus: dice_rolling.bonus,
            success,
            critical_success,
            critical_failure,
        };

        // Update and log the result
        dice_rolling.latest_roll_result = modulated_random_value;

        Ok(dice_result)
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer=user, space=DiceRollingState::SPACE, seeds = [b"dice_rolling".as_ref(), user.key().as_ref()], bump)]
    pub dice_rolling: Account<'info, DiceRollingState>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DiceRoll<'info> {
    #[account(mut, seeds = [b"dice_rolling".as_ref(), user.key().as_ref()], bump = dice_rolling.bump)]
    pub dice_rolling: Account<'info, DiceRollingState>,

    /// CHECK: This is a placeholder for the randomness account data
    pub randomness_account_data: AccountInfo<'info>,

    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(Default)]
pub struct DiceRollingState {
    pub allowed_user: Pubkey,
    pub latest_roll_result: u8,
    pub randomness_account: Pubkey,
    pub dice_size: u8,
    pub success_floor: u8,
    pub bonus: u8,
    pub bump: u8,
    pub commit_slot: u64, // The slot at which the randomness was committed
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct DiceResult {
    raw_result: u8,
    bonus: u8,
    success: bool,
    critical_success: bool,
    critical_failure: bool,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized access attempt.")]
    Unauthorized,
    #[msg("Randomness account mismatch")]
    RandomnessAccountMismatch,
    #[msg("Randomness expired")]
    RandomnessExpired,
    #[msg("Randomness not resolved")]
    RandomnessNotResolved,
    #[msg("Randomness already revealed")]
    RandomnessAlreadyRevealed,
    #[msg("Dice size is too low")]
    DiceSizeTooLow,
    #[msg("Rolling not committed")]
    RollingNotCommitted,
    #[msg("Success floor is too high")]
    SuccessFloorTooHigh,
}
