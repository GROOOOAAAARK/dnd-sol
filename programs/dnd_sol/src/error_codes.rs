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
    #[msg("Encounter is not in progress")]
    CombatNotInProgress,
    #[msg("A roll is already committed")]
    CombatCommitPending,
    #[msg("No committed roll to reveal")]
    CombatCommitMissing,
    #[msg("Encounter ticket is stale or replayed")]
    StaleEncounterTicket,
    #[msg("Encounter ticket is too large")]
    EncounterTicketTooLarge,
    #[msg("Encounter ticket does not match the started encounter")]
    EncounterTicketMismatch,
}
