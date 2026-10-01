import { html } from '../lib.js';
import { decouperLibelle } from '../../domain/libelles.js';

// Grille de choix : un toucher choisit, un second toucher sur le choix sélectionné l'efface.
// L'écriture part au click (jamais au touchstart) pour qu'un défilement ne sélectionne rien.
export function Pastilles({ etiquette, options, valeur, surChoix, colonnes = 3, classe = '', ariaPrefixe }) {
  return html`<div class=${`pastilles colonnes-${colonnes} ${classe}`} role="group" aria-label=${etiquette}>
    ${options.map((o) => {
      const choisi = valeur === o.valeur;
      const { principal, precision } = decouperLibelle(o.libelle);
      return html`<button type="button" class="pastille" aria-pressed=${choisi ? 'true' : 'false'}
        aria-label=${ariaPrefixe ? `${ariaPrefixe} ${o.libelle}` : null}
        onClick=${() => surChoix(choisi ? null : o.valeur)}>
        <span>${principal}</span>${precision && html`<small>${precision}</small>`}
      </button>`;
    })}
  </div>`;
}
