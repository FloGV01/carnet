import { html } from '../lib.js';
import { basculerMultiple } from '../../domain/champs.js';
import { coche, libelleChoix } from './coche.js';

// Choix multiple en pastilles ; les éléments « exclusifs » (Aucun) retirent les autres.
// `classe` : « souples » par défaut (largeur naturelle) ; « colonnes-2 grille-choix » (v6.1) pose une
// grille régulière sur deux colonnes, coche devant le choix, comme les étapes d'un épisode. v12 : un choix fait est en
// accent, sans couleur de rubrique ; une prop `teinte` reçue est ignorée.
export function PastillesMultiples({ etiquette, options, valeurs, exclusifs = new Set(), surChoix, classe = 'souples' }) {
  const actuels = valeurs || [];
  return html`<div class=${`pastilles ${classe}`} role="group" aria-label=${etiquette}>
    ${options.map((o) => {
      const choisi = actuels.includes(o.valeur);
      return html`<button type="button" class="pastille" aria-pressed=${choisi ? 'true' : 'false'}
        onClick=${() => surChoix(basculerMultiple(actuels, o.valeur, exclusifs))}>${coche()}${libelleChoix(o.libelle)}</button>`;
    })}
  </div>`;
}
