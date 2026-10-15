// Feuille « Mon plan » (v4), ouverte depuis un épisode : le plan en lecture seule. Elle se ferme
// sur la même étape, sans navigation (on ne perd pas sa place en pleine crise). Le plan s'écrit
// dans Réglages › Mon plan. Elle ne s'ouvre jamais d'elle-même.
import { html, useEffect, useState } from '../lib.js';
import { repo } from '../../donnees.js';
import { normaliserPlan, phraseSiAlors, planVide, RUBRIQUES_PLAN, TITRE_SI_ALORS } from '../../domain/mon-plan.js';
import { Feuille } from './feuille.js';

export const lirePlan = async () => normaliserPlan(await repo.meta.lire('monPlan'));

export function ContenuPlan({ plan }) {
  return html`<div class="contenu-plan">
    ${RUBRIQUES_PLAN.filter(([cle]) => plan[cle]).map(([cle, titre]) => html`<div class="rubrique-plan">
      <h3 class="libelle-section">${titre}</h3><p>${plan[cle]}</p></div>`)}
    ${plan.siAlors.length > 0 && html`<div class="rubrique-plan"><h3 class="libelle-section">${TITRE_SI_ALORS}</h3>
      <ul class="liste-si-alors">${plan.siAlors.map((x) => html`<li>${phraseSiAlors(x)}</li>`)}</ul></div>`}
  </div>`;
}

// Le plan est lu à l'ouverture de la feuille (composants/feuille.js).
export function FeuillePlan({ surFermer, retourFocus }) {
  const [plan, setPlan] = useState(null);
  useEffect(() => { lirePlan().then(setPlan); }, []);
  return html`<${Feuille} titre="Mon plan" idTitre="titre-feuille-plan" surFermer=${surFermer} retourFocus=${retourFocus}>
    ${plan && (planVide(plan)
      ? html`<p class="texte-secondaire">Rien d'écrit pour l'instant.</p>`
      : html`<${ContenuPlan} plan=${plan} />`)}
  </${Feuille}>`;
}
