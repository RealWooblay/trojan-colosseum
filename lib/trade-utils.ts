type Domain = { min: number; max: number }

export const MAX_COEFFICIENTS = 8
export const MAX_RANGE_SLOTS = MAX_COEFFICIENTS / 2
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

export function rangesToCoefficients(
  ranges: [number, number][],
  domain: Domain,
  maxCoefficients = MAX_COEFFICIENTS,
): number[] {
  const domainRange = Math.max(domain.max - domain.min, 1)
  const maxPairs = Math.floor(maxCoefficients / 2)
  const cappedRanges = ranges.slice(0, maxPairs)

  const descriptors = cappedRanges.map((range) => {
    const [min, max] = sanitizeRange(range, domain)
    const width = Math.max(max - min, domainRange * MIN_WIDTH_RATIO)
    const center = min + width / 2
    const normalizedCenter = clamp01((center - domain.min) / domainRange)
    return { normalizedCenter, spanValue: width }
  })

  if (!descriptors.length) return []

  const totalSpan = descriptors.reduce((sum, desc) => sum + desc.spanValue, 0)
  const uniformShare = descriptors.length > 0 ? 1 / descriptors.length : 0
  const shares: number[] = []

  if (totalSpan > 0) {
    let runningTotal = 0
    descriptors.forEach((desc, index) => {
      if (index === descriptors.length - 1) {
        shares.push(Math.max(0, 1 - runningTotal))
      } else {
        const share = clamp01(desc.spanValue / totalSpan)
        shares.push(share)
        runningTotal += share
      }
    })
  } else {
    descriptors.forEach(() => {
      shares.push(uniformShare)
    })
  }

  const shareSum = shares.reduce((sum, share) => sum + share, 0)
  const difference = 1 - shareSum
  if (shares.length > 0 && Math.abs(difference) > Number.EPSILON) {
    shares[shares.length - 1] = clamp01(shares[shares.length - 1] + difference)
  }

  const normalizedPairs: number[] = []
  descriptors.forEach((desc, index) => {
    normalizedPairs.push(desc.normalizedCenter)
    normalizedPairs.push(shares[index] ?? 0)
  })

  return normalizedPairs.slice(0, maxCoefficients)
}

export function coefficientsToRanges(coefficients: number[], domain: Domain): [number, number][] {
  if (!coefficients || coefficients.length === 0) return []
  const domainRange = Math.max(domain.max - domain.min, 1)
  const ranges: [number, number][] = []

  for (let i = 0; i < coefficients.length && ranges.length < MAX_RANGE_SLOTS; i += 2) {
    const centerCoef = clamp01(coefficients[i] ?? 0.5)
    const widthCoef = clamp01(coefficients[i + 1] ?? MIN_WIDTH_RATIO)

    const width = Math.max(widthCoef, MIN_WIDTH_RATIO) * domainRange
    const center = domain.min + centerCoef * domainRange
    const halfWidth = width / 2

    const min = Math.max(domain.min, center - halfWidth)
    const max = Math.min(domain.max, center + halfWidth)

    if (max > min) {
      ranges.push([min, max])
    }
  }

  return ranges
}
