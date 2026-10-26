import type { Card, Rank, Suit } from '../engine/cards';

/**
 * Ragionamento di un bot su una singola mossa, salvato nello storico per l'analisi.
 * I valori sono in punti di classifica attesi per il bot.
 */
export interface BidNote {
  kind: 'bid';
  /** Valore atteso di ciascuna chiamata possibile (con il miglior seme di briscola). */
  evs: { rank: Rank; suit: Suit; target: number; ev: number }[];
  /** Valore minimo per cui il bot accetta di diventare chiamante. */
  threshold: number;
}

export interface TrumpNote {
  kind: 'trump';
  /** Valore atteso per ciascun seme (indice = seme). */
  evs: number[];
}

export interface PlayNote {
  kind: 'play';
  /** Valore stimato di ciascuna carta che il bot poteva giocare. */
  values: { card: Card; value: number }[];
  /** Numero di distribuzioni ipotetiche simulate. */
  worlds: number;
}

export type MoveNote = BidNote | TrumpNote | PlayNote;
