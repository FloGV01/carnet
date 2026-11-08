import { html, useRef } from '../lib.js';
import { Icones } from '../icones.js';
import { useGesteRetour, useDebordeDeCote } from './geste-retour.js';

// En-tête d'écran. Racine d'onglet : grand titre. Écran poussé : rangée « Retour »
// (avec, à droite, un élément facultatif comme « Enregistré ») puis titre.
// v11 (spec §11) : sur un écran poussé, le doigt qui glisse vers la droite fait comme « Retour » (geste-retour.js). Les
// quatre onglets n'ont pas de « Retour », le geste n'y fait rien ; l'onglet des jours a son propre en-tête (entete-jour.js)
// et garde son geste. Une page plus large que l'écran (très grand texte) garde son défilement de côté (useDebordeDeCote) :
// le témoin, caché, ne sert qu'à voir la taille du texte changer.
export function Entete({ titre, retour, droite }) {
  const temoin = useRef(null);
  useGesteRetour(retour || null);
  useDebordeDeCote(Boolean(retour), temoin);
  if (!retour) {
    return html`<header class="entete-onglet">
      <h1 class="titre-onglet">${titre}</h1>
      ${droite}
    </header>`;
  }
  return html`<header class="entete-pousse">
    <div class="barre-retour">
      <button type="button" class="retour" onClick=${retour}>${Icones.retour({ trait: 2 })}Retour</button>
      ${droite || html`<span></span>`}
    </div>
    <h1 class="titre-ecran">${titre}</h1>
    <span ref=${temoin} class="temoin-texte" aria-hidden="true"></span>
  </header>`;
}
