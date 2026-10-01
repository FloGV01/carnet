import { html } from '../lib.js';
import { basculerMultiple } from '../../domain/champs.js';

// Choix multiple en pastilles ; les éléments « exclusifs » (Aucun) retirent les autres.
export function PastillesMultiples({ etiquette, options, valeurs, exclusifs, surChoix, colonnes = 2 }) {
  const actuels = valeurs || [];
  return html`<div class=${`pastilles colonnes-${colonnes} grille-choix`} role="group" aria-label=${etiquette}>
    ${options.map((o) => {
      const choisi = actuels.includes(o.valeur);
      return html`<button type="button" class="pastille" aria-pressed=${choisi ? 'true' : 'false'}
        onClick=${() => surChoix(basculerMultiple(actuels, o.valeur, exclusifs))}><span>${o.libelle}</span></button>`;
    })}
  </div>`;
}
