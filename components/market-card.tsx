"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Market } from "@/lib/types"
import { TrendingUp, TrendingDown } from "lucide-react"
import Link from "next/link"

interface MarketCardProps {
  market: Market
}

export function MarketCard({ market }: MarketCardProps) {
  const isPositive = market.vol24hUSD > 0

  return (
    <Link href={`/market/${market.id}`}>
      <Card className="glass-card p-6 transition-all duration-300 hover:scale-[1.02] cursor-pointer group">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-balance group-hover:text-primary transition-colors">
                {market.title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {market.category}
                </Badge>
                <span className="text-xs text-muted-foreground">Unit: {market.unit}</span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Liquidity</div>
              <div className="font-mono text-sm font-semibold">${(market.liquidityUSD / 1000).toFixed(1)}k</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">24h Volume</div>
              <div className="font-mono text-sm font-semibold flex items-center gap-1">
                {isPositive ? (
                  <TrendingUp className="w-3 h-3 text-primary" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-destructive" />
                )}
                ${(market.vol24hUSD / 1000).toFixed(1)}k
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Mean μ</div>
              <div className="font-mono text-sm font-semibold">{market.stats.mean.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Variance σ²</div>
              <div className="font-mono text-sm font-semibold">{market.stats.variance.toFixed(2)}</div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-white/5">
            <div className="text-xs text-muted-foreground">
              Resolves: {market.resolvesAt ? new Date(market.resolvesAt).toLocaleDateString() : "TBD"}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}
