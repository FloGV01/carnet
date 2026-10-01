// Classements par liste sur une fenêtre. Les valeurs « hors classement » (Rien d'identifié,
// Je ne sais pas, Aucun) sont exclues du rang mais rappelées.
import { SEUILS } from './seuils.js';
import { jourEvenement } from '../domain/dates.js';

export const LISTES_CLASSEES = [
  { liste: 'declencheur', source: 'episodes', champ: 'declencheur' },
  { liste: 'dessous', source: 'episodes', champ: 'dessous' },
  { liste: 'emotion', source: 'episodes', champ: 'emotion' },
  { liste: 'reaction', source: 'episodes', champ: 'reaction' },
  { liste: 'symptome', source: 'symptomes', champ: 'symptome' },
  { liste: 'effetSecondaire', source: 'traitements', champ: 'effetsSecondaires', multiple: true },
];

export function classer(valeurs, horsClassement) {
  const comptes = new Map();
  const hors = new Map();
  for (const v of valeurs) {
    const m = horsClassement.has(v) ? hors : comptes;
    m.set(v, (m.get(v) || 0) + 1);
  }
  const tries = [...comptes.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const classables = tries.reduce((s, [, n]) => s + n, 0);
  const total = valeurs.length;
  const horsListe = [...hors.entries()].map(([id, n]) => ({ id, n }));
  if (total === 0) return { statut: 'aucun', total, classables, tries, hors: horsListe };
  const { minOccurrences, minTop } = SEUILS.classement;
  if (classables < minOccurrences || !tries.length || tries[0][1] < minTop) return { statut: 'insuffisant', total, classables, tries, hors: horsListe };
  const nTop = tries[0][1];
  return { statut: 'ok', top: tries.filter(([, n]) => n === nTop).map(([id]) => id), nTop, total, classables, tries, hors: horsListe };
}

export function classements({ episodes, symptomes, traitements }, du, au, items) {
  const horsClassement = new Set(items.filter((i) => i.horsClassement).map((i) => i.id));
  const sources = {
    episodes: episodes.filter((e) => { const j = jourEvenement(e.date, e.heure); return j >= du && j <= au; }),
    symptomes: symptomes.filter((s) => s.date >= du && s.date <= au),
    traitements: traitements.filter((t) => t.date >= du && t.date <= au),
  };
  const res = {};
  for (const def of LISTES_CLASSEES) {
    const valeurs = [];
    for (const x of sources[def.source]) {
      const v = x[def.champ];
      if (def.multiple) { if (Array.isArray(v)) valeurs.push(...v); } else if (v) valeurs.push(v);
    }
    res[def.liste] = classer(valeurs, horsClassement);
  }
  return res;
}
