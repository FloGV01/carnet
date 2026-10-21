// Respiration guidée (v6) : cercle, mots « Inspire » / « Expire », signal sonore facultatif. Partagée
// entre « Moment difficile », « Respirer » (dans la carte « Pour récupérer, je… ») et l'onglet Bien-être (v7). La durée, le
// rythme et le signal se règlent dans Réglages › Moment difficile (méta `respiration`). Rien n'y est calculé ni compté ; une
// respiration menée au bout, ou arrêtée après 60 s, crée une séance (v7, spec §6.3) avec son origine, une seule fois.
import { html, useEffect, useRef, useState } from '../lib.js';
import { repo } from '../../donnees.js';
import { Icones } from '../icones.js';
import { CYCLE_MS, dureeEnMs, normaliserRespiration, phaseRespiration, texteAvant, texteFin } from '../../domain/respiration.js';
import { preparerSon, relancerSon, sonner, suspendreSon } from './signal-sonore.js';
import { garderEcran, useSeance } from '../seance.js';
import { doitEnregistrer } from '../../domain/seances.js';

// `demarrerTout` : l'exercice part dès que les réglages sont lus, sans toucher (« Respirer »). Le
// toucher est alors celui de l'appelant : pour que le signal sonore joue, il appelle `preparerSon()` (de
// signal-sonore.js) dans son gestionnaire. Sans cela, l'exercice part sans son (jamais de contexte audio
// créé hors d'un toucher).
// `origine` (v7) : `bien-etre`, `moment-difficile` ou `ressourcer` ; sans origine, aucune séance n'est notée. `apres` : ce
// qui s'affiche une fois une séance notée (dans Bien-être, « Noter mon émotion ») ; rien ne s'ouvre tout seul.
export function Respiration({ demarrerTout = false, origine = null, apres = null }) {
  const [reglages, setReglages] = useState(null);
  const [phase, setPhase] = useState(null);
  const [cycle, setCycle] = useState(0);
  const debut = useRef(0);
  const verrou = useRef(null);
  const derniere = useRef(null);
  const lance = useRef(false);
  const seance = useSeance('coherence', origine);
  // Vrai quand la dernière respiration a créé une séance (menée au bout, ou arrêtée après 60 s).
  const [notee, setNotee] = useState(false);
  // Une lecture qui échoue donne les réglages par défaut : « Commencer » ne reste jamais inactif.
  useEffect(() => { repo.meta.lire('respiration').catch(() => null).then((v) => setReglages(normaliserRespiration(v))); }, []);
  const enCours = phase === 'inspire' || phase === 'expire';
  const actif = useRef(false);
  actif.current = enCours;
  // Un verrou obtenu après l'arrêt de l'exercice est rendu tout de suite.
  const tenir = (v) => { if (v && !actif.current) { v.release().catch(() => {}); return; } verrou.current = v; };
  // Une note à chaque changement de phase, y compris la fin.
  const annoncer = (p) => {
    if (p === derniere.current) return;
    derniere.current = p;
    if (reglages.son) sonner(p);
  };
  useEffect(() => {
    if (!enCours) return undefined;
    const minuterie = setInterval(() => {
      const p = phaseRespiration(performance.now() - debut.current, reglages.rythme, dureeEnMs(reglages.duree));
      annoncer(p);
      setPhase(p);
    }, 200);
    // Retour au premier plan : l'écran est redemandé, le son relancé, et le cercle repart d'un début de
    // cycle (sans perdre le temps déjà fait) pour rester accordé au texte.
    const retour = async () => {
      if (document.visibilityState !== 'visible') return;
      const ecoule = performance.now() - debut.current;
      debut.current = performance.now() - Math.floor(ecoule / CYCLE_MS) * CYCLE_MS;
      setCycle((c) => c + 1);
      if (reglages.son) relancerSon();
      tenir(await garderEcran());
    };
    document.addEventListener('visibilitychange', retour);
    return () => {
      clearInterval(minuterie);
      document.removeEventListener('visibilitychange', retour);
      if (verrou.current) { verrou.current.release().catch(() => {}); verrou.current = null; }
      suspendreSon();
      // Fin de la respiration (au bout, « Arrêter », ou l'écran quitté) : la séance, si elle passe la règle.
      const dureeMs = dureeEnMs(reglages.duree);
      const ecoule = Math.min(performance.now() - debut.current, dureeMs);
      const fin = { dureeS: ecoule / 1000, terminee: ecoule >= dureeMs };
      seance.noter(fin);
      if (origine && doitEnregistrer(fin)) setNotee(true);
    };
  }, [enCours]);
  // `dansToucher` : appelé par le toucher de « Commencer », où le contexte audio peut s'amorcer.
  const commencer = (dansToucher) => {
    debut.current = performance.now();
    derniere.current = null;
    seance.commencer();
    setNotee(false);
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
  const texte = phase === 'inspire' ? 'Inspire' : phase === 'expire' ? 'Expire'
    : !reglages ? '' : phase === 'fini' ? texteFin(duree) : texteAvant(duree);
  const classeCercle = ['cercle-respiration', enCours && 'en-cours', enCours && `phase-${phase}`, reglages && reglages.rythme === '4-6' && 'rythme-4-6']
    .filter(Boolean).join(' ');
  return html`<section class="respiration" aria-label="Cohérence cardiaque">
    <div key=${cycle} class=${classeCercle} aria-hidden="true"><span></span></div>
    <p class="phase-respiration" aria-live="polite">${texte}</p>
    ${enCours
      ? html`<button type="button" class="btn" onClick=${() => setPhase(null)}>Arrêter</button>`
      : html`<button type="button" class="btn btn-plein" disabled=${!reglages} onClick=${() => commencer(true)}>${Icones.respiration()}${phase === 'fini' ? 'Recommencer' : 'Commencer'}</button>`}
    ${!enCours && notee && apres}
  </section>`;
}
