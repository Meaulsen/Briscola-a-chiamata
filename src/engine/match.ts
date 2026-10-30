import { NUM_PLAYERS, nextPlayer } from './cards';
import { type HandAction, type HandState, applyHandAction, deal, newHandFromCards, weakHands } from './hand';
import { mixSeed } from './rng';
import type { HandOutcome } from './scoring';

export interface MatchConfig {
  /** Identificativo della partita (per lo storico). */
  id?: string;
  numHands: number;
  names: string[];
  seed: number;
  /** Se qualcuno ha meno di 11 punti in mano, lo stesso mazziere ridà le carte. */
  redealWeakHands?: boolean;
}

export interface HandRecord {
  number: number;
  dealer: number;
  outcome: HandOutcome;
  rank: number;
  trump: number;
}

export interface MatchState {
  config: MatchConfig;
  /** Numero di distribuzioni fatte (comprese quelle annullate perché tutti hanno passato). */
  deals: number;
  dealer: number;
  scores: number[];
  history: HandRecord[];
  hand: HandState;
  finished: boolean;
}

export function newMatch(config: MatchConfig): MatchState {
  const dealer = mixSeed(config.seed, 0xdea1) % NUM_PLAYERS;
  return {
    config,
    deals: 1,
    dealer,
    scores: Array(NUM_PLAYERS).fill(0),
    history: [],
    hand: dealHand(config, dealer, 1),
    finished: false,
  };
}

/**
 * Distribuisce le carte della distribuzione numero `deals`. Con la regola delle mani deboli attiva,
 * finché qualcuno ha meno di 11 punti si rimescola e si ridà, con lo stesso mazziere.
 */
function dealHand(config: MatchConfig, dealer: number, deals: number): HandState {
  const base = mixSeed(config.seed, deals);
  const redeals: number[][] = [];
  for (let k = 0; ; k++) {
    const cards = deal(dealer, k === 0 ? base : mixSeed(base, k));
    const weak = config.redealWeakHands ? weakHands(cards) : [];
    if (weak.length === 0) {
      const hand = newHandFromCards(dealer, cards);
      return redeals.length > 0 ? { ...hand, redeals } : hand;
    }
    redeals.push(weak);
  }
}

export function applyMatchAction(m: MatchState, action: HandAction): MatchState {
  if (m.finished) throw new Error('La partita è finita');
  return { ...m, hand: applyHandAction(m.hand, action) };
}

/**
 * Da chiamare quando la mano corrente è finita: registra il punteggio e distribuisce la
 * mano successiva (o chiude la partita). Se tutti hanno passato si rimescola e la
 * distribuzione passa al mazziere successivo, senza contare la mano.
 */
export function advanceMatch(m: MatchState): MatchState {
  const h = m.hand;
  if (h.phase !== 'end') throw new Error('La mano non è finita');
  let { scores, history } = m;
  if (!h.allPassed && h.outcome) {
    scores = scores.map((s, i) => s + h.outcome!.deltas[i]);
    history = [
      ...history,
      { number: history.length + 1, dealer: h.dealer, outcome: h.outcome, rank: h.rank!, trump: h.trump! },
    ];
  }
  const finished = history.length >= m.config.numHands;
  if (finished) return { ...m, scores, history, finished };
  const dealer = nextPlayer(m.dealer);
  const deals = m.deals + 1;
  return {
    ...m,
    scores,
    history,
    dealer,
    deals,
    hand: dealHand(m.config, dealer, deals),
  };
}

/** Vincitori della partita: tutti quelli con il punteggio più alto (pari merito possibile). */
export function matchWinners(m: MatchState): number[] {
  const best = Math.max(...m.scores);
  return m.scores.flatMap((s, i) => (s === best ? [i] : []));
}

/** Classifica: indici dei giocatori ordinati per punteggio decrescente. */
export function standings(scores: readonly number[]): number[] {
  return scores.map((_, i) => i).sort((a, b) => scores[b] - scores[a] || a - b);
}
