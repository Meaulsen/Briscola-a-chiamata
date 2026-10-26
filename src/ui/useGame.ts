import { useCallback, useEffect, useRef, useState } from 'react';
import { BOT_CONFIGS, type BotLevel, BotMemory, type Decision, decide } from '../ai/bot';
import type { WorkerRequest, WorkerResponse } from '../ai/worker';
import type { HandAction } from '../engine/hand';
import { type MatchState, advanceMatch, applyMatchAction } from '../engine/match';
import { viewFor } from '../engine/view';
import { type Speed, saveMatch } from './storage';

export const HUMAN = 0;

const DELAYS: Record<Speed, { bot: number; trick: number }> = {
  lenta: { bot: 1300, trick: 2400 },
  normale: { bot: 750, trick: 1600 },
  veloce: { bot: 250, trick: 800 },
};

type Ask = (req: WorkerRequest, done: (r: WorkerResponse) => void) => () => void;

/** Calcolo delle mosse dei bot in un Web Worker, con ripiego sul thread principale. */
function useBotEngine(): Ask {
  const ref = useRef<Ask | null>(null);
  if (!ref.current) {
    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL('../ai/worker.ts', import.meta.url), { type: 'module' });
    } catch {
      worker = null;
    }
    if (worker) {
      const w = worker;
      ref.current = (req, done) => {
        const onMsg = (e: MessageEvent<WorkerResponse>) => {
          if (e.data.id === req.id) done(e.data);
        };
        w.addEventListener('message', onMsg);
        w.postMessage(req);
        return () => w.removeEventListener('message', onMsg);
      };
    } else {
      const mems = new Map<number, BotMemory>();
      ref.current = (req, done) => {
        const t = setTimeout(() => {
          let mem = mems.get(req.view.me);
          if (!mem) mems.set(req.view.me, (mem = new BotMemory()));
          try {
            done({ id: req.id, decision: decide(req.view, BOT_CONFIGS[req.level], mem) });
          } catch (err) {
            done({ id: req.id, error: String(err) });
          }
        }, 0);
        return () => clearTimeout(t);
      };
    }
  }
  return ref.current;
}

function toAction(player: number, d: Decision): HandAction {
  if (d.type === 'bid') return { type: 'bid', player, bid: d.bid };
  if (d.type === 'trump') return { type: 'trump', player, suit: d.suit };
  return { type: 'play', player, card: d.card };
}

export function useGame(initial: MatchState, level: BotLevel, speed: Speed) {
  const [match, setMatch] = useState(initial);
  const [holdTrick, setHoldTrick] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matchRef = useRef(match);
  matchRef.current = match;
  const ask = useBotEngine();
  const delays = DELAYS[speed];

  useEffect(() => saveMatch(match), [match]);

  const dispatch = useCallback((action: HandAction) => {
    const prev = matchRef.current;
    try {
      const next = applyMatchAction(prev, action);
      matchRef.current = next;
      setMatch(next);
      if (next.hand.tricks.length > prev.hand.tricks.length) setHoldTrick(true);
    } catch (err) {
      setError(String(err));
    }
  }, []);

  useEffect(() => {
    if (!holdTrick) return;
    const t = setTimeout(() => setHoldTrick(false), delays.trick);
    return () => clearTimeout(t);
  }, [holdTrick, delays.trick]);

  const reqId = useRef(0);
  useEffect(() => {
    const h = match.hand;
    if (match.finished || holdTrick || h.phase === 'end' || h.turn === HUMAN) return;
    const id = ++reqId.current;
    const started = performance.now();
    const player = h.turn;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cancel = ask({ id, view: viewFor(h, player), level }, (res) => {
      if (res.error || !res.decision) {
        setError(res.error ?? 'Errore del bot');
        return;
      }
      const decision = res.decision;
      const wait = Math.max(0, delays.bot - (performance.now() - started));
      timer = setTimeout(() => {
        if (reqId.current === id) dispatch(toAction(player, decision));
      }, wait);
    });
    return () => {
      reqId.current++;
      cancel();
      if (timer) clearTimeout(timer);
    };
  }, [match, holdTrick, level, delays.bot, ask, dispatch]);

  const nextHand = useCallback(() => {
    const next = advanceMatch(matchRef.current);
    matchRef.current = next;
    setMatch(next);
  }, []);

  const releaseTrick = useCallback(() => setHoldTrick(false), []);

  return { match, holdTrick, error, dispatch, nextHand, releaseTrick };
}
