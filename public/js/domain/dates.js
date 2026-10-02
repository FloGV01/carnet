// Seule source des règles de date. Les dates métier sont des chaînes locales AAAA-MM-JJ
// et HH:MM, sans fuseau. L'arithmétique passe par Date.UTC : insensible aux changements d'heure.
export const BASCULE_HEURE = 4;
const JOUR_MS = 86400000;
const pad = (n) => String(n).padStart(2, '0');

export const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
export const JOURS_COURTS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];
export const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export function cleLocale(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function heureLocale(d) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function enUtc(cle) {
  const [a, m, j] = cle.split('-').map(Number);
  return Date.UTC(a, m - 1, j);
}
function depuisUtc(t) {
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function estDateValide(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return depuisUtc(enUtc(s)) === s;
}
export function estHeureValide(s) {
  return typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

export function addDays(cle, n) { return depuisUtc(enUtc(cle) + n * JOUR_MS); }
export function diffDays(a, b) { return Math.round((enUtc(b) - enUtc(a)) / JOUR_MS); }
// 0 = lundi … 6 = dimanche
export function jourSemaine(cle) { return (new Date(enUtc(cle)).getUTCDay() + 6) % 7; }
export function lundiDe(cle) { return addDays(cle, -jourSemaine(cle)); }

// Avant 4 h du matin, on est encore la veille.
export function jourLogique(d) {
  const cle = cleLocale(d);
  return d.getHours() < BASCULE_HEURE ? addDays(cle, -1) : cle;
}
export function estAvantBascule(d) { return d.getHours() < BASCULE_HEURE; }

// Unique règle de rattachement d'un événement à un jour : avant 04:00, c'est la veille.
export function jourEvenement(date, heure) {
  if (heure && estHeureValide(heure) && heure < `${pad(BASCULE_HEURE)}:00`) return addDays(date, -1);
  return date;
}

export function plageJours(du, au) {
  const res = [];
  for (let c = du; c <= au; c = addDays(c, 1)) res.push(c);
  return res;
}

export function formaterJour(cle, { annee = false } = {}) {
  const [a, m, j] = cle.split('-').map(Number);
  return `${JOURS[jourSemaine(cle)]} ${j} ${MOIS_COURTS[m - 1]}${annee ? ` ${a}` : ''}`;
}
// « mercredi 14 octobre », « jeudi 1er octobre » (sans année).
export function formaterJourComplet(cle) {
  const [, m, j] = cle.split('-').map(Number);
  return `${JOURS[jourSemaine(cle)]} ${j}${j === 1 ? 'er' : ''} ${MOIS[m - 1]}`;
}
// « mer. 16 sept. »
export function formaterJourAbrege(cle) {
  const [, m, j] = cle.split('-').map(Number);
  return `${JOURS_COURTS[jourSemaine(cle)]}. ${j} ${MOIS_COURTS[m - 1]}`;
}
export function formaterJourCourt(cle) {
  const [, m, j] = cle.split('-').map(Number);
  return `${JOURS_COURTS[jourSemaine(cle)]} ${pad(j)}/${pad(m)}`;
}
export function formaterDateLongue(cle) {
  const [a, m, j] = cle.split('-').map(Number);
  return `${j}${j === 1 ? 'er' : ''} ${MOIS[m - 1]} ${a}`;
}
export function formaterDateNumerique(cle) {
  const [a, m, j] = cle.split('-').map(Number);
  return `${pad(j)}/${pad(m)}/${a}`;
}
export function formaterSemaine(lundi) {
  const [, m, j] = lundi.split('-').map(Number);
  return `Semaine du ${j}${j === 1 ? 'er' : ''} ${MOIS[m - 1]}`;
}
export function formaterDuree(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}
