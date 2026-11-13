import { html } from '../lib.js';
import { coche, libelleChoix } from './coche.js';

// Choix sur une ligne (Mal · Moyen · Bien, Oui · Non…), en boutons séparés.
// Même règle : second toucher = effacer, sauf pour un choix de vue (`sansVide`).
// Choisi : un aplat d'accent, graisse 600 et coche (v12 : plus de couleur de rubrique). La
// largeur d'un bouton ne change pas quand on le choisit (coche.js, composants.css).
export function Segmente({ etiquette, options, valeur, surChoix, classe = '', sansVide = false }) {
  return html`<div class=${`segmente ${classe}`} role="group" aria-label=${etiquette}>
    ${options.map((o) => {
      const choisi = valeur === o.valeur;
      return html`<button type="button" aria-pressed=${choisi ? 'true' : 'false'} aria-label=${`${etiquette} : ${o.libelle}`}
        onClick=${() => surChoix(choisi && !sansVide ? null : o.valeur)}>${coche()}${libelleChoix(o.libelle)}</button>`;
    })}
  </div>`;
}

const OUI_NON = [{ valeur: true, libelle: 'Oui' }, { valeur: false, libelle: 'Non' }];
// Trois états : vide, Oui, Non.
export function OuiNon({ etiquette, valeur, surChoix }) {
  return html`<${Segmente} etiquette=${etiquette} options=${OUI_NON} valeur=${valeur} surChoix=${surChoix} />`;
}
