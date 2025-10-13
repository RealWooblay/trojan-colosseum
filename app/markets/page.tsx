"use client"

import { useEffect, useState } from "react"
import { Navbar } from "@/components/navbar"
import { MarketCard } from "@/components/market-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { Market } from "@/lib/types"
import { Search, Filter } from "lucide-react"
import { motion } from "framer-motion"

export default function MarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/markets")
      .then((res) => res.json())
      .then((data) => {
        setMarkets(data)
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
    <div className="min-h-screen">
      <Navbar />

      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="space-y-6 mb-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold">Continuous Markets</h1>
            <p className="text-lg text-muted-foreground">Trade probability mass across infinite outcome states</p>
          </motion.div>

          {/* Search and Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col md:flex-row gap-4"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search markets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className={selectedCategory === null ? "bg-primary" : ""}
              >
                All
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className={selectedCategory === category ? "bg-primary" : ""}
                >
                  {category}
                </Button>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Markets Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
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
