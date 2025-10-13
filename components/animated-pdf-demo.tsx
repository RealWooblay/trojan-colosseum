"use client"

import { useEffect, useState } from "react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from "recharts"
import { generateNormalPdf } from "@/lib/pdf-utils"
import type { PdfPoint } from "@/lib/types"

export function AnimatedPdfDemo() {
  const [pdfData, setPdfData] = useState<PdfPoint[]>([])
  const [mean, setMean] = useState(50)
  const [variance, setVariance] = useState(100)
  const [direction, setDirection] = useState(1)

  useEffect(() => {
    const interval = setInterval(() => {
      // Animate mean back and forth
      setMean((prev) => {
        const next = prev + direction * 0.5
        if (next > 70 || next < 30) {
          setDirection((d) => -d)
        }
        return next
      })

      // Slightly vary variance
      setVariance((prev) => {
        const variation = Math.sin(Date.now() / 1000) * 20
        return 100 + variation
      })
    }, 50)

    return () => clearInterval(interval)
  }, [direction])

  useEffect(() => {
    const pdf = generateNormalPdf(mean, variance, { min: 0, max: 100 }, 200)
    setPdfData(pdf)
  }, [mean, variance])

  return (
    <div className="w-full h-[400px] relative">
      <div className="absolute top-4 left-4 z-10 space-y-1">
        <div className="text-xs text-muted-foreground">Live Demo</div>
        <div className="font-mono text-sm">
          μ = <span className="text-primary">{mean.toFixed(1)}</span>
        </div>
        <div className="font-mono text-sm">
          σ² = <span className="text-secondary">{variance.toFixed(1)}</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={pdfData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
          <defs>
            <linearGradient id="pdfGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis
            dataKey="x"
            stroke="hsl(var(--muted-foreground))"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            label={{ value: "Outcome Value", position: "insideBottom", offset: -10, fill: "hsl(var(--foreground))" }}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            label={{ value: "Density", angle: -90, position: "insideLeft", fill: "hsl(var(--foreground))" }}
          />
          <ReferenceLine x={mean} stroke="hsl(var(--primary))" strokeDasharray="3 3" label="μ" />
          <Area
            type="monotone"
            dataKey="y"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#pdfGradient)"
            animationDuration={300}
            isAnimationActive={true}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="absolute bottom-4 right-4 text-xs text-muted-foreground">
        Ghost handles moving • Curve reweighting in real-time
      </div>
    </div>
  )
}
