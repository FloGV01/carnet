// Respiration guidée (v6) : cercle, mots « Inspire » / « Expire », signal sonore facultatif. Partagée
// entre « Moment difficile » et « Me ressourcer ». La durée, le rythme et le signal se règlent dans
// Réglages › Moment difficile (méta `respiration`). Rien n'y est calculé ni compté.
import { html, useEffect, useRef, useState } from '../lib.js';
import { repo } from '../../donnees.js';
import { Icones } from '../icones.js';
import { CYCLE_MS, dureeEnMs, normaliserRespiration, phaseRespiration, texteAvant, texteFin } from '../../domain/respiration.js';

// L'écran reste allumé pendant l'exercice si l'iPhone le permet (Wake Lock), sinon tant pis.
async function garderEcran() {
  try { return navigator.wakeLock ? await navigator.wakeLock.request('screen') : null; } catch { return null; }
}

// Signal sonore : un oscillateur doux au début de chaque phase, plus grave à l'expiration. Le contexte
// Web Audio est créé dans le toucher qui lance l'exercice (iOS n'en accepte pas ailleurs). Web Audio suit
// la session audio « ambiante » d'iOS : le son se tait en mode silencieux et se mêle à la musique. Pas
// d'élément <audio>, qui jouerait malgré le mode silencieux.
const FREQUENCE = { inspire: 440, expire: 330, fini: 330 };
const DUREE_NOTE_S = 0.7;

function reprendre(contexte) {
  try { contexte.resume().catch(() => {}); } catch { /* facultatif */ }
}

function ouvrirSignal() {
  try {
    const Contexte = window.AudioContext || window.webkitAudioContext;
    if (!Contexte) return null;
    const contexte = new Contexte();
    reprendre(contexte);
    return contexte;
  } catch { return null; }
}

function sonner(contexte, phase) {
  try {
    const t = contexte.currentTime;
    const oscillateur = contexte.createOscillator();
    const volume = contexte.createGain();
    oscillateur.type = 'sine';
    oscillateur.frequency.value = FREQUENCE[phase];
    volume.gain.setValueAtTime(0.0001, t);
    volume.gain.linearRampToValueAtTime(0.12, t + 0.06);
    volume.gain.exponentialRampToValueAtTime(0.0001, t + DUREE_NOTE_S);
    oscillateur.connect(volume);
    volume.connect(contexte.destination);
    oscillateur.start(t);
    oscillateur.stop(t + DUREE_NOTE_S + 0.05);
  } catch { /* facultatif : un son qui échoue ne gêne pas l'exercice */ }
}

// `demarrerTout` : l'exercice part dès que les réglages sont lus, sans toucher (« Me ressourcer »).
export function Respiration({ demarrerTout = false }) {
  const [reglages, setReglages] = useState(null);
  const [phase, setPhase] = useState(null);
  const [cycle, setCycle] = useState(0);
  const debut = useRef(0);
  const verrou = useRef(null);
  const signal = useRef(null);
  const derniere = useRef(null);
  const lance = useRef(false);
  useEffect(() => { repo.meta.lire('respiration').then((v) => setReglages(normaliserRespiration(v))); }, []);
  const enCours = phase === 'inspire' || phase === 'expire';
  const actif = useRef(false);
  actif.current = enCours;
  // Un verrou obtenu après l'arrêt de l'exercice est rendu tout de suite.
  const tenir = (v) => { if (v && !actif.current) { v.release().catch(() => {}); return; } verrou.current = v; };
  // Une note à chaque changement de phase, y compris la fin.
  const annoncer = (p) => {
    if (p === derniere.current) return;
    derniere.current = p;
    if (signal.current) sonner(signal.current, p);
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
      if (signal.current) reprendre(signal.current);
      tenir(await garderEcran());
    };
    document.addEventListener('visibilitychange', retour);
    return () => {
      clearInterval(minuterie);
      document.removeEventListener('visibilitychange', retour);
      if (verrou.current) { verrou.current.release().catch(() => {}); verrou.current = null; }
      // Le contexte reste ouvert un instant pour laisser sonner la dernière note.
      const contexte = signal.current;
      signal.current = null;
      if (contexte) setTimeout(() => { try { contexte.close().catch(() => {}); } catch { /* déjà fermé */ } }, 1000);
    };
  }, [enCours]);
  const commencer = () => {
    debut.current = performance.now();
    derniere.current = null;
    signal.current = reglages.son ? ouvrirSignal() : null;
    setPhase('inspire');
    annoncer('inspire');
    actif.current = true;
    garderEcran().then(tenir);
  };
  useEffect(() => {
    if (!demarrerTout || !reglages || lance.current) return;
    lance.current = true;
    commencer();
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
      : html`<button type="button" class="btn btn-plein" disabled=${!reglages} onClick=${commencer}>${Icones.respiration()}${phase === 'fini' ? 'Recommencer' : 'Commencer'}</button>`}
  </section>`;
}
