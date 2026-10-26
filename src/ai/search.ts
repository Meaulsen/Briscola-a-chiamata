import type { Card } from '../engine/cards';
import type { PlayerView } from '../engine/view';
import { DEFAULT_HEURISTIC, type HeuristicParams, rollout } from './heuristic';
import { cloneSim, evaluate, simPlay } from './sim';
import { DEFAULT_INFERENCE, type InferenceParams, makeSampler, simFromView } from './worlds';

export interface SearchParams {
  timeMs: number;
  minWorlds: number;
  maxWorlds: number;
  marginWeight: number;
  rolloutPolicy: HeuristicParams;
  inference: InferenceParams;
}

export const DEFAULT_SEARCH: SearchParams = {
  timeMs: 600,
  minWorlds: 60,
  maxWorlds: 4000,
  marginWeight: 0.5,
  rolloutPolicy: { ...DEFAULT_HEURISTIC, noise: 1 },
  inference: DEFAULT_INFERENCE,
};

export interface SearchResult {
  card: Card;
  worlds: number;
  values: { card: Card; value: number }[];
}

const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/**
 * Monte Carlo con determinizzazione: per ogni mondo campionato coerente con ciò che
 * il giocatore sa, prova ogni carta in mano e simula il resto della mano con la
 * politica euristica; sceglie la carta con il miglior valore medio (pesato).
 */
export function searchCard(v: PlayerView, prm: SearchParams = DEFAULT_SEARCH, rand: () => number = Math.random): SearchResult {
  const hand = v.hand;
  if (hand.length === 1) return { card: hand[0], worlds: 0, values: [{ card: hand[0], value: 0 }] };
  const sampler = makeSampler(v, prm.inference);
  const sums = new Float64Array(hand.length);
  let wsum = 0;
  let worlds = 0;
  const start = now();
  while (worlds < prm.maxWorlds && (worlds < prm.minWorlds || now() - start < prm.timeMs)) {
    const w = sampler.sample(rand);
    const base = simFromView(v, w.hands, w.partner);
    for (let i = 0; i < hand.length; i++) {
      const s = cloneSim(base);
      simPlay(s, hand[i]);
      rollout(s, prm.rolloutPolicy, rand);
      sums[i] += w.weight * evaluate(s, v.me, prm.marginWeight);
    }
    wsum += w.weight;
    worlds++;
  }
  const values = hand.map((card, i) => ({ card, value: sums[i] / wsum }));
  let best = values[0];
  for (const x of values) if (x.value > best.value) best = x;
  return { card: best.card, worlds, values };
}
