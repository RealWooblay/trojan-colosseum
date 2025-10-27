"use server";

import { promises as fs } from "fs"
import path from "path"
import type { Market, Ticket } from "./types"

const DATA_DIR = path.join(process.cwd(), "data")
const MARKETS_PATH = path.join(DATA_DIR, "markets.json")
const TICKETS_PATH = path.join(DATA_DIR, "tickets.json")

async function ensureStore(path: string): Promise<void> {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }

  try {
    await fs.access(path)
  } catch {
    const seed = { data: [] }
    await fs.writeFile(path, JSON.stringify(seed, null, 2), "utf8")
  }
}

async function readStore(path: string): Promise<any> {
  const raw = await fs.readFile(path, "utf8")
  return JSON.parse(raw).data || []
}

export async function readStoredMarkets(): Promise<Market[]> {
  await ensureStore(MARKETS_PATH)
  return await readStore(MARKETS_PATH)
}

export async function readStoredTickets(): Promise<Ticket[]> {
  await ensureStore(TICKETS_PATH)
  return await readStore(TICKETS_PATH)
}

export async function writeStoredMarkets(markets: Market[]): Promise<void> {
  await ensureStore(MARKETS_PATH)
  await fs.writeFile(MARKETS_PATH, JSON.stringify({ data: markets }, null, 2), "utf8")
}

export async function writeStoredTickets(tickets: Ticket[]): Promise<void> {
  await ensureStore(TICKETS_PATH)
  await fs.writeFile(TICKETS_PATH, JSON.stringify({ data: tickets }, null, 2), "utf8")
}

export async function appendStoredMarket(market: Market): Promise<Market> {
  const markets = await readStoredMarkets()
  const filtered = markets.filter((existing) => existing.id !== market.id)
  filtered.push(market)
  await writeStoredMarkets(filtered)
  return market
}

export async function appendStoredTicket(ticket: Ticket): Promise<Ticket> {
  const tickets = await readStoredTickets()
  const filtered = tickets.filter((existing) => existing.id !== ticket.id)
  filtered.push(ticket)
  await writeStoredTickets(filtered)
  return ticket
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