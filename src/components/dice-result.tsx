"use client";

import {
  getDiceBreakdown,
  getSuccessProgress,
  classifyDiceOutcome,
} from "@/lib/diceOutcomes";
import { cn } from "@/lib/utils";
import type { DiceResult } from "@/models/types";

interface DiceResultDisplayProps {
  result: DiceResult;
  successFloor: number;
}

interface OutcomeCopy {
  title: string;
  description: string;
  className: string;
  badgeClassName: string;
}

const getOutcomeCopy = (result: DiceResult): OutcomeCopy => {
  const outcome = classifyDiceOutcome(result);

  switch (outcome) {
    case "critical-success":
      return {
        title: "Critical success",
        description:
          "The roll lands perfectly. Your action succeeds with extra force.",
        className:
          "border-dice-gold bg-dice-gold/15 text-dice-modal-foreground",
        badgeClassName: "bg-dice-gold text-dice-gold-foreground",
      };
    case "success":
      return {
        title: "Success",
        description: "Your total meets the success floor.",
        className: "border-success bg-success/15 text-dice-modal-foreground",
        badgeClassName: "bg-success text-success-foreground",
      };
    case "failure":
      return {
        title: "Failure",
        description: "Your total falls short of the success floor.",
        className:
          "border-dice-modal-border bg-dice-modal/70 text-dice-modal-foreground",
        badgeClassName: "bg-muted text-muted-foreground",
      };
    case "critical-failure":
      return {
        title: "Critical failure",
        description:
          "The die turns against you. This action fails regardless of bonuses.",
        className:
          "border-critical-fail bg-critical-fail/15 text-dice-modal-foreground",
        badgeClassName: "bg-critical-fail text-critical-fail-foreground",
      };
    default: {
      const exhaustive: never = outcome as never;
      return exhaustive;
    }
  }
};

export function DiceResultDisplay({
  result,
  successFloor,
}: DiceResultDisplayProps) {
  const breakdown = getDiceBreakdown(result);
  const progress = getSuccessProgress(result, successFloor);
  const copy = getOutcomeCopy(result);
  const bonusPrefix = breakdown.bonus >= 0 ? "+" : "";

  return (
    <div className={cn("space-y-4 rounded-xl border p-4", copy.className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-wide text-dice-modal-foreground/70">
            Outcome
          </p>
          <h3 className="text-2xl font-bold">{copy.title}</h3>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-sm font-semibold",
            copy.badgeClassName
          )}
        >
          {breakdown.total} / {successFloor}
        </span>
      </div>

      <p className="text-sm text-dice-modal-foreground/80">
        {copy.description}
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-dice-modal-foreground/80">
          <span>
            Roll {breakdown.raw} {bonusPrefix}
            {breakdown.bonus} bonus
          </span>
          <span>Floor {successFloor}</span>
        </div>
        <div className="relative h-3 overflow-hidden rounded-full bg-dice-modal-border/50">
          <div
            className={cn(
              "h-full rounded-full",
              result.success ? "bg-success" : "bg-critical-fail"
            )}
            style={{ width: `${progress.totalPercent}%` }}
          />
          <div
            className="absolute top-0 h-full w-1 rounded-full bg-dice-gold"
            style={{ left: `${progress.thresholdPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
