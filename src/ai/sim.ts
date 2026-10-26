import { NUM_PLAYERS, pointsOf, rankOf, suitOf } from '../engine/cards';
import { beats } from '../engine/trick';
import { scoreDeltas } from '../engine/scoring';

/**
 * Stato di simulazione compatto e mutabile, usato dall'IA per giocare migliaia di
 * mani al secondo su "mondi" ipotetici (mani avversarie campionate).
 * Contiene informazioni complete: la politica euristica è però scritta in modo da
 * leggere solo la mano del giocatore di turno e le informazioni pubbliche.
 */
export interface SimState {
  hands: number[][];
  trump: number;
  caller: number;
  /** Chi ha (o aveva) la carta chiamata in questo mondo; = caller se da solo. */
  partner: number;
  calledCard: number;
  target: number;
  revealed: boolean;
  /** Per ogni seme, maschera a 10 bit dei valori già giocati (inclusa la presa in corso). */
  gone: number[];
  trickCards: number[];
  trickPlayers: number[];
  leader: number;
  turn: number;
  tricksDone: number;
  points: number[];
  tricksWon: number[];
}

export function cloneSim(s: SimState): SimState {
  return {
    hands: s.hands.map((h) => h.slice()),
    trump: s.trump,
    caller: s.caller,
    partner: s.partner,
    calledCard: s.calledCard,
    target: s.target,
    revealed: s.revealed,
    gone: s.gone.slice(),
    trickCards: s.trickCards.slice(),
    trickPlayers: s.trickPlayers.slice(),
    leader: s.leader,
    turn: s.turn,
    tricksDone: s.tricksDone,
    points: s.points.slice(),
    tricksWon: s.tricksWon.slice(),
  };
}

export function simPlay(s: SimState, card: number): void {
  const p = s.turn;
  const h = s.hands[p];
  const i = h.indexOf(card);
  if (i < 0) throw new Error('simPlay: carta non in mano');
  h[i] = h[h.length - 1];
  h.pop();
  s.gone[suitOf(card)] |= 1 << rankOf(card);
  s.trickCards.push(card);
  s.trickPlayers.push(p);
  if (card === s.calledCard) s.revealed = true;
  if (s.trickCards.length < NUM_PLAYERS) {
    s.turn = (p + 1) % NUM_PLAYERS;
    return;
  }
  let best = 0;
  let pts = 0;
  for (let k = 0; k < NUM_PLAYERS; k++) {
    const c = s.trickCards[k];
    pts += pointsOf(c);
    if (k > 0 && beats(c, s.trickCards[best], s.trump)) best = k;
  }
  const w = s.trickPlayers[best];
  s.points[w] += pts;
  s.tricksWon[w] += 1;
  s.tricksDone += 1;
  s.trickCards.length = 0;
  s.trickPlayers.length = 0;
  s.leader = w;
  s.turn = w;
}

export const isFinished = (s: SimState): boolean => s.tricksDone >= 8;

export function inCallerTeam(s: SimState, p: number): boolean {
  return p === s.caller || p === s.partner;
}

export function callerTeamPoints(s: SimState): number {
  return s.caller === s.partner ? s.points[s.caller] : s.points[s.caller] + s.points[s.partner];
}

export function callerTeamTricks(s: SimState): number {
  return s.caller === s.partner ? s.tricksWon[s.caller] : s.tricksWon[s.caller] + s.tricksWon[s.partner];
}

/** Punti di classifica per il giocatore `me` a mano finita. */
export function finalDelta(s: SimState, me: number): number {
  const pts = callerTeamPoints(s);
  const tr = callerTeamTricks(s);
  const d = scoreDeltas(s.caller, s.partner, pts >= s.target, tr === 8 || tr === 0);
  return d[me];
}

/**
 * Valore della mano finita per `me`: punti di classifica più un piccolo termine sul margine
 * di punti carta, utile per distinguere giocate a parità di esito.
 */
export function evaluate(s: SimState, me: number, marginWeight: number): number {
  const pts = callerTeamPoints(s);
  const myTeamCaller = inCallerTeam(s, me);
  const margin = (myTeamCaller ? pts - s.target : s.target - 1 - pts) / 120;
  return finalDelta(s, me) + marginWeight * margin;
}
