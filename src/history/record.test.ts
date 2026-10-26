import { describe, expect, it } from 'vitest';
import { BOT_CONFIGS, type BotConfig, BotMemory, decide } from '../ai/bot';
import { DEFAULT_SEARCH } from '../ai/search';
import { NUM_PLAYERS } from '../engine/cards';
import { type HandAction, type HandState, applyHandAction, deal, newHand } from '../engine/hand';
import { advanceMatch, applyMatchAction, newMatch } from '../engine/match';
import { mulberry32 } from '../engine/rng';
import { viewFor } from '../engine/view';
import { type HandNotes, addNote, buildHandRecord, emptyNotes, newMatchRecord, snapshotRecord, summarize } from './record';

const cfg: BotConfig = {
  ...BOT_CONFIGS.forte,
  bidding: { ...BOT_CONFIGS.forte.bidding, samples: 6 },
  search: { ...DEFAULT_SEARCH, timeMs: 0, minWorlds: 6, maxWorlds: 6 },
};

/** Gioca una mano con i bot fermandosi dopo `maxMoves` mosse, raccogliendo le note. */
function playWithNotes(dealer: number, seed: number, maxMoves = Infinity): { s: HandState; notes: HandNotes } {
  const rand = mulberry32(seed);
  const mems = Array.from({ length: NUM_PLAYERS }, () => new BotMemory());
  let s = newHand(dealer, seed);
  let notes = emptyNotes();
  let moves = 0;
  while (s.phase !== 'end' && moves < maxMoves) {
    const p = s.turn;
    const d = decide(viewFor(s, p), cfg, mems[p], rand);
    const action: HandAction =
      d.type === 'bid'
        ? { type: 'bid', player: p, bid: d.bid }
        : d.type === 'trump'
          ? { type: 'trump', player: p, suit: d.suit }
          : { type: 'play', player: p, card: d.card };
    s = applyHandAction(s, action);
    notes = addNote(notes, action, d.note);
    moves++;
  }
  return { s, notes };
}

describe('record di una mano', () => {
  it('ricostruisce mani iniziali, asta e giocate con le note dei bot', () => {
    for (const seed of [1, 2, 3]) {
      const { s, notes } = playWithNotes(seed % 5, seed);
      const r = buildHandRecord(s, notes, 1, 1);
      expect(r.initialHands).toEqual(deal(seed % 5, seed));
      expect(r.auction.length).toBe(s.auction.history.length);
      expect(r.auction.every((e) => e.note !== null && e.note.evs.length > 0)).toBe(true);
      if (s.allPassed) continue;
      expect(r.finished).toBe(true);
      expect(r.trumpNote?.evs.length).toBe(4);
      expect(r.tricks.length).toBe(8);
      const plays = r.tricks.flatMap((t) => t.plays);
      expect(plays.length).toBe(40);
      expect(plays.map((p) => p.card)).toEqual(s.tricks.flatMap((t) => t.plays.map((p) => p.card)));
      // Ogni nota di gioco valuta esattamente le carte che il bot aveva in mano in quel momento.
      const remaining = r.initialHands.map((h) => new Set(h));
      for (const p of plays) {
        expect(p.note).not.toBeNull();
        expect(p.note!.values.map((v) => v.card).sort()).toEqual([...remaining[p.player]].sort());
        remaining[p.player].delete(p.card);
      }
      expect(r.outcome).toEqual(s.outcome);
    }
  });

  it('funziona anche a mano in corso', () => {
    const { s, notes } = playWithNotes(0, 7, 13);
    const r = buildHandRecord(s, notes, 1, 1);
    expect(r.initialHands).toEqual(deal(0, 7));
    expect(r.finished).toBe(false);
    const played = r.tricks.flatMap((t) => t.plays).length;
    expect(played).toBe(13 - s.auction.history.length - 1);
    if (r.tricks.length > 0 && r.tricks[r.tricks.length - 1].plays.length < 5) {
      expect(r.tricks[r.tricks.length - 1].winner).toBeNull();
    }
  });

  it('le mosse umane non hanno note', () => {
    const notes = addNote(emptyNotes(), { type: 'bid', player: 0, bid: { kind: 'pass' } }, undefined);
    expect(notes.bids).toEqual([null]);
  });
});

describe('record della partita', () => {
  it('registra le mani annullate e la mano in corso', () => {
    let m = newMatch({ id: 'test', numHands: 3, names: ['a', 'b', 'c', 'd', 'e'], seed: 4 });
    let rec = newMatchRecord(m, 'base', 0);
    for (let i = 0; i < 5; i++) m = applyMatchAction(m, { type: 'bid', player: m.hand.turn, bid: { kind: 'pass' } });
    rec = { ...rec, hands: [...rec.hands, buildHandRecord(m.hand, emptyNotes(), m.deals, null)] };
    m = advanceMatch(m);
    const snap = snapshotRecord(rec, m, emptyNotes(), [], 10);
    expect(snap.hands.length).toBe(2);
    expect(snap.hands[0].allPassed).toBe(true);
    expect(snap.hands[0].number).toBeNull();
    expect(snap.hands[1].number).toBe(1);
    expect(snap.hands[1].finished).toBe(false);
    expect(summarize(snap).handsPlayed).toBe(0);
    expect(snap.id).toBe('test');
  });
});
