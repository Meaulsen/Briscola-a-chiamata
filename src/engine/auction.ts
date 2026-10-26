import { NUM_PLAYERS, RANK_DUE, RANK_NAMES, type Rank, nextPlayer } from './cards';

export const MIN_TARGET = 61;
export const MAX_TARGET = 120;

export type Bid =
  | { kind: 'pass' }
  | { kind: 'call'; rank: Rank }
  /** Rilancio sui punti, possibile solo dopo che è stato chiamato il Due. */
  | { kind: 'points'; points: number };

export interface AuctionEntry {
  player: number;
  bid: Bid;
}

export interface AuctionState {
  turn: number;
  passed: boolean[];
  /** Valore chiamato più basso finora (null = nessuna chiamata). */
  rank: Rank | null;
  /** Punti che il chiamante si impegna a fare. */
  target: number;
  /** Chi ha fatto l'ultima chiamata valida. */
  leader: number | null;
  history: AuctionEntry[];
  finished: boolean;
  allPassed: boolean;
}

export function newAuction(dealer: number): AuctionState {
  return {
    turn: nextPlayer(dealer),
    passed: Array(NUM_PLAYERS).fill(false),
    rank: null,
    target: MIN_TARGET,
    leader: null,
    history: [],
    finished: false,
    allPassed: false,
  };
}

/** Valori che si possono chiamare ora (devono essere più bassi dell'ultima chiamata). */
export function legalCallRanks(a: AuctionState): Rank[] {
  const from = a.rank === null ? 0 : a.rank + 1;
  const out: Rank[] = [];
  for (let r = from; r <= RANK_DUE; r++) out.push(r);
  return out;
}

/** True se siamo nella fase di asta sui punti (è già stato chiamato il Due). */
export const inPointsPhase = (a: AuctionState): boolean => a.rank === RANK_DUE;

/** Intervallo di rilancio sui punti consentito, o null se non si può rilanciare. */
export function pointsRange(a: AuctionState): { min: number; max: number } | null {
  if (!inPointsPhase(a) || a.target >= MAX_TARGET) return null;
  return { min: a.target + 1, max: MAX_TARGET };
}

export function isLegalBid(a: AuctionState, player: number, bid: Bid): boolean {
  if (a.finished || player !== a.turn) return false;
  switch (bid.kind) {
    case 'pass':
      return true;
    case 'call':
      return Number.isInteger(bid.rank) && legalCallRanks(a).includes(bid.rank);
    case 'points': {
      const r = pointsRange(a);
      return r !== null && Number.isInteger(bid.points) && bid.points >= r.min && bid.points <= r.max;
    }
  }
}

export function applyBid(a: AuctionState, player: number, bid: Bid): AuctionState {
  if (!isLegalBid(a, player, bid)) throw new Error(`Puntata non valida: ${describeBid(bid)}`);
  const s: AuctionState = {
    ...a,
    passed: [...a.passed],
    history: [...a.history, { player, bid }],
  };
  if (bid.kind === 'pass') {
    s.passed[player] = true;
  } else if (bid.kind === 'call') {
    s.rank = bid.rank;
    s.leader = player;
  } else {
    s.target = bid.points;
    s.leader = player;
  }
  const active = s.passed.filter((p) => !p).length;
  if (active === 0) {
    s.finished = true;
    s.allPassed = true;
    return s;
  }
  if (active === 1 && s.leader !== null) {
    s.finished = true;
    return s;
  }
  let t = nextPlayer(player);
  while (s.passed[t]) t = nextPlayer(t);
  s.turn = t;
  return s;
}

export function describeBid(bid: Bid): string {
  switch (bid.kind) {
    case 'pass':
      return 'Passo';
    case 'call':
      return bid.rank === RANK_DUE ? 'Due a 61' : RANK_NAMES[bid.rank];
    case 'points':
      return `Due a ${bid.points}`;
  }
}
