// Regroupements, filtres et recherche de l'Historique. Pur.
import { lundiDe, jourEvenement } from './dates.js';

export function normaliserRecherche(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

// Groupe par semaine (du lundi), semaines et éléments du plus récent au plus ancien.
export function grouperParSemaine(elements, jourDe) {
  const groupes = new Map();
  for (const e of elements) {
    const lundi = lundiDe(jourDe(e));
    if (!groupes.has(lundi)) groupes.set(lundi, []);
    groupes.get(lundi).push(e);
  }
  return [...groupes.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([lundi, liste]) => ({ lundi, elements: liste.sort((a, b) => jourDe(b).localeCompare(jourDe(a))) }));
}

export const TRANCHES_HUMEUR = { bas: [1, 4], moyen: [5, 6], haut: [7, 10] };

export function filtrerJours(jours, f = {}) {
  return jours.filter((j) => {
    if (f.du && j.date < f.du) return false;
    if (f.au && j.date > f.au) return false;
    if (f.lieu && j.lieu !== f.lieu) return false;
    if (f.humeur) { const [a, b] = TRANCHES_HUMEUR[f.humeur]; if (j.humeur == null || j.humeur < a || j.humeur > b) return false; }
    if (f.avecExplosions && !(j.explosions > 0)) return false;
    if (f.avecNotes && !j.notes) return false;
    return true;
  });
}

export function filtrerEpisodes(episodes, f = {}) {
  return episodes.filter((e) => {
    const jour = jourEvenement(e.date, e.heure);
    if (f.du && jour < f.du) return false;
    if (f.au && jour > f.au) return false;
    for (const champ of ['emotion', 'declencheur', 'dessous', 'reaction']) if (f[champ] && e[champ] !== f[champ]) return false;
    if (f.intenseSeulement && !(e.intensite >= 7)) return false;
    return true;
  });
}

// Recherche dans les textes libres ; rend l'extrait autour de la première occurrence.
export function extrait(texte, requete, rayon = 40) {
  const q = normaliserRecherche(requete);
  if (!q || !texte) return null;
  const norm = normaliserRecherche(texte);
  const i = norm.indexOf(q);
  if (i < 0) return null;
  const debut = Math.max(0, i - rayon);
  const fin = Math.min(texte.length, i + q.length + rayon);
  return { avant: `${debut > 0 ? '…' : ''}${texte.slice(debut, i)}`, trouve: texte.slice(i, i + q.length), apres: `${texte.slice(i + q.length, fin)}${fin < texte.length ? '…' : ''}` };
}

export const CHAMPS_TEXTE = {
  journal: ['pointsPositifs', 'notes'], episodes: ['situation', 'ceQuiAAide'], symptomes: ['contexte', 'note'],
};

export function chercher(element, store, requete) {
  for (const champ of CHAMPS_TEXTE[store] || []) {
    const ex = extrait(element[champ], requete);
    if (ex) return { champ, ...ex };
  }
  return null;
}
