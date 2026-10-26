import { type Card, NUM_PLAYERS, RANK_DUE, type Rank, type Suit, makeCard, nextPlayer } from '../engine/cards';
import { type Bid, MAX_TARGET, MIN_TARGET, inPointsPhase, legalCallRanks } from '../engine/auction';
import { shuffle } from '../engine/rng';
import { scoreDeltas } from '../engine/scoring';
import type { PlayerView } from '../engine/view';
import { DEFAULT_HEURISTIC, type HeuristicParams, rollout } from './heuristic';
import type { BidNote, TrumpNote } from './notes';
import { type SimState, callerTeamPoints, callerTeamTricks } from './sim';

/**
 * Valutazione della mano per l'asta: per ogni coppia (valore chiamato, seme di briscola)
 * simula molte mani con le carte altrui distribuite a caso, giocando come chiamante,
 * e registra punti e prese della squadra del chiamante.
 */
export interface BidTable {
  samples: number;
  /** [rank * 4 + suit][i] = punti della squadra del chiamante nel campione i. */
  points: Int16Array[];
  tricks: Uint8Array[];
  solo: boolean[];
}

export interface BiddingParams {
  samples: number;
  /** Valore atteso minimo (punti classifica) per impegnarsi come chiamante. */
  threshold: number;
  /** Si preferisce la chiamata più alta il cui valore non è peggiore del migliore di oltre questo margine. */
  margin: number;
  policy: HeuristicParams;
}

export const DEFAULT_BIDDING: BiddingParams = {
  samples: 80,
  threshold: 0,
  margin: 0.25,
  policy: { ...DEFAULT_HEURISTIC, noise: 1 },
};

export function buildBidTable(
  hand: readonly Card[],
  me: number,
  dealer: number,
  prm: BiddingParams = DEFAULT_BIDDING,
  rand: () => number = Math.random,
): BidTable {
  const n = prm.samples;
  const points = Array.from({ length: 40 }, () => new Int16Array(n));
  const tricks = Array.from({ length: 40 }, () => new Uint8Array(n));
  const solo = Array.from({ length: 40 }, (_, k) => hand.includes(makeCard(k % 4, (k / 4) | 0)));
  const mine = new Set(hand);
  const others: Card[] = [];
  for (let c = 0; c < 40; c++) if (!mine.has(c)) others.push(c);
  const leader = nextPlayer(dealer);
  for (let i = 0; i < n; i++) {
    const pool = shuffle(others.slice(), rand);
    const hands: Card[][] = [];
    let k = 0;
    for (let q = 0; q < NUM_PLAYERS; q++) {
      if (q === me) hands.push([...hand]);
      else hands.push(pool.slice(k, (k += 8)));
    }
    for (let rank = 0; rank < 10; rank++) {
      for (let suit = 0; suit < 4; suit++) {
        const called = makeCard(suit, rank);
        const partner = hands.findIndex((h) => h.includes(called));
        const s: SimState = {
          hands: hands.map((h) => h.slice()),
          trump: suit,
          caller: me,
          partner,
          calledCard: called,
          target: MIN_TARGET,
          revealed: false,
          gone: [0, 0, 0, 0],
          trickCards: [],
          trickPlayers: [],
          leader,
          turn: leader,
          tricksDone: 0,
          points: [0, 0, 0, 0, 0],
          tricksWon: [0, 0, 0, 0, 0],
          evidence: [1, 1, 1, 1, 1],
        };
        rollout(s, prm.policy, rand);
        points[rank * 4 + suit][i] = callerTeamPoints(s);
        tricks[rank * 4 + suit][i] = callerTeamTricks(s);
      }
    }
  }
  return { samples: n, points, tricks, solo };
}

/** Valore atteso (punti classifica del chiamante) chiamando `rank` con briscola `suit` e obiettivo `target`. */
export function expectedValue(t: BidTable, rank: Rank, suit: Suit, target: number): number {
  const k = rank * 4 + suit;
  const pts = t.points[k];
  const tr = t.tricks[k];
  const partner = t.solo[k] ? 0 : 1;
  let sum = 0;
  for (let i = 0; i < t.samples; i++) {
    sum += scoreDeltas(0, partner, pts[i] >= target, tr[i] === 8 || tr[i] === 0)[0];
  }
  return sum / t.samples;
}

export function bestSuit(t: BidTable, rank: Rank, target: number): { suit: Suit; ev: number } {
  let best = { suit: 0, ev: -Infinity };
  for (let suit = 0; suit < 4; suit++) {
    const ev = expectedValue(t, rank, suit, target);
    if (ev > best.ev) best = { suit, ev };
  }
  return best;
}

export function chooseBid(v: PlayerView, t: BidTable, prm: BiddingParams = DEFAULT_BIDDING): Bid {
  const a = v.auction;
  if (inPointsPhase(a)) {
    const target = a.target + 1;
    if (target > MAX_TARGET) return { kind: 'pass' };
    return bestSuit(t, RANK_DUE, target).ev >= prm.threshold ? { kind: 'points', points: target } : { kind: 'pass' };
  }
  const ranks = legalCallRanks(a);
  const evs = ranks.map((r) => bestSuit(t, r, MIN_TARGET).ev);
  const best = Math.max(...evs);
  if (best < prm.threshold) return { kind: 'pass' };
  const floor = Math.max(prm.threshold, best - prm.margin);
  const i = evs.findIndex((ev) => ev >= floor);
  return { kind: 'call', rank: ranks[i] };
}

export function chooseTrump(v: PlayerView, t: BidTable): Suit {
  return bestSuit(t, v.rank!, v.target).suit;
}

/** Valori attesi delle chiamate possibili ora, per lo storico. */
export function bidNote(v: PlayerView, t: BidTable, prm: BiddingParams = DEFAULT_BIDDING): BidNote {
  const a = v.auction;
  if (inPointsPhase(a)) {
    const target = a.target + 1;
    const evs = target > MAX_TARGET ? [] : [{ rank: RANK_DUE, ...bestSuit(t, RANK_DUE, target), target }];
    return { kind: 'bid', evs, threshold: prm.threshold };
  }
  const evs = legalCallRanks(a).map((rank) => ({ rank, ...bestSuit(t, rank, MIN_TARGET), target: MIN_TARGET }));
  return { kind: 'bid', evs, threshold: prm.threshold };
}

export function trumpNote(v: PlayerView, t: BidTable): TrumpNote {
  return { kind: 'trump', evs: [0, 1, 2, 3].map((s) => expectedValue(t, v.rank!, s, v.target)) };
}
