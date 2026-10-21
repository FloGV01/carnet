// Émotions du moment (v7, spec §5 et §6.4) : les relevés qui portent une émotion de la roue (domain/roue.js), comptés
// par famille. Par jour, par heure, par colonne (jour de la semaine, mois, lieu), après une nuit, et autour d'instants
// (les explosions ; les séances lancées depuis Bien-être). Des comptes de relevés, dans l'ordre fixe des familles :
// jamais une famille additionnée à une autre en score, ni un pourcentage, ni une famille « meilleure » qu'une autre.
// Les anciennes notes de 1 à 10 n'entrent pas ici (humeur-jour.js). Un relevé se rattache à son jour logique par
// jourEvenement (bascule à 4 h), « vers » compris. Pur : la date du jour n'arrive que par la période.
import { FAMILLES, estEmotion, familleDe } from '../domain/roue.js';
import { diffDays, estDateValide, estHeureValide, jourEvenement } from '../domain/dates.js';
import { minusculeInitiale } from '../domain/phrase.js';
import { clesDeColonnes, colonneDe } from './colonnes.js';
import { SEUILS } from './seuils.js';

const S = SEUILS.emotions;

// Les familles, dans l'ordre de la roue (colere, degout, tristesse, joie, surprise, peur, serenite).
export const CLES_FAMILLES = FAMILLES.map((f) => f.cle);
// { colere: 0, …, serenite: 0 } : toutes les familles, dans leur ordre.
export const comptesVides = () => Object.fromEntries(CLES_FAMILLES.map((c) => [c, 0]));
// Le nombre de relevés d'un compte par famille (le nombre de relevés, pas un score).
export const nombreDeReleves = (compte) => (compte ? CLES_FAMILLES.reduce((s, c) => s + (compte[c] || 0), 0) : 0);
// « colère 3 · sérénité 2 » : un compte par famille, dans l'ordre de la roue, sans les familles à zéro ; '' sans relevé.
// Pour Ta journée, Comprendre, l'Export PSY et la Vue soignants.
export const texteFamilles = (compte) => FAMILLES.filter((f) => compte && compte[f.cle] > 0).map((f) => `${minusculeInitiale(f.libelle)} ${compte[f.cle]}`).join(' · ');
// Seuil commun des vues d'émotions : sous 5 relevés, « Pas encore assez de données pour le dire. ».
export const selonSeuilEmotions = (n) => (n >= S.minReleves ? 'ok' : 'insuffisant');

const ordreHeure = (a, b) => `${a.date} ${a.heure || ''}`.localeCompare(`${b.date} ${b.heure || ''}`);
// Le mot d'un identifiant de la roue, ou null pour une famille seule (« roue:colere »).
const motDe = (id) => (id === `roue:${familleDe(id)}` ? null : id);

// Les relevés qui portent une émotion, dans l'ordre des heures : { date (le jour logique), heure, famille, mot (l'id du mot,
// ou null pour une famille seule), emotion (l'id noté), vers }. Un relevé sans émotion (ancienne note, énergie seule) n'y est pas.
export function relevesAEmotion(humeurs) {
  return (humeurs || []).filter((h) => h && estDateValide(h.date) && estEmotion(h.emotion)).sort(ordreHeure)
    .map((h) => ({
      date: jourEvenement(h.date, h.heure), heure: h.heure || null, famille: familleDe(h.emotion), mot: motDe(h.emotion),
      emotion: h.emotion, vers: Boolean(h.vers),
    }));
}

// Le nombre de relevés de chaque famille : { colere: 3, degout: 0, … }, toutes les familles, dans leur ordre.
export function parFamille(releves) {
  const n = comptesVides();
  for (const r of releves || []) if (r && Object.hasOwn(n, r.famille)) n[r.famille] += 1;
  return n;
}

// Map jour logique → les émotions (identifiants) de ses relevés, dans l'ordre des heures. Seuls les jours de [du, au] qui
// en ont une.
export function emotionsParJour(humeurs, du, au) {
  const res = new Map();
  for (const r of relevesAEmotion(humeurs)) {
    if (r.date < du || r.date > au) continue;
    if (!res.has(r.date)) res.set(r.date, []);
    res.get(r.date).push(r.emotion);
  }
  return res;
}

// Map jour logique → les familles de ses relevés, une par relevé, dans l'ordre des heures.
export function famillesParJour(humeurs, du, au) {
  return new Map([...emotionsParJour(humeurs, du, au)].map(([date, ids]) => [date, ids.map(familleDe)]));
}

// Par heure de la journée (0 à 23), le nombre de relevés de chaque famille. Comme l'ancien profil de la journée, un relevé
// « vers » (noté après coup, à une heure ronde approchée) n'y entre pas ; un relevé sans heure non plus.
export function famillesParHeure(releves) {
  const res = Object.fromEntries(Array.from({ length: 24 }, (_, h) => [h, comptesVides()]));
  for (const r of releves || []) {
    if (!r || r.vers || !estHeureValide(r.heure) || !Object.hasOwn(res[0], r.famille)) continue;
    res[Number(r.heure.slice(0, 2))][r.famille] += 1;
  }
  return res;
}

// Les colonnes de Comprendre (spec §5) : jour de la semaine (0 = lundi), mois de la période (vides compris), ou lieux notés
// les jours qui ont des relevés (dans l'ordre de leur liste). `jours` : les jours (Map ou liste) qui portent `date`, `lieu`
// et `familles` (une par relevé, facteursParJour). Chaque colonne : { cle, n (relevés), jours (jours qui en ont), familles }.
// Sous 5 relevés en tout : aucune colonne.
const PAS = { jourSemaine: 'semaine', semaine: 'semaine', mois: 'mois', lieu: 'lieu' };
export function famillesParColonnes(jours, periode, { cle }, items = []) {
  const pas = PAS[cle];
  const avec = [...(jours && typeof jours.values === 'function' ? jours.values() : jours || [])]
    .filter((j) => j && j.date >= periode.du && j.date <= periode.au && (j.familles || []).length);
  const colonnes = clesDeColonnes(pas, avec, periode, items).map((c) => ({ cle: c, n: 0, jours: 0, familles: comptesVides() }));
  const parCle = new Map(colonnes.map((c) => [c.cle, c]));
  for (const j of avec) {
    const col = parCle.get(colonneDe[pas](j));
    if (!col) continue;
    col.jours += 1;
    for (const f of j.familles) if (Object.hasOwn(col.familles, f)) { col.familles[f] += 1; col.n += 1; }
  }
  const statut = selonSeuilEmotions(colonnes.reduce((s, c) => s + c.n, 0));
  return { statut, colonnes: statut === 'ok' ? colonnes : [] };
}

// Après une nuit Mal · Moyen · Bien (spec §5) : la nuit notée le jour D (celle qui précède D) et les émotions du jour D.
// Pour chaque qualité : le nombre de relevés de chaque famille, et `jours`, le nombre de jours comptés.
const NUITS = new Map([['sommeil:mal', 'mal'], ['sommeil:moyen', 'moyen'], ['sommeil:bien', 'bien']]);
export function apresNuit(journal, humeurs, periode) {
  const parJour = famillesParJour(humeurs, periode.du, periode.au);
  const res = { mal: comptesVides(), moyen: comptesVides(), bien: comptesVides() };
  const jours = { mal: 0, moyen: 0, bien: 0 };
  let n = 0;
  for (const j of journal || []) {
    const nuit = j && NUITS.get(j.sommeilRessenti);
    if (!nuit || !parJour.has(j.date)) continue;
    jours[nuit] += 1;
    for (const f of parJour.get(j.date)) { res[nuit][f] += 1; n += 1; }
  }
  return { statut: selonSeuilEmotions(n), ...res, jours, n };
}

// Minutes écoulées depuis une origine fixe, à partir d'une date et d'une heure locales (sans fuseau : Paris et UTC donnent
// le même résultat, changements d'heure compris).
const ORIGINE = '2000-01-01';
const minutes = (date, heure) => diffDays(ORIGINE, date) * 1440 + Number(heure.slice(0, 2)) * 60 + Number(heure.slice(3, 5));

// Autour d'instants (explosions ; séances de Bien-être) : les familles des relevés notés dans les `avantH` heures avant un
// instant ([t − avantH, t[) et dans les `apresH` heures après ([t, t + apresH]). Le temps écoulé se compte en dates et
// heures calendaires : un relevé de 01:00 est à 2 h d'un instant de 23:00 la veille. Un relevé « vers » compte à son heure
// ronde. Un relevé compte au plus une fois de chaque côté, même près de deux instants. Un instant ou un relevé sans heure
// n'est pas placé.
export function autourDe(instants, humeurs, { avantH = S.heuresAutour, apresH = S.heuresAutour } = {}) {
  const temps = (instants || []).filter((i) => i && estDateValide(i.date) && estHeureValide(i.heure)).map((i) => minutes(i.date, i.heure));
  const avant = comptesVides();
  const apres = comptesVides();
  let n = 0;
  for (const h of humeurs || []) {
    if (!h || !estDateValide(h.date) || !estHeureValide(h.heure) || !estEmotion(h.emotion)) continue;
    const m = minutes(h.date, h.heure);
    const f = familleDe(h.emotion);
    if (temps.some((t) => m >= t - avantH * 60 && m < t)) { avant[f] += 1; n += 1; }
    if (temps.some((t) => m >= t && m <= t + apresH * 60)) { apres[f] += 1; n += 1; }
  }
  return { statut: selonSeuilEmotions(n), avant, apres, instants: temps.length, n };
}

// Autour du Bien-être (spec §6.4) : autourDe sur les séances lancées depuis l'onglet Bien-être (origine `bien-etre`) dont le
// jour logique est dans la période ; les respirations de Moment difficile et de « Pour récupérer » n'y entrent pas.
export function autourDuBienEtre(seances, humeurs, periode) {
  const instants = (seances || []).filter((x) => x && x.origine === 'bien-etre' && estDateValide(x.date) && estHeureValide(x.heure)
    && (() => { const j = jourEvenement(x.date, x.heure); return j >= periode.du && j <= periode.au; })());
  return autourDe(instants, humeurs);
}
