"use client"

import { formatValue, calculateCumulativeProbability, assessLiquidityDepth } from "@/lib/chart-utils"
import type { PdfPoint } from "@/lib/types"

interface CustomTooltipProps {
  active?: boolean
  payload?: any[]
  label?: number
  unit: string
  selectedRange?: [number, number]
  allData: PdfPoint[]
}

export function CustomTooltip({ active, payload, label, unit, selectedRange, allData }: CustomTooltipProps) {
  if (!active || !payload || !payload.length || label === undefined) {
    return null
  }

  const density = payload[0].value
  const cumulativeProb = selectedRange ? calculateCumulativeProbability(allData, selectedRange) : 0
  const liquidityDepth = assessLiquidityDepth(allData, label)

  return (
    <div
      className="glass-card p-4 space-y-2 text-sm border border-white/20 shadow-xl"
      style={{ backdropFilter: "blur(12px)" }}
    >
      <div className="font-semibold text-base">{formatValue(label, unit)}</div>

      <div className="space-y-1">
        <div className="flex justify-between gap-6">
          <span className="text-muted-foreground">Density:</span>
          <span className="font-mono font-semibold">{density.toFixed(3)}</span>
        </div>

        {selectedRange && label >= selectedRange[0] && label <= selectedRange[1] && (
          <div className="flex justify-between gap-6">
            <span className="text-muted-foreground">Range Prob:</span>
            <span className="font-mono font-semibold text-primary">{(cumulativeProb * 100).toFixed(1)}%</span>
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
