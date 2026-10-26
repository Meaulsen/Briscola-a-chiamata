import { buildBidTable } from '../src/ai/bidding';
import { deal } from '../src/engine/hand';
const hands = deal(0, 1);
const t0 = performance.now();
buildBidTable(hands[1], 1, 0, { samples: 80, threshold: 0, margin: 0.25, policy: { trumpBase: 4, trumpRank: 0.9, sideRank: 0.2, revealPenalty: 4, loadCaution: 0.15, soloPrior: 0.1, noise: 1 } });
const dt = performance.now() - t0;
console.log('bid table 80 samples (3200 rollouts):', dt.toFixed(0), 'ms', (3200 / dt * 1000).toFixed(0), 'rollouts/s');
