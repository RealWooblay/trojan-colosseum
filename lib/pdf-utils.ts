// Utility functions for PDF calculations

import type { PdfPoint } from "./types"

// Generate PDF points for different distributions
export function generateNormalPdf(
  mean: number,
  variance: number,
  domain: { min: number; max: number },
  points = 300,
): PdfPoint[] {
  const stdDev = Math.sqrt(variance)
  const result: PdfPoint[] = []
  const step = (domain.max - domain.min) / (points - 1)

  for (let i = 0; i < points; i++) {
    const x = domain.min + i * step
    const z = (x - mean) / stdDev
    const y = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z)
    result.push({ x, y })
  }

  return result
}

export function generateLognormalPdf(
  mu: number,
  sigma: number,
  domain: { min: number; max: number },
  points = 300,
): PdfPoint[] {
  const result: PdfPoint[] = []
  const step = (domain.max - domain.min) / (points - 1)

  for (let i = 0; i < points; i++) {
    const x = domain.min + i * step
    if (x <= 0) {
      result.push({ x, y: 0 })
      continue
    }
    const lnX = Math.log(x)
    const z = (lnX - mu) / sigma
    const y = (1 / (x * sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z)
    result.push({ x, y })
  }

  return result
}

export function generateBetaPdf(
  alpha: number,
  beta: number,
  domain: { min: number; max: number },
  points = 300,
): PdfPoint[] {
  const result: PdfPoint[] = []
  const step = (domain.max - domain.min) / (points - 1)

  // Beta function approximation
  const betaFunc = (a: number, b: number) => {
    return (gamma(a) * gamma(b)) / gamma(a + b)
  }

  const gamma = (z: number) => {
    // Stirling's approximation for gamma function
    if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z))
    z -= 1
    let x = 0.99999999999980993
    const coefficients = [
      676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
    ]
    for (let i = 0; i < 8; i++) {
      x += coefficients[i] / (z + i + 1)
    }
    const t = z + 7.5
    return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x
  }

  const B = betaFunc(alpha, beta)

  for (let i = 0; i < points; i++) {
    const x = domain.min + i * step
    // Normalize to [0,1]
    const t = (x - domain.min) / (domain.max - domain.min)
    if (t <= 0 || t >= 1) {
      result.push({ x, y: 0 })
      continue
    }
    const y = (Math.pow(t, alpha - 1) * Math.pow(1 - t, beta - 1)) / (B * (domain.max - domain.min))
    result.push({ x, y })
  }

  return result
}

export function generateUniformPdf(domain: { min: number; max: number }, points = 300): PdfPoint[] {
  const result: PdfPoint[] = []
  const step = (domain.max - domain.min) / (points - 1)
  const y = 1 / (domain.max - domain.min)

  for (let i = 0; i < points; i++) {
    const x = domain.min + i * step
    result.push({ x, y })
  }

  return result
}

// Calculate statistics from PDF
export function calculateMean(pdf: PdfPoint[]): number {
  let sum = 0
  for (let i = 0; i < pdf.length - 1; i++) {
    const dx = pdf[i + 1].x - pdf[i].x
    const avgY = (pdf[i].y + pdf[i + 1].y) / 2
    sum += pdf[i].x * avgY * dx
  }
  return sum
}

export function calculateVariance(pdf: PdfPoint[], mean: number): number {
  let sum = 0
  for (let i = 0; i < pdf.length - 1; i++) {
    const dx = pdf[i + 1].x - pdf[i].x
    const avgY = (pdf[i].y + pdf[i + 1].y) / 2
    sum += Math.pow(pdf[i].x - mean, 2) * avgY * dx
  }
  return sum
}

// Calculate probability mass in a range
export function calculateMassInRange(pdf: PdfPoint[], range: [number, number]): number {
  let mass = 0
  for (let i = 0; i < pdf.length - 1; i++) {
    const x1 = pdf[i].x
    const x2 = pdf[i + 1].x
    const y1 = pdf[i].y
    const y2 = pdf[i + 1].y

    // Check if segment overlaps with range
    if (x2 < range[0] || x1 > range[1]) continue

    const startX = Math.max(x1, range[0])
    const endX = Math.min(x2, range[1])
    const dx = endX - startX

    // Linear interpolation for y values
    const startY = y1 + ((y2 - y1) * (startX - x1)) / (x2 - x1)
    const endY = y1 + ((y2 - y1) * (endX - x1)) / (x2 - x1)
    const avgY = (startY + endY) / 2

    mass += avgY * dx
  }
  return mass
}

// Simulate reweighting PDF after a trade with smooth transitions
export function reweightPdf(pdf: PdfPoint[], range: [number, number], deltaMass: number): PdfPoint[] {
  const rangeWidth = range[1] - range[0]
  const rangeCenter = (range[0] + range[1]) / 2

  // Create a smooth transition function using sigmoid-like curve
  const smoothTransition = (x: number, center: number, width: number) => {
    const distance = Math.abs(x - center) / (width / 2)
    if (distance >= 1) return 0
    // Smooth falloff using cosine function for natural curve
    return 0.5 * (1 + Math.cos(Math.PI * distance))
  }

  return pdf.map((point) => {
    // Calculate smooth weight based on distance from range center
    const weight = smoothTransition(point.x, rangeCenter, rangeWidth)

    // Apply density change with smooth transition
    const densityChange = deltaMass * weight / rangeWidth
    const newY = Math.max(0, point.y + densityChange)

    return { x: point.x, y: newY }
  })
}

// Convert PDF to CDF
export function pdfToCdf(pdf: PdfPoint[]): PdfPoint[] {
  const cdf: PdfPoint[] = []
  let cumulative = 0

  for (let i = 0; i < pdf.length; i++) {
    if (i > 0) {
      const dx = pdf[i].x - pdf[i - 1].x
      const avgY = (pdf[i].y + pdf[i - 1].y) / 2
      cumulative += avgY * dx
    }
    cdf.push({ x: pdf[i].x, y: cumulative })
  }

  return cdf
}
