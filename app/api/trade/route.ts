import { NextResponse } from "next/server"
import { calculateMean, calculateVariance, projectGhostFromRanges, generateNormalPdf, generateLognormalPdf, generateBetaPdf, generateUniformPdf } from "@/lib/pdf-utils"
import { MOCK_MARKETS } from "@/lib/mock-data"
import { coefficientsToRanges } from "@/lib/trade-utils"

export async function POST(request: Request) {
  const body = await request.json()
  const { marketId, side, range, ranges, notionalUSD, amountUSD, coefficients } = body

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
      skew: market.stats.skew + deltaMass * 0.1,
      kurtosis: market.stats.kurtosis,
    },
    impliedShift: {
      deltaMean: newMean - market.stats.mean,
      deltaVariance: newVariance - market.stats.variance,
    },
  })
}
