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
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <h1 className="text-5xl md:text-7xl font-bold text-balance">
              Trade <span className="text-primary neon-glow">Continuous Outcomes</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground text-balance">
              Buy and sell probability mass. One pool, infinite states.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <Link href="/markets">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8">
                Start Trading
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/create">
              <Button size="lg" variant="outline" className="text-lg px-8 bg-transparent">
                Create Market
              </Button>
            </Link>
            <Link href="/docs">
              <Button size="lg" variant="ghost" className="text-lg px-8">
                Read Docs
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Animated Demo Chart */}
      <section className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <Card className="glass-card p-8 max-w-4xl mx-auto">
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-semibold">Live Demo</h2>
                <p className="text-muted-foreground">
                  ETH Price Prediction - Dec 2025 • Watch the market shift as betting ranges change dynamically
                </p>
              </div>

              {/* Live Scenario Indicator */}
              <div className="text-center space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isUserInteracting ? 'bg-orange-400' : 'bg-violet-400 animate-pulse'}`}></div>
                  <p className="text-sm font-medium text-violet-400">After Your Trade</p>
                  {isUserInteracting && <span className="text-xs text-orange-400">(Paused)</span>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isUserInteracting
                    ? `Market shifts based on your betting range: $${Math.round(selectedRange[0])} - $${Math.round(selectedRange[1])}`
                    : "Market automatically shifting based on dynamic betting patterns"
                  }
                </p>
              </div>

              {/* Interactive Chart */}
              <div className="rounded-lg border border-white/10 bg-black/20 p-4">
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
              <div className="text-center text-sm text-muted-foreground">
                <p><strong>Solid curve:</strong> Current market • <strong>Dotted curve:</strong> After your trade</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </section>

      {/* Feature Cards */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
            >
              <Card className="glass-card p-6 h-full space-y-4 hover:border-primary/50 transition-all duration-300">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="glass-card p-12 max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-balance">Ready to Trade Probability?</h2>
          <p className="text-lg text-muted-foreground text-balance max-w-2xl mx-auto">
            Join the future of continuous outcome markets. No binaries, no consensus perps — just pure probability
            trading.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link href="/markets">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Explore Markets
              </Button>
            </Link>
            <Link href="/docs">
              <Button size="lg" variant="outline">
                Learn More
              </Button>
            </Link>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">© 2025 Trojan. Trade continuous outcomes.</div>
            <div className="flex items-center gap-6">
              <Link href="/docs" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Documentation
              </Link>
              <Link href="/markets" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Markets
              </Link>
              <Link href="/create" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Create
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
