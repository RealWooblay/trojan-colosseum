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
  const oracleStatus = market.oracle?.status
  const resolvedOutcome = market.oracle?.resolvedOutcome ?? market.resolvedOutcome
  const lastChecked = market.oracle?.lastCheckedAt
    ? new Date(market.oracle.lastCheckedAt).toLocaleString()
    : null

  return (
    <Link href={`/market/${market.id}`}>
      <div className="tron-card p-8 relative transform hover:scale-105 transition-all duration-500 cursor-pointer group">
        {/* Circuit pattern overlay */}
        <div className="absolute top-4 left-4 w-2 h-2 bg-cyan-400/60"></div>
        <div className="absolute top-4 right-4 w-2 h-2 bg-cyan-400/60"></div>
        <div className="absolute bottom-4 left-4 w-2 h-2 bg-cyan-400/60"></div>
        <div className="absolute bottom-4 right-4 w-2 h-2 bg-cyan-400/60"></div>

        <div className="space-y-6">
          {/* TRON Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-xl text-white group-hover:text-cyan-300 transition-colors mb-3 font-mono tracking-wide">
                {market.title.toUpperCase()}
              </h3>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-xs border-cyan-400/50 text-cyan-300 font-mono tracking-wider">
                  {market.category.toUpperCase()}
                </Badge>
                <span className="text-xs text-cyan-400 font-mono tracking-wider">UNIT: {market.unit}</span>
              </div>
            </div>
          </div>

          {/* TRON Stats Grid */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-xs text-cyan-300 uppercase tracking-widest font-mono">LIQUIDITY</div>
              <div className="font-mono text-xl font-bold text-white neon-glow mt-2">${(market.liquidityUSD / 1000).toFixed(1)}K</div>
            </div>
            <div>
              <div className="text-xs text-cyan-300 uppercase tracking-widest font-mono">24H VOLUME</div>
              <div className="font-mono text-xl font-bold flex items-center gap-2 mt-2">
                {isPositive ? (
                  <TrendingUp className="w-4 h-4 text-green-400 neon-glow" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400 neon-glow" />
                )}
                <span className={`neon-glow ${isPositive ? "text-green-400" : "text-red-400"}`}>
                  ${(market.vol24hUSD / 1000).toFixed(1)}K
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs text-cyan-300 uppercase tracking-widest font-mono">MEAN μ</div>
              <div className="font-mono text-xl font-bold text-white neon-glow mt-2">{market.stats.mean.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-cyan-300 uppercase tracking-widest font-mono">VARIANCE σ²</div>
              <div className="font-mono text-xl font-bold text-white neon-glow mt-2">{market.stats.variance.toFixed(2)}</div>
            </div>
          </div>

          {/* TRON Footer */}
          <div className="pt-4 border-t border-cyan-400/30">
            <div className="text-xs text-cyan-400 font-mono tracking-wider">
              RESOLVES: {market.resolvesAt ? new Date(market.resolvesAt).toLocaleDateString().toUpperCase() : "TBD"}
            </div>
            {market.oracle && (
              <div className="text-xs text-cyan-300 font-mono tracking-wider mt-2">
                AI ORACLE:{" "}
                {oracleStatus === "resolved" && resolvedOutcome
                  ? `RESOLVED ${resolvedOutcome}`
                  : oracleStatus === "pending"
                    ? "PENDING"
                    : "UNKNOWN"}
                {lastChecked ? ` • LAST CHECK ${lastChecked.toUpperCase()}` : ""}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
