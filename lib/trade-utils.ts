import { calcRangeProb } from "./formatters"
import type { PdfPoint } from "./types"

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
  const cappedSize = Math.max(0, Math.floor(size))
  if (cappedSize === 0) return []

  const padded: number[] = []
  for (let i = 0; i < cappedSize; i++) {
    const value = Number(weights[i] ?? 0)
    const finite = Number.isFinite(value) ? value : 0
    padded.push(finite > 0 ? finite : 0)
  }

  const lifted = padded.map((value) => (value <= epsilon ? epsilon : value))
  const liftedTotal = lifted.reduce((sum, value) => sum + value, 0)
  if (!Number.isFinite(liftedTotal) || liftedTotal <= 0) {
    const uniform = 1 / cappedSize
    return Array(cappedSize).fill(uniform)
  }

  const preliminary = lifted.map((value) => value / liftedTotal)
  const prelimTotal = preliminary.reduce((sum, value) => sum + value, 0)

  if (!Number.isFinite(prelimTotal) || prelimTotal <= 0) {
    const uniform = 1 / cappedSize
    return Array(cappedSize).fill(uniform)
  }

  const correction = 1 - prelimTotal
  let maxIndex = 0
  for (let i = 1; i < preliminary.length; i++) {
    if (preliminary[i] > preliminary[maxIndex]) {
      maxIndex = i
    }
  }
  preliminary[maxIndex] += correction

  const nonNegative = preliminary.map((value) => (value <= epsilon ? epsilon : value))
  const finalTotal = nonNegative.reduce((sum, value) => sum + value, 0)
  if (!Number.isFinite(finalTotal) || finalTotal <= 0) {
    const uniform = 1 / cappedSize
    return Array(cappedSize).fill(uniform)
  }

  return nonNegative.map((value) => value / finalTotal)
}

export function rangesToCoefficients(
  ranges: [number, number][],
  domain: Domain,
  maxCoefficients = MAX_COEFFICIENTS,
  pdf?: PdfPoint[],
): number[] {
  const domainRange = Math.max(domain.max - domain.min, 1)
  const cappedRanges = ranges.slice(0, maxCoefficients).map((range) => sanitizeRange(range, domain))

  if (cappedRanges.length === 0) {
    return normalizeAlpha([], maxCoefficients)
  }

  const masses = cappedRanges.map(([min, max]) => {
    const fallbackWidth = Math.max(max - min, domainRange * MIN_WIDTH_RATIO)
    if (pdf && pdf.length > 1) {
      const mass = calcRangeProb(pdf, [min, max])
      if (Number.isFinite(mass) && mass > 0) {
        return mass
      }
    }
    return fallbackWidth / domainRange
  })

  const totalMass = masses.reduce((sum, value) => sum + value, 0)
  if (!Number.isFinite(totalMass) || totalMass <= 0) {
    return normalizeAlpha([], cappedRanges.length)
  }

  const weights = masses.map((mass) => mass / totalMass)
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
