// La carte du bas de l'émotion (v9, spec §4.2 ; visuel-hwf.md §2.8), comme How We Feel : une capsule sombre au-dessus du
// bas de l'écran, le mot choisi à la couleur de sa bulle (éclaircie pour rester lisible, ui/carte-geometrie.js), sa
// définition dessous (la correction de l'utilisateur, sinon le texte de Carnet ou celui du mot à soi), et un rond blanc
// avec une flèche, « Continuer ». Elle grandit avec le texte, sans jamais couper la définition (point de vigilance 2).
// Sa zone est toujours là, vide sans mot : VoiceOver annonce le mot qui y paraît (aria-live).
import { html } from '../lib.js';
import { couleurLisible } from '../carte-geometrie.js';

// La flèche de How We Feel : 29,5 × 28, trait de 2,7, bouts arrondis (aussi celle de l'écran du mot à soi).
export const FLECHE = html`<svg width="30" height="28" viewBox="0 0 30 28" fill="none" stroke="currentColor" stroke-width="2.7"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 14h23M16 4l10 10-10 10" /></svg>`;

// `mot` : { libelle, couleur } ou null ; `definition` : un texte ou null.
export function CarteDuBas({ mot, definition, surContinuer, enGarde = false }) {
  return html`<div class="carte-du-bas-zone" aria-live="polite">
    ${mot && html`<div class="carte-du-bas" style=${{ '--c': couleurLisible(mot.couleur) }}>
      <div class="texte-carte-du-bas">
        <p class="mot-carte-du-bas">${mot.libelle}</p>
        ${definition && html`<p class="definition-carte-du-bas">${definition}</p>`}
      </div>
      <button type="button" class="continuer" aria-label="Continuer" aria-disabled=${enGarde ? 'true' : null}
        onClick=${() => { if (!enGarde) surContinuer(); }}>${FLECHE}</button>
    </div>`}
  </div>`;
}
