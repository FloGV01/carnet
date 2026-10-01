// « Ce que les journées à 7 ou plus ont en commun » : journées à 7 ou plus contre journées
// à 4 ou moins, facteur par facteur. Test par permutation de blocs de 7 jours, puis
// correction de Benjamini-Hochberg. Avec peu de données, on n'affirme rien.
import { SEUILS } from './seuils.js';
import { testPermutationRapide, benjaminiHochberg, newcombe } from './stats.js';
import { calendrier } from './calendrier.js';
import { addDays } from '../domain/dates.js';

const S = SEUILS.bonnesJournees;

export function facteursPossibles(journal) {
  const lieux = [...new Set(journal.map((j) => j.lieu).filter(Boolean))].sort();
  const f = lieux.map((id) => ({ cle: `lieu=${id}`, variable: 'lieu', valeur: id, mesure: (j) => (j.lieu == null ? null : j.lieu === id ? 1 : 0) }));
  for (const id of ['sommeil:bien', 'sommeil:moyen', 'sommeil:mal']) {
    f.push({ cle: `sommeil=${id}`, variable: 'sommeil', valeur: id, mesure: (j) => (j.sommeilRessenti == null ? null : j.sommeilRessenti === id ? 1 : 0) });
  }
  f.push({ cle: 'contact', variable: 'contact', mesure: (j) => (j.contactHumain == null ? null : j.contactHumain ? 1 : 0) });
  f.push({ cle: 'sport', variable: 'sport', mesure: (j) => (j.sportMouvement == null ? null : j.sportMouvement ? 1 : 0) });
  f.push({ cle: 'reveil', variable: 'reveil', mesure: (j) => (j.reveilsNocturnes == null ? null : j.reveilsNocturnes >= 1 ? 1 : 0) });
  return f;
}

function proportions(groupes, serie) {
  let a = 0; let n1 = 0; let b = 0; let n2 = 0;
  for (let i = 0; i < serie.length; i++) {
    const v = serie[i];
    if (v == null) continue;
    if (groupes[i] === 'H') { n1++; a += v; } else if (groupes[i] === 'B') { n2++; b += v; }
  }
  return { a, n1, b, n2 };
}

// Évalue tous les facteurs sur les données arrêtées à `fin` (incluse).
export function evaluer(journal, fin) {
  const { entrees } = calendrier(journal, fin);
  const groupes = entrees.map((j) => (!j || j.humeur == null ? null : j.humeur >= S.haut ? 'H' : j.humeur <= S.bas ? 'B' : null));
  const nH = groupes.filter((g) => g === 'H').length;
  const nB = groupes.filter((g) => g === 'B').length;
  const codeGroupe = Int8Array.from(groupes, (g) => (g === 'H' ? 1 : g === 'B' ? 2 : 0));
  if (nH < S.minParGroupe || nB < S.minParGroupe) return { statut: 'insuffisant', nH, nB, facteurs: [] };
  const facteurs = [];
  for (const def of facteursPossibles(journal.filter((j) => j.date <= fin))) {
    const serie = entrees.map((j) => (j ? def.mesure(j) : null));
    const { a, n1, b, n2 } = proportions(groupes, serie);
    const oui = a + b; const non = n1 + n2 - oui;
    const testable = n1 >= S.minConnusParGroupe && n2 >= S.minConnusParGroupe && oui >= S.minOuiNon && non >= S.minOuiNon;
    const res = { cle: def.cle, variable: def.variable, valeur: def.valeur, a, n1, b, n2, testable, d: null, p: null, q: null, net: false };
    if (testable) {
      res.d = a / n1 - b / n2;
      // Série du facteur en tableau typé (NaN = inconnu) ; les groupes restent fixes.
      const typee = Float64Array.from(serie, (v) => (v == null ? NaN : v));
      const stat = (t) => {
        let sa = 0; let sn1 = 0; let sb = 0; let sn2 = 0;
        for (let i = 0; i < t.length; i++) {
          const v = t[i];
          if (v !== v) continue;
          const g = codeGroupe[i];
          if (g === 1) { sn1++; sa += v; } else if (g === 2) { sn2++; sb += v; }
        }
        return sn1 && sn2 ? Math.abs(sa / sn1 - sb / sn2) : null;
      };
      res.p = testPermutationRapide(typee, stat, { permutations: S.permutations, blocJours: S.blocJours, seed: S.seed }).p;
      res.ic = newcombe(a, n1, b, n2);
    }
    facteurs.push(res);
  }
  const testables = facteurs.filter((f) => f.testable);
  const qs = benjaminiHochberg(testables.map((f) => f.p));
  testables.forEach((f, i) => { f.q = qs[i]; f.net = f.q <= S.q && Math.abs(f.d) >= S.ecartMin; });
  return { statut: 'ok', nH, nB, facteurs };
}

// Constats retenus : nets aujourd'hui ET sur les 6 troncatures précédentes ; un constat déjà
// affiché reste tant que q ≤ 0,20. Au plus un constat par variable, 3 au total.
export function bonnesJournees(journal, aujourdhui, dejaAffiches = new Set()) {
  const res = evaluer(journal, aujourdhui);
  if (res.statut !== 'ok') return { ...res, constats: [] };
  const nets = res.facteurs.filter((f) => f.net);
  const stables = new Set(nets.map((f) => f.cle));
  for (let k = 1; k < S.joursStables && stables.size; k++) {
    const r = evaluer(journal, addDays(aujourdhui, -k));
    const netsK = new Set(r.statut === 'ok' ? r.facteurs.filter((f) => f.net).map((f) => f.cle) : []);
    for (const c of [...stables]) if (!netsK.has(c)) stables.delete(c);
  }
  const retenus = res.facteurs.filter((f) => stables.has(f.cle)
    || (dejaAffiches.has(`bj:${f.cle}`) && f.testable && f.q <= S.qSortie));
  const parVariable = new Map();
  for (const f of retenus.sort((x, y) => Math.abs(y.d) - Math.abs(x.d))) if (!parVariable.has(f.variable)) parVariable.set(f.variable, f);
  return { ...res, constats: [...parVariable.values()].slice(0, S.maxConstats) };
}
