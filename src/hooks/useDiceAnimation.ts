"use client";

import { useCallback, useState } from "react";

import {
  getTargetRotation,
  type DiceRotation,
  type DiceType,
} from "@/lib/diceGeometry";
import type { DiceResult } from "@/models/types";

export type DiceAnimationPhase =
  | "idle"
  | "rolling"
  | "settling"
  | "landed"
  | "error";

interface UseDiceAnimationParams {
  diceType: DiceType;
  roll: () => Promise<DiceResult>;
}

interface DiceAnimationState {
  phase: DiceAnimationPhase;
  result: DiceResult | null;
  error: string | null;
  targetRotation: DiceRotation | null;
}

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Dice roll failed";

export function useDiceAnimation({ diceType, roll }: UseDiceAnimationParams) {
  const [state, setState] = useState<DiceAnimationState>({
    phase: "idle",
    result: null,
    error: null,
    targetRotation: null,
  });

  const startRoll = useCallback(async () => {
    setState({
      phase: "rolling",
      result: null,
      error: null,
      targetRotation: null,
    });

    try {
      const result = await roll();
      debugger;
      const targetRotation = getTargetRotation(diceType, result.raw_result);

      setState({
        phase: "settling",
        result,
        error: null,
        targetRotation,
      });
    } catch (error) {
      setState({
        phase: "error",
        result: null,
        error: getErrorMessage(error),
        targetRotation: null,
      });
    }
  }, [diceType, roll]);

  const completeSettle = useCallback(() => {
    setState((current) =>
      current.phase === "settling"
        ? {
            ...current,
            phase: "landed",
          }
        : current
    );
  }, []);

  const reset = useCallback(() => {
    setState({
      phase: "idle",
      result: null,
      error: null,
      targetRotation: null,
    });
  }, []);

  return {
    ...state,
    completeSettle,
    reset,
    startRoll,
  };
}
