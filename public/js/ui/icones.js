// Icônes au trait, une seule famille (viewBox 24, trait de 2, extrémités et jonctions arrondies, currentColor).
// Les 39 icônes du lot 2b (docs/design/retour-claude-design-v2/design_handoff_carnet_refonte/icons), sans leur
// bloc <metadata>, chacune en un seul tracé (cercles et rectangles arrondis récrits en arcs). Le nom du fichier
// est entre parenthèses quand la clé, plus ancienne, en diffère. Sont pleins : « arrêt » (état actif d'un enregistrement)
// et, depuis la v12, les 5 icônes de l'onglet actif (plus bas).
import { html } from './lib.js';

const svg = (d, { trait = 2, etiquette } = {}) => html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
  stroke-width=${trait} stroke-linecap="round" stroke-linejoin="round"
  aria-hidden=${etiquette ? null : 'true'} role=${etiquette ? 'img' : null} aria-label=${etiquette || null}><path d=${d} /></svg>`;

const C = {
  // Onglets (onglet-aujourdhui, onglet-analyse, onglet-historique, onglet-soins, onglet-reglages), et Bien-être (v7)
  aujourdhui: 'M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20',
  analyse: 'M3 3v16a2 2 0 0 0 2 2h16M18 17V9M13 17V5M8 17v-3',
  historique: 'M2.5 12a9.5 9.5 0 1 0 19 0a9.5 9.5 0 1 0-19 0 M12 6.5V12l3.5 2',
  soins: 'M5.5 4.5h13A2.5 2.5 0 0 1 21 7v12a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 19V7a2.5 2.5 0 0 1 2.5-2.5Z M16 2.5v4M8 2.5v4M3 10h18',
  reglages: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1.5 14h5M9.5 8h5M17.5 16h5',
  // Bien-être : une feuille, sa nervure et sa tige.
  bienEtre: 'M5 19C5 11 11 5 19 5c0 8-6 14-14 14Z M3 21L13 11',
  // Rubriques (positifs : points-positifs) et replis
  lieu: 'M19.5 10c0 5.5-7.5 11.5-7.5 11.5S4.5 15.5 4.5 10a7.5 7.5 0 0 1 15 0Z M9.2 10a2.8 2.8 0 1 0 5.6 0a2.8 2.8 0 1 0-5.6 0',
  sommeil: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z',
  contact: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M5 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  sport: 'M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0ZM20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0ZM16 17h4M4 13h4',
  traitement: 'M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7ZM8.5 8.5l7 7',
  positifs: 'M7 20h10M10 20c5.5-2.5.8-6.4 3-10M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8ZM14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2Z',
  explosions: 'M6 12h12',
  energie: 'M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4',
  peseRecharge: 'M16 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1ZM2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1ZM7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2',
  // notes-libres
  note: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z',
  replierSoiree: 'M7 4l5 5 5-5M7 20l5-5 5 5',
  // Lieux (non utilisés dans les grilles : les libellés suffisent)
  lieuBureau: 'M6 2.5h12a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2Z M9.5 21.5v-4h5v4M8.5 6.5h1M14.5 6.5h1M8.5 10.5h1M14.5 10.5h1M8.5 14.5h1M14.5 14.5h1',
  lieuTeletravail: 'M3 10.5L12 3l9 7.5M5.5 9v12h13V9M10 21v-6h4v6',
  lieuCongeRepos: 'M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4',
  lieuArret: 'M2.5 5v15M2.5 9.5h16a3 3 0 0 1 3 3V20M2.5 16.5h19M7 9.5v7',
  lieuClinique: 'M9.5 3.5h5v6h6v5h-6v6h-5v-6h-6v-5h6Z',
  lieuAutre: 'M4.5 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0 M11 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0 M17.5 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0',
  // Parcours (respiration : moment-difficile) et l'émotion du moment (v7) : trois bulles, comme la grappe de l'écran.
  humeur: 'M2 9.5c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3M2 17.5c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3',
  emotion: 'M4 14a5 5 0 1 0 10 0a5 5 0 1 0-10 0 M15 6a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M17 16.5a2 2 0 1 0 4 0a2 2 0 1 0-4 0',
  respiration: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0 M7.5 12a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0-9 0',
  ceQueJeFaisais: 'M9 2.5h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z M16 4.5h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2h2',
  monPlan: 'M3 6.5l6-3 6 3 6-3v14l-6 3-6-3-6 3ZM9 3.5v14M15 6.5v14',
  rythmes: 'M17 2l4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3',
  // Soins (bulle : en-consultation)
  bulle: 'M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-5A8 8 0 1 1 21 12Z',
  questions: 'M2.5 12a9.5 9.5 0 1 0 19 0a9.5 9.5 0 1 0-19 0 M9.2 9.2a3 3 0 0 1 5.6 1.3c0 2-3 2.5-3 4M12 17.5h.01',
  enParlerAuRdv: 'M5.5 4.5h13A2.5 2.5 0 0 1 21 7v12a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 19V7a2.5 2.5 0 0 1 2.5-2.5Z M16 2.5v4M8 2.5v4M3 10h18M12 13.5v5M9.5 16h5',
  aideIphone: 'M9 2.5h6a2.5 2.5 0 0 1 2.5 2.5v14a2.5 2.5 0 0 1-2.5 2.5H9A2.5 2.5 0 0 1 6.5 19V5A2.5 2.5 0 0 1 9 2.5Z M11 18.5h2',
  // Navigation (chevron : chevron-droite, retour : chevron-gauche)
  chevron: 'M9 18l6-6-6-6',
  retour: 'M15 18l-6-6 6-6',
  chevronBas: 'M6 9l6 6 6-6',
  fermer: 'M18 6L6 18M6 6l12 12',
  plus: 'M12 5v14M5 12h14',
  coche: 'M20 6L9 17l-5-5',
  // Voix et mémos (onde : memo-vocal, micro : dicter)
  onde: 'M3 10v4M7 7v10M11 4v16M15 8v8M19 10.5v3',
  micro: 'M12 2.5a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0v-6a3 3 0 0 1 3-3Z M18.5 10.5v.5a6.5 6.5 0 0 1-13 0v-.5M12 17.5v4',
  lecture: 'M8 5.5v13l10-6.5z',
  pause: 'M8 5v14 M16 5v14',
  // Hors du lot, dans la même famille
  personne: 'M8.5 8a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0 M5 20a7 7 0 0 1 14 0',
  effets: 'M12 3.5v4 M12 16.5v4 M3.5 12h4 M16.5 12h4 M6 6l2.8 2.8 M15.2 15.2L18 18 M6 18l2.8-2.8 M15.2 8.8L18 6',
  loupe: 'M4.5 11a6.5 6.5 0 1 0 13 0a6.5 6.5 0 1 0-13 0 M20 20l-4.3-4.3',
  copier: 'M8.5 8.5h11v11h-11z M5 15.5V4.5h11',
  partager: 'M12 15V3.5 M8 7.5l4-4 4 4 M6 11H5v9.5h14V11h-1',
  exporter: 'M12 3.5v12 M8 11.5l4 4 4-4 M5 20.5h14',
  importer: 'M12 15.5v-12 M8 7.5l4-4 4 4 M5 20.5h14',
  listes: 'M8.5 6h11 M8.5 12h11 M8.5 18h11 M4.5 6h.01 M4.5 12h.01 M4.5 18h.01',
  rappel: 'M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z M10 20.5a2 2 0 0 0 4 0',
  monter: 'M12 19V5 M6 11l6-6 6 6',
  descendre: 'M12 5v14 M6 13l6 6 6-6',
  etape: 'M5 12h12 M13 8l4 4-4 4',
  // Guide
  points: 'M5 12h.01 M12 12h.01 M19 12h.01',
  bascule: 'M8 7h8a5 5 0 0 1 0 10H8A5 5 0 0 1 8 7z M13.5 12a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0',
  ajouter: 'M5 5h14v14H5z M12 9v6 M9 12h6',
  // Bien-être (v10) : l'épingle d'un favori.
  epingle: 'M8.5 3h7 M9.5 3v6.5L6 14v2.5h12V14l-3.5-4.5V3 M12 16.5V21.5',
  // Mes refuges (v11) : la sortie d'un lien qui quitte l'app (pas le caractère flèche, compté comme emoji), et deux notes de
  // musique, pour l'entrée de Bien-être et les lignes des playlists.
  sortie: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  musique: 'M9 18V5l11-2v13 M3 18a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M14 16a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
};

// Les icônes pleines de l'onglet actif (v12, spec §5.4), comme les SF Symbols « .fill » : la forme change avec la couleur,
// la couleur ne dit pas seule quel onglet est ouvert. Elles reviennent sur la décision B1 (« seul arrêt est rempli »), pour
// la barre d'onglets seulement. Chaque partie est au trait (`trait`), pleine et cerclée du trait (`plein`), ou pleine sans
// trait (`aplat`). Une découpe (la nervure de la feuille, le filet du calendrier) est un trou (fill-rule evenodd) : elle
// laisse voir la barre, sans couleur écrite. Dessinées d'après la maquette (.superpowers/v12/maquettes/build.mjs, PLEIN).
const P = {
  // Le livre : la couverture pleine, la tranche au trait.
  aujourdhuiPlein: [['plein', 'M6.5 2H20v15H6.5A2.5 2.5 0 0 0 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z'], ['trait', 'M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5']],
  // Les axes au trait, trois barres pleines.
  analysePlein: [['trait', 'M3 3v16a2 2 0 0 0 2 2h16'], ['aplat', 'M7.4 12.6h1.2a1 1 0 0 1 1 1v3.4a1 1 0 0 1-1 1H7.4a1 1 0 0 1-1-1v-3.4a1 1 0 0 1 1-1Z M12.4 3.6h1.2a1 1 0 0 1 1 1v12.4a1 1 0 0 1-1 1h-1.2a1 1 0 0 1-1-1V4.6a1 1 0 0 1 1-1Z M17.4 7.6h1.2a1 1 0 0 1 1 1v8.4a1 1 0 0 1-1 1h-1.2a1 1 0 0 1-1-1V8.6a1 1 0 0 1 1-1Z']],
  // La feuille pleine, la nervure en creux (le trait, autour du trou, l'arrondit), la tige au trait.
  bienEtrePlein: [['plein', 'M5 19C5 11 11 5 19 5c0 8-6 14-14 14Z M5.87 15.8L13.2 8.47L15.53 10.8L8.2 18.13Z'], ['trait', 'M3 21l2.2-2.2']],
  // Le calendrier plein (le trait de l'icône compris), son filet en creux, les anneaux au trait.
  soinsPlein: [['aplat', 'M5.5 3.55h13a3.45 3.45 0 0 1 3.45 3.45v12a3.45 3.45 0 0 1-3.45 3.45h-13A3.45 3.45 0 0 1 2.05 19V7A3.45 3.45 0 0 1 5.5 3.55Z M4 9.2h16a.8.8 0 0 1 0 1.6H4a.8.8 0 0 1 0-1.6Z'], ['trait', 'M16 2.5v3M8 2.5v3']],
  // Les curseurs : les rails au trait, les boutons pleins.
  reglagesPlein: [['plein', 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1.4 12a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0-5.2 0M9.4 10a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0-5.2 0M17.4 14a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0-5.2 0']],
};
const svgPlein = (parties, { trait = 2 } = {}) => html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
  stroke-width=${trait} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${parties.map(([mode, d]) => html`<path d=${d}
  fill=${mode === 'trait' ? null : 'currentColor'} fill-rule=${mode === 'trait' ? null : 'evenodd'} stroke=${mode === 'aplat' ? 'none' : null} />`)}</svg>`;

export const Icones = Object.fromEntries([
  ...Object.entries(C).map(([nom, d]) => [nom, (options) => svg(d, options)]),
  ...Object.entries(P).map(([nom, parties]) => [nom, (options) => svgPlein(parties, options)]),
]);

// Arrêt : pleine, sans trait.
Icones.stop = () => html`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" /></svg>`;
