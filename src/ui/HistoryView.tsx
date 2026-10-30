import { useEffect, useMemo, useState } from 'react';
import { NUM_PLAYERS, RANK_DUE, RANK_NAMES, SUIT_NAMES, cardName, sortHand } from '../engine/cards';
import { describeBid } from '../engine/auction';
import { deleteMatch, getMatch, listMatches } from '../history/db';
import type { HandRecord, MatchRecord, MatchSummary } from '../history/record';
import { CardView } from './CardView';
import { describeRedeals } from './Panels';
import { HUMAN } from './useGame';

const fmt = (n: number) => (n > 0 ? `+${n}` : String(n));
const fmtEv = (n: number) => (n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2));
const fmtDate = (t: number) =>
  new Date(t).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function HistoryView({ initialMatchId, onBack }: { initialMatchId: string | null; onBack: () => void }) {
  const [list, setList] = useState<MatchSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<MatchRecord | null>(null);
  const [handIdx, setHandIdx] = useState<number | null>(null);

  const refresh = () =>
    listMatches()
      .then(setList)
      .catch((e) => setError(String(e)));

  const open = (id: string) =>
    getMatch(id)
      .then((m) => {
        if (m) {
          setMatch(m);
          setHandIdx(null);
        } else setError('Partita non trovata nello storico.');
      })
      .catch((e) => setError(String(e)));

  useEffect(() => {
    refresh();
    if (initialMatchId) open(initialMatchId);
  }, [initialMatchId]);

  let body;
  if (error) body = <p className="error">{error}</p>;
  else if (match && handIdx !== null)
    body = <HandReplay match={match} hand={match.hands[handIdx]} onBack={() => setHandIdx(null)} />;
  else if (match) body = <MatchDetail match={match} onOpenHand={setHandIdx} onBack={() => setMatch(null)} />;
  else
    body = (
      <MatchList
        list={list}
        onOpen={open}
        onDelete={(id) => {
          if (window.confirm('Eliminare questa partita dallo storico?')) deleteMatch(id).then(refresh, (e) => setError(String(e)));
        }}
      />
    );

  return (
    <div className="history-view">
      <header className="history-head">
        <h1>Storico partite</h1>
        <button type="button" className="secondary" onClick={onBack}>
          Menu
        </button>
      </header>
      {body}
    </div>
  );
}

function MatchList({ list, onOpen, onDelete }: {
  list: MatchSummary[] | null;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (!list) return <p className="muted">Caricamento…</p>;
  if (list.length === 0) return <p className="muted">Nessuna partita registrata. Le partite vengono salvate qui mentre giochi.</p>;
  return (
    <div className="table-scroll">
      <table className="score-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Stato</th>
            <th>Bot</th>
            <th>Mani</th>
            <th>Punteggi</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {list.map((m) => (
            <tr key={m.id}>
              <td>{fmtDate(m.startedAt)}</td>
              <td>{m.finished ? 'Finita' : 'In corso'}</td>
              <td>{m.level === 'forte' ? 'Massimo' : 'Base'}</td>
              <td>
                {m.handsPlayed}/{m.numHands}
              </td>
              <td>
                {m.names.map((n, i) => (
                  <span key={i} className={m.winners.includes(i) ? 'winner' : ''}>
                    {n} {fmt(m.scores[i])}
                    {i < m.names.length - 1 ? ' · ' : ''}
                  </span>
                ))}
              </td>
              <td className="actions">
                <button type="button" onClick={() => onOpen(m.id)}>
                  Apri
                </button>
                <button type="button" className="secondary" onClick={() => onDelete(m.id)}>
                  Elimina
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MatchDetail({ match, onOpenHand, onBack }: {
  match: MatchRecord;
  onOpenHand: (i: number) => void;
  onBack: () => void;
}) {
  const names = match.names;
  const running = Array(NUM_PLAYERS).fill(0);
  return (
    <div>
      <button type="button" className="secondary" onClick={onBack}>
        ← Tutte le partite
      </button>
      <h2>Partita del {fmtDate(match.startedAt)}</h2>
      <p className="muted">
        {match.finished ? 'Finita' : 'In corso'} · bot livello {match.level === 'forte' ? 'Massimo' : 'Base'} · {match.numHands} mani
        {match.finished && match.winners.length > 0 && <> · vince {match.winners.map((w) => names[w]).join(', ')}</>}
      </p>
      <div className="table-scroll">
        <table className="score-table history">
          <thead>
            <tr>
              <th>Mano</th>
              <th>Mazziere</th>
              <th>Chiamata</th>
              <th>Compagno</th>
              <th>Punti</th>
              <th>Esito</th>
              {names.map((n) => (
                <th key={n}>{n}</th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {match.hands.map((h, i) => {
              const o = h.outcome;
              if (o) for (let p = 0; p < NUM_PLAYERS; p++) running[p] += o.deltas[p];
              return (
                <tr key={i}>
                  <td>{h.number ?? '—'}</td>
                  <td>{names[h.dealer]}</td>
                  <td>{callLabel(h, names)}</td>
                  <td>{h.partner === null ? '' : h.partner === h.caller ? 'da solo' : names[h.partner]}</td>
                  <td>{o ? `${o.callerTeamPoints}/${o.target}` : ''}</td>
                  <td>
                    {h.allPassed
                      ? 'tutti passano'
                      : !h.finished
                        ? 'in corso'
                        : `${o!.callerWins ? 'vinta' : 'persa'}${o!.cappotto ? ', cappotto' : ''}`}
                  </td>
                  {names.map((_, p) => (
                    <td key={p}>{o ? `${fmt(o.deltas[p])} (${fmt(running[p])})` : ''}</td>
                  ))}
                  <td>
                    <button type="button" onClick={() => onOpenHand(i)}>
                      Analizza
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="legend">Per ogni giocatore: punti della mano (totale progressivo).</p>
    </div>
  );
}

function callLabel(h: HandRecord, names: string[]): string {
  if (h.caller === null || h.rank === null) return '';
  const what = h.calledCard !== null ? cardName(h.calledCard) : RANK_NAMES[h.rank];
  return `${names[h.caller]}: ${what}${h.target > 61 ? ` a ${h.target}` : ''}`;
}

type Step =
  | { kind: 'bid'; index: number }
  | { kind: 'trump' }
  | { kind: 'play'; trick: number; pos: number };

function stepsOf(h: HandRecord): Step[] {
  const steps: Step[] = h.auction.map((_, index) => ({ kind: 'bid', index }));
  if (h.trump !== null) steps.push({ kind: 'trump' });
  h.tricks.forEach((t, trick) => t.plays.forEach((_, pos) => steps.push({ kind: 'play', trick, pos })));
  return steps;
}

function HandReplay({ match, hand, onBack }: { match: MatchRecord; hand: HandRecord; onBack: () => void }) {
  const names = match.names;
  const steps = useMemo(() => stepsOf(hand), [hand]);
  const [step, setStep] = useState(steps.length);
  const cur = step > 0 ? steps[step - 1] : null;

  // Carte già giocate fino al passo corrente.
  const gone = new Set<number>();
  for (let i = 0; i < step; i++) {
    const s = steps[i];
    if (s.kind === 'play') gone.add(hand.tricks[s.trick].plays[s.pos].card);
  }
  const shownTrick = cur?.kind === 'play' ? cur.trick : null;
  const trickPlays = shownTrick !== null ? hand.tricks[shownTrick].plays.slice(0, cur!.kind === 'play' ? cur!.pos + 1 : 0) : [];
  const trickDone = shownTrick !== null && trickPlays.length === 5 && hand.tricks[shownTrick].winner !== null;

  const role = (p: number): string[] => {
    const tags: string[] = [];
    if (p === hand.dealer) tags.push('Mazziere');
    if (p === hand.caller) tags.push(hand.partner === p ? 'Chiamante (da solo)' : 'Chiamante');
    if (hand.partner !== null && p === hand.partner && p !== hand.caller) tags.push('Compagno');
    return tags;
  };

  const go = (s: number) => setStep(Math.max(0, Math.min(steps.length, s)));

  return (
    <div className="replay">
      <button type="button" className="secondary" onClick={onBack}>
        ← Elenco mani
      </button>
      <h2>
        {hand.number !== null ? `Mano ${hand.number}` : 'Mano annullata (tutti hanno passato)'} · mazziere {names[hand.dealer]}
      </h2>
      <p>
        {hand.redeals && hand.redeals.length > 0 && (
          <>
            {describeRedeals(hand.redeals, names)}
            <br />
          </>
        )}
        {callLabel(hand, names) || 'Nessun chiamante'}
        {hand.trump !== null && <> · briscola {SUIT_NAMES[hand.trump]}</>}
        {hand.outcome && (
          <>
            {' '}
            · squadra del chiamante {hand.outcome.callerTeamPoints} punti, {hand.outcome.callerWins ? 'vinta' : 'persa'}
            {hand.outcome.cappotto ? ' con cappotto' : ''}
          </>
        )}
      </p>

      <div className="replay-controls">
        <button type="button" onClick={() => go(0)} aria-label="Inizio">
          ⏮
        </button>
        <button type="button" onClick={() => go(step - 1)} aria-label="Indietro">
          ◀
        </button>
        <input type="range" min={0} max={steps.length} value={step} onChange={(e) => go(Number(e.target.value))} aria-label="Passo" />
        <button type="button" onClick={() => go(step + 1)} aria-label="Avanti">
          ▶
        </button>
        <button type="button" onClick={() => go(steps.length)} aria-label="Fine">
          ⏭
        </button>
        <span className="muted">
          Passo {step} di {steps.length}: {describeStep(hand, cur, names)}
        </span>
      </div>

      <div className="replay-grid">
        <div className="aid">
          <h4>Mani dei giocatori</h4>
          {hand.initialHands.map((cards, p) => (
            <div key={p} className="replay-hand">
              <div className="replay-name">
                <b>{names[p]}</b> {role(p).map((t) => <span key={t} className="tag dark">{t}</span>)}
              </div>
              <div className="cards">
                {sortHand(cards).map((c) => (
                  <span key={c} className={gone.has(c) ? 'gone' : ''}>
                    <CardView card={c} trump={hand.trump} small highlight={c === hand.calledCard} />
                  </span>
                ))}
              </div>
            </div>
          ))}
          <p className="legend">Carte attenuate = già giocate · bordo giallo = carta chiamata</p>
        </div>

        <div className="replay-side">
          {shownTrick !== null && (
            <div className="aid">
              <h4>Presa {shownTrick + 1}</h4>
              <div className="cards trick-row">
                {trickPlays.map((pl) => (
                  <div key={pl.player} className="lt-play">
                    <small>{names[pl.player]}</small>
                    <CardView card={pl.card} trump={hand.trump} small highlight={trickDone && pl.player === hand.tricks[shownTrick].winner} />
                  </div>
                ))}
              </div>
              {trickDone && (
                <p>
                  Prende <b>{names[hand.tricks[shownTrick].winner!]}</b> ({hand.tricks[shownTrick].points} punti)
                </p>
              )}
            </div>
          )}
          <div className="aid">
            <h4>Ragionamento</h4>
            <DecisionDetail hand={hand} step={cur} names={names} level={match.level} />
          </div>
        </div>
      </div>

      <div className="aid">
        <h4>Asta</h4>
        <ul className="auction-list">
          {hand.auction.map((e, i) => (
            <li key={i} className={cur?.kind === 'bid' && cur.index === i ? 'current' : ''}>
              <button type="button" className="link" onClick={() => go(i + 1)}>
                {i + 1}. {names[e.player]}: <b>{describeBid(e.bid)}</b>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {hand.tricks.length > 0 && (
        <div className="aid">
          <h4>Prese</h4>
          <div className="table-scroll">
            <table className="score-table history">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Giocate (in ordine)</th>
                  <th>Prende</th>
                  <th>Punti</th>
                </tr>
              </thead>
              <tbody>
                {hand.tricks.map((t, ti) => {
                  const first = steps.findIndex((s) => s.kind === 'play' && s.trick === ti);
                  return (
                    <tr key={ti} className={shownTrick === ti ? 'current' : ''}>
                      <td>{ti + 1}</td>
                      <td>
                        {t.plays.map((pl, pi) => (
                          <button key={pi} type="button" className="link" onClick={() => go(first + pi + 1)}>
                            {names[pl.player]}: {cardName(pl.card)}
                            {pi < t.plays.length - 1 ? ' · ' : ''}
                          </button>
                        ))}
                      </td>
                      <td>{t.winner !== null ? names[t.winner] : ''}</td>
                      <td>{t.points ?? ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function describeStep(h: HandRecord, s: Step | null, names: string[]): string {
  if (!s) return 'distribuzione';
  if (s.kind === 'bid') {
    const e = h.auction[s.index];
    return `asta, ${names[e.player]}: ${describeBid(e.bid)}`;
  }
  if (s.kind === 'trump') return `${names[h.caller!]} sceglie briscola ${SUIT_NAMES[h.trump!]}`;
  const pl = h.tricks[s.trick].plays[s.pos];
  return `presa ${s.trick + 1}, ${names[pl.player]} gioca ${cardName(pl.card)}`;
}

function DecisionDetail({ hand, step, names, level }: {
  hand: HandRecord;
  step: Step | null;
  names: string[];
  level: MatchRecord['level'];
}) {
  if (!step) return <p className="muted">Scegli un passo per vedere il ragionamento dei bot.</p>;
  const player = step.kind === 'bid' ? hand.auction[step.index].player : step.kind === 'trump' ? hand.caller! : hand.tricks[step.trick].plays[step.pos].player;
  const note =
    step.kind === 'bid' ? hand.auction[step.index].note : step.kind === 'trump' ? hand.trumpNote : hand.tricks[step.trick].plays[step.pos].note;
  if (!note) {
    if (player === HUMAN) return <p className="muted">Mossa di {names[player]}: nessuna valutazione.</p>;
    if (step.kind === 'play' && level === 'base') return <p className="muted">I bot di livello Base giocano le carte senza simulazioni: nessuna valutazione.</p>;
    return <p className="muted">Nessuna valutazione registrata.</p>;
  }
  const head = <p className="muted">Valori attesi in punti di classifica per {names[player]}.</p>;
  if (note.kind === 'bid') {
    const bid = hand.auction[step.kind === 'bid' ? step.index : 0].bid;
    const chosen = bid.kind === 'call' ? bid.rank : bid.kind === 'points' ? RANK_DUE : null;
    return (
      <>
        {head}
        <table className="score-table">
          <thead>
            <tr>
              <th>Chiamata</th>
              <th>Seme migliore</th>
              <th>Valore</th>
            </tr>
          </thead>
          <tbody>
            {note.evs.map((e) => (
              <tr key={e.rank} className={chosen === e.rank ? 'me' : ''}>
                <td>{e.rank === RANK_DUE ? `Due a ${e.target}` : RANK_NAMES[e.rank]}</td>
                <td>{SUIT_NAMES[e.suit]}</td>
                <td>{fmtEv(e.ev)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="legend">
          Il bot chiama solo se il valore è almeno {fmtEv(note.threshold)}; ha scelto: <b>{describeBid(bid)}</b>.
        </p>
      </>
    );
  }
  if (note.kind === 'trump') {
    return (
      <>
        {head}
        <table className="score-table">
          <tbody>
            {note.evs.map((ev, s) => (
              <tr key={s} className={s === hand.trump ? 'me' : ''}>
                <td className={`suit-${s} trump-label`}>{SUIT_NAMES[s]}</td>
                <td>{fmtEv(ev)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  }
  const played = step.kind === 'play' ? hand.tricks[step.trick].plays[step.pos].card : -1;
  const sorted = [...note.values].sort((a, b) => b.value - a.value);
  const best = sorted[0]?.value ?? 0;
  return (
    <>
      {head}
      <table className="score-table">
        <thead>
          <tr>
            <th>Carta</th>
            <th>Valore</th>
            <th>Scarto dal migliore</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((v) => (
            <tr key={v.card} className={v.card === played ? 'me' : ''}>
              <td>{cardName(v.card)}</td>
              <td>{fmtEv(v.value)}</td>
              <td>{v.value === best ? '' : (v.value - best).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="legend">
        {note.worlds > 0 ? `${note.worlds} distribuzioni delle carte nascoste simulate.` : 'Ultima carta: nessuna scelta.'}
      </p>
    </>
  );
}
