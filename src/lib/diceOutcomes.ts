import type { DiceResult } from "@/models/types";

export enum DiceOutcome {
  CriticalSuccess = "critical-success",
  Success = "success",
  Failure = "failure",
  CriticalFailure = "critical-failure",
}

export interface DiceBreakdown {
  raw: number;
  bonus: number;
  total: number;
}

export interface DiceProgress {
  totalPercent: number;
  thresholdPercent: number;
}

const clampPercent = (value: number): number =>
  Math.max(0, Math.min(100, value));

export const classifyDiceOutcome = (result: DiceResult): DiceOutcome => {
  if (result.critical_success) {
    return DiceOutcome.CriticalSuccess;
  }

  if (result.critical_failure) {
    return DiceOutcome.CriticalFailure;
  }

  return result.success ? DiceOutcome.Success : DiceOutcome.Failure;
};

export const getDiceTotal = (result: DiceResult): number =>
  result.raw_result + result.bonus;

export const getDiceBreakdown = (result: DiceResult): DiceBreakdown => ({
  raw: result.raw_result,
  bonus: result.bonus,
  total: getDiceTotal(result),
});

export const getSuccessProgress = (
  result: DiceResult,
  successFloor: number
): DiceProgress => {
  const denominator = Math.max(successFloor, getDiceTotal(result), 1);

  return {
    totalPercent: clampPercent((getDiceTotal(result) / denominator) * 100),
    thresholdPercent: clampPercent((successFloor / denominator) * 100),
  };
};
