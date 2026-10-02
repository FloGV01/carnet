// Routeur par hash, pur : aucune dépendance au DOM.
export const ROUTE_ACCUEIL = 'aujourdhui';

const ID = '([A-Za-z0-9_-]+)';
const DATE = '(\\d{4}-\\d{2}-\\d{2})';
export const ROUTES = [
  { nom: 'aujourdhui', motif: '/aujourdhui' },
  { nom: 'jour', motif: `/jour/${DATE}`, params: ['date'] },
  { nom: 'pas-a-pas', motif: `/pas-a-pas/${DATE}`, params: ['date'] },
  { nom: 'episode', motif: `/episode/${ID}`, params: ['id'] },
  { nom: 'symptome', motif: `/symptome/${ID}`, params: ['id'] },
  { nom: 'historique', motif: '/historique' },
  { nom: 'soins', motif: '/soins' },
  { nom: 'rdv', motif: `/rdv/${ID}`, params: ['id'] },
  { nom: 'consultation', motif: `/consultation/${ID}`, params: ['id'] },
  { nom: 'traitement', motif: `/traitement/${ID}`, params: ['id'] },
  { nom: 'reglages', motif: '/reglages' },
  { nom: 'reglages-sauvegarde', motif: '/reglages/sauvegarde' },
  { nom: 'reglages-effacer', motif: '/reglages/effacer' },
  { nom: 'reglages-rappel', motif: '/reglages/rappel' },
  { nom: 'listes-index', motif: '/reglages/listes' },
  { nom: 'listes', motif: `/reglages/listes/${ID}`, params: ['liste'] },
  { nom: 'diagnostic', motif: '/diagnostic' },
  { nom: 'analyse', motif: '/analyse' },
  { nom: 'export-psy', motif: '/export-psy' },
  { nom: 'soignants', motif: '/soignants' },
].map((r) => ({ ...r, re: new RegExp(`^${r.motif}$`) }));

export function lireRoute(hash) {
  const chemin = String(hash || '').replace(/^#/, '') || `/${ROUTE_ACCUEIL}`;
  for (const r of ROUTES) {
    const m = chemin.match(r.re);
    if (m) {
      const params = {};
      (r.params || []).forEach((p, i) => { params[p] = m[i + 1]; });
      return { nom: r.nom, params, chemin };
    }
  }
  return { nom: ROUTE_ACCUEIL, params: {}, chemin: `/${ROUTE_ACCUEIL}`, inconnue: true };
}

export function versHash(nom, params = {}) {
  const r = ROUTES.find((x) => x.nom === nom);
  if (!r) return `#/${ROUTE_ACCUEIL}`;
  let i = 0;
  const chemin = r.motif.replace(/\([^)]*\)/g, () => encodeURIComponent(params[r.params[i++]] ?? ''));
  return `#${chemin}`;
}

// Onglet actif pour une route donnée.
export function ongletDe(nom) {
  if (['aujourdhui', 'jour', 'pas-a-pas', 'episode', 'symptome'].includes(nom)) return 'aujourdhui';
  if (['analyse', 'export-psy', 'soignants'].includes(nom)) return 'analyse';
  if (nom === 'historique') return 'historique';
  if (['soins', 'rdv', 'consultation', 'traitement'].includes(nom)) return 'soins';
  return 'reglages';
}
