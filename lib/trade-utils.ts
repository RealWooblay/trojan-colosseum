type Domain = { min: number; max: number }

export const MAX_COEFFICIENTS = 8
export const MAX_RANGE_SLOTS = MAX_COEFFICIENTS
const MIN_WIDTH_RATIO = 0.01

const clamp01 = (value: number) => Math.min(1, Math.max(0, value ?? 0))

const sanitizeRange = (range: [number, number], domain: Domain): [number, number] => {
  const low = Math.max(domain.min, Math.min(range[0], range[1]))
  const high = Math.min(domain.max, Math.max(range[0], range[1]))
  if (high - low <= 0) {
    const epsilon = (domain.max - domain.min) * MIN_WIDTH_RATIO
    return [low, Math.min(domain.max, low + epsilon)]
  }
  return [low, high]
}

export function normalizeAlpha(
  weights: number[],
  size: number = MAX_COEFFICIENTS,
  epsilon = 1e-8,
): number[] {
  if (!Array.isArray(weights)) weights = []

  const padded: number[] = []
  for (let i = 0; i < size; i++) {
    const value = Number(weights[i] ?? 0)
    padded.push(Number.isFinite(value) ? Math.max(value, 0) : 0)
  }

  const adjusted = padded.map((value) => (value <= epsilon ? epsilon : value))
  const total = adjusted.reduce((sum, value) => sum + value, 0)
  if (total <= 0) {
    const uniform = 1 / size
    return Array(size).fill(uniform)
  }

  return adjusted.map((value) => value / total)
}

export function rangesToCoefficients(
  ranges: [number, number][],
  domain: Domain,
  maxCoefficients = MAX_COEFFICIENTS,
): number[] {
  const domainRange = Math.max(domain.max - domain.min, 1)
  const cappedRanges = ranges.slice(0, maxCoefficients).map((range) => sanitizeRange(range, domain))

  if (cappedRanges.length === 0) {
    return normalizeAlpha([], maxCoefficients)
  }

  const spans = cappedRanges.map(([min, max]) => Math.max(max - min, domainRange * MIN_WIDTH_RATIO))
  const totalSpan = spans.reduce((sum, span) => sum + span, 0)
  const weights = totalSpan > 0 ? spans.map((span) => span / totalSpan) : spans.map(() => 1 / spans.length)
  return normalizeAlpha(weights, weights.length)
}

export function coefficientsToRanges(coefficients: number[], domain: Domain): [number, number][] {
  if (!coefficients || coefficients.length === 0) return []
  const domainRange = Math.max(domain.max - domain.min, 1)
  const normalizedWeights = normalizeAlpha(coefficients, coefficients.length)

  const ranges: [number, number][] = []
  let cursor = domain.min

  normalizedWeights.forEach((weight) => {
    if (weight <= 0 || ranges.length >= MAX_RANGE_SLOTS) return
    const width = clamp01(weight) * domainRange
    const min = cursor
    const max = Math.min(domain.max, cursor + width)
    if (max > min && ranges.length < MAX_RANGE_SLOTS) {
      ranges.push([min, max])
    }
    cursor = max
  })

  return ranges
}
