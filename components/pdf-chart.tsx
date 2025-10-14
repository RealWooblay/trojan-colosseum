"use client"

import { useState, useMemo, useCallback } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Tooltip,
  Brush,
} from "recharts"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CustomTooltip } from "./custom-tooltip"
import { ChartInfoPopover } from "./chart-info-popover"
import { fmtNum, fmtOutcome, fmtAxis, fmtPct, calcRangeProb, getLiquidityLabel } from "@/lib/formatters"
import { findMode } from "@/lib/chart-utils"
import type { PdfPoint } from "@/lib/types"
import { BarChart3, TrendingUp, Activity } from "lucide-react"

interface PdfChartProps {
  data: PdfPoint[]
  ghostData?: PdfPoint[]
  mean?: number
  median?: number
  selectedRange?: [number, number]
  domain: { min: number; max: number }
  unit: string
  liquidityDepth: number
  onRangeChange?: (range: [number, number]) => void
}

type ChartMode = "pdf" | "cdf" | "histogram"

export function PdfChart({
  data,
  ghostData,
  mean,
  median,
  selectedRange,
  domain,
  unit,
  liquidityDepth,
  onRangeChange,
}: PdfChartProps) {
  const [chartMode, setChartMode] = useState<ChartMode>("pdf")
  const [brushDomain, setBrushDomain] = useState<[number, number]>([domain.min, domain.max])

  const mode = useMemo(() => findMode(data), [data])

  const rangeProb = useMemo(() => {
    if (!selectedRange) return 0
    return calcRangeProb(data, selectedRange)
  }, [data, selectedRange])

  const cdfData = useMemo(() => {
    // Integrate using trapezoids with actual x-spacing so the CDF shape/scale is correct
    let cumulative = 0
    return data.map((point, index) => {
      if (index === 0) return { x: point.x, y: 0 }
      const dx = data[index].x - data[index - 1].x
      const avgY = (data[index].y + data[index - 1].y) / 2
      cumulative += avgY * dx
      return { x: point.x, y: cumulative }
    })
  }, [data])

  const histogramData = useMemo(() => {
    const bins = 20
    const binWidth = (domain.max - domain.min) / bins
    return Array.from({ length: bins }, (_, i) => {
      const x = domain.min + i * binWidth + binWidth / 2
      const pdfPoint = data.find((p) => Math.abs(p.x - x) < binWidth)
      return {
        x,
        y: pdfPoint ? pdfPoint.y * (0.5 + Math.random() * 0.5) : 0,
        pdf: pdfPoint?.y || 0,
      }
    })
  }, [data, domain])

  const currentData = chartMode === "cdf" ? cdfData : chartMode === "histogram" ? histogramData : data

  const handleBrushChange = useCallback(
    (e: any) => {
      if (e.startIndex !== undefined && e.endIndex !== undefined) {
        const newRange: [number, number] = [data[e.startIndex].x, data[e.endIndex].x]
        setBrushDomain(newRange)
        if (onRangeChange) {
          onRangeChange(newRange)
        }
      }
    },
    [data, onRangeChange],
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={chartMode === "pdf" ? "default" : "ghost"}
            size="sm"
            onClick={() => setChartMode("pdf")}
            className={chartMode === "pdf" ? "neon-border" : ""}
          >
            <Activity className="w-4 h-4 mr-1" />
            PDF
          </Button>
          <Button
            variant={chartMode === "cdf" ? "default" : "ghost"}
            size="sm"
            onClick={() => setChartMode("cdf")}
            className={chartMode === "cdf" ? "neon-border" : ""}
          >
            <TrendingUp className="w-4 h-4 mr-1" />
            CDF
          </Button>
          <Button
            variant={chartMode === "histogram" ? "default" : "ghost"}
            size="sm"
            onClick={() => setChartMode("histogram")}
            className={chartMode === "histogram" ? "neon-border" : ""}
          >
            <BarChart3 className="w-4 h-4 mr-1" />
            Histogram
          </Button>
        </div>
        <ChartInfoPopover />
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {mean !== undefined && (
          <Badge variant="outline" className="font-mono bg-cyan-500/10 border-cyan-500/30 text-cyan-400">
            μ = {fmtOutcome(mean, unit)}
          </Badge>
        )}
        {median !== undefined && (
          <Badge variant="outline" className="font-mono bg-violet-500/10 border-violet-500/30 text-violet-400">
            median = {fmtOutcome(median, unit)}
          </Badge>
        )}
        {mode !== undefined && (
          <Badge variant="outline" className="font-mono bg-pink-500/10 border-pink-500/30 text-pink-400">
            mode = {fmtOutcome(mode, unit)}
          </Badge>
        )}
        {selectedRange && (
          <Badge variant="outline" className="font-mono bg-primary/10 border-primary/30 text-primary">
            Range Prob = {fmtPct(rangeProb * 100)}
          </Badge>
        )}
        <Badge
          variant="outline"
          className={`font-mono ${liquidityDepth < 1000
            ? "bg-red-500/10 border-red-500/30 text-red-400"
            : liquidityDepth < 10000
              ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
              : "bg-green-500/10 border-green-500/30 text-green-400"
            }`}
        >
          Liquidity: {getLiquidityLabel(liquidityDepth)}
        </Badge>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={chartMode}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.3 }}
          className="relative"
        >
          {selectedRange && (
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
              <Badge className="bg-primary/90 text-primary-foreground font-mono text-xs">
                Selected Range [{fmtOutcome(selectedRange[0], unit)}, {fmtOutcome(selectedRange[1], unit)}]
              </Badge>
            </div>
          )}

          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={currentData} margin={{ top: 30, right: 30, left: 10, bottom: 50 }}>
              <defs>
                <linearGradient id="neonStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#00E0FF" />
                  <stop offset="100%" stopColor="#A46CFF" />
                </linearGradient>
                <linearGradient id="neonFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00E0FF" stopOpacity={0.55} />
                  <stop offset="50%" stopColor="#A46CFF" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#A46CFF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ghostFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#A46CFF" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#A46CFF" stopOpacity={0} />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" />

              <XAxis
                dataKey="x"
                type="number"
                allowDataOverflow
                stroke="rgba(255,255,255,0.95)"
                tick={{ fill: "rgba(255,255,255,0.95)", fontSize: 11 }}
                tickFormatter={(value) => fmtAxis(value, unit)}
                label={{
                  value: unit ? `Outcome Value (${unit})` : "Outcome Value",
                  position: "insideBottom",
                  offset: -10,
                  fill: "rgba(255,255,255,0.95)",
                  fontSize: 12,
                }}
                domain={[brushDomain[0], brushDomain[1]]}
              />
              <YAxis
                stroke="rgba(255,255,255,0.95)"
                tick={{ fill: "rgba(255,255,255,0.95)", fontSize: 11 }}
                tickFormatter={(value) => fmtNum(value)}
                label={{
                  value: chartMode === "cdf" ? "Cumulative Probability" : "Density",
                  angle: -90,
                  position: "insideLeft",
                  fill: "rgba(255,255,255,0.95)",
                  fontSize: 12,
                }}
              />

              <Tooltip
                content={<CustomTooltip unit={unit} selectedRange={selectedRange} allData={data} />}
                cursor={{ stroke: "rgba(0,224,255,0.5)", strokeWidth: 2 }}
              />

              {selectedRange && chartMode === "pdf" && (
                <ReferenceArea
                  x1={selectedRange[0]}
                  x2={selectedRange[1]}
                  fill="url(#neonStroke)"
                  fillOpacity={0.25}
                  stroke="#00E0FF"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              )}

              {mean !== undefined && chartMode === "pdf" && (
                <ReferenceLine
                  x={mean}
                  stroke="#00E0FF"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  filter="url(#glow)"
                  label={{
                    value: `μ = ${fmtOutcome(mean, unit)}`,
                    fill: "#00E0FF",
                    fontSize: 11,
                    fontWeight: "bold",
                    position: "top",
                  }}
                />
              )}

              {median !== undefined && median !== mean && chartMode === "pdf" && (
                <ReferenceLine
                  x={median}
                  stroke="#A46CFF"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  filter="url(#glow)"
                  label={{
                    value: `med = ${fmtOutcome(median, unit)}`,
                    fill: "#A46CFF",
                    fontSize: 11,
                    fontWeight: "bold",
                    position: "top",
                  }}
                />
              )}

              {mode !== undefined && chartMode === "pdf" && (
                <ReferenceLine
                  x={mode}
                  stroke="#FF6EC7"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  filter="url(#glow)"
                  label={{
                    value: `mode = ${fmtOutcome(mode, unit)}`,
                    fill: "#FF6EC7",
                    fontSize: 11,
                    fontWeight: "bold",
                    position: "top",
                  }}
                />
              )}

              {ghostData && chartMode === "pdf" && (
                <>
                  <Area
                    type="monotone"
                    data={ghostData}
                    dataKey="y"
                    stroke="#A46CFF"
                    strokeWidth={3}
                    strokeDasharray="8 4"
                    fill="url(#ghostFill)"
                    filter="url(#glow)"
                    animationDuration={600}
                    animationEasing="ease-in-out"
                  />
                </>
              )}

              <Area
                type="monotone"
                dataKey={chartMode === "histogram" ? "pdf" : "y"}
                stroke="url(#neonStroke)"
                strokeWidth={3}
                fill="url(#neonFill)"
                filter="url(#glow)"
                animationDuration={500}
              />

              {chartMode === "histogram" && (
                <Area
                  type="stepAfter"
                  dataKey="y"
                  stroke="#00E0FF"
                  strokeWidth={1}
                  fill="#00E0FF"
                  fillOpacity={0.2}
                  animationDuration={500}
                />
              )}

              <Brush
                dataKey="x"
                height={30}
                stroke="rgba(255,255,255,0.4)"
                fill="rgba(255,255,255,0.08)"
                onChange={handleBrushChange}
              />
            </AreaChart>
          </ResponsiveContainer>

          {ghostData && chartMode === "pdf" && (
            <div className="absolute top-14 right-8">
              <Badge variant="outline" className="bg-violet-500/10 border-violet-500/30 text-violet-400 text-xs">
                After trade
              </Badge>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
