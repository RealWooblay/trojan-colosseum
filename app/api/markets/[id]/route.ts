import { NextResponse } from "next/server"
import { MOCK_MARKETS } from "@/lib/mock-data"
import { generateNormalPdf, generateLognormalPdf, generateBetaPdf, generateUniformPdf } from "@/lib/pdf-utils"
import type { Trade } from "@/lib/types"
import { findStoredMarket } from "@/lib/storage"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params

  const storedMarket = await findStoredMarket(id)
  const mockMarket = MOCK_MARKETS.find((m) => m.id === id)
  const market = storedMarket ?? mockMarket

  if (!market) {
    return NextResponse.json({ error: "Market not found" }, { status: 404 })
  }

  // Generate PDF based on prior
  let pdf
  if (storedMarket) {
    pdf = generateUniformPdf(market.domain)
  } else {
    switch (market.prior.kind) {
      case "normal":
        pdf = generateNormalPdf(market.prior.params.mean, market.prior.params.variance, market.domain)
        break
      case "lognormal":
        pdf = generateLognormalPdf(market.prior.params.mu, market.prior.params.sigma, market.domain)
        break
      case "beta":
        pdf = generateBetaPdf(market.prior.params.alpha, market.prior.params.beta, market.domain)
        break
      case "uniform":
        pdf = generateUniformPdf(market.domain)
        break
      default:
        pdf = generateNormalPdf(market.stats.mean, market.stats.variance, market.domain)
    }
  }

  // Generate mock recent trades
  const recentTrades: Trade[] = Array.from({ length: 10 }, (_, i) => ({
    id: `trade-${id}-${i}`,
    marketId: id,
    side: Math.random() > 0.5 ? "buy" : "sell",
    range: [
      market.domain.min + Math.random() * (market.domain.max - market.domain.min) * 0.4,
      market.domain.min + Math.random() * (market.domain.max - market.domain.min) * 0.6 + 0.4,
    ] as [number, number],
    notionalUSD: Math.random() * 5000 + 500,
    deltaMass: Math.random() * 0.1,
    feeUSD: Math.random() * 50 + 5,
    createdAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
  }))

  return NextResponse.json({
    market,
    pdf,
    stats: market.stats,
    recentTrades,
  })
}
