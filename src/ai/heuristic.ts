import { NUM_PLAYERS, pointsOf, rankOf, suitOf } from '../engine/cards';
import { beats } from '../engine/trick';
import { type SimState, inCallerTeam, simPlay } from './sim';

/**
 * Politica euristica veloce per scegliere la carta da giocare.
 * Usa SOLO la mano del giocatore di turno e informazioni pubbliche (carte uscite,
 * presa in corso, numero di carte in mano agli altri, chiamante, carta chiamata).
 * Serve sia come bot "semplice" sia come politica nelle simulazioni Monte Carlo.
 */
export interface HeuristicParams {
  /** Costo fisso dell'usare una briscola (valore della briscola per il futuro). */
  trumpBase: number;
  /** Costo aggiuntivo per ogni gradino di forza della briscola. */
  trumpRank: number;
  /** Costo per ogni gradino di forza di una carta non di briscola. */
  sideRank: number;
  /** Penalità per il compagno che si rivela giocando la carta chiamata presto. */
  revealPenalty: number;
  /** Prudenza nel caricare una presa di un alleato non sicuro. */
  loadCaution: number;
  /** Probabilità a priori che il chiamante si sia chiamato da solo. */
  soloPrior: number;
  /** Rumore casuale aggiunto alle valutazioni (diversifica le simulazioni). */
  noise: number;
}

export const DEFAULT_HEURISTIC: HeuristicParams = {
  trumpBase: 4,
  trumpRank: 0.9,
  sideRank: 0.2,
  revealPenalty: 4,
  loadCaution: 0.15,
  soloPrior: 0.1,
  noise: 0,
};

const POP = new Uint8Array(1024);
for (let i = 1; i < 1024; i++) POP[i] = POP[i >> 1] + (i & 1);

const ally = new Float64Array(NUM_PLAYERS);
const unseen = [0, 0, 0, 0];
const later: number[] = [];

/** Probabilità, dal punto di vista di `me`, che `q` sia suo alleato. */
export function allyProbs(s: SimState, me: number, soloPrior: number, out: Float64Array = ally): Float64Array {
  const known = s.revealed || s.partner === me;
  const myTeam = inCallerTeam(s, me);
  for (let q = 0; q < NUM_PLAYERS; q++) {
    if (q === me) out[q] = 1;
    else if (known) out[q] = inCallerTeam(s, q) === myTeam ? 1 : 0;
    else if (me === s.caller) out[q] = 0.25;
    else if (q === s.caller) out[q] = 0;
    else out[q] = 1 - (1 - soloPrior) / 3;
  }
  return out;
}

export function heuristicCard(
  s: SimState,
  p: number,
  prm: HeuristicParams = DEFAULT_HEURISTIC,
  rand: () => number = Math.random,
  allyOverride?: Float64Array,
): number {
  const hand = s.hands[p];
  if (hand.length === 1) return hand[0];
  const trump = s.trump;
  const al = allyOverride ?? allyProbs(s, p, prm.soloPrior);

  for (let su = 0; su < 4; su++) unseen[su] = ~s.gone[su] & 0x3ff;
  for (const c of hand) unseen[suitOf(c)] &= ~(1 << rankOf(c));
  let U = 0;
  for (let q = 0; q < NUM_PLAYERS; q++) if (q !== p) U += s.hands[q].length;

  const n = s.trickCards.length;
  later.length = 0;
  for (let k = 1; k < NUM_PLAYERS - n; k++) later.push((p + k) % NUM_PLAYERS);

  let wCard = -1;
  let wPlayer = -1;
  let table = 0;
  for (let k = 0; k < n; k++) {
    const c = s.trickCards[k];
    table += pointsOf(c);
    if (k === 0 || beats(c, wCard, trump)) {
      wCard = c;
      wPlayer = s.trickPlayers[k];
    }
  }

  const pHas = (b: number, h: number): number => {
    if (b <= 0 || h <= 0) return 0;
    let none = 1;
    for (let i = 0; i < h; i++) {
      const num = U - b - i;
      if (num <= 0) return 1;
      none *= num / (U - i);
    }
    return 1 - none;
  };

  /** Segno atteso del vincitore finale se ora vince la carta x, posseduta da una parte con segno sigma. */
  const expectSign = (x: number, sigma: number): number => {
    if (later.length === 0) return sigma;
    const sx = suitOf(x);
    let b = POP[unseen[sx] & ((1 << rankOf(x)) - 1)];
    if (sx !== trump) b += POP[unseen[trump]];
    if (b === 0) return sigma;
    let noE = 1;
    let noA = 1;
    for (const q of later) {
      const ph = pHas(b, s.hands[q].length);
      noE *= 1 - (1 - al[q]) * ph;
      noA *= 1 - al[q] * ph;
    }
    let pe = 1 - noE;
    let pa = 1 - noA;
    const tot = pe + pa;
    if (tot > 1) {
      pe /= tot;
      pa /= tot;
    }
    return (1 - pe - pa) * sigma - pe + pa;
  };

  const signW = n > 0 ? expectSign(wCard, 2 * al[wPlayer] - 1) : 0;
  const revealing = !s.revealed && s.partner === p && p !== s.caller;

  let best = hand[0];
  let bestVal = -Infinity;
  for (const c of hand) {
    const pts = pointsOf(c);
    const r = rankOf(c);
    let sign: number;
    if (n === 0 || beats(c, wCard, trump)) sign = expectSign(c, 1);
    else sign = signW;
    if (sign > 0 && sign < 1) sign -= prm.loadCaution * sign * (1 - sign) * 4;
    let val = (table + pts) * sign;
    val -= suitOf(c) === trump ? prm.trumpBase + (9 - r) * prm.trumpRank : (9 - r) * prm.sideRank;
    if (revealing && c === s.calledCard) val -= (prm.revealPenalty * (8 - s.tricksDone)) / 8;
    if (prm.noise > 0) val += (rand() - 0.5) * prm.noise;
    if (val > bestVal) {
      bestVal = val;
      best = c;
    }
  }
  return best;
}

export function rollout(s: SimState, prm: HeuristicParams, rand: () => number): void {
  while (s.tricksDone < 8) {
    simPlay(s, heuristicCard(s, s.turn, prm, rand));
  }
}
