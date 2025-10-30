"use client"

import { formatValue, calculateCumulativeProbability, assessLiquidityDepth } from "@/lib/chart-utils"
import type { PdfPoint } from "@/lib/types"

interface CustomTooltipProps {
  active?: boolean
  payload?: any[]
  label?: number
  unit: string
  selectedRange?: [number, number]
  selectedRanges?: [number, number][]
  allData: PdfPoint[]
  valueFormatter?: (value: number) => string
}

export function CustomTooltip({
  active,
  payload,
  label,
  unit,
  selectedRange,
  selectedRanges,
  allData,
  valueFormatter,
}: CustomTooltipProps) {
  if (!active || !payload || !payload.length || label === undefined) {
    return null
  }

  const density = payload[0].value
  const ranges =
    (selectedRanges && selectedRanges.length > 0 ? selectedRanges : selectedRange ? [selectedRange] : []) ?? []
  const matchingRange = ranges.find((range) => label >= range[0] && label <= range[1])
  const matchingRangeProb = matchingRange ? calculateCumulativeProbability(allData, matchingRange) : 0
  const matchingRangeIndex = matchingRange ? ranges.findIndex((range) => range === matchingRange) : -1
  const liquidityDepth = assessLiquidityDepth(allData, label)
  const rangeLabel =
    matchingRange && matchingRangeIndex >= 0 && ranges.length > 1 ? `Range ${matchingRangeIndex + 1} Prob:` : "Range Prob:"
  const formattedLabel = valueFormatter ? valueFormatter(label) : formatValue(label, unit)

  return (
    <div
      className="glass-card p-4 space-y-2 text-sm border border-white/20 shadow-xl"
      style={{ backdropFilter: "blur(12px)" }}
    >
      <div className="font-semibold text-base">{formattedLabel}</div>

      <div className="space-y-1">
        <div className="flex justify-between gap-6">
          <span className="text-muted-foreground">Density:</span>
          <span className="font-mono font-semibold">{density.toFixed(3)}</span>
        </div>

        {matchingRange && (
          <div className="flex justify-between gap-6">
            <span className="text-muted-foreground">{rangeLabel}</span>
            <span className="font-mono font-semibold text-primary">{(matchingRangeProb * 100).toFixed(1)}%</span>
          </div>
        )}

        <div className="flex justify-between gap-6">
          <span className="text-muted-foreground">Liquidity:</span>
          <span
            className={`font-semibold text-xs uppercase ${liquidityDepth === "thin"
                ? "text-destructive"
                : liquidityDepth === "thick"
                  ? "text-primary"
                  : "text-yellow-500"
              }`}
          >
            {liquidityDepth}
          </span>
        </div>

        {liquidityDepth === "thin" && (
          <div className="text-xs text-destructive/80 pt-1 border-t border-white/10">⚠ Higher price impact</div>
        )}
      </div>
    </div>
  )
}
