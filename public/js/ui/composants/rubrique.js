import { html } from '../lib.js';
import { Icones } from '../icones.js';

// Libellé de rubrique : petite icône sur sa teinte, puis le libellé (repère visuel, jamais une valeur).
// `dessous` : la précision (« nuit dernière ») passe sur sa propre ligne.
export function Rubrique({ teinte, icone, libelle, sous, dessous = false, id }) {
  return html`<span class=${`rubrique teinte-${teinte}${dessous ? ' rubrique-dessous' : ''}`} id=${id || null}>
    <span class="rubrique-icone">${Icones[icone]({ trait: 2 })}</span>
    <span class="rubrique-libelle">${libelle}</span>${sous && html`<span class="rubrique-sous">${sous}</span>`}
  </span>`;
}

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
