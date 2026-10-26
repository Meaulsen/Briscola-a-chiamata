import { useState } from 'react';
import type { Settings } from './storage';

export function Setup({ initial, canResume, onStart, onResume, onHistory }: {
  initial: Settings;
  canResume: boolean;
  onStart: (s: Settings) => void;
  onResume: () => void;
  onHistory: () => void;
}) {
  const [s, setS] = useState(initial);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((o) => ({ ...o, [k]: v }));
  return (
    <div className="setup">
      <h1>Briscola a chiamata</h1>
      <p className="muted">Tu contro quattro bot, secondo il regolamento della briscola in cinque.</p>
      {canResume && (
        <button type="button" className="resume" onClick={onResume}>
          Riprendi la partita in corso
        </button>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onStart({ ...s, name: s.name.trim() || 'Tu' });
        }}
      >
        <label>
          Il tuo nome
          <input value={s.name} maxLength={16} onChange={(e) => set('name', e.target.value)} />
        </label>
        <label>
          Numero di mani
          <select value={s.numHands} onChange={(e) => set('numHands', Number(e.target.value))}>
            {[5, 10, 15, 20].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          Forza dei bot
          <select value={s.level} onChange={(e) => set('level', e.target.value as Settings['level'])}>
            <option value="forte">Massima (ricerca Monte Carlo)</option>
            <option value="base">Base (solo euristica, più rapida)</option>
          </select>
        </label>
        <label>
          Velocità di gioco
          <select value={s.speed} onChange={(e) => set('speed', e.target.value as Settings['speed'])}>
            <option value="lenta">Lenta</option>
            <option value="normale">Normale</option>
            <option value="veloce">Veloce</option>
          </select>
        </label>
        <fieldset>
          <legend>Aiuti (si possono cambiare anche durante la partita)</legend>
          <label className="check">
            <input type="checkbox" checked={s.showPlayed} onChange={(e) => set('showPlayed', e.target.checked)} />
            Mostra le carte già uscite
          </label>
          <label className="check">
            <input type="checkbox" checked={s.showPoints} onChange={(e) => set('showPoints', e.target.checked)} />
            Mostra i punti delle squadre in tempo reale
          </label>
        </fieldset>
        <button type="submit">{canResume ? 'Nuova partita' : 'Inizia la partita'}</button>
      </form>
      <button type="button" className="secondary history-link" onClick={onHistory}>
        Storico partite
      </button>
    </div>
  );
}
