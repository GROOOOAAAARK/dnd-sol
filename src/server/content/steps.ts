import { mockAdventures, mockGameSteps } from "@/assets/mocks/adventures";
import type { Adventure, AdventureStep } from "@/models/types";

export function listAdventures(): Adventure[] {
	return mockAdventures;
}

export function getAdventure(adventureId: string): Adventure | null {
	return mockAdventures.find((adventure) => adventure.id === adventureId) ?? null;
}

export function getStep(stepId: string): AdventureStep | null {
	return mockGameSteps[stepId] ?? null;
}

/** Monster id when the step is a combat encounter, otherwise null. */
export function getStepMonsterId(stepId: string): string | null {
	return getStep(stepId)?.combat?.monster_id ?? null;
}
