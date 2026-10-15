use anchor_lang::prelude::borsh;
use anchor_lang::{AnchorDeserialize, AnchorSerialize};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct InventoryDelta {
    pub item_id: u32,
    pub quantity_delta: i32,
}
