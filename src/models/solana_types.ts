import type { PublicKey } from "@solana/web3.js"

import type { DiceResult } from "@/models/types"

/** `meta.returnData` from `getTransaction` (not yet on web3.js ConfirmedTransactionMeta). */
export type RpcTransactionReturnData = {
  programId: string
  data: [string, "base64"]
}

export type RpcTransactionMetaWithReturn = {
  err: unknown
  returnData?: RpcTransactionReturnData | null
  /**
   * Some RPCs (e.g. surfnet/solana-core 4.3.x) omit `returnData` from
   * `getTransaction` but still log `Program return: <programId> <base64>`.
   */
  logMessages?: string[] | null
}

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

export type CombatStatusValue = "inProgress" | "victory" | "defeat" | "draw"

/** Anchor decodes fieldless enums either as a string or `{ variant: {} }`. */
export function normalizeCombatStatus(value: unknown): CombatStatusValue {
  const variant =
    typeof value === "string"
      ? value
      : value && typeof value === "object"
        ? (Object.keys(value)[0] ?? "")
        : String(value)

  switch (variant.toLowerCase()) {
    case "victory":
      return "victory"
    case "defeat":
      return "defeat"
    case "draw":
      return "draw"
    default:
      return "inProgress"
  }
}

/**
 * On-chain `CombatRoundResult` from `dnd_sol::combat_reveal`.
 *
 * Return data is decoded with a raw `BorshCoder` (not `program.coder`), so
 * these stay snake_case. Only `program.account.*` is camelCased.
 */
export interface AnchorCombatRoundResult {
  round: number
  player_hit: number
  player_hit_success: boolean
  player_crit: boolean
  player_damages: number
  monster_hit: number
  monster_hit_success: boolean
  monster_damages: number
  monster_hp: number
  character_hp: number
  status: unknown
  player_damage_dice: number[]
  monster_damage_dice: number[]
}

export interface CombatRoundResult {
  round: number
  player_hit: number
  player_hit_success: boolean
  player_crit: boolean
  player_damages: number
  monster_hit: number
  monster_hit_success: boolean
  monster_damages: number
  monster_hp: number
  character_hp: number
  status: CombatStatusValue
  /** Base damage die rolls, group order then die order; empty on a miss. */
  player_damage_dice: number[]
  monster_damage_dice: number[]
}

export const anchorCombatRoundResultToModel = (
  result: AnchorCombatRoundResult,
): CombatRoundResult => ({
  round: Number(result.round),
  player_hit: Number(result.player_hit),
  player_hit_success: result.player_hit_success,
  player_crit: result.player_crit,
  player_damages: Number(result.player_damages),
  monster_hit: Number(result.monster_hit),
  monster_hit_success: result.monster_hit_success,
  monster_damages: Number(result.monster_damages),
  monster_hp: Number(result.monster_hp),
  character_hp: Number(result.character_hp),
  status: normalizeCombatStatus(result.status),
  player_damage_dice: result.player_damage_dice.map(Number),
  monster_damage_dice: result.monster_damage_dice.map(Number),
})

/**
 * On-chain `CombatSession` account (dnd_sol program).
 *
 * `program.account.*` camelCases the IDL, so this is the camelCase shape even
 * though the Rust struct is snake_case. Decoding with a raw `BorshAccountsCoder`
 * would give snake_case instead — do not mix the two.
 */
export interface AnchorCombatSession {
  character: PublicKey
  status: unknown
  round: number
  commitPending: boolean
  monsterId: number[]
  monsterAc: number
  monsterHp: number
  characterHp: number
  encounterId: { toString(): string }
  roundPayloadHash: number[]
  lastNonce: { toString(): string }
  bump: number
}

export interface CombatSession {
  character: string
  status: CombatStatusValue
  round: number
  commitPending: boolean
  monsterId: string
  monsterAc: number
  monsterHp: number
  characterHp: number
  encounterId: string
  lastNonce: string
}

const monsterIdFromBytes = (bytes: number[]): string =>
  Buffer.from(bytes).toString("utf8").replace(/\0+$/, "")

export const anchorCombatSessionToModel = (
  session: AnchorCombatSession,
): CombatSession => ({
  character: session.character.toBase58(),
  status: normalizeCombatStatus(session.status),
  round: Number(session.round),
  commitPending: session.commitPending,
  monsterId: monsterIdFromBytes(session.monsterId),
  monsterAc: Number(session.monsterAc),
  monsterHp: Number(session.monsterHp),
  characterHp: Number(session.characterHp),
  encounterId: session.encounterId.toString(),
  lastNonce: session.lastNonce.toString(),
})
