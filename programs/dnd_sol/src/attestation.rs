use crate::combat::{Attack, MONSTER_ID_LEN};
use crate::error_codes::ErrorCodes;
use crate::inventory::InventoryDelta;
use crate::item::{ItemCategory, ItemEffect};
use anchor_lang::prelude::*;
use solana_keccak_hasher as keccak;
use solana_secp256k1_recover::{secp256k1_recover, Secp256k1Pubkey};

pub const TICKET_VERSION: u8 = 1;

/// Bounds kept so a ticket cannot blow up the per-round lane derivation.
pub const MAX_MONSTER_ATTACKS: usize = 2;
pub const MAX_ROLL_GROUPS_PER_ATTACK: usize = 4;
pub const MAX_DICE_PER_ROLL_GROUP: usize = 12;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct EncounterTicket {
    pub version: u8,
    pub character: Pubkey,
    pub encounter_id: u64,
    /// Nano uid of the monster (content identity; lanes use `encounter_id`).
    pub monster_id: [u8; MONSTER_ID_LEN],
    pub ac: u8,
    pub hit_points: u16,
    pub attacks: Vec<Attack>,
    pub nonce: u64,
    pub expiry: i64,
}

impl EncounterTicket {
    pub fn validate_limits(&self) -> Result<()> {
        require!(
            self.attacks.len() <= MAX_MONSTER_ATTACKS,
            ErrorCodes::EncounterTicketTooLarge
        );
        for attack in &self.attacks {
            require!(
                attack.damages.len() <= MAX_ROLL_GROUPS_PER_ATTACK,
                ErrorCodes::EncounterTicketTooLarge
            );
            for roll in &attack.damages {
                require!(
                    roll.num_die as usize <= MAX_DICE_PER_ROLL_GROUP && roll.die >= 2,
                    ErrorCodes::EncounterTicketTooLarge
                );
            }
        }
        Ok(())
    }
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

    #[test]
    fn ticket_borsh_round_trips() {
        let ticket = EncounterTicket {
            version: TICKET_VERSION,
            character: Pubkey::new_from_array([7u8; 32]),
            encounter_id: 42,
            monster_id: 9,
            ac: 15,
            max_hp: 30,
            die: 20,
            modifier: -2,
            nonce: 1,
            expiry: 1_700_000_000,
        };
        let bytes = borsh::to_vec(&ticket).unwrap();
        assert_eq!(borsh::from_slice::<EncounterTicket>(&bytes).unwrap(), ticket);
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
}
