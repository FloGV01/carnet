// Sommeil et humeur, le jour même et le lendemain. Mal = 0, Moyen = 1, Bien = 2.
// Lendemain : Spearman partielle entre la nuit s[i] et l'humeur h[i+1] en neutralisant la nuit
// SUIVANTE s[i+1] (jours consécutifs seulement). Neutraliser l'humeur du jour h[i] créait un faux
// effet dès qu'existait un lien le jour même avec une humeur autocorrélée (biais de collision).
import { SEUILS } from './seuils.js';
import { spearman, spearmanPartielle, testPermutationRapide, moyenne, rangsEntiers, pearsonTableaux } from './stats.js';
import { calendrierTests } from './calendrier.js';
import { addDays } from '../domain/dates.js';

const S = SEUILS.sommeil;
export const CODE_SOMMEIL = { 'sommeil:mal': 0, 'sommeil:moyen': 1, 'sommeil:bien': 2 };
const MODALITES = ['sommeil:mal', 'sommeil:moyen', 'sommeil:bien'];

function suffisant(codes) {
  const parModalite = [0, 0, 0];
  for (const c of codes) parModalite[c]++;
  return codes.length >= S.minPaires && parModalite.filter((n) => n >= S.minParModalite).length >= S.minModalites;
}

// Qualités de nuit assez renseignées (au moins 4 paires), de la pire à la meilleure.
export function extremesFiables(moyennes) {
  const ok = MODALITES.filter((k) => moyennes[k] && moyennes[k].n >= S.minParModalite);
  if (ok.length < 2) return null;
  return { bas: [ok[0], moyennes[ok[0]]], haut: [ok[ok.length - 1], moyennes[ok[ok.length - 1]]] };
}

// Les moyennes affichées (arrondies au dixième) vont-elles dans le sens de rho ? Sinon, pas de
// constat : la phrase ne doit jamais contredire ses propres chiffres.
function coherent(r) {
  const e = extremesFiables(r.moyennes);
  if (!e || r.rho == null) return false;
  const ecart = Math.round(e.haut[1].moyenne * 10) - Math.round(e.bas[1].moyenne * 10);
  return ecart !== 0 && Math.sign(ecart) === Math.sign(r.rho);
}

function moyennesPar(paires) {
  const res = {};
  MODALITES.forEach((m, c) => { const hs = paires.filter((p) => p.s === c).map((p) => p.h); res[m] = hs.length ? { moyenne: moyenne(hs), n: hs.length } : null; });
  return res;
}

export function evaluer(journal, fin, { decalages = ['meme', 'lendemain'] } = {}) {
  const { entrees, consecutif } = calendrierTests(journal, fin, SEUILS.calendrier.trouMaxJours);
  const s = entrees.map((j) => (j && j.sommeilRessenti in CODE_SOMMEIL ? CODE_SOMMEIL[j.sommeilRessenti] : null));
  const h = entrees.map((j) => (j && Number.isInteger(j.humeur) && j.humeur >= 1 && j.humeur <= 10 ? j.humeur : null));
  const opts = { permutations: S.permutations, blocJours: S.blocJours, seed: S.seed };
  const n = s.length;
  const sT = Float64Array.from(s, (v) => (v == null ? NaN : v));
  const hT = Float64Array.from(h, (v) => (v == null ? NaN : v));
  // Tampons réutilisés par les statistiques rapides (rangs par comptage : valeurs entières).
  const bx = new Int32Array(n); const by = new Int32Array(n); const bz = new Int32Array(n);
  const rx = new Float64Array(n); const ry = new Float64Array(n); const rz = new Float64Array(n);
  const corr = (k, mx, my) => pearsonTableaux(rangsEntiers(bx, k, mx, rx), rangsEntiers(by, k, my, ry), k);
  const statMeme = (t) => {
    let k = 0;
    for (let i = 0; i < n; i++) { const a = t[i]; const b = hT[i]; if (a === a && b === b) { bx[k] = a; by[k] = b; k++; } }
    const r = corr(k, 2, 10);
    return r == null ? null : Math.abs(r);
  };
  const statLendemain = (t) => {
    let k = 0;
    for (let i = 0; i + 1 < n; i++) {
      if (!consecutif[i]) continue;
      const a = t[i]; const b = hT[i + 1]; const c = t[i + 1];
      if (a === a && b === b && c === c) { bx[k] = a; by[k] = b; bz[k] = c; k++; }
    }
    if (k < 3) return null;
    const rxy = pearsonTableaux(rangsEntiers(bx, k, 2, rx), rangsEntiers(by, k, 10, ry), k);
    const rxz = pearsonTableaux(rx, rangsEntiers(bz, k, 2, rz), k);
    const ryz = pearsonTableaux(ry, rz, k);
    if (rxy == null) return null;
    if (rxz == null || ryz == null) return Math.abs(rxy);
    const den = Math.sqrt((1 - rxz ** 2) * (1 - ryz ** 2));
    return den === 0 ? null : Math.abs((rxy - rxz * ryz) / den);
  };

  // Jour même
  const idxMeme = s.map((_, i) => i).filter((i) => s[i] != null && h[i] != null);
  const meme = { n: idxMeme.length, statut: 'insuffisant' };
  if (decalages.includes('meme') && suffisant(idxMeme.map((i) => s[i]))) {
    const rho = spearman(idxMeme.map((i) => s[i]), idxMeme.map((i) => h[i]));
    const { p } = testPermutationRapide(sT, statMeme, opts);
    Object.assign(meme, { statut: 'ok', rho, p, net: rho != null && p != null && p <= S.alpha, moyennes: moyennesPar(idxMeme.map((i) => ({ s: s[i], h: h[i] }))) });
  }

  // Lendemain (jours calendaires consécutifs : i et i + 1 dans la série continue)
  const idxLend = s.map((_, i) => i).filter((i) => consecutif[i] && s[i] != null && s[i + 1] != null && h[i + 1] != null);
  const lendemain = { n: idxLend.length, statut: 'insuffisant' };
  if (decalages.includes('lendemain') && suffisant(idxLend.map((i) => s[i]))) {
    const rho = spearmanPartielle(idxLend.map((i) => s[i]), idxLend.map((i) => h[i + 1]), idxLend.map((i) => s[i + 1]));
    const { p } = testPermutationRapide(sT, statLendemain, opts);
    Object.assign(lendemain, { statut: 'ok', rho, p, net: rho != null && p != null && p <= S.alpha, moyennes: moyennesPar(idxLend.map((i) => ({ s: s[i], h: h[i + 1] }))) });
  }

  // Les nuits Mal arrivent-elles à la suite ?
  const idxSuite = s.map((_, i) => i).filter((i) => consecutif[i] && s[i] != null && s[i + 1] != null);
  const suite = idxSuite.length >= S.minPaires ? spearman(idxSuite.map((i) => s[i]), idxSuite.map((i) => s[i + 1])) : null;
  return { meme, lendemain, suite: suite != null && suite >= S.autocorrSuite };
}

// Stabilité : net aujourd'hui et sur les 6 troncatures ; déjà affiché, reste tant que p ≤ 0,01.
export function sommeilHumeur(journal, aujourdhui, dejaAffiches = new Set()) {
  const res = evaluer(journal, aujourdhui);
  for (const cle of ['meme', 'lendemain']) {
    const r = res[cle];
    if (r.statut !== 'ok') continue;
    const garde = dejaAffiches.has(`sommeil:${cle}`) && r.p != null && r.p <= S.alphaSortie;
    let stable = r.net;
    for (let k = 1; k < S.joursStables && stable && !garde; k++) {
      const rk = evaluer(journal, addDays(aujourdhui, -k), { decalages: [cle] })[cle];
      stable = rk.statut === 'ok' && rk.net;
    }
    r.constat = (stable || garde) && coherent(r);
  }
  return res;
}
