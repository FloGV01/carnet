import { html } from '../lib.js';

export function BandeauMaj({ surRecharger }) {
  return html`<div class="bandeau" role="status">
    <span>Nouvelle version prête</span>
    <button type="button" onClick=${surRecharger}>Recharger</button>
  </div>`;
}
