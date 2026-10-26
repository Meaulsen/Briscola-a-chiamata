import { type Card, type Suit, rankOf, suitOf, sumPoints } from './cards';

/**
 * True se la carta `a` batte la carta `b`, dove `b` è la carta che sta vincendo
 * la presa (quindi è del seme d'uscita oppure di briscola).
 */
export function beats(a: Card, b: Card, trump: Suit): boolean {
  const sa = suitOf(a);
  const sb = suitOf(b);
  if (sa === sb) return rankOf(a) < rankOf(b);
  return sa === trump;
}

/** Indice (nell'ordine di gioco) della carta che vince la presa. */
export function trickWinnerIndex(cards: readonly Card[], trump: Suit): number {
  let best = 0;
  for (let i = 1; i < cards.length; i++) {
    if (beats(cards[i], cards[best], trump)) best = i;
  }
  return best;
}

export const trickPoints = sumPoints;
