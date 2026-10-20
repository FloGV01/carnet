import { html } from '../lib.js';
import { Icones } from '../icones.js';

// Barre d'onglets 2b : neutre (ni couleur de rubrique, ni pastille colorée) ; l'onglet actif est en --text,
// avec sa pilule en --surface-2 (composants.css).
export const ONGLETS_V1 = [
  { id: 'aujourdhui', libelle: "Aujourd'hui", hash: '#/aujourdhui' },
  { id: 'analyse', libelle: 'Analyse', hash: '#/analyse' },
  { id: 'historique', libelle: 'Historique', hash: '#/historique' },
  { id: 'soins', libelle: 'Soins', hash: '#/soins' },
  { id: 'reglages', libelle: 'Réglages', hash: '#/reglages' },
];

export function BarreOnglets({ actif, onglets = ONGLETS_V1 }) {
  return html`<nav class="onglets" aria-label="Navigation principale">
    ${onglets.map((o) => html`<a class="onglet" href=${o.hash} aria-current=${o.id === actif ? 'page' : null}>
      <span class="onglet-icone">${Icones[o.id]()}</span><span class="onglet-libelle">${o.libelle}</span></a>`)}
  </nav>`;
}
