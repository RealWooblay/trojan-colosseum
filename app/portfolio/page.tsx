"use client"

import { useEffect, useState } from "react"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Position, PortfolioSummary } from "@/lib/types"
import { TrendingUp, TrendingDown, Plus, Minus, X } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

export default function PortfolioPage() {
  const [positions, setPositions] = useState<Position[]>([])
  const [summary, setSummary] = useState<PortfolioSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/portfolio")
      .then((res) => res.json())
      .then((data) => {
        setPositions(data.positions)
        setSummary(data.summary)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-white/5 rounded w-1/4" />
            <div className="grid md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-white/5 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 mb-8">
          <h1 className="text-4xl md:text-5xl font-bold">Portfolio</h1>
          <p className="text-lg text-muted-foreground">Track your probability mass positions</p>
        </motion.div>

        {/* Summary KPIs */}
        {summary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            <Card className="glass-card p-6">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Net Exposure</div>
                <div className="text-2xl font-bold font-mono text-primary">${summary.netExposureUSD.toFixed(0)}</div>
              </div>
            </Card>
            <Card className="glass-card p-6">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Realized PnL</div>
                <div className="text-2xl font-bold font-mono">${summary.realizedPnL.toFixed(0)}</div>
              </div>
            </Card>
            <Card className="glass-card p-6">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Unsettled PnL</div>
                <div
                  className={`text-2xl font-bold font-mono ${summary.unsettledPnL >= 0 ? "text-primary" : "text-destructive"}`}
                >
                  {summary.unsettledPnL >= 0 ? "+" : ""}${summary.unsettledPnL.toFixed(0)}
                </div>
              </div>
            </Card>
            <Card className="glass-card p-6">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Open Positions</div>
                <div className="text-2xl font-bold font-mono">{summary.openPositions}</div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Positions Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-card p-6">
            {positions.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <p className="text-muted-foreground">No positions yet — pick a range and buy some mass.</p>
                <Link href="/markets">
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Browse Markets</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Market</TableHead>
                      <TableHead>Range</TableHead>
                      <TableHead>Mass Owned</TableHead>
                      <TableHead>Cost Basis</TableHead>
                      <TableHead>Mark Value</TableHead>
                      <TableHead>Unrealized PnL</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {positions.map((position) => (
                      <TableRow key={position.id}>
                        <TableCell>
                          <Link href={`/market/${position.marketId}`} className="hover:text-primary transition-colors">
                            {position.marketTitle}
                          </Link>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          [{position.range[0].toFixed(0)}, {position.range[1].toFixed(0)}]
                        </TableCell>
                        <TableCell className="font-mono text-sm">{(position.massOwned * 100).toFixed(2)}%</TableCell>
                        <TableCell className="font-mono text-sm">${position.costUSD.toFixed(0)}</TableCell>
                        <TableCell className="font-mono text-sm">${position.markValueUSD.toFixed(0)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {position.pnlUSD >= 0 ? (
                              <TrendingUp className="w-4 h-4 text-primary" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-destructive" />
                            )}
                            <span
                              className={`font-mono text-sm font-semibold ${position.pnlUSD >= 0 ? "text-primary" : "text-destructive"}`}
                            >
                              {position.pnlUSD >= 0 ? "+" : ""}${position.pnlUSD.toFixed(0)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0 bg-transparent">
                              <Plus className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0 bg-transparent">
                              <Minus className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-destructive bg-transparent">
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
