import { html } from '../lib.js';
import { basculerMultiple } from '../../domain/champs.js';
import { Icones } from '../icones.js';

// Choix multiple en pastilles ; les éléments « exclusifs » (Aucun) retirent les autres.
// `classe` : « souples » par défaut (largeur naturelle) ; « colonnes-2 grille-choix » (v6.1) pose une
// grille régulière sur deux colonnes, coche devant le choix, comme les étapes d'un épisode.
export function PastillesMultiples({ etiquette, options, valeurs, exclusifs = new Set(), surChoix, teinte, classe = 'souples' }) {
  const actuels = valeurs || [];
  return html`<div class=${`pastilles ${classe}${teinte ? ` teinte-${teinte}` : ''}`} role="group" aria-label=${etiquette}>
    ${options.map((o) => {
      const choisi = actuels.includes(o.valeur);
      return html`<button type="button" class="pastille" aria-pressed=${choisi ? 'true' : 'false'}
        onClick=${() => surChoix(basculerMultiple(actuels, o.valeur, exclusifs))}><span class="coche" aria-hidden="true">${Icones.coche({ trait: 3 })}</span><span>${o.libelle}</span></button>`;
    })}
  </div>`;
}
