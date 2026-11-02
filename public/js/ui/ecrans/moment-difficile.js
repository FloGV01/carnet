// « Moment difficile » (v5) : à un toucher depuis Aujourd'hui. Cohérence cardiaque guidée en tête (durée et
// rythme réglables sur place, signal sonore dans Réglages › Moment difficile), « Une chose à la fois » (le plan
// une ligne par écran, réglé au même endroit), puis Mon plan tel que l'utilisateur l'a écrit, avec
// « Modifier » à droite de son titre (v6.1). Rien n'y est calculé ni choisi par l'app : ni
// conseil, ni sélection de notes, ni compte à rebours. La respiration crée une séance d'origine `moment-difficile` (v7).
// En 2b (v7, tâche 8) : trois cartes, à la couleur du parcours (bleu brume) ; « Commencer » en -fill / -on.
// v10 (spec §5 et §14.5) : en tête, quatre boutons aux mots fixes, Panique, Colère, Trop-plein, Réveil la nuit. Un toucher
// démarre aussitôt un exercice court (#/crise/<id>), dans le lecteur en mode crise, sans choix de durée et sans compte à
// rebours ; il revient ici à la fin. Le bouton touché n'est pas une donnée : seule la séance est notée, d'origine
// `moment-difficile`. Les trois cartes restent en dessous : l'écran peut défiler, le pied reste à sa place.
import { html, useEffect, useRef, useState } from '../lib.js';
import { CadreParcours } from '../composants/parcours.js';
import { Lecteur, lancerLecture } from '../composants/lecteur.js';
import { Respiration } from '../composants/respiration.js';
import { ContenuPlan, lirePlan } from '../composants/mon-plan.js';
import { UneChose, lireUneChose } from '../composants/une-chose.js';
import { exerciceDe } from '../../domain/exercices.js';
import { cartesPlan, planVide } from '../../domain/mon-plan.js';
import { versHash } from '../../routeur.js';
import { Icones } from '../icones.js';

// Dans l'ordre des boutons. Leur mot est le titre de l'exercice (domain/exercices.js).
const EXERCICES_COURTS = ['panique', 'colere', 'trop-plein', 'reveil-nuit'];
const ICI = versHash('moment-difficile');

// Le son et la voix sont préparés dans le toucher (lancerLecture) ; ils ne jouent que si Réglages › Moment difficile le dit.
function ExercicesCourts() {
  return html`<div class="exercices-courts" role="group" aria-label="Un exercice court">
    ${EXERCICES_COURTS.map((id) => html`<button type="button" class="exercice-court"
      onClick=${() => lancerLecture(versHash('crise', { id }), { retour: ICI, mode: 'crise' })}>${exerciceDe(id).titre}</button>`)}
  </div>`;
}

// Un exercice court dans le lecteur (#/crise/<id>). Lancé d'un toucher, il démarre aussitôt ; ouvert autrement, il attend
// « Commencer » : rien ne joue seul. Ce qui n'est pas l'un des quatre, un autre exercice compris, ramène à Moment difficile.
export function ExerciceCrise({ id }) {
  const exercice = EXERCICES_COURTS.includes(id) ? exerciceDe(id) : null;
  useEffect(() => { if (!exercice) location.hash = ICI; }, [id]);
  return exercice ? html`<${Lecteur} seance=${exercice} mode="crise" retour=${ICI} />` : null;
}

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
    return html`<${CadreParcours} titre="Une chose à la fois" teinte="difficile" surFermer=${quitterCartes('acces')}>
      <${UneChose} cartes=${cartes} surToutVoir=${quitterCartes('plan')} />
    </${CadreParcours}>`;
  }
  return html`<${CadreParcours} titre="Moment difficile" teinte="difficile" surFermer=${fermer}
    pied=${html`<a class="btn-lien" href="#/episode/nouveau">${Icones.plus({ trait: 2 })}Noter un épisode</a>`}>
    <div class="etape moment-difficile">
      <${ExercicesCourts} />
      <div class="carte carte-respiration">
        <${Respiration} origine="moment-difficile" reglable=${true} />
      </div>
      ${cartes.length > 0 && html`<button type="button" class="carte ligne-carte une-chose-acces" ref=${acces} onClick=${() => setCartesOuvertes(true)}>
        <span class="ligne-libelle">Une chose à la fois</span>${Icones.chevron({ trait: 2 })}</button>`}
      <section class="carte plan-moment" aria-labelledby="titre-plan-moment">
        <div class="plan-moment-tete">
          <h2 class="titre-plan-moment" id="titre-plan-moment" tabindex="-1" ref=${titrePlan}>
            <span class="carre-plan" aria-hidden="true">${Icones.monPlan()}</span>Mon plan</h2>
          ${plan && !planVide(plan) && html`<a class="btn-lien modifier-plan" href="#/mon-plan" aria-label="Modifier mon plan">Modifier</a>`}
        </div>
        ${plan && (planVide(plan)
          ? html`<a class="btn-lien action" href="#/mon-plan">Écrire mon plan</a>`
          : html`<${ContenuPlan} plan=${plan} />`)}
      </section>
    </div>
  </${CadreParcours}>`;
}
