"use client"
"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fmtPct, fmtUSD, fmtNum } from "@/lib/formatters"
import { TrendingUp, TrendingDown, Plus, Minus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Market, PdfPoint, Ticket } from "@/lib/types"
import { rangesToCoefficients, MAX_COEFFICIENTS, MAX_RANGE_SLOTS, normalizeAlpha } from "@/lib/trade-utils"
import { buyTransaction, getTicket, getTotalTickets, sellTransaction } from "@/lib/sonormal/program"
import { useAppKitProvider, useAppKitAccount } from "@reown/appkit/react"
import type { Provider } from "@reown/appkit-adapter-solana/react"
import { VersionedTransaction, PublicKey, TransactionMessage, TransactionInstruction, Connection, Transaction } from "@solana/web3.js"
import { appendStoredTicket, findStoredTicket, findStoredTicketsByAuthorityAndMarketId, updateStoredTicket } from "@/lib/storage"
import { fetchSellMath } from "@/lib/sonormal/math"

interface TradePanelProps {
  market: Market
  marketPdf?: PdfPoint[]
  selectedRanges?: [number, number][]
  onTradePreview: (side: "buy" | "sell", amount: number, coefficients?: number[]) => void
  onAddRange?: () => void
  onRemoveRange?: (index: number) => void
  onUpdateRange?: (index: number, range: [number, number]) => void
  tradePreview?: {
    deltaMass: number
    costUSD: number
    feeUSD: number
    impliedShift: { deltaMean: number; deltaVariance: number }
    rangeProbAfter: number
  }
}

export function TradePanel({
  market,
  marketPdf,
  selectedRanges,
  onTradePreview,
  onAddRange,
  onRemoveRange,
  onUpdateRange,
  tradePreview,
}: TradePanelProps) {
  const { walletProvider } = useAppKitProvider<Provider>("solana");
  const { address, isConnected } = useAppKitAccount();

  const [tickets, setTickets] = useState<Ticket[]>([]);

  const domain = market.domain
  const ranges = selectedRanges || [[domain.min, domain.max]]

  const [buyAmount, setBuyAmount] = useState("500")
  const [side, setSide] = useState<"buy" | "sell">("buy")
  const [selectedTicketId, setSelectedTicketId] = useState<string>("")
  const [sellPercent, setSellPercent] = useState("")
  const [errors, setErrors] = useState<{ amount?: string; ticket?: string; sellPercent?: string }>({})
  const { toast } = useToast()
  const isBuy = side === "buy"

  const coefficients = useMemo(() => {
    return rangesToCoefficients(ranges, domain, MAX_COEFFICIENTS, marketPdf)
  }, [ranges, domain.min, domain.max, marketPdf])

  const weightSum = useMemo(() => coefficients.reduce((sum, weight) => sum + weight, 0), [coefficients])

  useEffect(() => {
    if (isBuy) {
      const num = Number.parseFloat(buyAmount)
      const needsCoefficients = isBuy
      const hasCoefficients = coefficients.length > 0

      if (!isNaN(num) && (!needsCoefficients || hasCoefficients)) {
        const timeoutId = setTimeout(() => {
          onTradePreview(side, num, isBuy ? coefficients : undefined)
        }, 150)
        return () => clearTimeout(timeoutId)
      }
    } else {
      const num = Number.parseFloat(sellPercent)
      if (!isNaN(num) && selectedTicketId) {
        const selectedTicket = tickets.find(t => t.id === selectedTicketId)
        if (selectedTicket) {
          const sellAmount = (selectedTicket.collateralAmount / (10 ** 6)) * (num / 100)
          const timeoutId = setTimeout(() => {
            onTradePreview(side, sellAmount)
          }, 150)
          return () => clearTimeout(timeoutId)
        }
      }
    }
  }, [buyAmount, sellPercent, side, coefficients, isBuy, onTradePreview, selectedTicketId, tickets])

  useEffect(() => {
    if (!address) return;
    findStoredTicketsByAuthorityAndMarketId(address, market.id)
      .then((tickets) => {
        setTickets(tickets.filter(ticket => ticket.claimAmount > 0))
      })
      .catch((error) => {
        console.error(error)
      })
  }, [address, market.id])

  const handleAmountChange = (value: string) => {
    setBuyAmount(value)
    const num = Number.parseFloat(value)
    if (isNaN(num)) {
      setErrors((prev) => ({ ...prev, amount: "Invalid amount" }))
    } else {
      setErrors((prev) => ({ ...prev, amount: undefined }))
    }
  }

  const adjustAmount = (delta: number) => {
    const current = Number.parseFloat(buyAmount) || 0
    setBuyAmount((current + delta).toString())
  }

  const adjustSellPercent = (delta: number) => {
    const current = Number.parseFloat(sellPercent) || 0
    setSellPercent((current + delta).toString())
  }

  const handleSellPercentChange = (value: string) => {
    setSellPercent(value)
    const num = Number.parseFloat(value)

    if (isNaN(num)) {
      setErrors((prev) => ({ ...prev, sellPercent: "Invalid percentage" }))
    } else if (num < 0) {
      setErrors((prev) => ({ ...prev, sellPercent: "Percentage cannot be negative" }))
    } else if (num > 100) {
      setErrors((prev) => ({ ...prev, sellPercent: "Percentage cannot exceed 100%" }))
    } else {
      setErrors((prev) => ({ ...prev, sellPercent: undefined }))
    }
  }

  const handleTicketSelect = (ticketId: string) => {
    setSelectedTicketId(ticketId)
    setErrors((prev) => ({ ...prev, ticket: undefined }))
    // Reset sell percent when ticket changes
    setSellPercent("")
  }

  const handleConfirm = async () => {
    if (!address || !isConnected) {
      toast({
        title: "Not connected",
        description: "Please connect your wallet to trade.",
        variant: "destructive",
      })
      return
    }

    if (isBuy) {
      await handleBuy(address)
    } else {
      await handleSell(address)
    }
  }

  const handleBuy = async (address: string) => {
    const num = Number.parseFloat(buyAmount)

    const alpha = normalizeAlpha(coefficients)

    if (!alpha.some((value) => value > 0)) {
      toast({
        title: "Add a coefficient",
        description: "Create at least one range to generate coefficients.",
        variant: "destructive",
      })
      return
    }

    if (isNaN(num)) {
      toast({
        title: "Invalid amount",
        description: "Invalid amount provided",
        variant: "destructive",
      })
      return
    }

    try {
      const transactionAmount = Number.parseFloat(buyAmount);
      const transaction = await buyTransaction(
        Number(market.id),
        address,
        address,
        coefficients,
        Math.trunc(transactionAmount * (10 ** 6))
      )
      if (!transaction.success) {
        toast({
          title: "Trade failed",
          description: typeof transaction.error === 'string' ? transaction.error : transaction.error?.message || 'Transaction failed',
          variant: "destructive",
        })
        return
      }

      const versionedTransaction = VersionedTransaction.deserialize(transaction.transaction);

      const result = await walletProvider.signAndSendTransaction(versionedTransaction, {
        skipPreflight: false,
      });

      const totalTickets = await getTotalTickets(market.id);
      if (!totalTickets) {
        toast({
          title: "Failed to retrieve ticket ID",
          description: "Please try again",
          variant: "destructive",
        })
        return
      }

      const ticket = await getTicket(market.id, (totalTickets - 1).toString());
      if (!ticket) {
        toast({
          title: "Failed to retrieve ticket",
          description: "Please try again",
          variant: "destructive",
        })
        return
      }

      await appendStoredTicket({
        id: (totalTickets - 1).toString(),
        marketId: market.id,
        authority: address,
        pTrade: coefficients,
        collateralAmount: Math.trunc(transactionAmount * (10 ** 6)),
        claimAmount: ticket.claim,
        realizedAmount: 0,
        createdAt: new Date().toISOString(),
        txSignature: result,
      });

      toast({
        title: "Buy successful",
        description: (
          <a
            href={`https://solscan.io/tx/${result}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-cyan-400"
          >
            View on Solscan
          </a>
        ),
        variant: "default",
      })
    } catch (error) {
      console.error("Trade error:", error);
      toast({
        title: "Trade failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    }
  }

  const handleSell = async (address: string) => {
    try {
      if (!selectedTicketId) {
        toast({
          title: "Select a ticket",
          description: "Please select a ticket to sell from.",
          variant: "destructive",
        })
        return
      }

      const sellPercentValue = Number.parseFloat(sellPercent);
      if (isNaN(sellPercentValue) || sellPercentValue <= 0 || sellPercentValue > 100) {
        toast({
          title: "Invalid percentage",
          description: "Please enter a valid percentage between 0 and 100",
          variant: "destructive",
        })
        return
      }

      const ticket = await findStoredTicket(selectedTicketId);
      if (!ticket) {
        toast({
          title: "Failed to retrieve ticket",
          description: "Please try again",
          variant: "destructive",
        })
        return
      }

      const claimAmount = (sellPercentValue / 100) * ticket.claimAmount;

      const transactionResult = await sellTransaction(
        Number(market.id),
        Number(ticket.id),
        address,
        address,
        claimAmount
      );
      if (!transactionResult.success) {
        toast({
          title: "Trade failed",
          description: typeof transactionResult.error === 'string' ? transactionResult.error : transactionResult.error?.message || 'Transaction failed',
          variant: "destructive",
        })
        return
      }

      const transaction = VersionedTransaction.deserialize(transactionResult.transaction);

      const signature = await walletProvider.signAndSendTransaction(transaction, {
        skipPreflight: false,
        maxRetries: 3,
        preflightCommitment: 'confirmed',
      });

      const updatedTicket = {
        ...ticket,
        claimAmount: ticket.claimAmount - claimAmount,
        realizedAmount: Math.trunc((Number(ticket.realizedAmount) + (Number(transactionResult.tStar) * (10 ** 6)))),
      }
      await updateStoredTicket(updatedTicket);

      toast({
        title: "Buy successful",
        description: (
          <a
            href={`https://solscan.io/tx/${signature}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-cyan-400"
          >
            View on Solscan
          </a>
        ),
        variant: "default",
      })
    } catch (error) {
      console.error("Trade error:", error);
      toast({
        title: "Trade failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    }
  }

  const isValidAmount = isBuy ? (!errors.amount && !isNaN(Number.parseFloat(buyAmount))) : (!errors.sellPercent && !isNaN(Number.parseFloat(sellPercent)) && selectedTicketId && Number.parseFloat(sellPercent) > 0 && Number.parseFloat(sellPercent) <= 100)
  const hasCoefficients = coefficients.length === market.alpha.length

  return (
    <div className="glass-card p-6 space-y-6 sticky top-20">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Trade Probability in Selected Band</h2>
        <p className="text-xs text-muted-foreground">
          You are {side === "buy" ? "buying" : "selling"} probability mass;{" "}
          {side === "buy" ? "increasing" : "decreasing"} it here {side === "buy" ? "decreases" : "increases"} it
          elsewhere (unified pool).
        </p>
        {isBuy ? (
          <p className="text-xs text-muted-foreground">
            Each range contributes a weight coefficient. We send up to eight coefficients plus your total amount.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Selling only requires an amount. Existing exposure determines the curve—no range edits needed.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Side</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={side === "buy" ? "default" : "outline"}
            onClick={() => setSide("buy")}
            className={side === "buy" ? "bg-primary" : ""}
          >
            Buy Mass
          </Button>
          <Button
            variant={side === "sell" ? "default" : "outline"}
            onClick={() => setSide("sell")}
            className={side === "sell" ? "bg-destructive" : ""}
          >
            Sell Mass
          </Button>
        </div>
      </div>

      {/* Ticket Selection for Sell */}
      {!isBuy && (
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Select Ticket</Label>
          {tickets.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">No tickets found for this market</p>
              <p className="text-xs mt-1">You need to buy tickets first before you can sell</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedTicketId === ticket.id
                    ? 'border-cyan-400 bg-cyan-400/10'
                    : 'border-white/10 hover:border-white/20'
                    }`}
                  onClick={() => handleTicketSelect(ticket.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-mono">Ticket #{ticket.id}</div>
                      <div className="text-xs text-muted-foreground">
                        ${(ticket.collateralAmount / (10 ** 6)).toFixed(2)} • {new Date(ticket.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {selectedTicketId === ticket.id ? '✓' : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {errors.ticket && <p className="text-xs text-destructive">{errors.ticket}</p>}
        </div>
      )}

      {/* Multi-Range Management */}
      {isBuy && selectedRanges && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">BETTING RANGES</Label>
            {onAddRange && (
              <Button
                onClick={onAddRange}
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0 border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/10 disabled:opacity-40"
                disabled={ranges.length >= MAX_RANGE_SLOTS}
              >
                <Plus className="w-4 h-4" />
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {ranges.map((range, index) => {
              const colors = [
                { bg: "bg-cyan-500/10", border: "border-cyan-400/50", text: "text-cyan-300", handle: "bg-cyan-400" },
                { bg: "bg-orange-500/10", border: "border-orange-400/50", text: "text-orange-300", handle: "bg-orange-400" },
                { bg: "bg-teal-500/10", border: "border-teal-400/50", text: "text-teal-300", handle: "bg-teal-400" },
                { bg: "bg-blue-500/10", border: "border-blue-400/50", text: "text-blue-300", handle: "bg-blue-400" },
                { bg: "bg-green-500/10", border: "border-green-400/50", text: "text-green-300", handle: "bg-green-400" },
              ]
              const colorSet = colors[index % colors.length]

              return (
                <div key={index} className={`${colorSet.bg} ${colorSet.border} border rounded-lg p-3 relative`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`${colorSet.text} text-xs font-mono font-semibold`}>
                      RANGE {index + 1}
                    </div>
                    <div className={`${colorSet.text} text-xs font-mono`}>
                      {range[1] - range[0] > 0 ? `${((range[1] - range[0]) / (market.domain.max - market.domain.min) * 100).toFixed(1)}%` : '0%'} width
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Min</label>
                        <Input
                          type="number"
                          value={range[0].toFixed(2)}
                          onChange={(e) => {
                            const value = Number.parseFloat(e.target.value)
                            if (!isNaN(value) && onUpdateRange) {
                              onUpdateRange(index, [value, range[1]])
                            }
                          }}
                          placeholder="Min"
                          step={1}
                          className={`font-mono bg-black/80 ${colorSet.border} text-white placeholder:text-cyan-300 focus:border-cyan-400 text-xs`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Max</label>
                        <Input
                          type="number"
                          value={range[1].toFixed(2)}
                          onChange={(e) => {
                            const value = Number.parseFloat(e.target.value)
                            if (!isNaN(value) && onUpdateRange) {
                              onUpdateRange(index, [range[0], value])
                            }
                          }}
                          placeholder="Max"
                          step={1}
                          className={`font-mono bg-black/80 ${colorSet.border} text-white placeholder:text-cyan-300 focus:border-cyan-400 text-xs`}
                        />
                      </div>
                    </div>

                    {onRemoveRange && ranges.length > 1 && (
                      <Button
                        onClick={() => onRemoveRange(index)}
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 border-red-400/50 text-red-400 hover:bg-red-400/10 self-end"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Visual range indicator */}
                  <div className="mt-2 h-2 bg-black/50 rounded-full relative overflow-hidden">
                    <div
                      className={`absolute top-0 h-full ${colorSet.handle} opacity-60`}
                      style={{
                        left: `${((range[0] - market.domain.min) / (market.domain.max - market.domain.min)) * 100}%`,
                        width: `${((range[1] - range[0]) / (market.domain.max - market.domain.min)) * 100}%`
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="text-xs text-cyan-300 font-mono tracking-wide">
            TOTAL RANGES: {ranges.length}/{MAX_RANGE_SLOTS} • Each range contributes two coefficients (center & width)
          </div>
        </div>
      )}

      {/* Amount Input - Different for Buy vs Sell */}
      {isBuy ? (
        <div className="space-y-2">
          <Label>Total Amount (USDC)</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={buyAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="500"
              className={`font-mono bg-white/5 border-white/10 flex-1 ${errors.amount ? "border-destructive" : ""}`}
            />
            <Button variant="outline" size="icon" onClick={() => adjustAmount(-100)}>
              <Minus className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => adjustAmount(100)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setBuyAmount("250")} className="text-xs">
              Quick $250
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setBuyAmount("1000")} className="text-xs">
              Reset $1k
            </Button>
          </div>
          {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Sell Percentage (%)</Label>
          {selectedTicketId ? (
            <>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={sellPercent}
                  onChange={(e) => handleSellPercentChange(e.target.value)}
                  placeholder="0"
                  min="0"
                  max="100"
                  className={`font-mono bg-white/5 border-white/10 flex-1 ${errors.sellPercent ? "border-destructive" : ""}`}
                />
                <Button variant="outline" size="icon" onClick={() => adjustSellPercent(-10)}>
                  <Minus className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => adjustSellPercent(10)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSellPercent("25")}
                  className="text-xs"
                >
                  25%
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSellPercent("50")}
                  className="text-xs"
                >
                  50%
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSellPercent("75")}
                  className="text-xs"
                >
                  75%
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSellPercent("100")}
                  className="text-xs"
                >
                  Max
                </Button>
              </div>
              {errors.sellPercent && <p className="text-xs text-destructive">{errors.sellPercent}</p>}
              {selectedTicketId && !errors.sellPercent && sellPercent && (
                <p className="text-xs text-muted-foreground">
                  Selling: {(tickets.find(t => t.id === selectedTicketId)?.collateralAmount || 0) / (10 ** 6) * (Number.parseFloat(sellPercent) / 100)} USDC
                </p>
              )}
            </>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <p className="text-sm">Select a ticket above to specify sell percentage</p>
            </div>
          )}
        </div>
      )}

      {isBuy && (
        <div className="space-y-2">
          <Label>Coefficient Payload ({coefficients.length}/{MAX_COEFFICIENTS})</Label>
          {coefficients.some((value) => value > 0) ? (
            <div className="space-y-2">
              {coefficients.map((value, index) => (
                <div
                  key={index}
                  className="flex justify-between bg-black/60 border border-white/10 rounded-md p-2 text-xs font-mono text-white/90"
                >
                  <span>c{index + 1}</span>
                  <span className="text-primary">{(value * 100).toFixed(2)}%</span>
                </div>
              ))}
              <div className="text-[11px] text-muted-foreground">
                Weight sum:{" "}
                <span className={`font-semibold ${Math.abs(weightSum - 1) < 1e-6 ? "text-primary" : "text-yellow-400"}`}>
                  {(weightSum * 100).toFixed(2)}%
                </span>{" "}
                (auto-normalized)
              </div>
              <p className="text-xs text-muted-foreground">
                We send up to eight weights to the program. Adjust your ranges to rebalance them.
              </p>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              Add a range to generate coefficients. We can transmit up to eight ranges.
            </div>
          )}
        </div>
      )}

      {tradePreview && (
        <div className="space-y-3 p-4 rounded-lg bg-white/5 border border-white/10">
          <div className="text-sm font-semibold">Live Outputs</div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ΔMass</span>
              <span className="font-mono font-bold">{fmtPct(tradePreview.deltaMass * 100)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Est. {side === "buy" ? "Cost" : "Proceeds"}</span>
              <span className="font-mono font-bold">{fmtUSD(tradePreview.costUSD)}</span>
            </div>
            {/*
            <div className="flex justify-between">
              <span className="text-muted-foreground">Implied Δμ</span>
              <span className="font-mono font-bold flex items-center gap-1">
                {tradePreview.impliedShift.deltaMean > 0 ? (
                  <TrendingUp className="w-3 h-3 text-primary" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-destructive" />
                )}
                {fmtNum(tradePreview.impliedShift.deltaMean)}
              </span>
            </div>
            */}
            {/*
            <div className="flex justify-between">
              <span className="text-muted-foreground">Implied Δσ²</span>
              <span className="font-mono font-bold">{fmtNum(tradePreview.impliedShift.deltaVariance)}</span>
            </div>
            */}
            <div className="flex justify-between pt-2 border-t border-white/5">
              <span className="text-muted-foreground">Range Prob After</span>
              <span className="font-mono font-bold text-primary">{fmtPct(tradePreview.rangeProbAfter * 100)}</span>
            </div>
          </div>
        </div>
      )}

      <Button
        onClick={handleConfirm}
        className={`w-full ${side === "buy" ? "bg-gradient-to-r from-cyan-500 to-primary hover:from-cyan-600 hover:to-primary/90" : "bg-gradient-to-r from-destructive to-red-600 hover:from-destructive/90 hover:to-red-700"}`}
        size="lg"
        disabled={!isValidAmount || (isBuy && !hasCoefficients)}
      >
        {side === "buy" ? "Confirm Buy" : selectedTicketId ? "Confirm Sell" : "Select Ticket First"}
      </Button>
    </div>
  )
}
