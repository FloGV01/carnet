// « Moment difficile » (v5) : à un toucher depuis Aujourd'hui. Cohérence cardiaque guidée
// (5 s pour inspirer, 5 s pour expirer, 5 min), puis Mon plan tel que l'utilisateur l'a écrit.
// Rien n'y est calculé ni choisi par l'app : ni conseil, ni sélection de notes. Visuel seul,
// sans son ni vibration, sans compte à rebours.
import { html, useEffect, useRef, useState } from '../lib.js';
import { CadreParcours } from '../composants/parcours.js';
import { ContenuPlan, lirePlan } from '../composants/mon-plan.js';
import { planVide } from '../../domain/mon-plan.js';
import { Icones } from '../icones.js';

export const DEMI_CYCLE_MS = 5000;
export const DUREE_MS = 5 * 60 * 1000;

// Phase de la respiration à un instant donné (pure, testée).
export function phaseRespiration(ecouleMs) {
  if (ecouleMs >= DUREE_MS) return 'fini';
  return Math.floor(ecouleMs / DEMI_CYCLE_MS) % 2 === 0 ? 'inspire' : 'expire';
}

// L'écran reste allumé pendant l'exercice si l'iPhone le permet (Wake Lock), sinon tant pis.
async function garderEcran() {
  try { return navigator.wakeLock ? await navigator.wakeLock.request('screen') : null; } catch { return null; }
}

function Respiration() {
  const [phase, setPhase] = useState(null);
  const [cycle, setCycle] = useState(0);
  const debut = useRef(0);
  const verrou = useRef(null);
  const enCours = phase === 'inspire' || phase === 'expire';
  const actif = useRef(false);
  actif.current = enCours;
  // Un verrou obtenu après l'arrêt de l'exercice est rendu tout de suite.
  const tenir = (v) => { if (v && !actif.current) { v.release().catch(() => {}); return; } verrou.current = v; };
  useEffect(() => {
    if (!enCours) return undefined;
    const minuterie = setInterval(() => setPhase(phaseRespiration(performance.now() - debut.current)), 200);
    // Retour au premier plan : l'écran est redemandé, et le cercle repart d'un début de cycle
    // (sans perdre le temps déjà fait) pour rester accordé au texte.
    const retour = async () => {
      if (document.visibilityState !== 'visible') return;
      const ecoule = performance.now() - debut.current;
      debut.current = performance.now() - Math.floor(ecoule / (2 * DEMI_CYCLE_MS)) * 2 * DEMI_CYCLE_MS;
      setCycle((c) => c + 1);
      tenir(await garderEcran());
    };
    document.addEventListener('visibilitychange', retour);
    return () => {
      clearInterval(minuterie);
      document.removeEventListener('visibilitychange', retour);
      if (verrou.current) { verrou.current.release().catch(() => {}); verrou.current = null; }
    };
  }, [enCours]);
  const commencer = () => {
    debut.current = performance.now();
    setPhase('inspire');
    actif.current = true;
    garderEcran().then(tenir);
  };
  return html`<section class="respiration" aria-label="Cohérence cardiaque">
    <div key=${cycle} class=${`cercle-respiration${enCours ? ' en-cours' : ''}`} aria-hidden="true"><span></span></div>
    <p class="phase-respiration" aria-live="polite">
      ${phase === 'inspire' ? 'Inspire' : phase === 'expire' ? 'Expire' : phase === 'fini' ? '5 minutes de respiration.' : 'Cohérence cardiaque · 5 minutes'}</p>
    ${enCours
      ? html`<button type="button" class="btn" onClick=${() => setPhase(null)}>Arrêter</button>`
      : html`<button type="button" class="btn btn-plein" onClick=${commencer}>${Icones.respiration()}${phase === 'fini' ? 'Recommencer' : 'Commencer'}</button>`}
  </section>`;
}

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
