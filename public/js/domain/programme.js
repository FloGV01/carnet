// Programme de Bien-être (v8, spec §6, §12.2 et §12.4 ; annexe programme-sophro.md §3) : 8 étapes et 17 séances, dans
// l'ordre de découverte de l'annexe, chaque étape avec sa séance principale puis la courte (trois à l'étape « Un lieu, un
// souvenir »). Respiration abdominale ouvre le Programme à la place de « Premiers pas », qui n'est pas écrite. Les
// identifiants des étapes et des séances sont figés : une séance enregistrée garde celui de la séance du Programme d'où
// elle a été lancée (`programme`), qui est aussi celui de son exercice.
// Le suivi n'est fait que de faits : une séance lancée depuis le Programme et menée au bout (`fin` et `programme`) porte
// « Faite le 12/10 », sa date la plus récente. Rien n'est compté, rien ne dit ce qui n'est pas fait ; aucune date de
// départ, aucun numéro d'étape. La séance qui vient suit la dernière faite, jamais une séance sautée ; après la
// dernière, la première. Pur : la date du jour arrive en paramètre.
import { exerciceDe } from './exercices.js';
import { seanceCoherence } from './respiration.js';
import { formaterDateNumerique, formaterJourMois, jourEvenement } from './dates.js';

export const ETAPES = Object.freeze([
  { id: 'respirer', titre: 'Respirer', seances: ['respiration-abdominale', 'pause-une-minute'] },
  { id: 'autour-de-toi', titre: 'Autour de toi', seances: ['les-sons', 'ancrage-54321'] },
  { id: 'cinq-zones', titre: 'Les cinq zones', seances: ['cinq-zones', 'respiration-carree'] },
  { id: 'tendre-relacher', titre: 'Tendre et relâcher', seances: ['epaules', 'mouvements-lents'] },
  { id: 'zone-par-zone', titre: 'Zone par zone', seances: ['tension-detente', 'point-corps'] },
  { id: 'marcher-rythme', titre: 'Marcher, respirer en rythme', seances: ['marche-lente', 'coherence'] },
  { id: 'lieu-souvenir', titre: 'Un lieu, un souvenir', seances: ['lieu-ressource', 'bon-moment-passe', 'moment-a-venir'] },
  { id: 'corps-entier', titre: 'Le corps entier, ce qui compte', seances: ['scan-corporel', 'ce-qui-compte'] },
].map((x) => Object.freeze({ ...x, seances: Object.freeze(x.seances) })));

// Les 17 séances, dans l'ordre du Programme.
export const SEANCES_PROGRAMME = Object.freeze(ETAPES.flatMap((x) => x.seances));
export const estSeanceProgramme = (id) => typeof id === 'string' && SEANCES_PROGRAMME.includes(id);

// La présentation, écrite une fois en tête de l'écran Programme : d'où vient le programme, et un rythme proposé, jamais
// mesuré ni comparé à quoi que ce soit.
export const PRESENTATION = Object.freeze([
  'Inspiré de la sophrologie et de la pleine conscience, de la respiration au corps entier.',
  'Une façon de faire : une étape par semaine, une ou deux séances, si tu veux. Tu peux aller plus vite, plus lentement, sauter une étape ou revenir en arrière.',
]);

// Dans le Programme, la cohérence cardiaque dure toujours 5 min, au rythme réglé (Réglages › Moment difficile).
export const DUREE_COHERENCE_MIN = 5;

// La séance du Programme pour le lecteur ({ id, titre, dureeMin, posture, description, etapes }), ou null. reglages : la
// méta `respiration`, pour le rythme de la cohérence cardiaque.
export function seanceProgramme(id, reglages) {
  if (!estSeanceProgramme(id)) return null;
  if (id === 'coherence') return seanceCoherence({ ...(reglages && typeof reglages === 'object' ? reglages : {}), duree: DUREE_COHERENCE_MIN });
  return exerciceDe(id);
}

// Les séances faites : lancées depuis le Programme (une séance du Programme connue) et menées au bout. Une séance de la v7
// (sans `fin`), une séance arrêtée en route, une cohérence lancée ailleurs ne comptent pas.
const faites = (seances) => (Array.isArray(seances) ? seances : [])
  .filter((s) => s && s.fin === true && estSeanceProgramme(s.programme) && typeof s.date === 'string');
// L'instant du début, comparable : « 2026-10-12T21:05 ».
const instant = (s) => `${s.date}T${typeof s.heure === 'string' ? s.heure : '00:00'}`;
// Le jour d'une séance : avant 4 h, c'est la veille (domain/dates.js).
const jourDe = (s) => jourEvenement(s.date, s.heure);

// La dernière séance faite, { idSeance, date } (date : son jour), ou null.
export function derniereFaite(seances) {
  let d = null;
  for (const s of faites(seances)) if (!d || instant(s) >= instant(d)) d = s;
  return d ? { idSeance: d.programme, date: jourDe(d) } : null;
}

// La séance qui vient : celle qui suit la dernière faite dans l'ordre du Programme ; au tout début, la première ; après
// la dernière, de nouveau la première.
export function suivante(seances) {
  const d = derniereFaite(seances);
  if (!d) return SEANCES_PROGRAMME[0];
  return SEANCES_PROGRAMME[(SEANCES_PROGRAMME.indexOf(d.idSeance) + 1) % SEANCES_PROGRAMME.length];
}

// Le jour le plus récent où chaque séance a été faite : { idSeance: date }. Une séance jamais faite n'y est pas.
export function faitesLe(seances) {
  const res = {};
  const derniers = {};
  for (const s of faites(seances)) {
    const k = s.programme;
    if (!derniers[k] || instant(s) >= instant(derniers[k])) { derniers[k] = s; res[k] = jourDe(s); }
  }
  return res;
}

// « Faite le 12/10 » ; l'année seulement si ce n'est pas celle du jour : « Faite le 12/10/2025 ».
export function texteFaite(date, aujourdhui) {
  const autreAnnee = typeof aujourdhui === 'string' && date.slice(0, 4) !== aujourdhui.slice(0, 4);
  return `Faite le ${autreAnnee ? formaterDateNumerique(date) : formaterJourMois(date)}`;
}
