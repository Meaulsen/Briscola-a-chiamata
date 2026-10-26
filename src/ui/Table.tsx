import { NUM_PLAYERS, sortHand, suitOf } from '../engine/cards';
import { describeBid } from '../engine/auction';
import type { HandState, Trick } from '../engine/hand';
import type { PlayerView } from '../engine/view';
import { CardView } from './CardView';
import { HUMAN } from './useGame';

/** Posizione a schermo di ciascun posto: il giro antiorario va verso destra. */
const SEAT_POS = ['bottom', 'right', 'top-right', 'top-left', 'left'] as const;

interface TableProps {
  hand: HandState;
  view: PlayerView;
  names: string[];
  scores: number[];
  showPoints: boolean;
  holdTrick: boolean;
  onReleaseTrick: () => void;
  onPlay: (card: number) => void;
}

export function Table({ hand, view, names, scores, showPoints, holdTrick, onReleaseTrick, onPlay }: TableProps) {
  const shownTrick: Trick | null =
    holdTrick && hand.tricks.length > 0 ? hand.tricks[hand.tricks.length - 1] : hand.current;
  const lastBid = (p: number) => {
    for (let i = hand.auction.history.length - 1; i >= 0; i--) {
      const e = hand.auction.history[i];
      if (e.player === p) return describeBid(e.bid);
    }
    return null;
  };
  const myTurnToPlay = hand.phase === 'play' && hand.turn === HUMAN && !holdTrick;

  return (
    <div className="table-wrap">
      <div className="table">
        {Array.from({ length: NUM_PLAYERS }, (_, p) => (
          <Seat
            key={p}
            pos={SEAT_POS[p]}
            name={names[p]}
            score={scores[p]}
            hand={hand}
            view={view}
            player={p}
            bid={hand.phase === 'auction' ? lastBid(p) : null}
            showPoints={showPoints}
          />
        ))}
        <div
          className={`trick ${holdTrick ? 'held' : ''}`}
          onClick={holdTrick ? onReleaseTrick : undefined}
          role={holdTrick ? 'button' : undefined}
          aria-label={holdTrick ? 'Continua' : undefined}
        >
          {shownTrick?.plays.map((pl) => (
            <div key={pl.player} className={`slot slot-${SEAT_POS[pl.player]}`}>
              <CardView card={pl.card} trump={hand.trump} highlight={holdTrick && shownTrick.winner === pl.player} />
            </div>
          ))}
          {holdTrick && shownTrick?.winner !== undefined && (
            <div className="trick-msg">
              Prende {names[shownTrick.winner]} ({shownTrick.points} punti)
            </div>
          )}
        </div>
      </div>
      <MyHand view={view} enabled={myTurnToPlay} onPlay={onPlay} />
    </div>
  );
}

function Seat(props: {
  pos: string;
  name: string;
  score: number;
  hand: HandState;
  view: PlayerView;
  player: number;
  bid: string | null;
  showPoints: boolean;
}) {
  const { pos, name, score, hand, view, player, bid, showPoints } = props;
  const tags: string[] = [];
  if (hand.dealer === player) tags.push('Mazziere');
  if (hand.caller === player) tags.push(view.knownPartner === player && view.revealed ? 'Chiamante (da solo)' : 'Chiamante');
  if (view.knownPartner === player && player !== hand.caller) tags.push(player === HUMAN ? 'Compagno (segreto)' : 'Compagno');
  const active = hand.phase !== 'end' && hand.turn === player;
  const passed = hand.phase === 'auction' && hand.auction.passed[player];
  return (
    <div className={`seat seat-${pos} ${active ? 'active' : ''} ${passed ? 'passed' : ''}`}>
      <div className="seat-name">
        {name} <span className="seat-score">{score > 0 ? `+${score}` : score}</span>
      </div>
      <div className="seat-tags">
        {tags.map((t) => (
          <span key={t} className="tag">
            {t}
          </span>
        ))}
      </div>
      {player !== HUMAN && <div className="seat-cards">{view.handSizes[player]} carte</div>}
      {showPoints && hand.phase !== 'auction' && <div className="seat-points">{hand.points[player]} punti</div>}
      {bid && <div className="bubble">{bid}</div>}
    </div>
  );
}

function MyHand({ view, enabled, onPlay }: { view: PlayerView; enabled: boolean; onPlay: (c: number) => void }) {
  const trump = view.trump;
  const cards = sortHand(view.hand).sort((a, b) => {
    if (trump === null) return 0;
    return Number(suitOf(b) === trump) - Number(suitOf(a) === trump);
  });
  return (
    <div className={`my-hand ${enabled ? 'my-turn' : ''}`}>
      {enabled && <div className="hint">Tocca a te: scegli una carta</div>}
      <div className="cards">
        {cards.map((c) => (
          <CardView key={c} card={c} trump={trump} onClick={() => onPlay(c)} disabled={!enabled} />
        ))}
      </div>
    </div>
  );
}
