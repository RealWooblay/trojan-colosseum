"use client"

import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Layers, TrendingUp, Shield, AlertTriangle, BarChart3, Coins } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function DocsPage() {
  const sections = [
    {
      icon: Layers,
      title: "What You Trade",
      content: [
        "In Trojan, you trade probability mass across continuous ranges, not binary outcomes.",
        "The probability density function (PDF) must always integrate to 1 — this ensures the market remains solvent.",
        "When you buy mass in a range [a, b], you're increasing the probability that the outcome falls within that interval.",
        "Example: Buying mass in [3000, 4000] for 'ETH Price' means you profit if ETH resolves in that range.",
      ],
      color: "primary",
    },
    {
      icon: Coins,
      title: "Unified Pool",
      content: [
        "All trades happen against a single unified liquidity pool.",
        "Buying mass in one region automatically reduces mass elsewhere to maintain ∫pdf = 1.",
        "This creates natural price discovery: high-demand regions become more expensive, low-demand regions cheaper.",
        "No need for separate order books or liquidity fragmentation across outcomes.",
      ],
      color: "secondary",
    },
    {
      icon: BarChart3,
      title: "Price Impact",
      content: [
        "The local density of the PDF determines the marginal cost of buying mass.",
        "Thin regions (low density) have higher price impact — you're moving the curve more.",
        "Thick regions (high density) have lower price impact — the curve is already concentrated there.",
        "The 'Reweight Preview' shows how your trade shifts the PDF before you confirm.",
      ],
      color: "primary",
    },
    {
      icon: Shield,
      title: "Resolution Game",
      content: [
        "Trojan uses endogenous incentives for resolution — no external oracles required.",
        "Market creators post a bond that's refunded upon clean resolution.",
        "Dispute windows allow traders to challenge incorrect resolutions.",
        "Honest resolution is incentivized through fee sharing and bond mechanics.",
      ],
      color: "secondary",
    },
    {
      icon: AlertTriangle,
      title: "Risk Factors",
      content: [
        "Range Risk: Your position only profits if the outcome falls within your selected range.",
        "Slippage: Large trades in thin regions can experience significant price impact.",
        "Liquidity Concentration: Markets with low liquidity may have wider spreads.",
        "Resolution Risk: Disputes or unclear outcomes can delay settlement.",
      ],
      color: "destructive",
    },
    {
      icon: TrendingUp,
      title: "Trading Strategies",
      content: [
        "Directional: Buy mass where you expect the outcome to land (e.g., ETH in [3500, 4500]).",
        "Volatility: Sell mass in extreme tails if you expect low volatility.",
        "Arbitrage: Exploit mispricing between overlapping ranges or related markets.",
        "Market Making: Provide liquidity by buying underpriced and selling overpriced mass.",
      ],
      color: "primary",
    },
  ]

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 mb-12">
          <h1 className="text-4xl md:text-5xl font-bold">Documentation</h1>
          <p className="text-lg text-muted-foreground text-balance">
            Learn how continuous outcome markets work and how to trade probability mass effectively
          </p>
        </motion.div>

        {/* Quick Start */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-card p-8 mb-12 border-primary/30">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold">Quick Start</h2>
              </div>
              <div className="space-y-3 text-sm leading-relaxed">
                <p>
                  <strong>1. Browse Markets:</strong> Explore continuous markets on the{" "}
                  <Link href="/markets" className="text-primary hover:underline">
                    Markets page
                  </Link>
                  . Each market has a probability density function (PDF) showing where traders think the outcome will
                  land.
                </p>
                <p>
                  <strong>2. Select a Range:</strong> On the trading desk, use the range selector to choose your
                  interval. The shaded area shows your selected probability mass.
                </p>
                <p>
                  <strong>3. Buy or Sell:</strong> Enter your notional amount and review the trade preview. The ghost
                  curve shows how the PDF will shift after your trade.
                </p>
                <p>
                  <strong>4. Track Positions:</strong> Monitor your open positions and PnL on the{" "}
                  <Link href="/portfolio" className="text-primary hover:underline">
                    Portfolio page
                  </Link>
                  .
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Link href="/markets">
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Start Trading</Button>
                </Link>
                <Link href="/create">
                  <Button variant="outline">Create Market</Button>
                </Link>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Core Concepts */}
        <div className="space-y-6">
          {sections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
            >
              <Card className="glass-card p-6 hover:border-primary/30 transition-all duration-300">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg bg-${section.color}/20 flex items-center justify-center flex-shrink-0`}
                    >
                      <section.icon className={`w-5 h-5 text-${section.color}`} />
                    </div>
                    <h3 className="text-xl font-semibold">{section.title}</h3>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                    {section.content.map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Key Terminology */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12"
        >
          <Card className="glass-card p-8">
            <h2 className="text-2xl font-semibold mb-6">Key Terminology</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  term: "PDF (Probability Density Function)",
                  definition:
                    "The curve showing probability density across all possible outcomes. Must integrate to 1.",
                },
                {
                  term: "Probability Mass",
                  definition: "The area under the PDF curve in a specific range. This is what you buy and sell.",
                },
                {
                  term: "μ (Mean)",
                  definition: "The expected value of the distribution. Where the market thinks the outcome will land.",
                },
                {
                  term: "σ² (Variance)",
                  definition: "Measure of spread. Higher variance = more uncertainty about the outcome.",
                },
                {
                  term: "Reweight",
                  definition: "How the PDF shifts after a trade. Buying mass in a range increases density there.",
                },
                {
                  term: "Unified Pool",
                  definition: "Single liquidity pool for all outcomes. Buying in one range reduces mass elsewhere.",
                },
                {
                  term: "Price Impact",
                  definition: "How much your trade moves the PDF. Larger in thin regions, smaller in thick regions.",
                },
                {
                  term: "Endogenous Resolution",
                  definition: "Resolution determined by market incentives, not external oracles.",
                },
              ].map((item) => (
                <div key={item.term} className="space-y-1">
                  <div className="font-semibold text-sm">{item.term}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">{item.definition}</div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-12"
        >
          <Card className="glass-card p-8">
            <h2 className="text-2xl font-semibold mb-6">Frequently Asked Questions</h2>
            <div className="space-y-6">
              {[
                {
                  q: "How is this different from Polymarket?",
                  a: "Polymarket uses binary markets (yes/no). Trojan uses continuous outcomes — you can trade any range, not just two options. This allows for much more expressive predictions.",
                },
                {
                  q: "What happens if I buy mass in [3000, 4000] and ETH resolves at 3500?",
                  a: "You profit! Your position pays out based on how much mass you owned in the range where the outcome landed. The exact payout depends on your cost basis and the final settlement price.",
                },
                {
                  q: "Why does buying mass in one range reduce it elsewhere?",
                  a: "The PDF must always integrate to 1 (100% probability). When you increase probability in one region, it must decrease elsewhere to maintain this constraint. This is the 'unified pool' mechanism.",
                },
                {
                  q: "What's the 'ghost curve' in the trade preview?",
                  a: "The ghost curve shows how the PDF will look after your trade executes. It helps you visualize the price impact and implied shift in mean/variance before confirming.",
                },
                {
                  q: "Can I lose more than my initial investment?",
                  a: "No. Your maximum loss is limited to your cost basis (the amount you paid for the mass). You can't lose more than you put in.",
                },
              ].map((faq, i) => (
                <div key={i} className="space-y-2">
                  <div className="font-semibold text-sm">{faq.q}</div>
                  <div className="text-sm text-muted-foreground leading-relaxed">{faq.a}</div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-12 text-center"
        >
          <Card className="glass-card p-8 border-primary/30">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Ready to Trade?</h2>
              <p className="text-muted-foreground">
                Start trading continuous outcomes now. No binaries, no consensus perps — just pure probability.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <Link href="/markets">
                  <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                    Browse Markets
                  </Button>
                </Link>
                <Link href="/create">
                  <Button size="lg" variant="outline">
                    Create Your Market
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
