use crate::error_codes::ErrorCodes;
use crate::inventory::InventoryDelta;
use crate::item::{ItemCategory, ItemEffect};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    keccak,
    secp256k1_recover::{secp256k1_recover, Secp256k1Pubkey},
};

pub const TICKET_VERSION: u8 = 1;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct EncounterTicket {
    pub version: u8,
    pub character: Pubkey,
    pub encounter_id: u64,
    pub monster_id: u32,
    pub ac: u8,
    pub max_hp: u16,
    pub die: u8,
    pub modifier: i8,
    pub nonce: u64,
    pub expiry: i64,
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
        let bytes = ticket.try_to_vec().unwrap();
        assert_eq!(EncounterTicket::try_from_slice(&bytes).unwrap(), ticket);
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
        let bytes = ticket.try_to_vec().unwrap();
        let result = verify_attestation(&bytes, &[0u8; 64], &[1u8; 64]);
        assert!(result.is_err());
    }
}
