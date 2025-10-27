import { NextResponse } from "next/server"
import { generateUniformPdf, generateNormalPdf, generateLognormalPdf, generateBetaPdf, projectGhostFromRanges, calculateMean, calculateVariance } from "@/lib/pdf-utils"
import type { Trade } from "@/lib/types"
import { findStoredMarket } from "@/lib/storage"
import { coefficientsToRanges } from "@/lib/trade-utils"
import { MOCK_MARKETS } from "@/lib/mock-data"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params

  const storedMarket = await findStoredMarket(id)
  const mockMarket = storedMarket ? null : MOCK_MARKETS.find((m) => m.id === id)
  const market = storedMarket ?? mockMarket

  if (!market) {
    return NextResponse.json({ error: "Market not found" }, { status: 404 })
  }

  let pdf
  let stats = market.stats

  if (storedMarket) {
    const domain = storedMarket.domain
    const baseRanges = storedMarket.ranges && storedMarket.ranges.length > 0
      ? storedMarket.ranges
      : coefficientsToRanges(storedMarket.alpha ?? [], domain)
    const basePdf = baseRanges.length > 0
      ? projectGhostFromRanges(generateUniformPdf(domain), baseRanges, domain)
      : generateUniformPdf(domain)
    pdf = basePdf
    const mean = calculateMean(basePdf)
    const variance = calculateVariance(basePdf, mean)
    stats = {
      mean,
      variance,
      skew: stats?.skew ?? 0,
      kurtosis: stats?.kurtosis ?? 3,
    }
  } else if (mockMarket) {
    switch (mockMarket.prior.kind) {
      case "normal":
        pdf = generateNormalPdf(mockMarket.prior.params.mean, mockMarket.prior.params.variance, mockMarket.domain)
        break
      case "lognormal":
        pdf = generateLognormalPdf(mockMarket.prior.params.mu, mockMarket.prior.params.sigma, mockMarket.domain)
        break
      case "beta":
        pdf = generateBetaPdf(mockMarket.prior.params.alpha, mockMarket.prior.params.beta, mockMarket.domain)
        break
      default:
        pdf = generateUniformPdf(mockMarket.domain)
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
    stats,
    recentTrades,
  })
}
