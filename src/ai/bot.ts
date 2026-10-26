import type { Card, Suit } from '../engine/cards';
import type { Bid } from '../engine/auction';
import type { PlayerView } from '../engine/view';
import { type BidTable, type BiddingParams, DEFAULT_BIDDING, buildBidTable, chooseBid, chooseTrump } from './bidding';
import { DEFAULT_HEURISTIC, type HeuristicParams, heuristicCard } from './heuristic';
import { DEFAULT_SEARCH, type SearchParams, searchCard } from './search';
import { makeSampler, simFromView } from './worlds';

export type BotLevel = 'base' | 'forte';

export type Decision = { type: 'bid'; bid: Bid } | { type: 'trump'; suit: Suit } | { type: 'play'; card: Card };

export interface BotConfig {
  /** Politica euristica usata quando non c'è ricerca. */
  policy: HeuristicParams;
  bidding: BiddingParams;
  /** null = gioca con la sola euristica, senza ricerca. */
  search: SearchParams | null;
}

export const BOT_CONFIGS: Record<BotLevel, BotConfig> = {
  base: { policy: DEFAULT_HEURISTIC, bidding: { ...DEFAULT_BIDDING, samples: 24 }, search: null },
  forte: { policy: DEFAULT_HEURISTIC, bidding: DEFAULT_BIDDING, search: DEFAULT_SEARCH },
};

/** Cache delle valutazioni d'asta (costose) per mano. */
export class BotMemory {
  private tables = new Map<string, BidTable>();

  bidTable(v: PlayerView, prm: BiddingParams, rand: () => number): BidTable {
    const hand = v.phase === 'auction' || v.phase === 'trump' ? v.hand : [];
    const key = `${v.me}|${v.dealer}|${prm.samples}|${[...hand].sort((a, b) => a - b).join(',')}`;
    let t = this.tables.get(key);
    if (!t) {
      t = buildBidTable(hand, v.me, v.dealer, prm, rand);
      if (this.tables.size > 50) this.tables.clear();
      this.tables.set(key, t);
    }
    return t;
  }
}

export function decide(v: PlayerView, cfg: BotConfig, mem: BotMemory, rand: () => number = Math.random): Decision {
  if (v.turn !== v.me) throw new Error('Non è il mio turno');
  switch (v.phase) {
    case 'auction':
      return { type: 'bid', bid: chooseBid(v, mem.bidTable(v, cfg.bidding, rand), cfg.bidding) };
    case 'trump':
      return { type: 'trump', suit: chooseTrump(v, mem.bidTable(v, cfg.bidding, rand)) };
    case 'play': {
      if (cfg.search) return { type: 'play', card: searchCard(v, cfg.search, rand).card };
      const w = makeSampler(v).sample(rand);
      return { type: 'play', card: heuristicCard(simFromView(v, w.hands, w.partner), v.me, cfg.policy, rand) };
    }
    default:
      throw new Error('Nessuna decisione da prendere');
  }
}
