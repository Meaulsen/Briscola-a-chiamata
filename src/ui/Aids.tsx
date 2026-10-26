import { NUM_PLAYERS, RANKS, RANK_SHORT, SUITS, SUIT_NAMES, makeCard } from '../engine/cards';
import { type HandState, playedCards } from '../engine/hand';
import type { PlayerView } from '../engine/view';
import { CardView } from './CardView';

/** Tabella delle carte già uscite, per seme. */
export function PlayedPanel({ hand, view }: { hand: HandState; view: PlayerView }) {
  const out = new Set(playedCards(hand).map((p) => p.card));
  const mine = new Set(view.hand);
  return (
    <div className="aid">
      <h4>Carte uscite</h4>
      <table className="played">
        <tbody>
          {SUITS.map((s) => (
            <tr key={s} className={hand.trump === s ? 'trump-row' : ''}>
              <th className={`suit-${s}`}>{SUIT_NAMES[s]}</th>
              {RANKS.map((r) => {
                const c = makeCard(s, r);
                const cls = out.has(c) ? 'out' : mine.has(c) ? 'mine' : '';
                return (
                  <td key={r} className={cls} title={out.has(c) ? 'uscita' : mine.has(c) ? 'in mano a te' : 'ancora in gioco'}>
                    {RANK_SHORT[r]}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="legend">
        <span className="out">barrata</span> = uscita · <span className="mine">grassetto</span> = in mano a te
      </p>
    </div>
  );
}

/** Punti fatti finora: per giocatore e, quando le squadre ti sono note, per squadra. */
export function PointsPanel({ hand, view, names }: { hand: HandState; view: PlayerView; names: string[] }) {
  if (hand.caller === null || hand.phase === 'auction' || hand.phase === 'trump') return null;
  const kp = view.knownPartner;
  const caller = hand.caller;
  let teams: { callerTeam: number; others: number } | null = null;
  if (kp !== null) {
    const callerTeam = kp === caller ? hand.points[caller] : hand.points[caller] + hand.points[kp];
    teams = { callerTeam, others: hand.points.reduce((a, b) => a + b, 0) - callerTeam };
  }
  return (
    <div className="aid">
      <h4>Punti in tempo reale</h4>
      <ul className="points-list">
        {Array.from({ length: NUM_PLAYERS }, (_, p) => (
          <li key={p}>
            {names[p]}: <b>{hand.points[p]}</b>
          </li>
        ))}
      </ul>
      {teams ? (
        <p>
          Squadra del chiamante: <b>{teams.callerTeam}</b> / {hand.target} · Avversari: <b>{teams.others}</b>
        </p>
      ) : (
        <p className="muted">Le squadre non ti sono ancora note.</p>
      )}
    </div>
  );
}

export function LastTrick({ hand, names }: { hand: HandState; names: string[] }) {
  const t = hand.tricks[hand.tricks.length - 1];
  if (!t) return <p className="muted">Nessuna presa ancora raccolta.</p>;
  return (
    <div className="last-trick">
      <div className="cards">
        {t.plays.map((p) => (
          <div key={p.player} className="lt-play">
            <small>{names[p.player]}</small>
            <CardView card={p.card} trump={hand.trump} small highlight={p.player === t.winner} />
          </div>
        ))}
      </div>
      <p>
        Presa {hand.tricks.length} di 8: l'ha presa <b>{names[t.winner!]}</b> ({t.points} punti).
      </p>
    </div>
  );
}
