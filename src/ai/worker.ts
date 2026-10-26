/// <reference lib="webworker" />
import type { PlayerView } from '../engine/view';
import { BOT_CONFIGS, type BotLevel, BotMemory, type Decision, decide } from './bot';

export interface WorkerRequest {
  id: number;
  view: PlayerView;
  level: BotLevel;
}

export interface WorkerResponse {
  id: number;
  decision?: Decision;
  error?: string;
}

const memories = new Map<number, BotMemory>();

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, view, level } = e.data;
  try {
    let mem = memories.get(view.me);
    if (!mem) memories.set(view.me, (mem = new BotMemory()));
    const decision = decide(view, BOT_CONFIGS[level], mem);
    (self as unknown as Worker).postMessage({ id, decision } satisfies WorkerResponse);
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, error: String(err) } satisfies WorkerResponse);
  }
};
