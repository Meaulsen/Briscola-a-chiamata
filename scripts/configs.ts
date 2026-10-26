import { BOT_CONFIGS, type BotConfig } from '../src/ai/bot';
import { DEFAULT_SEARCH } from '../src/ai/search';

/**
 * Configurazioni per tornei e statistiche. Oltre ai nomi qui sotto si può scrivere
 * "nome+param=valore,param=valore": i parametri della politica euristica (es. trumpBase)
 * vengono applicati ovunque (gioco, asta, simulazioni); quelli con prefisso
 * "bid.", "search." o "inf." alla sezione corrispondente.
 */
const NAMED: Record<string, BotConfig> = {
  base: BOT_CONFIGS.base,
  forte: { ...BOT_CONFIGS.forte, search: { ...DEFAULT_SEARCH, timeMs: 0, minWorlds: 120, maxWorlds: 120 } },
  forteFull: BOT_CONFIGS.forte,
};

export function getConfig(spec: string): BotConfig {
  const [name, overrides] = spec.split('+');
  const base = NAMED[name];
  if (!base) throw new Error(`Configurazioni disponibili: ${Object.keys(NAMED).join(', ')}`);
  const cfg: BotConfig = structuredClone(base);
  for (const kv of overrides ? overrides.split(',') : []) {
    const [k, v] = kv.split('=');
    const val = Number(v);
    if (k.startsWith('bid.')) (cfg.bidding as unknown as Record<string, number>)[k.slice(4)] = val;
    else if (k.startsWith('search.')) (cfg.search as unknown as Record<string, number>)[k.slice(7)] = val;
    else if (k.startsWith('inf.')) (cfg.search!.inference as unknown as Record<string, number>)[k.slice(4)] = val;
    else {
      for (const pol of [cfg.policy, cfg.bidding.policy, cfg.search?.rolloutPolicy]) {
        if (pol) (pol as unknown as Record<string, number>)[k] = val;
      }
    }
  }
  return cfg;
}
