import { html } from '../lib.js';
import { Entete } from '../composants/entete.js';

// Écran provisoire des jalons à venir.
export function EcranAttente({ titre }) {
  return html`<main class="ecran">
    <${Entete} titre=${titre} />
    <p class="discret">Cet écran arrive dans une prochaine version.</p>
  </main>`;
}
