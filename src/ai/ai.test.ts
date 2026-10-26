import { describe, expect, it } from 'vitest';
import { makeCard } from '../engine/cards';
import { applyHandAction, newHand } from '../engine/hand';
import { mulberry32 } from '../engine/rng';
import { viewFor } from '../engine/view';
import { handDeltas, playBotHand } from './arena';
import { BOT_CONFIGS, type BotConfig } from './bot';
import { buildBidTable, chooseBid, expectedValue } from './bidding';
import { DEFAULT_SEARCH, searchCard } from './search';
import { makeSampler, partnerWeights } from './worlds';

const fast: BotConfig = { ...BOT_CONFIGS.base, bidding: { ...BOT_CONFIGS.base.bidding, samples: 6 } };
const fastSearch: BotConfig = {
  ...fast,
  search: { ...DEFAULT_SEARCH, timeMs: 0, minWorlds: 8, maxWorlds: 8 },
};

/** Porta una mano alla fase di gioco con il giocatore 1 chiamante del Re di briscola `suit`. */
function startPlay(seed: number, suit = 0) {
  let s = newHand(0, seed);
  s = applyHandAction(s, { type: 'bid', player: 1, bid: { kind: 'call', rank: 2 } });
  for (const p of [2, 3, 4, 0]) s = applyHandAction(s, { type: 'bid', player: p, bid: { kind: 'pass' } });
  return applyHandAction(s, { type: 'trump', player: 1, suit });
}

describe('mani giocate dai bot', () => {
  it('rispettano sempre le regole e i totali', () => {
    for (let i = 0; i < 25; i++) {
      const cfg = i % 5 === 0 ? fastSearch : fast;
      const s = playBotHand(i % 5, 100 + i, [cfg, fast, fast, fast, fast]);
      expect(s.phase).toBe('end');
      if (s.allPassed) continue;
      expect(s.tricks.length).toBe(8);
      expect(s.points.reduce((a, b) => a + b, 0)).toBe(120);
      expect(new Set(s.tricks.flatMap((t) => t.plays.map((p) => p.card))).size).toBe(40);
      expect(handDeltas(s).reduce((a, b) => a + b, 0)).toBe(0);
    }
  });
});

describe('informazioni nascoste', () => {
  it('la vista di un giocatore non contiene le mani altrui né il compagno segreto', () => {
    const s = startPlay(11);
    const outsider = [0, 2, 3, 4].find((p) => p !== s.partner)!;
    const v = viewFor(s, outsider);
    expect(v.knownPartner).toBeNull();
    expect(JSON.stringify(v)).not.toContain('"hands"');
    expect(Object.keys(v)).not.toContain('partner');
  });
});

describe('campionamento dei mondi', () => {
  it('genera mani coerenti con ciò che il giocatore sa', () => {
    let s = startPlay(21, 3);
    // gioca qualche carta
    for (let k = 0; k < 7; k++) s = applyHandAction(s, { type: 'play', player: s.turn, card: s.hands[s.turn][0] });
    const me = s.turn;
    const v = viewFor(s, me);
    const sampler = makeSampler(v);
    const rand = mulberry32(5);
    const called = makeCard(3, 2);
    for (let i = 0; i < 50; i++) {
      const w = sampler.sample(rand);
      expect(w.hands[me].sort()).toEqual([...s.hands[me]].sort());
      expect(w.hands.map((h) => h.length)).toEqual(s.hands.map((h) => h.length));
      const all = w.hands.flat();
      expect(new Set(all).size).toBe(all.length);
      const holder = w.hands.findIndex((h) => h.includes(called));
      if (holder >= 0) expect(holder).toBe(w.partner);
      if (me !== s.caller && me !== s.partner) expect(w.partner).not.toBe(me);
    }
  });

  it('chi carica le prese del chiamante diventa un compagno più probabile', () => {
    const s = startPlay(31, 0);
    const v = viewFor(s, 0);
    const base = partnerWeights(v);
    const loaded = {
      ...v,
      current: {
        leader: 1,
        plays: [
          { player: 1, card: makeCard(0, 0) },
          { player: 2, card: makeCard(1, 0) },
        ],
      },
    };
    const w = partnerWeights(loaded);
    expect(w[2] / w[3]).toBeGreaterThan(base[2] / base[3]);
    expect(w[1]).toBeLessThan(w[3]);
  });
});

describe('asta e ricerca', () => {
  it('con una mano fortissima si chiama, con una debole si passa', () => {
    const rand = mulberry32(3);
    // 8 Denari su 10: briscola ovvia.
    const strong = [10, 11, 12, 13, 14, 15, 16, 17];
    const weak = [5, 6, 7, 8, 25, 26, 37, 38];
    const s = newHand(4, 1);
    const v = { ...viewFor(s, 0), hand: strong };
    const tStrong = buildBidTable(strong, 0, 4, { ...BOT_CONFIGS.forte.bidding, samples: 20 }, rand);
    expect(expectedValue(tStrong, 8, 1, 61)).toBeGreaterThan(1);
    expect(chooseBid(v, tStrong).kind).toBe('call');
    const tWeak = buildBidTable(weak, 0, 4, { ...BOT_CONFIGS.forte.bidding, samples: 20 }, rand);
    expect(chooseBid({ ...v, hand: weak }, tWeak).kind).toBe('pass');
  });

  it('la ricerca valuta tutte le carte in mano e ne sceglie una', () => {
    let s = startPlay(41, 2);
    while (s.current!.plays.length < 4) {
      s = applyHandAction(s, { type: 'play', player: s.turn, card: s.hands[s.turn][0] });
    }
    const v = viewFor(s, s.turn);
    const r = searchCard(v, { ...DEFAULT_SEARCH, timeMs: 0, minWorlds: 30, maxWorlds: 30 }, mulberry32(9));
    expect(v.hand).toContain(r.card);
    expect(r.values.map((x) => x.card).sort()).toEqual([...v.hand].sort());
  });
});
