"use client"

import React, { useCallback, useMemo } from "react"
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
import { Badge } from "@/components/ui/badge"
import { CustomTooltip } from "./custom-tooltip"
import { fmtNum, fmtOutcome, fmtAxis, fmtPct, calcRangeProb, getLiquidityLabel } from "@/lib/formatters"
import { findMode } from "@/lib/chart-utils"
import type { PdfPoint } from "@/lib/types"

interface PdfChartProps {
  data: PdfPoint[]
  ghostData?: PdfPoint[]
  ghostType?: "trade-preview" | "range-prediction"
  mean?: number
  median?: number
  selectedRange?: [number, number] // For backward compatibility
  selectedRanges?: [number, number][] // New multi-range support
  domain: { min: number; max: number }
  unit: string
  liquidityDepth: number
  onRangeChange?: (range: [number, number]) => void
  onUpdateRange?: (index: number, range: [number, number]) => void // New callback for individual range updates
  valueDomain?: { min: number; max: number }
}

export function PdfChart({
  data,
  ghostData,
  ghostType,
  mean,
  median,
  selectedRange,
  selectedRanges,
  domain,
  unit,
  liquidityDepth,
  onRangeChange,
  onUpdateRange,
  valueDomain,
}: PdfChartProps) {
  // Use selectedRanges if available, otherwise fall back to selectedRange for backward compatibility
  const ranges = selectedRanges || (selectedRange ? [selectedRange] : [])

  const mode = useMemo(() => findMode(data), [data])
  const calculatedMeanIndex = useMemo(() => {
    const sum = data.reduce((acc, point) => acc + point.x * point.y, 0)
    const totalY = data.reduce((acc, point) => acc + point.y, 0)
    return sum / totalY
  }, [data])

  const rangeProb = useMemo(() => {
    if (!ranges.length) return 0
    const total = ranges.reduce((sum, range) => sum + calcRangeProb(data, range), 0)
    return Math.min(1, total)
  }, [data, ranges])

  const maxDensity = useMemo(() => {
    const baseMax = data.reduce((max, point) => Math.max(max, point.y), 0)
    const ghostMax = ghostData?.reduce((max, point) => Math.max(max, point.y), 0) ?? 0
    return Math.max(baseMax, ghostMax)
  }, [data, ghostData])

  const domainSpan = useMemo(() => domain.max - domain.min, [domain.max, domain.min])
  const valueDomainSpan = useMemo(() => {
    if (!valueDomain) return domainSpan
    return valueDomain.max - valueDomain.min
  }, [domainSpan, valueDomain])

  const indexToValue = useCallback(
    (input: number) => {
      if (!valueDomain) return input
      if (!Number.isFinite(input)) return valueDomain.min
      const span = domainSpan
      const targetSpan = valueDomainSpan
      if (span <= 0 || targetSpan <= 0) return valueDomain.min

      const clamped = Math.min(domain.max, Math.max(domain.min, input))
      const ratio = (clamped - domain.min) / span
      return valueDomain.min + ratio * targetSpan
    },
    [domain.min, domain.max, domainSpan, valueDomain, valueDomainSpan],
  )

  const displayMode = useMemo(() => indexToValue(mode), [indexToValue, mode])
  const displayMedian = useMemo(() => (median !== undefined ? indexToValue(median) : undefined), [indexToValue, median])

  const resolvedMeanIndex = mean ?? calculatedMeanIndex
  const displayMean = useMemo(() => indexToValue(resolvedMeanIndex), [indexToValue, resolvedMeanIndex])

  const tooltipValueFormatter = useCallback(
    (value: number) => fmtOutcome(indexToValue(value), unit),
    [indexToValue, unit],
  )

  return (
    <div className="space-y-4">
      {/* Simplified header - just show what this is */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-primary">Probability Distribution</h3>
        <p className="text-sm text-muted-foreground">Select your betting range using the controls above</p>
      </div>

      {/* Stats display matching the image layout - MORE PROMINENT */}
      <div className="flex justify-center gap-12 text-base mb-6 bg-black/20 p-4 rounded-lg border border-white/10">
        <div className="text-center">
          <div className="text-sm text-muted-foreground mb-1">Market Price</div>
          <div className="font-bold text-white text-lg">{fmtOutcome(displayMean, unit)}</div>
        </div>
        {ranges.length > 0 && (
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">
              {ranges.length > 1 ? "Your Ranges" : "Your Range"}
            </div>
            <div className="font-bold text-green-400 text-lg">{fmtPct(rangeProb * 100)}</div>
          </div>
        )}
        <div className="text-center">
          <div className="text-sm text-muted-foreground mb-1">Liquidity</div>
          <div className={`font-bold text-lg ${liquidityDepth < 1000 ? 'text-red-400' : liquidityDepth < 10000 ? 'text-yellow-400' : 'text-green-400'}`}>
            {getLiquidityLabel(liquidityDepth)}
          </div>
        </div>
      </div>

      {/* Additional stats row showing mode, median, and mean - PROPERLY POSITIONED */}
      <div className="flex justify-center gap-8 text-sm mb-6 bg-black/10 p-3 rounded-lg border border-white/5">
        <div className="text-white flex items-center">
          <span className="text-muted-foreground mr-1">mode =</span>
          <span className="font-bold text-pink-400">{fmtOutcome(displayMode, unit)}</span>
        </div>
        {median !== undefined && (
          <div className="text-white flex items-center">
            <span className="text-muted-foreground mr-1">median =</span>
            <span className="font-bold text-green-400">{fmtOutcome(displayMedian ?? median, unit)}</span>
          </div>
        )}
        <div className="text-white flex items-center">
          <span className="text-muted-foreground mr-1">μ =</span>
          <span className="font-bold text-blue-400">{fmtOutcome(displayMean, unit)}</span>
        </div>
      </div>

      {/* Chart container */}
      <div className="relative">

        <ResponsiveContainer width="100%" height={500}>
          <AreaChart data={data} margin={{ top: 60, right: 30, left: 10, bottom: 50 }}>
            <defs>
              <linearGradient id="neonStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#00E0FF" />
                <stop offset="100%" stopColor="#A46CFF" />
              </linearGradient>
              <linearGradient id="neonStroke2" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#FF6B35" />
                <stop offset="100%" stopColor="#FF8E53" />
              </linearGradient>
              <linearGradient id="neonStroke3" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#4ECDC4" />
                <stop offset="100%" stopColor="#44A08D" />
              </linearGradient>
              <linearGradient id="neonStroke4" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#45B7D1" />
                <stop offset="100%" stopColor="#96C93D" />
              </linearGradient>
              <linearGradient id="neonStroke5" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#96CEB4" />
                <stop offset="100%" stopColor="#FECA57" />
              </linearGradient>
              <linearGradient id="neonFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00E0FF" stopOpacity={0.55} />
                <stop offset="50%" stopColor="#A46CFF" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#A46CFF" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="ghostFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#A46CFF" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#A46CFF" stopOpacity={0.1} />
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
              tickFormatter={(value: number) => fmtAxis(indexToValue(value), unit)}
              label={{
                value: unit ? `Outcome Value (${unit})` : "Outcome Value",
                position: "insideBottom",
                offset: -10,
                fill: "rgba(255,255,255,0.95)",
                fontSize: 12,
              }}
              domain={[domain.min, domain.max]}
            />
            <YAxis
              stroke="rgba(255,255,255,0.95)"
              tick={{ fill: "rgba(255,255,255,0.95)", fontSize: 11 }}
              tickFormatter={(value: number) => fmtNum(value)}
              label={{
                value: "Density",
                angle: -90,
                position: "insideLeft",
                fill: "rgba(255,255,255,0.95)",
                fontSize: 12,
              }}
              domain={maxDensity > 0 ? [0, maxDensity * 1.15] : [0, 'dataMax']}
              scale="linear"
            />

            <Tooltip
              content={
                <CustomTooltip
                  unit={unit}
                  selectedRange={selectedRange}
                  selectedRanges={ranges}
                  allData={data}
                  valueFormatter={tooltipValueFormatter}
                />
              }
              cursor={{ stroke: "rgba(0,224,255,0.5)", strokeWidth: 2 }}
            />

            {/* Render multiple ranges with different colors */}
            {ranges.map((range, index) => {
              const colors = [
                { fill: "url(#neonStroke)", stroke: "#00E0FF" },
                { fill: "url(#neonStroke2)", stroke: "#FF6B35" },
                { fill: "url(#neonStroke3)", stroke: "#4ECDC4" },
                { fill: "url(#neonStroke4)", stroke: "#45B7D1" },
                { fill: "url(#neonStroke5)", stroke: "#96CEB4" },
              ]
              const colorSet = colors[index % colors.length]

              return (
                <ReferenceArea
                  key={index}
                  x1={range[0]}
                  x2={range[1]}
                  fill={colorSet.fill}
                  fillOpacity={0.2 + (index * 0.1)}
                  stroke={colorSet.stroke}
                  strokeWidth={3}
                  strokeDasharray="6 3"
                  style={{
                    filter: `drop-shadow(0 0 6px ${colorSet.stroke}40)`
                  }}
                />
              )
            })}


            {ghostData && (
              <>
                <Area
                  type="monotone"
                  data={ghostData}
                  dataKey="y"
                  stroke="#A46CFF"
                  strokeWidth={6}
                  strokeDasharray="8 4"
                  fill="url(#ghostFill)"
                  filter="url(#glow)"
                  animationDuration={800}
                  animationEasing="ease-in-out"
                  connectNulls={false}
                  style={{
                    filter: 'drop-shadow(0 0 12px rgba(164, 108, 255, 0.8))'
                  }}
                />
              </>
            )}

            <Area
              type="monotone"
              dataKey="y"
              stroke="url(#neonStroke)"
              strokeWidth={3}
              fill="url(#neonFill)"
              filter="url(#glow)"
              animationDuration={500}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Multiple Brush Components for each range */}
        <div className="mt-6 px-6 py-4 space-y-4">
          <div className="text-center text-sm text-white/80 mb-3 font-medium">
            Drag to adjust ranges {ranges.length > 1 && `(${ranges.length} ranges)`}
          </div>
          {ranges.map((range, index) => {
            const colors = [
              { stroke: "#00E0FF", fill: "rgba(0,224,255,0.3)" },
              { stroke: "#FF6B35", fill: "rgba(255,107,53,0.3)" },
              { stroke: "#4ECDC4", fill: "rgba(78,205,196,0.3)" },
              { stroke: "#45B7D1", fill: "rgba(69,183,209,0.3)" },
              { stroke: "#96CEB4", fill: "rgba(150,206,180,0.3)" },
            ]
            const colorSet = colors[index % colors.length]

            // Find the start and end indices for this range
            const startIndex = data.findIndex(point => point.x >= range[0])
            const endIndex = data.findLastIndex(point => point.x <= range[1])

            return (
                <div key={index} className="space-y-2">
                  <div className="text-xs text-center text-white/60 font-mono">
                    Range {index + 1}: {fmtAxis(indexToValue(range[0]), unit)} - {fmtAxis(indexToValue(range[1]), unit)}
                  </div>
                  <ResponsiveContainer width="100%" height={50}>
                    <AreaChart data={data} margin={{ top: 4, right: 40, left: 40, bottom: 4 }}>
                      <Brush
                        dataKey="x"
                        height={30}
                        stroke={colorSet.stroke}
                        fill={colorSet.fill}
                        tickFormatter={(value: number) => fmtAxis(indexToValue(value), unit)}
                      onChange={(e: any) => {
                        if (e.startIndex !== undefined && e.endIndex !== undefined) {
                          const newRange: [number, number] = [data[e.startIndex].x, data[e.endIndex].x]
                          if (onUpdateRange) {
                            onUpdateRange(index, newRange)
                          } else if (onRangeChange) {
                            onRangeChange(newRange)
                          }
                        }
                      }}
                      startIndex={Math.max(0, startIndex)}
                      endIndex={Math.min(data.length - 1, endIndex)}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )
          })}
        </div>


        {ghostData && (
          <div className="absolute top-14 right-8">
            <Badge variant="outline" className="bg-violet-500/10 border-violet-500/30 text-violet-400 text-xs">
              {ghostType === "trade-preview" ? "After trade" : "Range prediction"}
            </Badge>
          </div>
        )}
      </div>
    </div>
  )
}
