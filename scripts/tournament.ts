/**
 * Torneo "duplicato" tra due configurazioni di bot: per ogni distribuzione, il bot A
 * occupa a turno ciascuno dei 5 posti contro 4 bot B, e si confronta con la stessa
 * distribuzione giocata da 5 bot B. Uso:
 *   npx vite-node scripts/tournament.ts -- <A> <B> <deals> [firstSeed]
 * dove A e B sono configurazioni (vedi scripts/configs.ts).
 */
import { handDeltas, playBotHand } from '../src/ai/arena';
import { getConfig } from './configs';

const args = process.argv.slice(2).filter((a) => a !== '--');
const [aName = 'forte', bName = 'base', dealsStr = '20', seedStr = '1000'] = args;
const A = getConfig(aName);
const B = getConfig(bName);

const deals = Number(dealsStr);
const first = Number(seedStr);

let sumDiff = 0;
let sumSq = 0;
let n = 0;
const t0 = Date.now();
for (let d = 0; d < deals; d++) {
  const seed = first + d;
  const dealer = d % 5;
  const ref = handDeltas(playBotHand(dealer, seed, [B, B, B, B, B]));
  for (let seat = 0; seat < 5; seat++) {
    const seats = [B, B, B, B, B];
    seats[seat] = A;
    const res = handDeltas(playBotHand(dealer, seed, seats));
    const diff = res[seat] - ref[seat];
    sumDiff += diff;
    sumSq += diff * diff;
    n++;
  }
}
const mean = sumDiff / n;
const sd = Math.sqrt(sumSq / n - mean * mean);
console.log(
  `${aName} vs ${bName}: ${n} partite-posto, vantaggio medio ${mean.toFixed(3)} ± ${(sd / Math.sqrt(n)).toFixed(3)} punti/mano (${((Date.now() - t0) / 1000).toFixed(0)} s)`,
);
