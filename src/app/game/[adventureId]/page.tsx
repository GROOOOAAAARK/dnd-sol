"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { DiceModal } from "@/components/dice-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useGameService } from "@/services/game.service";
import { useAdventureService } from "@/services/adventure.service";
import type {
  AdventureCheckpoint,
  AdventureCheckpointIdentity,
  AdventureStep,
  DiceResult,
  GameAction,
} from "@/models/types";
import { useCharacterStore } from "@/stores/selectedCharacter.store";
import { useSolanaService } from "@/services/solana.service";
import { isSupportedDiceSides } from "@/lib/diceGeometry";

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const adventureService = useAdventureService();
  const gameService = useGameService();
  const solanaService = useSolanaService();
  const { publicKey } = useWallet();
  const [currentStep, setCurrentStep] = useState<AdventureStep | null>(null);
  const [checkpoint, setCheckpoint] = useState<AdventureCheckpoint | null>(
    null
  );
  const [checkpointError, setCheckpointError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [pendingDiceAction, setPendingDiceAction] = useState<GameAction | null>(
    null
  );
  const character = useCharacterStore((state) => state.selectedCharacter);

  const adventureId = params.adventureId as string;
  const adventureServiceRef = useRef(adventureService);
  const gameServiceRef = useRef(gameService);

  useEffect(() => {
    adventureServiceRef.current = adventureService;
  }, [adventureService]);

  useEffect(() => {
    gameServiceRef.current = gameService;
  }, [gameService]);

  useEffect(() => {
    if (!adventureId) {
      return;
    }

    let isSubscribed = true;

    const loadInitialStep = async () => {
      setLoading(true);
      setCheckpointError(null);
      setSaveMessage(null);
      try {
        const identity = getCheckpointIdentity();

        if (!identity) {
          setCurrentStep(null);
          setCheckpoint(null);
          return;
        }

        const { getCurrentCheckpoint, startAdventureCheckpoint } =
          adventureServiceRef.current;
        const response =
          (await getCurrentCheckpoint(adventureId, identity)) ??
          (await startAdventureCheckpoint(adventureId, identity));

        if (!isSubscribed) {
          return;
        }

        if (!response) {
          setCurrentStep(null);
          setCheckpoint(null);
          return;
        }

        setCheckpoint(response.checkpoint);

        if (!response.compatible) {
          setCheckpointError(
            response.reason === "AdventureVersionChanged"
              ? "This save was created for an older version of the adventure."
              : "This save points to a step that no longer exists."
          );
          setCurrentStep(null);
          return;
        }

        setCurrentStep(response.currentStep);
      } catch (error) {
        console.error("Failed to fetch game step:", error);
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    loadInitialStep();

    return () => {
      isSubscribed = false;
    };
  }, [adventureId, character?.id, publicKey]);

  const getCheckpointIdentity = (): AdventureCheckpointIdentity | null => {
    if (!publicKey || !character?.id) {
      return null;
    }

    return {
      wallet_pubkey: publicKey.toBase58(),
      character_id: character.id,
    };
  };

  const restartAdventure = async () => {
    const identity = getCheckpointIdentity();

    if (!identity) {
      return;
    }

    setActionLoading(true);
    setSaveMessage(null);
    try {
      const response =
        await adventureServiceRef.current.startAdventureCheckpoint(
          adventureId,
          {
            ...identity,
            restart: true,
          }
        );

      if (!response || !response.compatible) {
        setCheckpointError("Unable to restart this adventure.");
        return;
      }

      setCheckpoint(response.checkpoint);
      setCurrentStep(response.currentStep);
      setCheckpointError(null);
    } finally {
      setActionLoading(false);
    }
  };

  const saveCurrentAdventureProgress = async () => {
    const identity = getCheckpointIdentity();

    if (!identity || !currentStep) {
      return;
    }

    setActionLoading(true);
    setSaveMessage(null);
    try {
      const response =
        await adventureServiceRef.current.saveAdventureCheckpoint(adventureId, {
          ...identity,
          current_step_id: currentStep.id,
        });

      if (response?.compatible) {
        setCheckpoint(response.checkpoint);
        setSaveMessage("Progress saved.");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const completeCurrentAdventure = async () => {
    const identity = getCheckpointIdentity();

    if (!identity) {
      return;
    }

    const response =
      await adventureServiceRef.current.completeAdventureCheckpoint(
        adventureId,
        identity
      );

    if (response?.checkpoint) {
      setCheckpoint(response.checkpoint);
      setSaveMessage("Adventure completed.");
    }
  };

  const persistStepAfterDice = async (nextStep: AdventureStep) => {
    const identity = getCheckpointIdentity();

    if (!identity) {
      return;
    }

    if (nextStep.actions.length === 0) {
      await completeCurrentAdventure();
      return;
    }

    const response = await adventureServiceRef.current.saveAdventureCheckpoint(
      adventureId,
      {
        ...identity,
        current_step_id: nextStep.id,
      }
    );

    if (response?.compatible) {
      setCheckpoint(response.checkpoint);
      setSaveMessage("Progress saved after dice roll.");
    }
  };

  const handleAction = async (action: GameAction) => {
    setActionLoading(true);
    setSaveMessage(null);
    try {
      if (!character) {
        console.error("Character is not set.");
        return;
      }

      const { verifyRequirements } = gameServiceRef.current;
      const { getNextStep } = adventureServiceRef.current;
      const isValid = await verifyRequirements(action, character!);

      if (isValid && currentStep) {
        const diceParams = action.dice_roll_params;

        if (diceParams) {
          if (!isSupportedDiceSides(diceParams.sides)) {
            throw new Error(
              `D${diceParams.sides} is not supported by the dice modal`
            );
          }

          setPendingDiceAction(action);
          return;
        }

        const nextStepId =
          action.default_next_step_id ?? action.success_next_step_id;

        if (!nextStepId) {
          throw new Error("Action has no next step configured");
        }

        const nextStep = await getNextStep(adventureId, nextStepId);
        setCurrentStep(nextStep);

        if (nextStep?.actions.length === 0) {
          await completeCurrentAdventure();
        }
      } else {
        // Show some feedback that the action cannot be performed
        console.log("Cannot perform this action");
      }
    } catch (error) {
      console.error("Failed to perform action:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDiceContinue = async (action: GameAction, result: DiceResult) => {
    setActionLoading(true);
    try {
      const { getNextStep } = adventureServiceRef.current;
      const didSucceed = result.critical_success
        ? true
        : result.critical_failure
        ? false
        : result.success;
      const nextStepId = didSucceed
        ? action.success_next_step_id ?? action.default_next_step_id
        : action.failure_next_step_id ?? action.default_next_step_id;

      if (!nextStepId) {
        throw new Error("Dice action has no next step configured");
      }

      const nextStep = await getNextStep(adventureId, nextStepId);
      setCurrentStep(nextStep);
      setPendingDiceAction(null);
      if (nextStep) {
        await persistStepAfterDice(nextStep);
      }
    } catch (error) {
      console.error("Failed to continue after dice roll:", error);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!publicKey || !character?.id) {
    return (
      <div className="container py-12 text-center">
        <h1 className="text-3xl font-bold mb-4">Choose a character first</h1>
        <p className="mb-8">
          Connect your wallet and select a saved character before starting an
          adventure.
        </p>
        <Button onClick={() => router.push("/adventures")}>
          Back to Adventures
        </Button>
      </div>
    );
  }

  if (checkpointError) {
    return (
      <div className="container py-12 text-center">
        <h1 className="text-3xl font-bold mb-4">Save cannot be restored</h1>
        <p className="mb-8">{checkpointError}</p>
        <div className="flex justify-center gap-3">
          <Button
            disabled={actionLoading}
            onClick={restartAdventure}
            type="button"
          >
            Restart Adventure
          </Button>
          <Button
            onClick={() => router.push("/adventures")}
            type="button"
            variant="outline"
          >
            Back to Adventures
          </Button>
        </div>
      </div>
    );
  }

  if (!currentStep) {
    return (
      <div className="container py-12 text-center">
        <h1 className="text-3xl font-bold mb-4">Adventure step not found</h1>
        <p className="mb-8">
          This adventure step doesn&apos;t exist or has been completed.
        </p>
        <Button onClick={() => router.push("/adventures")}>
          Back to Adventures
        </Button>
      </div>
    );
  }

  const pendingDiceParams = pendingDiceAction?.dice_roll_params;
  const isTerminalStep = currentStep.is_death_step || currentStep.is_win_step;

  return (
    <div className="container max-w-4xl py-12">
      {checkpoint ? (
        <div className="mb-6 rounded-lg border border-accent bg-card p-4 text-sm">
          <div className="font-semibold">Adventure seed hash</div>
          <div className="mt-1 break-all text-muted-foreground">
            {checkpoint.adventure_seed_hash}
          </div>
          <div className="mt-3 font-semibold">Adventure path hash</div>
          <div className="mt-1 break-all text-muted-foreground">
            {checkpoint.adventure_path_hash}
          </div>
        </div>
      ) : null}

      <Card className="overflow-hidden">
        <div className="relative h-64 w-full">
          <Image
            src={currentStep.image || "/placeholder.svg?height=300&width=800"}
            alt="Adventure scene"
            fill
            className="object-cover"
            priority
          />
        </div>

        <CardContent className="p-6">
          <h1 className="text-2xl font-bold mb-4">{currentStep.title}</h1>
          <p className="mb-8 text-lg">{currentStep.description}</p>

          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-semibold">
                {isTerminalStep ? (currentStep.is_win_step ? "Adventure complete" : "You have been defeated") : "What will you do?"}
              </h2>
              {!isTerminalStep ? (
                <Button
                  disabled={actionLoading || Boolean(pendingDiceAction)}
                  onClick={saveCurrentAdventureProgress}
                  type="button"
                  variant="secondary"
                >
                  Save Progress
                </Button>
              ) : null}
            </div>

            {saveMessage ? (
              <p className="text-sm text-muted-foreground">{saveMessage}</p>
            ) : null}

            {!isTerminalStep ? (
              <div className="grid gap-3">
                {currentStep.actions.map((action) => (
                  <Button
                    key={action.id}
                    variant="outline"
                    className="justify-start h-auto py-4 px-4 text-left"
                    onClick={() => handleAction(action)}
                    disabled={actionLoading || Boolean(pendingDiceAction)}
                  >
                    <div>
                      <div className="font-medium">{action.title}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {action.description}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {pendingDiceAction &&
      pendingDiceParams &&
      isSupportedDiceSides(pendingDiceParams.sides) ? (
        <DiceModal
          actionDescription={pendingDiceAction.description}
          actionTitle={pendingDiceAction.title}
          bonus={pendingDiceParams.bonus ?? 0}
          completing={actionLoading}
          diceType={pendingDiceParams.sides}
          onCancel={() => setPendingDiceAction(null)}
          onContinue={(result) => handleDiceContinue(pendingDiceAction, result)}
          performRoll={() =>
            solanaService.performDiceAction(
              pendingDiceParams.sides,
              pendingDiceParams.success_floor,
              pendingDiceParams.bonus ?? 0 // TODO: bonus should be calculated from the character stats (onchain ?)
            )
          }
          successFloor={pendingDiceParams.success_floor}
        />
      ) : null}
    </div>
  );
}
