import { useState } from 'react';
import { RANK_DUE, RANK_NAMES, SUIT_NAMES, cardName, makeCard } from '../engine/cards';
import { type Bid, describeBid, inPointsPhase, legalCallRanks, pointsRange } from '../engine/auction';
import type { HandState } from '../engine/hand';
import type { PlayerView } from '../engine/view';
import { HUMAN } from './useGame';

export function InfoBar({ hand, view, names, handNo, numHands }: {
  hand: HandState;
  view: PlayerView;
  names: string[];
  handNo: number;
  numHands: number;
}) {
  let partnerInfo: string | null = null;
  if (hand.phase === 'play' || hand.phase === 'end') {
    const kp = view.knownPartner;
    if (hand.caller === HUMAN) {
      if (kp === HUMAN) partnerInfo = 'Hai tu la carta chiamata: giochi da solo contro tutti.';
      else if (kp !== null) partnerInfo = `Il tuo compagno è ${names[kp]}.`;
      else partnerInfo = 'Il tuo compagno non si è ancora rivelato.';
    } else if (kp === HUMAN) {
      partnerInfo = `Sei il compagno di ${names[hand.caller!]}: non farti scoprire troppo presto!`;
    } else if (kp !== null) {
      partnerInfo = kp === hand.caller ? `${names[kp]} gioca da solo.` : `Il compagno è ${names[kp]}.`;
    } else {
      partnerInfo = 'Il compagno non si è ancora rivelato.';
    }
  }
  return (
    <div className="infobar">
      <span>
        Mano {handNo} di {numHands}
      </span>
      <span>Mazziere: {names[hand.dealer]}</span>
      {hand.caller !== null && hand.rank !== null && (
        <span>
          Chiamante: <b>{names[hand.caller]}</b> ·{' '}
          {hand.calledCard !== null ? (
            <>
              carta chiamata <b>{cardName(hand.calledCard)}</b>
            </>
          ) : (
            <>
              chiama <b>{RANK_NAMES[hand.rank]}</b>
            </>
          )}{' '}
          · obiettivo <b>{hand.target}</b>
        </span>
      )}
      {hand.trump !== null && (
        <span className={`suit-${hand.trump} trump-label`}>Briscola: {SUIT_NAMES[hand.trump]}</span>
      )}
      {partnerInfo && <span className="partner-info">{partnerInfo}</span>}
    </div>
  );
}

export function AuctionPanel({ hand, onBid }: { hand: HandState; onBid: (b: Bid) => void }) {
  const a = hand.auction;
  const range = pointsRange(a);
  const [points, setPoints] = useState<number>(range?.min ?? 62);
  const p = Math.min(Math.max(points, range?.min ?? 62), range?.max ?? 120);
  return (
    <div className="panel auction-panel">
      <h3>Tocca a te nell'asta</h3>
      <p className="muted">
        {a.rank === null
          ? 'Chiama un valore (senza dire il seme) oppure passa.'
          : inPointsPhase(a)
            ? `È stato chiamato il Due: per superare ${describeBid({ kind: 'points', points: a.target })} offri più punti.`
            : `Ultima chiamata: ${RANK_NAMES[a.rank]}. Per superarla chiama una carta più bassa.`}
      </p>
      <div className="buttons">
        {!inPointsPhase(a) &&
          legalCallRanks(a).map((r) => (
            <button key={r} type="button" onClick={() => onBid({ kind: 'call', rank: r })}>
              {r === RANK_DUE ? 'Due (a 61)' : RANK_NAMES[r]}
            </button>
          ))}
        {range && (
          <span className="points-bid">
            Due a{' '}
            <input
              type="number"
              min={range.min}
              max={range.max}
              value={p}
              onChange={(e) => setPoints(Number(e.target.value))}
              aria-label="Punti"
            />
            <button type="button" onClick={() => onBid({ kind: 'points', points: p })}>
              Rilancia
            </button>
          </span>
        )}
        <button type="button" className="secondary" onClick={() => onBid({ kind: 'pass' })}>
          Passo
        </button>
      </div>
    </div>
  );
}

export function AuctionLog({ hand, names }: { hand: HandState; names: string[] }) {
  if (hand.auction.history.length === 0) return null;
  return (
    <div className="auction-log">
      {hand.auction.history.map((e, i) => (
        <span key={i}>
          {names[e.player]}: <b>{describeBid(e.bid)}</b>
        </span>
      ))}
    </div>
  );
}

export function TrumpPicker({ view, onPick }: { view: PlayerView; onPick: (suit: number) => void }) {
  const rank = view.rank!;
  return (
    <div className="panel">
      <h3>Hai vinto l'asta con {RANK_NAMES[rank]}{view.target > 61 ? ` a ${view.target}` : ''}: scegli la briscola</h3>
      <div className="buttons suits">
        {[0, 1, 2, 3].map((s) => {
          const card = makeCard(s, rank);
          const mine = view.hand.includes(card);
          const count = view.hand.filter((c) => Math.floor(c / 10) === s).length;
          return (
            <button key={s} type="button" className={`suit-btn suit-${s}`} onClick={() => onPick(s)}>
              <b>{SUIT_NAMES[s]}</b>
              <small>
                chiami il {cardName(card)} · hai {count} cart{count === 1 ? 'a' : 'e'} di {SUIT_NAMES[s]}
              </small>
              {mine && <small className="warn">Ce l'hai tu: giocheresti da solo</small>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function WaitingPanel({ hand, names }: { hand: HandState; names: string[] }) {
  if (hand.phase === 'end' || hand.turn === HUMAN) return null;
  const who = names[hand.turn];
  const what = hand.phase === 'auction' ? 'sta parlando' : hand.phase === 'trump' ? 'sceglie la briscola' : 'sta giocando';
  return (
    <div className="waiting">
      {who} {what}…
    </div>
  );
}
