"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Navbar } from "@/components/navbar"
import { PdfChart } from "@/components/pdf-chart"
import { generateNormalPdf } from "@/lib/pdf-utils"
import { ArrowRight, Layers, TrendingUp, Shield } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useState, useEffect, useMemo, useCallback } from "react"
import type { PdfPoint } from "@/lib/types"


export default function HomePage() {
  // Current market state - solid curve
  const pdfData: PdfPoint[] = useMemo(() => {
    return generateNormalPdf(3500, 90000, { min: 2000, max: 5000 })
  }, [])

  // Ghost curve based on betting range
  const [selectedRange, setSelectedRange] = useState<[number, number]>([3200, 3800])
  const [isUserInteracting, setIsUserInteracting] = useState(false)

  // Cool automatic demo - dynamic range changes
  useEffect(() => {
    if (isUserInteracting) return

    const interval = setInterval(() => {
      setSelectedRange(prev => {
        // Create interesting patterns for the demo
        const time = Date.now() / 1000
        const patterns = [
          // Pattern 1: Narrowing focus (bullish)
          () => {
            const center = 3500 + Math.sin(time * 0.5) * 300
            const width = 200 + Math.sin(time * 0.3) * 100
            return [center - width / 2, center + width / 2]
          },
          // Pattern 2: Wide range (bearish)
          () => {
            const center = 3500 + Math.cos(time * 0.4) * 200
            const width = 600 + Math.cos(time * 0.2) * 200
            return [center - width / 2, center + width / 2]
          },
          // Pattern 3: Sideways movement
          () => {
            const center = 3500 + Math.sin(time * 0.6) * 400
            const width = 400 + Math.sin(time * 0.4) * 150
            return [center - width / 2, center + width / 2]
          },
          // Pattern 4: Volatile (high uncertainty)
          () => {
            const center = 3500 + Math.sin(time * 0.8) * 500
            const width = 300 + Math.sin(time * 0.6) * 200
            return [center - width / 2, center + width / 2]
          }
        ]

        const patternIndex = Math.floor(time / 8) % patterns.length
        const newRange = patterns[patternIndex]()

        // Ensure bounds
        return [
          Math.max(2000, Math.min(4500, newRange[0])),
          Math.min(5000, Math.max(2500, newRange[1]))
        ]
      })
    }, 2000) // Faster updates for more dynamic feel

    return () => clearInterval(interval)
  }, [isUserInteracting])

  // Generate ghost curve based on betting range - SMOOTH MATHEMATICAL CURVE
  const ghostData: PdfPoint[] = useMemo(() => {
    // Calculate the center of the betting range
    const rangeCenter = (selectedRange[0] + selectedRange[1]) / 2
    const rangeWidth = selectedRange[1] - selectedRange[0]

    // More subtle shift - smooth mathematical transition
    const concentrationFactor = Math.min(rangeWidth / 1000, 1) // Normalize range width
    const shiftAmount = (rangeCenter - 3500) * (0.2 + concentrationFactor * 0.3) // 20-50% shift (more subtle)

    // Slight variance adjustment - keep curve smooth
    const varianceAdjustment = 1 - (concentrationFactor * 0.2) // Reduce variance by up to 20% (more subtle)

    const newMean = 3500 + shiftAmount
    const newVariance = 90000 * varianceAdjustment

    return generateNormalPdf(newMean, newVariance, { min: 2000, max: 5000 })
  }, [selectedRange])


  // Handle range changes
  const handleRangeChange = useCallback((newRange: [number, number]) => {
    setSelectedRange(newRange)
    setIsUserInteracting(true)

    // Resume animation after 2 seconds for more responsive feel
    setTimeout(() => {
      setIsUserInteracting(false)
    }, 2000)
  }, [])

  const features = [
    {
      icon: Layers,
      title: "Unified Liquidity",
      description: "One pool, infinite states. All probability mass trades against a single unified liquidity pool.",
    },
    {
      icon: TrendingUp,
      title: "Expressive Trading",
      description: "Buy and sell probability mass across any continuous range. No binary constraints.",
    },
    {
      icon: Shield,
      title: "Oracle-free Resolution",
      description: "Endogenous incentives ensure clean resolution without external oracles or consensus mechanisms.",
    },
  ]

  return (
    <div className="min-h-screen bg-black tron-grid">
      <Navbar />

      {/* TRON Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <h1 className="text-6xl md:text-8xl font-bold text-white font-mono tracking-wider">
              TRADE <span className="text-cyan-400 neon-glow">CONTINUOUS OUTCOMES</span>
            </h1>
            <div className="h-1 w-48 bg-gradient-to-r from-cyan-400 to-transparent mx-auto"></div>
            <p className="text-xl md:text-2xl text-cyan-200 font-mono tracking-wide">
              BUY AND SELL PROBABILITY MASS. ONE POOL, INFINITE STATES.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-wrap items-center justify-center gap-6"
          >
            <Link href="/markets">
              <Button className="neon-border bg-cyan-400 text-black hover:bg-cyan-300 px-8 py-4 text-lg font-mono tracking-wider transition-all duration-300">
                START TRADING
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/create">
              <Button className="neon-border bg-black/50 text-cyan-400 hover:bg-cyan-400/10 px-8 py-4 text-lg font-mono tracking-wider transition-all duration-300">
                CREATE MARKET
              </Button>
            </Link>
            <Link href="/docs">
              <Button className="neon-border bg-black/50 text-cyan-400 hover:bg-cyan-400/10 px-8 py-4 text-lg font-mono tracking-wider transition-all duration-300">
                READ DOCS
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* TRON Demo Chart */}
      <section className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <div className="tron-card p-8 max-w-4xl mx-auto relative">
            {/* Circuit pattern */}
            <div className="absolute top-4 left-4 w-2 h-2 bg-cyan-400/60"></div>
            <div className="absolute top-4 right-4 w-2 h-2 bg-cyan-400/60"></div>
            <div className="absolute bottom-4 left-4 w-2 h-2 bg-cyan-400/60"></div>
            <div className="absolute bottom-4 right-4 w-2 h-2 bg-cyan-400/60"></div>

            <div className="space-y-8">
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold text-cyan-400 neon-glow font-mono tracking-wider">LIVE DEMO</h2>
                <div className="h-0.5 w-32 bg-gradient-to-r from-cyan-400 to-transparent mx-auto"></div>
                <p className="text-cyan-200 font-mono tracking-wide">
                  ETH PRICE PREDICTION - DEC 2025 • WATCH THE MARKET SHIFT DYNAMICALLY
                </p>
              </div>

              {/* Live Scenario Indicator */}
              <div className="text-center space-y-3">
                <div className="flex items-center justify-center gap-3">
                  <div className={`w-3 h-3 ${isUserInteracting ? 'bg-orange-400' : 'bg-cyan-400'} ${!isUserInteracting ? 'animate-pulse' : ''}`}></div>
                  <p className="text-sm font-mono tracking-wider text-cyan-300">AFTER YOUR TRADE</p>
                  {isUserInteracting && <span className="text-xs text-orange-400 font-mono">(PAUSED)</span>}
                </div>
                <p className="text-xs text-cyan-400 font-mono tracking-wide">
                  {isUserInteracting
                    ? `MARKET SHIFTS BASED ON YOUR BETTING RANGE: $${Math.round(selectedRange[0])} - $${Math.round(selectedRange[1])}`
                    : "MARKET AUTOMATICALLY SHIFTING BASED ON DYNAMIC BETTING PATTERNS"
                  }
                </p>
              </div>

              {/* Interactive Chart */}
              <div className="border border-cyan-400/30 bg-black/50 p-6">
                <PdfChart
                  data={pdfData}
                  ghostData={ghostData}
                  mean={3500}
                  median={3450}
                  selectedRange={selectedRange}
                  domain={{ min: 2000, max: 5000 }}
                  unit="USD"
                  liquidityDepth={100000}
                  onRangeChange={handleRangeChange}
                />
              </div>

              {/* Simple explanation */}
              <div className="text-center text-sm text-cyan-300 font-mono tracking-wide">
                <p><strong className="text-white">SOLID CURVE:</strong> CURRENT MARKET • <strong className="text-white">DOTTED CURVE:</strong> AFTER YOUR TRADE</p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* TRON Feature Cards */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
            >
              <div className="tron-card p-8 h-full space-y-6 hover:scale-105 transition-all duration-500 relative">
                {/* Circuit corners */}
                <div className="absolute top-2 left-2 w-3 h-3 border-l border-t border-cyan-400/50"></div>
                <div className="absolute top-2 right-2 w-3 h-3 border-r border-t border-cyan-400/50"></div>
                <div className="absolute bottom-2 left-2 w-3 h-3 border-l border-b border-cyan-400/50"></div>
                <div className="absolute bottom-2 right-2 w-3 h-3 border-r border-b border-cyan-400/50"></div>

                <div className="w-16 h-16 border-2 border-cyan-400/50 flex items-center justify-center transform rotate-45">
                  <feature.icon className="w-8 h-8 text-cyan-400 transform -rotate-45" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-white font-mono tracking-wider">{feature.title.toUpperCase()}</h3>
                  <p className="text-cyan-200 text-sm leading-relaxed font-mono tracking-wide">{feature.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* TRON CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="tron-card p-12 max-w-4xl mx-auto text-center space-y-8 relative">
          {/* Circuit pattern */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>

          <h2 className="text-4xl md:text-5xl font-bold text-white font-mono tracking-wider">READY TO TRADE PROBABILITY?</h2>
          <div className="h-1 w-40 bg-gradient-to-r from-cyan-400 to-transparent mx-auto"></div>
          <p className="text-lg text-cyan-200 font-mono tracking-wide max-w-2xl mx-auto">
            JOIN THE FUTURE OF CONTINUOUS OUTCOME MARKETS. NO BINARIES, NO CONSENSUS PERPS — JUST PURE PROBABILITY TRADING.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 pt-4">
            <Link href="/markets">
              <Button className="neon-border bg-cyan-400 text-black hover:bg-cyan-300 px-8 py-4 text-lg font-mono tracking-wider transition-all duration-300">
                EXPLORE MARKETS
              </Button>
            </Link>
            <Link href="/docs">
              <Button className="neon-border bg-black/50 text-cyan-400 hover:bg-cyan-400/10 px-8 py-4 text-lg font-mono tracking-wider transition-all duration-300">
                LEARN MORE
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* TRON Footer */}
      <footer className="border-t border-cyan-400/30 py-8 bg-black/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-cyan-300 font-mono tracking-wide">© 2025 TROJAN. TRADE CONTINUOUS OUTCOMES.</div>
            <div className="flex items-center gap-6">
              <Link href="/docs" className="text-sm text-cyan-300 hover:text-cyan-400 transition-colors font-mono tracking-wide">
                DOCUMENTATION
              </Link>
              <Link href="/markets" className="text-sm text-cyan-300 hover:text-cyan-400 transition-colors font-mono tracking-wide">
                MARKETS
              </Link>
              <Link href="/create" className="text-sm text-cyan-300 hover:text-cyan-400 transition-colors font-mono tracking-wide">
                CREATE
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
