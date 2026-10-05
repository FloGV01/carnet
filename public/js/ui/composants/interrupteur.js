import { html } from '../lib.js';

// Interrupteur à la manière d'iOS (role=switch) : le bouton glisse, la piste se remplit.
export function Interrupteur({ etiquette, actif, surChanger }) {
  return html`<button type="button" class="interrupteur" role="switch" aria-checked=${actif ? 'true' : 'false'} aria-label=${etiquette}
    onClick=${() => surChanger(!actif)}><span class="interrupteur-bouton" aria-hidden="true"></span></button>`;
}
