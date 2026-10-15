// « Moment difficile » (v5) : à un toucher depuis Aujourd'hui. Cohérence cardiaque guidée (durée,
// rythme et signal sonore réglés dans Réglages › Moment difficile), « Une chose à la fois » (le plan
// une ligne par écran, réglé au même endroit), « Me ressourcer », puis Mon plan tel que l'utilisateur l'a
// écrit. Rien n'y est calculé ni choisi par l'app : ni conseil, ni sélection de notes, ni compte à rebours.
import { html, useEffect, useRef, useState } from '../lib.js';
import { CadreParcours } from '../composants/parcours.js';
import { Respiration } from '../composants/respiration.js';
import { ContenuPlan, lirePlan } from '../composants/mon-plan.js';
import { UneChose, lireUneChose } from '../composants/une-chose.js';
import { cartesPlan, planVide } from '../../domain/mon-plan.js';
import { Icones } from '../icones.js';

export function MomentDifficile() {
  const [plan, setPlan] = useState(null);
  const [reglages, setReglages] = useState(null);
  // Les cartes remplacent l'écran (la respiration s'arrête, et avec elle son verrou d'écran).
  const [cartesOuvertes, setCartesOuvertes] = useState(false);
  const retour = useRef(null); // où le focus revient en quittant les cartes : 'acces' ou 'plan'
  const acces = useRef(null);
  const titrePlan = useRef(null);
  useEffect(() => { lirePlan().then(setPlan); lireUneChose().then(setReglages); }, []);
  // Safari ne donne pas le focus à un bouton touché : on le rend nous-mêmes, au bouton ou à Mon plan.
  useEffect(() => {
    if (cartesOuvertes || !retour.current) return;
    const cible = retour.current === 'plan' ? titrePlan.current : acces.current;
    retour.current = null;
    if (!cible) return;
    cible.focus();
    if (cible === titrePlan.current) cible.scrollIntoView({ block: 'start' });
  }, [cartesOuvertes]);
  const cartes = plan && reglages ? cartesPlan(plan, reglages) : [];
  const quitterCartes = (vers) => () => { retour.current = vers; setCartesOuvertes(false); };
  const fermer = () => { location.hash = '#/aujourdhui'; };
  if (cartesOuvertes && cartes.length > 0) {
    return html`<${CadreParcours} titre="Une chose à la fois" teinte="jour" surFermer=${quitterCartes('acces')} sansPoint=${true}>
      <${UneChose} cartes=${cartes} surToutVoir=${quitterCartes('plan')} />
    </${CadreParcours}>`;
  }
  return html`<${CadreParcours} titre="Moment difficile" teinte="jour" surFermer=${fermer} sansPoint=${true}
    pied=${html`<a class="btn-lien" href="#/episode/nouveau">${Icones.plus({ trait: 2 })}Noter un épisode</a>`}>
    <div class="etape moment-difficile">
      <${Respiration} />
      ${cartes.length > 0 && html`<button type="button" class="btn une-chose-acces" ref=${acces} onClick=${() => setCartesOuvertes(true)}>Une chose à la fois</button>`}
      <a class="btn ressourcer-acces" href="#/ressourcer">Me ressourcer</a>
      <section class="plan-moment" aria-labelledby="titre-plan-moment">
        <h2 class="titre-question" id="titre-plan-moment" tabindex="-1" ref=${titrePlan}>Mon plan</h2>
        ${plan && (planVide(plan)
          ? html`<a class="btn-lien action" href="#/mon-plan">Écrire mon plan</a>`
          : html`<${ContenuPlan} plan=${plan} />
            <a class="lien-discret" href="#/mon-plan">Modifier mon plan</a>`)}
      </section>
    </div>
  </${CadreParcours}>`;
}
