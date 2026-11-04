// La carte des émotions en nombres (v9, spec §4.2 et §5 ; visuel-hwf.md §2.2 à §2.5) : la couleur de chaque case, la
// place de chaque bulle autour du centre de la lentille, et le mot du milieu (v10, spec §4.1). Pur : ni DOM ni date.
// ui/composants/carte-emotions.js n'a plus qu'à les poser.
// Repère : le centre des bulles, en pt (1 px CSS = 1 pt sur l'iPhone) ; la colonne la plus à gauche (col 1, ou celle du
// premier mot à soi rouge ou bleu) et le rang 12 (l'énergie la plus haute) sont en 0. x va vers la droite, y vers le bas.
import { zoneDeCase } from '../domain/carte-roue.js';

const COTE = 12;
export const DIAMETRE = 96;
// Sans mot choisi, un pas régulier : 96 + 10 d'écart (visuel §2.2, le pas lointain le long d'une colonne).
export const PAS = 106;

// ---------- Couleurs (visuel §2.5) ----------

// Par zone : C00, la couleur mesurée du coin intérieur (la case la plus proche du centre de la carte) ; Δa, le pas d'une
// case vers l'extérieur à l'horizontale ; Δb, à la verticale. En RGB. Plus on s'éloigne du centre, plus c'est profond.
const PALETTE = {
  rouge: { c00: [255, 134, 98], da: [-1.3, -14.3, 3.0], db: [-0.5, -12.2, -9.2] },
  jaune: { c00: [247, 228, 109], da: [1.9, 4.9, -9.0], db: [0.4, -13.4, -14.0] },
  bleu: { c00: [128, 213, 255], da: [-2.4, -14.6, -0.6], db: [-25.1, -2.2, 0.1] },
  vert: { c00: [149, 255, 174], da: [-8.6, -0.5, -13.3], db: [-26.7, -4.4, 4.7] },
};
// Au-delà du 3ᵉ pas, mesuré seulement jusque-là, les pas comptent pour moitié (visuel §2.5 : brider l'extrapolation) :
// les coins extérieurs restent vifs sans tourner au rouge ou au bleu purs.
const bride = (k) => Math.min(k, 3) + Math.max(0, k - 3) / 2;
const hex = (rgb) => `#${rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
const canaux = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// La couleur d'une case. Un mot à soi, posé hors du carré (col 0, −1… ou 13, 14…), prend celle de la case du bord de sa
// zone, sur son rang (spec §4.5).
export function couleurCase(col, rang) {
  const c = Math.min(COTE, Math.max(1, col));
  const zone = zoneDeCase(c, rang);
  if (!zone) return null;
  const { c00, da, db } = PALETTE[zone];
  const a = bride(c <= 6 ? 6 - c : c - 7);
  const b = bride(rang >= 7 ? rang - 7 : 6 - rang);
  return hex(c00.map((v, i) => v + a * da[i] + b * db[i]));
}

// Contraste WCAG entre deux couleurs « #rrggbb ».
const lineaire = (v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
const luminance = (h) => { const [r, g, b] = canaux(h).map(lineaire); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const contraste = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// Le mot de la carte du bas, à la couleur de sa bulle sur #2c2c2e (visuel §2.8), éclairci vers le blanc (par 5 %)
// jusqu'à 4,5:1 : les cases profondes du rouge et du bleu n'y seraient pas lisibles telles quelles. How We Feel
// l'éclaircit aussi un peu (#a1fcb6 pour une bulle #95ffae).
export const FOND_CARTE_DU_BAS = '#2c2c2e';
export function couleurLisible(couleur, fond = FOND_CARTE_DU_BAS) {
  const rgb = canaux(couleur);
  for (let t = 0; t <= 1; t += 0.05) {
    const c = hex(rgb.map((v) => v + (255 - v) * t));
    if (contraste(c, fond) >= 4.5) return c;
  }
  return '#ffffff';
}

// ---------- Disposition (visuel §2.2 et §2.3) ----------

// Autour du mot choisi, la taille suit la distance de Manhattan d = |Δcol| + |Δrang| : d = 0, la double capsule de
// 156 ; 1, 120 ; 2, 108 ; 3 et plus, 96. ECHELLES : le facteur sur une bulle de 96.
const ECHELLES = [1.625, 1.25, 1.125, 1];

// La lentille mesurée sur la capture de How We Feel (visuel §2.2), codée en dur comme il le conseille : le centre de
// chaque bulle de la fenêtre visible autour du mot choisi, par rapport à lui, en pt. LENTILLE[a][b] = [x, y] pour
// a = |Δcol| ≤ 2 et b = |Δrang| ≤ 4 ; sa transposée (x et y échangés) vaut pour |Δcol| ≤ 4 et |Δrang| ≤ 2, et les
// signes suivent ceux de Δcol et de Δrang. (2, 1) est la transposée de (1, 2) (222,3 ; mesuré 222,6) ; (0, 4), hors de
// la capture, est extrapolé : 366,5 + 48 + 10 + 48.
const LENTILLE = [
  [[0, 0], [0, 142.1], [0, 260.3], [0, 366.5], [0, 472.5]],
  [[142.1, 0], [117.1, 117.1], [100.3, 222.3], [95.1, 328.8], [93.7, 434.3]],
  [[260.3, 0], [222.3, 100.3], [202.4, 202.4], [192.2, 308.3], [188.8, 415.3]],
];
const lentille = (a, b) => (a <= 2 ? LENTILLE[a][b] : [LENTILLE[b][a][1], LENTILLE[b][a][0]]);

// L'écart horizontal à un mot choisi (a = |Δcol|, b = |Δrang|) : celui de la lentille dans la fenêtre ; au-delà, le
// long de la rangée (celle du bord de la fenêtre pour b > 4 : les colonnes y restent droites), depuis la dernière case
// de la fenêtre, au pas lointain de 106 (96 + 10). L'écart vertical est le même, transposé : dy(a, b) = dx(b, a).
function dx(a, b) {
  const r = Math.min(b, 4);
  const amax = r <= 2 ? 4 : 2;
  return a <= amax ? lentille(a, r)[0] : lentille(amax, r)[0] + (a - amax) * PAS;
}

// Les colonnes de la carte : la première est la colonne 1, ou celle du mot à soi le plus à gauche (motsDeLaCarte,
// domain/carte-roue.js).
const premiereColonne = (mots) => mots.reduce((c, m) => Math.min(c, m.col), 1);

// La place régulière d'une case (sans mot choisi).
const placeReguliere = (col, rang, cmin) => ({ x: (col - cmin) * PAS, y: (COTE - rang) * PAS });

// La place de chaque mot : Map id → { x, y, echelle }. Sans centre (ou un id absent), le pas régulier, échelle 1. Avec un
// centre (le mot choisi, ou le mot du milieu pendant le glissement, v10), la lentille de How We Feel : il garde sa place
// régulière, ses voisines de la fenêtre visible prennent les places mesurées (LENTILLE), et les autres suivent au pas
// lointain. Les bulles ne se chevauchent jamais ; les rangées paraissent courbes autour du centre, et les colonnes s'y
// resserrent, comme sur la capture.
export function disposition(mots, choisi = null) {
  const cmin = premiereColonne(mots);
  const sel = choisi ? mots.find((m) => m.id === choisi) : null;
  if (!sel) return new Map(mots.map((m) => [m.id, { ...placeReguliere(m.col, m.rang, cmin), echelle: 1 }]));
  const o = placeReguliere(sel.col, sel.rang, cmin);
  return new Map(mots.map((m) => {
    // Δrang compté vers le bas, comme y : un rang plus bas est une énergie plus basse.
    const [i, j] = [m.col - sel.col, sel.rang - m.rang];
    const [a, b] = [Math.abs(i), Math.abs(j)];
    return [m.id, { x: o.x + Math.sign(i) * dx(a, b), y: o.y + Math.sign(j) * dx(b, a), echelle: ECHELLES[Math.min(3, a + b)] }];
  }));
}

// Les centres extrêmes de toutes les dispositions possibles (aucun mot choisi, ou n'importe lequel) : le plan de la carte
// les contient tous, il ne change pas de taille quand on choisit un mot. `regulier` : ceux de la disposition sans mot
// choisi, le bord des bulles qu'on voit à l'ouverture.
export function etendue(mots) {
  const bords = (ps) => {
    const e = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    for (const p of ps) {
      e.minX = Math.min(e.minX, p.x); e.maxX = Math.max(e.maxX, p.x);
      e.minY = Math.min(e.minY, p.y); e.maxY = Math.max(e.maxY, p.y);
    }
    return e;
  };
  const regulier = bords(disposition(mots).values());
  const toutes = bords([null, ...mots.map((m) => m.id)].flatMap((choisi) => [...disposition(mots, choisi).values()]));
  return { ...toutes, regulier };
}

// Le mot du milieu (v10, spec §4.1) : celui dont la place régulière est la plus proche de `point` (les places affichées
// bougent avec la lentille : le mot trouvé la ferait bouger à son tour). `precedent` reste tant qu'aucune autre place
// n'est plus proche d'au moins `seuil` pas : la carte ne sautille pas entre deux mots. À égalité, le plus haut (le rang le
// plus grand), puis le plus à gauche : au milieu de quatre mots, le résultat est stable.
const EGALITE = 1e-6;
export function motDuMilieu(mots, point, precedent = null, seuil = 0.15) {
  const cmin = premiereColonne(mots);
  const distance = (m) => { const p = placeReguliere(m.col, m.rang, cmin); return Math.hypot(p.x - point.x, p.y - point.y); };
  let proche = null;
  let dmin = Infinity;
  for (const m of mots) {
    const d = distance(m);
    const avant = d < dmin - EGALITE || (d <= dmin + EGALITE && (m.rang > proche.rang || (m.rang === proche.rang && m.col < proche.col)));
    if (avant) { proche = m; dmin = d; }
  }
  if (!proche) return null;
  const garde = precedent ? mots.find((m) => m.id === precedent) : null;
  return garde && distance(garde) - dmin < seuil * PAS ? garde.id : proche.id;
}

// Le point où centrer la carte : la place régulière d'un mot (le mot choisi la garde), ou le milieu d'une zone de 6 × 6
// (spec §4.1 : toucher une bulle ouvre la carte sur le milieu de sa zone), ou le milieu du carré.
export function pointDe(mots, { id = null, zone = null } = {}) {
  const cmin = premiereColonne(mots);
  const m = id ? mots.find((x) => x.id === id) : null;
  if (m) return placeReguliere(m.col, m.rang, cmin);
  const col = zone === 'rouge' || zone === 'bleu' ? 3.5 : zone ? 9.5 : 6.5;
  const rang = zone === 'rouge' || zone === 'jaune' ? 9.5 : zone ? 3.5 : 6.5;
  return placeReguliere(col, rang, cmin);
}
