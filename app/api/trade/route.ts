import { NextResponse } from "next/server"
import { calculateMassInRange, reweightPdf, calculateMean, calculateVariance } from "@/lib/pdf-utils"
import { generateNormalPdf, generateLognormalPdf, generateBetaPdf, generateUniformPdf } from "@/lib/pdf-utils"
import { MOCK_MARKETS } from "@/lib/mock-data"

export async function POST(request: Request) {
  const body = await request.json()
  const { marketId, side, range, notionalUSD } = body

  const market = MOCK_MARKETS.find((m) => m.id === marketId)
  if (!market) {
    return NextResponse.json({ error: "Market not found" }, { status: 404 })
  }

  // Generate current PDF
  let pdf
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

  // Calculate current mass in range
  const currentMass = calculateMassInRange(pdf, range)

  // Simulate trade: deltaMass proportional to notional and inversely to current mass
  const baseDeltaMass = notionalUSD / 10000 // Simple model
  const deltaMass = side === "buy" ? baseDeltaMass : -baseDeltaMass

  // Calculate cost (with slippage)
  const slippageFactor = 1 + Math.abs(deltaMass) * 0.5
  const costUSD = side === "buy" ? notionalUSD * slippageFactor : notionalUSD / slippageFactor

  // Reweight PDF
  const newPdf = reweightPdf(pdf, range, deltaMass)

  // Calculate new stats
  const newMean = calculateMean(newPdf)
  const newVariance = calculateVariance(newPdf, newMean)

  const feeUSD = costUSD * 0.003 // 0.3% fee

  return NextResponse.json({
    deltaMass,
    costUSD: costUSD + feeUSD,
    feeUSD,
    newPdf,
    newStats: {
      mean: newMean,
      variance: newVariance,
      skew: market.stats.skew + deltaMass * 0.1,
      kurtosis: market.stats.kurtosis,
    },
    impliedShift: {
      deltaMean: newMean - market.stats.mean,
      deltaVariance: newVariance - market.stats.variance,
    },
  })
}
