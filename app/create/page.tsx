"use client"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { PdfChart } from "@/components/pdf-chart"
import { generateNormalPdf, generateLognormalPdf, generateBetaPdf, generateUniformPdf } from "@/lib/pdf-utils"
import type { PdfPoint } from "@/lib/types"
import { ArrowRight, ArrowLeft, CheckCircle } from "lucide-react"
import { motion } from "framer-motion"
import { useToast } from "@/hooks/use-toast"

export default function CreateMarketPage() {
  const [step, setStep] = useState(1)
  const { toast } = useToast()

  // Step 1: Market Details
  const [title, setTitle] = useState("")
  const [unit, setUnit] = useState<"%" | "USD" | "°C" | "other">("%")
  const [minBound, setMinBound] = useState("0")
  const [maxBound, setMaxBound] = useState("100")
  const [resolutionDate, setResolutionDate] = useState("")

  // Step 2: Prior Distribution
  const [priorKind, setPriorKind] = useState<"normal" | "lognormal" | "beta" | "uniform">("normal")
  const [priorParams, setPriorParams] = useState<Record<string, string>>({
    mean: "50",
    variance: "100",
  })
  const [previewPdf, setPreviewPdf] = useState<PdfPoint[]>([])

  // Step 3: Liquidity & Fees
  const [liquiditySeed, setLiquiditySeed] = useState("10000")
  const [feeBps, setFeeBps] = useState("30")
  const [category, setCategory] = useState("")

  const updatePreview = () => {
    const min = Number.parseFloat(minBound)
    const max = Number.parseFloat(maxBound)
    if (isNaN(min) || isNaN(max)) return

    let pdf: PdfPoint[] = []
    switch (priorKind) {
      case "normal":
        pdf = generateNormalPdf(
          Number.parseFloat(priorParams.mean || "50"),
          Number.parseFloat(priorParams.variance || "100"),
          { min, max },
        )
        break
      case "lognormal":
        pdf = generateLognormalPdf(
          Number.parseFloat(priorParams.mu || "3"),
          Number.parseFloat(priorParams.sigma || "0.5"),
          { min, max },
        )
        break
      case "beta":
        pdf = generateBetaPdf(Number.parseFloat(priorParams.alpha || "2"), Number.parseFloat(priorParams.beta || "5"), {
          min,
          max,
        })
        break
      case "uniform":
        pdf = generateUniformPdf({ min, max })
        break
    }
    setPreviewPdf(pdf)
  }

  const handlePriorKindChange = (kind: "normal" | "lognormal" | "beta" | "uniform") => {
    setPriorKind(kind)
    switch (kind) {
      case "normal":
        setPriorParams({ mean: "50", variance: "100" })
        break
      case "lognormal":
        setPriorParams({ mu: "3", sigma: "0.5" })
        break
      case "beta":
        setPriorParams({ alpha: "2", beta: "5" })
        break
      case "uniform":
        setPriorParams({})
        break
    }
  }

  const handleCreate = () => {
    toast({
      title: "Market created",
      description: `${title} has been created successfully`,
    })
    // Reset form
    setStep(1)
    setTitle("")
    setCategory("")
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 mb-8">
          <h1 className="text-4xl md:text-5xl font-bold">Create Continuous Market</h1>
          <p className="text-lg text-muted-foreground">Launch a new probability mass trading market</p>
        </motion.div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-4 mb-12">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${s === step
                  ? "bg-primary text-primary-foreground"
                  : s < step
                    ? "bg-primary/30 text-primary"
                    : "bg-white/5 text-muted-foreground"
                  }`}
              >
                {s < step ? <CheckCircle className="w-5 h-5" /> : s}
              </div>
              {s < 3 && <div className="w-12 h-0.5 bg-white/10" />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card className="glass-card p-8 min-h-fit">
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">Market Details</h2>
                <p className="text-sm text-muted-foreground">Define the basic parameters of your market</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Market Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Bitcoin Price on Dec 31, 2025"
                    className="bg-white/5 border-white/10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Select value={unit} onValueChange={(v: any) => setUnit(v)}>
                      <SelectTrigger id="unit" className="bg-white/5 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="%">Percentage (%)</SelectItem>
                        <SelectItem value="USD">US Dollar (USD)</SelectItem>
                        <SelectItem value="°C">Celsius (°C)</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g., Crypto"
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min">Min Bound</Label>
                    <Input
                      id="min"
                      type="number"
                      value={minBound}
                      onChange={(e) => setMinBound(e.target.value)}
                      className="font-mono bg-white/5 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max">Max Bound</Label>
                    <Input
                      id="max"
                      type="number"
                      value={maxBound}
                      onChange={(e) => setMaxBound(e.target.value)}
                      className="font-mono bg-white/5 border-white/10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resolution">Target Resolution Date</Label>
                  <Input
                    id="resolution"
                    type="date"
                    value={resolutionDate}
                    onChange={(e) => setResolutionDate(e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>

              <Button onClick={() => setStep(2)} className="w-full bg-primary hover:bg-primary/90" size="lg">
                Next: Initial Prior
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">Initial Prior Distribution</h2>
                <p className="text-sm text-muted-foreground">Choose the starting probability distribution</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Distribution Type</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(["normal", "lognormal", "beta", "uniform"] as const).map((kind) => (
                      <Button
                        key={kind}
                        variant={priorKind === kind ? "default" : "outline"}
                        onClick={() => handlePriorKindChange(kind)}
                        className={priorKind === kind ? "bg-primary" : ""}
                      >
                        {kind.charAt(0).toUpperCase() + kind.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Parameters based on distribution */}
                {priorKind === "normal" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Mean (μ)</Label>
                      <Input
                        type="number"
                        value={priorParams.mean}
                        onChange={(e) => {
                          setPriorParams({ ...priorParams, mean: e.target.value })
                          setTimeout(updatePreview, 100)
                        }}
                        className="font-mono bg-white/5 border-white/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Variance (σ²)</Label>
                      <Input
                        type="number"
                        value={priorParams.variance}
                        onChange={(e) => {
                          setPriorParams({ ...priorParams, variance: e.target.value })
                          setTimeout(updatePreview, 100)
                        }}
                        className="font-mono bg-white/5 border-white/10"
                      />
                    </div>
                  </div>
                )}

                {priorKind === "lognormal" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Mu (μ)</Label>
                      <Input
                        type="number"
                        value={priorParams.mu}
                        onChange={(e) => {
                          setPriorParams({ ...priorParams, mu: e.target.value })
                          setTimeout(updatePreview, 100)
                        }}
                        className="font-mono bg-white/5 border-white/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sigma (σ)</Label>
                      <Input
                        type="number"
                        value={priorParams.sigma}
                        onChange={(e) => {
                          setPriorParams({ ...priorParams, sigma: e.target.value })
                          setTimeout(updatePreview, 100)
                        }}
                        className="font-mono bg-white/5 border-white/10"
                      />
                    </div>
                  </div>
                )}

                {priorKind === "beta" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Alpha (α)</Label>
                      <Input
                        type="number"
                        value={priorParams.alpha}
                        onChange={(e) => {
                          setPriorParams({ ...priorParams, alpha: e.target.value })
                          setTimeout(updatePreview, 100)
                        }}
                        className="font-mono bg-white/5 border-white/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Beta (β)</Label>
                      <Input
                        type="number"
                        value={priorParams.beta}
                        onChange={(e) => {
                          setPriorParams({ ...priorParams, beta: e.target.value })
                          setTimeout(updatePreview, 100)
                        }}
                        className="font-mono bg-white/5 border-white/10"
                      />
                    </div>
                  </div>
                )}

                {/* Live Preview */}
                <div className="space-y-2">
                  <Label>Live Preview</Label>
                  <div className="min-h-[400px] rounded-lg border border-white/10 p-4">
                    {previewPdf.length > 0 ? (
                      <PdfChart
                        data={previewPdf}
                        domain={{ min: Number.parseFloat(minBound), max: Number.parseFloat(maxBound) }}
                        unit={unit}
                        liquidityDepth={10000}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                        <Button onClick={updatePreview} variant="outline">
                          Generate Preview
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button onClick={() => setStep(1)} variant="outline" size="lg" className="flex-1">
                  <ArrowLeft className="mr-2 w-4 h-4" />
                  Back
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1 bg-primary hover:bg-primary/90" size="lg">
                  Next: Liquidity
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">Liquidity & Fees</h2>
                <p className="text-sm text-muted-foreground">Set initial liquidity and trading fees</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="liquidity">Initial Liquidity Seed (USDC)</Label>
                  <Input
                    id="liquidity"
                    type="number"
                    value={liquiditySeed}
                    onChange={(e) => setLiquiditySeed(e.target.value)}
                    className="font-mono bg-white/5 border-white/10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fee">Trading Fee (bps)</Label>
                  <Input
                    id="fee"
                    type="number"
                    value={feeBps}
                    onChange={(e) => setFeeBps(e.target.value)}
                    className="font-mono bg-white/5 border-white/10"
                  />
                  <p className="text-xs text-muted-foreground">30 bps = 0.3% fee</p>
                </div>

                {/* Preview Card */}
                <div className="p-6 rounded-lg bg-white/5 border border-white/10 space-y-4">
                  <div className="text-sm font-semibold">Market Preview</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Title</span>
                      <span className="font-semibold">{title || "Untitled Market"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Category</span>
                      <Badge variant="outline">{category || "Uncategorized"}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Domain</span>
                      <span className="font-mono">
                        [{minBound}, {maxBound}] {unit}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prior</span>
                      <span className="font-mono">{priorKind}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Initial Liquidity</span>
                      <span className="font-mono">${liquiditySeed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fee</span>
                      <span className="font-mono">{feeBps} bps</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-xs text-muted-foreground">
                    Note: Creators post bond; clean resolution refunds bond and shares 0.1% fees
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Button onClick={() => setStep(2)} variant="outline" size="lg" className="flex-1">
                  <ArrowLeft className="mr-2 w-4 h-4" />
                  Back
                </Button>
                <Button onClick={handleCreate} className="flex-1 bg-primary hover:bg-primary/90" size="lg">
                  Create Market
                  <CheckCircle className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </Card>
      </div>
    </div>
  )
}
