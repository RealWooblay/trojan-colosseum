"use client"

import React, { useState, useMemo } from "react"
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
  selectedRange?: [number, number]
  domain: { min: number; max: number }
  unit: string
  liquidityDepth: number
  onRangeChange?: (range: [number, number]) => void
}

export function PdfChart({
  data,
  ghostData,
  ghostType,
  mean,
  median,
  selectedRange,
  domain,
  unit,
  liquidityDepth,
  onRangeChange,
}: PdfChartProps) {
  const [localRange, setLocalRange] = useState<[number, number]>(selectedRange || [domain.min, domain.max])

  const mode = useMemo(() => findMode(data), [data])
  const calculatedMean = useMemo(() => {
    const sum = data.reduce((acc, point) => acc + point.x * point.y, 0)
    const totalY = data.reduce((acc, point) => acc + point.y, 0)
    return sum / totalY
  }, [data])

  const rangeProb = useMemo(() => {
    return calcRangeProb(data, selectedRange || localRange)
  }, [data, selectedRange, localRange])

  const handleBrushChange = (e: any) => {
    if (e.startIndex !== undefined && e.endIndex !== undefined) {
      const newRange: [number, number] = [data[e.startIndex].x, data[e.endIndex].x]
      setLocalRange(newRange)
      if (onRangeChange) {
        onRangeChange(newRange)
      }
    }
  }

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
          <div className="font-bold text-white text-lg">{fmtOutcome(calculatedMean, unit)}</div>
        </div>
        {localRange && (
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">Your Range</div>
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
          <span className="font-bold text-pink-400">{fmtOutcome(mode, unit)}</span>
        </div>
        {median && (
          <div className="text-white flex items-center">
            <span className="text-muted-foreground mr-1">median =</span>
            <span className="font-bold text-green-400">{fmtOutcome(median, unit)}</span>
          </div>
        )}
        <div className="text-white flex items-center">
          <span className="text-muted-foreground mr-1">μ =</span>
          <span className="font-bold text-blue-400">{fmtOutcome(calculatedMean, unit)}</span>
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
              tickFormatter={(value: number) => fmtAxis(value, unit)}
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
              domain={[0, 'dataMax']}
              scale="linear"
            />

            <Tooltip
              content={<CustomTooltip unit={unit} selectedRange={selectedRange} allData={data} />}
              cursor={{ stroke: "rgba(0,224,255,0.5)", strokeWidth: 2 }}
            />

            {(selectedRange || localRange) && (
              <ReferenceArea
                x1={(selectedRange || localRange)[0]}
                x2={(selectedRange || localRange)[1]}
                fill="url(#neonStroke)"
                fillOpacity={0.3}
                stroke="#00E0FF"
                strokeWidth={3}
                strokeDasharray="6 3"
                style={{
                  filter: 'drop-shadow(0 0 6px rgba(0, 224, 255, 0.4))'
                }}
              />
            )}


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

        {/* Clean Brush Component */}
        <div className="mt-6 px-6 py-4">
          <div className="text-center text-sm text-white/80 mb-3 font-medium">Select your betting range</div>
          <ResponsiveContainer width="100%" height={60}>
            <AreaChart data={data} margin={{ top: 8, right: 40, left: 40, bottom: 8 }}>
              <Brush
                dataKey="x"
                height={35}
                stroke="rgba(0,224,255,1)"
                fill="rgba(0,224,255,0.3)"
                tickFormatter={(value: number) => fmtAxis(value, unit)}
                onChange={handleBrushChange}
                startIndex={0}
                endIndex={data.length - 1}
              />
            </AreaChart>
          </ResponsiveContainer>
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
