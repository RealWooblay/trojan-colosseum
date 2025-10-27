"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PdfChart } from "@/components/pdf-chart"
import { useToast } from "@/hooks/use-toast"
import { generateUniformPdf, projectGhostFromRanges } from "@/lib/pdf-utils"
import type { PdfPoint } from "@/lib/types"
import { ArrowLeft, ArrowRight, CheckCircle, Plus, Minus } from "lucide-react"
import { motion } from "framer-motion"
import { MAX_RANGE_SLOTS, rangesToCoefficients } from "@/lib/trade-utils"

const DOMAIN = { min: 0, max: 100 }

export default function CreateMarketPage() {
  const { toast } = useToast()
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("")
  const [unit, setUnit] = useState<"%" | "USD" | "°C" | "other">("USD")
  const [description, setDescription] = useState("")
  const [expiry, setExpiry] = useState("")
  const [ranges, setRanges] = useState<[number, number][]>([[20, 40]])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const basePdf: PdfPoint[] = useMemo(() => generateUniformPdf(DOMAIN), [])
  const ghostPdf: PdfPoint[] = useMemo(() => {
    if (ranges.length === 0) return basePdf
    return projectGhostFromRanges(basePdf, ranges, DOMAIN)
  }, [basePdf, ranges])

  const coefficients = useMemo(
    () => rangesToCoefficients(ranges, DOMAIN, MAX_RANGE_SLOTS, basePdf),
    [ranges, basePdf],
  )
  const weightSum = useMemo(() => coefficients.reduce((sum, weight) => sum + weight, 0), [coefficients])

  const canProceedStepOne = title.trim().length > 2 && category.trim().length > 0 && expiry.length > 0

  const addRange = () => {
    if (ranges.length >= MAX_RANGE_SLOTS) return
    const width = (DOMAIN.max - DOMAIN.min) * 0.2
    const start = DOMAIN.min + ranges.length * 5
    const newRange: [number, number] = [start, Math.min(DOMAIN.max, start + width)]
    setRanges((prev) => [...prev, newRange])
  }

  const updateRange = (index: number, nextRange: [number, number]) => {
    setRanges((prev) => {
      const cloned = [...prev]
      cloned[index] = [
        Math.max(DOMAIN.min, Math.min(nextRange[0], nextRange[1])),
        Math.min(DOMAIN.max, Math.max(nextRange[0], nextRange[1])),
      ]
      return cloned
    })
  }

  const removeRange = (index: number) => {
    if (ranges.length <= 1) return
    setRanges((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (isSubmitting) return

    if (!expiry || coefficients.length === 0 || !coefficients.some((value) => value > 0)) {
      toast({
        title: "Missing data",
        description: "Add an expiry and at least one non-zero coefficient.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/markets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          unit,
          expiry,
          coefficients,
          ranges,
        }),
      })

      const created = await response.json().catch(() => null)

      if (!response.ok || !created) {
        throw created || { error: "Failed to create market" }
      }

      toast({
        title: "Market created",
        description: created.txSignature ? (
          <a
            href={`https://solscan.io/tx/${created.txSignature}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-cyan-400"
          >
            View on Solscan
          </a>
        ) : "Stored locally.",
      })

      router.push("/markets")
    } catch (error: any) {
      toast({
        title: "Creation failed",
        description: (
          <div className="space-y-1">
            <div>{error?.error || error?.message || "Please try again."}</div>
            {error?.logs && Array.isArray(error.logs) && error.logs.length > 0 && (
              <details className="text-xs text-muted-foreground">
                <summary>View logs</summary>
                <pre className="whitespace-pre-wrap break-words max-h-40 overflow-y-auto">{error.logs.join("\n")}</pre>
              </details>
            )}
          </div>
        ),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-black tron-grid">
      <Navbar />

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-white font-mono tracking-wider">LAUNCH A MARKET</h1>
          <div className="h-1 w-40 bg-gradient-to-r from-cyan-400 to-transparent"></div>
          <p className="text-xl text-cyan-200 font-mono tracking-wide">
            Configure coefficients & expiry, then broadcast via the Sonormal program.
          </p>
        </motion.div>

        <div className="flex items-center justify-center gap-6 mb-16">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-4">
              <div
                className={`w-12 h-12 border-2 flex items-center justify-center font-bold font-mono tracking-wider transition-all duration-300 ${
                  s === step
                    ? "border-cyan-400 bg-cyan-400 text-black neon-glow"
                    : s < step
                      ? "border-cyan-400/50 bg-cyan-400/20 text-cyan-400"
                      : "border-cyan-400/30 bg-black/50 text-cyan-300"
                }`}
              >
                {s < step ? <CheckCircle className="w-6 h-6" /> : s}
              </div>
              {s < 2 && <div className="w-16 h-0.5 bg-gradient-to-r from-cyan-400/50 to-transparent" />}
            </div>
          ))}
        </div>

        <div className="tron-card p-8 relative overflow-hidden">
          <div className="absolute top-4 left-4 w-2 h-2 bg-cyan-400/60"></div>
          <div className="absolute top-4 right-4 w-2 h-2 bg-cyan-400/60"></div>
          <div className="absolute bottom-4 left-4 w-2 h-2 bg-cyan-400/60"></div>
          <div className="absolute bottom-4 right-4 w-2 h-2 bg-cyan-400/60"></div>

          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
              <div className="space-y-3">
                <h2 className="text-3xl font-bold text-cyan-400 neon-glow font-mono tracking-wider">Market metadata</h2>
                <p className="text-sm text-cyan-200 font-mono tracking-wide">
                  Store the off-chain context—only coefficients + expiry hit chain.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-cyan-300 font-mono tracking-wide">Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Bitcoin price on Dec 31, 2025"
                    className="bg-black/70 border-cyan-400/30 text-white placeholder:text-cyan-200"
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-cyan-300 font-mono tracking-wide">Category</Label>
                    <Input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g., Crypto"
                      className="bg-black/70 border-cyan-400/30 text-white placeholder:text-cyan-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-cyan-300 font-mono tracking-wide">Unit</Label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value as any)}
                      className="w-full bg-black/70 border border-cyan-400/30 text-white rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:border-cyan-400"
                    >
                      <option value="USD">USD</option>
                      <option value="%">Percent</option>
                      <option value="°C">°C</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-cyan-300 font-mono tracking-wide">Expiry</Label>
                    <Input
                      type="datetime-local"
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      className="bg-black/70 border-cyan-400/30 text-white placeholder:text-cyan-200"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-cyan-300 font-mono tracking-wide">Description</Label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Why does this market matter? What will resolve it?"
                    className="w-full h-28 bg-black/70 border border-cyan-400/30 rounded-md px-3 py-2 text-sm text-white placeholder:text-cyan-200 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <span className="text-xs text-muted-foreground">Step 1 of 2</span>
                <Button onClick={() => setStep(2)} disabled={!canProceedStepOne}>
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
              <div className="space-y-3">
                <h2 className="text-3xl font-bold text-cyan-400 neon-glow font-mono tracking-wider">
                  Shape your coefficients
                </h2>
                <p className="text-sm text-cyan-200 font-mono tracking-wide">
                  Up to eight ranges → eight coefficients. We normalize weights so they sum to 1.
                </p>
              </div>

              <div className="space-y-4">
                {ranges.map((range, index) => (
                  <div key={index} className="bg-black/60 border border-white/10 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-cyan-300 font-mono">Range {index + 1}</div>
                      {ranges.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRange(index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Min</Label>
                        <Input
                          type="number"
                          min={DOMAIN.min}
                          max={range[1]}
                          value={range[0]}
                          onChange={(e) => {
                            const next = Number(e.target.value)
                            if (Number.isNaN(next)) return
                            updateRange(index, [next, range[1]])
                          }}
                          className="bg-black/70 border-white/10 text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Max</Label>
                        <Input
                          type="number"
                          min={range[0]}
                          max={DOMAIN.max}
                          value={range[1]}
                          onChange={(e) => {
                            const next = Number(e.target.value)
                            if (Number.isNaN(next)) return
                            updateRange(index, [range[0], next])
                          }}
                          className="bg-black/70 border-white/10 text-white"
                        />
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      Width: {((range[1] - range[0]) / (DOMAIN.max - DOMAIN.min) * 100).toFixed(1)}% of domain
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={addRange}
                  disabled={ranges.length >= MAX_RANGE_SLOTS}
                  variant="outline"
                  className="border-cyan-400/40 text-cyan-300 hover:bg-cyan-400/10"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add range
                </Button>
              </div>

              <div className="space-y-6">
                <PdfChart
                  data={basePdf}
                  ghostData={ghostPdf}
                  ghostType="range-prediction"
                  selectedRanges={ranges}
                  domain={DOMAIN}
                  unit={unit}
                  liquidityDepth={100000}
                  onUpdateRange={updateRange}
                />

                <div className="space-y-2 bg-black/50 border border-white/10 rounded-lg p-4">
                  <div className="text-xs text-muted-foreground uppercase font-mono tracking-widest">Coefficient weights</div>
                  {coefficients.some((value) => value > 0) ? (
                    <div className="space-y-2">
                      {coefficients.map((value, index) => (
                        <div key={index} className="flex justify-between text-sm font-mono">
                          <span className="text-muted-foreground">c{index + 1}</span>
                          <span className="text-primary font-semibold">{(value * 100).toFixed(2)}%</span>
                        </div>
                      ))}
                      <div className="text-xs text-muted-foreground font-mono">
                        Weight sum:{" "}
                        <span className={Math.abs(weightSum - 1) < 1e-6 ? "text-primary font-semibold" : "text-yellow-400"}>
                          {(weightSum * 100).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      Add at least one range to generate coefficients.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col md:flex-row justify-between gap-4 pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || coefficients.length === 0}
                  className="bg-gradient-to-r from-cyan-500 to-primary hover:from-cyan-600 hover:to-primary/90"
                >
                  {isSubmitting ? "Creating..." : "Create Market"}
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
