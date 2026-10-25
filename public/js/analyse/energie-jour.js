// Énergie notée par jour logique (v6) : un relevé compte pour le jour de jourEvenement (un relevé de
// 01:00 ou « vers 0 h » compte pour la veille, « vers » compris). Partagé par Comprendre et Mes jours. Pur.
// v8 (Q17) : l'énergie haute aussi, pour « Avant mes jours à énergie basse ».
import { jourEvenement } from '../domain/dates.js';

export const ENERGIE_BASSE = 'energie:basse';
export const ENERGIE_HAUTE = 'energie:haute';

// Map date → true dès un relevé au `niveau` donné, false si les relevés d'énergie du jour n'en ont aucun.
// Un jour sans relevé d'énergie n'a pas d'entrée (un relevé qui n'a que l'humeur n'en note pas).
export function energieParJour(humeurs, niveau) {
  const res = new Map();
  for (const h of humeurs || []) {
    if (!h || !h.date || !h.energie) continue;
    const jour = jourEvenement(h.date, h.heure);
    res.set(jour, res.get(jour) === true || h.energie === niveau);
  }
  return res;
}

export const energieBasseParJour = (humeurs) => energieParJour(humeurs, ENERGIE_BASSE);
export const energieHauteParJour = (humeurs) => energieParJour(humeurs, ENERGIE_HAUTE);
