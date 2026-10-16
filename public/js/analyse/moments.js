// Profil de la journée (v4) : humeurs du moment regroupées par créneau de 2 h, sur une fenêtre.
// Un créneau n'apparaît qu'avec des relevés d'assez de jours. Sa moyenne est la moyenne des
// moyennes de chaque jour (un jour très noté ne pèse pas plus). Les créneaux suivent la journée
// telle que l'app la découpe : de 4 h à 4 h. Aucune comparaison, aucun objectif. Pur.
import { jourEvenement, BASCULE_HEURE } from '../domain/dates.js';
import { SEUILS } from './seuils.js';

const S = SEUILS.moments;
const ENERGIES = ['energie:basse', 'energie:moyenne', 'energie:haute'];

export function profilJournee(humeurs, du, au) {
  // Humeur et énergie sont facultatives : un relevé compte dès qu'il porte l'une des deux.
  // Un relevé « vers » (v6) est noté après coup pour une heure passée : il ne dit rien de l'heure
  // où on l'a noté, donc il reste hors du profil (l'humeur du jour, elle, le compte).
  const dans = (humeurs || []).filter((h) => h && h.heure && !h.vers && (h.humeur != null || h.energie != null)
    && (() => { const j = jourEvenement(h.date, h.heure); return j >= du && j <= au; })());
  const parCreneau = new Map();
  for (const h of dans) {
    const debut = Math.floor(Number(h.heure.slice(0, 2)) / S.largeurCreneau) * S.largeurCreneau;
    if (!parCreneau.has(debut)) parCreneau.set(debut, []);
    parCreneau.get(debut).push(h);
  }
  const rang = (debut) => (debut - BASCULE_HEURE + 24) % 24;
  const creneaux = [...parCreneau.entries()]
    .map(([debut, l]) => {
      const jours = new Set(l.map((h) => jourEvenement(h.date, h.heure)));
      const parJour = new Map();
      for (const h of l.filter((x) => x.humeur != null)) {
        const j = jourEvenement(h.date, h.heure);
        if (!parJour.has(j)) parJour.set(j, []);
        parJour.get(j).push(h.humeur);
      }
      const moyennes = [...parJour.values()].map((xs) => xs.reduce((s, x) => s + x, 0) / xs.length);
      return {
        debut, fin: (debut + S.largeurCreneau) % 24, n: l.length, jours: jours.size,
        // Humeur : sur les jours où elle est notée (null si aucun) ; énergie : sur tous les relevés.
        moyenne: moyennes.length ? moyennes.reduce((s, x) => s + x, 0) / moyennes.length : null,
        // Énergie en jours : un jour compte une fois par niveau noté dans le créneau.
        energie: Object.fromEntries(ENERGIES.map((e) => [e, new Set(l.filter((h) => h.energie === e).map((h) => jourEvenement(h.date, h.heure))).size])),
        fragile: parJour.size < SEUILS.journee.minJoursPlein,
      };
    })
    .filter((c) => c.jours >= S.minJours)
    .sort((a, b) => rang(a.debut) - rang(b.debut));
  return { n: dans.length, creneaux, statut: creneaux.length ? 'ok' : 'insuffisant' };
}
