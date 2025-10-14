"use client"

import { useEffect, useState } from "react"
import { PdfChart } from "@/components/pdf-chart"
// Chart controls live inside PdfChart; keep this demo focused on feeding data

// Simple normal distribution function
function normalPdf(x: number, mean: number, stdDev: number): number {
  const variance = stdDev * stdDev
  const coefficient = 1 / Math.sqrt(2 * Math.PI * variance)
  const exponent = -Math.pow(x - mean, 2) / (2 * variance)
  return coefficient * Math.exp(exponent)
}

export function AnimatedPdfDemo() {
  const [mean, setMean] = useState(50)
  const [variance, setVariance] = useState(100)
  const [direction, setDirection] = useState(1)
  const [pdfData, setPdfData] = useState<Array<{ x: number, y: number }>>([])

  // Generate data points with useEffect
  useEffect(() => {
    const data = []
    const stdDev = Math.sqrt(variance)

    for (let x = 0; x <= 100; x += 0.5) {
      const y = normalPdf(x, mean, stdDev)
      data.push({ x, y })
    }
    setPdfData(data)
  }, [mean, variance])

  // Fallback data if pdfData is empty - create a proper curve
  const fallbackData = []
  for (let x = 0; x <= 100; x += 2) {
    const y = Math.exp(-Math.pow(x - 50, 2) / 200) * 0.02
    fallbackData.push({ x, y })
  }

  const displayData = pdfData.length > 0 ? pdfData : fallbackData

  useEffect(() => {
    const interval = setInterval(() => {
      setMean((prev) => {
        const next = prev + direction * 0.5
        if (next > 70 || next < 30) {
          setDirection((d) => -d)
        }
        return Math.max(30, Math.min(70, next))
      })

      setVariance((prev) => {
        const variation = Math.sin(Date.now() / 1000) * 20
        return Math.max(50, 100 + variation)
      })
    }, 50)

    return () => clearInterval(interval)
  }, [direction])

  return (
    <div className="w-full h-[400px] relative">
      <div className="absolute top-4 left-4 z-10 space-y-1">
        <div className="text-xs text-muted-foreground">Live Demo - UPDATED!</div>
        <div className="font-mono text-sm">
          μ = <span className="text-cyan-400">{mean.toFixed(1)}</span>
        </div>
        <div className="font-mono text-sm">
          σ² = <span className="text-violet-400">{variance.toFixed(1)}</span>
        </div>
      </div>

      {/* Chart mode buttons are rendered by PdfChart */}

      <div className="w-full h-full">
        <PdfChart
          data={displayData}
          mean={mean}
          median={mean * 0.98}
          selectedRange={[mean - 10, mean + 10]}
          domain={{ min: 0, max: 100 }}
          unit=""
          liquidityDepth={10000}
        />
      </div>

      <div className="absolute bottom-4 right-4 text-xs text-muted-foreground">
        Ghost handles moving • Curve reweighting in real-time
      </div>
    </div>
  )
}
