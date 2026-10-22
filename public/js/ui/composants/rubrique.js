import { html } from '../lib.js';
import { Icones } from '../icones.js';

// Carré d'icône d'une liste groupée 2b, comme les réglages de l'iPhone (Réglages, Le soir) : 28 px, rayon 7, neutre
// (--surface-2) ou à la couleur de sa teinte (rubrique, parcours), l'icône dessus. Un repère, jamais une valeur.
export const CarreIcone = ({ icone, teinte }) => html`<span class=${`carre-ligne${teinte ? ` teinte-${teinte}` : ''}`} aria-hidden="true">${Icones[icone]({ trait: 2 })}</span>`;

// Tête d'une carte de rubrique (2b, Aujourd'hui) : un carré de 28 à la couleur de la rubrique, l'icône dessus, puis le
// titre ; `sous` (« nuit dernière ») le suit sur la même ligne, en discret. La carte porte la teinte (.teinte-*).
export function TeteRubrique({ icone, libelle, sous }) {
  return html`<span class="tete-rubrique">
    <span class="carre-rubrique" aria-hidden="true">${Icones[icone]({ trait: 2 })}</span>
    <span class="titre-rubrique">${libelle}</span>${sous && html`<span class="rubrique-sous">${sous}</span>`}
  </span>`;
}

// Libellé de champ d'une fiche : petite icône au trait, puis le texte (ni gris, ni majuscules).
export const LibelleChamp = ({ icone, pour, children }) => (pour
  ? html`<label class="libelle-champ" for=${pour}>${Icones[icone]()}${children}</label>`
  : html`<span class="libelle-champ">${Icones[icone]()}${children}</span>`);
