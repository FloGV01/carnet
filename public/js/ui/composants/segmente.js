import { html } from '../lib.js';
import { Icones } from '../icones.js';

// Choix sur une ligne (Mal · Moyen · Bien, Oui · Non…), en boutons séparés.
// Même règle : second toucher = effacer, sauf pour un choix de vue (`sansVide`).
// Choisi : fond plein, graisse 600 et coche ; sans teinte, couleur action (segments, période).
export function Segmente({ etiquette, options, valeur, surChoix, teinte, classe = '', sansVide = false }) {
  return html`<div class=${`segmente ${classe}${teinte ? ` teinte-${teinte}` : ''}`} role="group" aria-label=${etiquette}>
    ${options.map((o) => {
      const choisi = valeur === o.valeur;
      return html`<button type="button" aria-pressed=${choisi ? 'true' : 'false'} aria-label=${`${etiquette} : ${o.libelle}`}
        onClick=${() => surChoix(choisi && !sansVide ? null : o.valeur)}><span class="coche" aria-hidden="true">${Icones.coche({ trait: 3 })}</span>${o.libelle}</button>`;
    })}
  </div>`;
}

const OUI_NON = [{ valeur: true, libelle: 'Oui' }, { valeur: false, libelle: 'Non' }];
// Trois états : vide, Oui, Non.
export function OuiNon({ etiquette, valeur, surChoix, teinte }) {
  return html`<${Segmente} etiquette=${etiquette} options=${OUI_NON} valeur=${valeur} surChoix=${surChoix} teinte=${teinte} />`;
}
