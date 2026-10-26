import { NUM_PLAYERS, cardName, makeCard } from '../engine/cards';
import type { HandState } from '../engine/hand';
import { type MatchState, matchWinners, standings } from '../engine/match';
import { HUMAN } from './useGame';

const fmt = (n: number) => (n > 0 ? `+${n}` : String(n));

export function HandSummary({ hand, match, onNext }: { hand: HandState; match: MatchState; onNext: () => void }) {
  const names = match.config.names;
  const last = match.history.length + 1 >= match.config.numHands;
  if (hand.allPassed) {
    return (
      <div className="modal">
        <div className="modal-box">
          <h2>Tutti hanno passato</h2>
          <p>Nessuno ha chiamato: le carte vengono rimescolate e la distribuzione passa al mazziere successivo. Questa mano non conta.</p>
          <button type="button" onClick={onNext}>
            Rimescola
          </button>
        </div>
      </div>
    );
  }
  const o = hand.outcome!;
  const called = makeCard(hand.trump!, hand.rank!);
  const humanWon = o.deltas[HUMAN] > 0;
  return (
    <div className="modal">
      <div className="modal-box">
        <h2>{humanWon ? 'Hai vinto la mano!' : 'Hai perso la mano'}</h2>
        <p>
          {names[o.caller]} ha chiamato il <b>{cardName(called)}</b>
          {o.solo ? ' e lo aveva in mano: ha giocato da solo.' : <>; il compagno era <b>{names[o.partner]}</b>.</>}
        </p>
        <p>
          Squadra del chiamante: <b>{o.callerTeamPoints}</b> punti (obiettivo {o.target}) · Avversari:{' '}
          <b>{120 - o.callerTeamPoints}</b>
        </p>
        <p className={o.callerWins ? 'good' : 'bad'}>
          {o.callerWins ? 'La squadra del chiamante ha vinto.' : 'La squadra del chiamante ha perso.'}
          {o.cappotto && ' Cappotto: punteggi raddoppiati!'}
        </p>
        <table className="score-table">
          <thead>
            <tr>
              <th>Giocatore</th>
              <th>Mano</th>
              <th>Totale</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: NUM_PLAYERS }, (_, p) => (
              <tr key={p} className={p === HUMAN ? 'me' : ''}>
                <td>{names[p]}</td>
                <td>{fmt(o.deltas[p])}</td>
                <td>{fmt(match.scores[p] + o.deltas[p])}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" onClick={onNext}>
          {last ? 'Classifica finale' : 'Prossima mano'}
        </button>
      </div>
    </div>
  );
}

export function FinalStandings({ match, onNew, onAnalyze }: {
  match: MatchState;
  onNew: () => void;
  onAnalyze: () => void;
}) {
  const names = match.config.names;
  const winners = matchWinners(match);
  const order = standings(match.scores);
  return (
    <div className="modal">
      <div className="modal-box">
        <h2>Partita finita</h2>
        <p>
          {winners.length === 1
            ? winners[0] === HUMAN
              ? 'Complimenti, hai vinto la partita!'
              : `Ha vinto ${names[winners[0]]}.`
            : `Vittoria a pari merito: ${winners.map((w) => names[w]).join(', ')}.`}
        </p>
        <table className="score-table">
          <tbody>
            {order.map((p, i) => (
              <tr key={p} className={p === HUMAN ? 'me' : ''}>
                <td>{i === 0 || match.scores[p] !== match.scores[order[i - 1]] ? `${i + 1}°` : ''}</td>
                <td>{names[p]}</td>
                <td>{fmt(match.scores[p])}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="buttons">
          <button type="button" onClick={onNew}>
            Nuova partita
          </button>
          <button type="button" className="secondary" onClick={onAnalyze}>
            Analizza la partita
          </button>
        </div>
      </div>
    </div>
  );
}

export function History({ match }: { match: MatchState }) {
  const names = match.config.names;
  if (match.history.length === 0) return <p className="muted">Nessuna mano ancora conclusa.</p>;
  return (
    <table className="score-table history">
      <thead>
        <tr>
          <th>#</th>
          <th>Chiamata</th>
          {names.map((n) => (
            <th key={n}>{n}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {match.history.map((h) => (
          <tr key={h.number}>
            <td>{h.number}</td>
            <td>
              {names[h.outcome.caller]}: {cardName(makeCard(h.trump, h.rank))}
              {h.outcome.target > 61 ? ` a ${h.outcome.target}` : ''} ({h.outcome.callerTeamPoints})
              {h.outcome.cappotto ? ' cappotto' : ''}
            </td>
            {h.outcome.deltas.map((d, i) => (
              <td key={i}>{fmt(d)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
