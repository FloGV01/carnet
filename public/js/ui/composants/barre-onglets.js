import { html } from '../lib.js';
import { Icones } from '../icones.js';

export const ONGLETS_V1 = [
  { id: 'aujourdhui', libelle: "Aujourd'hui", hash: '#/aujourdhui' },
  { id: 'historique', libelle: 'Historique', hash: '#/historique' },
  { id: 'soins', libelle: 'Soins', hash: '#/soins' },
  { id: 'reglages', libelle: 'Réglages', hash: '#/reglages' },
];

export function BarreOnglets({ actif, onglets = ONGLETS_V1 }) {
  return html`<nav class="onglets" aria-label="Navigation principale">
    ${onglets.map((o) => html`<a class="onglet" href=${o.hash} aria-current=${o.id === actif ? 'page' : null}>
      ${Icones[o.id]()}<span>${o.libelle}</span></a>`)}
  </nav>`;
}
