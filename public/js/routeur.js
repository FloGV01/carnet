// Routeur par hash, pur : aucune dépendance au DOM.
export const ROUTE_ACCUEIL = 'aujourdhui';

const ID = '([A-Za-z0-9_-]+)';
const DATE = '(\\d{4}-\\d{2}-\\d{2})';
// Les onglets de l'écran Comprendre (v6, spec §2.1).
export const ONGLETS_COMPRENDRE = ['explosions', 'energie', 'rythmes'];
export const ROUTES = [
  { nom: 'aujourdhui', motif: '/aujourdhui' },
  { nom: 'jour', motif: `/jour/${DATE}`, params: ['date'] },
  { nom: 'moment', motif: '/moment' },
  { nom: 'moment-difficile', motif: '/moment-difficile' },
  { nom: 'mon-plan', motif: '/mon-plan' },
  { nom: 'apres-coup-liste', motif: '/apres-coup' },
  { nom: 'apres-coup', motif: `/apres-coup/${ID}`, params: ['id'] },
  { nom: 'episode', motif: `/episode/${ID}`, params: ['id'] },
  { nom: 'symptome', motif: `/symptome/${ID}`, params: ['id'] },
  { nom: 'historique', motif: '/historique' },
  // Un jour ouvert depuis l'Historique (v6.1) : même écran que /jour, avec « Retour » vers l'Historique.
  { nom: 'historique-jour', motif: `/historique/jour/${DATE}`, params: ['date'] },
  { nom: 'soins', motif: '/soins' },
  { nom: 'rdv', motif: `/rdv/${ID}`, params: ['id'] },
  { nom: 'consultation', motif: `/consultation/${ID}`, params: ['id'] },
  { nom: 'traitement', motif: `/traitement/${ID}`, params: ['id'] },
  { nom: 'reglages', motif: '/reglages' },
  { nom: 'reglages-sauvegarde', motif: '/reglages/sauvegarde' },
  { nom: 'reglages-effacer', motif: '/reglages/effacer' },
  { nom: 'reglages-rappel', motif: '/reglages/rappel' },
  { nom: 'reglages-journee', motif: '/reglages/journee' },
  { nom: 'reglages-moment-difficile', motif: '/reglages/moment-difficile' },
  { nom: 'reglages-ressourcer', motif: '/reglages/ressourcer' },
  // Le sens des mots de la roue (v8, spec §4) : les définitions de la carte de l'Émotion du moment.
  { nom: 'reglages-emotions', motif: '/reglages/emotions' },
  { nom: 'reglages-aide-iphone', motif: '/reglages/aide-iphone' },
  { nom: 'listes-index', motif: '/reglages/listes' },
  { nom: 'listes', motif: `/reglages/listes/${ID}`, params: ['liste'] },
  { nom: 'diagnostic', motif: '/diagnostic' },
  { nom: 'analyse', motif: '/analyse' },
  { nom: 'comprendre', motif: `/comprendre/(${ONGLETS_COMPRENDRE.join('|')})`, params: ['onglet'] },
  { nom: 'export-psy', motif: '/export-psy' },
  { nom: 'soignants', motif: '/soignants' },
  // Bien-être (v7, spec §6) : l'onglet. v8 : la cohérence cardiaque de l'onglet dans le lecteur, le Programme (spec §6),
  // et une séance du Programme dans le lecteur (domain/programme.js) ; les exercices ne se font plus que là.
  { nom: 'bien-etre', motif: '/bien-etre' },
  { nom: 'coherence', motif: '/bien-etre/coherence' },
  { nom: 'programme', motif: '/bien-etre/programme' },
  { nom: 'seance-programme', motif: `/bien-etre/programme/${ID}`, params: ['id'] },
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

// Onglet actif pour une route donnée. Export PSY et Vue soignants s'ouvrent depuis Soins. v7 : l'Historique sort de la
// barre et s'ouvre par sa porte en haut de l'Analyse ; lui et un jour ouvert depuis lui allument l'onglet Analyse.
export function ongletDe(nom) {
  if (['aujourdhui', 'jour', 'moment', 'moment-difficile', 'apres-coup-liste', 'apres-coup', 'episode', 'symptome'].includes(nom)) return 'aujourdhui';
  if (['analyse', 'comprendre', 'historique', 'historique-jour'].includes(nom)) return 'analyse';
  if (['bien-etre', 'coherence', 'programme', 'seance-programme'].includes(nom)) return 'bien-etre';
  if (['soins', 'rdv', 'consultation', 'traitement', 'export-psy', 'soignants'].includes(nom)) return 'soins';
  return 'reglages';
}
