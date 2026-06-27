import type { PublicKey } from "@solana/web3.js"

import type { DiceResult } from "@/models/types"

/** On-chain `DiceResult` from `dice_rolling::reveal_roll` / `dnd_sol::reveal_action_result`. */
export interface AnchorDiceResult {
  raw_result: number
  bonus: number
  success: boolean
  critical_success: boolean
  critical_failure: boolean
}

/** On-chain `DiceRollingState` account (dice_rolling program). */
export interface AnchorDiceRollingState {
  allowed_user: PublicKey
  latest_roll_result: number
  randomness_account: PublicKey
  dice_size: number
  success_floor: number
  bonus: number
  bump: number
  commit_slot: number
}

export const anchorDiceResultToModel = (result: AnchorDiceResult): DiceResult => ({
  raw_result: Number(result.raw_result),
  bonus: Number(result.bonus),
  success: result.success,
  critical_success: result.critical_success,
  critical_failure: result.critical_failure,
})

export const anchorDiceRollingStateToDiceResult = (
  state: AnchorDiceRollingState,
): DiceResult => ({
  raw_result: Number(state.latest_roll_result),
  bonus: Number(state.bonus),
  success:
    Number(state.latest_roll_result) + Number(state.bonus) >= Number(state.success_floor),
  critical_success: Number(state.latest_roll_result) === Number(state.dice_size),
  critical_failure: Number(state.latest_roll_result) === 1,
})
