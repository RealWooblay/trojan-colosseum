"use server";

import { promises as fs } from "fs"
import os from "os"
import path from "path"
import type { Market, Ticket } from "./types"

const DEFAULT_DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data")
const FALLBACK_DATA_DIR = path.join(os.tmpdir(), "trojan-colosseum")
let activeDataDir = DEFAULT_DATA_DIR

function isReadOnlyError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false
  const code = (error as { code?: string }).code
  return code === "EROFS" || code === "EACCES" || code === "EPERM" || code === "ENOENT"
}

async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(activeDataDir, { recursive: true })
  } catch (error) {
    if (isReadOnlyError(error) && activeDataDir !== FALLBACK_DATA_DIR) {
      activeDataDir = FALLBACK_DATA_DIR
      await fs.mkdir(activeDataDir, { recursive: true })
      return
    }
    throw error
  }
}

async function ensureStore(filename: string): Promise<string> {
  await ensureDataDir()
  let filePath = path.join(activeDataDir, filename)

  const ensureSeed = async (targetPath: string) => {
    const seed = { data: [] }
    await fs.writeFile(targetPath, JSON.stringify(seed, null, 2), "utf8")
  }

  const attemptFileSetup = async (): Promise<string> => {
    try {
      await fs.access(filePath)
      return filePath
    } catch (error) {
      if (isReadOnlyError(error) && activeDataDir !== FALLBACK_DATA_DIR) {
        activeDataDir = FALLBACK_DATA_DIR
        await ensureDataDir()
        filePath = path.join(activeDataDir, filename)
      }
      try {
        await fs.access(filePath)
      } catch {
        await ensureSeed(filePath)
      }
      return filePath
    }
  }

  try {
    return await attemptFileSetup()
  } catch (error) {
    if (isReadOnlyError(error) && activeDataDir !== FALLBACK_DATA_DIR) {
      activeDataDir = FALLBACK_DATA_DIR
      await ensureDataDir()
      filePath = path.join(activeDataDir, filename)
      await ensureSeed(filePath)
      return filePath
    }
    throw error
  }
}

async function readStore(pathname: string): Promise<any> {
  const raw = await fs.readFile(pathname, "utf8")
  const parsed = JSON.parse(raw)
  if (Array.isArray(parsed)) return parsed
  if (Array.isArray(parsed.data)) return parsed.data
  if (Array.isArray(parsed.markets)) return parsed.markets
  return []
}

export async function readStoredMarkets(): Promise<Market[]> {
  const filePath = await ensureStore("markets.json")
  return await readStore(filePath)
}

export async function readStoredTickets(): Promise<Ticket[]> {
  const filePath = await ensureStore("tickets.json")
  return await readStore(filePath)
}

export async function writeStoredMarkets(markets: Market[]): Promise<void> {
  const filePath = await ensureStore("markets.json")
  await fs.writeFile(filePath, JSON.stringify({ data: markets }, null, 2), "utf8")
}

export async function writeStoredTickets(tickets: Ticket[]): Promise<void> {
  const filePath = await ensureStore("tickets.json")
  await fs.writeFile(filePath, JSON.stringify({ data: tickets }, null, 2), "utf8")
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
