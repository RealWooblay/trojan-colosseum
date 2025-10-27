import { AiOracle } from "./ai-oracle"
import type { OutcomeRequest, OracleOutcome } from "./ai-oracle"
import type { Market, MarketOracleState } from "../types"
import { readStoredMarkets, writeStoredMarkets } from "../storage"

const ORACLE_CHECK_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes between checks

type NewMarketOracleInput = {
  id: string
  title: string
  category: string
  description?: string
  expiry?: string
}

export function createDefaultAiOracleState(input: NewMarketOracleInput): MarketOracleState {
  const normalizedTitle = input.title.trim()
  const resolutionCriteria =
    input.description?.trim() ||
    `Resolve to YES if "${normalizedTitle}" occurs as described, otherwise resolve to NO.`

  const keywords = extractKeywords(normalizedTitle, input.category)

  const request: OutcomeRequest = {
    marketId: input.id,
    question: normalizedTitle,
    resolutionCriteria,
    resolutionDeadline: input.expiry,
    locale: "en-US",
    options: [
      {
        id: "yes",
        label: "YES",
        keywords: [...keywords.primary, ...COMMON_POSITIVE_KEYWORDS],
      },
      {
        id: "no",
        label: "NO",
        keywords: [...keywords.primary, ...keywords.negative, ...COMMON_NEGATIVE_KEYWORDS],
      },
    ],
  }

  return {
    type: "ai",
    status: "pending",
    request,
  }
}

const COMMON_POSITIVE_KEYWORDS = [
  "confirmed",
  "announced",
  "completed",
  "approved",
  "successful",
]

const COMMON_NEGATIVE_KEYWORDS = [
  "not",
  "cancelled",
  "canceled",
  "denied",
  "failed",
  "postponed",
  "delayed",
  "refused",
]

function extractKeywords(title: string, category: string): {
  primary: string[]
  negative: string[]
} {
  const tokens = new Set(
    title
      .toLowerCase()
      .split(/[^a-z0-9%]+/i)
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token)),
  )
  if (category) {
    tokens.add(category.toLowerCase())
  }

  const primary = Array.from(tokens)
  const negative = primary
    .map((token) => `no ${token}`)
    .concat(primary.map((token) => `not ${token}`))

  return { primary, negative }
}

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "from",
  "this",
  "will",
  "into",
  "have",
  "been",
  "after",
  "over",
  "when",
  "what",
  "does",
  "your",
  "2024",
  "2025",
])

export async function syncStoredMarketsWithOracle(existing?: Market[]): Promise<{
  markets: Market[]
  updated: boolean
}> {
  const markets = existing ?? (await readStoredMarkets())
  if (!markets.length) {
    return { markets, updated: false }
  }

  const oracle = new AiOracle()
  let updated = false
  const now = Date.now()
  const nowISO = new Date(now).toISOString()

  const nextMarkets: Market[] = []

  for (const market of markets) {
    if (hasMarketResolved(market)) {
      nextMarkets.push(market)
      continue
    }

    const oracleState = market.oracle
    if (!oracleState || oracleState.type !== "ai") {
      nextMarkets.push(market)
      continue
    }

    const lastCheckedAt = oracleState.lastCheckedAt
      ? new Date(oracleState.lastCheckedAt).getTime()
      : undefined
    if (lastCheckedAt && now - lastCheckedAt < ORACLE_CHECK_INTERVAL_MS) {
      nextMarkets.push(market)
      continue
    }

    const deadlineValue = oracleState.request.resolutionDeadline
    const deadline =
      typeof deadlineValue === "string" ? new Date(deadlineValue) : deadlineValue

    const fallbackExpiry =
      market.resolvesAt ?? market.expiry ?? market.oracle?.request.resolutionDeadline
    const fallbackDeadline =
      fallbackExpiry && typeof fallbackExpiry === "string"
        ? new Date(fallbackExpiry)
        : (fallbackExpiry as unknown as Date | undefined)

    const effectiveDeadline = deadline ?? fallbackDeadline
    const effectiveDeadlineTime = effectiveDeadline?.getTime()

    if (
      !effectiveDeadline ||
      Number.isNaN(effectiveDeadlineTime) ||
      (effectiveDeadlineTime as number) > now
    ) {
      nextMarkets.push(market)
      continue
    }

    try {
      const request: OutcomeRequest = {
        ...oracleState.request,
        resolutionDeadline: effectiveDeadline,
      }
      const verdict = await oracle.checkOutcome(request)

      const resolvedOutcome = verdict.outcome === "PENDING" ? undefined : verdict.outcome
      const nextOracleState: MarketOracleState = {
        ...oracleState,
        status: verdict.outcome === "PENDING" ? "pending" : "resolved",
        lastCheckedAt: nowISO,
        lastVerdict: verdict,
        resolvedOutcome,
        error: undefined,
      }

      const resolutionConfidence = Math.round(verdict.confidence * 100)
      const boundedConfidence =
        resolvedOutcome && !Number.isNaN(resolutionConfidence)
          ? Math.min(100, Math.max(0, resolutionConfidence))
          : market.resolutionConfidence

      nextMarkets.push({
        ...market,
        oracle: nextOracleState,
        resolvedOutcome: resolvedOutcome ?? market.resolvedOutcome,
        resolutionConfidence: boundedConfidence,
      })

      if (
        oracleState.lastVerdict?.outcome !== verdict.outcome ||
        oracleState.status !== nextOracleState.status ||
        (resolvedOutcome && market.resolutionConfidence !== boundedConfidence) ||
        oracleState.lastCheckedAt !== nextOracleState.lastCheckedAt
      ) {
        updated = true
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error while checking oracle."
      nextMarkets.push({
        ...market,
        oracle: {
          ...oracleState,
          lastCheckedAt: nowISO,
          error: message,
        },
      })
      updated = true
    }
  }

  if (updated) {
    await writeStoredMarkets(nextMarkets)
  }

  return { markets: nextMarkets, updated }
}

export function hasMarketResolved(market: Market): boolean {
  if (market.resolvedOutcome && market.resolvedOutcome !== "PENDING") return true
  if (market.oracle?.resolvedOutcome && market.oracle.resolvedOutcome !== "PENDING") {
    return true
  }
  return false
}

export function getResolvedOutcome(market: Market): OracleOutcome | undefined {
  return market.resolvedOutcome ?? market.oracle?.resolvedOutcome
}
