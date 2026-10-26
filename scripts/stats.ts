/** Statistiche su mani giocate da bot: uso npx vite-node scripts/stats.ts -- <config> <hands> */
import { handDeltas, playBotHand } from '../src/ai/arena';
import { getConfig } from './configs';
import { suitOf } from '../src/engine/cards';

const args = process.argv.slice(2).filter((a) => a !== '--');
const cfg = getConfig(args[0] ?? 'base');
const n = Number(args[1] ?? 100);
let allPassed = 0, wins = 0, solo = 0, cap = 0, played = 0, pts = 0, trumpsSum = 0;
const ranks = Array(10).fill(0);
const trumpHist = Array(9).fill(0);
const callerDelta = { sum: 0 };
for (let i = 0; i < n; i++) {
  const s = playBotHand(i % 5, 5000 + i, [cfg, cfg, cfg, cfg, cfg]);
  if (s.allPassed) { allPassed++; continue; }
  played++;
  const o = s.outcome!;
  if (o.callerWins) wins++;
  if (o.solo) solo++;
  if (o.cappotto) cap++;
  pts += o.callerTeamPoints;
  ranks[s.rank!]++;
  callerDelta.sum += handDeltas(s)[o.caller];
  // briscole nella mano iniziale del chiamante
  const init = [...s.tricks.flatMap((t) => t.plays)].filter((p) => p.player === o.caller).map((p) => p.card);
  const nt = init.filter((c) => suitOf(c) === s.trump).length;
  trumpHist[nt]++; trumpsSum += nt;
}
console.log({ hands: n, allPassed, played, callerWinRate: (wins / played).toFixed(3), soloRate: (solo / played).toFixed(3), cappottoRate: (cap / played).toFixed(3), avgCallerPts: (pts / played).toFixed(1), avgCallerDelta: (callerDelta.sum / played).toFixed(2), ranks, trumpHist, avgTrumps: (trumpsSum / played).toFixed(2) });
