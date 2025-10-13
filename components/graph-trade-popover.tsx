"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { fmtPct, fmtUSD, fmtNum, getLiquidityLabel } from "@/lib/formatters"
import { TrendingUp, TrendingDown, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface GraphTradePopoverProps {
  range: [number, number]
  unit: string
  deltaMass: number
  estimatedCost: number
  impliedShift: { deltaMean: number; deltaVariance: number }
  liquidityDepth: number
  defaultNotional: number
  onTrade: (side: "buy" | "sell", notional: number) => Promise<void>
  onOpenTicket: () => void
  onClose: () => void
}

export function GraphTradePopover({
  range,
  unit,
  deltaMass,
  estimatedCost,
  impliedShift,
  liquidityDepth,
  defaultNotional,
  onTrade,
  onOpenTicket,
  onClose,
}: GraphTradePopoverProps) {
  const [notional, setNotional] = useState(defaultNotional.toString())
  const [isTrading, setIsTrading] = useState(false)
  const { toast } = useToast()

  const handleQuickAdjust = (delta: number) => {
    const current = Number.parseFloat(notional) || 0
    setNotional(Math.max(10, current + delta).toString())
  }

  const handleTrade = async (side: "buy" | "sell") => {
    const amount = Number.parseFloat(notional)
    if (isNaN(amount) || amount < 10) {
      toast({
        title: "Invalid amount",
        description: "Minimum notional is $10",
        variant: "destructive",
      })
      return
    }

    setIsTrading(true)
    try {
      await onTrade(side, amount)
      toast({
        title: "Trade executed",
        description: `${side === "buy" ? "Bought" : "Sold"} ${fmtPct(deltaMass * 100)} probability mass`,
      })
      onClose()
    } catch (error) {
      toast({
        title: "Trade failed",
        description: "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsTrading(false)
    }
  }

  return (
    <Card className="glass-card p-4 space-y-3 w-80 shadow-2xl border-primary/30">
      {/* Range Display */}
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Selected Range</div>
        <div className="font-mono text-sm font-semibold">
          [{range[0].toFixed(2)}, {range[1].toFixed(2)}] {unit}
        </div>
      </div>

      {/* Trade Metrics */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="space-y-1">
          <div className="text-muted-foreground">ΔMass</div>
          <div className="font-mono font-semibold">{fmtPct(deltaMass * 100)}</div>
        </div>
        <div className="space-y-1">
          <div className="text-muted-foreground">Est. Cost</div>
          <div className="font-mono font-semibold">{fmtUSD(estimatedCost)}</div>
        </div>
        <div className="space-y-1">
          <div className="text-muted-foreground">Implied Δμ</div>
          <div className="font-mono font-semibold flex items-center gap-1">
            {impliedShift.deltaMean > 0 ? (
              <TrendingUp className="w-3 h-3 text-primary" />
            ) : (
              <TrendingDown className="w-3 h-3 text-destructive" />
            )}
            {fmtNum(impliedShift.deltaMean)}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-muted-foreground">Liquidity</div>
          <Badge variant="outline" className="text-xs">
            {getLiquidityLabel(liquidityDepth)}
          </Badge>
        </div>
      </div>

      {/* Notional Input */}
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Notional (USDC)</div>
        <div className="flex gap-2">
          <Input
            type="number"
            value={notional}
            onChange={(e) => setNotional(e.target.value)}
            min={10}
            step={10}
            className="font-mono text-sm bg-white/5 border-white/10"
          />
          <Button variant="outline" size="sm" onClick={() => handleQuickAdjust(100)} className="text-xs">
            +$100
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleQuickAdjust(500)} className="text-xs">
            +$500
          </Button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => handleTrade("buy")}
          disabled={isTrading}
          className="bg-primary hover:bg-primary/90 text-xs"
          size="sm"
        >
          Buy Mass
        </Button>
        <Button
          onClick={() => handleTrade("sell")}
          disabled={isTrading}
          variant="destructive"
          className="text-xs"
          size="sm"
        >
          Sell Mass
        </Button>
      </div>

      <Button onClick={onOpenTicket} variant="outline" size="sm" className="w-full text-xs bg-transparent">
        <ExternalLink className="w-3 h-3 mr-2" />
        Open in Ticket
      </Button>
    </Card>
  )
}
