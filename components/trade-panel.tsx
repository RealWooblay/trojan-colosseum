"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fmtPct, fmtUSD, fmtNum } from "@/lib/formatters"
import { TrendingUp, TrendingDown, Plus, Minus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Market } from "@/lib/types"

interface TradePanelProps {
  market: Market
  selectedRange?: [number, number] // For backward compatibility
  selectedRanges?: [number, number][] // New multi-range support
  onRangeChange: (range: [number, number]) => void
  onTradePreview: (side: "buy" | "sell", notional: number) => void
  onAddRange?: () => void
  onRemoveRange?: (index: number) => void
  onUpdateRange?: (index: number, range: [number, number]) => void
  tradePreview?: {
    deltaMass: number
    costUSD: number
    feeUSD: number
    impliedShift: { deltaMean: number; deltaVariance: number }
    rangeProbAfter: number
  }
}

export function TradePanel({
  market,
  selectedRange,
  selectedRanges,
  onRangeChange,
  onTradePreview,
  onAddRange,
  onRemoveRange,
  onUpdateRange,
  tradePreview
}: TradePanelProps) {
  // Use selectedRanges if available, otherwise fall back to selectedRange for backward compatibility
  const ranges = selectedRanges || (selectedRange ? [selectedRange] : [])
  const currentRange = ranges[0] || [market.domain.min, market.domain.max]

  const [notional, setNotional] = useState("500")
  const [slippage, setSlippage] = useState("50")
  const [side, setSide] = useState<"buy" | "sell">("buy")
  const [minInput, setMinInput] = useState(currentRange[0].toString())
  const [maxInput, setMaxInput] = useState(currentRange[1].toString())
  const [errors, setErrors] = useState<{ min?: string; max?: string; notional?: string }>({})
  const { toast } = useToast()

  useEffect(() => {
    if (selectedRange) {
      setMinInput(selectedRange[0].toFixed(2))
      setMaxInput(selectedRange[1].toFixed(2))
    }
  }, [selectedRange])

  useEffect(() => {
    const num = Number.parseFloat(notional)
    if (!isNaN(num) && num >= 10) {
      const timeoutId = setTimeout(() => {
        onTradePreview(side, num)
      }, 150)
      return () => clearTimeout(timeoutId)
    }
  }, [notional, side, selectedRange, onTradePreview])

  const handleMinChange = (value: string) => {
    setMinInput(value)
    const num = Number.parseFloat(value)
    if (!isNaN(num) && num >= market.domain.min && num < currentRange[1]) {
      setErrors((prev) => ({ ...prev, min: undefined }))
      onRangeChange([num, currentRange[1]])
    } else if (!isNaN(num)) {
      setErrors((prev) => ({ ...prev, min: "Min must be less than max" }))
    }
  }

  const handleMaxChange = (value: string) => {
    setMaxInput(value)
    const num = Number.parseFloat(value)
    if (!isNaN(num) && num <= market.domain.max && num > currentRange[0]) {
      setErrors((prev) => ({ ...prev, max: undefined }))
      onRangeChange([currentRange[0], num])
    } else if (!isNaN(num)) {
      setErrors((prev) => ({ ...prev, max: "Max must be greater than min" }))
    }
  }

  const handleNotionalChange = (value: string) => {
    setNotional(value)
    const num = Number.parseFloat(value)
    if (isNaN(num) || num < 10) {
      setErrors((prev) => ({ ...prev, notional: "Minimum $10" }))
    } else {
      setErrors((prev) => ({ ...prev, notional: undefined }))
    }
  }

  const adjustNotional = (delta: number) => {
    const current = Number.parseFloat(notional) || 0
    const newValue = Math.max(10, current + delta)
    setNotional(newValue.toString())
  }

  const handleSlippageChange = (value: string) => {
    const num = Number.parseFloat(value)
    if (!isNaN(num)) {
      setSlippage(Math.max(1, Math.min(500, num)).toString())
    } else {
      setSlippage(value)
    }
  }

  const handleConfirm = async () => {
    const num = Number.parseFloat(notional)

    if (isNaN(num) || num < 10) {
      toast({
        title: "Invalid amount",
        description: "Minimum notional is $10",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketId: market.id,
          side,
          range: selectedRange,
          notionalUSD: num,
        }),
      })

      if (!response.ok) throw new Error("Trade failed")

      const data = await response.json()

      toast({
        title: "Trade executed",
        description: `${side === "buy" ? "Bought" : "Sold"} ${fmtPct(data.deltaMass * 100)} probability mass`,
      })

      setNotional("500")
    } catch (error) {
      toast({
        title: "Trade failed",
        description: "Please try again",
        variant: "destructive",
      })
    }
  }

  const isValidNotional = !errors.notional && !isNaN(Number.parseFloat(notional)) && Number.parseFloat(notional) >= 10
  const isValidRange = !errors.min && !errors.max

  return (
    <div className="glass-card p-6 space-y-6 sticky top-20">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Trade Probability in Selected Band</h2>
        <p className="text-xs text-muted-foreground">
          You are {side === "buy" ? "buying" : "selling"} probability mass;{" "}
          {side === "buy" ? "increasing" : "decreasing"} it here {side === "buy" ? "decreases" : "increases"} it
          elsewhere (unified pool).
        </p>
      </div>

      <div className="space-y-2">
        <Label>Side</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={side === "buy" ? "default" : "outline"}
            onClick={() => setSide("buy")}
            className={side === "buy" ? "bg-primary" : ""}
          >
            Buy Mass
          </Button>
          <Button
            variant={side === "sell" ? "default" : "outline"}
            onClick={() => setSide("sell")}
            className={side === "sell" ? "bg-destructive" : ""}
          >
            Sell Mass
          </Button>
        </div>
      </div>

      {/* Multi-Range Management */}
      {selectedRanges && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">BETTING RANGES</Label>
            {onAddRange && (
              <Button
                onClick={onAddRange}
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0 border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/10"
              >
                <Plus className="w-4 h-4" />
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {ranges.map((range, index) => {
              const colors = [
                { bg: "bg-cyan-500/10", border: "border-cyan-400/50", text: "text-cyan-300", handle: "bg-cyan-400" },
                { bg: "bg-orange-500/10", border: "border-orange-400/50", text: "text-orange-300", handle: "bg-orange-400" },
                { bg: "bg-teal-500/10", border: "border-teal-400/50", text: "text-teal-300", handle: "bg-teal-400" },
                { bg: "bg-blue-500/10", border: "border-blue-400/50", text: "text-blue-300", handle: "bg-blue-400" },
                { bg: "bg-green-500/10", border: "border-green-400/50", text: "text-green-300", handle: "bg-green-400" },
              ]
              const colorSet = colors[index % colors.length]

              return (
                <div key={index} className={`${colorSet.bg} ${colorSet.border} border rounded-lg p-3 relative`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`${colorSet.text} text-xs font-mono font-semibold`}>
                      RANGE {index + 1}
                    </div>
                    <div className={`${colorSet.text} text-xs font-mono`}>
                      {range[1] - range[0] > 0 ? `${((range[1] - range[0]) / (market.domain.max - market.domain.min) * 100).toFixed(1)}%` : '0%'} width
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Min</label>
                        <Input
                          type="number"
                          value={range[0].toFixed(2)}
                          onChange={(e) => {
                            const value = Number.parseFloat(e.target.value)
                            if (!isNaN(value) && onUpdateRange) {
                              onUpdateRange(index, [value, range[1]])
                            }
                          }}
                          placeholder="Min"
                          step={1}
                          className={`font-mono bg-black/80 ${colorSet.border} text-white placeholder:text-cyan-300 focus:border-cyan-400 text-xs`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Max</label>
                        <Input
                          type="number"
                          value={range[1].toFixed(2)}
                          onChange={(e) => {
                            const value = Number.parseFloat(e.target.value)
                            if (!isNaN(value) && onUpdateRange) {
                              onUpdateRange(index, [range[0], value])
                            }
                          }}
                          placeholder="Max"
                          step={1}
                          className={`font-mono bg-black/80 ${colorSet.border} text-white placeholder:text-cyan-300 focus:border-cyan-400 text-xs`}
                        />
                      </div>
                    </div>

                    {onRemoveRange && ranges.length > 1 && (
                      <Button
                        onClick={() => onRemoveRange(index)}
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 border-red-400/50 text-red-400 hover:bg-red-400/10 self-end"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Visual range indicator */}
                  <div className="mt-2 h-2 bg-black/50 rounded-full relative overflow-hidden">
                    <div
                      className={`absolute top-0 h-full ${colorSet.handle} opacity-60`}
                      style={{
                        left: `${((range[0] - market.domain.min) / (market.domain.max - market.domain.min)) * 100}%`,
                        width: `${((range[1] - range[0]) / (market.domain.max - market.domain.min)) * 100}%`
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="text-xs text-cyan-300 font-mono tracking-wide">
            TOTAL RANGES: {ranges.length} | CREATE CAMEL CURVES WITH MULTIPLE PEAKS
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Range</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Input
              type="number"
              value={minInput}
              onChange={(e) => handleMinChange(e.target.value)}
              placeholder="Min"
              step={1}
              className={`font-mono bg-white/5 border-white/10 ${errors.min ? "border-destructive" : ""}`}
            />
            {errors.min && <p className="text-xs text-destructive">{errors.min}</p>}
          </div>
          <div className="space-y-1">
            <Input
              type="number"
              value={maxInput}
              onChange={(e) => handleMaxChange(e.target.value)}
              placeholder="Max"
              step={1}
              className={`font-mono bg-white/5 border-white/10 ${errors.max ? "border-destructive" : ""}`}
            />
            {errors.max && <p className="text-xs text-destructive">{errors.max}</p>}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Unit: {market.unit}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notional">Notional (USDC)</Label>
        <div className="flex gap-2">
          <Input
            id="notional"
            type="number"
            value={notional}
            onChange={(e) => handleNotionalChange(e.target.value)}
            placeholder="500"
            min={10}
            step={10}
            className={`font-mono bg-white/5 border-white/10 flex-1 ${errors.notional ? "border-destructive" : ""}`}
          />
          <Button variant="outline" size="icon" onClick={() => adjustNotional(-100)} disabled={!isValidRange}>
            <Minus className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => adjustNotional(100)} disabled={!isValidRange}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setNotional("100")} className="text-xs">
            +$100
          </Button>
          <Button variant="ghost" size="sm" onClick={() => adjustNotional(500)} className="text-xs">
            +$500
          </Button>
        </div>
        {errors.notional && <p className="text-xs text-destructive">{errors.notional}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="slippage">Slippage Tolerance (bps)</Label>
        <Input
          id="slippage"
          type="number"
          value={slippage}
          onChange={(e) => handleSlippageChange(e.target.value)}
          placeholder="50"
          min={1}
          max={500}
          className="font-mono bg-white/5 border-white/10"
        />
        <p className="text-xs text-muted-foreground">Range: 1-500 bps</p>
      </div>

      {tradePreview && (
        <div className="space-y-3 p-4 rounded-lg bg-white/5 border border-white/10">
          <div className="text-sm font-semibold">Live Outputs</div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ΔMass</span>
              <span className="font-mono font-bold">{fmtPct(tradePreview.deltaMass * 100)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Est. {side === "buy" ? "Cost" : "Proceeds"}</span>
              <span className="font-mono font-bold">{fmtUSD(tradePreview.costUSD)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Implied Δμ</span>
              <span className="font-mono font-bold flex items-center gap-1">
                {tradePreview.impliedShift.deltaMean > 0 ? (
                  <TrendingUp className="w-3 h-3 text-primary" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-destructive" />
                )}
                {fmtNum(tradePreview.impliedShift.deltaMean)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Implied Δσ²</span>
              <span className="font-mono font-bold">{fmtNum(tradePreview.impliedShift.deltaVariance)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-white/5">
              <span className="text-muted-foreground">Range Prob After</span>
              <span className="font-mono font-bold text-primary">{fmtPct(tradePreview.rangeProbAfter * 100)}</span>
            </div>
          </div>
        </div>
      )}

      <Button
        onClick={handleConfirm}
        className={`w-full ${side === "buy" ? "bg-gradient-to-r from-cyan-500 to-primary hover:from-cyan-600 hover:to-primary/90" : "bg-gradient-to-r from-destructive to-red-600 hover:from-destructive/90 hover:to-red-700"}`}
        size="lg"
        disabled={!isValidNotional || !isValidRange}
      >
        Confirm {side === "buy" ? "Buy" : "Sell"}
      </Button>
    </div>
  )
}
