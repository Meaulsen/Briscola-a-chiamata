import type { Card, Rank, Suit } from './cards';
import type { AuctionState } from './auction';
import type { HandState, Phase, Trick } from './hand';

/**
 * Ciò che un giocatore può legittimamente sapere della mano in corso.
 * Bot e interfaccia lavorano solo su questa proiezione, così nessuno può vedere
 * le carte altrui o sapere chi è il compagno prima del tempo.
 */
export interface PlayerView {
  me: number;
  dealer: number;
  phase: Phase;
  hand: Card[];
  handSizes: number[];
  auction: AuctionState;
  caller: number | null;
  rank: Rank | null;
  target: number;
  trump: Suit | null;
  calledCard: Card | null;
  /** Il compagno, se noto a questo giocatore (rivelato, oppure sono io ad avere/aver avuto la carta chiamata). */
  knownPartner: number | null;
  revealed: boolean;
  tricks: Trick[];
  current: Trick | null;
  turn: number;
  points: number[];
  tricksWon: number[];
  /** Regola attiva: nessuno ha ricevuto una mano da meno di 11 punti. */
  redealWeakHands: boolean;
}

export function viewFor(s: HandState, me: number): PlayerView {
  let knownPartner: number | null = null;
  if (s.partner !== null && (s.revealed || s.partner === me)) knownPartner = s.partner;
  return {
    me,
    dealer: s.dealer,
    phase: s.phase,
    hand: [...s.hands[me]],
    handSizes: s.hands.map((h) => h.length),
    auction: s.auction,
    caller: s.caller,
    rank: s.rank,
    target: s.target,
    trump: s.trump,
    calledCard: s.calledCard,
    knownPartner,
    revealed: s.revealed,
    tricks: s.tricks,
    current: s.current,
    turn: s.turn,
    points: s.points,
    tricksWon: s.tricksWon,
    redealWeakHands: s.redealWeakHands ?? false,
  };
}
