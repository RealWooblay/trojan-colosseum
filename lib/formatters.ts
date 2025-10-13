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
 * Format number with max 3 significant figures, trim trailing zeros
 */
export function fmtNum(x: number): string {
  if (x === 0) return "0"

  const abs = Math.abs(x)
  const sign = x < 0 ? "-" : ""

  // For very small numbers, use scientific notation
  if (abs < 0.001) {
    return x.toExponential(2)
  }

  // For numbers >= 1, use up to 3 sig figs
  if (abs >= 1) {
    return `${sign}${abs.toPrecision(3).replace(/\.?0+$/, "")}`
  }

  // For decimals < 1, show up to 3 decimal places
  return `${sign}${abs.toFixed(3).replace(/\.?0+$/, "")}`
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
 * Format axis tick with unit
 */
export function fmtAxis(x: number, unit: string): string {
  if (unit === "$" || unit === "USD") {
    const abs = Math.abs(x)
    if (abs >= 1_000_000) return `$${(x / 1_000_000).toFixed(1)}M`
    if (abs >= 1_000) return `$${(x / 1_000).toFixed(1)}K`
    return `$${x.toFixed(0)}`
  }
  if (unit === "%") {
    return `${x.toFixed(1)}%`
  }
  return fmtNum(x)
}

/**
 * Calculate range probability from PDF data
 */
export function calcRangeProb(data: { x: number; y: number }[], range: [number, number]): number {
  const [min, max] = range
  const filtered = data.filter((p) => p.x >= min && p.x <= max)
  const sum = filtered.reduce((acc, p) => acc + p.y, 0)
  const dx = data.length > 1 ? data[1].x - data[0].x : 1
  return sum * dx
}
