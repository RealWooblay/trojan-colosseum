/**
 * Format percentage with 1 decimal for small values, 0 for large
 */
export function fmtPct(x: number): string {
  const abs = Math.abs(x)
  if (abs < 100) {
    return `${x.toFixed(1)}%`
  }
  return `${Math.round(x)}%`
}

/**
 * Format USD in compact notation (K, M, B)
 */
export function fmtUSD(x: number): string {
  const abs = Math.abs(x)
  const sign = x < 0 ? "-" : ""

  if (abs >= 1_000_000_000) {
    return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`
  }
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  }
  if (abs >= 1_000) {
    return `${sign}$${(abs / 1_000).toFixed(1)}K`
  }
  return `${sign}$${abs.toFixed(0)}`
}

/**
 * Format number with max 2 significant figures, cleaner rounding
 */
export function fmtNum(x: number): string {
  if (x === 0) return "0"

  const abs = Math.abs(x)
  const sign = x < 0 ? "-" : ""

  // For very small numbers, use scientific notation
  if (abs < 0.001) {
    return x.toExponential(1)
  }

  // For numbers >= 1, use up to 2 sig figs with cleaner rounding
  if (abs >= 1) {
    if (abs >= 1000) {
      return `${sign}${Math.round(abs)}`
    }
    if (abs >= 100) {
      return `${sign}${abs.toFixed(0)}`
    }
    if (abs >= 10) {
      return `${sign}${abs.toFixed(1)}`
    }
    return `${sign}${abs.toFixed(2)}`
  }

  // For decimals < 1, show up to 2 decimal places
  return `${sign}${abs.toFixed(2)}`
}

/**
 * Format outcome value based on unit
 */
export function fmtOutcome(x: number, unit: string): string {
  if (unit === "$" || unit === "USD") {
    return fmtUSD(x)
  }
  if (unit === "%") {
    return fmtPct(x)
  }
  return fmtNum(x)
}

/**
 * Determine liquidity label based on depth
 */
export function getLiquidityLabel(depth: number): string {
  if (depth < 1000) return "THIN"
  if (depth < 10000) return "MODERATE"
  return "THICK"
}

/**
 * Format axis tick with unit - cleaner formatting
 */
export function fmtAxis(x: number, unit: string): string {
  if (unit === "$" || unit === "USD") {
    const abs = Math.abs(x)
    if (abs >= 1_000_000) return `$${Math.round(x / 1_000_000)}M`
    if (abs >= 10_000) return `$${Math.round(x / 1_000)}K`
    return `$${Math.round(x)}`
  }
  if (unit === "%") {
    return `${Math.round(x * 10) / 10}%`
  }
  if (unit === "°C") {
    return `${Math.round(x)}°C`
  }
  return fmtNum(x)
}

/**
 * Calculate range probability from PDF data
 */
export function calcRangeProb(data: { x: number; y: number }[], range: [number, number]): number {
  if (!data || data.length < 2) return 0
  const [min, max] = range
  if (min >= max) return 0

  let mass = 0

  for (let i = 0; i < data.length - 1; i++) {
    const p1 = data[i]
    const p2 = data[i + 1]
    const segmentWidth = p2.x - p1.x
    if (segmentWidth <= 0) continue

    if (p2.x <= min || p1.x >= max) continue

    const segmentStart = Math.max(p1.x, min)
    const segmentEnd = Math.min(p2.x, max)
    if (segmentEnd <= segmentStart) continue

    const startRatio = (segmentStart - p1.x) / segmentWidth
    const endRatio = (segmentEnd - p1.x) / segmentWidth

    const startY = p1.y + (p2.y - p1.y) * startRatio
    const endY = p1.y + (p2.y - p1.y) * endRatio

    mass += ((startY + endY) * 0.5) * (segmentEnd - segmentStart)
  }

  return mass
}
