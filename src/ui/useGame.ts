import { useCallback, useEffect, useRef, useState } from 'react';
import { BOT_CONFIGS, type BotLevel, BotMemory, type Decision, decide } from '../ai/bot';
import type { WorkerRequest, WorkerResponse } from '../ai/worker';
import type { MoveNote } from '../ai/notes';
import type { HandAction } from '../engine/hand';
import { advanceMatch, applyMatchAction, matchWinners } from '../engine/match';
import { viewFor } from '../engine/view';
import { putMatch } from '../history/db';
import { addNote, buildHandRecord, currentHandNumber, emptyNotes, snapshotRecord } from '../history/record';
import { type GameSession, type Speed, saveSession } from './storage';

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

/** Salva la sessione (localStorage) e lo storico (IndexedDB), al più una volta ogni tanto. */
function usePersist(session: GameSession, onHistoryError: (e: string) => void) {
  const latest = useRef(session);
  latest.current = session;
  const flush = useCallback(() => {
    const s = latest.current;
    saveSession(s);
    const winners = s.match.finished ? matchWinners(s.match) : [];
    putMatch(snapshotRecord(s.record, s.match, s.notes, winners, Date.now())).catch((err) =>
      onHistoryError(`Storico non salvato: ${String(err)}`),
    );
  }, [onHistoryError]);
  useEffect(() => {
    const t = setTimeout(flush, session.match.finished ? 0 : 400);
    return () => clearTimeout(t);
  }, [session, flush]);
  // All'uscita dalla partita salva subito l'ultimo stato.
  useEffect(() => flush, [flush]);
}

export function useGame(initial: GameSession, level: BotLevel, speed: Speed) {
  const [session, setSession] = useState(initial);
  const [holdTrick, setHoldTrick] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const ref = useRef(session);
  ref.current = session;
  const ask = useBotEngine();
  const delays = DELAYS[speed];
  const match = session.match;

  usePersist(session, setHistoryError);

  const commit = (next: GameSession) => {
    ref.current = next;
    setSession(next);
  };

  const dispatch = useCallback((action: HandAction, note?: MoveNote) => {
    const prev = ref.current;
    try {
      const nextMatch = applyMatchAction(prev.match, action);
      commit({ ...prev, match: nextMatch, notes: addNote(prev.notes, action, note) });
      if (nextMatch.hand.tricks.length > prev.match.hand.tricks.length) setHoldTrick(true);
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
        if (reqId.current === id) dispatch(toAction(player, decision), decision.note);
      }, wait);
    });
    return () => {
      reqId.current++;
      cancel();
      if (timer) clearTimeout(timer);
    };
  }, [match, holdTrick, level, delays.bot, ask, dispatch]);

  const nextHand = useCallback(() => {
    const prev = ref.current;
    const m = prev.match;
    const done = buildHandRecord(m.hand, prev.notes, m.deals, currentHandNumber(m));
    commit({
      match: advanceMatch(m),
      record: { ...prev.record, hands: [...prev.record.hands, done] },
      notes: emptyNotes(),
    });
  }, []);

  const releaseTrick = useCallback(() => setHoldTrick(false), []);

  return { session, match, holdTrick, error, historyError, dispatch, nextHand, releaseTrick };
}
