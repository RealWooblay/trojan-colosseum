"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { useParams } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { PdfChart } from "@/components/pdf-chart"
import { TradePanel } from "@/components/trade-panel"
import { StatsStrip } from "@/components/stats-strip"
import { MicroTutorialOverlay } from "@/components/micro-tutorial-overlay"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { fmtPct, fmtUSD, fmtOutcome, calcRangeProb } from "@/lib/formatters"
import { findMode } from "@/lib/chart-utils"
import { generateNormalPdf } from "@/lib/pdf-utils"
import type { Market, PdfPoint, Trade } from "@/lib/types"
import { ArrowLeft, Info } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

export default function MarketDetailPage() {
  const params = useParams()
  const marketId = params.id as string

  const [market, setMarket] = useState<Market | null>(null)
  const [pdf, setPdf] = useState<PdfPoint[]>([])
  const [recentTrades, setRecentTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRange, setSelectedRange] = useState<[number, number]>([0, 100])
  const [tradePreview, setTradePreview] = useState<any>(null)
  const [isUserInteracting, setIsUserInteracting] = useState(false)
  const [ghostPdf, setGhostPdf] = useState<PdfPoint[] | undefined>(undefined)

  const selectedRangeRef = useRef(selectedRange)

  // Generate ghost curve - either trade preview result or range-based prediction
  const ghostData: PdfPoint[] = useMemo(() => {
    // Priority 1: Trade preview ghost data (actual trade result from API)
    if (ghostPdf) return ghostPdf

    // Priority 2: Range-based prediction (mathematical estimate based on selected range)
    if (!market || pdf.length === 0) return []

    // Calculate the center of the betting range
    const rangeCenter = (selectedRange[0] + selectedRange[1]) / 2
    const rangeWidth = selectedRange[1] - selectedRange[0]

    // More subtle shift - smooth mathematical transition
    const concentrationFactor = Math.min(rangeWidth / (market.domain.max - market.domain.min), 1)
    const shiftAmount = (rangeCenter - market.stats.mean) * (0.2 + concentrationFactor * 0.3)

    // Slight variance adjustment - keep curve smooth
    const varianceAdjustment = 1 - (concentrationFactor * 0.2)

    const newMean = market.stats.mean + shiftAmount
    const newVariance = market.stats.variance * varianceAdjustment

    return generateNormalPdf(newMean, newVariance, market.domain)
  }, [selectedRange, market, pdf, ghostPdf])

  useEffect(() => {
    fetch(`/api/markets/${marketId}`)
      .then((res) => res.json())
      .then((data) => {
        setMarket(data.market)
        setPdf(data.pdf)
        setRecentTrades(data.recentTrades)

        const mode = findMode(data.pdf)
        const bandwidth = (data.market.domain.max - data.market.domain.min) * 0.1
        setSelectedRange([
          Math.max(data.market.domain.min, mode - bandwidth / 2),
          Math.min(data.market.domain.max, mode + bandwidth / 2),
        ])

        setLoading(false)
      })
  }, [marketId])

  useEffect(() => {
    selectedRangeRef.current = selectedRange
  }, [selectedRange])

  const handleTradePreview = useCallback(
    async (side: "buy" | "sell", notional: number) => {
      if (!market) return

      try {
        const response = await fetch("/api/trade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            marketId: market.id,
            side,
            range: selectedRangeRef.current,
            notionalUSD: notional,
          }),
        })

        const data = await response.json()

        const rangeProbAfter = calcRangeProb(data.newPdf || pdf, selectedRangeRef.current)

        setTradePreview({
          ...data,
          rangeProbAfter,
        })

        const cappedGhostPdf =
          data.newPdf?.filter((_: any, i: number) => i % Math.ceil(data.newPdf.length / 400) === 0) || undefined
        setGhostPdf(cappedGhostPdf)
      } catch (error) {
        console.error("[v0] Trade preview failed:", error)
      }
    },
    [market, pdf],
  )

  const handleRangeChange = useCallback((newRange: [number, number]) => {
    setSelectedRange(newRange)
    setIsUserInteracting(true)

    // Clear trade preview ghost when range changes to show range-based prediction
    setGhostPdf(undefined)

    // Resume animation after 2 seconds for more responsive feel
    setTimeout(() => {
      setIsUserInteracting(false)
    }, 2000)
  }, [])

  if (loading || !market) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-white/5 rounded w-1/3 shimmer" />
            <div className="h-96 bg-white/5 rounded shimmer" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black tron-grid">
      <Navbar />
      <MicroTutorialOverlay />

      <div className="container mx-auto px-4 py-8">
        <Link
          href="/markets"
          className="inline-flex items-center gap-3 text-cyan-300 hover:text-cyan-400 transition-colors mb-8 font-mono tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          BACK TO MARKETS
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 mb-12">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold text-white font-mono tracking-wider">{market.title.toUpperCase()}</h1>
              <div className="h-1 w-32 bg-gradient-to-r from-cyan-400 to-transparent"></div>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="border-cyan-400/50 text-cyan-300 font-mono tracking-wider">
                  {market.category.toUpperCase()}
                </Badge>
                <span className="text-cyan-200 font-mono tracking-wide">UNIT: {market.unit}</span>
                <span className="text-cyan-200 font-mono tracking-wide">LIQUIDITY: {fmtUSD(market.liquidityUSD)}</span>
              </div>
            </div>
          </div>

          <StatsStrip
            mean={market.stats.mean}
            variance={market.stats.variance}
            skew={market.stats.skew}
            kurtosis={market.stats.kurtosis}
          />
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_400px] gap-6">
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="tron-card p-8 relative">
                {/* Circuit pattern */}
                <div className="absolute top-4 left-4 w-2 h-2 bg-cyan-400/60"></div>
                <div className="absolute top-4 right-4 w-2 h-2 bg-cyan-400/60"></div>
                <div className="absolute bottom-4 left-4 w-2 h-2 bg-cyan-400/60"></div>
                <div className="absolute bottom-4 right-4 w-2 h-2 bg-cyan-400/60"></div>
                <PdfChart
                  data={pdf}
                  ghostData={ghostData}
                  ghostType={ghostPdf ? "trade-preview" : "range-prediction"}
                  mean={market.stats.mean}
                  median={market.stats.mean * 0.98}
                  selectedRange={selectedRange}
                  domain={market.domain}
                  unit={market.unit}
                  liquidityDepth={market.liquidityUSD}
                  onRangeChange={handleRangeChange}
                />
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="glass-card p-6">
                <Tabs defaultValue="history">
                  <TabsList>
                    <TabsTrigger value="history">History</TabsTrigger>
                    <TabsTrigger value="docs">How It Works</TabsTrigger>
                  </TabsList>

                  <TabsContent value="history" className="space-y-4 mt-4">
                    <h3 className="text-sm font-semibold">Recent Trades</h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Side</TableHead>
                            <TableHead>Range</TableHead>
                            <TableHead>Notional</TableHead>
                            <TableHead>ΔMass</TableHead>
                            <TableHead>Time</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recentTrades.slice(0, 5).map((trade) => (
                            <TableRow key={trade.id}>
                              <TableCell>
                                <Badge variant={trade.side === "buy" ? "default" : "destructive"} className="text-xs">
                                  {trade.side}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                [{fmtOutcome(trade.range[0], market.unit)}, {fmtOutcome(trade.range[1], market.unit)}]
                              </TableCell>
                              <TableCell className="font-mono text-xs">{fmtUSD(trade.notionalUSD)}</TableCell>
                              <TableCell className="font-mono text-xs">{fmtPct(trade.deltaMass * 100)}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {new Date(trade.createdAt).toLocaleTimeString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  <TabsContent value="docs" className="space-y-3 mt-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex gap-2">
                        <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <strong>What you trade:</strong> Probability mass in a range. The curve must integrate to 1.
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <strong>Unified pool:</strong> Buying mass in one region reduces it elsewhere (solvency).
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <strong>Price impact:</strong> Local density determines marginal cost.
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <strong>Resolution:</strong> Endogenous incentives with dispute window (concept).
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <strong>Risk:</strong> Range risk, slippage, and liquidity concentration.
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
                      <p className="text-xs text-muted-foreground font-mono">
                        Formula hint: Cost ≈ ∫[a,b] p(x) · f(liquidity, Δmass) dx
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </Card>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
            <div data-trade-panel>
              <TradePanel
                market={market}
                selectedRange={selectedRange}
                onRangeChange={handleRangeChange}
                onTradePreview={handleTradePreview}
                tradePreview={tradePreview}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
