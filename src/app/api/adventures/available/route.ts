import { NextResponse } from "next/server"
import { mockAdventures } from "@/assets/mocks/adventures"

export async function GET(request: Request) {

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  return NextResponse.json(mockAdventures)

}
