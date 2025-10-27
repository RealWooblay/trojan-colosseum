import { NextResponse } from "next/server"
import { appendStoredMarket, readStoredMarkets, type StoredMarket } from "@/lib/storage"
import { slugify } from "@/lib/utils"
import { newMarket } from "@/lib/sonormal/program"
import { coefficientsToRanges, normalizeAlpha } from "@/lib/trade-utils"
import { MOCK_MARKETS } from "@/lib/mock-data"

const DEFAULT_DOMAIN = { min: 0, max: 100 }
const MAX_COEFFICIENTS = 8
const DEFAULT_STATS = {
  mean: (DEFAULT_DOMAIN.max + DEFAULT_DOMAIN.min) / 2,
  variance: Math.pow(DEFAULT_DOMAIN.max - DEFAULT_DOMAIN.min, 2) / 12,
  skew: 0,
  kurtosis: 3,
}

export async function GET() {
  const stored = await readStoredMarkets()
  return NextResponse.json([...stored, ...MOCK_MARKETS])
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, unit, category, description, expiry, coefficients, ranges } = body ?? {}

    if (!title || !unit || !category || !expiry) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!Array.isArray(coefficients) || coefficients.length === 0) {
      return NextResponse.json({ error: "Provide at least one coefficient" }, { status: 400 })
    }

    const numericWeights = coefficients.map((value: number) => Number(value))
    if (numericWeights.some((value) => !Number.isFinite(value))) {
      return NextResponse.json({ error: "Coefficients must be numeric" }, { status: 400 })
    }
    const storedCoefficients = normalizeAlpha(numericWeights, numericWeights.length)
    const alpha = normalizeAlpha(numericWeights, MAX_COEFFICIENTS)

    const expirySeconds = Math.floor(new Date(expiry).getTime() / 1000)
    if (!Number.isFinite(expirySeconds) || expirySeconds <= Math.floor(Date.now() / 1000)) {
      return NextResponse.json({ error: "Expiry must be in the future" }, { status: 400 })
    }

    if (!process.env.MARKET_AUTHORITY || !process.env.SOLANA_RPC || !process.env.SONORMAL_PROGRAM_ID || !process.env.USDC_MINT) {
      return NextResponse.json({ error: "Missing Solana configuration" }, { status: 500 })
    }

    const sanitizedRanges: [number, number][] = Array.isArray(ranges)
      ? ranges
          .filter(
            (candidate: unknown): candidate is [number, number] =>
              Array.isArray(candidate) && candidate.length === 2 && candidate.every((value) => typeof value === "number"),
          )
          .map(([min, max]) => {
            const clampedMin = Math.max(DEFAULT_DOMAIN.min, Math.min(min, max))
            const clampedMax = Math.min(DEFAULT_DOMAIN.max, Math.max(min, max))
            return [clampedMin, clampedMax] as [number, number]
          })
          .filter(([min, max]) => max > min)
      : []

    const rangesForStorage = sanitizedRanges.length > 0 ? sanitizedRanges : coefficientsToRanges(storedCoefficients, DEFAULT_DOMAIN)

    const onChainResult = await newMarket(alpha, expirySeconds)

    if (!onChainResult.success) {
      return NextResponse.json({ error: onChainResult.error?.message || "On-chain transaction failed", logs: onChainResult.error?.logs }, { status: 500 })
    }

    const storedMarket: StoredMarket = {
      id: `${slugify(title)}-${Date.now().toString(36)}`,
      title,
      unit,
      category,
      domain: DEFAULT_DOMAIN,
      prior: { kind: "uniform", params: {} },
      liquidityUSD: 0,
      vol24hUSD: 0,
      stats: DEFAULT_STATS,
      resolvesAt: new Date(expiry).toISOString(),
      coefficients: storedCoefficients,
      ranges: rangesForStorage,
      expiry: new Date(expiry).toISOString(),
      createdAt: new Date().toISOString(),
      txSignature: onChainResult.signature,
      description,
    }

    await appendStoredMarket(storedMarket)
    return NextResponse.json(storedMarket, { status: 201 })
  } catch (error: any) {
    console.error("[markets POST]", error)
    return NextResponse.json({
      error: error?.message || "Failed to create market",
      logs: error?.logs,
    }, { status: 500 })
  }
}
