use anchor_lang::error_code;

#[error_code]
pub enum ErrorCodes {
    #[msg("Character stats are too high")]
    StatsTooHigh,
    #[msg("Character stats are too low")]
    StatsTooLow,
    #[msg("Character creation is not fair")]
    CharacterCreationNotFair,
    #[msg("Character name is too long")]
    NameTooLong,
    #[msg("Attestation signature is invalid")]
    InvalidAttestation,
    #[msg("Attestation has expired")]
    AttestationExpired,
    #[msg("Unsupported ticket version")]
    UnsupportedTicketVersion,
}
