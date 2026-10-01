import { html } from '../lib.js';

// Heure facultative avec un bouton ✕ propre à l'app pour l'effacer.
export function ChampHeure({ id, etiquette, valeur, surChoix }) {
  return html`<div class="champ-heure">
    <label class="etiquette" for=${id}>${etiquette}</label>
    <div class="ligne-heure">
      <input id=${id} type="time" class="champ-ligne" value=${valeur || ''}
        onChange=${(e) => surChoix(e.target.value || null)} />
      ${valeur && html`<button type="button" class="effacer" aria-label=${`Effacer ${etiquette}`} onClick=${() => surChoix(null)}>✕</button>`}
    </div>
  </div>`;
}
