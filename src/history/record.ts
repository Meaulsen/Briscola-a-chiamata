import type { BotLevel } from '../ai/bot';
import type { BidNote, MoveNote, PlayNote, TrumpNote } from '../ai/notes';
import { type Card, NUM_PLAYERS, type Rank, type Suit, sortHand } from '../engine/cards';
import type { Bid } from '../engine/auction';
import { type HandAction, type HandState, playedCards } from '../engine/hand';
import type { MatchState } from '../engine/match';
import type { HandOutcome } from '../engine/scoring';

/** Note dei bot sulle mosse della mano in corso, allineate per indice alle mosse. */
export interface HandNotes {
  bids: (BidNote | null)[];
  trump: TrumpNote | null;
  plays: (PlayNote | null)[];
}

export const emptyNotes = (): HandNotes => ({ bids: [], trump: null, plays: [] });

/** Aggiunge la nota (o null, per una mossa umana o senza valutazioni) della mossa appena fatta. */
export function addNote(notes: HandNotes, action: HandAction, note: MoveNote | null | undefined): HandNotes {
  switch (action.type) {
    case 'bid':
      return { ...notes, bids: [...notes.bids, note?.kind === 'bid' ? note : null] };
    case 'trump':
      return { ...notes, trump: note?.kind === 'trump' ? note : null };
    case 'play':
      return { ...notes, plays: [...notes.plays, note?.kind === 'play' ? note : null] };
  }
}

export interface PlayRecord {
  player: number;
  card: Card;
  note: PlayNote | null;
}

export interface TrickRecord {
  leader: number;
  /** Assente per la presa ancora in corso. */
  winner: number | null;
  points: number | null;
  plays: PlayRecord[];
}

export interface HandRecord {
  /** Progressivo della distribuzione nella partita (comprese quelle annullate). */
  deal: number;
  /** Numero della mano che conta per la partita; null se tutti hanno passato. */
  number: number | null;
  dealer: number;
  initialHands: Card[][];
  auction: { player: number; bid: Bid; note: BidNote | null }[];
  allPassed: boolean;
  finished: boolean;
  caller: number | null;
  rank: Rank | null;
  target: number;
  trump: Suit | null;
  calledCard: Card | null;
  /** Chi aveva la carta chiamata (il chiamante stesso se da solo). */
  partner: number | null;
  trumpNote: TrumpNote | null;
  tricks: TrickRecord[];
  outcome: HandOutcome | null;
  /** Distribuzioni scartate perché qualcuno aveva meno di 11 punti: i giocatori interessati. */
  redeals?: number[][];
}

export interface MatchRecord {
  id: string;
  startedAt: number;
  updatedAt: number;
  names: string[];
  numHands: number;
  level: BotLevel;
  finished: boolean;
  scores: number[];
  winners: number[];
  hands: HandRecord[];
}

/** Costruisce il record di una mano (finita o in corso) dallo stato del motore e dalle note dei bot. */
export function buildHandRecord(h: HandState, notes: HandNotes, deal: number, number: number | null): HandRecord {
  const initialHands: Card[][] = h.hands.map((cards) => [...cards]);
  for (const p of playedCards(h)) initialHands[p.player].push(p.card);
  let k = 0;
  const toPlays = (plays: HandState['tricks'][number]['plays']): PlayRecord[] =>
    plays.map((p) => ({ player: p.player, card: p.card, note: notes.plays[k++] ?? null }));
  const tricks: TrickRecord[] = h.tricks.map((t) => ({
    leader: t.leader,
    winner: t.winner ?? null,
    points: t.points ?? null,
    plays: toPlays(t.plays),
  }));
  if (h.current && h.current.plays.length > 0) {
    tricks.push({ leader: h.current.leader, winner: null, points: null, plays: toPlays(h.current.plays) });
  }
  return {
    deal,
    number,
    dealer: h.dealer,
    initialHands: initialHands.map(sortHand),
    auction: h.auction.history.map((e, i) => ({ player: e.player, bid: e.bid, note: notes.bids[i] ?? null })),
    allPassed: h.allPassed,
    finished: h.phase === 'end',
    caller: h.caller,
    rank: h.rank,
    target: h.target,
    trump: h.trump,
    calledCard: h.calledCard,
    partner: h.partner,
    trumpNote: notes.trump,
    tricks,
    outcome: h.outcome,
    redeals: h.redeals,
  };
}

export function newMatchRecord(m: MatchState, level: BotLevel, now: number): MatchRecord {
  return {
    id: m.config.id ?? String(m.config.seed),
    startedAt: now,
    updatedAt: now,
    names: [...m.config.names],
    numHands: m.config.numHands,
    level,
    finished: false,
    scores: Array(NUM_PLAYERS).fill(0),
    winners: [],
    hands: [],
  };
}

/** Record completo da salvare: mani concluse più, se c'è, la mano in corso. */
export function snapshotRecord(
  rec: MatchRecord,
  m: MatchState,
  notes: HandNotes,
  winners: number[],
  now: number,
): MatchRecord {
  const hands = [...rec.hands];
  if (!m.finished) hands.push(buildHandRecord(m.hand, notes, m.deals, currentHandNumber(m)));
  return { ...rec, updatedAt: now, finished: m.finished, scores: [...m.scores], winners, hands };
}

/** Numero che avrà la mano corrente se verrà giocata (null se tutti hanno passato). */
export function currentHandNumber(m: MatchState): number | null {
  return m.hand.allPassed ? null : m.history.length + 1;
}

export interface MatchSummary {
  id: string;
  startedAt: number;
  updatedAt: number;
  names: string[];
  level: BotLevel;
  numHands: number;
  handsPlayed: number;
  finished: boolean;
  scores: number[];
  winners: number[];
}

export function summarize(r: MatchRecord): MatchSummary {
  return {
    id: r.id,
    startedAt: r.startedAt,
    updatedAt: r.updatedAt,
    names: r.names,
    level: r.level,
    numHands: r.numHands,
    handsPlayed: r.hands.filter((h) => h.finished && !h.allPassed).length,
    finished: r.finished,
    scores: r.scores,
    winners: r.winners,
  };
}
