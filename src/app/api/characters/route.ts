import { NextResponse } from "next/server"
import { mockCharacters } from "@/assets/mocks/characters"

export async function GET() {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800))

  return NextResponse.json(mockCharacters)
}

export async function POST(request: Request) {
  const character = await request.json()

  //TODO: save in DB

  return NextResponse.json(character, { status: 201 })
}
