// Profil de la journée (v4) : l'énergie des relevés du moment regroupée par créneau de 2 h, sur une fenêtre. Un
// créneau n'apparaît qu'avec des relevés d'assez de jours. Les créneaux suivent la journée telle que l'app la
// découpe : de 4 h à 4 h. v7 : la note de 1 à 10 n'y entre plus ; les émotions de la journée sont comptées par
// emotions.js (famillesParHeure). Aucune comparaison, aucun objectif. Pur.
import { jourEvenement, BASCULE_HEURE } from '../domain/dates.js';
import { SEUILS } from './seuils.js';

const S = SEUILS.moments;
const ENERGIES = ['energie:basse', 'energie:moyenne', 'energie:haute'];

export function profilJournee(humeurs, du, au) {
  // Un relevé compte dès qu'il porte une énergie. Un relevé « vers » (v6) est noté après coup, à une heure ronde
  // approchée : il reste hors du profil.
  const dans = (humeurs || []).filter((h) => h && h.heure && !h.vers && ENERGIES.includes(h.energie)
    && (() => { const j = jourEvenement(h.date, h.heure); return j >= du && j <= au; })());
  const parCreneau = new Map();
  for (const h of dans) {
    const debut = Math.floor(Number(h.heure.slice(0, 2)) / S.largeurCreneau) * S.largeurCreneau;
    if (!parCreneau.has(debut)) parCreneau.set(debut, []);
    parCreneau.get(debut).push(h);
  }
  const rang = (debut) => (debut - BASCULE_HEURE + 24) % 24;
  const creneaux = [...parCreneau.entries()]
    .map(([debut, l]) => ({
      debut, fin: (debut + S.largeurCreneau) % 24, n: l.length, jours: new Set(l.map((h) => jourEvenement(h.date, h.heure))).size,
      // Énergie en jours : un jour compte une fois par niveau noté dans le créneau.
      energie: Object.fromEntries(ENERGIES.map((e) => [e, new Set(l.filter((h) => h.energie === e).map((h) => jourEvenement(h.date, h.heure))).size])),
    }))
    .filter((c) => c.jours >= S.minJours)
    .sort((a, b) => rang(a.debut) - rang(b.debut));
  return { n: dans.length, creneaux, statut: creneaux.length ? 'ok' : 'insuffisant' };
}
