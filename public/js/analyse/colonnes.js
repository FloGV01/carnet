// Les colonnes de Comprendre (v6, v7) : jour de la semaine, lieu, mois. Partagées par les mesures oui / non
// (comprendre.js) et par les émotions du moment (emotions.js). Pur.
import { addDays, jourSemaine } from '../domain/dates.js';

// Compare deux identifiants dans l'ordre de leur liste (Réglages › Listes) ; un identifiant absent de
// `items` va à la fin, rangé par identifiant.
export function ordreDeListe(items) {
  const rang = new Map(items.map((i) => [i.id, i.ordre]));
  const pos = (id) => (rang.has(id) ? rang.get(id) : Number.MAX_SAFE_INTEGER);
  return (a, b) => pos(a) - pos(b) || (a < b ? -1 : a > b ? 1 : 0);
}

// Les colonnes de chaque découpage, dans l'ordre d'affichage : les 7 jours de la semaine (lundi = 0), les
// lieux présents dans `jours` (dans l'ordre de leur liste), les mois calendaires de la période, vides compris.
export function clesDeColonnes(pas, jours, periode, items) {
  if (pas === 'semaine') return [0, 1, 2, 3, 4, 5, 6];
  if (pas === 'lieu') return [...new Set(jours.map((j) => j.lieu).filter(Boolean))].sort(ordreDeListe(items));
  const mois = new Set();
  for (let d = periode.du; d <= periode.au; d = addDays(d, 1)) mois.add(d.slice(0, 7));
  return [...mois];
}

// La colonne d'un jour (il a une `date`, et un `lieu` pour le découpage par lieu).
export const colonneDe = { semaine: (j) => jourSemaine(j.date), lieu: (j) => j.lieu, mois: (j) => j.date.slice(0, 7) };
