"use client"

import { useEffect, useState } from "react"
import { Navbar } from "@/components/navbar"
import { MarketCard } from "@/components/market-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { Market } from "@/lib/types"
import { Search, Filter } from "lucide-react"
import { motion } from "framer-motion"
import { readStoredMarkets } from "@/lib/storage"

export default function MarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    readStoredMarkets().then((markets) => {
      setMarkets(markets)
      setLoading(false)
    })
  }, [])

  const categories = Array.from(new Set(markets.map((m) => m.category)))

  const filteredMarkets = markets.filter((market) => {
    const matchesSearch = market.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || market.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="min-h-screen bg-black tron-grid">
      <Navbar />

      <div className="container mx-auto px-4 py-12">
        {/* TRON Header */}
        <div className="space-y-8 mb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="relative">
              <h1 className="text-6xl md:text-7xl font-bold text-cyan-400 neon-glow">CONTINUOUS MARKETS</h1>
              <div className="h-1 w-40 bg-gradient-to-r from-cyan-400 to-transparent mt-4"></div>
            </div>
            <p className="text-cyan-200 text-xl font-mono tracking-wider">TRADE PROBABILITY MASS ACROSS INFINITE OUTCOME STATES</p>
          </motion.div>

          {/* TRON Search and Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col md:flex-row gap-8"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400" />
              <Input
                placeholder="SEARCH MARKETS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 py-4 bg-black/80 border-cyan-500/30 text-white placeholder:text-cyan-300 focus:border-cyan-400 transition-all duration-300 font-mono tracking-wider"
              />
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                onClick={() => setSelectedCategory(null)}
                className={`neon-border px-6 py-3 font-mono tracking-wider transition-all duration-300 ${selectedCategory === null
                  ? "bg-cyan-400 text-black hover:bg-cyan-300"
                  : "bg-black/50 text-cyan-400 hover:bg-cyan-400/10"
                  }`}
              >
                ALL
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  onClick={() => setSelectedCategory(category)}
                  className={`neon-border px-6 py-3 font-mono tracking-wider transition-all duration-300 ${selectedCategory === category
                    ? "bg-cyan-400 text-black hover:bg-cyan-300"
                    : "bg-black/50 text-cyan-400 hover:bg-cyan-400/10"
                    }`}
                >
                  {category.toUpperCase()}
                </Button>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Sleek Markets Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass-card p-6 h-64 animate-pulse" />
            ))}
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No markets match filters.</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {filteredMarkets.map((market, index) => (
              <motion.div
                key={market.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
              >
                <MarketCard market={market} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Stats Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold font-mono text-primary">{markets.length}</div>
            <div className="text-sm text-muted-foreground">Active Markets</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold font-mono text-primary">
              ${(markets.reduce((sum, m) => sum + m.liquidityUSD, 0) / 1000).toFixed(0)}k
            </div>
            <div className="text-sm text-muted-foreground">Total Liquidity</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold font-mono text-primary">
              ${(markets.reduce((sum, m) => sum + m.vol24hUSD, 0) / 1000).toFixed(0)}k
            </div>
            <div className="text-sm text-muted-foreground">24h Volume</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-2xl font-bold font-mono text-primary">{categories.length}</div>
            <div className="text-sm text-muted-foreground">Categories</div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
