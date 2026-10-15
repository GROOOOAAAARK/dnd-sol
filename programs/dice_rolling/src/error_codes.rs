use anchor_lang::error_code;

#[error_code]
pub enum ErrorCodes {
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
    #[msg("Invalid randomness account")]
    InvalidRandomnessAccount,
    #[msg("Invalid randomness seed slot")]
    InvalidRandomnessSeedSlot,
}
