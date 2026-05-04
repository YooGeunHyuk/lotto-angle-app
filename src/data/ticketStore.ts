import AsyncStorage from '@react-native-async-storage/async-storage';
import { Draw } from './lottoData';

const TICKETS_KEY = 'saved_tickets_v1';

export type TicketSource = 'manual' | 'qr';
export type TicketRank = '1등' | '2등' | '3등' | '4등' | '5등' | '낙첨' | '추첨전';
export type TicketStatus = 'pending' | 'settled';

export interface TicketGame {
  id: string;
  numbers: number[];
}

export interface SavedTicket {
  id: string;
  drawNo: number;
  source: TicketSource;
  createdAt: string;
  rawText?: string;
  games: TicketGame[];
}

export interface EvaluatedTicketGame extends TicketGame {
  matchedNumbers: number[];
  bonusMatched: boolean;
  rank: TicketRank;
}

export interface EvaluatedTicket extends SavedTicket {
  status: TicketStatus;
  draw?: Draw;
  games: EvaluatedTicketGame[];
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeGame(raw: unknown): TicketGame | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Partial<TicketGame>;
  const numbers = Array.isArray(item.numbers) ? item.numbers.map(Number) : [];

  if (numbers.length !== 6) return null;
  if (numbers.some(n => !Number.isInteger(n) || n < 1 || n > 45)) return null;
  if (new Set(numbers).size !== 6) return null;

  return {
    id: typeof item.id === 'string' ? item.id : createId('game'),
    numbers: numbers.slice().sort((a, b) => a - b),
  };
}

function normalizeTicket(raw: unknown): SavedTicket | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Partial<SavedTicket>;
  const drawNo = Number(item.drawNo);
  const source = item.source === 'qr' ? 'qr' : 'manual';
  const games = Array.isArray(item.games) ? item.games.map(normalizeGame).filter((game): game is TicketGame => Boolean(game)) : [];

  if (!Number.isInteger(drawNo) || drawNo < 1) return null;
  if (games.length === 0) return null;

  return {
    id: typeof item.id === 'string' ? item.id : createId('ticket'),
    drawNo,
    source,
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
    rawText: typeof item.rawText === 'string' ? item.rawText : undefined,
    games,
  };
}

function normalizeTickets(raw: unknown): SavedTicket[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeTicket)
    .filter((ticket): ticket is SavedTicket => Boolean(ticket))
    .sort((a, b) => b.drawNo - a.drawNo || b.createdAt.localeCompare(a.createdAt));
}

export function buildTicket(drawNo: number, games: number[][], source: TicketSource = 'manual', rawText?: string): SavedTicket {
  return {
    id: createId('ticket'),
    drawNo,
    source,
    createdAt: new Date().toISOString(),
    rawText,
    games: games
      .map(numbers => normalizeGame({ numbers }))
      .filter((game): game is TicketGame => Boolean(game)),
  };
}

export async function getSavedTickets(): Promise<SavedTicket[]> {
  try {
    const raw = await AsyncStorage.getItem(TICKETS_KEY);
    return raw ? normalizeTickets(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export async function saveTicket(ticket: SavedTicket): Promise<void> {
  const normalized = normalizeTicket(ticket);
  if (!normalized) return;

  const existing = await getSavedTickets();
  const next = [normalized, ...existing.filter(item => item.id !== normalized.id)]
    .sort((a, b) => b.drawNo - a.drawNo || b.createdAt.localeCompare(a.createdAt));
  await AsyncStorage.setItem(TICKETS_KEY, JSON.stringify(next));
}

export async function deleteTicket(ticketId: string): Promise<void> {
  const existing = await getSavedTickets();
  await AsyncStorage.setItem(TICKETS_KEY, JSON.stringify(existing.filter(ticket => ticket.id !== ticketId)));
}

export function rankGame(numbers: number[], draw?: Draw): EvaluatedTicketGame {
  if (!draw) {
    return {
      id: createId('game'),
      numbers,
      matchedNumbers: [],
      bonusMatched: false,
      rank: '추첨전',
    };
  }

  const matchedNumbers = numbers.filter(n => draw.numbers.includes(n));
  const bonusMatched = numbers.includes(draw.bonus);
  const matchCount = matchedNumbers.length;
  const rank: TicketRank =
    matchCount === 6 ? '1등' :
    matchCount === 5 && bonusMatched ? '2등' :
    matchCount === 5 ? '3등' :
    matchCount === 4 ? '4등' :
    matchCount === 3 ? '5등' :
    '낙첨';

  return {
    id: createId('game'),
    numbers,
    matchedNumbers,
    bonusMatched,
    rank,
  };
}

export function evaluateTicket(ticket: SavedTicket, draws: Draw[]): EvaluatedTicket {
  const draw = draws.find(item => item.drwNo === ticket.drawNo);
  return {
    ...ticket,
    status: draw ? 'settled' : 'pending',
    draw,
    games: ticket.games.map(game => ({
      ...rankGame(game.numbers, draw),
      id: game.id,
    })),
  };
}
