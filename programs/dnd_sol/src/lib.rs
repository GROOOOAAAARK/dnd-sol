#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;
use anchor_lang::{AnchorDeserialize, AnchorSerialize};

pub mod attestation;
pub mod character;
pub mod combat;
pub mod error_codes;
pub mod inventory;
pub mod item;
use attestation::{verify_ticket, EncounterTicket};
use character::{Character, CharacterAccount, CharacterAttributes};
use combat::{CombatRoundResult, CombatSession, CombatStatus, COMBAT_SEED};
use error_codes::ErrorCodes;

declare_id!("5XQUKVykhN5D3WkJ1MdsRxaJDmEszjRzhje3e6TjF4Wd");

#[program]
pub mod dnd_sol {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.config.authority = ctx.accounts.payer.key();
        msg!("Welcome to the world of DnD Sol: {:?}", ctx.program_id);
        Ok(())
    }

    pub fn set_attester(ctx: Context<SetAttester>, new_attester: [u8; 64]) -> Result<()> {
        ctx.accounts.config.attester = new_attester;
        Ok(())
    }

    pub fn create_character(
        ctx: Context<CreateCharacter>,
        name: String,
        character_class: String,
        character_race: String,
        strength: u8,
        dexterity: u8,
        constitution: u8,
        intelligence: u8,
        wisdom: u8,
        charisma: u8,
    ) -> Result<()> {
        let character = Character::create(
            &mut ctx.accounts.character,
            &ctx.accounts.player,
            name,
            character_class.into(),
            character_race.into(),
            strength,
            dexterity,
            constitution,
            intelligence,
            wisdom,
            charisma,
        )?;
        msg!("Character created: {:?}", character.attributes.name);
        Ok(())
    }

    pub fn do_action(
        ctx: Context<CharacterScope>,
        dice_size: u8,
        success_floor: u8,
        bonus: u8,
    ) -> Result<bool> {
        let cpi_program = ctx.accounts.dice_rolling_program.key();
        let cpi_accounts = dice_rolling::cpi::accounts::DiceRoll {
            dice_rolling: ctx.accounts.dice_rolling_state.to_account_info(),
            randomness_account_data: ctx.accounts.randomness_account_data.to_account_info(),
            user: ctx.accounts.player.to_account_info(),
        };

        let action_committed = dice_rolling::cpi::commit_roll(
            CpiContext::new(cpi_program, cpi_accounts),
            dice_size,
            success_floor,
            bonus,
        )?;
        Ok(action_committed.get())
    }

    pub fn reveal_action_result(ctx: Context<CharacterScope>) -> Result<dice_rolling::DiceResult> {
        let cpi_program = ctx.accounts.dice_rolling_program.key();
        let cpi_accounts = dice_rolling::cpi::accounts::DiceRoll {
            dice_rolling: ctx.accounts.dice_rolling_state.to_account_info(),
            randomness_account_data: ctx.accounts.randomness_account_data.to_account_info(),
            user: ctx.accounts.player.to_account_info(),
        };

        Ok(dice_rolling::cpi::reveal_roll(CpiContext::new(cpi_program, cpi_accounts))?.get())
    }

    pub fn start_combat(
        ctx: Context<StartCombat>,
        ticket_bytes: Vec<u8>,
        signature: [u8; 64],
    ) -> Result<()> {
        let ticket = EncounterTicket::try_from_slice(&ticket_bytes)?;
        ticket.validate_limits()?;
        verify_ticket(
            &ticket_bytes,
            &signature,
            &ctx.accounts.config.attester,
            ticket.version,
            ticket.expiry,
        )?;

        let character_account = &ctx.accounts.character;
        require_keys_eq!(
            ticket.character,
            character_account.key(),
            ErrorCodes::InvalidAttestation
        );

        let session = &mut ctx.accounts.session;
        require!(
            ticket.nonce > session.last_nonce,
            ErrorCodes::StaleEncounterTicket
        );

        session.character = character_account.key();
        session.status = CombatStatus::InProgress;
        session.round = 1;
        session.commit_pending = false;
        session.monster_id = ticket.monster_id;
        session.monster_ac = ticket.ac;
        session.monster_hp = ticket.hit_points;
        session.character_hp = character_account.character.stats.health;
        session.encounter_id = ticket.encounter_id;
        session.round_payload_hash = [0u8; 32];
        session.last_nonce = ticket.nonce;
        session.bump = ctx.bumps.session;
        Ok(())
    }

    pub fn combat_commit(
        ctx: Context<CombatScope>,
        payload_bytes: Vec<u8>,
        signature: [u8; 64],
    ) -> Result<()> {
        let session = &mut ctx.accounts.session;
        require!(
            session.status == CombatStatus::InProgress,
            ErrorCodes::CombatNotInProgress
        );
        require!(!session.commit_pending, ErrorCodes::CombatCommitPending);

        let payload = RoundPayload::try_from_slice(&payload_bytes)?;
        payload.validate_limits()?;
        verify_ticket(
            &payload_bytes,
            &signature,
            &ctx.accounts.config.attester,
            payload.version,
            payload.expiry,
        )?;
        require_keys_eq!(
            payload.character,
            session.character,
            ErrorCodes::InvalidAttestation
        );
        require!(
            payload.encounter_id == session.encounter_id,
            ErrorCodes::StaleEncounterTicket
        );
        require!(
            payload.round == session.round,
            ErrorCodes::StaleEncounterTicket
        );

        // Bind the attacks before the dice are revealed.
        session.round_payload_hash = solana_keccak_hasher::hash(&payload_bytes).to_bytes();

        let cpi_accounts = dice_rolling::cpi::accounts::DiceRoll {
            dice_rolling: ctx.accounts.dice_rolling_state.to_account_info(),
            randomness_account_data: ctx.accounts.randomness_account_data.to_account_info(),
            user: ctx.accounts.player.to_account_info(),
        };
        dice_rolling::cpi::commit_roll(
            CpiContext::new(ctx.accounts.dice_rolling_program.key(), cpi_accounts),
            combat::D20,
            combat::D20,
            0,
        )?;

        session.commit_pending = true;
        Ok(())
    }

    pub fn combat_reveal(
        ctx: Context<CombatScope>,
        payload_bytes: Vec<u8>,
    ) -> Result<CombatRoundResult> {
        require!(
            ctx.accounts.session.commit_pending,
            ErrorCodes::CombatCommitMissing
        );
        // The payload was attester-verified at `combat_commit`; matching the
        // hash proves the same bytes, so attacks were fixed before the reveal.
        require!(
            solana_keccak_hasher::hash(&payload_bytes).to_bytes()
                == ctx.accounts.session.round_payload_hash,
            ErrorCodes::EncounterTicketMismatch
        );

        let cpi_accounts = dice_rolling::cpi::accounts::DiceRoll {
            dice_rolling: ctx.accounts.dice_rolling_state.to_account_info(),
            randomness_account_data: ctx.accounts.randomness_account_data.to_account_info(),
            user: ctx.accounts.player.to_account_info(),
        };
        let rolled = dice_rolling::cpi::reveal_roll_raw(CpiContext::new(
            ctx.accounts.dice_rolling_program.key(),
            cpi_accounts,
        ))?
        .get();

        let payload = RoundPayload::try_from_slice(&payload_bytes)?;
        let character = &ctx.accounts.character.character;
        let player_ac = combat::armor_class(&character.attributes.class, &character.stats);

        let session = &mut ctx.accounts.session;
        let outcome = combat::resolve_round(combat::RoundInput {
            round: session.round,
            player_d20: rolled.result.raw_result,
            raw: rolled.raw,
            character: session.character,
            encounter_id: session.encounter_id,
            monster_ac: session.monster_ac,
            monster_hp: session.monster_hp,
            player: &payload.player,
            monster: &payload.monster,
            player_ac,
            character_hp: session.character_hp,
        });

        session.commit_pending = false;
        session.monster_hp = outcome.monster_hp;
        session.character_hp = outcome.character_hp;
        session.status = outcome.status;
        session.round = outcome.next_round;
        Ok(outcome.result)
    }
}

#[account]
pub struct ProgramConfig {
    pub authority: Pubkey,
    pub attester: [u8; 64],
}

impl ProgramConfig {
    pub const SEED: &'static [u8] = b"config";
    pub const SPACE: usize = 32 + 64;
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + ProgramConfig::SPACE,
        seeds = [ProgramConfig::SEED],
        bump,
    )]
    pub config: Account<'info, ProgramConfig>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetAttester<'info> {
    pub authority: Signer<'info>,

    #[account(mut, has_one = authority, seeds = [ProgramConfig::SEED], bump)]
    pub config: Account<'info, ProgramConfig>,
}


#[derive(Accounts)]
#[instruction(name: String)]
pub struct CreateCharacter<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(
        init,
        payer=player,
        space = 8 + CharacterAccount::SPACE,
        seeds = [b"character", player.key().as_ref(), name.as_bytes()],
        bump,
        constraint = name.as_bytes().len() <= CharacterAttributes::MAX_NAME_LEN @ ErrorCodes::NameTooLong
    )]
    pub character: Account<'info, CharacterAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CharacterScope<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(mut, has_one = player)]
    pub character: Account<'info, CharacterAccount>,

    /// CHECK: Checked by the dice_rolling program
    #[account(mut)]
    pub dice_rolling_state: UncheckedAccount<'info>,

    /// CHECK: Checked by the dice_rolling program
    /// This is the Switchboard Randomness Account
    pub randomness_account_data: UncheckedAccount<'info>,

    pub dice_rolling_program: Program<'info, dice_rolling::program::DiceRolling>,
}

#[derive(Accounts)]
pub struct StartCombat<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(seeds = [ProgramConfig::SEED], bump)]
    pub config: Account<'info, ProgramConfig>,

    #[account(mut, has_one = player)]
    pub character: Account<'info, CharacterAccount>,

    #[account(
        init_if_needed,
        payer = player,
        space = 8 + CombatSession::SPACE,
        seeds = [COMBAT_SEED, character.key().as_ref()],
        bump,
    )]
    pub session: Account<'info, CombatSession>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CombatScope<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(seeds = [ProgramConfig::SEED], bump)]
    pub config: Account<'info, ProgramConfig>,

    #[account(has_one = player)]
    pub character: Account<'info, CharacterAccount>,

    #[account(
        mut,
        seeds = [COMBAT_SEED, character.key().as_ref()],
        bump = session.bump,
    )]
    pub session: Account<'info, CombatSession>,

    /// CHECK: checked by the dice_rolling program
    #[account(mut)]
    pub dice_rolling_state: UncheckedAccount<'info>,

    /// CHECK: checked by the dice_rolling program
    pub randomness_account_data: UncheckedAccount<'info>,

    pub dice_rolling_program: Program<'info, dice_rolling::program::DiceRolling>,
}
