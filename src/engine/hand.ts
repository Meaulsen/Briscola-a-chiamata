import {
  CARDS_PER_PLAYER,
  type Card,
  NUM_PLAYERS,
  type Rank,
  type Suit,
  fullDeck,
  makeCard,
  nextPlayer,
  sortHand,
  sumPoints,
} from './cards';
import { type AuctionState, type Bid, applyBid, newAuction } from './auction';
import { mulberry32, shuffle } from './rng';
import { type HandOutcome, scoreHand } from './scoring';
import { trickWinnerIndex } from './trick';

export type Phase = 'auction' | 'trump' | 'play' | 'end';

export interface Play {
  player: number;
  card: Card;
}

export interface Trick {
  leader: number;
  plays: Play[];
  winner?: number;
  points?: number;
}

export interface HandState {
  dealer: number;
  phase: Phase;
  hands: Card[][];
  auction: AuctionState;
  caller: number | null;
  rank: Rank | null;
  target: number;
  trump: Suit | null;
  calledCard: Card | null;
  /** Informazione nascosta: chi ha in mano la carta chiamata (il chiamante stesso se da solo). */
  partner: number | null;
  /** True quando la carta chiamata è stata giocata e le squadre sono note a tutti. */
  revealed: boolean;
  tricks: Trick[];
  current: Trick | null;
  turn: number;
  points: number[];
  tricksWon: number[];
  /** Tutti hanno passato: la mano va rifatta, senza punteggio. */
  allPassed: boolean;
  outcome: HandOutcome | null;
  /**
   * Distribuzioni scartate prima di questa perché qualcuno aveva meno di MIN_HAND_POINTS punti in
   * mano: per ognuna, i giocatori interessati.
   */
  redeals?: number[][];
}

export type HandAction =
  | { type: 'bid'; player: number; bid: Bid }
  | { type: 'trump'; player: number; suit: Suit }
  | { type: 'play'; player: number; card: Card };

/** Mescola e distribuisce 8 carte a testa, cominciando dal giocatore alla destra del mazziere. */
export function deal(dealer: number, seed: number): Card[][] {
  const deck = shuffle(fullDeck(), mulberry32(seed));
  const hands: Card[][] = Array.from({ length: NUM_PLAYERS }, () => []);
  let p = nextPlayer(dealer);
  for (const c of deck) {
    hands[p].push(c);
    p = nextPlayer(p);
  }
  return hands.map(sortHand);
}

/** Sotto questi punti in mano, se la regola è attiva, si ridanno le carte. */
export const MIN_HAND_POINTS = 11;

/** Giocatori con meno di MIN_HAND_POINTS punti in mano. */
export function weakHands(hands: readonly Card[][]): number[] {
  return hands.flatMap((h, p) => (sumPoints(h) < MIN_HAND_POINTS ? [p] : []));
}

export function newHand(dealer: number, seed: number): HandState {
  return newHandFromCards(dealer, deal(dealer, seed));
}

export function newHandFromCards(dealer: number, hands: Card[][]): HandState {
  if (hands.length !== NUM_PLAYERS || hands.some((h) => h.length !== CARDS_PER_PLAYER)) {
    throw new Error('Distribuzione non valida');
  }
  const auction = newAuction(dealer);
  return {
    dealer,
    phase: 'auction',
    hands: hands.map((h) => [...h]),
    auction,
    caller: null,
    rank: null,
    target: auction.target,
    trump: null,
    calledCard: null,
    partner: null,
    revealed: false,
    tricks: [],
    current: null,
    turn: auction.turn,
    points: Array(NUM_PLAYERS).fill(0),
    tricksWon: Array(NUM_PLAYERS).fill(0),
    allPassed: false,
    outcome: null,
  };
}

export function applyHandAction(s: HandState, action: HandAction): HandState {
  if (action.player !== s.turn) throw new Error('Non è il turno di questo giocatore');
  switch (action.type) {
    case 'bid':
      return applyBidAction(s, action.player, action.bid);
    case 'trump':
      return applyTrump(s, action.player, action.suit);
    case 'play':
      return applyPlay(s, action.player, action.card);
  }
}

function applyBidAction(s: HandState, player: number, bid: Bid): HandState {
  if (s.phase !== 'auction') throw new Error("L'asta è chiusa");
  const auction = applyBid(s.auction, player, bid);
  const next: HandState = { ...s, auction, turn: auction.turn, target: auction.target };
  if (!auction.finished) return next;
  if (auction.allPassed) {
    return { ...next, phase: 'end', allPassed: true };
  }
  const caller = auction.leader!;
  return { ...next, phase: 'trump', caller, rank: auction.rank, turn: caller };
}

function applyTrump(s: HandState, player: number, suit: Suit): HandState {
  if (s.phase !== 'trump' || player !== s.caller) throw new Error('Non si può scegliere la briscola ora');
  if (!Number.isInteger(suit) || suit < 0 || suit > 3) throw new Error('Seme non valido');
  const calledCard = makeCard(suit, s.rank!);
  const partner = s.hands.findIndex((h) => h.includes(calledCard));
  const leader = nextPlayer(s.dealer);
  return {
    ...s,
    phase: 'play',
    trump: suit,
    calledCard,
    partner,
    current: { leader, plays: [] },
    turn: leader,
  };
}

function applyPlay(s: HandState, player: number, card: Card): HandState {
  if (s.phase !== 'play' || !s.current) throw new Error('Non si può giocare ora');
  const hand = s.hands[player];
  if (!hand.includes(card)) throw new Error('Carta non in mano');
  const hands = s.hands.map((h, i) => (i === player ? h.filter((c) => c !== card) : h));
  const plays = [...s.current.plays, { player, card }];
  const revealed = s.revealed || card === s.calledCard;
  if (plays.length < NUM_PLAYERS) {
    return { ...s, hands, revealed, current: { ...s.current, plays }, turn: nextPlayer(player) };
  }
  const cards = plays.map((p) => p.card);
  const winner = plays[trickWinnerIndex(cards, s.trump!)].player;
  const pts = sumPoints(cards);
  const points = [...s.points];
  points[winner] += pts;
  const tricksWon = [...s.tricksWon];
  tricksWon[winner] += 1;
  const tricks = [...s.tricks, { leader: s.current.leader, plays, winner, points: pts }];
  if (tricks.length < CARDS_PER_PLAYER) {
    return {
      ...s,
      hands,
      revealed,
      tricks,
      points,
      tricksWon,
      current: { leader: winner, plays: [] },
      turn: winner,
    };
  }
  const outcome = scoreHand({
    caller: s.caller!,
    partner: s.partner!,
    target: s.target,
    points,
    tricks: tricksWon,
  });
  return { ...s, hands, revealed: true, tricks, points, tricksWon, current: null, phase: 'end', outcome, turn: -1 };
}

/** Tutte le carte giocate finora nella mano, in ordine. */
export function playedCards(s: Pick<HandState, 'tricks' | 'current'>): Play[] {
  const out: Play[] = [];
  for (const t of s.tricks) out.push(...t.plays);
  if (s.current) out.push(...s.current.plays);
  return out;
}
