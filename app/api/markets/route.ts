import { NextResponse } from "next/server"
import { syncStoredMarketsWithOracle } from "@/lib/oracle/market-oracle"

export async function GET() {
  const { markets, updated } = await syncStoredMarketsWithOracle()
  return NextResponse.json(
    {
      markets,
      updated,
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  )
}
