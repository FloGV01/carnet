// Indicateurs sur une fenêtre de jours [du, au] (bornes incluses). Un champ vide est inconnu :
// chaque indicateur a pour base les seuls jours où ce champ est renseigné.
import { SEUILS } from './seuils.js';
import { moyenne, mediane } from './stats.js';
import { addDays, jourEvenement } from '../domain/dates.js';
import { HEURES_SOMMEIL } from '../domain/champs.js';

// Première date connue, toutes sources confondues (jusqu'à aujourd'hui).
export function premiereDate({ journal = [], episodes = [], symptomes = [], traitements = [] }, aujourdhui) {
  const dates = [
    ...journal.map((j) => j.date),
    ...episodes.filter((e) => e.date).map((e) => jourEvenement(e.date, e.heure)),
    ...symptomes.map((s) => s.date),
    ...traitements.map((t) => t.date),
  ].filter((x) => typeof x === 'string' && x <= aujourdhui);
  return dates.reduce((m, x) => (!m || x < m ? x : m), null);
}

const enMinutes = (h) => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
const versHeure = (m) => { const x = ((Math.round(m) % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };
const estHeure = (h) => typeof h === 'string' && /^\d{2}:\d{2}$/.test(h);

// Un coucher avant 12:00 compte après minuit.
const coucherAjuste = (h) => { const m = enMinutes(h); return m < 720 ? m + 1440 : m; };
// Minutes du coucher au lever (« Nuit en détail ») : entre 2 h et 16 h, sinon null (une saisie incohérente).
export function minutesCoucherLever(coucher, lever) {
  if (!estHeure(coucher) || !estHeure(lever)) return null;
  const d = enMinutes(lever) + 1440 - coucherAjuste(coucher);
  return d >= SEUILS.horaires.dureeMin && d <= SEUILS.horaires.dureeMax ? d : null;
}
// Durée d'une nuit (v8), en heures : le nombre d'heures noté le soir (4 pour « 4 h ou moins », 10 pour « 10 h ou plus »),
// sinon, pour une nuit ancienne, le temps du coucher au lever avec la même règle (2 h à 16 h) ; null sans durée.
export function dureeNuit(entree) {
  if (!entree) return null;
  const h = entree.heuresSommeil;
  if (Number.isInteger(h) && h >= HEURES_SOMMEIL.min && h <= HEURES_SOMMEIL.max) return h;
  const m = minutesCoucherLever(entree.heureCoucher, entree.heureLever);
  return m == null ? null : m / 60;
}

export function bornesFenetre(fenetre, aujourdhui, premier) {
  if (fenetre === '7') return [addDays(aujourdhui, -6), aujourdhui];
  if (fenetre === '30') return [addDays(aujourdhui, -29), aujourdhui];
  if (fenetre === '90') return [addDays(aujourdhui, -89), aujourdhui];
  return [premier && premier < aujourdhui ? premier : aujourdhui, aujourdhui];
}

const dans = (d, du, au) => d >= du && d <= au;
const compte = (xs, f) => xs.reduce((n, x) => n + (f(x) ? 1 : 0), 0);

// Paires (élément, précision) comptées en jours. par : { element: { precision: jours } } ;
// jours : { element: jours distincts } (la longueur d'une barre, jamais une somme de paires).
function pairesEnJours(jours, extraire) {
  const par = {};
  const total = {};
  for (const j of jours) {
    const paires = extraire(j);
    for (const a of new Set(paires.map(([x]) => x))) total[a] = (total[a] || 0) + 1;
    for (const cle of new Set(paires.map(([a, b]) => `${a}|${b}`))) {
      const [a, b] = cle.split('|');
      par[a] = par[a] || {};
      par[a][b] = (par[a][b] || 0) + 1;
    }
  }
  return { par, jours: total };
}

// Contacts : l'effet n'est accolé à une personne que si elle est seule sur la ligne. Une ligne à
// plusieurs (« Famille, Collègues · Coûteux ») compte chaque personne sans effet, et son effet va
// dans la rangée « À plusieurs » : jamais recopié sur chacun (domain/contacts.js).
function pairesContacts(j) {
  return (j.contacts || []).flatMap((c) => {
    const avec = c.avec || [];
    const effet = c.effet || 'aucun';
    if (avec.length === 0) return [['sans', effet]];
    if (avec.length === 1) return [[avec[0], effet]];
    return [...avec.map((a) => [a, 'aucun']), ['plusieurs', effet]];
  });
}

// Détails du soir (v4), comptés en jours : un jour compte une fois par élément, quel que soit
// le nombre d'activités. Ordre : du plus fréquent au moins fréquent (égalités par id).
function joursPar(jours, extraire) {
  const n = {};
  let total = 0;
  for (const j of jours) {
    const ids = [...new Set(extraire(j).filter(Boolean))];
    if (ids.length) total += 1;
    for (const id of ids) n[id] = (n[id] || 0) + 1;
  }
  return { jours: total, par: Object.entries(n).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([id, nb]) => ({ id, n: nb })) };
}

export function indicateurs({ journal, episodes, symptomes }, du, au) {
  const jours = journal.filter((j) => dans(j.date, du, au));
  const val = (champ) => jours.map((j) => j[champ]).filter((v) => v !== null && v !== undefined);
  const humeurs = val('humeur');
  // Humeur du jour (v6) : min et max portent sur les humeurs du jour ; minReleve et maxReleve, sur
  // les valeurs notées elles-mêmes (relevés et humeurs du soir). Un journal sans humeur du jour
  // (humeurMin absent) retombe sur `humeur`.
  const avecHumeur = jours.filter((j) => j.humeur != null);
  const explosions = val('explosions');
  const sommeils = val('sommeilRessenti');
  const reveils = val('reveilsNocturnes');
  const couchers = jours.map((j) => j.heureCoucher).filter(estHeure);
  const levers = jours.map((j) => j.heureLever).filter(estHeure);
  // Durée médiane (v8) : en minutes, des heures notées le soir, ou du coucher et du lever d'une nuit ancienne.
  const durees = jours.map(dureeNuit).filter((d) => d != null).map((h) => Math.round(h * 60));
  const lieux = val('lieu');
  const parLieu = {};
  for (const l of lieux) parLieu[l] = (parLieu[l] || 0) + 1;
  const tp = val('traitementPris');
  const eps = episodes.filter((e) => dans(jourEvenement(e.date, e.heure), du, au));
  const intensites = eps.map((e) => e.intensite).filter((v) => v != null);
  const min = SEUILS.horaires.minMedian;
  return {
    du, au,
    humeur: {
      n: humeurs.length, moyenne: moyenne(humeurs), min: humeurs.length ? Math.min(...humeurs) : null,
      max: humeurs.length ? Math.max(...humeurs) : null,
      minReleve: avecHumeur.length ? Math.min(...avecHumeur.map((j) => j.humeurMin ?? j.humeur)) : null,
      maxReleve: avecHumeur.length ? Math.max(...avecHumeur.map((j) => j.humeurMax ?? j.humeur)) : null,
      fragile: humeurs.length < SEUILS.moyenne.peuDeValeurs,
    },
    explosions: { n: explosions.length, total: explosions.reduce((s, x) => s + x, 0), jours: compte(explosions, (x) => x > 0) },
    nuits: {
      n: sommeils.length, mal: compte(sommeils, (s) => s === 'sommeil:mal'), moyen: compte(sommeils, (s) => s === 'sommeil:moyen'),
      bien: compte(sommeils, (s) => s === 'sommeil:bien'),
      reveils: { n: reveils.length, moyenne: moyenne(reveils), plafonne: compte(reveils, (r) => r >= SEUILS.reveils.plafond), fragile: reveils.length < SEUILS.moyenne.peuDeValeurs },
      coucher: couchers.length >= min ? versHeure(mediane(couchers.map(coucherAjuste))) : null,
      lever: levers.length >= min ? versHeure(mediane(levers.map(enMinutes))) : null,
      duree: durees.length >= min ? mediane(durees) : null,
      nCoucher: couchers.length, nLever: levers.length, nDuree: durees.length,
    },
    contact: { n: val('contactHumain').length, oui: compte(val('contactHumain'), (x) => x === true) },
    sport: { n: val('sportMouvement').length, oui: compte(val('sportMouvement'), (x) => x === true) },
    sportDetail: {
      types: joursPar(jours, (j) => (j.activites || []).map((a) => a.type)),
      durees: joursPar(jours, (j) => (j.activites || []).map((a) => a.duree)),
      paires: pairesEnJours(jours, (j) => (j.activites || []).map((a) => [a.type || 'sans', a.duree || 'aucun'])),
    },
    contactDetail: {
      avec: joursPar(jours, (j) => (j.contacts || []).flatMap((c) => c.avec || [])),
      effet: joursPar(jours, (j) => (j.contacts || []).map((c) => c.effet)),
      // Pour les barres « Avec qui, comment c'était » : en jours ; « aucun » : effet non précisé,
      // « sans » : personne n'est noté, « plusieurs » : effet d'une ligne à plusieurs personnes.
      paires: pairesEnJours(jours, pairesContacts),
    },
    lieux: { n: lieux.length, parLieu, bureau: parLieu['lieu:bureau'] || 0, teletravail: parLieu['lieu:teletravail'] || 0 },
    traitement: { n: tp.length, oui: compte(tp, (x) => x === 'traitementPris:oui'), partiel: compte(tp, (x) => x === 'traitementPris:partiel'), non: compte(tp, (x) => x === 'traitementPris:non') },
    episodes: { nombre: eps.length, intensite: moyenne(intensites), nIntensite: intensites.length, fragile: intensites.length < SEUILS.moyenne.peuDeValeurs },
    symptomes: { nombre: symptomes.filter((s) => dans(s.date, du, au)).length },
  };
}
