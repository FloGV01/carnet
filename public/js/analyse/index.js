// Point d'entrée unique du moteur d'analyse. Pur : la date du jour et les libellés
// arrivent par ctx. L'écran Analyse, l'export PSY et la vue soignants lisent ce même objet.
import { indicateurs, bornesFenetre, premiereDate } from './fenetres.js';
import { classements } from './classements.js';
import { serieHebdo } from './semaines.js';
import { bonnesJournees } from './bonnes-journees.js';
import { sommeilHumeur } from './sommeil.js';
import { ressemblance } from './ressemblance.js';
import { journalAvecExplosions } from '../domain/explosions.js';
import { profilJournee } from './moments.js';
import { avantExplosions } from './avant-explosions.js';

export const FENETRES = ['7', '30', 'tout'];

export function analyze(data, ctx) {
  const { aujourdhui, items, constatsAffiches = [], reglages = {}, zeroDepuis = null } = ctx;
  const journal = data.journal.filter((j) => j.date <= aujourdhui);
  const episodes = data.episodes || [];
  // Explosions (v4, domain/explosions.js) : la règle ne change que la valeur des explosions.
  // Les jours qui n'ont qu'un épisode d'explosion n'entrent que dans les comptes d'explosions
  // (fenêtres, semaines) ; calendrier, bonnes journées, sommeil et signal gardent le journal.
  const brut = { ...data, journal };
  const d = { ...data, journal: journalAvecExplosions(journal, episodes, { zeroDepuis }).filter((j) => j.date <= aujourdhui) };
  const pourSignal = { ...data, journal: journalAvecExplosions(journal, episodes, { zeroDepuis, ajouterJours: false }) };
  const premier = premiereDate(brut, aujourdhui);
  const fenetres = {};
  const classes = {};
  const moments = {};
  const explosions = {};
  for (const f of FENETRES) {
    const [du, au] = bornesFenetre(f, aujourdhui, premier);
    fenetres[f] = indicateurs(d, du, au);
    classes[f] = classements(brut, du, au, items);
    moments[f] = profilJournee(data.humeurs || [], du, au);
    explosions[f] = avantExplosions(episodes, du, au, items);
  }
  const deja = new Set(constatsAffiches);
  const bj = bonnesJournees(journal, aujourdhui, deja);
  const sommeil = sommeilHumeur(journal, aujourdhui, deja);
  const affiches = [
    ...bj.constats.map((c) => `bj:${c.cle}`),
    ...(sommeil.meme.constat ? ['sommeil:meme'] : []),
    ...(sommeil.lendemain.constat ? ['sommeil:lendemain'] : []),
  ];
  return {
    aujourdhui, premier, fenetres, classements: classes, moments, avantExplosions: explosions,
    semaines: serieHebdo(d, aujourdhui, items),
    bonnesJournees: bj, sommeil, constatsAffiches: affiches,
    signal: ressemblance(pourSignal, { aujourdhui, items, actif: reglages.signal !== false }),
  };
}
