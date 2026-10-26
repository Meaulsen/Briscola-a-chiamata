import { type Card, NUM_PLAYERS, pointsOf, rankOf, suitOf } from '../engine/cards';
import { playedCards } from '../engine/hand';
import { shuffle } from '../engine/rng';
import { beats } from '../engine/trick';
import type { PlayerView } from '../engine/view';
import { DEFAULT_EVIDENCE, type EvidenceParams, updateEvidence } from './evidence';
import type { SimState } from './sim';

/**
 * Campionamento dei "mondi" possibili (determinizzazioni) coerenti con quanto sa un
 * giocatore, con inferenza su chi sia il compagno e sulla mano del chiamante.
 */
export interface InferenceParams extends EvidenceParams {
  soloPrior: number;
  /** Peso esponenziale per ogni briscola in più (rispetto a 2) nella mano iniziale del chiamante. */
  callerTrumpBias: number;
}

export const DEFAULT_INFERENCE: InferenceParams = {
  ...DEFAULT_EVIDENCE,
  soloPrior: 0.1,
  callerTrumpBias: 0.6,
};

/** Pesi pubblici (uguali per tutti gli osservatori) di ciascun giocatore come possibile compagno. */
export function publicEvidence(v: PlayerView, prm: EvidenceParams = DEFAULT_EVIDENCE): number[] {
  const ev = Array(NUM_PLAYERS).fill(1);
  const trump = v.trump!;
  const caller = v.caller!;
  const tricks = [...v.tricks, ...(v.current ? [v.current] : [])];
  let revealed = false;
  for (const t of tricks) {
    let wCard = -1;
    let wPlayer = -1;
    let table = 0;
    t.plays.forEach(({ player, card }, k) => {
      if (k > 0 && !revealed) updateEvidence(ev, caller, trump, wPlayer, wCard, table, player, card, prm);
      if (card === v.calledCard) revealed = true;
      if (k === 0 || beats(card, wCard, trump)) {
        wCard = card;
        wPlayer = player;
      }
      table += pointsOf(card);
    });
  }
  return ev;
}

/**
 * Peso relativo di ciascun giocatore come possibile detentore della carta chiamata,
 * dal punto di vista di v.me. Zero per chi non può averla.
 */
export function partnerWeights(v: PlayerView, prm: InferenceParams = DEFAULT_INFERENCE): number[] {
  const w = Array(NUM_PLAYERS).fill(0);
  const caller = v.caller!;
  if (v.knownPartner !== null) {
    w[v.knownPartner] = 1;
    return w;
  }
  for (let q = 0; q < NUM_PLAYERS; q++) {
    if (q === v.me) continue;
    if (q === caller) w[q] = v.me === caller ? 0 : prm.soloPrior / ((1 - prm.soloPrior) / 3);
    else w[q] = 1;
  }
  const ev = publicEvidence(v, prm);
  for (let q = 0; q < NUM_PLAYERS; q++) if (q !== caller) w[q] *= ev[q];
  // La carta chiamata non ancora uscita non può essere in mano a chi ha finito le carte.
  for (let q = 0; q < NUM_PLAYERS; q++) if (v.handSizes[q] === 0) w[q] = 0;
  return w;
}

export interface World {
  hands: Card[][];
  partner: number;
  weight: number;
}

export interface WorldSampler {
  sample(rand: () => number): World;
}

export function makeSampler(v: PlayerView, prm: InferenceParams = DEFAULT_INFERENCE): WorldSampler {
  const me = v.me;
  const caller = v.caller!;
  const called = v.calledCard!;
  const played = playedCards(v);
  const seen = new Set<Card>([...v.hand, ...played.map((p) => p.card)]);
  const calledPlayed = played.find((p) => p.card === called);
  let fixedPartner: number | null = null;
  if (calledPlayed) fixedPartner = calledPlayed.player;
  else if (v.hand.includes(called)) fixedPartner = me;
  const unknown: Card[] = [];
  for (let c = 0; c < 40; c++) if (!seen.has(c) && !(fixedPartner === null && c === called)) unknown.push(c);
  const weights = fixedPartner === null ? partnerWeights(v, prm) : null;
  const totalW = weights ? weights.reduce((a, b) => a + b, 0) : 0;

  const callerPlayedTrumps = played.filter((p) => p.player === caller && suitOf(p.card) === v.trump).length;

  return {
    sample(rand) {
      const hands: Card[][] = Array.from({ length: NUM_PLAYERS }, () => []);
      hands[me] = [...v.hand];
      let partner = fixedPartner;
      if (partner === null) {
        let x = rand() * totalW;
        partner = 0;
        for (let q = 0; q < NUM_PLAYERS; q++) {
          if (weights![q] <= 0) continue;
          partner = q;
          x -= weights![q];
          if (x <= 0) break;
        }
        hands[partner].push(called);
      }
      const pool = shuffle(unknown.slice(), rand);
      let k = 0;
      for (let q = 0; q < NUM_PLAYERS; q++) {
        if (q === me) continue;
        while (hands[q].length < v.handSizes[q]) hands[q].push(pool[k++]);
      }
      let weight = 1;
      if (caller !== me && prm.callerTrumpBias !== 0) {
        let nt = callerPlayedTrumps;
        for (const c of hands[caller]) if (suitOf(c) === v.trump) nt++;
        weight = Math.exp(prm.callerTrumpBias * (nt - 2));
      }
      return { hands, partner, weight };
    },
  };
}

export function simFromView(v: PlayerView, hands: Card[][], partner: number): SimState {
  const gone = [0, 0, 0, 0];
  for (const p of playedCards(v)) gone[suitOf(p.card)] |= 1 << rankOf(p.card);
  const cur = v.current!;
  return {
    hands: hands.map((h) => h.slice()),
    trump: v.trump!,
    caller: v.caller!,
    partner,
    calledCard: v.calledCard!,
    target: v.target,
    revealed: v.revealed,
    gone,
    trickCards: cur.plays.map((p) => p.card),
    trickPlayers: cur.plays.map((p) => p.player),
    leader: cur.leader,
    turn: v.turn,
    tricksDone: v.tricks.length,
    points: v.points.slice(),
    tricksWon: v.tricksWon.slice(),
    evidence: publicEvidence(v),
  };
}
