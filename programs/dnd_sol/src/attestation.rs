use crate::combat::{Attack, MONSTER_ID_LEN};
use crate::error_codes::ErrorCodes;
use crate::inventory::InventoryDelta;
use crate::item::{ItemCategory, ItemEffect};
use anchor_lang::prelude::*;
use solana_keccak_hasher as keccak;
use solana_secp256k1_recover::{secp256k1_recover, Secp256k1Pubkey};

pub const TICKET_VERSION: u8 = 1;

/// Bounds kept so a payload cannot blow up the per-round lane derivation.
pub const MAX_DAMAGE_GROUPS: usize = 4;
pub const MAX_DICE_PER_ROLL_GROUP: usize = 12;

/// Signed once per fight (at `start_combat`): fight identity only.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct EncounterTicket {
    pub version: u8,
    pub character: Pubkey,
    pub encounter_id: u64,
    /// Nano uid of the monster (content identity; lanes use `encounter_id`).
    pub monster_id: [u8; MONSTER_ID_LEN],
    pub ac: u8,
    pub hit_points: u16,
    pub nonce: u64,
    pub expiry: i64,
}

/// Signed each round so the player can change attacks between rounds.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct RoundPayload {
    pub version: u8,
    pub character: Pubkey,
    pub encounter_id: u64,
    pub round: u8,
    pub player: Attack,
    pub monster: Attack,
    pub expiry: i64,
}

impl RoundPayload {
    pub fn validate_limits(&self) -> Result<()> {
        validate_attack(&self.player)?;
        validate_attack(&self.monster)
    }
}

fn validate_attack(attack: &Attack) -> Result<()> {
    require!(
        attack.damages.len() <= MAX_DAMAGE_GROUPS,
        ErrorCodes::EncounterTicketTooLarge
    );
    for roll in &attack.damages {
        require!(
            roll.num_die as usize <= MAX_DICE_PER_ROLL_GROUP && roll.die >= 2,
            ErrorCodes::EncounterTicketTooLarge
        );
    }
    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct MintTicket {
    pub version: u8,
    pub character: Pubkey,
    pub item_id: u32,
    pub quantity: u32,
    pub weight: u16,
    pub category: ItemCategory,
    pub effect: ItemEffect,
    pub nonce: u64,
    pub expiry: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct CompletionTicket {
    pub version: u8,
    pub character: Pubkey,
    pub adventure_id: String,
    pub revision: u64,
    pub xp_delta: u32,
    pub final_hp: u16,
    pub inventory_delta: Vec<InventoryDelta>,
    pub nonce: u64,
    pub expiry: i64,
}

/// Verify a ticket signature against the program attester.
///
/// The recovery id is not transmitted: it is derived by trying the valid range
/// (0..=3) and requiring the recovered pubkey to match exactly.
pub fn verify_attestation(
    ticket_bytes: &[u8],
    signature: &[u8; 64],
    attester: &[u8; 64],
) -> Result<()> {
    let msg = keccak::hash(ticket_bytes).to_bytes();
    let recovered = (0u8..=3).find_map(|recovery_id| {
        secp256k1_recover(&msg, recovery_id, signature)
            .ok()
            .filter(|pubkey: &Secp256k1Pubkey| pubkey.0 == *attester)
    });

    require!(recovered.is_some(), ErrorCodes::InvalidAttestation);
    Ok(())
}

/// Verify signature, version, and expiry centrally. Per-subject binding and
/// nonce rules are enforced by each subject.
pub fn verify_ticket(
    ticket_bytes: &[u8],
    signature: &[u8; 64],
    attester: &[u8; 64],
    version: u8,
    expiry: i64,
) -> Result<()> {
    require!(
        version == TICKET_VERSION,
        ErrorCodes::UnsupportedTicketVersion
    );
    require!(
        expiry > Clock::get()?.unix_timestamp,
        ErrorCodes::AttestationExpired
    );
    verify_attestation(ticket_bytes, signature, attester)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::combat::{Attack, DamageRoll};

    #[test]
    fn ticket_borsh_round_trips() {
        let ticket = EncounterTicket {
            version: TICKET_VERSION,
            character: Pubkey::new_from_array([7u8; 32]),
            encounter_id: 42,
            monster_id: [0u8; MONSTER_ID_LEN],
            ac: 15,
            hit_points: 30,
            nonce: 1,
            expiry: 1_700_000_000,
        };
        let bytes = borsh::to_vec(&ticket).unwrap();
        assert_eq!(
            borsh::from_slice::<EncounterTicket>(&bytes).unwrap(),
            ticket
        );
    }

    #[test]
    fn round_payload_borsh_round_trips() {
        let payload = RoundPayload {
            version: TICKET_VERSION,
            character: Pubkey::new_from_array([7u8; 32]),
            encounter_id: 42,
            round: 1,
            player: Attack {
                to_hit: Some(5),
                damages: vec![DamageRoll {
                    die: 8,
                    num_die: 1,
                    damage_bonus: 0,
                }],
            },
            monster: Attack {
                to_hit: Some(-3),
                damages: vec![DamageRoll {
                    die: 6,
                    num_die: 2,
                    damage_bonus: 3,
                }],
            },
            expiry: 1_700_000_000,
        };
        let bytes = borsh::to_vec(&payload).unwrap();
        assert_eq!(
            borsh::from_slice::<RoundPayload>(&bytes).unwrap(),
            payload
        );
    }

    #[test]
    fn rejects_wrong_attester() {
        let ticket = CompletionTicket {
            version: TICKET_VERSION,
            character: Pubkey::new_from_array([1u8; 32]),
            adventure_id: "adv1".to_string(),
            revision: 1,
            xp_delta: 10,
            final_hp: 5,
            inventory_delta: vec![InventoryDelta {
                item_id: 3,
                quantity_delta: -1,
            }],
            nonce: 1,
            expiry: 1,
        };
        let bytes = borsh::to_vec(&ticket).unwrap();
        let result = verify_attestation(&bytes, &[0u8; 64], &[1u8; 64]);
        assert!(result.is_err());
    }

    fn golden_encounter_ticket() -> EncounterTicket {
        let mut monster_id = [0u8; MONSTER_ID_LEN];
        monster_id.copy_from_slice(b"gVJhLCg8hvsMR79w9lqf4");
        EncounterTicket {
            version: TICKET_VERSION,
            character: Pubkey::new_from_array([7u8; 32]),
            encounter_id: 42,
            monster_id,
            ac: 12,
            hit_points: 58,
            nonce: 1000,
            expiry: 1_700_000_000,
        }
    }

    fn golden_round_payload() -> RoundPayload {
        RoundPayload {
            version: TICKET_VERSION,
            character: Pubkey::new_from_array([7u8; 32]),
            encounter_id: 42,
            round: 1,
            player: Attack {
                to_hit: Some(5),
                damages: vec![DamageRoll {
                    die: 8,
                    num_die: 1,
                    damage_bonus: 0,
                }],
            },
            monster: Attack {
                to_hit: Some(-3),
                damages: vec![DamageRoll {
                    die: 6,
                    num_die: 2,
                    damage_bonus: 3,
                }],
            },
            expiry: 1_700_000_000,
        }
    }

    fn to_hex(bytes: &[u8]) -> String {
        bytes.iter().map(|byte| format!("{:02x}", byte)).collect()
    }

    /// Frozen contract: the TS encoder must produce these exact bytes for the
    /// same messages. The fixture is shared at `tests/fixtures/`.
    #[test]
    fn golden_vector_matches_fixture() {
        const FIXTURE: &str =
            include_str!("../../../tests/fixtures/encounter-ticket-golden.json");

        let encounter = borsh::to_vec(&golden_encounter_ticket()).unwrap();
        let encounter_digest = keccak::hash(&encounter).to_bytes();
        assert_eq!(
            to_hex(&encounter),
            "0107070707070707070707070707070707070707070707070707070707070707072a0000000000000067564a684c4367386876734d52373977396c7166340c3a00e80300000000000000f1536500000000"
        );
        assert_eq!(
            to_hex(&encounter_digest),
            "93ce5799ee3f5c13a7fe2269e6fb8cf15da28850a220820ed5bae3ee3aadcca2"
        );

        let round = borsh::to_vec(&golden_round_payload()).unwrap();
        let round_digest = keccak::hash(&round).to_bytes();
        assert_eq!(
            to_hex(&round),
            "0107070707070707070707070707070707070707070707070707070707070707072a00000000000000010105010000000801000001fd010000000602030000f1536500000000"
        );
        assert_eq!(
            to_hex(&round_digest),
            "99d19fda5e9b07ad1a49eb80a9dc6fef48195cc3f358818af6b9f0d00e92eb11"
        );

        // Guard against the fixture drifting from the constants above.
        assert!(FIXTURE.contains(&to_hex(&encounter)));
        assert!(FIXTURE.contains(&to_hex(&encounter_digest)));
        assert!(FIXTURE.contains(&to_hex(&round)));
        assert!(FIXTURE.contains(&to_hex(&round_digest)));
    }
}
