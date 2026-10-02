import { html } from '../lib.js';
import { Icones } from '../icones.js';

// Heure facultative avec un bouton ✕ propre à l'app pour l'effacer.
export function ChampHeure({ id, etiquette, sous, valeur, surChoix }) {
  return html`<div class="champ-heure">
    <label class="etiquette" for=${id}>${etiquette}${sous && html` <span class="facultatif">${sous}</span>`}</label>
    <div class="ligne-heure">
      <input id=${id} type="time" class="champ-ligne" value=${valeur || ''}
        onChange=${(e) => surChoix(e.target.value || null)} />
      ${valeur && html`<button type="button" class="effacer" aria-label=${`Effacer ${etiquette}`} onClick=${() => surChoix(null)}>${Icones.fermer()}</button>`}
    </div>
  </div>`;
}
