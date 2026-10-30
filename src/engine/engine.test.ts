import { describe, expect, it } from 'vitest';
import { RANK_DUE, fullDeck, makeCard, pointsOf, sumPoints } from './cards';
import { applyBid, isLegalBid, legalCallRanks, newAuction, pointsRange } from './auction';
import { MIN_HAND_POINTS, applyHandAction, deal, newHandFromCards, weakHands } from './hand';
import { advanceMatch, applyMatchAction, matchWinners, newMatch } from './match';
import { scoreDeltas, scoreHand } from './scoring';
import { trickWinnerIndex } from './trick';
import { viewFor } from './view';

const COPPE = 0;
const DENARI = 1;
const BASTONI = 2;
const SPADE = 3;
const [A, TRE, RE, CAV, FANTE, , , CINQUE, , DUE] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

describe('carte', () => {
  it('il mazzo vale 120 punti, 30 per seme', () => {
    expect(sumPoints(fullDeck())).toBe(120);
    expect(sumPoints(fullDeck().filter((c) => Math.floor(c / 10) === DENARI))).toBe(30);
    expect(pointsOf(makeCard(SPADE, TRE))).toBe(10);
  });
});

describe('presa', () => {
  const trick = [
    makeCard(COPPE, TRE),
    makeCard(COPPE, RE),
    makeCard(SPADE, A),
    makeCard(COPPE, CINQUE),
    makeCard(BASTONI, DUE),
  ];
  it("senza briscole vince la più forte del seme d'uscita (esempio del regolamento)", () => {
    expect(trickWinnerIndex(trick, DENARI)).toBe(0);
  });
  it('una briscola qualsiasi batte gli altri semi', () => {
    const withTrump = [...trick.slice(0, 4), makeCard(DENARI, DUE)];
    expect(trickWinnerIndex(withTrump, DENARI)).toBe(4);
  });
  it('vince la briscola più forte e il Tre batte il Re', () => {
    const t = [makeCard(COPPE, A), makeCard(DENARI, RE), makeCard(DENARI, TRE), makeCard(DENARI, FANTE), makeCard(COPPE, TRE)];
    expect(trickWinnerIndex(t, DENARI)).toBe(2);
  });
});

describe('asta', () => {
  it("riproduce l'esempio del regolamento (Carla chiamante col Cavallo)", () => {
    // Anna(0) mazziere; Bruno(1), Carla(2), Dario(3), Elena(4).
    let a = newAuction(0);
    expect(a.turn).toBe(1);
    a = applyBid(a, 1, { kind: 'call', rank: A });
    a = applyBid(a, 2, { kind: 'call', rank: TRE });
    a = applyBid(a, 3, { kind: 'pass' });
    a = applyBid(a, 4, { kind: 'call', rank: RE });
    a = applyBid(a, 0, { kind: 'pass' });
    a = applyBid(a, 1, { kind: 'pass' });
    a = applyBid(a, 2, { kind: 'call', rank: CAV });
    expect(a.finished).toBe(false);
    a = applyBid(a, 4, { kind: 'pass' });
    expect(a.finished).toBe(true);
    expect(a.leader).toBe(2);
    expect(a.rank).toBe(CAV);
    expect(a.target).toBe(61);
  });

  it('le chiamate devono scendere e chi passa esce', () => {
    let a = newAuction(4);
    a = applyBid(a, 0, { kind: 'call', rank: RE });
    expect(isLegalBid(a, 1, { kind: 'call', rank: TRE })).toBe(false);
    expect(isLegalBid(a, 1, { kind: 'call', rank: RE })).toBe(false);
    expect(legalCallRanks(a)[0]).toBe(CAV);
    a = applyBid(a, 1, { kind: 'pass' });
    a = applyBid(a, 2, { kind: 'pass' });
    a = applyBid(a, 3, { kind: 'call', rank: FANTE });
    a = applyBid(a, 4, { kind: 'pass' });
    expect(a.turn).toBe(0); // salta l'1 e il 2 che hanno passato
    expect(isLegalBid(a, 1, { kind: 'pass' })).toBe(false);
  });

  it('dopo il Due si rilancia sui punti', () => {
    let a = newAuction(0);
    a = applyBid(a, 1, { kind: 'call', rank: DUE });
    expect(pointsRange(a)).toEqual({ min: 62, max: 120 });
    expect(isLegalBid(a, 2, { kind: 'call', rank: DUE })).toBe(false);
    expect(isLegalBid(a, 2, { kind: 'points', points: 61 })).toBe(false);
    a = applyBid(a, 2, { kind: 'points', points: 65 });
    a = applyBid(a, 3, { kind: 'pass' });
    a = applyBid(a, 4, { kind: 'pass' });
    a = applyBid(a, 0, { kind: 'pass' });
    a = applyBid(a, 1, { kind: 'points', points: 70 });
    a = applyBid(a, 2, { kind: 'pass' });
    expect(a.finished).toBe(true);
    expect(a.leader).toBe(1);
    expect(a.rank).toBe(RANK_DUE);
    expect(a.target).toBe(70);
  });

  it('i punti non si possono rilanciare prima del Due', () => {
    let a = newAuction(0);
    a = applyBid(a, 1, { kind: 'call', rank: A });
    expect(isLegalBid(a, 2, { kind: 'points', points: 70 })).toBe(false);
  });

  it('se passano tutti la mano è annullata', () => {
    let a = newAuction(2);
    for (const p of [3, 4, 0, 1]) a = applyBid(a, p, { kind: 'pass' });
    expect(a.finished).toBe(false);
    expect(a.turn).toBe(2);
    a = applyBid(a, 2, { kind: 'pass' });
    expect(a.allPassed).toBe(true);
  });

  it("se gli altri passano, l'ultimo che chiama vince subito", () => {
    let a = newAuction(2);
    for (const p of [3, 4, 0, 1]) a = applyBid(a, p, { kind: 'pass' });
    a = applyBid(a, 2, { kind: 'call', rank: A });
    expect(a.finished).toBe(true);
    expect(a.leader).toBe(2);
  });
});

describe('punteggio', () => {
  it('68 a 52 in coppia: +2 / +1 / -1', () => {
    const o = scoreHand({ caller: 2, partner: 3, target: 61, points: [10, 20, 40, 28, 22], tricks: [1, 2, 2, 2, 1] });
    expect(o.callerTeamPoints).toBe(68);
    expect(o.callerWins).toBe(true);
    expect(o.deltas).toEqual([-1, -1, 2, 1, -1]);
  });
  it('60 a 60 il chiamante perde', () => {
    const o = scoreHand({ caller: 0, partner: 1, target: 61, points: [30, 30, 20, 20, 20], tricks: [2, 2, 2, 1, 1] });
    expect(o.callerWins).toBe(false);
    expect(o.deltas).toEqual([-2, -1, 1, 1, 1]);
  });
  it("con l'obiettivo d'asta non bastano 61 punti", () => {
    const o = scoreHand({ caller: 0, partner: 1, target: 70, points: [40, 25, 20, 20, 15], tricks: [3, 2, 1, 1, 1] });
    expect(o.callerWins).toBe(false);
  });
  it('da solo: +4 / -1 e cappotto raddoppia', () => {
    expect(scoreDeltas(1, 1, true, false)).toEqual([-1, 4, -1, -1, -1]);
    expect(scoreDeltas(1, 1, false, true)).toEqual([2, -8, 2, 2, 2]);
    const o = scoreHand({ caller: 0, partner: 3, target: 61, points: [80, 0, 0, 40, 0], tricks: [5, 0, 0, 3, 0] });
    expect(o.cappotto).toBe(true);
    expect(o.deltas).toEqual([4, -2, -2, 2, -2]);
  });
  it('la somma dei punti di classifica è sempre zero', () => {
    for (const solo of [true, false])
      for (const win of [true, false])
        for (const cap of [true, false]) {
          const d = scoreDeltas(0, solo ? 0 : 3, win, cap);
          expect(d.reduce((a, b) => a + b, 0)).toBe(0);
        }
  });
});

describe('mano completa', () => {
  it('distribuisce 8 carte a testa senza ripetizioni', () => {
    const hands = deal(0, 1234);
    expect(hands.map((h) => h.length)).toEqual([8, 8, 8, 8, 8]);
    expect(new Set(hands.flat()).size).toBe(40);
  });

  it('gioca una mano intera e assegna i punti', () => {
    const hands = deal(0, 42);
    let s = newHandFromCards(0, hands);
    s = applyHandAction(s, { type: 'bid', player: 1, bid: { kind: 'call', rank: A } });
    for (const p of [2, 3, 4, 0]) s = applyHandAction(s, { type: 'bid', player: p, bid: { kind: 'pass' } });
    expect(s.phase).toBe('trump');
    expect(s.caller).toBe(1);
    s = applyHandAction(s, { type: 'trump', player: 1, suit: SPADE });
    const called = makeCard(SPADE, A);
    expect(s.calledCard).toBe(called);
    expect(s.partner).toBe(hands.findIndex((h) => h.includes(called)));
    expect(s.turn).toBe(1); // esce chi sta alla destra del mazziere
    const others = [0, 2, 3, 4].filter((p) => p !== s.partner);
    expect(viewFor(s, others[0]).knownPartner).toBeNull();
    expect(viewFor(s, s.partner!).knownPartner).toBe(s.partner);
    while (s.phase === 'play') {
      const p = s.turn;
      s = applyHandAction(s, { type: 'play', player: p, card: s.hands[p][0] });
    }
    expect(s.tricks.length).toBe(8);
    expect(s.points.reduce((a, b) => a + b, 0)).toBe(120);
    expect(s.tricksWon.reduce((a, b) => a + b, 0)).toBe(8);
    expect(s.outcome!.deltas.reduce((a, b) => a + b, 0)).toBe(0);
    expect(s.revealed).toBe(true);
  });

  it('rifiuta carte non in mano e giocate fuori turno', () => {
    let s = newHandFromCards(0, deal(0, 7));
    s = applyHandAction(s, { type: 'bid', player: 1, bid: { kind: 'call', rank: A } });
    for (const p of [2, 3, 4, 0]) s = applyHandAction(s, { type: 'bid', player: p, bid: { kind: 'pass' } });
    s = applyHandAction(s, { type: 'trump', player: 1, suit: COPPE });
    expect(() => applyHandAction(s, { type: 'play', player: 2, card: s.hands[2][0] })).toThrow();
    expect(() => applyHandAction(s, { type: 'play', player: 1, card: s.hands[2][0] })).toThrow();
  });
});

describe('partita', () => {
  it('se passano tutti si rimescola, cambia mazziere e la mano non conta', () => {
    let m = newMatch({ numHands: 5, names: ['a', 'b', 'c', 'd', 'e'], seed: 99 });
    const dealer = m.dealer;
    for (let i = 0; i < 5; i++) m = applyMatchAction(m, { type: 'bid', player: m.hand.turn, bid: { kind: 'pass' } });
    expect(m.hand.allPassed).toBe(true);
    m = advanceMatch(m);
    expect(m.history.length).toBe(0);
    expect(m.dealer).toBe((dealer + 1) % 5);
  });

  it('dopo il numero di mani stabilito la partita finisce', () => {
    let m = newMatch({ numHands: 2, names: ['a', 'b', 'c', 'd', 'e'], seed: 5 });
    while (!m.finished) {
      const h = m.hand;
      if (h.phase === 'end') m = advanceMatch(m);
      else if (h.phase === 'auction') {
        const bid = h.auction.leader === null ? { kind: 'call' as const, rank: 0 } : { kind: 'pass' as const };
        m = applyMatchAction(m, { type: 'bid', player: h.turn, bid });
      } else if (h.phase === 'trump') m = applyMatchAction(m, { type: 'trump', player: h.turn, suit: 0 });
      else m = applyMatchAction(m, { type: 'play', player: h.turn, card: h.hands[h.turn][0] });
    }
    expect(m.history.length).toBe(2);
    expect(m.scores.reduce((a, b) => a + b, 0)).toBe(0);
    expect(matchWinners(m).length).toBeGreaterThan(0);
  });

  it('con la regola attiva nessuno ha meno di 11 punti in mano e il mazziere resta lo stesso', () => {
    const names = ['a', 'b', 'c', 'd', 'e'];
    let redealt = 0;
    for (let seed = 0; seed < 40; seed++) {
      const plain = newMatch({ numHands: 5, names, seed });
      const m = newMatch({ numHands: 5, names, seed, redealWeakHands: true });
      expect(m.dealer).toBe(plain.dealer);
      expect(m.hand.hands.every((h) => sumPoints(h) >= MIN_HAND_POINTS)).toBe(true);
      if (weakHands(plain.hand.hands).length > 0) {
        redealt++;
        expect(m.hand.redeals![0]).toEqual(weakHands(plain.hand.hands));
      } else {
        expect(m.hand.redeals).toBeUndefined();
        expect(m.hand.hands).toEqual(plain.hand.hands);
      }
    }
    expect(redealt).toBeGreaterThan(0);
  });
});
