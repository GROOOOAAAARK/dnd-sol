import { NextResponse } from "next/server"
import { mockAdventures, mockOngoingAdventures } from "@/assets/mocks/adventures"

export async function GET(request: Request) {
  // Get the path to determine which adventures to return
  const url = new URL(request.url)
  const path = url.pathname

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800))

  if (path.includes("/available")) {
    return NextResponse.json(mockAdventures)
  } else if (path.includes("/ongoing")) {
    return NextResponse.json(mockOngoingAdventures)
  } else {
    // Return all adventures
    return NextResponse.json([...mockOngoingAdventures, ...mockAdventures])
  }
}
