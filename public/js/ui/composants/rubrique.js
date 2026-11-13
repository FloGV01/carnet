import { html } from '../lib.js';
import { Icones } from '../icones.js';

// L'icône d'une rangée de liste groupée (Réglages, Le soir, Bien-être, Mes refuges), dans une place de 28 à gauche du libellé.
// v12 (spec §5.4) : plus de carré coloré, ni de carré du tout. Elle est à l'accent quand la rangée ouvre quelque chose (un lien,
// un bouton), en --text-2 quand elle nomme une rubrique (Réglages › Le soir) : ecrans.css le décide selon la rangée.
export const IconeLigne = ({ icone }) => html`<span class="icone-ligne" aria-hidden="true">${Icones[icone]({ trait: 2 })}</span>`;

// Tête d'une carte de rubrique (v12, spec §5.4 ; Aujourd'hui) : l'icône de 20 en --text-2, sans carré (elle désigne la
// rubrique, elle n'ouvre rien), puis le titre ; `sous` (« nuit dernière ») le suit sur la même ligne, en discret.
// `lien` (v8, Q5) : « Détail › », en accent, au bout de la première ligne du titre ; il ouvre un détail de la carte
// sans lui prendre de hauteur (le titre passe dessous au besoin, sa cible de 44 déborde sur les marges). { texte, nom (lu
// par VoiceOver), ouvert, controle (id du détail), surToucher }. v11 : « Durée › » du Sommeil, et la largeur qu'il gardait
// ouvert (reserve), ont laissé la place à la roue de la carte.
export function TeteRubrique({ icone, libelle, sous, lien }) {
  return html`<span class="tete-rubrique">
    ${Icones[icone]({ trait: 2 })}
    <span class="tete-textes">${lien && html`<button type="button" class="lien-rubrique" aria-label=${lien.nom}
      aria-expanded=${lien.ouvert ? 'true' : 'false'} aria-controls=${lien.ouvert ? lien.controle : null} onClick=${lien.surToucher}>
      <span class="lien-rubrique-texte">${lien.texte}</span>${Icones.chevron({ trait: 2.2 })}</button>`}<span class="titre-rubrique">${libelle}</span>${sous && html`<span class="rubrique-sous">${sous}</span>`}</span>
  </span>`;
}

// Libellé de champ d'une fiche : petite icône au trait, puis le texte (ni gris, ni majuscules).
export const LibelleChamp = ({ icone, pour, children }) => (pour
  ? html`<label class="libelle-champ" for=${pour}>${Icones[icone]()}${children}</label>`
  : html`<span class="libelle-champ">${Icones[icone]()}${children}</span>`);
