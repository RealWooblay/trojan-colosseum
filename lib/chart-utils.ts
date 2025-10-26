// Utility functions for chart formatting and calculations

export function formatCompact(value: number): string {
  if (value >= 1_000_000) {
    return `${Math.round(value / 1_000_000)}M`
  }
  if (value >= 1_000) {
    return `${Math.round(value / 1_000)}K`
  }
  return Math.round(value).toString()
}

export function formatValue(value: number, unit: string): string {
  if (Math.abs(value) >= 1000) {
    return `${formatCompact(value)} ${unit}`
  }
  return `${Math.round(value * 10) / 10} ${unit}`
}

export function calculateCumulativeProbability(data: { x: number; y: number }[], range: [number, number]): number {
  const filtered = data.filter((p) => p.x >= range[0] && p.x <= range[1])
  if (filtered.length === 0) return 0

  // Trapezoidal integration
  let sum = 0
  for (let i = 0; i < filtered.length - 1; i++) {
    const dx = filtered[i + 1].x - filtered[i].x
    const avgY = (filtered[i].y + filtered[i + 1].y) / 2
    sum += dx * avgY
  }
  return sum
}

export function findMode(data: { x: number; y: number }[]): number {
  if (data.length === 0) return 0
  const maxPoint = data.reduce((max, p) => (p.y > max.y ? p : max), data[0])
  return maxPoint.x
}

export function assessLiquidityDepth(data: { x: number; y: number }[], x: number): "thin" | "moderate" | "thick" {
  const point = data.find((p) => Math.abs(p.x - x) < 0.5)
  if (!point) return "moderate"

  const avgDensity = data.reduce((sum, p) => sum + p.y, 0) / data.length
  const ratio = point.y / avgDensity

  if (ratio < 0.5) return "thin"
  if (ratio > 1.5) return "thick"
  return "moderate"
}
