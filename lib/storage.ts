import { promises as fs } from "fs"
import path from "path"
import type { Market } from "./types"

const DATA_DIR = path.join(process.cwd(), "data")
const DB_PATH = path.join(DATA_DIR, "markets.json")

export type StoredMarket = Market & {
  coefficients: number[]
  ranges: [number, number][]
  expiry: string
  createdAt: string
  txSignature?: string
  description?: string
}

type MarketStore = {
  markets: StoredMarket[]
}

async function ensureStore(): Promise<void> {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }

  try {
    await fs.access(DB_PATH)
  } catch {
    const seed: MarketStore = { markets: [] }
    await fs.writeFile(DB_PATH, JSON.stringify(seed, null, 2), "utf8")
  }
}

export async function readStoredMarkets(): Promise<StoredMarket[]> {
  await ensureStore()
  const raw = await fs.readFile(DB_PATH, "utf8")
  const parsed: MarketStore = JSON.parse(raw)
  return parsed.markets || []
}

export async function writeStoredMarkets(markets: StoredMarket[]): Promise<void> {
  await ensureStore()
  const payload: MarketStore = { markets }
  await fs.writeFile(DB_PATH, JSON.stringify(payload, null, 2), "utf8")
}

export async function appendStoredMarket(market: StoredMarket): Promise<StoredMarket> {
  const markets = await readStoredMarkets()
  const filtered = markets.filter((existing) => existing.id !== market.id)
  filtered.push(market)
  await writeStoredMarkets(filtered)
  return market
}

export async function findStoredMarket(id: string): Promise<StoredMarket | undefined> {
  const markets = await readStoredMarkets()
  return markets.find((market) => market.id === id)
}
