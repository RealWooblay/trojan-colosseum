// Mock data for seeded markets

import type { Market } from "./types"

export const MOCK_MARKETS: Market[] = [
  {
    id: "eth-price-2025",
    title: "ETH Price on Dec 31, 2025",
    unit: "USD",
    domain: { min: 0, max: 10000 },
    prior: {
      kind: "lognormal",
      params: { mu: 8.2, sigma: 0.5 },
    },
    liquidityUSD: 125000,
    vol24hUSD: 8500,
    category: "Crypto",
    resolvesAt: "2025-12-31T23:59:59Z",
    stats: {
      mean: 3800,
      variance: 450000,
      skew: 0.8,
      kurtosis: 3.2,
    },
  },
  {
    id: "us-cpi-q2-2025",
    title: "US CPI YoY Q2 2025",
    unit: "%",
    domain: { min: 0, max: 10 },
    prior: {
      kind: "normal",
      params: { mean: 2.5, variance: 0.8 },
    },
    liquidityUSD: 85000,
    vol24hUSD: 4200,
    category: "Economics",
    resolvesAt: "2025-06-30T23:59:59Z",
    stats: {
      mean: 2.5,
      variance: 0.8,
      skew: 0.1,
      kurtosis: 2.9,
    },
  },
  {
    id: "global-temp-2035",
    title: "Global Temp Anomaly 2035",
    unit: "°C",
    domain: { min: 0, max: 4 },
    prior: {
      kind: "normal",
      params: { mean: 1.8, variance: 0.3 },
    },
    liquidityUSD: 65000,
    vol24hUSD: 2100,
    category: "Climate",
    resolvesAt: "2035-12-31T23:59:59Z",
    stats: {
      mean: 1.8,
      variance: 0.3,
      skew: 0.2,
      kurtosis: 2.8,
    },
  },
  {
    id: "sp500-return-2025",
    title: "S&P 500 Annual Return 2025",
    unit: "%",
    domain: { min: -40, max: 60 },
    prior: {
      kind: "normal",
      params: { mean: 8, variance: 180 },
    },
    liquidityUSD: 210000,
    vol24hUSD: 15000,
    category: "Finance",
    resolvesAt: "2025-12-31T23:59:59Z",
    stats: {
      mean: 8,
      variance: 180,
      skew: -0.1,
      kurtosis: 3.5,
    },
  },
  {
    id: "ai-benchmark-2026",
    title: "AI Benchmark Score 2026",
    unit: "other",
    domain: { min: 0, max: 100 },
    prior: {
      kind: "beta",
      params: { alpha: 5, beta: 2 },
    },
    liquidityUSD: 95000,
    vol24hUSD: 6800,
    category: "Technology",
    resolvesAt: "2026-12-31T23:59:59Z",
    stats: {
      mean: 71.4,
      variance: 120,
      skew: -0.5,
      kurtosis: 2.4,
    },
  },
]
