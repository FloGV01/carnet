// Feuille « Mon plan » (v4), ouverte depuis un épisode : le plan en lecture seule. Elle se ferme
// sur la même étape, sans navigation (on ne perd pas sa place en pleine crise). Le plan s'écrit
// dans Réglages › Mon plan. Elle ne s'ouvre jamais d'elle-même.
import { html, useEffect, useRef, useState } from '../lib.js';
import { repo } from '../../donnees.js';
import { normaliserPlan, phraseSiAlors, planVide, RUBRIQUES_PLAN, TITRE_SI_ALORS } from '../../domain/mon-plan.js';
import { Icones } from '../icones.js';

export const lirePlan = async () => normaliserPlan(await repo.meta.lire('monPlan'));

export function ContenuPlan({ plan }) {
  return html`<div class="contenu-plan">
    ${RUBRIQUES_PLAN.filter(([cle]) => plan[cle]).map(([cle, titre]) => html`<div class="rubrique-plan">
      <h3 class="libelle-section">${titre}</h3><p>${plan[cle]}</p></div>`)}
    ${plan.siAlors.length > 0 && html`<div class="rubrique-plan"><h3 class="libelle-section">${TITRE_SI_ALORS}</h3>
      <ul class="liste-si-alors">${plan.siAlors.map((x) => html`<li>${phraseSiAlors(x)}</li>`)}</ul></div>`}
  </div>`;
}

// Même schéma que Confirmation : focus sur le titre, Échap et Fermer rendent le focus à la ligne
// (retourFocus : Safari ne donne pas le focus à un bouton touché).
export function FeuillePlan({ surFermer, retourFocus }) {
  const [plan, setPlan] = useState(null);
  const titre = useRef(null);
  useEffect(() => { lirePlan().then(setPlan); }, []);
  useEffect(() => {
    const precedent = document.activeElement;
    if (titre.current) titre.current.focus();
    const touche = (e) => { if (e.key === 'Escape') surFermer(); };
    document.addEventListener('keydown', touche);
    return () => {
      document.removeEventListener('keydown', touche);
      const cible = (retourFocus && retourFocus.current) || precedent;
      if (cible && cible.focus) cible.focus();
    };
  }, []);
  return html`<div class="voile voile-feuille" onClick=${(e) => { if (e.target === e.currentTarget) surFermer(); }}>
    <section class="feuille" role="dialog" aria-modal="true" aria-labelledby="titre-feuille-plan">
      <div class="feuille-tete">
        <h2 class="titre-carte" id="titre-feuille-plan" tabindex="-1" ref=${titre}>Mon plan</h2>
        <button type="button" class="fermer btn-lien" onClick=${surFermer}>${Icones.fermer({ trait: 2 })}Fermer</button>
      </div>
      ${plan && (planVide(plan)
        ? html`<p class="texte-secondaire">Rien d'écrit pour l'instant.</p>`
        : html`<${ContenuPlan} plan=${plan} />`)}
    </section>
  </div>`;
}
