// Émotions du moment (v7, spec §5 et §6.4) : les relevés qui portent une émotion de la roue (domain/roue.js), comptés
// par famille. Par jour, par heure, par colonne (jour de la semaine, mois, lieu), après une nuit, et autour d'instants
// (les explosions ; les séances lancées depuis Bien-être), et (v8, Q18) selon ce que je faisais. Des comptes de relevés,
// dans l'ordre fixe des familles : jamais une famille additionnée à une autre en score, ni un pourcentage, ni une famille
// « meilleure » qu'une autre.
// Les anciennes notes de 1 à 10 n'entrent pas ici (humeur-jour.js). Un relevé se rattache à son jour logique par
// jourEvenement (bascule à 4 h), « vers » compris. Pur : la date du jour n'arrive que par la période.
// v9 (spec §8) : un mot sans famille (Fatigué, Épuisé ; familleDe rend null) reste un relevé à émotion, mais il n'entre
// dans aucun compte par famille.
import { FAMILLES, estEmotion, familleDe } from '../domain/roue.js';
import { diffDays, estDateValide, estHeureValide, jourEvenement } from '../domain/dates.js';
import { minusculeInitiale } from '../domain/phrase.js';
import { clesDeColonnes, colonneDe, ordreDeListe } from './colonnes.js';
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

// Map jour logique → les familles de ses relevés, une par relevé, dans l'ordre des heures. Un mot sans famille n'en
// donne pas ; un jour qui n'a que des mots sans famille n'y est pas.
export function famillesParJour(humeurs, du, au) {
  const res = new Map();
  for (const [date, ids] of emotionsParJour(humeurs, du, au)) {
    const familles = ids.map((id) => familleDe(id)).filter(Boolean);
    if (familles.length) res.set(date, familles);
  }
  return res;
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

// Les colonnes de Comprendre (spec §5) : jour de la semaine (0 = lundi), mois de la période qui ont un relevé, ou lieux
// notés les jours qui ont des relevés (dans l'ordre de leur liste). Un mois sans relevé à émotion (les mois d'avant la v7,
// qui n'ont que des notes) n'a pas de ligne, comme dans le tableau. `jours` : les jours (Map ou liste) qui portent `date`,
// `lieu` et `familles` (une par relevé, facteursParJour). Chaque colonne : { cle, n (relevés), jours (jours qui en ont),
// familles }. Sous 5 relevés en tout : aucune colonne.
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
  return { statut, colonnes: statut === 'ok' ? colonnes.filter((c) => pas !== 'mois' || c.n > 0) : [] };
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
// le même résultat, changements d'heure compris). Le jour n'est calculé qu'une fois par date (v8, Q26 : des milliers de
// relevés, quelques centaines de dates).
const ORIGINE = '2000-01-01';
function minutesParDate() {
  const jours = new Map();
  return (date, heure) => {
    if (!jours.has(date)) jours.set(date, diffDays(ORIGINE, date));
    return jours.get(date) * 1440 + Number(heure.slice(0, 2)) * 60 + Number(heure.slice(3, 5));
  };
}

// Autour d'instants (explosions ; séances de Bien-être) : les familles des relevés notés dans les `avantH` heures avant un
// instant ([t − avantH, t[) et dans les `apresH` heures après ([t, t + apresH]). Le temps écoulé se compte en dates et
// heures calendaires : un relevé de 01:00 est à 2 h d'un instant de 23:00 la veille. Un relevé « vers » compte à son heure
// ronde. Un relevé compte au plus une fois de chaque côté, même près de deux instants. Un instant ou un relevé sans heure
// n'est pas placé. v8 (Q26) : les instants sont triés, et chaque relevé ne cherche que l'instant voisin (recherche
// dichotomique) : sur des années de séances et de relevés, le calcul ne croît plus comme leur produit.
export function autourDe(instants, humeurs, { avantH = S.heuresAutour, apresH = S.heuresAutour } = {}) {
  const minutes = minutesParDate();
  const temps = (instants || []).filter((i) => i && estDateValide(i.date) && estHeureValide(i.heure)).map((i) => minutes(i.date, i.heure));
  const tries = Float64Array.from(temps).sort();
  // L'indice du premier instant strictement après m.
  const premierApres = (m) => {
    let [a, b] = [0, tries.length];
    while (a < b) { const k = (a + b) >> 1; if (tries[k] <= m) a = k + 1; else b = k; }
    return a;
  };
  const avant = comptesVides();
  const apres = comptesVides();
  let n = 0;
  for (const h of humeurs || []) {
    if (!h || !estDateValide(h.date) || !estHeureValide(h.heure) || !estEmotion(h.emotion)) continue;
    const f = familleDe(h.emotion);
    if (!f) continue;
    const m = minutes(h.date, h.heure);
    const k = premierApres(m);
    // Avant un instant t : t − avantH ≤ m < t, soit le premier instant après m, à avantH heures au plus.
    if (k < tries.length && tries[k] - m <= avantH * 60) { avant[f] += 1; n += 1; }
    // Après un instant t : t ≤ m ≤ t + apresH, soit le dernier instant jusqu'à m, à apresH heures au plus.
    if (k > 0 && m - tries[k - 1] <= apresH * 60) { apres[f] += 1; n += 1; }
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

// ---------- Émotions selon ce que je faisais (v8, Q18) ----------

// Les relevés de la période qui portent une émotion d'une famille et au moins une activité de « Ce que je faisais » :
// { date (le jour logique), famille, faisais (sans doublon) }. Leur nombre fait le seuil commun des vues d'émotions
// (5 relevés) : un mot sans famille, qui ne compte pas dans emotionsParActivite, n'y compte pas non plus.
export function relevesAvecActivite(humeurs, periode) {
  const res = [];
  for (const h of humeurs || []) {
    if (!h || !estDateValide(h.date) || !estEmotion(h.emotion) || !Array.isArray(h.faisais) || !h.faisais.length) continue;
    const famille = familleDe(h.emotion);
    if (!famille) continue;
    const date = jourEvenement(h.date, h.heure);
    if (date < periode.du || date > periode.au) continue;
    res.push({ date, famille, faisais: [...new Set(h.faisais.filter(Boolean))] });
  }
  return res;
}

// Pour chaque activité notée, le nombre de relevés de chaque famille : { [idActivite]: { colere: 2, …, serenite: 0 } },
// les activités dans l'ordre de leur liste (`items`, Réglages › Listes), celles qui n'ont aucun relevé absentes. Comme
// l'énergie selon ce que je faisais (comprendre.js), un relevé de deux activités compte pour chacune ; « vers » compris.
// Des comptes de relevés, jamais une part.
export function emotionsParActivite(humeurs, periode, items = []) {
  const par = new Map();
  for (const r of relevesAvecActivite(humeurs, periode)) {
    for (const id of r.faisais) {
      if (!par.has(id)) par.set(id, comptesVides());
      par.get(id)[r.famille] += 1;
    }
  }
  const ordre = ordreDeListe(items);
  return Object.fromEntries([...par].sort(([a], [b]) => ordre(a, b)));
}
