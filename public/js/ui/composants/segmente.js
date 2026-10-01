import { html } from '../lib.js';

// Choix compact sur une ligne (Mal · Moyen · Bien, Oui · Non…). Même règle : second toucher = effacer.
export function Segmente({ etiquette, options, valeur, surChoix }) {
  return html`<div class="segmente" role="group" aria-label=${etiquette}>
    ${options.map((o) => {
      const choisi = valeur === o.valeur;
      return html`<button type="button" aria-pressed=${choisi ? 'true' : 'false'} aria-label=${`${etiquette} : ${o.libelle}`}
        onClick=${() => surChoix(choisi ? null : o.valeur)}>${o.libelle}</button>`;
    })}
  </div>`;
}

const OUI_NON = [{ valeur: true, libelle: 'Oui' }, { valeur: false, libelle: 'Non' }];
// Trois états : vide, Oui, Non.
export function OuiNon({ etiquette, valeur, surChoix }) {
  return html`<${Segmente} etiquette=${etiquette} options=${OUI_NON} valeur=${valeur} surChoix=${surChoix} />`;
}
