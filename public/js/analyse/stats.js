// Outils statistiques purs. Aucune dépendance, aucun hasard non semé.

// Générateur pseudo-aléatoire semé (mulberry32) : mêmes données, même graine, même p.
export function generateur(graine) {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const moyenne = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
export function mediane(xs) {
  if (!xs.length) return null;
  const t = [...xs].sort((a, b) => a - b);
  const m = Math.floor(t.length / 2);
  return t.length % 2 ? t[m] : (t[m - 1] + t[m]) / 2;
}
export function ecartType(xs) {
  if (xs.length < 2) return null;
  const m = moyenne(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}
export function quantile(xs, q) {
  if (!xs.length) return null;
  const t = [...xs].sort((a, b) => a - b);
  const pos = (t.length - 1) * q;
  const b = Math.floor(pos);
  return t[b + 1] !== undefined ? t[b] + (pos - b) * (t[b + 1] - t[b]) : t[b];
}

// Intervalle de Wilson (score) pour une proportion.
export function wilson(succes, n, z = 1.959964) {
  if (n === 0) return [0, 1];
  const p = succes / n;
  const z2 = z * z;
  const centre = (p + z2 / (2 * n)) / (1 + z2 / n);
  const demi = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / (1 + z2 / n);
  return [Math.max(0, centre - demi), Math.min(1, centre + demi)];
}

// Différence de deux proportions, intervalle hybride de Newcombe (1998, méthode 10).
export function newcombe(a, n1, b, n2, z = 1.959964) {
  const p1 = a / n1; const p2 = b / n2;
  const [l1, u1] = wilson(a, n1, z); const [l2, u2] = wilson(b, n2, z);
  const d = p1 - p2;
  return [d - Math.sqrt((p1 - l1) ** 2 + (u2 - p2) ** 2), d + Math.sqrt((u1 - p1) ** 2 + (p2 - l2) ** 2)];
}

function logFact(n) { let s = 0; for (let i = 2; i <= n; i++) s += Math.log(i); return s; }
// Test exact de Fisher bilatéral sur la table [[a, b], [c, d]].
export function fisher(a, b, c, d) {
  const n = a + b + c + d; const r1 = a + b; const c1 = a + c;
  const lp = (x) => logFact(r1) + logFact(n - r1) + logFact(c1) + logFact(n - c1)
    - logFact(n) - logFact(x) - logFact(r1 - x) - logFact(c1 - x) - logFact(n - r1 - c1 + x);
  const obs = lp(a);
  let p = 0;
  for (let x = Math.max(0, r1 + c1 - n); x <= Math.min(r1, c1); x++) { const v = lp(x); if (v <= obs + 1e-7) p += Math.exp(v); }
  return Math.min(1, p);
}

// q-valeurs de Benjamini-Hochberg, dans l'ordre d'entrée.
export function benjaminiHochberg(ps) {
  const m = ps.length;
  const ordre = ps.map((p, i) => [p, i]).sort((x, y) => x[0] - y[0]);
  const q = new Array(m);
  let min = 1;
  for (let k = m - 1; k >= 0; k--) { min = Math.min(min, (ordre[k][0] * m) / (k + 1)); q[ordre[k][1]] = Math.min(1, min); }
  return q;
}

export function rangs(xs) {
  const idx = xs.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]);
  const r = new Array(xs.length);
  for (let i = 0; i < idx.length;) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const moy = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k][1]] = moy;
    i = j + 1;
  }
  return r;
}
export function pearson(xs, ys) {
  const n = xs.length;
  if (n < 3) return null;
  const mx = moyenne(xs); const my = moyenne(ys);
  let sxy = 0; let sxx = 0; let syy = 0;
  for (let i = 0; i < n; i++) { const dx = xs[i] - mx; const dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}
export const spearman = (xs, ys) => pearson(rangs(xs), rangs(ys));
// Corrélation de Spearman partielle de x et y en neutralisant z.
export function spearmanPartielle(xs, ys, zs) {
  const rxy = spearman(xs, ys); const rxz = spearman(xs, zs); const ryz = spearman(ys, zs);
  if (rxy == null) return null;
  if (rxz == null || ryz == null) return rxy;
  const den = Math.sqrt((1 - rxz ** 2) * (1 - ryz ** 2));
  return den === 0 ? null : (rxy - rxz * ryz) / den;
}

// Découpage en blocs de longueur aléatoire (de taille/2 à 3·taille/2, taille en moyenne), redécoupés
// à chaque tirage : des blocs fixes garderaient les mêmes jours de la semaine, et un facteur qui suit
// l'emploi du temps reviendrait identique à chaque permutation (p = 1).
function bornesBlocs(n, taille, alea, debuts) {
  const lMin = Math.max(1, Math.ceil(taille / 2));
  const etendue = 2 * (taille - lMin) + 1;
  let nb = 0;
  for (let i = 0; i < n; i += lMin + Math.floor(alea() * etendue)) debuts[nb++] = i;
  debuts[nb] = n;
  return nb;
}

// Permutation par blocs de jours consécutifs (préserve l'autocorrélation locale). Référence.
export function permuterBlocs(serie, taille, alea) {
  const debuts = new Int32Array(serie.length + 1);
  const nb = bornesBlocs(serie.length, taille, alea, debuts);
  const blocs = [];
  for (let k = 0; k < nb; k++) blocs.push(serie.slice(debuts[k], debuts[k + 1]));
  for (let i = blocs.length - 1; i > 0; i--) { const j = Math.floor(alea() * (i + 1)); [blocs[i], blocs[j]] = [blocs[j], blocs[i]]; }
  return blocs.flat();
}

// p = (1 + c) / (1 + B), c = nombre de permutations dont la statistique atteint l'observée.
export function testPermutation(serie, statistique, { permutations, blocJours, seed }) {
  const obs = statistique(serie);
  if (obs == null || !Number.isFinite(obs)) return { obs: null, p: null };
  const alea = generateur(seed);
  let c = 0;
  for (let b = 0; b < permutations; b++) {
    const v = statistique(permuterBlocs(serie, blocJours, alea));
    if (v != null && (!Number.isFinite(v) || v >= obs - 1e-12)) c++;
  }
  return { obs, p: (1 + c) / (1 + permutations) };
}

// ---------- Versions rapides pour les tests par permutation (tableaux typés, NaN = inconnu) ----------

// Permuteur de blocs réutilisable : copie src dans dst avec des blocs de longueur aléatoire,
// redécoupés à chaque tirage, dans un ordre mélangé (même loi que permuterBlocs).
export function creerPermuteur(n, taille) {
  const debuts = new Int32Array(n + 1);
  const ordre = new Int32Array(n);
  return (src, dst, alea) => {
    const nb = bornesBlocs(n, taille, alea, debuts);
    for (let i = 0; i < nb; i++) ordre[i] = i;
    for (let i = nb - 1; i > 0; i--) { const j = Math.floor(alea() * (i + 1)); const t = ordre[i]; ordre[i] = ordre[j]; ordre[j] = t; }
    let p = 0;
    for (let k = 0; k < nb; k++) {
      const fin = debuts[ordre[k] + 1];
      for (let i = debuts[ordre[k]]; i < fin; i++) dst[p++] = src[i];
    }
    return dst;
  };
}

export function testPermutationRapide(serie, statistique, { permutations, blocJours, seed }) {
  const n = serie.length;
  const obs = statistique(serie);
  if (obs == null || !Number.isFinite(obs)) return { obs: null, p: null };
  const alea = generateur(seed);
  const tampon = new Float64Array(n);
  const permuter = creerPermuteur(n, blocJours);
  let c = 0;
  for (let b = 0; b < permutations; b++) {
    const v = statistique(permuter(serie, tampon, alea));
    if (v != null && (!Number.isFinite(v) || v >= obs - 1e-12)) c++;
  }
  return { obs, p: (1 + c) / (1 + permutations) };
}

// Rangs moyens par comptage, pour des entiers de 0 à max (sommeil 0-2, humeur 1-10).
export function rangsEntiers(xs, n, max, sortie) {
  const freq = new Int32Array(max + 1);
  for (let i = 0; i < n; i++) freq[xs[i]]++;
  const rang = new Float64Array(max + 1);
  let cumul = 0;
  for (let v = 0; v <= max; v++) { rang[v] = cumul + (freq[v] + 1) / 2; cumul += freq[v]; }
  for (let i = 0; i < n; i++) sortie[i] = rang[xs[i]];
  return sortie;
}

export function pearsonTableaux(xs, ys, n) {
  if (n < 3) return null;
  let mx = 0; let my = 0;
  for (let i = 0; i < n; i++) { mx += xs[i]; my += ys[i]; }
  mx /= n; my /= n;
  let sxy = 0; let sxx = 0; let syy = 0;
  for (let i = 0; i < n; i++) { const dx = xs[i] - mx; const dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}
