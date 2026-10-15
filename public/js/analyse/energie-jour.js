// Énergie basse par jour logique (v6) : un relevé compte pour le jour de jourEvenement (un relevé de
// 01:00 ou « vers 0 h » compte pour la veille, « vers » compris). Partagé par Comprendre et Mes jours. Pur.
import { jourEvenement } from '../domain/dates.js';

export const ENERGIE_BASSE = 'energie:basse';

// Map date → true dès un relevé « basse », false si les relevés d'énergie du jour n'en ont aucun.
// Un jour sans relevé d'énergie n'a pas d'entrée (un relevé qui n'a que l'humeur n'en note pas).
export function energieBasseParJour(humeurs) {
  const res = new Map();
  for (const h of humeurs || []) {
    if (!h || !h.date || !h.energie) continue;
    const jour = jourEvenement(h.date, h.heure);
    res.set(jour, res.get(jour) === true || h.energie === ENERGIE_BASSE);
  }
  return res;
}
