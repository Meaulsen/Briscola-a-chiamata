import { NUM_PLAYERS } from '../engine/cards';
import { type HandState, applyHandAction, newHand } from '../engine/hand';
import { mulberry32 } from '../engine/rng';
import { viewFor } from '../engine/view';
import { type BotConfig, BotMemory, decide } from './bot';

/** Gioca una mano completa tra bot (usato da test e tornei). */
export function playBotHand(dealer: number, seed: number, seats: BotConfig[], aiSeed = seed): HandState {
  const rand = mulberry32(aiSeed ^ 0x5bd1e995);
  const mems = Array.from({ length: NUM_PLAYERS }, () => new BotMemory());
  let s = newHand(dealer, seed);
  while (s.phase !== 'end') {
    const p = s.turn;
    const d = decide(viewFor(s, p), seats[p], mems[p], rand);
    if (d.type === 'bid') s = applyHandAction(s, { type: 'bid', player: p, bid: d.bid });
    else if (d.type === 'trump') s = applyHandAction(s, { type: 'trump', player: p, suit: d.suit });
    else s = applyHandAction(s, { type: 'play', player: p, card: d.card });
  }
  return s;
}

export const handDeltas = (s: HandState): number[] => s.outcome?.deltas ?? Array(NUM_PLAYERS).fill(0);
