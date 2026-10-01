import { html } from '../lib.js';

export function Entete({ titre, retour, droite }) {
  return html`<header class="entete">
    ${retour ? html`<button type="button" class="retour" onClick=${retour}>‹ Retour</button>` : html`<span></span>`}
    <h1>${titre}</h1>
    ${droite || html`<span></span>`}
  </header>`;
}
