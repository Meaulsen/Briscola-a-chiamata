import { isCarico, pointsOf, suitOf } from '../engine/cards';
import { beats } from '../engine/trick';

/** Rapporti di verosimiglianza usati per dedurre chi è il compagno dalle giocate pubbliche. */
export interface EvidenceParams {
  lrLoadCaller: number;
  lrSmallLoadCaller: number;
  lrTrumpOverCaller: number;
  lrLoadOther: number;
  lrCallerLoads: number;
  lrCallerOvertakes: number;
}

export const DEFAULT_EVIDENCE: EvidenceParams = {
  lrLoadCaller: 3,
  lrSmallLoadCaller: 1.3,
  lrTrumpOverCaller: 0.5,
  lrLoadOther: 0.4,
  lrCallerLoads: 3,
  lrCallerOvertakes: 0.6,
};

/**
 * Aggiorna i pesi `ev` (uno per giocatore, come possibile compagno) dopo che `player`
 * ha giocato `card` in una presa in cui stava vincendo `wPlayer` con `wCard` e
 * sul tavolo c'erano `table` punti. Va chiamata solo per carte non d'uscita e
 * finché il compagno non è stato rivelato.
 */
export function updateEvidence(
  ev: number[],
  caller: number,
  trump: number,
  wPlayer: number,
  wCard: number,
  table: number,
  player: number,
  card: number,
  prm: EvidenceParams = DEFAULT_EVIDENCE,
): void {
  const took = beats(card, wCard, trump);
  if (player !== caller) {
    if (wPlayer === caller) {
      if (!took && isCarico(card)) ev[player] *= prm.lrLoadCaller;
      else if (!took && pointsOf(card) >= 2) ev[player] *= prm.lrSmallLoadCaller;
      else if (took && suitOf(card) === trump && table + pointsOf(card) >= 10) ev[player] *= prm.lrTrumpOverCaller;
    } else if (!took && isCarico(card)) {
      ev[player] *= prm.lrLoadOther;
    }
  } else if (wPlayer !== caller) {
    if (!took && isCarico(card)) ev[wPlayer] *= prm.lrCallerLoads;
    else if (took && table >= 10) ev[wPlayer] *= prm.lrCallerOvertakes;
  }
}
