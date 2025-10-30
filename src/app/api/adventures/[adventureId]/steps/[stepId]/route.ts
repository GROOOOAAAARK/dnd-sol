import { NextResponse } from "next/server"
import { mockAdventures, mockGameSteps } from "@/assets/mocks/adventures"

export async function GET(
  request: Request,
  props: { params: Promise<{ adventureId: string, stepId: string }> }
) {
  const params = await props.params;
  const adventureId = params.adventureId
  const stepId = params.stepId

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 100))

  if (stepId === "first") {
    const adventure = mockAdventures.find((adv) => adv.id === adventureId)
    if (!adventure) {
      return NextResponse.json({ error: "Adventure not found" }, { status: 404 })
    }
    return NextResponse.json(mockGameSteps[adventure.first_step_id])
  }

  const gameStep = mockGameSteps[stepId]

  if (!gameStep) {
    return NextResponse.json({ error: "Game step not found" }, { status: 404 })
  }

  return NextResponse.json(gameStep)
}
