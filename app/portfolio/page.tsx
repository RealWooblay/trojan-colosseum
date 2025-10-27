"use client"

import { useEffect, useState } from "react"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Position, PortfolioSummary, Ticket, Market } from "@/lib/types"
import { TrendingUp, TrendingDown, Plus, Minus, X, PieChart } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { findStoredTicketsByAuthority, readStoredMarkets, readStoredTickets } from "@/lib/storage"
import { useAppKitAccount } from "@reown/appkit/react"

export default function PortfolioPage() {
  const { address } = useAppKitAccount();

  const [tickets, setTickets] = useState<Ticket[]>([])
  const [markets, setMarkets] = useState<Map<string, Market>>(new Map())
  const [summary, setSummary] = useState<PortfolioSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!address) return;

    findStoredTicketsByAuthority(address)
    .then((tickets) => {
      setTickets(tickets)
      readStoredMarkets().then((storedMarkets) => {
        storedMarkets.forEach((market) => {
          setMarkets((prev) => prev.set(market.id, market))
        })
        setLoading(false)
      }).catch((error) => {
        console.error(error)
      })
    })
    .catch((error) => {
      console.error(error)
    })
  }, [address])

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
    <div className="min-h-screen bg-black tron-grid">
      <Navbar />

      <div className="container mx-auto px-4 py-12">
        {/* TRON Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16"
        >
          <div className="relative">
            <h1 className="text-6xl font-bold text-cyan-400 neon-glow mb-4">PORTFOLIO</h1>
            <div className="h-1 w-32 bg-gradient-to-r from-cyan-400 to-transparent mb-6"></div>
            <p className="text-cyan-200 text-lg font-mono tracking-wider">
              PROBABILITY MASS POSITIONS
            </p>
          </div>
        </motion.div>

        {/* TRON Summary Cards */}
        {summary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16"
          >
            {/* Hexagonal Card */}
            <div className="tron-card p-8 relative transform rotate-3 hover:rotate-0 transition-all duration-500">
              <div className="absolute top-0 left-0 w-full h-full border-l-2 border-t-2 border-cyan-400/50"></div>
              <div className="absolute bottom-0 right-0 w-full h-full border-r-2 border-b-2 border-cyan-400/50"></div>
              <div className="space-y-4">
                <div className="text-xs font-mono text-cyan-300 uppercase tracking-widest">NET EXPOSURE</div>
                <div className="text-4xl font-mono font-bold text-white neon-glow">
                  ${summary.netExposureUSD.toFixed(0)}
                </div>
              </div>
            </div>

            {/* Diamond Card */}
            <div className="tron-card p-8 relative transform -rotate-2 hover:rotate-0 transition-all duration-500">
              <div className="absolute inset-0 border-2 border-cyan-400/30 transform rotate-45"></div>
              <div className="relative z-10 space-y-4">
                <div className="text-xs font-mono text-cyan-300 uppercase tracking-widest">REALIZED PNL</div>
                <div className="text-4xl font-mono font-bold text-white neon-glow">
                  ${summary.realizedPnL.toFixed(0)}
                </div>
              </div>
            </div>

            {/* Circuit Card */}
            <div className="tron-card p-8 relative hover:scale-105 transition-all duration-500">
              <div className="absolute top-2 left-2 w-4 h-4 border border-cyan-400/60"></div>
              <div className="absolute top-2 right-2 w-4 h-4 border border-cyan-400/60"></div>
              <div className="absolute bottom-2 left-2 w-4 h-4 border border-cyan-400/60"></div>
              <div className="absolute bottom-2 right-2 w-4 h-4 border border-cyan-400/60"></div>
              <div className="space-y-4">
                <div className="text-xs font-mono text-cyan-300 uppercase tracking-widest">UNSETTLED PNL</div>
                <div className={`text-4xl font-mono font-bold neon-glow ${summary.unsettledPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {summary.unsettledPnL >= 0 ? "+" : ""}${summary.unsettledPnL.toFixed(0)}
                </div>
              </div>
            </div>

            {/* Grid Card */}
            <div className="tron-card p-8 relative hover:scale-105 transition-all duration-500">
              <div className="absolute inset-0 opacity-20">
                <div className="grid grid-cols-3 grid-rows-3 h-full w-full">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="border border-cyan-400/30"></div>
                  ))}
                </div>
              </div>
              <div className="relative z-10 space-y-4">
                <div className="text-xs font-mono text-cyan-300 uppercase tracking-widest">OPEN POSITIONS</div>
                <div className="text-4xl font-mono font-bold text-white neon-glow">
                  {summary.openPositions}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TRON Positions Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="tron-card p-8 relative overflow-hidden">
            {/* Circuit board pattern */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>

            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-cyan-400 neon-glow mb-2">POSITIONS</h2>
                <div className="h-0.5 w-24 bg-gradient-to-r from-cyan-400 to-transparent mb-4"></div>
                <p className="text-cyan-200 text-sm font-mono tracking-wider">MANAGE PROBABILITY MASS HOLDINGS</p>
              </div>
              <Link href="/markets">
                <Button className="neon-border bg-black/50 text-cyan-400 hover:bg-cyan-400/10 px-8 py-3 font-mono tracking-wider transition-all duration-300">
                  <Plus className="w-4 h-4 mr-2" />
                  NEW POSITION
                </Button>
              </Link>
            </div>

            {tickets.length === 0 ? (
              <div className="text-center py-20 space-y-8">
                <div className="relative mx-auto w-24 h-24">
                  <div className="absolute inset-0 border-2 border-cyan-400/50 transform rotate-45"></div>
                  <div className="absolute inset-2 border border-cyan-400/30 transform rotate-45"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <PieChart className="w-12 h-12 text-cyan-400 neon-glow" />
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-cyan-400 neon-glow font-mono tracking-wider">NO POSITIONS DETECTED</h3>
                  <p className="text-cyan-200 max-w-md mx-auto font-mono tracking-wide">
                    INITIALIZE PROBABILITY MASS DISTRIBUTION ACROSS CONTINUOUS MARKETS
                  </p>
                </div>
                <Link href="/markets">
                  <Button className="neon-border bg-black/50 text-cyan-400 hover:bg-cyan-400/10 px-12 py-4 font-mono tracking-wider transition-all duration-300">
                    EXPLORE MARKETS
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-cyan-400/30 hover:bg-transparent">
                      <TableHead className="text-cyan-300 font-mono tracking-wider py-6 px-6 text-xs uppercase">MARKET</TableHead>
                      <TableHead className="text-cyan-300 font-mono tracking-wider py-6 px-6 text-xs uppercase">COST BASIS</TableHead>
                      <TableHead className="text-cyan-300 font-mono tracking-wider py-6 px-6 text-xs uppercase">MARK VALUE</TableHead>
                      <TableHead className="text-cyan-300 font-mono tracking-wider py-6 px-6 text-xs uppercase">UNREALIZED PNL</TableHead>
                      <TableHead className="text-cyan-300 font-mono tracking-wider py-6 px-6 text-xs uppercase">ACTIONS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket, index) => (
                      <motion.tr
                        key={ticket.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                        className="border-cyan-400/20 hover:bg-cyan-400/5 transition-all duration-300"
                      >
                        <TableCell className="py-4 px-6">
                          <Link
                            href={`/market/${ticket.marketId}`}
                            className="hover:text-cyan-300 transition-colors text-white font-mono tracking-wide"
                          >
                            {markets.get(ticket.marketId)?.title}
                          </Link>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-white py-4 px-6">
                          ${(ticket.amount / (10 ** 6)).toFixed(2)}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-white py-4 px-6">
                          ${(ticket.amount / (10 ** 6)).toFixed(2)}
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <TrendingDown className="w-4 h-4 text-red-400" />
                            <span
                              className={`font-mono text-sm font-bold neon-glow text-red-400`}
                            >
                              0
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-slate-700 hover:bg-slate-800">
                              <Plus className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-slate-700 hover:bg-slate-800">
                              <Minus className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-slate-700 hover:bg-slate-800 text-red-400">
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
