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

// Libellé de champ d'une fiche : petite icône au trait, puis le texte (ni gris, ni majuscules).
export const LibelleChamp = ({ icone, pour, children }) => (pour
  ? html`<label class="libelle-champ" for=${pour}>${Icones[icone]()}${children}</label>`
  : html`<span class="libelle-champ">${Icones[icone]()}${children}</span>`);
