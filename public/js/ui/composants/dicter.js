import { html } from '../lib.js';
import { Icones } from '../icones.js';

// « Dicter » : place le curseur dans le champ et ouvre le clavier ; la dictée est celle d'iOS.
// focus() est appelé dans le geste, sans await, sinon iOS n'ouvre pas le clavier.
export function BoutonDicter({ cible, surActive }) {
  const toucher = () => {
    const zone = cible.current;
    if (!zone) return;
    zone.focus();
    try { const n = zone.value.length; zone.setSelectionRange(n, n); } catch { /* champ sans sélection */ }
    if (surActive) surActive();
  };
  return html`<button type="button" class="dicter" aria-label="Dicter" onClick=${toucher}>${Icones.micro()}</button>`;
}
export const AIDE_DICTER = 'Touche le micro du clavier pour parler.';
