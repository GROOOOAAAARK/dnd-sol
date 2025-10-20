import { NextResponse } from "next/server"
import { mockOngoingAdventures } from "@/assets/mocks/adventures"

export async function GET(request: Request) {

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  return NextResponse.json(mockOngoingAdventures)
}
