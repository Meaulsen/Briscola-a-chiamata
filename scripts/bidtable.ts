import { buildBidTable, bestSuit, expectedValue, DEFAULT_BIDDING } from '../src/ai/bidding';
import { deal } from '../src/engine/hand';
import { cardShort, RANK_NAMES } from '../src/engine/cards';
const seed = Number(process.argv.slice(2).filter((a) => a !== '--')[0] ?? 1);
const hands = deal(0, seed);
for (const me of [1, 2, 3]) {
  const t = buildBidTable(hands[me], me, 0, { ...DEFAULT_BIDDING, samples: 200 });
  console.log('mano', hands[me].map(cardShort).join(' '));
  for (let r = 0; r < 10; r++) {
    const b = bestSuit(t, r, 61);
    const evs = [0, 1, 2, 3].map((s) => expectedValue(t, r, s, 61).toFixed(2)).join(' ');
    console.log(' ', RANK_NAMES[r].padEnd(8), 'best', b.suit, b.ev.toFixed(2), '|', evs);
  }
}
