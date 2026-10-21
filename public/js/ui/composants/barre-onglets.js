import { html } from '../lib.js';
import { Icones } from '../icones.js';

// Barre d'onglets 2b : neutre (ni couleur de rubrique, ni pastille colorée) ; l'onglet actif est en --text,
// avec sa pilule en --surface-2 (composants.css). v7 : Aujourd'hui · Analyse · Bien-être · Soins · Réglages ; l'Historique
// rejoint l'Analyse (sa porte). `icone` : la clé de l'icône quand elle diffère de l'id.
export const ONGLETS_V1 = [
  { id: 'aujourdhui', libelle: "Aujourd'hui", hash: '#/aujourdhui' },
  { id: 'analyse', libelle: 'Analyse', hash: '#/analyse' },
  { id: 'bien-etre', icone: 'bienEtre', libelle: 'Bien-être', hash: '#/bien-etre' },
  { id: 'soins', libelle: 'Soins', hash: '#/soins' },
  { id: 'reglages', libelle: 'Réglages', hash: '#/reglages' },
];

export function BarreOnglets({ actif, onglets = ONGLETS_V1 }) {
  return html`<nav class="onglets" aria-label="Navigation principale">
    ${onglets.map((o) => html`<a class="onglet" href=${o.hash} aria-current=${o.id === actif ? 'page' : null}>
      <span class="onglet-icone">${Icones[o.icone || o.id]()}</span><span class="onglet-libelle">${o.libelle}</span></a>`)}
  </nav>`;
}
