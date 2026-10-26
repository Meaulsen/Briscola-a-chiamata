import type { BotLevel } from '../ai/bot';
import type { CardStyle } from './CardView';
import type { MatchState } from '../engine/match';
import { type HandNotes, type MatchRecord, emptyNotes, newMatchRecord } from '../history/record';

export type Speed = 'lenta' | 'normale' | 'veloce';

export interface Settings {
  name: string;
  numHands: number;
  level: BotLevel;
  speed: Speed;
  showPlayed: boolean;
  showPoints: boolean;
  cardStyle: CardStyle;
}

export const DEFAULT_SETTINGS: Settings = {
  name: 'Tu',
  numHands: 10,
  level: 'forte',
  speed: 'normale',
  showPlayed: false,
  showPoints: false,
  cardStyle: 'piacentine',
};

const SETTINGS_KEY = 'briscola-chiamata:settings';
const MATCH_KEY = 'briscola-chiamata:match';
const VERSION = 2;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Spazio non disponibile (navigazione privata ecc.): si continua senza salvare.
  }
}

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...(read<Partial<Settings>>(SETTINGS_KEY) ?? {}) };
}

export const saveSettings = (s: Settings): void => write(SETTINGS_KEY, s);

/** Partita in corso: stato del motore, storico delle mani concluse e note dei bot sulla mano corrente. */
export interface GameSession {
  match: MatchState;
  record: MatchRecord;
  notes: HandNotes;
}

export function newSession(match: MatchState, level: BotLevel): GameSession {
  return { match, record: newMatchRecord(match, level, Date.now()), notes: emptyNotes() };
}

export function loadSession(): GameSession | null {
  const saved = read<{ v: number; session: GameSession }>(MATCH_KEY);
  return saved && saved.v === VERSION && !saved.session.match.finished ? saved.session : null;
}

export function saveSession(s: GameSession | null): void {
  write(MATCH_KEY, s && !s.match.finished ? { v: VERSION, session: s } : null);
}
