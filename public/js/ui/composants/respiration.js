// Respiration guidée (v6) : cercle, mots « Inspire » / « Expire », signal sonore facultatif. Partagée
// entre « Moment difficile », « Respirer » (dans la carte « Pour récupérer, je… ») et l'onglet Bien-être (v7). La durée, le
// rythme et le signal se règlent dans Réglages › Moment difficile (méta `respiration`). Rien n'y est calculé ni compté ; une
// respiration menée au bout, ou arrêtée après 60 s, crée une séance (v7, spec §6.3) avec son origine, une seule fois.
// Seul le temps passé page visible compte : page cachée (écran verrouillé, autre app), le cercle s'arrête et la séance
// est notée dès ce moment si elle passe la règle (l'app peut ne pas revenir) ; au retour, la respiration reprend là où
// elle en était, et c'est la même séance.
import { html, useEffect, useRef, useState } from '../lib.js';
import { repo } from '../../donnees.js';
import { Icones } from '../icones.js';
import {
  CYCLE_MS, DUREES, NOM_RESPIRATION, RYTHMES, dureeEnMs, normaliserRespiration, phaseRespiration, texteAvant, texteDuree, texteFin,
  texteRythme,
} from '../../domain/respiration.js';
import { preparerSon, relancerSon, sonner, suspendreSon } from './signal-sonore.js';
import { garderEcran, useSeance } from '../seance.js';
import { doitEnregistrer } from '../../domain/seances.js';

// `demarrerTout` : l'exercice part dès que les réglages sont lus, sans toucher (« Respirer »). Le
// toucher est alors celui de l'appelant : pour que le signal sonore joue, il appelle `preparerSon()` (de
// signal-sonore.js) dans son gestionnaire. Sans cela, l'exercice part sans son (jamais de contexte audio
// créé hors d'un toucher).
// `origine` (v7) : `bien-etre`, `moment-difficile` ou `ressourcer` ; sans origine, aucune séance n'est notée. `apres` : ce
// qui s'affiche une fois une séance notée (dans Bien-être, « Noter mon émotion ») ; rien ne s'ouvre tout seul.
// `dureeALaLigne` : dans une carte plus étroite (« Pour récupérer, je… »), la durée passe sous « Cohérence cardiaque »,
// sans « · » (le point finissait seul la première ligne à 390).
// `reglable` (Moment difficile et Bien-être, 2b) : la durée et le rythme en deux puces sous « Cohérence cardiaque »
// (« 5 minutes ▾ », « 5 s · 5 s ▾ »), qui ouvrent le choix de l'iPhone. Un choix s'enregistre aussitôt, dans le même
// réglage que Réglages › Moment difficile (méta `respiration`). Pendant la respiration, elles restent à leur place (rien
// ne saute), inactives.
export function Respiration({ demarrerTout = false, origine = null, apres = null, dureeALaLigne = false, reglable = false }) {
  const [reglages, setReglages] = useState(null);
  const [phase, setPhase] = useState(null);
  const [cycle, setCycle] = useState(0);
  // Le début de la respiration, décalé du temps passé page cachée : `performance.now() - debut` est le temps visible.
  const debut = useRef(0);
  // L'instant où la page s'est cachée pendant la respiration, sinon null.
  const cachee = useRef(null);
  const verrou = useRef(null);
  const derniere = useRef(null);
  const lance = useRef(false);
  const seance = useSeance('coherence', origine);
  // Vrai quand la dernière respiration a créé une séance (menée au bout, ou arrêtée après 60 s).
  const [notee, setNotee] = useState(false);
  // La durée de la respiration lancée, prise à « Commencer » : le texte de fin dit ce qui vient d'être fait, même si
  // une puce change le réglage ensuite.
  const [dureeFaite, setDureeFaite] = useState(null);
  // Une lecture qui échoue donne les réglages par défaut : « Commencer » ne reste jamais inactif.
  useEffect(() => { repo.meta.lire('respiration').catch(() => null).then((v) => setReglages(normaliserRespiration(v))); }, []);
  // Les écritures des puces se suivent, chacune relue et réécrite dans sa transaction : deux choix rapprochés ne
  // s'écrasent pas, et le signal sonore réglé ailleurs est gardé. Le choix s'affiche tout de suite.
  const file = useRef(Promise.resolve());
  const regler = (cle, valeur) => {
    setReglages((r) => ({ ...r, [cle]: valeur }));
    file.current = file.current.then(async () => {
      setReglages(normaliserRespiration(await repo.meta.modifier('respiration', (v) => ({ ...normaliserRespiration(v), [cle]: valeur }))));
    }).catch(() => {});
  };
  const enCours = phase === 'inspire' || phase === 'expire';
  const actif = useRef(false);
  actif.current = enCours;
  // Un verrou obtenu après l'arrêt de l'exercice, ou page cachée, est rendu tout de suite.
  const tenir = (v) => { if (v && (!actif.current || cachee.current != null)) { v.release().catch(() => {}); return; } verrou.current = v; };
  const rendreVerrou = () => { if (verrou.current) { verrou.current.release().catch(() => {}); verrou.current = null; } };
  // Une note à chaque changement de phase, y compris la fin.
  const annoncer = (p) => {
    if (p === derniere.current) return;
    derniere.current = p;
    if (reglages.son) sonner(p);
  };
  useEffect(() => {
    if (!enCours) return undefined;
    const dureeMs = dureeEnMs(reglages.duree);
    // Le temps de respiration, page visible seulement, borné à la durée réglée.
    const ecoule = () => Math.min((cachee.current ?? performance.now()) - debut.current, dureeMs);
    const minuterie = setInterval(() => {
      // Page cachée, le temps ne compte pas : la respiration ne peut pas finir hors de l'écran. Respiration arrêtée
      // (« Arrêter » ou la fin) : Preact ne nettoie cet effet qu'après l'affichage, et un tic tombé entre les deux
      // relancerait le cercle (le toucher perdu, la séance non notée, le verrou gardé).
      if (!actif.current || cachee.current != null) return;
      const p = phaseRespiration(performance.now() - debut.current, reglages.rythme, dureeMs);
      annoncer(p);
      setPhase(p);
    }, 200);
    // Page cachée ou quittée : le temps s'arrête, le verrou est rendu, et la séance est notée si elle passe la règle.
    const cacher = () => {
      if (cachee.current != null) return;
      cachee.current = performance.now();
      rendreVerrou();
      seance.noter({ dureeS: ecoule() / 1000, terminee: false });
    };
    // Retour au premier plan : le temps caché est retiré, l'écran est redemandé, le son relancé, et le cercle repart d'un
    // début de cycle (sans perdre le temps déjà fait) pour rester accordé au texte.
    const visibilite = async () => {
      if (document.visibilityState === 'hidden') { cacher(); return; }
      if (document.visibilityState !== 'visible') return;
      if (cachee.current != null) { debut.current += performance.now() - cachee.current; cachee.current = null; }
      const visible = performance.now() - debut.current;
      debut.current = performance.now() - Math.floor(visible / CYCLE_MS) * CYCLE_MS;
      setCycle((c) => c + 1);
      if (reglages.son) relancerSon();
      tenir(await garderEcran());
    };
    document.addEventListener('visibilitychange', visibilite);
    window.addEventListener('pagehide', cacher);
    return () => {
      clearInterval(minuterie);
      document.removeEventListener('visibilitychange', visibilite);
      window.removeEventListener('pagehide', cacher);
      rendreVerrou();
      suspendreSon();
      // Fin de la respiration (au bout, « Arrêter », ou l'écran quitté) : la séance, si elle passe la règle. Menée au bout
      // seulement si toute la durée s'est écoulée page visible.
      const e = ecoule();
      cachee.current = null;
      const fin = { dureeS: e / 1000, terminee: e >= dureeMs };
      seance.noter(fin);
      if (origine && doitEnregistrer(fin)) setNotee(true);
    };
  }, [enCours]);
  // `dansToucher` : appelé par le toucher de « Commencer », où le contexte audio peut s'amorcer.
  const commencer = (dansToucher) => {
    debut.current = performance.now();
    cachee.current = null;
    derniere.current = null;
    seance.commencer();
    setNotee(false);
    setDureeFaite(reglages.duree);
    if (!reglages.son) suspendreSon(); // un contexte préparé par l'appelant pour rien se rendort
    else if (dansToucher) preparerSon();
    setPhase('inspire');
    annoncer('inspire');
    actif.current = true;
    garderEcran().then(tenir);
  };
  useEffect(() => {
    if (!demarrerTout || !reglages || lance.current) return;
    lance.current = true;
    commencer(false);
  }, [demarrerTout, reglages]);
  const duree = reglages ? reglages.duree : null;
  const avant = (minutes) => (reglable ? NOM_RESPIRATION : dureeALaLigne
    ? html`${NOM_RESPIRATION} <span class="duree-respiration">${texteDuree(minutes)}</span>`
    : texteAvant(minutes));
  const texte = phase === 'inspire' ? 'Inspire' : phase === 'expire' ? 'Expire'
    : !reglages ? '' : phase === 'fini' ? texteFin(dureeFaite) : avant(duree);
  const classeCercle = ['cercle-respiration', enCours && 'en-cours', enCours && `phase-${phase}`, reglages && reglages.rythme === '4-6' && 'rythme-4-6']
    .filter(Boolean).join(' ');
  return html`<section class="respiration" aria-label="Cohérence cardiaque">
    <div key=${cycle} class=${classeCercle} aria-hidden="true"><span></span></div>
    <p class="phase-respiration" aria-live="polite">${texte}</p>
    ${reglable && reglages && html`<div class="puces-respiration">
      <${PuceReglage} etiquette="Durée" valeur=${reglages.duree} options=${DUREES.map((d) => [d, texteDuree(d)])} inactif=${enCours}
        surChoix=${(v) => regler('duree', Number(v))} />
      <${PuceReglage} etiquette="Rythme" valeur=${reglages.rythme} options=${RYTHMES.map((r) => [r, texteRythme(r)])} inactif=${enCours}
        surChoix=${(v) => regler('rythme', v)} />
    </div>`}
    ${enCours
      ? html`<button type="button" class="btn" onClick=${() => setPhase(null)}>Arrêter</button>`
      : html`<button type="button" class="btn btn-plein" disabled=${!reglages} onClick=${() => commencer(true)}>${Icones.respiration()}${phase === 'fini' ? 'Recommencer' : 'Commencer'}</button>`}
    ${!enCours && notee && apres}
  </section>`;
}

// Une puce de réglage : un menu de l'iPhone (select natif) habillé en puce 2b, avec son chevron. Son nom (« Durée »,
// « Rythme ») est dit par les lecteurs d'écran ; la puce montre la valeur choisie.
function PuceReglage({ etiquette, valeur, options, surChoix, inactif }) {
  return html`<label class="puce-reglage">
    <span class="visuellement-cache">${etiquette}</span>
    <select value=${String(valeur)} disabled=${inactif} onChange=${(e) => surChoix(e.target.value)}>
      ${options.map(([v, texte]) => html`<option value=${String(v)}>${texte}</option>`)}
    </select>
    ${Icones.chevronBas({ trait: 2 })}
  </label>`;
}
