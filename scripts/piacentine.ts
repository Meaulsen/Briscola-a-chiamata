// Genera le immagini SVG delle 40 carte piacentine in public/carte/piacentine/.
// Uso: npm run carte
//
// I disegni sono originali e semplificati, ispirati al mazzo piacentino: semi con i colori tradizionali,
// figure a doppia testa (speculari rispetto al centro), nessun indice numerico negli angoli.
// File: <seme>-<numero>.svg, con numero da 1 (Asso) a 10 (Re), es. coppe-1.svg, spade-10.svg.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const W = 120;
const H = 200;
const CX = W / 2;
const CY = H / 2;

const RED = '#c62a2f';
const YEL = '#f1bf2c';
const BLUE = '#2b5aa6';
const GREEN = '#3b873d';
const INK = '#1d1a17';
const SKIN = '#f5d4ab';
const PAPER = '#fffdf6';
const BEIGE = '#fbf0d6';
const BROWN = '#6e4a2a';

const OUT = 'stroke="' + INK + '" stroke-width="1.2" stroke-linejoin="round"';

const f = (n: number) => +n.toFixed(2);
const g = (body: string, tr: string) => `<g transform="${tr}">${body}</g>`;

// ---------- Simboli dei semi (coordinate locali centrate in 0,0) ----------

/** Coppa: circa 28 x 36. */
function cup(): string {
  return [
    `<path d="M-9 17 Q-8 11 -3 9 L3 9 Q8 11 9 17 Q0 20 -9 17Z" fill="${YEL}" ${OUT}/>`,
    `<path d="M-8.5 16.2 Q0 18.6 8.5 16.2" fill="none" stroke="${RED}" stroke-width="1.6"/>`,
    `<rect x="-2" y="0" width="4" height="10" fill="${YEL}" ${OUT}/>`,
    `<ellipse cx="0" cy="5" rx="4.2" ry="2.4" fill="${BLUE}" ${OUT}/>`,
    `<path d="M-13 -15 L13 -15 Q12.5 -1 0 2 Q-12.5 -1 -13 -15Z" fill="${YEL}" ${OUT}/>`,
    `<path d="M-12.4 -8 Q0 -4.5 12.4 -8" fill="none" stroke="${RED}" stroke-width="2.6"/>`,
    `<path d="M-9 -2.5 Q0 1 9 -2.5" fill="none" stroke="${GREEN}" stroke-width="1.4"/>`,
    `<ellipse cx="0" cy="-15" rx="13" ry="2.8" fill="${RED}" ${OUT}/>`,
  ].join('');
}

/** Denaro: moneta di raggio 14 con rosa al centro. */
function coin(): string {
  const petals = Array.from({ length: 8 }, (_, i) =>
    `<ellipse cx="0" cy="-4.6" rx="2.1" ry="3.6" fill="${RED}" transform="rotate(${i * 45})"/>`,
  ).join('');
  return [
    `<circle r="14" fill="${YEL}" ${OUT}/>`,
    `<circle r="11.2" fill="none" stroke="${RED}" stroke-width="1.8"/>`,
    `<circle r="9.2" fill="${PAPER}" stroke="${INK}" stroke-width="0.6"/>`,
    petals,
    `<circle r="2.6" fill="${GREEN}" stroke="${INK}" stroke-width="0.6"/>`,
  ].join('');
}

/** Bastone verticale lungo `len`, spesso `w`. */
function club(len: number, w = 6.5, knotsAt = [0.3, 0.7]): string {
  const h = len / 2;
  const knots = knotsAt
    .map((t, i) => {
      const y = -h + len * t;
      const s = i % 2 ? 1 : -1;
      const x0 = (s * w) / 2;
      return `<path d="M${f(x0)} ${f(y)} l${f(s * w * 0.6)} ${f(-w * 0.5)}" stroke="${INK}" stroke-width="${f(w * 0.5)}" stroke-linecap="round"/>`
        + `<path d="M${f(x0)} ${f(y)} l${f(s * w * 0.6)} ${f(-w * 0.5)}" stroke="${RED}" stroke-width="${f(w * 0.25)}" stroke-linecap="round"/>`;
    })
    .join('');
  return [
    knots,
    `<rect x="${f(-w / 2)}" y="${f(-h)}" width="${f(w)}" height="${f(len)}" rx="${f(w / 2)}" fill="${GREEN}" ${OUT}/>`,
    `<rect x="${f(-w / 2 + 0.6)}" y="${f(-h + w * 0.6)}" width="${f(w - 1.2)}" height="${f(w * 0.45)}" fill="${YEL}"/>`,
    `<rect x="${f(-w / 2 + 0.6)}" y="${f(h - w * 1.05)}" width="${f(w - 1.2)}" height="${f(w * 0.45)}" fill="${YEL}"/>`,
    `<path d="M${f(-w * 0.15)} ${f(-h + w * 1.4)} V${f(h - w * 1.4)}" stroke="#7fc27f" stroke-width="${f(w * 0.18)}" stroke-linecap="round"/>`,
  ].join('');
}

/** Impugnatura di spada in (x,y), con la lama che parte in direzione (dx,dy) normalizzata. */
function hilt(x: number, y: number, dx: number, dy: number, size = 1): string {
  const px = -dy;
  const py = dx;
  const gl = 7 * size;
  const cg = 5.5 * size;
  const gx = x - dx * gl;
  const gy = y - dy * gl;
  const stroke = (d: string, col: string, w: number) =>
    `<path d="${d}" stroke="${INK}" stroke-width="${f(w + 1.6 * size)}" stroke-linecap="round"/><path d="${d}" stroke="${col}" stroke-width="${f(w)}" stroke-linecap="round"/>`;
  return [
    stroke(`M${f(x)} ${f(y)} L${f(gx)} ${f(gy)}`, RED, 2.6 * size),
    stroke(`M${f(x - px * cg)} ${f(y - py * cg)} L${f(x + px * cg)} ${f(y + py * cg)}`, YEL, 2.2 * size),
    `<circle cx="${f(gx - dx * 2 * size)}" cy="${f(gy - dy * 2 * size)}" r="${f(2.8 * size)}" fill="${YEL}" ${OUT}/>`,
  ].join('');
}

/** Lama lungo un percorso: contorno scuro, acciaio blu, filo chiaro. */
function blade(d: string, w = 3.6): string {
  return [
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${f(w + 1.8)}" stroke-linecap="round"/>`,
    `<path d="${d}" fill="none" stroke="${BLUE}" stroke-width="${f(w)}" stroke-linecap="round"/>`,
    `<path d="${d}" fill="none" stroke="#cfe0f7" stroke-width="${f(w * 0.22)}" stroke-linecap="round"/>`,
  ].join('');
}

/** Spada dritta verticale: elsa in basso (y = +len/2), punta in alto. */
function straightSword(len: number, size = 1): string {
  const h = len / 2;
  const top = -h + 2;
  const base = h - 9 * size;
  return blade(`M0 ${f(base)} L0 ${f(top)}`, 3.6 * size) + hilt(0, base, 0, -1, size);
}

/** Spada curva da (x0,y0) (elsa) a (x1,y1) (punta), incurvata verso il punto di controllo (cx,cy). */
function curvedSword(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number): string {
  const l = Math.hypot(cx - x0, cy - y0);
  return blade(`M${f(x0)} ${f(y0)} Q${f(cx)} ${f(cy)} ${f(x1)} ${f(y1)}`) + hilt(x0, y0, (cx - x0) / l, (cy - y0) / l);
}

// ---------- Disposizione dei semi ----------

const PIP_POS: Record<number, [number, number][]> = {
  2: [[CX, 52], [CX, 148]],
  3: [[CX, 40], [CX, 100], [CX, 160]],
  4: [[36, 52], [84, 52], [36, 148], [84, 148]],
  5: [[36, 48], [84, 48], [CX, 100], [36, 152], [84, 152]],
  6: [[36, 44], [84, 44], [36, 100], [84, 100], [36, 156], [84, 156]],
  7: [[36, 40], [84, 40], [CX, 70], [36, 100], [84, 100], [36, 160], [84, 160]],
};

function pips(n: number, sym: string, scale: number): string {
  return PIP_POS[n].map(([x, y]) => g(sym, `translate(${x} ${y}) scale(${scale})`)).join('');
}

function bastoni(n: number): string {
  const k = n >> 1;
  const len = [0, 150, 108, 78][k];
  const ys = [[], [CY], [70, 130], [52, 100, 148]][k];
  const parts: string[] = [];
  for (const y of ys) parts.push(g(club(len), `translate(${CX} ${y}) rotate(-28)`));
  for (const y of ys) parts.push(g(club(len), `translate(${CX} ${y}) rotate(28)`));
  if (n % 2) parts.push(g(club(164), `translate(${CX} ${CY})`));
  return parts.join('');
}

function spade(n: number): string {
  const k = n >> 1;
  const widths = [[], [30], [20, 36], [12, 24, 36]][k];
  const parts: string[] = [];
  widths.forEach((w, i) => {
    const a = 6 + 12 * i + (k === 1 ? 6 : 0);
    // Una spada piega a sinistra con l'elsa in basso a sinistra, l'altra a destra con l'elsa in alto a destra:
    // le punte si incrociano verso il centro e le else restano distinte.
    parts.push(curvedSword(CX - a, 172, CX - w * 1.9, CY, CX + 4, 22));
    parts.push(curvedSword(CX + a, 28, CX + w * 1.9, CY, CX - 4, 178));
  });
  if (n % 2) parts.push(g(straightSword(160), `translate(${CX} ${CY})`));
  return parts.join('');
}

// ---------- Assi ----------

function ace(suit: number): string {
  switch (suit) {
    case 0:
      return g(cup(), `translate(${CX} ${CY + 4}) scale(2.7)`);
    case 1: {
      const rays = Array.from({ length: 16 }, (_, i) =>
        `<path d="M0 -44 L3 -50 L0 -56 L-3 -50Z" fill="${i % 2 ? RED : GREEN}" ${OUT} transform="rotate(${i * 22.5})"/>`,
      ).join('');
      return g(rays + g(coin(), 'scale(3)'), `translate(${CX} ${CY})`);
    }
    case 2: {
      const leaves = [-1, 1]
        .map((s) => `<path d="M0 -60 Q${s * 18} -72 ${s * 22} -58 Q${s * 10} -54 0 -60Z" fill="${GREEN}" ${OUT}/>`)
        .join('');
      return g(leaves + club(150, 13, [0.22, 0.4, 0.6, 0.78]), `translate(${CX} ${CY})`);
    }
    default: {
      const ribbon = `<path d="M-30 30 Q0 10 30 30 Q0 22 -30 30Z" fill="${RED}" ${OUT}/>`;
      return g(straightSword(168, 1.9) + ribbon, `translate(${CX} ${CY})`);
    }
  }
}

// ---------- Figure (metà superiore, poi ribaltata) ----------

/** Seme tenuto in mano dalla figura, vicino al bordo destro della metà superiore. */
function held(suit: number): string {
  const hand = `<circle cx="86" cy="88" r="4" fill="${SKIN}" ${OUT}/>`;
  switch (suit) {
    case 0:
      return g(cup(), 'translate(91 68) scale(0.72)') + hand;
    case 1:
      return g(coin(), 'translate(91 70) scale(0.82)') + hand;
    case 2:
      return g(club(64, 5.5), 'translate(91 66) rotate(14)') + hand;
    default:
      return g(straightSword(70, 0.8), 'translate(90 60) rotate(10)') + hand;
  }
}

function face(cx: number, cy: number, r: number): string {
  return [
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${SKIN}" ${OUT}/>`,
    `<circle cx="${cx - r * 0.35}" cy="${cy - r * 0.1}" r="1" fill="${INK}"/>`,
    `<circle cx="${cx + r * 0.35}" cy="${cy - r * 0.1}" r="1" fill="${INK}"/>`,
    `<path d="M${cx - r * 0.3} ${cy + r * 0.45} Q${cx} ${cy + r * 0.6} ${cx + r * 0.3} ${cy + r * 0.45}" fill="none" stroke="${INK}" stroke-width="0.8"/>`,
  ].join('');
}

function kingHalf(suit: number): string {
  return [
    `<path d="M24 100 L30 68 Q60 54 90 68 L96 100Z" fill="${RED}" ${OUT}/>`,
    `<path d="M24 100 L30 68 Q38 63 46 62 L42 100Z" fill="${BLUE}" ${OUT}/>`,
    `<path d="M96 100 L90 68 Q82 63 74 62 L78 100Z" fill="${BLUE}" ${OUT}/>`,
    `<path d="M52 72 L68 72 M52 82 L68 82 M52 92 L68 92" stroke="${YEL}" stroke-width="2.4"/>`,
    `<ellipse cx="60" cy="62" rx="14" ry="4.5" fill="${YEL}" ${OUT}/>`,
    face(60, 44, 11),
    `<path d="M49 47 Q60 66 71 47 Q60 54 49 47Z" fill="${BROWN}" ${OUT}/>`,
    `<path d="M47 35 L47 21 L53 28 L57 17 L60 25 L63 17 L67 28 L73 21 L73 35Z" fill="${YEL}" ${OUT}/>`,
    `<circle cx="60" cy="30" r="2" fill="${RED}"/><circle cx="52" cy="31" r="1.4" fill="${GREEN}"/><circle cx="68" cy="31" r="1.4" fill="${GREEN}"/>`,
    held(suit),
  ].join('');
}

function knightHalf(suit: number): string {
  return [
    // Cavallo: collo e testa rivolti a sinistra.
    `<path d="M20 100 Q16 76 26 60 L17 55 Q10 50 15 43 L30 33 Q42 29 47 38 Q53 58 52 100Z" fill="#f3ece0" ${OUT}/>`,
    `<path d="M40 31 Q55 40 54 62 Q53 80 52 100 L46 100 Q48 70 44 50Z" fill="${RED}" ${OUT}/>`,
    `<path d="M17 52 L30 45 L36 54" fill="none" stroke="${BLUE}" stroke-width="2"/>`,
    `<circle cx="28" cy="41" r="1.4" fill="${INK}"/>`,
    `<path d="M34 34 L37 26 L40 33" fill="#f3ece0" ${OUT}/>`,
    // Cavaliere.
    `<path d="M50 100 L56 72 Q72 63 88 72 L94 100Z" fill="${BLUE}" ${OUT}/>`,
    `<path d="M56 86 L92 86" stroke="${YEL}" stroke-width="3"/>`,
    `<ellipse cx="72" cy="66" rx="11" ry="3.6" fill="${PAPER}" ${OUT}/>`,
    face(72, 52, 9.5),
    `<path d="M59 46 Q72 28 85 46Z" fill="${GREEN}" ${OUT}/>`,
    `<path d="M57 46 L87 46" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`,
    `<path d="M80 38 Q92 26 90 16 Q85 28 76 36Z" fill="${RED}" ${OUT}/>`,
    held(suit),
  ].join('');
}

function jackHalf(suit: number): string {
  return [
    `<path d="M30 100 L35 68 Q60 56 85 68 L90 100Z" fill="${GREEN}" ${OUT}/>`,
    `<path d="M50 63 L48 100 M60 61 L60 100 M70 63 L72 100" stroke="${YEL}" stroke-width="2.6"/>`,
    `<path d="M30 100 L35 68 Q40 66 44 65 L40 100Z" fill="${RED}" ${OUT}/>`,
    `<ellipse cx="60" cy="62" rx="12" ry="4" fill="${PAPER}" ${OUT}/>`,
    `<path d="M48 40 Q46 54 51 58 L52 44Z M72 40 Q74 54 69 58 L68 44Z" fill="${YEL}" ${OUT}/>`,
    face(60, 47, 10),
    `<path d="M48 41 Q60 26 72 41Z" fill="${RED}" ${OUT}/>`,
    `<path d="M47 41 L73 41" stroke="${YEL}" stroke-width="2.4" stroke-linecap="round"/>`,
    `<path d="M68 34 Q84 22 80 10 Q76 24 64 32Z" fill="${BLUE}" ${OUT}/>`,
    held(suit),
  ].join('');
}

function figure(num: number, suit: number): string {
  const half = num === 10 ? kingHalf(suit) : num === 9 ? knightHalf(suit) : jackHalf(suit);
  return [
    `<clipPath id="fr"><rect x="9" y="9" width="102" height="182" rx="4"/></clipPath>`,
    `<rect x="9" y="9" width="102" height="182" rx="4" fill="${BEIGE}"/>`,
    `<g clip-path="url(#fr)">${half}${g(half, `rotate(180 ${CX} ${CY})`)}</g>`,
    `<path d="M9 ${CY} H111" stroke="${INK}" stroke-width="1.2"/>`,
    `<rect x="9" y="9" width="102" height="182" rx="4" fill="none" stroke="${INK}" stroke-width="1.4"/>`,
  ].join('');
}

// ---------- Carta ----------

const SUIT_FILES = ['coppe', 'denari', 'bastoni', 'spade'];
const NUM_NAMES = ['', 'Asso', 'Due', 'Tre', 'Quattro', 'Cinque', 'Sei', 'Sette', 'Fante', 'Cavallo', 'Re'];
const SUIT_NAMES = ['Coppe', 'Denari', 'Bastoni', 'Spade'];

function cardSvg(suit: number, num: number): string {
  let body: string;
  if (num === 1) body = ace(suit);
  else if (num >= 8) body = figure(num, suit);
  else if (suit === 0) body = pips(num, cup(), num >= 6 ? 0.95 : 1.05);
  else if (suit === 1) body = pips(num, coin(), num >= 6 ? 1.05 : 1.2);
  else if (suit === 2) body = bastoni(num);
  else body = spade(num);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`,
    `<title>${NUM_NAMES[num]} di ${SUIT_NAMES[suit]}</title>`,
    `<rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="8" fill="${PAPER}" stroke="#b9b2a4" stroke-width="1.5"/>`,
    body,
    '</svg>',
    '',
  ].join('\n');
}

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'carte', 'piacentine');
mkdirSync(dir, { recursive: true });
for (let s = 0; s < 4; s++) {
  for (let n = 1; n <= 10; n++) writeFileSync(join(dir, `${SUIT_FILES[s]}-${n}.svg`), cardSvg(s, n));
}
console.log(`40 carte scritte in ${dir}`);
