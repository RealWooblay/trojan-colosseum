import { NextResponse } from "next/server"
import { calculateMean, calculateVariance, projectGhostFromRanges, generateNormalPdf, generateLognormalPdf, generateBetaPdf, generateUniformPdf } from "@/lib/pdf-utils"
import { MOCK_MARKETS } from "@/lib/mock-data"
import { coefficientsToRanges } from "@/lib/trade-utils"
import { findStoredMarket } from "@/lib/storage"

export async function POST(request: Request) {
  const body = await request.json()
  const { marketId, side, range, ranges, notionalUSD, amountUSD, coefficients } = body

  const storedMarket = await findStoredMarket(marketId)
  const mockMarket = storedMarket ? null : MOCK_MARKETS.find((m) => m.id === marketId)
  const market = storedMarket ?? mockMarket
  if (!market) {
    return NextResponse.json({ error: "Market not found" }, { status: 404 })
  }

  let pdf
  let baseStats = market.stats
  if (storedMarket) {
    const baseRanges = storedMarket.ranges && storedMarket.ranges.length > 0
      ? storedMarket.ranges
      : coefficientsToRanges(storedMarket.coefficients ?? [], storedMarket.domain)
    const basePdf = baseRanges.length > 0
      ? projectGhostFromRanges(generateUniformPdf(storedMarket.domain), baseRanges, storedMarket.domain)
      : generateUniformPdf(storedMarket.domain)
    pdf = basePdf
    const mean = calculateMean(basePdf)
    baseStats = {
      mean,
      variance: calculateVariance(basePdf, mean),
      skew: storedMarket.stats?.skew ?? 0,
      kurtosis: storedMarket.stats?.kurtosis ?? 3,
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
      case "uniform":
        pdf = generateUniformPdf(mockMarket.domain)
        break
      default:
        pdf = generateNormalPdf(mockMarket.stats.mean, mockMarket.stats.variance, mockMarket.domain)
    }
  } else {
    pdf = generateUniformPdf(market.domain)
  }

  const amount = typeof amountUSD === "number" ? amountUSD : typeof notionalUSD === "number" ? notionalUSD : 0

  const sanitizeRange = (candidate: [number, number]): [number, number] => {
    const min = Math.max(market.domain.min, Math.min(candidate[0], candidate[1]))
    const max = Math.min(market.domain.max, Math.max(candidate[0], candidate[1]))
    return [min, max]
  }

  const payloadRanges: [number, number][] = Array.isArray(ranges)
    ? ranges
        .filter(
          (candidate: unknown): candidate is [number, number] =>
            Array.isArray(candidate) && candidate.length === 2 && candidate.every((value) => typeof value === "number"),
        )
        .map(sanitizeRange)
        .filter(([min, max]) => max > min)
    : []

  const coefficientRanges =
    coefficients && coefficients.length > 0 ? coefficientsToRanges(coefficients, market.domain) : []

  const workingRanges =
    payloadRanges.length > 0
      ? payloadRanges
      : coefficientRanges.length > 0
      ? coefficientRanges
      : range && Array.isArray(range) && range.length === 2
        ? [sanitizeRange([Number(range[0]), Number(range[1])])]
        : [[market.domain.min, market.domain.max]]

  // Simulate trade: deltaMass proportional to notional
  const baseDeltaMass = amount / 10000 // Simple model
  const deltaMass = side === "buy" ? baseDeltaMass : -baseDeltaMass

  // Calculate cost (with slippage)
  const slippageFactor = 1 + Math.abs(deltaMass) * 0.5
  const costUSD = side === "buy" ? amount * slippageFactor : amount / slippageFactor

  // Project ghost curve server-side using the same helper as the client
  const newPdf = projectGhostFromRanges(pdf, workingRanges, market.domain)

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
      skew: baseStats.skew + deltaMass * 0.1,
      kurtosis: baseStats.kurtosis,
    },
    impliedShift: {
      deltaMean: newMean - baseStats.mean,
      deltaVariance: newVariance - baseStats.variance,
    },
  })
}
