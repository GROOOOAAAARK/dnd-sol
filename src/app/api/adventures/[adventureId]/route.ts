import { NextResponse } from "next/server"
import { mockAdventures } from "@/assets/mocks/adventures"

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800))

  const adventure = mockAdventures.find((adv) => adv.id === id)

  if (!adventure) {
    return NextResponse.json({ error: "Adventure not found" }, { status: 404 })
  }

  return NextResponse.json(adventure)
}
