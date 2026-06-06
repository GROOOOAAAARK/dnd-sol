"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useGameService } from "@/services/game.service";
import { useAdventureService } from "@/services/adventure.service";
import type { AdventureStep, GameAction } from "@/models/types";
import { useCharacterStore } from "@/stores/selectedCharacter.store";
import { useSolanaService } from "@/services/solana.service";

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const adventureService = useAdventureService();
  const gameService = useGameService();
  const solanaService = useSolanaService();
  const [currentStep, setCurrentStep] = useState<AdventureStep | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const character = useCharacterStore((state) => state.selectedCharacter);

  const adventureId = params.adventureId as string;
  const adventureServiceRef = useRef(adventureService);
  const gameServiceRef = useRef(gameService);

  useEffect(() => {
    adventureServiceRef.current = adventureService;
  }, [adventureService]);

  useEffect(() => {
    if (!adventureId) {
      return;
    }

    let isSubscribed = true;

    const loadInitialStep = async () => {
      setLoading(true);
      try {
        const { getCurrentStep, getFirstStep } = adventureServiceRef.current;
        let step = await getCurrentStep(adventureId);

        if (!isSubscribed) {
          return;
        }

        if (!step) {
          step = await getFirstStep(adventureId);
        }

        setCurrentStep(step);
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
  }, [adventureId]);

  const handleAction = async (action: GameAction) => {
    setActionLoading(true);
    try {
      if (!character) {
        console.error("Character is not set.");
        return;
      }

      const { verifyRequirements } = gameServiceRef.current;
      const { performDiceAction } = solanaService;
      const { getNextStep } = adventureServiceRef.current;
      const isValid = await verifyRequirements(action, character!);

      if (isValid && currentStep) {
        let nextStepId = action.default_next_step_id ?? action.success_next_step_id;

        if (action.dice_roll_params) {
          const result = await performDiceAction(
            action.dice_roll_params.sides,
            action.dice_roll_params.success_floor,
            action.dice_roll_params.bonus || 0,
          );
          nextStepId = result.success
            ? action.success_next_step_id
            : action.failure_next_step_id ?? action.default_next_step_id;
        }

        if (!nextStepId) {
          throw new Error("Action has no next step configured");
        }

        const nextStep = await getNextStep(adventureId, nextStepId);
        setCurrentStep(nextStep);
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

  if (loading) {
    return (
      <div className="container flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!loading && !currentStep) {
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

  return (
    <div className="container max-w-4xl py-12">
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
            <h2 className="text-xl font-semibold">What will you do?</h2>

            <div className="grid gap-3">
              {currentStep.actions.map((action) => (
                <Button
                  key={action.id}
                  variant="outline"
                  className="justify-start h-auto py-4 px-4 text-left"
                  onClick={() => handleAction(action)}
                  disabled={actionLoading}
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
