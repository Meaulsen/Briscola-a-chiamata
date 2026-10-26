import type { BotLevel } from '../ai/bot';
import type { MatchState } from '../engine/match';

export type Speed = 'lenta' | 'normale' | 'veloce';

export interface Settings {
  name: string;
  numHands: number;
  level: BotLevel;
  speed: Speed;
  showPlayed: boolean;
  showPoints: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  name: 'Tu',
  numHands: 10,
  level: 'forte',
  speed: 'normale',
  showPlayed: false,
  showPoints: false,
};

const SETTINGS_KEY = 'briscola-chiamata:settings';
const MATCH_KEY = 'briscola-chiamata:match';
const VERSION = 1;

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

export function loadMatch(): MatchState | null {
  const saved = read<{ v: number; match: MatchState }>(MATCH_KEY);
  return saved && saved.v === VERSION && !saved.match.finished ? saved.match : null;
}

export function saveMatch(m: MatchState | null): void {
  write(MATCH_KEY, m && !m.finished ? { v: VERSION, match: m } : null);
}
