import { NextResponse } from "next/server"
import { readStoredMarkets } from "@/lib/storage"

export async function GET() {
  const stored = await readStoredMarkets()
  return NextResponse.json([...stored])
}