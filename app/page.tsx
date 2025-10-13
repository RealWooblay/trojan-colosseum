"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Navbar } from "@/components/navbar"
import { AnimatedPdfDemo } from "@/components/animated-pdf-demo"
import { ArrowRight, Layers, TrendingUp, Shield } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

export default function HomePage() {
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
          <Card className="glass-card p-8 max-w-5xl mx-auto">
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-semibold">See It In Action</h2>
                <p className="text-muted-foreground">
                  Watch how the probability density function shifts as traders buy and sell mass
                </p>
              </div>
              <AnimatedPdfDemo />
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
