// La liste d'une entrée de Bien-être (v10, spec §7.2) : #/bien-etre/calmer, dormir ou concentrer. Chaque élément porte son bouton
// lecture et son épingle (composants/ligne-element.js). Pas de compteur, pas de « déjà fait ». En bas, la ligne fixe de Bien-être.
import { html } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { LigneElement } from '../composants/ligne-element.js';
import { ENTREES } from '../../domain/entrees-bien-etre.js';
import { versHash } from '../../routeur.js';
import { LIGNE_FIXE } from './bien-etre.js';

export function EntreeBienEtre({ id }) {
  const entree = ENTREES.find((x) => x.id === id);
  const retour = versHash('entree-bien-etre', { entree: id });
  return html`<main class="ecran fiche entree-bien-etre">
    <${Entete} titre=${entree.titre} retour=${() => { location.hash = versHash('bien-etre'); }} />
    <ul class="liste carte carte-groupe teinte-bien-etre">
      ${entree.elements.map((x) => html`<${LigneElement} key=${x} id=${x} retour=${retour} avecEpingle=${true} />`)}
    </ul>
    <p class="ligne-fixe">${LIGNE_FIXE}</p>
  </main>`;
}
