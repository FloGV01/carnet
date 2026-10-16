// « Me ressourcer » (v6) : « Pour récupérer, je… » de Mon plan, tel que l'utilisateur l'a écrit et en grand,
// avec « Respirer » (la respiration s'affiche sur place et démarre aussitôt) et « Modifier ». On y vient de
// Moment difficile. Rien n'y est calculé, compté ni enregistré.
import { html, useEffect, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { lirePlan } from '../composants/mon-plan.js';
import { PourRecuperer } from '../composants/ressourcer.js';
import { normaliserPlan } from '../../domain/mon-plan.js';

export function Ressourcer() {
  const [plan, setPlan] = useState(null);
  // Une lecture qui échoue donne un plan vide : l'écran reste utilisable.
  useEffect(() => { lirePlan().catch(() => normaliserPlan(null)).then(setPlan); }, []);
  const tete = html`<${Entete} titre="Me ressourcer" retour=${() => { location.hash = '#/moment-difficile'; }} />`;
  if (!plan) return html`<main class="ecran fiche">${tete}</main>`;
  return html`<main class="ecran fiche ressourcer">
    ${tete}
    ${plan.pourRecuperer
      ? html`<${PourRecuperer} texte=${plan.pourRecuperer} grand=${true} />
        <a class="lien-discret" href="#/mon-plan">Modifier</a>`
      : html`<p class="texte-secondaire">Rien d'écrit pour l'instant.</p>
        <a class="btn-lien action" href="#/mon-plan">Écrire ce qui me recharge</a>`}
  </main>`;
}
