import { useState } from 'react';
import { newMatch } from '../engine/match';
import { randomSeed } from '../engine/rng';
import { viewFor } from '../engine/view';
import { LastTrick, PlayedPanel, PointsPanel } from './Aids';
import { HistoryView } from './HistoryView';
import { AuctionLog, AuctionPanel, InfoBar, TrumpPicker, WaitingPanel } from './Panels';
import { Setup } from './Setup';
import { FinalStandings, HandSummary, History } from './Summary';
import { Table } from './Table';
import { type GameSession, type Settings, loadSession, loadSettings, newSession, saveSession, saveSettings } from './storage';
import { HUMAN, useGame } from './useGame';

const BOT_NAMES = ['Bruno', 'Carla', 'Dario', 'Elena'];

type Screen = { kind: 'setup' } | { kind: 'game'; session: GameSession } | { kind: 'history'; matchId: string | null };

export function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [screen, setScreen] = useState<Screen>({ kind: 'setup' });
  const [saved, setSaved] = useState<GameSession | null>(loadSession);
  const [gameKey, setGameKey] = useState(0);

  const updateSettings = (s: Settings) => {
    setSettings(s);
    saveSettings(s);
  };

  if (screen.kind === 'history') {
    return <HistoryView initialMatchId={screen.matchId} onBack={() => setScreen({ kind: 'setup' })} />;
  }

  if (screen.kind === 'setup') {
    return (
      <Setup
        initial={settings}
        canResume={saved !== null}
        onResume={() => saved && setScreen({ kind: 'game', session: saved })}
        onHistory={() => setScreen({ kind: 'history', matchId: null })}
        onStart={(s) => {
          updateSettings(s);
          const names = [s.name, ...BOT_NAMES.filter((n) => n.toLowerCase() !== s.name.toLowerCase())].slice(0, 5);
          if (names.length < 5) names.push('Anna');
          const seed = randomSeed();
          const match = newMatch({ id: `${Date.now().toString(36)}-${seed.toString(36)}`, numHands: s.numHands, names, seed });
          setScreen({ kind: 'game', session: newSession(match, s.level) });
          setGameKey((k) => k + 1);
        }}
      />
    );
  }

  return (
    <Game
      key={gameKey}
      initial={screen.session}
      settings={settings}
      onSettings={updateSettings}
      onExit={(s) => {
        setSaved(s.match.finished ? null : s);
        setScreen({ kind: 'setup' });
      }}
      onAnalyze={(id) => {
        setSaved(null);
        setScreen({ kind: 'history', matchId: id });
      }}
    />
  );
}

function Game({ initial, settings, onSettings, onExit, onAnalyze }: {
  initial: GameSession;
  settings: Settings;
  onSettings: (s: Settings) => void;
  onExit: (s: GameSession) => void;
  onAnalyze: (matchId: string) => void;
}) {
  const { session, match, holdTrick, error, historyError, dispatch, nextHand, releaseTrick } = useGame(
    initial,
    initial.record.level,
    settings.speed,
  );
  const [side, setSide] = useState<'none' | 'last' | 'history'>('none');
  const hand = match.hand;
  const names = match.config.names;
  const view = viewFor(hand, HUMAN);
  const handNo = Math.min(match.history.length + 1, match.config.numHands);
  const myTurn = hand.turn === HUMAN && !holdTrick;

  return (
    <div className="game">
      <header>
        <InfoBar hand={hand} view={view} names={names} handNo={handNo} numHands={match.config.numHands} />
        <nav>
          <button type="button" className={side === 'last' ? 'on' : ''} onClick={() => setSide(side === 'last' ? 'none' : 'last')}>
            Ultima presa
          </button>
          <button type="button" className={side === 'history' ? 'on' : ''} onClick={() => setSide(side === 'history' ? 'none' : 'history')}>
            Punteggi
          </button>
          <label className="check">
            <input type="checkbox" checked={settings.showPlayed} onChange={(e) => onSettings({ ...settings, showPlayed: e.target.checked })} />
            Carte uscite
          </label>
          <label className="check">
            <input type="checkbox" checked={settings.showPoints} onChange={(e) => onSettings({ ...settings, showPoints: e.target.checked })} />
            Punti
          </label>
          <button type="button" className="secondary" onClick={() => onExit(session)}>
            Menu
          </button>
        </nav>
      </header>

      {error && <div className="error">Errore: {error}</div>}
      {historyError && <div className="error">{historyError}</div>}

      <main>
        <section className="board">
          {hand.phase === 'auction' && <AuctionLog hand={hand} names={names} />}
          <Table
            hand={hand}
            view={view}
            names={names}
            scores={match.scores}
            showPoints={settings.showPoints}
            holdTrick={holdTrick}
            onReleaseTrick={releaseTrick}
            onPlay={(card) => dispatch({ type: 'play', player: HUMAN, card })}
          />
          {myTurn && hand.phase === 'auction' && (
            <AuctionPanel key={hand.auction.history.length} hand={hand} onBid={(bid) => dispatch({ type: 'bid', player: HUMAN, bid })} />
          )}
          {myTurn && hand.phase === 'trump' && (
            <TrumpPicker view={view} onPick={(suit) => dispatch({ type: 'trump', player: HUMAN, suit })} />
          )}
          {!holdTrick && <WaitingPanel hand={hand} names={names} />}
        </section>

        {(side !== 'none' || settings.showPlayed || settings.showPoints) && (
          <aside>
            {side === 'last' && (
              <div className="aid">
                <h4>Ultima presa</h4>
                <LastTrick hand={hand} names={names} />
              </div>
            )}
            {side === 'history' && (
              <div className="aid">
                <h4>Punteggi</h4>
                <History match={match} />
              </div>
            )}
            {settings.showPoints && <PointsPanel hand={hand} view={view} names={names} />}
            {settings.showPlayed && hand.phase !== 'auction' && <PlayedPanel hand={hand} view={view} />}
          </aside>
        )}
      </main>

      {hand.phase === 'end' && !holdTrick && !match.finished && <HandSummary hand={hand} match={match} onNext={nextHand} />}
      {match.finished && (
        <FinalStandings
          match={match}
          onNew={() => {
            saveSession(null);
            onExit(session);
          }}
          onAnalyze={() => onAnalyze(session.record.id)}
        />
      )}
    </div>
  );
}
