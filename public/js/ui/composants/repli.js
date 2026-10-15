import { html, useState } from '../lib.js';
import { lireLocal, ecrireLocal } from '../hooks.js';
import { Icones } from '../icones.js';

// Section repliable ; quand elle contient des données, sa ligne les résume.
// `memoriser` : l'état ouvert ou fermé est gardé d'une ouverture de l'app à l'autre.
// `resumeSous` : pour un titre long, le résumé passe sous le titre au lieu d'y être coupé.
export function Repli({ cle, titre, resume, memoriser = true, resumeSous = false, children }) {
  const [ouvert, setOuvert] = useState(() => memoriser && lireLocal(`carnet:repli:${cle}`, false) === true);
  const basculer = () => { const v = !ouvert; setOuvert(v); if (memoriser) ecrireLocal(`carnet:repli:${cle}`, v); };
  return html`<section class=${resumeSous ? 'repli resume-sous' : 'repli'}>
    <button type="button" class="repli-tete" aria-expanded=${ouvert ? 'true' : 'false'} onClick=${basculer}>
      <span class="repli-fleche" aria-hidden="true">${Icones.chevron({ trait: 2 })}</span>
      <span class="repli-titre">${titre}</span>
      ${!ouvert && resume && html`<span class="repli-resume">${resume}</span>`}
    </button>
    ${ouvert && html`<div class="repli-corps">${children}</div>`}
  </section>`;
}
