import { NextResponse } from "next/server"
import { mockGameSteps } from "@/assets/mocks/adventures"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const adventureId = params.id

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800))

  const gameStep = mockGameSteps[adventureId]

  if (!gameStep) {
    return NextResponse.json({ error: "Game step not found" }, { status: 404 })
  }

  return NextResponse.json(gameStep)
}
