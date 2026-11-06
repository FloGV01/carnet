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

// Humeur du jour (v6), décimale : « 1-4 » se lit ≤ 4, « 7-10 » ≥ 7, « 5-6 » entre les deux.
const TRANCHES_HUMEUR = { bas: (h) => h <= 4, moyen: (h) => h > 4 && h < 7, haut: (h) => h >= 7 };

export function filtrerJours(jours, f = {}) {
  return jours.filter((j) => {
    if (f.du && j.date < f.du) return false;
    if (f.au && j.date > f.au) return false;
    if (f.lieu && j.lieu !== f.lieu) return false;
    if (f.humeur && (j.humeur == null || !TRANCHES_HUMEUR[f.humeur](j.humeur))) return false;
    // explosionsDe (v4) : valeur affichée du jour, épisodes « Explosion » compris (domain/explosions.js).
    if (f.avecExplosions && !((f.explosionsDe ? f.explosionsDe(j) : j.explosions) > 0)) return false;
    if (f.avecNotes && !j.notes) return false;
    return true;
  });
}

export function filtrerSymptomes(symptomes, f = {}) {
  return symptomes.filter((s) => {
    if (f.du && s.date < f.du) return false;
    if (f.symptome && s.symptome !== f.symptome) return false;
    return true;
  });
}

// Début d'un texte, coupé au mot quand c'est possible.
export function debutTexte(texte, max) {
  if (!texte || texte.length <= max) return texte || '';
  const coupe = texte.slice(0, max);
  const espace = coupe.lastIndexOf(' ');
  return `${(espace > max * 0.6 ? coupe.slice(0, espace) : coupe).trimEnd()}…`;
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
export function extrait(texte, requete, avant = 40, apres = avant) {
  const q = normaliserRecherche(requete);
  if (!q || !texte) return null;
  const norm = normaliserRecherche(texte);
  const i = norm.indexOf(q);
  if (i < 0) return null;
  const debut = Math.max(0, i - avant);
  const fin = Math.min(texte.length, i + q.length + apres);
  return { avant: `${debut > 0 ? '…' : ''}${texte.slice(debut, i)}`, trouve: texte.slice(i, i + q.length), apres: `${texte.slice(i + q.length, fin)}${fin < texte.length ? '…' : ''}` };
}

// v11 : les gratitudes du soir, après les points positifs.
export const CHAMPS_TEXTE = {
  journal: ['pointsPositifs', 'gratitudes', 'notes'], episodes: ['situation', 'ceQuiAAide'], symptomes: ['contexte', 'note'],
};

export function chercher(element, store, requete, avant, apres) {
  for (const champ of CHAMPS_TEXTE[store] || []) {
    const ex = extrait(element[champ], requete, avant, apres);
    if (ex) return { champ, ...ex };
  }
  return null;
}
