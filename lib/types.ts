// Core data types for Trojan DeFi

export type Market = {
  id: string
  title: string
  unit: "%" | "USD" | "°C" | "other"
  domain: { min: number; max: number }
  prior: {
    kind: "normal" | "lognormal" | "beta" | "uniform"
    params: Record<string, number>
  }
  liquidityUSD: number
  vol24hUSD: number
  category: string
  resolvesAt?: string
  description?: string
  expiry: string
  coefficients: number[]
  ranges?: [number, number][]
  createdAt: string
  txSignature: string
  stats: {
    mean: number
    variance: number
    skew: number
    kurtosis: number
  }
}

export type PdfPoint = {
  x: number
  y: number
}

export type Ticket = {
  id: string
  marketId: string
  authority: string
  coefficients: number[]
  amount: number
  createdAt: string
  txSignature: string
}

export type Trade = {
  id: string
  marketId: string
  side: "buy" | "sell"
  range: [number, number]
  notionalUSD: number
  deltaMass: number
  feeUSD: number
  createdAt: string
}

export type Position = {
  id: string
  marketId: string
  marketTitle: string
  range: [number, number]
  massOwned: number
  costUSD: number
  markValueUSD: number
  pnlUSD: number
  createdAt: string
}

export type PortfolioSummary = {
  netExposureUSD: number
  realizedPnL: number
  unsettledPnL: number
  openPositions: number
}
