// Genera le immagini SVG delle 40 carte piacentine in public/carte/piacentine/.
// Uso: npm run carte
//
// I disegni sono originali, ispirati al mazzo piacentino: semi con i colori tradizionali,
// figure a doppia testa (speculari rispetto al centro), nessun indice numerico negli angoli.
// File: <seme>-<numero>.svg, con numero da 1 (Asso) a 10 (Re), es. coppe-1.svg, spade-10.svg.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const W = 120;
const H = 200;
const CX = W / 2;
const CY = H / 2;

// Tinte piene (contorni, dettagli) e sfumature definite in DEFS.
const RED = '#c62a2f';
const DARK_RED = '#7c151b';
const YEL = '#f1bf2c';
const DARK_GOLD = '#a8730c';
const BLUE = '#2b5aa6';
const GREEN = '#3b873d';
const INK = '#1d1a17';
const PAPER = '#fffdf6';
const BROWN = '#6e4a2a';
const GOLD = 'url(#gold)';
const GOLD_R = 'url(#goldR)';
const RED_G = 'url(#red)';
const BLUE_G = 'url(#blue)';
const GREEN_G = 'url(#green)';
const WOOD = 'url(#wood)';
const STEEL = 'url(#steel)';
const SKIN = 'url(#skin)';

const DEFS = `<defs>
<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0a8"/><stop offset=".45" stop-color="#f1bf2c"/><stop offset="1" stop-color="#b9800f"/></linearGradient>
<radialGradient id="goldR" cx=".38" cy=".35" r=".7"><stop offset="0" stop-color="#fff6c8"/><stop offset=".5" stop-color="#f3c537"/><stop offset="1" stop-color="#b47a0c"/></radialGradient>
<linearGradient id="red" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e5544b"/><stop offset="1" stop-color="#a11c22"/></linearGradient>
<linearGradient id="blue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5189d8"/><stop offset="1" stop-color="#1d4387"/></linearGradient>
<linearGradient id="green" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#66b462"/><stop offset="1" stop-color="#276629"/></linearGradient>
<linearGradient id="wood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#25602a"/><stop offset=".35" stop-color="#6fbd6a"/><stop offset="1" stop-color="#21572a"/></linearGradient>
<linearGradient id="steel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c3d9f7"/><stop offset=".5" stop-color="#4275c4"/><stop offset="1" stop-color="#1b3f7c"/></linearGradient>
<radialGradient id="skin" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#ffe9ce"/><stop offset="1" stop-color="#eabd8e"/></radialGradient>
<radialGradient id="paper" cx=".5" cy=".45" r=".8"><stop offset="0" stop-color="#fffefa"/><stop offset="1" stop-color="#f5ecd6"/></radialGradient>
<linearGradient id="beige" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fdf7e6"/><stop offset=".5" stop-color="#f2e2bb"/><stop offset="1" stop-color="#fdf7e6"/></linearGradient>
<linearGradient id="horse" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d6cdbd"/></linearGradient>
</defs>`;

const OUT = `stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"`;
const THIN = `stroke="${INK}" stroke-width="0.6" stroke-linejoin="round"`;

const f = (n: number) => +n.toFixed(2);
const g = (body: string, tr: string) => `<g transform="${tr}">${body}</g>`;
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Tratto con bordo scuro: prima il contorno, poi il colore. */
function inked(d: string, col: string, w: number, extra = ''): string {
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${f(w + 1.4)}" stroke-linecap="round"/>`
    + `<path d="${d}" fill="none" stroke="${col}" stroke-width="${f(w)}" stroke-linecap="round" ${extra}/>`;
}

/** Punto e tangente di una curva quadratica. */
function quad(p0: number[], p1: number[], p2: number[], t: number): { x: number; y: number; a: number } {
  const u = 1 - t;
  const x = u * u * p0[0] + 2 * t * u * p1[0] + t * t * p2[0];
  const y = u * u * p0[1] + 2 * t * u * p1[1] + t * t * p2[1];
  const dx = 2 * u * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
  const dy = 2 * u * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
  return { x, y, a: (Math.atan2(dy, dx) * 180) / Math.PI };
}

/** Ramo d'alloro lungo una curva quadratica, con foglie alternate. */
function laurel(p0: number[], p1: number[], p2: number[], n: number, size = 1): string {
  const leaves = range(n).map((i) => {
    const q = quad(p0, p1, p2, 0.12 + (0.84 * i) / (n - 1));
    const side = i % 2 ? 1 : -1;
    return `<ellipse cx="0" cy="${f(-4 * size)}" rx="${f(1.7 * size)}" ry="${f(4 * size)}" fill="${GREEN_G}" ${THIN} transform="translate(${f(q.x)} ${f(q.y)}) rotate(${f(q.a + 90 + side * 50)})"/>`;
  });
  return `<path d="M${p0[0]} ${p0[1]} Q${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]}" fill="none" stroke="${BROWN}" stroke-width="${f(1.1 * size)}" stroke-linecap="round"/>`
    + leaves.join('');
}

/** Fiore a tre petali (giglio stilizzato), usato come fregio. */
function fleuron(size = 1): string {
  const s = (n: number) => f(n * size);
  return [
    `<path d="M0 ${s(-9)} Q${s(4)} ${s(-3)} 0 ${s(2)} Q${s(-4)} ${s(-3)} 0 ${s(-9)}Z" fill="${RED_G}" ${THIN}/>`,
    `<path d="M0 ${s(1)} Q${s(-9)} ${s(-1)} ${s(-8)} ${s(-7)} Q${s(-3)} ${s(-5)} 0 ${s(1)}Z" fill="${GREEN_G}" ${THIN}/>`,
    `<path d="M0 ${s(1)} Q${s(9)} ${s(-1)} ${s(8)} ${s(-7)} Q${s(3)} ${s(-5)} 0 ${s(1)}Z" fill="${GREEN_G}" ${THIN}/>`,
    `<rect x="${s(-3.5)}" y="${s(1)}" width="${s(7)}" height="${s(2.2)}" rx="${s(1)}" fill="${GOLD}" ${THIN}/>`,
    `<path d="M0 ${s(3.2)} L${s(-1.6)} ${s(7)} L0 ${s(8.5)} L${s(1.6)} ${s(7)}Z" fill="${GOLD}" ${THIN}/>`,
  ].join('');
}

/** Nastro (cartiglio) orizzontale centrato in 0,0, largo 2*hw. */
function ribbon(hw: number): string {
  return [
    `<path d="M${-hw} -2 L${-hw - 9} 0 L${-hw - 5} 3.5 L${-hw - 9} 7 L${-hw} 7Z" fill="${DARK_RED}" ${OUT}/>`,
    `<path d="M${hw} -2 L${hw + 9} 0 L${hw + 5} 3.5 L${hw + 9} 7 L${hw} 7Z" fill="${DARK_RED}" ${OUT}/>`,
    `<path d="M${-hw} -4 Q0 -12 ${hw} -4 L${hw} 5 Q0 -3 ${-hw} 5Z" fill="${RED_G}" ${OUT}/>`,
    `<path d="M${-hw + 3} -2.2 Q0 -9.6 ${hw - 3} -2.2" fill="none" stroke="${YEL}" stroke-width="0.9"/>`,
    `<path d="M${-hw + 3} 2.6 Q0 -4.8 ${hw - 3} 2.6" fill="none" stroke="${YEL}" stroke-width="0.9"/>`,
  ].join('');
}

// ---------- Simboli dei semi (coordinate locali centrate in 0,0) ----------

/** Coppa: calice dorato con fascia di gemme, nodo blu e piede sbalzato. Circa 28 x 38. */
function cup(): string {
  const dots = range(7).map((i) => `<circle cx="${-9 + i * 3}" cy="-11.6" r="0.6" fill="${RED}"/>`).join('');
  return [
    `<path d="M-10 18 Q-9 12 -3.5 10 L3.5 10 Q9 12 10 18 Q0 21 -10 18Z" fill="${GOLD}" ${OUT}/>`,
    `<path d="M-6 18.6 L-2.6 11 M0 19.4 L0 11 M6 18.6 L2.6 11" stroke="${DARK_GOLD}" stroke-width="0.7"/>`,
    `<path d="M-9.6 16.8 Q0 20 9.6 16.8" fill="none" stroke="${RED}" stroke-width="1.6"/>`,
    `<rect x="-2" y="1" width="4" height="9.5" fill="${GOLD}" ${OUT}/>`,
    `<ellipse cx="0" cy="5.6" rx="4.6" ry="2.8" fill="${BLUE_G}" ${OUT}/>`,
    `<ellipse cx="-1.6" cy="4.7" rx="1.4" ry="0.7" fill="#fff" opacity="0.7"/>`,
    `<path d="M-13.5 -15 L13.5 -15 Q13 -1 0 2.2 Q-13 -1 -13.5 -15Z" fill="${GOLD}" ${OUT}/>`,
    `<path d="M-8 -4.6 Q-6.5 -1 -3.2 1.2 M-3 -3.6 Q-2.2 -0.6 -1 2 M3 -3.6 Q2.2 -0.6 1 2 M8 -4.6 Q6.5 -1 3.2 1.2" fill="none" stroke="${DARK_GOLD}" stroke-width="0.7"/>`,
    `<path d="M-13 -9 Q0 -5 13 -9 L12.6 -5.6 Q0 -1.8 -12.6 -5.6Z" fill="${RED_G}" ${THIN}/>`,
    `<circle cx="0" cy="-5.35" r="1.4" fill="${BLUE}" stroke="#fff" stroke-width="0.5"/>`,
    `<circle cx="-7.6" cy="-6.1" r="1" fill="${GREEN}" stroke="#fff" stroke-width="0.4"/>`,
    `<circle cx="7.6" cy="-6.1" r="1" fill="${GREEN}" stroke="#fff" stroke-width="0.4"/>`,
    dots,
    `<ellipse cx="0" cy="-15" rx="13.5" ry="3" fill="${RED_G}" ${OUT}/>`,
    `<ellipse cx="0" cy="-15.2" rx="10.8" ry="1.7" fill="${DARK_RED}"/>`,
    `<path d="M-10.5 -12 Q-10 -6 -6.5 -1.4" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity="0.55"/>`,
  ].join('');
}

/** Denaro: moneta d'oro con perline, anello rosso e rosa centrale. Raggio 14. */
function coin(): string {
  const beads = range(24)
    .map((i) => {
      const a = (i * Math.PI) / 12;
      return `<circle cx="${f(12.5 * Math.cos(a))}" cy="${f(12.5 * Math.sin(a))}" r="0.75" fill="${DARK_GOLD}"/>`;
    })
    .join('');
  const leaves = range(8)
    .map((i) => `<ellipse cx="0" cy="-5.8" rx="1.2" ry="2.7" fill="${GREEN}" transform="rotate(${22.5 + i * 45})"/>`)
    .join('');
  const petals = range(8)
    .map((i) => `<ellipse cx="0" cy="-4.6" rx="2.1" ry="3.5" fill="${RED_G}" ${THIN} transform="rotate(${i * 45})"/>`)
    .join('');
  return [
    `<circle r="14" fill="${GOLD_R}" ${OUT}/>`,
    beads,
    `<circle r="10.8" fill="none" stroke="${RED}" stroke-width="1.6"/>`,
    `<circle r="9.4" fill="${PAPER}" stroke="${INK}" stroke-width="0.5"/>`,
    leaves,
    petals,
    `<circle r="2.7" fill="${GOLD_R}" stroke="${INK}" stroke-width="0.5"/>`,
    `<circle r="0.9" fill="${RED}"/>`,
    `<path d="M-9.6 -9 A13 13 0 0 1 3 -12.6" fill="none" stroke="#fff" stroke-width="0.9" stroke-linecap="round" opacity="0.6"/>`,
  ].join('');
}

/** Curva chiusa e morbida (Catmull-Rom convertita in cubiche) che passa per i punti dati. */
function smoothLoop(pts: number[][]): string {
  const n = pts.length;
  const p = (i: number) => pts[(i + n) % n];
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} `
      + `${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + 'Z';
}

/** Mazza verticale lunga `len`, larga al massimo `w`: testa grossa e bitorzoluta in alto (y = -len/2),
 *  impugnatura più sottile in basso con ghiera dorata, nodi e rami mozzati lungo il fusto. */
function club(len: number, w = 13, knotsAt = [0.34, 0.62]): string {
  const h = len / 2;
  const R = w / 2;
  // Bozzi: [posizione lungo il fusto (0 = cima), lato (-1 sinistra, 1 destra), sporgenza in unità di R].
  const lumps: [number, number, number][] = [
    [0.04, 1, 0.12], [0.1, -1, 0.2], [0.16, 1, 0.24], [0.22, -1, 0.12],
    ...knotsAt.map((t, i): [number, number, number] => [t, i % 2 ? 1 : -1, 0.42]),
    ...knotsAt.map((t, i): [number, number, number] => [t + 0.06, i % 2 ? -1 : 1, 0.16]),
  ];
  const sigma = 0.035;
  // Raggio del fusto: si assottiglia dalla testa all'impugnatura, con un leggero ondeggiare irregolare.
  const radius = (t: number, side: number) => {
    const base = R * (0.36 + 0.64 * Math.pow(1 - t, 2.4));
    const wobble = R * 0.05 * (Math.sin(t * 23 + side * 1.7) + 0.6 * Math.sin(t * 41 + side * 3.1));
    const bumps = lumps
      .filter(([, s]) => s === side)
      .reduce((acc, [c, , a]) => acc + R * a * Math.exp(-((t - c) ** 2) / (2 * sigma * sigma)), 0);
    return base + wobble + bumps;
  };
  const yAt = (t: number) => -h + R * 0.75 + (len - R * 1.2) * t;
  const ts = range(36).map((i) => i / 35);
  const right = ts.map((t) => [radius(t, 1), yAt(t)]);
  const left = ts.map((t) => [-radius(t, -1), yAt(t)]).reverse();
  // Cupola della testa, un po' irregolare, e fondo arrotondato dell'impugnatura.
  const top = [[-R * 0.8, -h + R * 0.3], [-R * 0.38, -h + R * 0.04], [R * 0.2, -h - R * 0.02], [R * 0.72, -h + R * 0.2]];
  const rb = radius(1, 1);
  const bottom = [[rb * 0.6, h - rb * 0.25], [-rb * 0.6, h - rb * 0.25]];
  const outline = smoothLoop([...right, ...bottom, ...left, ...top]);

  const stubs = knotsAt
    .map((t, i) => {
      const s = i % 2 ? 1 : -1;
      const r = radius(t, s);
      const bw = R * 0.42;
      const l = R * 0.95;
      return g(
        `<path d="M0 ${f(-bw)} L${f(l)} ${f(-bw * 0.62)} L${f(l)} ${f(bw * 0.62)} L0 ${f(bw)}Z" fill="${WOOD}" ${THIN}/>`
          + `<ellipse cx="${f(l)}" cy="0" rx="${f(bw * 0.3)}" ry="${f(bw * 0.62)}" fill="#e2c389" ${THIN}/>`
          + `<circle cx="${f(l)}" cy="0" r="${f(bw * 0.16)}" fill="${BROWN}"/>`,
        `translate(${f(s * (r - R * 0.25))} ${f(yAt(t) - R * 0.2)}) rotate(${s > 0 ? -35 : 215})`,
      );
    })
    .join('');
  // Occhi del legno (nodi senza ramo) sul lato opposto ai rami mozzati.
  const eyes = knotsAt
    .map((t, i) => {
      const s = i % 2 ? -1 : 1;
      const y = yAt(t + 0.06);
      const x = s * radius(t + 0.06, s) * 0.45;
      return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(R * 0.2)}" ry="${f(R * 0.3)}" fill="#24552a" stroke="#123316" stroke-width="${f(R * 0.08)}"/>`
        + `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(R * 0.07)}" ry="${f(R * 0.12)}" fill="#8fcf88"/>`;
    })
    .join('');
  // Venature di corteccia: piccoli archi sparsi lungo il fusto.
  const bark = range(Math.max(4, Math.round(len / 10)))
    .map((i, _, a) => {
      const t = 0.05 + (0.82 * (i + 0.5)) / a.length;
      const r = Math.min(radius(t, 1), radius(t, -1));
      const x = (i % 3 - 1) * r * 0.45;
      const y = yAt(t);
      return `<path d="M${f(x - r * 0.2)} ${f(y)} q${f(r * 0.2)} ${f(-r * 0.35)} ${f(r * 0.4)} 0" fill="none" stroke="#1d4a21" stroke-width="${f(R * 0.09)}" stroke-linecap="round" opacity="0.8"/>`;
    })
    .join('');
  const shine = ts
    .filter((t) => t > 0.04 && t < 0.86)
    .map((t, i) => `${i ? 'L' : 'M'}${f(-radius(t, -1) * 0.45)} ${f(yAt(t))}`)
    .join(' ');
  const by = yAt(0.86);
  const br = radius(0.86, 1) + 0.4;
  const band = `<rect x="${f(-br)}" y="${f(by)}" width="${f(br * 2)}" height="${f(R * 0.55)}" rx="${f(R * 0.12)}" fill="${GOLD}" ${THIN}/>`
    + `<path d="M${f(-br + 0.3)} ${f(by + R * 0.275)} H${f(br - 0.3)}" stroke="${RED}" stroke-width="${f(R * 0.14)}"/>`;
  return [
    stubs,
    `<path d="${outline}" fill="${WOOD}" ${OUT}/>`,
    `<path d="${shine}" fill="none" stroke="#b6e4b0" stroke-width="${f(R * 0.18)}" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>`,
    bark,
    eyes,
    band,
  ].join('');
}

/** Punta di lama in (x,y) nella direzione (dx,dy) normalizzata. */
function tip(x: number, y: number, dx: number, dy: number, w: number): string {
  const px = -dy * (w / 2 + 0.4);
  const py = dx * (w / 2 + 0.4);
  return `<path d="M${f(x + px)} ${f(y + py)} L${f(x + dx * w * 1.8)} ${f(y + dy * w * 1.8)} L${f(x - px)} ${f(y - py)}Z" fill="${BLUE}" ${THIN}/>`;
}

/** Impugnatura di spada in (x,y), con la lama che parte in direzione (dx,dy) normalizzata. */
function hilt(x: number, y: number, dx: number, dy: number, size = 1): string {
  const px = -dy;
  const py = dx;
  const gl = 7 * size;
  const cg = 5.5 * size;
  const gx = x - dx * gl;
  const gy = y - dy * gl;
  const grip = `M${f(x)} ${f(y)} L${f(gx)} ${f(gy)}`;
  const guard = `M${f(x - px * cg)} ${f(y - py * cg)} L${f(x + px * cg)} ${f(y + py * cg)}`;
  return [
    inked(grip, RED, 2.6 * size),
    `<path d="${grip}" stroke="${DARK_RED}" stroke-width="${f(2.6 * size)}" stroke-dasharray="${f(0.7 * size)} ${f(1.1 * size)}"/>`,
    inked(guard, YEL, 2.2 * size),
    `<circle cx="${f(x - px * cg)}" cy="${f(y - py * cg)}" r="${f(1.5 * size)}" fill="${GOLD_R}" ${THIN}/>`,
    `<circle cx="${f(x + px * cg)}" cy="${f(y + py * cg)}" r="${f(1.5 * size)}" fill="${GOLD_R}" ${THIN}/>`,
    `<circle cx="${f(x)}" cy="${f(y)}" r="${f(1.3 * size)}" fill="${RED}" ${THIN}/>`,
    `<circle cx="${f(gx - dx * 2 * size)}" cy="${f(gy - dy * 2 * size)}" r="${f(2.8 * size)}" fill="${GOLD_R}" ${OUT}/>`,
  ].join('');
}

/** Lama lungo un percorso: contorno scuro, acciaio blu, filo chiaro. */
function blade(d: string, w = 3.6): string {
  return [
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${f(w + 1.8)}" stroke-linecap="butt"/>`,
    `<path d="${d}" fill="none" stroke="${BLUE}" stroke-width="${f(w)}" stroke-linecap="butt"/>`,
    `<path d="${d}" fill="none" stroke="#d6e5fa" stroke-width="${f(w * 0.22)}" stroke-linecap="round"/>`,
  ].join('');
}

/** Spada dritta verticale: elsa in basso (y = +len/2), punta in alto. */
function straightSword(len: number, size = 1): string {
  const h = len / 2;
  const w = 3.6 * size;
  const top = -h + w * 1.8 + 1;
  const base = h - 9 * size;
  return tip(0, top, 0, -1, w) + blade(`M0 ${f(base)} L0 ${f(top)}`, w) + hilt(0, base, 0, -1, size);
}

/** Spada curva da (x0,y0) (elsa) a (x1,y1) (punta), incurvata verso il punto di controllo (cx,cy). */
function curvedSword(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number): string {
  const l0 = Math.hypot(cx - x0, cy - y0);
  const l1 = Math.hypot(x1 - cx, y1 - cy);
  return tip(x1, y1, (x1 - cx) / l1, (y1 - cy) / l1, 3.6)
    + blade(`M${f(x0)} ${f(y0)} Q${f(cx)} ${f(cy)} ${f(x1)} ${f(y1)}`)
    + hilt(x0, y0, (cx - x0) / l0, (cy - y0) / l0);
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
  // Nelle carte basse un piccolo fregio riempie il centro, come nei mazzi tradizionali.
  const deco = n === 2 || n === 4 ? g(fleuron(0.9), `translate(${CX} ${CY - 2})`) : '';
  return deco + PIP_POS[n].map(([x, y]) => g(sym, `translate(${x} ${y}) scale(${scale})`)).join('');
}

function bastoni(n: number): string {
  const k = n >> 1;
  const len = [0, 150, 108, 78][k];
  const w = [0, 14, 13, 11][k];
  const ys = [[], [CY], [70, 130], [52, 100, 148]][k];
  const parts: string[] = [];
  for (const y of ys) parts.push(g(club(len, w), `translate(${CX} ${y}) rotate(-28)`));
  for (const y of ys) parts.push(g(club(len, w), `translate(${CX} ${y}) rotate(28)`));
  if (n % 2) parts.push(g(club(164, 15), `translate(${CX} ${CY})`));
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
    parts.push(curvedSword(CX - a, 172, CX - w * 1.9, CY, CX + 4, 26));
    parts.push(curvedSword(CX + a, 28, CX + w * 1.9, CY, CX - 4, 174));
  });
  if (n % 2) parts.push(g(straightSword(160), `translate(${CX} ${CY})`));
  return parts.join('');
}

// ---------- Assi ----------

function aceSword(): string {
  const wraps = range(7).map((i) => `M-3.5 ${57 + i * 3} L3.5 ${55 + i * 3}`).join(' ');
  return [
    laurel([-4, 70], [-34, 50], [-30, 6], 9, 1.3),
    laurel([4, 70], [34, 50], [30, 6], 9, 1.3),
    `<path d="M-5.5 50 L-4.6 -60 L0 -78 L4.6 -60 L5.5 50Z" fill="${STEEL}" ${OUT}/>`,
    `<path d="M0 46 L0 -62" stroke="#e3eefc" stroke-width="1.3" stroke-linecap="round"/>`,
    `<path d="M-1.8 46 L-1.6 -58" stroke="#1b3f7c" stroke-width="0.5" opacity="0.6"/>`,
    inked('M-25 57 Q-13 47 0 50 Q13 47 25 57', YEL, 4.4),
    `<circle cx="-26" cy="58" r="3.6" fill="${GOLD_R}" ${OUT}/>`,
    `<circle cx="26" cy="58" r="3.6" fill="${GOLD_R}" ${OUT}/>`,
    `<rect x="-3.6" y="53" width="7.2" height="23" rx="1.5" fill="${RED_G}" ${OUT}/>`,
    `<path d="${wraps}" stroke="${DARK_RED}" stroke-width="1"/>`,
    `<circle cx="0" cy="51" r="4.6" fill="${RED_G}" stroke="${YEL}" stroke-width="1.4"/>`,
    `<circle cx="0" cy="51" r="1.4" fill="#fff" opacity="0.8"/>`,
    `<circle cx="0" cy="81" r="6" fill="${GOLD_R}" ${OUT}/>`,
    `<path d="M-3 81 H3 M0 78 V84" stroke="${DARK_GOLD}" stroke-width="1"/>`,
    g(ribbon(26), 'translate(0 -18)'),
  ].join('');
}

function ace(suit: number): string {
  switch (suit) {
    case 0:
      return [
        laurel([CX - 6, 150], [CX - 46, 130], [CX - 40, 70], 9, 1.2),
        laurel([CX + 6, 150], [CX + 46, 130], [CX + 40, 70], 9, 1.2),
        g(cup(), `translate(${CX} ${CY + 4}) scale(2.7)`),
        g(fleuron(1.3), `translate(${CX} 34)`),
        g(fleuron(1.3), `translate(${CX} 176) rotate(180)`),
      ].join('');
    case 1: {
      const rays = range(16)
        .map((i) =>
          i % 2
            ? `<path d="M0 -44 L2.4 -49 L0 -53 L-2.4 -49Z" fill="${RED_G}" ${THIN} transform="rotate(${i * 22.5})"/>`
            : `<path d="M0 -44 L3.4 -51 L0 -58 L-3.4 -51Z" fill="${GOLD}" ${OUT} transform="rotate(${i * 22.5})"/>`,
        )
        .join('');
      return [
        g(fleuron(1.2), `translate(${CX} 24)`),
        g(fleuron(1.2), `translate(${CX} 176) rotate(180)`),
        g(rays + `<circle r="45" fill="none" stroke="${RED}" stroke-width="1.2"/>` + g(coin(), 'scale(3)'), `translate(${CX} ${CY})`),
      ].join('');
    }
    case 2: {
      const leaves = [-1, 1]
        .map(
          (s) =>
            `<path d="M0 -62 Q${s * 18} -76 ${s * 24} -62 Q${s * 10} -56 0 -62Z" fill="${GREEN_G}" ${OUT}/>`
            + `<path d="M0 -62 Q${s * 12} -66 ${s * 20} -63" fill="none" stroke="#1d4a21" stroke-width="0.6"/>`
            + `<path d="M${s * 2} -66 Q${s * 6} -84 ${s * 18} -88 Q${s * 14} -74 ${s * 2} -66Z" fill="${GREEN_G}" ${OUT}/>`
            + `<path d="M${s * 2} -66 Q${s * 10} -76 ${s * 16} -86" fill="none" stroke="#1d4a21" stroke-width="0.6"/>`,
        )
        .join('');
      const bud = `<path d="M0 -64 Q-5 -78 0 -90 Q5 -78 0 -64Z" fill="${GREEN_G}" ${OUT}/><circle cx="0" cy="-90" r="2.4" fill="${RED_G}" ${THIN}/>`;
      return g(bud + leaves + club(150, 24, [0.36, 0.56, 0.76]) + g(ribbon(24), 'translate(0 22)'), `translate(${CX} ${CY + 4})`);
    }
    default:
      return g(aceSword(), `translate(${CX} ${CY + 4})`);
  }
}

// ---------- Figure (metà superiore, poi ribaltata) ----------

/** Seme tenuto in mano dalla figura, vicino al bordo destro della metà superiore. */
function held(suit: number): string {
  switch (suit) {
    case 0:
      return g(cup(), 'translate(92 68) scale(0.74)');
    case 1:
      return g(coin(), 'translate(92 70) scale(0.82)');
    case 2:
      return g(club(66, 10), 'translate(91 64) rotate(14)');
    default:
      return g(straightSword(72, 0.8), 'translate(90 58) rotate(10)');
  }
}

/** Braccio destro che sale verso il seme tenuto in mano. */
function arm(sleeve: string, cuff: string): string {
  return [
    `<path d="M74 70 Q88 70 90 84 L82 88 Q80 80 72 78Z" fill="${sleeve}" ${OUT}/>`,
    `<path d="M80.5 88.5 L90.5 84" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>`,
    `<path d="M80.5 88.5 L90.5 84" stroke="${cuff}" stroke-width="2.4" stroke-linecap="round"/>`,
    `<ellipse cx="88" cy="91" rx="4.2" ry="3.6" fill="${SKIN}" ${OUT}/>`,
    `<path d="M85.5 89 Q88 90.5 90.5 89" fill="none" stroke="${INK}" stroke-width="0.5"/>`,
  ].join('');
}

function face(cx: number, cy: number, r: number, beard = false): string {
  const e = r * 0.36;
  const ey = cy - r * 0.08;
  const eye = (x: number) =>
    `<ellipse cx="${f(x)}" cy="${f(ey)}" rx="${f(r * 0.17)}" ry="${f(r * 0.11)}" fill="#fff" stroke="${INK}" stroke-width="0.4"/>`
    + `<circle cx="${f(x + r * 0.03)}" cy="${f(ey)}" r="${f(r * 0.08)}" fill="${INK}"/>`
    + `<path d="M${f(x - r * 0.2)} ${f(ey - r * 0.22)} Q${f(x)} ${f(ey - r * 0.33)} ${f(x + r * 0.2)} ${f(ey - r * 0.22)}" fill="none" stroke="${BROWN}" stroke-width="0.7"/>`;
  return [
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${SKIN}" ${OUT}/>`,
    `<circle cx="${f(cx - r * 0.5)}" cy="${f(cy + r * 0.32)}" r="${f(r * 0.2)}" fill="#e98a7a" opacity="0.35"/>`,
    `<circle cx="${f(cx + r * 0.5)}" cy="${f(cy + r * 0.32)}" r="${f(r * 0.2)}" fill="#e98a7a" opacity="0.35"/>`,
    eye(cx - e),
    eye(cx + e),
    `<path d="M${f(cx)} ${f(ey + r * 0.05)} Q${f(cx - r * 0.12)} ${f(cy + r * 0.3)} ${f(cx + r * 0.06)} ${f(cy + r * 0.32)}" fill="none" stroke="#b07a55" stroke-width="0.6"/>`,
    beard
      ? `<path d="M${f(cx - r * 0.38)} ${f(cy + r * 0.46)} Q${f(cx - r * 0.15)} ${f(cy + r * 0.34)} ${f(cx)} ${f(cy + r * 0.45)} Q${f(cx + r * 0.15)} ${f(cy + r * 0.34)} ${f(cx + r * 0.38)} ${f(cy + r * 0.46)}" fill="none" stroke="${BROWN}" stroke-width="1.3" stroke-linecap="round"/>`
      : `<path d="M${f(cx - r * 0.22)} ${f(cy + r * 0.5)} Q${f(cx)} ${f(cy + r * 0.64)} ${f(cx + r * 0.22)} ${f(cy + r * 0.5)}" fill="#c4473f" stroke="${INK}" stroke-width="0.4"/>`,
  ].join('');
}

/** Pois dorati su una griglia, per i tessuti. */
function dots(x0: number, y0: number, cols: number, rows: number, step: number, col = YEL): string {
  return range(cols * rows)
    .map((i) => {
      const c = i % cols;
      const r = (i / cols) | 0;
      return `<circle cx="${f(x0 + c * step + (r % 2 ? step / 2 : 0))}" cy="${f(y0 + r * step)}" r="0.9" fill="${col}"/>`;
    })
    .join('');
}

function kingHalf(suit: number): string {
  const ermine = range(6).map((i) => `<path d="M${40 + i * 8} 66 l-0.8 2.4 l0.8 -0.6 l0.8 0.6Z" fill="${INK}"/>`).join('');
  return [
    // Mantello e veste.
    `<path d="M22 100 L28 68 Q60 52 92 68 L98 100Z" fill="${BLUE_G}" ${OUT}/>`,
    `<path d="M40 100 L44 66 Q60 60 76 66 L80 100Z" fill="${RED_G}" ${OUT}/>`,
    dots(48, 74, 4, 4, 7),
    `<path d="M60 66 V100" stroke="${YEL}" stroke-width="3"/><path d="M60 66 V100" stroke="${DARK_GOLD}" stroke-width="0.6"/>`,
    range(4).map((i) => `<circle cx="60" cy="${72 + i * 7}" r="1.3" fill="${GOLD_R}" ${THIN}/>`).join(''),
    `<path d="M44 66 L40 100 M76 66 L80 100" stroke="${YEL}" stroke-width="1.8"/>`,
    // Mano sinistra che regge il mantello.
    `<path d="M28 72 Q24 84 32 92 L38 88 Q34 82 36 74Z" fill="${BLUE_G}" ${OUT}/>`,
    `<ellipse cx="37" cy="90" rx="3.8" ry="3.3" fill="${SKIN}" ${OUT}/>`,
    // Collo di ermellino.
    `<path d="M32 68 Q60 55 88 68 L86 73 Q60 62 34 73Z" fill="#fbfaf5" ${OUT}/>`,
    ermine,
    held(suit),
    arm(BLUE_G, YEL),
    // Testa: capelli, volto, barba, corona.
    `<path d="M47 36 Q44 50 49 60 L71 60 Q76 50 73 36Z" fill="${BROWN}" ${OUT}/>`,
    face(60, 44, 11, true),
    `<path d="M50 49 Q51 63 60 66 Q69 63 70 49 Q66 55 60 55 Q54 55 50 49Z" fill="${BROWN}" ${OUT}/>`,
    `<path d="M54 58 Q57 61 60 58 Q63 61 66 58" fill="none" stroke="#4a3018" stroke-width="0.6"/>`,
    `<path d="M47 35 L46 21 L52 27 L56 15 L60 24 L64 15 L68 27 L74 21 L73 35Z" fill="${GOLD}" ${OUT}/>`,
    `<rect x="46.5" y="31" width="27" height="5" rx="1" fill="${GOLD}" ${OUT}/>`,
    `<circle cx="46" cy="20" r="1.3" fill="#fff" ${THIN}/><circle cx="56" cy="14.4" r="1.3" fill="#fff" ${THIN}/><circle cx="64" cy="14.4" r="1.3" fill="#fff" ${THIN}/><circle cx="74" cy="20" r="1.3" fill="#fff" ${THIN}/>`,
    `<circle cx="60" cy="33.5" r="1.7" fill="${RED}" ${THIN}/><circle cx="52.5" cy="33.5" r="1.2" fill="${GREEN}" ${THIN}/><circle cx="67.5" cy="33.5" r="1.2" fill="${BLUE}" ${THIN}/>`,
    `<path d="M60 22 L58.6 27 L60 29 L61.4 27Z" fill="${RED}" ${THIN}/>`,
  ].join('');
}

function knightHalf(suit: number): string {
  const mane = range(6)
    .map((i) => `<path d="M${41 + i * 1.6} ${33 + i * 6} q6 1 7 6" fill="none" stroke="${i % 2 ? YEL : RED}" stroke-width="2.2" stroke-linecap="round"/>`)
    .join('');
  return [
    // Cavallo: collo e testa rivolti a sinistra, con briglie e gualdrappa.
    `<path d="M18 100 Q14 76 25 60 L16 55 Q9 50 14 43 L29 33 Q41 28 47 37 Q54 58 53 100Z" fill="url(#horse)" ${OUT}/>`,
    mane,
    `<path d="M33 33 L35 23 L40 31Z" fill="url(#horse)" ${OUT}/>`,
    `<path d="M35.5 25.5 L37.3 30" stroke="#c9a6a0" stroke-width="1"/>`,
    `<path d="M16 52 L29 45 L37 55 M29 45 L33 34" fill="none" stroke="${INK}" stroke-width="2.6"/>`,
    `<path d="M16 52 L29 45 L37 55 M29 45 L33 34" fill="none" stroke="${RED}" stroke-width="1.6"/>`,
    `<circle cx="29" cy="45" r="1.6" fill="${GOLD_R}" ${THIN}/><circle cx="37" cy="55" r="1.4" fill="${GOLD_R}" ${THIN}/>`,
    `<path d="M37 55 Q58 70 80 86" fill="none" stroke="${BROWN}" stroke-width="0.9"/>`,
    `<ellipse cx="27.5" cy="40.5" rx="2" ry="1.5" fill="#fff" ${THIN}/><circle cx="27" cy="40.6" r="0.9" fill="${INK}"/>`,
    `<ellipse cx="15.8" cy="47.5" rx="1.1" ry="0.8" fill="${INK}"/>`,
    `<path d="M14 51 Q17 53 20 52" fill="none" stroke="${INK}" stroke-width="0.6"/>`,
    `<path d="M18 100 Q20 88 30 84 Q44 82 53 88 L53 100Z" fill="${RED_G}" ${OUT}/>`,
    `<path d="M20 93 Q30 86 53 91" fill="none" stroke="${YEL}" stroke-width="1.6"/>`,
    dots(26, 96, 5, 1, 6),
    // Cavaliere con cappello piumato.
    `<path d="M50 100 L55 72 Q72 62 89 72 L94 100Z" fill="${BLUE_G}" ${OUT}/>`,
    `<path d="M55 86 L93 86" stroke="${YEL}" stroke-width="3"/>`,
    `<path d="M72 68 L66 86 M72 68 L78 86" stroke="${YEL}" stroke-width="1.4"/>`,
    dots(60, 92, 5, 1, 6, '#fff'),
    `<path d="M62 66 Q72 72 82 66 L80 70 Q72 75 64 70Z" fill="#fbfaf5" ${OUT}/>`,
    held(suit),
    arm(RED_G, YEL),
    `<path d="M63 46 Q61 56 64 61 L80 61 Q83 56 81 46Z" fill="#8a5a2c" ${OUT}/>`,
    face(72, 52, 9.5),
    `<path d="M59 45 Q72 27 85 45Z" fill="${GREEN_G}" ${OUT}/>`,
    `<path d="M56 46 Q72 41 88 46" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
    `<path d="M56 46 Q72 41 88 46" fill="none" stroke="${GOLD}" stroke-width="1.8" stroke-linecap="round"/>`,
    `<path d="M79 39 Q93 27 91 14 Q85 28 75 37Z" fill="${RED_G}" ${OUT}/>`,
    `<path d="M77 38 Q86 24 82 12 Q80 26 73 36Z" fill="#fff" ${OUT}/>`,
    `<circle cx="76" cy="39" r="1.8" fill="${GOLD_R}" ${THIN}/>`,
  ].join('');
}

function jackHalf(suit: number): string {
  const ruff = range(7).map((i) => `<circle cx="${48 + i * 4}" cy="${63.5 - Math.sin((i / 6) * Math.PI) * 1.6}" r="2.4" fill="#fbfaf5" ${THIN}/>`).join('');
  return [
    // Farsetto a bande con maniche a sbuffo.
    `<path d="M30 100 L35 68 Q60 56 85 68 L90 100Z" fill="${GREEN_G}" ${OUT}/>`,
    `<path d="M48 63 L46 100 M54 62 L53 100 M60 61 L60 100 M66 62 L67 100 M72 63 L74 100" stroke="${YEL}" stroke-width="1.8"/>`,
    `<path d="M51 62 L49.5 100 M63 61.5 L63.5 100 M69 62.5 L70.5 100" stroke="${RED}" stroke-width="1.1"/>`,
    `<path d="M33 92 L87 92 L88 97 L32 97Z" fill="${BROWN}" ${THIN}/>`,
    `<rect x="56.5" y="91" width="7" height="7" rx="1" fill="none" stroke="${YEL}" stroke-width="1.5"/>`,
    `<path d="M35 68 Q24 76 30 90 Q38 92 40 84 Q38 76 42 70Z" fill="${RED_G}" ${OUT}/>`,
    `<path d="M30 78 Q34 76 39 79 M31 85 Q35 83 39 86" fill="none" stroke="${YEL}" stroke-width="1"/>`,
    ruff,
    held(suit),
    arm(RED_G, YEL),
    // Testa con capelli lunghi e berretto piumato.
    `<path d="M48 40 Q44 54 49 62 L53 58 L52 44Z M72 40 Q76 54 71 62 L67 58 L68 44Z" fill="#d9a441" ${OUT}/>`,
    face(60, 47, 10),
    `<path d="M50 41 Q53 36 60 37 Q67 36 70 41" fill="none" stroke="#b5832c" stroke-width="1.6"/>`,
    `<path d="M47 41 Q48 26 60 26 Q73 26 74 39Z" fill="${RED_G}" ${OUT}/>`,
    `<path d="M46 41 Q60 36 74 40" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>`,
    `<path d="M46 41 Q60 36 74 40" fill="none" stroke="${GOLD}" stroke-width="2" stroke-linecap="round"/>`,
    `<path d="M68 33 Q86 22 82 8 Q77 22 64 30Z" fill="${BLUE_G}" ${OUT}/>`,
    `<path d="M70 31 Q80 22 80 12" fill="none" stroke="#cfe0f7" stroke-width="0.7"/>`,
    `<circle cx="66" cy="32" r="2" fill="${GOLD_R}" ${THIN}/>`,
  ].join('');
}

function figure(num: number, suit: number): string {
  const half = num === 10 ? kingHalf(suit) : num === 9 ? knightHalf(suit) : jackHalf(suit);
  return [
    `<clipPath id="fr"><rect x="9" y="9" width="102" height="182" rx="4"/></clipPath>`,
    `<rect x="9" y="9" width="102" height="182" rx="4" fill="url(#beige)"/>`,
    `<g clip-path="url(#fr)">${half}${g(half, `rotate(180 ${CX} ${CY})`)}</g>`,
    // Fascia centrale che separa le due teste.
    `<rect x="9" y="${CY - 2}" width="102" height="4" fill="${GOLD}" ${THIN}/>`,
    `<path d="M9 ${CY} H111" stroke="${RED}" stroke-width="0.8" stroke-dasharray="2 2"/>`,
    `<rect x="9" y="9" width="102" height="182" rx="4" fill="none" stroke="${INK}" stroke-width="1.4"/>`,
    `<rect x="11.2" y="11.2" width="97.6" height="177.6" rx="3" fill="none" stroke="${DARK_GOLD}" stroke-width="0.6"/>`,
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
    DEFS,
    `<rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="8" fill="url(#paper)" stroke="#b9b2a4" stroke-width="1.5"/>`,
    `<rect x="4.5" y="4.5" width="${W - 9}" height="${H - 9}" rx="5" fill="none" stroke="#d8ccb0" stroke-width="0.6"/>`,
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
