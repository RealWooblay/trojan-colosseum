import { NextResponse } from "next/server"
import { MOCK_MARKETS } from "@/lib/mock-data"
import { appendStoredMarket, readStoredMarkets, type StoredMarket } from "@/lib/storage"
import { slugify } from "@/lib/utils"
import { newMarket } from "@/lib/sonormal/program"

const DEFAULT_DOMAIN = { min: 0, max: 100 }
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
      return NextResponse.json({ error: "At least one coefficient is required" }, { status: 400 })
    }

    const normalizedCoefficients = coefficients.map((value: number) => Number(value))
    if (normalizedCoefficients.some((value) => Number.isNaN(value))) {
      return NextResponse.json({ error: "Coefficients must be numeric" }, { status: 400 })
    }

    const expirySeconds = Math.floor(new Date(expiry).getTime() / 1000)
    if (!Number.isFinite(expirySeconds) || expirySeconds <= 0) {
      return NextResponse.json({ error: "Invalid expiry" }, { status: 400 })
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

    const onChainResult = await newMarket(normalizedCoefficients, expirySeconds)

    if (!onChainResult.success) {
      return NextResponse.json({ error: onChainResult.error }, { status: 500 })
    }

    const id = `${slugify(title)}-${Date.now().toString(36)}`
    const storedMarket: StoredMarket = {
      id,
      title,
      unit,
      category,
      domain: DEFAULT_DOMAIN,
      prior: { kind: "uniform", params: {} },
      liquidityUSD: 0,
      vol24hUSD: 0,
      stats: DEFAULT_STATS,
      resolvesAt: new Date(expiry).toISOString(),
      coefficients: normalizedCoefficients,
      ranges: sanitizedRanges,
      expiry: new Date(expiry).toISOString(),
      createdAt: new Date().toISOString(),
      txSignature: onChainResult.tx,
      description,
    }

    await appendStoredMarket(storedMarket)
    return NextResponse.json(storedMarket, { status: 201 })
  } catch (error) {
    console.error("[markets POST]", error)
    return NextResponse.json({ error: "Failed to create market" }, { status: 500 })
  }
}
