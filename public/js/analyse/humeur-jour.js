// Humeur du jour (v6) : la moyenne des humeurs du moment rattachées au jour logique (« vers » compris),
// avec le plus bas et le plus haut. Un jour sans relevé garde son humeur du soir (historique) ; les deux
// ne sont jamais mélangés. Rien de noté : le jour n'a pas d'humeur. Pas d'arrondi ici, il se fait à
// l'affichage. Pur.
import { jourEvenement } from '../domain/dates.js';
import { moyenne } from './stats.js';

// Une humeur est un nombre de 1 à 10 : valeur brute (entière) ou humeur du jour (moyenne, décimale).
export const estHumeur = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 1 && v <= 10;
// Ce qui est saisi (relevé, soir) est toujours entier.
const estHumeurSaisie = (v) => Number.isInteger(v) && estHumeur(v);

// Map date → { valeur, min, max, n, source }. Un jour sans humeur n'a pas d'entrée.
// `n` compte les valeurs : les relevés pour « moment », une seule pour « soir ».
// Un relevé qui n'a que l'énergie n'est pas un relevé d'humeur : il est ignoré.
export function humeursDuJour({ journal, humeurs } = {}) {
  const relevesParJour = new Map();
  for (const h of humeurs || []) {
    if (!h || !h.date || !estHumeurSaisie(h.humeur)) continue;
    const jour = jourEvenement(h.date, h.heure);
    if (!relevesParJour.has(jour)) relevesParJour.set(jour, []);
    relevesParJour.get(jour).push(h.humeur);
  }
  const res = new Map();
  for (const [date, xs] of relevesParJour) {
    res.set(date, { valeur: moyenne(xs), min: Math.min(...xs), max: Math.max(...xs), n: xs.length, source: 'moment' });
  }
  for (const j of journal || []) {
    if (!j || !j.date || res.has(j.date) || !estHumeurSaisie(j.humeur)) continue;
    res.set(j.date, { valeur: j.humeur, min: j.humeur, max: j.humeur, n: 1, source: 'soir' });
  }
  return res;
}

const champs = (h) => (h
  ? { humeur: h.valeur, humeurMin: h.min, humeurMax: h.max, humeurN: h.n, humeurSource: h.source }
  : { humeur: null, humeurMin: null, humeurMax: null, humeurN: 0, humeurSource: null });

// Copie des entrées du journal où `humeur` est l'humeur du jour (et non plus celle du soir), plus
// humeurMin, humeurMax, humeurN et humeurSource. Un jour qui n'a que des relevés reçoit une entrée
// minimale. Trié par date.
export function avecHumeurDuJour(journal, humeurs) {
  const parJour = humeursDuJour({ journal, humeurs });
  const entrees = (journal || []).filter(Boolean).map((j) => ({ ...j, ...champs(parJour.get(j.date)) }));
  const presentes = new Set(entrees.map((j) => j.date));
  for (const [date, h] of parJour) {
    if (!presentes.has(date)) entrees.push({ date, ...champs(h) });
  }
  return entrees.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
