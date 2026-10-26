// Una carta è un intero 0..39: seme * 10 + indice di valore.
// L'indice di valore segue l'ordine di forza: 0 = Asso (la più forte) ... 9 = Due.
export type Card = number;
export type Suit = number; // 0 Coppe, 1 Denari, 2 Bastoni, 3 Spade
export type Rank = number; // 0 Asso, 1 Tre, 2 Re, 3 Cavallo, 4 Fante, 5 Sette, 6 Sei, 7 Cinque, 8 Quattro, 9 Due

export const NUM_PLAYERS = 5;
export const CARDS_PER_PLAYER = 8;
export const TOTAL_POINTS = 120;

export const SUITS: readonly Suit[] = [0, 1, 2, 3];
export const RANKS: readonly Rank[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export const SUIT_NAMES = ['Coppe', 'Denari', 'Bastoni', 'Spade'] as const;
export const RANK_NAMES = ['Asso', 'Tre', 'Re', 'Cavallo', 'Fante', 'Sette', 'Sei', 'Cinque', 'Quattro', 'Due'] as const;
export const RANK_SHORT = ['A', '3', 'R', 'C', 'F', '7', '6', '5', '4', '2'] as const;
export const RANK_POINTS = [11, 10, 4, 3, 2, 0, 0, 0, 0, 0] as const;

export const RANK_DUE: Rank = 9;

export const suitOf = (c: Card): Suit => (c / 10) | 0;
export const rankOf = (c: Card): Rank => c % 10;
export const pointsOf = (c: Card): number => RANK_POINTS[c % 10];
export const makeCard = (suit: Suit, rank: Rank): Card => suit * 10 + rank;

export const cardName = (c: Card): string => `${RANK_NAMES[rankOf(c)]} di ${SUIT_NAMES[suitOf(c)]}`;
export const cardShort = (c: Card): string => `${RANK_SHORT[rankOf(c)]}${SUIT_NAMES[suitOf(c)][0]}`;

export const isCarico = (c: Card): boolean => rankOf(c) <= 1;
export const isLiscio = (c: Card): boolean => pointsOf(c) === 0;

export function fullDeck(): Card[] {
  return Array.from({ length: 40 }, (_, i) => i);
}

export function sumPoints(cards: readonly Card[]): number {
  let s = 0;
  for (const c of cards) s += pointsOf(c);
  return s;
}

/** Ordina una mano per seme e poi per forza (comodo per la visualizzazione). */
export function sortHand(cards: readonly Card[]): Card[] {
  return [...cards].sort((a, b) => a - b);
}

/** Giocatore successivo in senso antiorario (verso destra). */
export const nextPlayer = (p: number): number => (p + 1) % NUM_PLAYERS;
