export type DomainRange = { min: number; max: number }

export const MAX_DOLLAR_VALUE = 1_000_000_000 // $1B ceiling mapped to index 100

const USD_KEYWORD_DOMAINS: Array<{ pattern: RegExp; domain: DomainRange }> = [
  { pattern: /\bbitcoin\b|\bbtc\b/i, domain: { min: 0, max: 300_000 } },
  { pattern: /\beth(?:ereum)?\b|\bETH\b/i, domain: { min: 0, max: 40_000 } },
  { pattern: /\bsolana\b|\bSOL\b/i, domain: { min: 0, max: 2_000 } },
  { pattern: /\bdogecoin\b|\bdoge\b/i, domain: { min: 0, max: 10 } },
  { pattern: /\bgold\b|\box\b/i, domain: { min: 0, max: 4_000 } },
  { pattern: /\boil\b|\bwti\b|\bbrent\b/i, domain: { min: 0, max: 500 } },
]

const USD_CATEGORY_DEFAULTS: Record<string, DomainRange> = {
  crypto: { min: 0, max: 250_000 },
  equities: { min: 0, max: 5_000 },
  finance: { min: 0, max: 1_000_000 },
  commodities: { min: 0, max: 10_000 },
}

const USD_PATTERNS = [
  /\$[\s]*\d{1,3}(?:,\d{3})*(?:\.\d+)?(?:\s?(?:billion|million|trillion|thousand|bn|mm|m|b|t|k))?/gi,
  /\b(?:usd|us\$|u\.s\.d\.)\s*\d{1,3}(?:,\d{3})*(?:\.\d+)?(?:\s?(?:billion|million|trillion|thousand|bn|mm|m|b|t|k))?\b/gi,
  /\b\d+(?:\.\d+)?\s?(?:billion|million|trillion|thousand|bn|mm|m|b|t|k)\b/gi,
  /\b\d+(?:\.\d+)?(?:(?:k|m|b|t)\b)/gi,
]

export function defaultValueDomainForUnit(unit: string | undefined): DomainRange {
  const normalized = (unit ?? "").toUpperCase()
  switch (normalized) {
    case "USD":
    case "$":
      return { min: 0, max: 100_000 }
    case "%":
      return { min: -25, max: 125 }
    case "°C":
      return { min: -20, max: 60 }
    default:
      return { min: 0, max: 100 }
  }
}

export function normalizeValueDomain(domain?: DomainRange | null): DomainRange | undefined {
  if (!domain) return undefined
  const min = Number(domain.min)
  const max = Number(domain.max)
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return undefined
  }
  return { min, max }
}

export function suggestValueDomain(
  args: {
    title: string
    description?: string
    resolutionCriteria?: string
    category?: string
  },
  unit: string | undefined,
  options: { maxUsdValue?: number } = {},
): DomainRange | undefined {
  const normalizedUnit = (unit ?? "").toUpperCase()
  const maxUsdValue = Number.isFinite(options.maxUsdValue) ? options.maxUsdValue! : MAX_DOLLAR_VALUE

  if (normalizedUnit === "USD" || normalizedUnit === "$") {
    return inferUsdValueDomain(args, maxUsdValue)
  }

  if (normalizedUnit === "%") {
    return { min: -25, max: 125 }
  }

  if (normalizedUnit === "°C") {
    return { min: -20, max: 60 }
  }

  return undefined
}

function inferUsdValueDomain(
  args: {
    title: string
    description?: string
    resolutionCriteria?: string
    category?: string
  },
  maxUsdValue: number,
): DomainRange | undefined {
  const text = [args.title, args.description, args.resolutionCriteria].filter(Boolean).join(" ")
  const hints = extractUsdHints(text, maxUsdValue)

  if (hints.length > 0) {
    const minHint = Math.min(...hints)
    const maxHint = Math.max(...hints)
    const span = Math.max(maxHint - minHint, Math.max(maxHint, minHint) * 0.3, 1)
    const padding = Math.max(span * 0.4, 1)

    const min = Math.max(0, minHint - padding)
    let max = Math.min(maxUsdValue, maxHint + padding)

    if (max <= min) {
      max = Math.min(maxUsdValue, min + Math.max(span, min * 0.25, 1))
    }

    if (max > min) {
      return { min, max }
    }
  }

  const combined = `${args.title} ${args.category ?? ""}`
  for (const preset of USD_KEYWORD_DOMAINS) {
    if (preset.pattern.test(combined)) {
      return clampUsdDomain(preset.domain, maxUsdValue)
    }
  }

  const categoryKey = args.category?.toLowerCase()
  if (categoryKey && USD_CATEGORY_DEFAULTS[categoryKey]) {
    return clampUsdDomain(USD_CATEGORY_DEFAULTS[categoryKey], maxUsdValue)
  }

  return undefined
}

export function extractUsdHints(text: string, maxUsdValue = MAX_DOLLAR_VALUE): number[] {
  if (!text) return []

  const matches = new Set<number>()

  for (const pattern of USD_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags)
    const found = text.match(regex)
    if (!found) continue

    for (const token of found) {
      const amount = parseUsdAmountToken(token)
      if (amount && Number.isFinite(amount) && amount > 0) {
        matches.add(Math.min(amount, maxUsdValue))
      }
    }
  }

  return Array.from(matches)
}

function parseUsdAmountToken(token: string): number | undefined {
  const cleaned = token
    .toLowerCase()
    .replace(/(?:usd|us\$|u\.s\.d\.|dollars?)/g, "")
    .replace(/[,\s]+/g, "")
    .trim()

  const suffixMatch = cleaned.match(/(trillion|billion|million|thousand|bn|mm|m|b|t|k)$/i)

  let multiplier = 1
  let numericPortion = cleaned

  if (suffixMatch) {
    const suffix = suffixMatch[1]
    multiplier = multiplierForSuffix(suffix)
    numericPortion = cleaned.slice(0, Math.max(0, cleaned.length - suffix.length))
  }

  numericPortion = numericPortion.replace(/[^0-9.-]/g, "")
  if (!numericPortion) return undefined

  const baseValue = Number.parseFloat(numericPortion)
  if (!Number.isFinite(baseValue)) return undefined

  return baseValue * multiplier
}

function multiplierForSuffix(suffix: string): number {
  switch (suffix.toLowerCase()) {
    case "trillion":
    case "t":
      return 1_000_000_000_000
    case "billion":
    case "bn":
    case "b":
      return 1_000_000_000
    case "million":
    case "mm":
    case "m":
      return 1_000_000
    case "thousand":
    case "k":
      return 1_000
    default:
      return 1
  }
}

function clampUsdDomain(domain: DomainRange, maxUsdValue: number): DomainRange {
  const min = Math.max(0, Math.min(maxUsdValue, domain.min))
  let max = Math.max(min + 1, Math.min(maxUsdValue, domain.max))
  if (max === min) {
    max = Math.min(maxUsdValue, min + Math.max(1, min * 0.1))
  }
  return { min, max }
}
