import { NextResponse } from "next/server"
import { MOCK_MARKETS } from "@/lib/mock-data"

export async function GET() {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 100))

  return NextResponse.json(MOCK_MARKETS)
}
