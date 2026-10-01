// Point d'entrée unique du moteur d'analyse. Pur : la date du jour et les libellés
// arrivent par ctx. L'écran Analyse, l'export PSY et la vue soignants lisent ce même objet.
import { indicateurs, bornesFenetre, premiereDate } from './fenetres.js';
import { classements } from './classements.js';
import { serieHebdo } from './semaines.js';
import { bonnesJournees } from './bonnes-journees.js';
import { sommeilHumeur } from './sommeil.js';
import { ressemblance } from './ressemblance.js';

export const FENETRES = ['7', '30', 'tout'];

export function analyze(data, ctx) {
  const { aujourdhui, items, constatsAffiches = [], reglages = {} } = ctx;
  const journal = data.journal.filter((j) => j.date <= aujourdhui);
  const d = { ...data, journal };
  const premier = premiereDate(d, aujourdhui);
  const fenetres = {};
  const classes = {};
  for (const f of FENETRES) {
    const [du, au] = bornesFenetre(f, aujourdhui, premier);
    fenetres[f] = indicateurs(d, du, au);
    classes[f] = classements(d, du, au, items);
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
    aujourdhui, premier, fenetres, classements: classes,
    semaines: serieHebdo(d, aujourdhui, items),
    bonnesJournees: bj, sommeil, constatsAffiches: affiches,
    signal: ressemblance(d, { aujourdhui, items, actif: reglages.signal !== false }),
  };
}
