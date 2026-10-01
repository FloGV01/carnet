// Statut des rendez-vous (jamais stocké) : date antérieure au jour logique = passé ;
// date future, du jour ou absente = à venir.
import { addDays } from './dates.js';

export function statutRdv(rdv, aujourdhui) {
  return rdv.date && rdv.date < aujourdhui ? 'passe' : 'a-venir';
}

export function trierRdv(liste, aujourdhui) {
  const aVenir = liste.filter((r) => statutRdv(r, aujourdhui) === 'a-venir')
    .sort((a, b) => (a.date ? 0 : 1) - (b.date ? 0 : 1) || `${a.date || ''} ${a.heure || ''}`.localeCompare(`${b.date || ''} ${b.heure || ''}`));
  const passes = liste.filter((r) => statutRdv(r, aujourdhui) === 'passe')
    .sort((a, b) => `${b.date} ${b.heure || ''}`.localeCompare(`${a.date} ${a.heure || ''}`));
  return { aVenir, passes };
}

// Prochain rendez-vous daté dans l'horizon (14 jours par défaut), pour la ligne d'Aujourd'hui.
export function prochainRdv(liste, aujourdhui, horizon = 14) {
  const limite = addDays(aujourdhui, horizon);
  return trierRdv(liste, aujourdhui).aVenir.find((r) => r.date && r.date <= limite) || null;
}
