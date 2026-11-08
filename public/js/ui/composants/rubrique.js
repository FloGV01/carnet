import { html } from '../lib.js';
import { Icones } from '../icones.js';

// Carré d'icône d'une liste groupée 2b, comme les réglages de l'iPhone (Réglages, Le soir) : 28 px, rayon 7, neutre
// (--surface-2) ou à la couleur de sa teinte (rubrique, parcours), l'icône dessus. Un repère, jamais une valeur.
export const CarreIcone = ({ icone, teinte }) => html`<span class=${`carre-ligne${teinte ? ` teinte-${teinte}` : ''}`} aria-hidden="true">${Icones[icone]({ trait: 2 })}</span>`;

// Tête d'une carte de rubrique (2b, Aujourd'hui) : un carré de 28 à la couleur de la rubrique, l'icône dessus, puis le
// titre ; `sous` (« nuit dernière ») le suit sur la même ligne, en discret. La carte porte la teinte (.teinte-*).
// `lien` (v8, Q5) : « Détail › », en couleur action, au bout de la première ligne du titre ; il ouvre un détail de la carte
// sans lui prendre de hauteur (le titre passe dessous au besoin, sa cible de 44 déborde sur les marges). { texte, nom (lu
// par VoiceOver), ouvert, controle (id du détail), surToucher }. v11 : « Durée › » du Sommeil, et la largeur qu'il gardait
// ouvert (reserve), ont laissé la place à la roue de la carte.
export function TeteRubrique({ icone, libelle, sous, lien }) {
  return html`<span class="tete-rubrique">
    <span class="carre-rubrique" aria-hidden="true">${Icones[icone]({ trait: 2 })}</span>
    <span class="tete-textes">${lien && html`<button type="button" class="lien-rubrique" aria-label=${lien.nom}
      aria-expanded=${lien.ouvert ? 'true' : 'false'} aria-controls=${lien.ouvert ? lien.controle : null} onClick=${lien.surToucher}>
      <span class="lien-rubrique-texte">${lien.texte}</span>${Icones.chevron({ trait: 2.2 })}</button>`}<span class="titre-rubrique">${libelle}</span>${sous && html`<span class="rubrique-sous">${sous}</span>`}</span>
  </span>`;
}

// Libellé de champ d'une fiche : petite icône au trait, puis le texte (ni gris, ni majuscules).
export const LibelleChamp = ({ icone, pour, children }) => (pour
  ? html`<label class="libelle-champ" for=${pour}>${Icones[icone]()}${children}</label>`
  : html`<span class="libelle-champ">${Icones[icone]()}${children}</span>`);
