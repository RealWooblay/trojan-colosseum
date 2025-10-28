"use server";

import { promises as fs } from "fs"
import os from "os"
import path from "path"
import type { Market, Ticket } from "./types"

const KV_REST_API_URL =
  process.env.KV_REST_API_URL ??
  process.env.UPSTASH_REDIS_REST_URL ??
  process.env.UPSTASH_KV_REST_URL

const KV_REST_API_TOKEN =
  process.env.KV_REST_API_TOKEN ??
  process.env.UPSTASH_REDIS_REST_TOKEN ??
  process.env.UPSTASH_KV_REST_TOKEN
const KV_NAMESPACE = process.env.KV_NAMESPACE ?? "trojan-colosseum"
const USE_KV = Boolean(KV_REST_API_URL && KV_REST_API_TOKEN)

const PRIMARY_LOCAL_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data")
const FALLBACK_LOCAL_DIR = path.join(os.tmpdir(), "trojan-colosseum")
let activeLocalDir = PRIMARY_LOCAL_DIR

const MARKETS_FILE = "markets.json"
const TICKETS_FILE = "tickets.json"

async function readJsonFromKv(key: string): Promise<any[]> {
  if (!USE_KV) return []
  const fullKey = `${KV_NAMESPACE}:${key}`
  const response = await fetch(`${KV_REST_API_URL}/get/${encodeURIComponent(fullKey)}`, {
    headers: {
      Authorization: `Bearer ${KV_REST_API_TOKEN}`,
    },
    cache: "no-store",
  })

  if (response.status === 404) {
    return []
  }

  if (!response.ok) {
    throw new Error(`KV get failed (${response.status}): ${await response.text()}`)
  }

  const payload = await response.json()
  const raw = payload?.result
  if (typeof raw !== "string") {
    return []
  }

  let candidate = raw

  // Support legacy payloads that were stored as "value=..."
  if (candidate.startsWith("value=")) {
    candidate = candidate.slice("value=".length)
  }

  try {
    candidate = decodeURIComponent(candidate)
  } catch {
    // ignore URI decode errors
  }

  let parsed: any
  try {
    parsed = JSON.parse(candidate)
  } catch {
    parsed = JSON.parse(raw)
  }

  if (Array.isArray(parsed)) return parsed
  if (Array.isArray(parsed.data)) return parsed.data
  if (Array.isArray(parsed.markets)) return parsed.markets
  return []
}

async function writeJsonToKv(key: string, value: any): Promise<void> {
  if (!USE_KV) return
  const fullKey = `${KV_NAMESPACE}:${key}`
  const payload = JSON.stringify({ data: value })
  const encodedValue = encodeURIComponent(payload)

  const response = await fetch(`${KV_REST_API_URL}/set/${encodeURIComponent(fullKey)}/${encodedValue}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KV_REST_API_TOKEN}`,
    },
  })

  if (!response.ok) {
    throw new Error(`KV set failed (${response.status}): ${await response.text()}`)
  }
}

async function ensureLocalDir(): Promise<string> {
  try {
    await fs.mkdir(activeLocalDir, { recursive: true })
    return activeLocalDir
  } catch (error) {
    if (activeLocalDir !== FALLBACK_LOCAL_DIR) {
      activeLocalDir = FALLBACK_LOCAL_DIR
      await fs.mkdir(activeLocalDir, { recursive: true })
      return activeLocalDir
    }
    throw error
  }
}

async function ensureLocalFile(filename: string): Promise<string> {
  const dir = await ensureLocalDir()
  const filePath = path.join(dir, filename)

  try {
    await fs.access(filePath)
  } catch {
    const seed = { data: [] }
    await fs.writeFile(filePath, JSON.stringify(seed, null, 2), "utf8")
  }

  return filePath
}

async function readJsonLocally(filename: string): Promise<any[]> {
  const filePath = await ensureLocalFile(filename)
  const raw = await fs.readFile(filePath, "utf8")
  const parsed = JSON.parse(raw)
  if (Array.isArray(parsed)) return parsed
  if (Array.isArray(parsed.data)) return parsed.data
  if (Array.isArray(parsed.markets)) return parsed.markets
  return []
}

async function writeJsonLocally(filename: string, value: any): Promise<void> {
  const filePath = await ensureLocalFile(filename)
  await fs.writeFile(filePath, JSON.stringify({ data: value }, null, 2), "utf8")
}

async function readStore(filename: string): Promise<any[]> {
  if (USE_KV) {
    try {
      return await readJsonFromKv(filename)
    } catch (error) {
      console.error("[storage] KV read failed, falling back to local file:", error)
    }
  }
  return await readJsonLocally(filename)
}

async function writeStore(filename: string, value: any): Promise<void> {
  if (USE_KV) {
    try {
      await writeJsonToKv(filename, value)
      return
    } catch (error) {
      console.error("[storage] KV write failed, falling back to local file:", error)
    }
  }
  await writeJsonLocally(filename, value)
}

export async function readStoredMarkets(): Promise<Market[]> {
  return await readStore(MARKETS_FILE)
}

export async function readStoredTickets(): Promise<Ticket[]> {
  return await readStore(TICKETS_FILE)
}

export async function writeStoredMarkets(markets: Market[]): Promise<void> {
  await writeStore(MARKETS_FILE, markets)
}

export async function writeStoredTickets(tickets: Ticket[]): Promise<void> {
  await writeStore(TICKETS_FILE, tickets)
}

export async function appendStoredMarket(market: Market): Promise<void> {
  const markets = await readStoredMarkets()
  const filtered = markets.filter((existing) => existing.id !== market.id)
  filtered.push(market)
  await writeStoredMarkets(filtered)
}

export async function appendStoredTicket(ticket: Ticket): Promise<void> {
  const tickets = await readStoredTickets()
  const filtered = tickets.filter((existing) => existing.id !== ticket.id)
  filtered.push(ticket)
  await writeStoredTickets(filtered)
}

export async function updateStoredTicket(ticket: Ticket): Promise<void> {
  const tickets = await readStoredTickets()
  const index = tickets.findIndex((existing) => existing.id === ticket.id);
  if (index !== -1) {
    tickets[index] = ticket
    await writeStoredTickets(tickets)
  }
}

export async function findStoredMarket(id: string): Promise<Market | undefined> {
  const markets = await readStoredMarkets()
  return markets.find((market) => market.id === id)
}

export async function findStoredTicket(id: string): Promise<Ticket | undefined> {
  const tickets = await readStoredTickets()
  return tickets.find((ticket) => ticket.id === id)
}

export async function findStoredTicketsByAuthority(authority: string): Promise<Ticket[]> {
  const tickets = await readStoredTickets()
  return tickets.filter((ticket) => ticket.authority === authority)
}

export async function findStoredTicketsByAuthorityAndMarketId(authority: string, marketId: string): Promise<Ticket[]> {
  const tickets = await readStoredTickets()
  return tickets.filter((ticket) => ticket.authority === authority && ticket.marketId === marketId)
}
