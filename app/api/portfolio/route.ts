import { NextResponse } from "next/server"
import type { Position, PortfolioSummary } from "@/lib/types"

export async function GET() {
  // Mock portfolio data
  const positions: Position[] = [
    {
      id: "pos-1",
      marketId: "eth-price-2025",
      marketTitle: "ETH Price on Dec 31, 2025",
      range: [3000, 4500],
      massOwned: 0.15,
      costUSD: 2500,
      markValueUSD: 2850,
      pnlUSD: 350,
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: "pos-2",
      marketId: "us-cpi-q2-2025",
      marketTitle: "US CPI YoY Q2 2025",
      range: [2.0, 3.0],
      massOwned: 0.22,
      costUSD: 1800,
      markValueUSD: 1650,
      pnlUSD: -150,
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: "pos-3",
      marketId: "sp500-return-2025",
      marketTitle: "S&P 500 Annual Return 2025",
      range: [5, 15],
      massOwned: 0.18,
      costUSD: 3200,
      markValueUSD: 3450,
      pnlUSD: 250,
      createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
  ]

  const summary: PortfolioSummary = {
    netExposureUSD: positions.reduce((sum, p) => sum + p.markValueUSD, 0),
    realizedPnL: 0,
    unsettledPnL: positions.reduce((sum, p) => sum + p.pnlUSD, 0),
    openPositions: positions.length,
  }

  return NextResponse.json({ positions, summary })
}
