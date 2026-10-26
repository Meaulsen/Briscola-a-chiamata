import { NUM_PLAYERS } from './cards';

export interface HandOutcome {
  caller: number;
  /** Compagno; coincide con il chiamante se si è chiamato da solo. */
  partner: number;
  solo: boolean;
  target: number;
  callerTeamPoints: number;
  callerTeamTricks: number;
  callerWins: boolean;
  cappotto: boolean;
  /** Punti di classifica assegnati a ciascun giocatore (somma zero). */
  deltas: number[];
}

/**
 * Calcola l'esito di una mano a partire dai punti carta e dalle prese di ciascun giocatore.
 */
export function scoreHand(params: {
  caller: number;
  partner: number;
  target: number;
  points: readonly number[];
  tricks: readonly number[];
}): HandOutcome {
  const { caller, partner, target, points, tricks } = params;
  const solo = caller === partner;
  const callerTeamPoints = solo ? points[caller] : points[caller] + points[partner];
  const callerTeamTricks = solo ? tricks[caller] : tricks[caller] + tricks[partner];
  const callerWins = callerTeamPoints >= target;
  const totalTricks = tricks.reduce((a, b) => a + b, 0);
  const cappotto = callerTeamTricks === totalTricks || callerTeamTricks === 0;
  const deltas = scoreDeltas(caller, partner, callerWins, cappotto);
  return { caller, partner, solo, target, callerTeamPoints, callerTeamTricks, callerWins, cappotto, deltas };
}

export function scoreDeltas(caller: number, partner: number, callerWins: boolean, cappotto: boolean): number[] {
  const sign = callerWins ? 1 : -1;
  const mult = cappotto ? 2 : 1;
  const deltas = Array(NUM_PLAYERS).fill(-sign * mult);
  if (caller === partner) {
    deltas[caller] = 4 * sign * mult;
  } else {
    deltas[caller] = 2 * sign * mult;
    deltas[partner] = sign * mult;
  }
  return deltas;
}
