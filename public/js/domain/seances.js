// Séances de Bien-être (v7, spec §6.3) : une respiration ou un exercice mené au bout, ou arrêté après 60 s au moins,
// crée une séance (store `seances`). Rien n'en est compté ni affiché comme un total. Pur : l'instant du début arrive
// en paramètre.
import { cleLocale, heureLocale } from './dates.js';

// Le temps à partir duquel une séance arrêtée avant la fin est gardée.
export const SEANCE_MIN_S = 60;

// Une séance est enregistrée si elle est menée au bout, ou arrêtée après 60 s au moins.
export const doitEnregistrer = ({ dureeS, terminee } = {}) => terminee === true || (Number.isFinite(dureeS) && dureeS >= SEANCE_MIN_S);

// La fiche d'une séance : la date calendaire et l'heure de son début (rattachées au jour par jourEvenement, bascule à 4 h),
// l'exercice (`coherence` ou l'identifiant d'un exercice), son origine et sa durée en secondes entières.
export function nouvelleSeance({ exercice, origine, debut, dureeS }) {
  return { date: cleLocale(debut), heure: heureLocale(debut), exercice, origine, dureeS: dureeSeance(dureeS) };
}
// Une durée en secondes entières, de 0 à 24 h (les bornes du store).
export const dureeSeance = (dureeS) => Math.min(86400, Math.max(0, Math.round(Number(dureeS) || 0)));
