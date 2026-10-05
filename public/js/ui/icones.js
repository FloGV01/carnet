// Icônes au trait, une seule famille (viewBox 24, extrémités et jonctions arrondies), reprises
// du design Claude Design. Seul « arrêt » est rempli (état actif d'un enregistrement).
import { html } from './lib.js';

const svg = (d, { trait = 1.75, etiquette } = {}) => html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
  stroke-width=${trait} stroke-linecap="round" stroke-linejoin="round"
  aria-hidden=${etiquette ? null : 'true'} role=${etiquette ? 'img' : null} aria-label=${etiquette || null}><path d=${d} /></svg>`;

const C = {
  // Onglets
  aujourdhui: 'M6 3.5h11a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H6z M9.5 3.5v17 M12.5 8h3 M12.5 12h3',
  analyse: 'M4 20h16 M7 16.5v-5 M12 16.5V7 M17 16.5v-8',
  historique: 'M12 7.5v4.5l3 2 M3.5 12a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0-17 0',
  soins: 'M4 6.5h16v13.5H4z M4 10.5h16 M8.5 3.5v4 M15.5 3.5v4',
  reglages: 'M4 7h9 M17 7h3 M4 17h3 M11 17h9 M13 4.5v5 M7 14.5v5',
  // Rubriques
  lieu: 'M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 0 1 13 0c0 5.3-6.5 11-6.5 11z M9.5 10a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0',
  sommeil: 'M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10z',
  humeur: 'M3.5 12a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0-17 0 M8 12h8',
  contact: 'M6 8a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M3 19.5a6 6 0 0 1 12 0 M15.5 5.3a3 3 0 0 1 0 5.4 M17.5 14a5.5 5.5 0 0 1 3.5 5.5',
  sport: 'M5 12a7 7 0 0 1 12-4.9 M17.5 3.5v4h-4 M19 12a7 7 0 0 1-12 4.9 M6.5 20.5v-4h4',
  explosions: 'M3 17l4-5 3 3 4-8 3 6 4-3',
  traitement: 'M9 20.5a4.5 4.5 0 0 1-6-6.4l8.6-8.6a4.5 4.5 0 0 1 6.4 6.4z M7.3 9.8l6.4 6.4',
  positifs: 'M12 20.5v-9 M12 11.5c0-4 2.8-6.5 7-6.5 0 4-2.8 6.5-7 6.5z M12 14c0-3-2.4-5-5.5-5 0 3 2.4 5 5.5 5z',
  note: 'M5 4.5h14v15H5z M8.5 9h7 M8.5 13h7 M8.5 17h4',
  personne: 'M8.5 8a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0 M5 20a7 7 0 0 1 14 0',
  effets: 'M12 3.5v4 M12 16.5v4 M3.5 12h4 M16.5 12h4 M6 6l2.8 2.8 M15.2 15.2L18 18 M6 18l2.8-2.8 M15.2 8.8L18 6',
  // Navigation
  chevron: 'M9 5l7 7-7 7',
  retour: 'M15 5l-7 7 7 7',
  chevronBas: 'M6 9l6 6 6-6',
  fermer: 'M6 6l12 12 M18 6L6 18',
  plus: 'M12 5v14 M5 12h14',
  coche: 'M5 12.5l4.5 4.5L19 7',
  // Voix et mémos
  onde: 'M3 12h1.5 M7 9v6 M10.5 5.5v13 M14 8.5v7 M17.5 10.5v3 M20.5 12h.5',
  micro: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z M5.5 11a6.5 6.5 0 0 0 13 0 M12 17.5V21',
  lecture: 'M8 5.5v13l10-6.5z',
  pause: 'M8 5v14 M16 5v14',
  // Actions
  loupe: 'M4.5 11a6.5 6.5 0 1 0 13 0a6.5 6.5 0 1 0-13 0 M20 20l-4.3-4.3',
  copier: 'M8.5 8.5h11v11h-11z M5 15.5V4.5h11',
  partager: 'M12 15V3.5 M8 7.5l4-4 4 4 M6 11H5v9.5h14V11h-1',
  exporter: 'M12 3.5v12 M8 11.5l4 4 4-4 M5 20.5h14',
  importer: 'M12 15.5v-12 M8 7.5l4-4 4 4 M5 20.5h14',
  listes: 'M8.5 6h11 M8.5 12h11 M8.5 18h11 M4.5 6h.01 M4.5 12h.01 M4.5 18h.01',
  rappel: 'M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z M10 20.5a2 2 0 0 0 4 0',
  monter: 'M12 19V5 M6 11l6-6 6 6',
  descendre: 'M12 5v14 M6 13l6 6 6-6',
  pasAPas: 'M4 7.5h12v12H4z M8 4.5h12v12',
  bulle: 'M4.5 5.5h15v10h-8l-4 3.5v-3.5h-3z',
  etape: 'M5 12h12 M13 8l4 4-4 4',
  // Guide
  points: 'M5 12h.01 M12 12h.01 M19 12h.01',
  bascule: 'M8 7h8a5 5 0 0 1 0 10H8A5 5 0 0 1 8 7z M13.5 12a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0',
  ajouter: 'M5 5h14v14H5z M12 9v6 M9 12h6',
};

export const Icones = Object.fromEntries(Object.entries(C).map(([nom, d]) => [nom, (options) => svg(d, options)]));

// Arrêt : seule icône pleine.
Icones.stop = () => html`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" /></svg>`;
