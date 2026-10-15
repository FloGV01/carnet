// « Moment difficile » (v5) : à un toucher depuis Aujourd'hui. Cohérence cardiaque guidée (durée,
// rythme et signal sonore réglés dans Réglages › Moment difficile), puis Mon plan tel que
// l'utilisateur l'a écrit. Rien n'y est calculé ni choisi par l'app : ni conseil, ni sélection de
// notes, ni compte à rebours.
import { html, useEffect, useState } from '../lib.js';
import { CadreParcours } from '../composants/parcours.js';
import { Respiration } from '../composants/respiration.js';
import { ContenuPlan, lirePlan } from '../composants/mon-plan.js';
import { planVide } from '../../domain/mon-plan.js';
import { Icones } from '../icones.js';

export function MomentDifficile() {
  const [plan, setPlan] = useState(null);
  useEffect(() => { lirePlan().then(setPlan); }, []);
  const fermer = () => { location.hash = '#/aujourdhui'; };
  return html`<${CadreParcours} titre="Moment difficile" teinte="jour" surFermer=${fermer} sansPoint=${true}
    pied=${html`<a class="btn-lien" href="#/episode/nouveau">${Icones.plus({ trait: 2 })}Noter un épisode</a>`}>
    <div class="etape moment-difficile">
      <${Respiration} />
      <section class="plan-moment" aria-labelledby="titre-plan-moment">
        <h2 class="titre-question" id="titre-plan-moment">Mon plan</h2>
        ${plan && (planVide(plan)
          ? html`<p class="texte-secondaire">Rien d'écrit pour l'instant. Mon plan s'écrit dans Réglages.</p>`
          : html`<${ContenuPlan} plan=${plan} />`)}
      </section>
    </div>
  </${CadreParcours}>`;
}
