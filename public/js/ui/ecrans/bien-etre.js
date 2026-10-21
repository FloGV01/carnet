// Onglet Bien-être (v7, spec §6.2) : pour pratiquer hors des moments de crise. En tête, la cohérence cardiaque (le même
// composant que Moment difficile, avec ses réglages et son signal facultatif) ; puis les exercices de sophrologie, un par
// carte (titre, durée approximative, une ligne de description) ; en bas, une ligne fixe. Aucun compteur : ni nombre de
// séances, ni série, ni « déjà fait aujourd'hui », ni rappel. Une séance notée laisse un lien discret, « Noter mon
// émotion » ; rien ne s'ouvre tout seul.
import { html } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { Respiration } from '../composants/respiration.js';
import { Icones } from '../icones.js';
import { EXERCICES, pourAffichage } from '../../domain/exercices.js';
import { versHash } from '../../routeur.js';

export const LIGNE_FIXE = 'Tu peux t\'arrêter à tout moment.';

// Le lien de fin de séance, aussi sur l'écran d'un exercice.
export const NoterEmotion = () => html`<a class="lien-discret noter-emotion" href="#/moment">Noter mon émotion</a>`;

export function BienEtre() {
  return html`<main class="ecran bien-etre">
    <${Entete} titre="Bien-être" />
    <div class="carte carte-respiration teinte-bien-etre">
      <${Respiration} origine="bien-etre" apres=${html`<${NoterEmotion} />`} />
    </div>
    <h2 class="libelle-section">Exercices</h2>
    <ul class="liste carte carte-groupe exercices" aria-label="Exercices">${EXERCICES.map((x) => html`<li>
      <a class="ligne-exercice" href=${versHash('exercice', { id: x.id })}>
        <span class="ligne-exercice-corps">
          <span class="exercice-titre">${x.titre}</span>
          <span class="exercice-description">${pourAffichage(`${x.dureeMin}\u00a0min · ${x.description}`)}</span>
        </span>
        ${Icones.chevron({ trait: 2 })}
      </a>
    </li>`)}</ul>
    <p class="ligne-fixe">${LIGNE_FIXE}</p>
  </main>`;
}
