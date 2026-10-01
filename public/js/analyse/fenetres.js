// Indicateurs sur une fenêtre de jours [du, au] (bornes incluses). Un champ vide est inconnu :
// chaque indicateur a pour base les seuls jours où ce champ est renseigné.
import { SEUILS } from './seuils.js';
import { moyenne, mediane } from './stats.js';
import { addDays, jourEvenement } from '../domain/dates.js';

const enMinutes = (h) => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
const versHeure = (m) => { const x = ((Math.round(m) % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };
const estHeure = (h) => typeof h === 'string' && /^\d{2}:\d{2}$/.test(h);

// Un coucher avant 12:00 compte après minuit.
export const coucherAjuste = (h) => { const m = enMinutes(h); return m < 720 ? m + 1440 : m; };
export function dureeNuit(coucher, lever) {
  if (!estHeure(coucher) || !estHeure(lever)) return null;
  const d = enMinutes(lever) + 1440 - coucherAjuste(coucher);
  return d >= SEUILS.horaires.dureeMin && d <= SEUILS.horaires.dureeMax ? d : null;
}

export function bornesFenetre(fenetre, aujourdhui, premier) {
  if (fenetre === '7') return [addDays(aujourdhui, -6), aujourdhui];
  if (fenetre === '30') return [addDays(aujourdhui, -29), aujourdhui];
  return [premier && premier < aujourdhui ? premier : aujourdhui, aujourdhui];
}

const dans = (d, du, au) => d >= du && d <= au;
const compte = (xs, f) => xs.reduce((n, x) => n + (f(x) ? 1 : 0), 0);

export function indicateurs({ journal, episodes, symptomes }, du, au) {
  const jours = journal.filter((j) => dans(j.date, du, au));
  const val = (champ) => jours.map((j) => j[champ]).filter((v) => v !== null && v !== undefined);
  const humeurs = val('humeur');
  const explosions = val('explosions');
  const sommeils = val('sommeilRessenti');
  const reveils = val('reveilsNocturnes');
  const couchers = jours.map((j) => j.heureCoucher).filter(estHeure);
  const levers = jours.map((j) => j.heureLever).filter(estHeure);
  const durees = jours.map((j) => dureeNuit(j.heureCoucher, j.heureLever)).filter((d) => d != null);
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
      max: humeurs.length ? Math.max(...humeurs) : null, haut: compte(humeurs, (h) => h >= SEUILS.bonnesJournees.haut),
      bas: compte(humeurs, (h) => h <= SEUILS.bonnesJournees.bas), fragile: humeurs.length < SEUILS.moyenne.peuDeValeurs,
    },
    explosions: { n: explosions.length, total: explosions.reduce((s, x) => s + x, 0), jours: compte(explosions, (x) => x > 0) },
    nuits: {
      n: sommeils.length, mal: compte(sommeils, (s) => s === 'sommeil:mal'), moyen: compte(sommeils, (s) => s === 'sommeil:moyen'),
      bien: compte(sommeils, (s) => s === 'sommeil:bien'),
      reveils: { n: reveils.length, moyenne: moyenne(reveils), fragile: reveils.length < SEUILS.moyenne.peuDeValeurs },
      coucher: couchers.length >= min ? versHeure(mediane(couchers.map(coucherAjuste))) : null,
      lever: levers.length >= min ? versHeure(mediane(levers.map(enMinutes))) : null,
      duree: durees.length >= min ? mediane(durees) : null,
      nCoucher: couchers.length, nLever: levers.length, nDuree: durees.length,
    },
    contact: { n: val('contactHumain').length, oui: compte(val('contactHumain'), (x) => x === true) },
    sport: { n: val('sportMouvement').length, oui: compte(val('sportMouvement'), (x) => x === true) },
    lieux: { n: lieux.length, parLieu, bureau: parLieu['lieu:bureau'] || 0, teletravail: parLieu['lieu:teletravail'] || 0 },
    traitement: { n: tp.length, oui: compte(tp, (x) => x === 'traitementPris:oui'), partiel: compte(tp, (x) => x === 'traitementPris:partiel'), non: compte(tp, (x) => x === 'traitementPris:non') },
    episodes: { nombre: eps.length, intensite: moyenne(intensites), nIntensite: intensites.length },
    symptomes: { nombre: symptomes.filter((s) => dans(s.date, du, au)).length },
  };
}
