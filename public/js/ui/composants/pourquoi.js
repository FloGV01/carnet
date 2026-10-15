import { html, useState } from '../lib.js';
import { PAS_ASSEZ } from '../../analyse/textes.js';

// « Pas encore assez de données pour le dire. », puis « Pourquoi ? », qui déplie la règle fixe, sans
// aucun décompte (Analyse, Comprendre).
export function Pourquoi({ regle, texte = PAS_ASSEZ }) {
  const [ouvert, setOuvert] = useState(false);
  return html`<p class="texte-secondaire">${texte} <button type="button" class="btn-lien pourquoi" aria-expanded=${ouvert ? 'true' : 'false'} onClick=${() => setOuvert(!ouvert)}>Pourquoi ?</button></p>
    ${ouvert && html`<p class="encadre-regle">${regle}</p>`}`;
}
