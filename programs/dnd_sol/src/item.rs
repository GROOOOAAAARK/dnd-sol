use anchor_lang::prelude::borsh;
use anchor_lang::{AnchorDeserialize, AnchorSerialize};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub enum ItemCategory {
    Weapon,
    Armor,
    Consumable,
    Commodity,
    SpellComponent,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub enum StatModifierTarget {
    None,
    Strength,
    Dexterity,
    Constitution,
    Intelligence,
    Wisdom,
    Charisma,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct ItemEffect {
    pub damage_bonus: u16,
    pub armor_bonus: u16,
    pub stat_modifier_target: StatModifierTarget,
    pub stat_modifier_amount: i8,
    pub heal_amount: u16,
}
