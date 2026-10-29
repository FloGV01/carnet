// Les quatre bulles de l'écran 1 de l'émotion (v9, spec §4.1 ; visuel-hwf.md §1.4 à §1.8), comme How We Feel : une par
// zone, rouge (énergie haute, désagréable), jaune (haute, agréable), bleu (basse, désagréable), vert (basse, agréable),
// en grille 2 × 2. Chacune : un disque de face en dégradé vertical, sur trois halos de sa couleur médiane qui tournent
// lentement (figés, à leurs décalages mesurés, avec « Réduire les animations »). Couleurs, halos et tailles : ecrans.css.
// Toucher une bulle n'écrit rien : `surZone(zone)` ouvre la carte. Pendant la garde (`enGarde`, 350 ms après un
// changement de vue), les bulles ignorent les touchers et sont aria-disabled.
// En petit (`petites`, v9 spec §4.5 : la couleur d'un mot à soi, à sa création et dans Réglages › Émotions), sans halo :
// chaque bulle est un choix, `choisie` est pressée (aria-pressed), et `surZone(zone)` la choisit.
// Avec leurs comptes (`comptes`, v9 spec §8 et §13.2 : Tes zones, dans l'Analyse), en petit et sans halo : une liste, pas
// un choix ; chaque bulle dit son nombre de relevés sous son libellé (« 9 relevés »), jamais une part.
import { html, useEffect, useRef } from '../lib.js';
import { ZONES } from '../../domain/carte-roue.js';
import { ajusterEtiquettes } from '../mesures.js';

// Les deux lignes du libellé de chaque bulle (spec §4.1).
export const LIGNES_ZONES = Object.freeze({
  rouge: ['Énergie haute', 'Désagréable'], jaune: ['Énergie haute', 'Agréable'],
  bleu: ['Énergie basse', 'Désagréable'], vert: ['Énergie basse', 'Agréable'],
});
// Son nom pour VoiceOver : « Énergie haute, désagréable ».
export const nomBulle = (zone) => `${LIGNES_ZONES[zone][0]}, ${LIGNES_ZONES[zone][1].toLowerCase()}`;

// Le plus petit corps d'un libellé en très grand texte (point de vigilance 2 ; 9 en petit), et la marge gardée au bord
// du disque.
const PLANCHER_PX = 12;
const PLANCHER_PETIT_PX = 9;
const MARGE_PX = 6;
// Le disque de la face d'une bulle, en px de l'écran.
const disque = (e) => {
  const r = e.closest('.face').getBoundingClientRect();
  return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, r: r.width / 2 - MARGE_PX };
};
const halos = () => html`<span class="halo" aria-hidden="true"></span><span class="halo" aria-hidden="true"></span><span class="halo" aria-hidden="true"></span>`;

// « 9 relevés », « 1 relevé », « 0 relevé ».
const releves = (n) => `${n} relevé${n > 1 ? 's' : ''}`;

export function QuatreBulles({ surZone, enGarde = false, etiquette, petites = false, choisie = null, comptes = null }) {
  const groupe = useRef(null);
  // Le texte des bulles comptées change avec la période : les libellés se réajustent alors.
  const texteComptes = comptes ? ZONES.map((z) => comptes[z] || 0).join() : '';
  // Les libellés tiennent dans la largeur utile du disque (visuel §1.7, ecrans.css) et dans le disque, même en très grand
  // texte ; tous au même corps.
  useEffect(() => {
    let actif = true;
    const ajuster = () => {
      if (actif && groupe.current) ajusterEtiquettes(groupe.current.querySelectorAll('.etiquette-bulle'), petites || comptes ? PLANCHER_PETIT_PX : PLANCHER_PX, disque, { uniforme: true });
    };
    ajuster();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajuster);
    return () => { actif = false; };
  }, [texteComptes]);
  if (comptes) {
    return html`<ul class="quatre-bulles comptes" ref=${groupe} aria-label=${etiquette}>
      ${ZONES.map((z) => html`<li key=${z} class=${`bulle-zone bulle-${z}`}>
        <span class="face"><span class="etiquette-bulle">${LIGNES_ZONES[z].map((l) => html`<span class="ligne-bulle">${l}</span>`)}
          <span class="ligne-bulle compte-bulle">${releves(comptes[z] || 0)}</span></span></span>
      </li>`)}
    </ul>`;
  }
  return html`<div class=${petites ? 'quatre-bulles petites' : 'quatre-bulles'} ref=${groupe} role="group" aria-label=${etiquette} aria-disabled=${enGarde ? 'true' : null}>
    ${ZONES.map((z) => html`<button type="button" key=${z} class=${`bulle-zone bulle-${z}`} aria-label=${nomBulle(z)}
      aria-pressed=${petites ? (z === choisie ? 'true' : 'false') : null} onClick=${() => { if (!enGarde) surZone(z); }}>
      ${!petites && halos()}
      <span class="face" aria-hidden="true"><span class="etiquette-bulle">${LIGNES_ZONES[z].map((l) => html`<span class="ligne-bulle">${l}</span>`)}</span></span>
    </button>`)}
  </div>`;
}
