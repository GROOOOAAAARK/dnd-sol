"use client";

import { useCallback, useEffect, useId } from "react";
import { Loader2 } from "lucide-react";

import { DiceResultDisplay } from "@/components/dice-result";
import { DiceScene } from "@/components/dice-scene";
import { Button } from "@/components/ui/button";
import { useDiceAnimation } from "@/hooks/useDiceAnimation";
import type { DiceType } from "@/lib/diceGeometry";
import type { DiceResult } from "@/models/types";

interface DiceModalProps {
  actionDescription: string;
  actionTitle: string;
  bonus: number;
  completing?: boolean;
  diceType: DiceType;
  onCancel: () => void;
  onContinue: (result: DiceResult) => void;
  performRoll: () => Promise<DiceResult>;
  successFloor: number;
}

const isBusyPhase = (phase: string): boolean =>
  phase === "rolling" || phase === "settling";

export function DiceModal({
  actionDescription,
  actionTitle,
  bonus,
  completing = false,
  diceType,
  onCancel,
  onContinue,
  performRoll,
  successFloor,
}: DiceModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const {
    completeSettle,
    error,
    phase,
    reset,
    result,
    startRoll,
    targetRotation,
  } = useDiceAnimation({
    diceType: diceType,
    roll: performRoll,
  });
  const isBusy = isBusyPhase(phase) || completing;
  const canCancel = !isBusy;

  const cancel = useCallback(() => {
    if (canCancel) {
      reset();
      onCancel();
    }
  }, [canCancel, onCancel, reset]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [cancel]);

  const statusCopy = (() => {
    switch (phase) {
      case "idle":
        return "Click the dice to begin the on-chain roll.";
      case "rolling":
        return "Rolling now. Waiting for the Solana dice result...";
      case "settling":
        return "Result received. Settling the die on its final face...";
      case "landed":
        return "Roll complete. Review the result and continue.";
      case "error":
        return "The roll could not complete. You can retry or cancel.";
      default: {
        const exhaustive: never = phase;
        return exhaustive;
      }
    }
  })();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-3xl"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          cancel();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl border border-dice-modal-border bg-dice-modal p-5 text-dice-modal-foreground shadow-2xl shadow-dice-glow/20 sm:p-6"
      >
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-dice-gold">
              Dice check
            </p>
            <h2 id={titleId} className="mt-1 text-2xl font-bold">
              {actionTitle}
            </h2>
            <p
              id={descriptionId}
              className="mt-2 text-sm text-dice-modal-foreground/75"
            >
              {actionDescription}
            </p>
          </div>
          <div className="rounded-xl border border-dice-modal-border bg-dice-modal/80 px-4 py-3 text-sm">
            <div>D{diceType}</div>
            <div className="text-dice-modal-foreground/70">
              Floor {successFloor}, bonus {bonus >= 0 ? "+" : ""}
              {bonus}
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
          <div className="space-y-3">
            <DiceScene
              diceType={diceType}
              disabled={phase !== "idle"}
              landedFace={result?.raw_result ?? null}
              onRoll={startRoll}
              onSettled={completeSettle}
              phase={phase}
              targetRotation={targetRotation}
            />
            <p className="text-center text-sm text-dice-modal-foreground/75">
              {statusCopy}
            </p>
          </div>

          <div className="flex min-h-72 flex-col justify-between gap-4">
            {phase === "error" && error ? (
              <div className="rounded-xl border border-destructive bg-destructive/15 p-4 text-sm text-dice-modal-foreground">
                <p className="font-semibold text-destructive">Roll failed</p>
                <p className="mt-2 text-dice-modal-foreground/80">{error}</p>
              </div>
            ) : null}

            {result && phase === "landed" ? (
              <DiceResultDisplay result={result} successFloor={successFloor} />
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-xl border border-dice-modal-border bg-dice-modal/70 p-6 text-center text-sm text-dice-modal-foreground/70">
                {phase === "rolling" || phase === "settling" ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Keep your hand steady...
                  </span>
                ) : (
                  "Your roll breakdown will appear here."
                )}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-3">
              {phase === "error" ? (
                <Button type="button" variant="secondary" onClick={startRoll}>
                  Retry
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={cancel}
                disabled={!canCancel}
              >
                Cancel
              </Button>
              {result && phase === "landed" ? (
                <Button
                  type="button"
                  onClick={() => onContinue(result)}
                  disabled={completing}
                >
                  {completing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Continuing
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
