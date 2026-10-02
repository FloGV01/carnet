import { html } from '../lib.js';
import { Icones } from '../icones.js';

export const ONGLETS_V1 = [
  { id: 'aujourdhui', libelle: "Aujourd'hui", hash: '#/aujourdhui', teinte: 'sommeil' },
  { id: 'analyse', libelle: 'Analyse', hash: '#/analyse', teinte: 'humeur' },
  { id: 'historique', libelle: 'Historique', hash: '#/historique', teinte: 'lieu' },
  { id: 'soins', libelle: 'Soins', hash: '#/soins', teinte: 'trt' },
  { id: 'reglages', libelle: 'Réglages', hash: '#/reglages', teinte: 'contact' },
];

export function BarreOnglets({ actif, onglets = ONGLETS_V1 }) {
  return html`<nav class="onglets" aria-label="Navigation principale">
    ${onglets.map((o) => html`<a class=${`onglet teinte-${o.teinte}`} href=${o.hash} aria-current=${o.id === actif ? 'page' : null}>
      <span class="onglet-icone">${Icones[o.id]()}</span><span class="onglet-libelle">${o.libelle}</span></a>`)}
  </nav>`;
}
