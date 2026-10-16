import { NextResponse } from "next/server"
import { mockAdventures } from "@/assets/mocks/adventures"

export async function GET(_: Request, props: { params: Promise<{ adventureId: string }> }) {
  const params = await props.params;
  const adventureId = params.adventureId

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800))

  const adventure = mockAdventures.find((adv) => adv.id === adventureId)

  if (!adventure) {
    return NextResponse.json({ error: "Adventure not found" }, { status: 404 })
  }

  return NextResponse.json(adventure)
}
