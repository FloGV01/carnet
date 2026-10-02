import { html } from '../lib.js';
import { Icones } from '../icones.js';

// En-tête d'écran. Racine d'onglet : grand titre serif. Écran poussé : rangée « Retour »
// (avec, à droite, un élément facultatif comme « Enregistré ») puis titre serif.
export function Entete({ titre, retour, droite }) {
  if (!retour) {
    return html`<header class="entete-onglet">
      <h1 class="titre-onglet">${titre}</h1>
      ${droite}
    </header>`;
  }
  return html`<header class="entete-pousse">
    <div class="barre-retour">
      <button type="button" class="retour" onClick=${retour}>${Icones.retour({ trait: 2 })}Retour</button>
      ${droite || html`<span></span>`}
    </div>
    <h1 class="titre-ecran">${titre}</h1>
  </header>`;
}
