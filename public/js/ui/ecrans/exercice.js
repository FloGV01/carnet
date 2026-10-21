// Un exercice de Bien-être (v7, spec §6.2) : plein écran, sans onglets. D'abord sa description et « Commencer » ; puis une
// consigne par écran, comme « Une chose à la fois », avec « Précédent », « Suivant » et « Terminer », et un minuteur
// discret (le temps qui reste à l'étape). Aucun repère de position : rien n'est compté.
// - Lecture à voix haute (synthèse vocale de l'iPhone, voix française du système, hors ligne) : éteinte au départ, réglage
//   gardé sur cet appareil ; sans voix française, l'option ne s'affiche pas. Voix allumée, une étape passe seule à la
//   suivante à la fin de sa durée, la dernière finit l'exercice ; voix éteinte, on avance avec « Suivant ».
// - L'écran reste allumé pendant l'exercice (verrou d'écran), rendu à la fin, en pause et à la sortie.
// - En arrière-plan, écran verrouillé ou page cachée : pause, voix coupée, verrou rendu ; « Reprendre » repart de l'étape.
// - Séance (ui/seance.js) : menée au bout, ou arrêtée après 60 s, une seule par exercice lancé, d'origine `bien-etre`.
//   La durée est celle de l'exercice actif, pauses exclues. En fin d'exercice, le lien discret « Noter mon émotion ».
// Les premières paroles partent d'un toucher (« Commencer », « Suivant », l'interrupteur) : Safari ne parle qu'après un geste.
import { html, useEffect, useReducer, useRef, useState } from '../lib.js';
import { CadreParcours } from '../composants/parcours.js';
import { Interrupteur } from '../composants/interrupteur.js';
import { Icones } from '../icones.js';
import { lireLocal, ecrireLocal } from '../hooks.js';
import { garderEcran, useSeance } from '../seance.js';
import { NoterEmotion } from './bien-etre.js';
import { exerciceDe, pourAffichage } from '../../domain/exercices.js';

export const CLE_VOIX = 'carnet:exercice:voix';
const FIN = 'Fin de l\'exercice.';
const TIC_MS = 250;

// La voix française du système (fr-FR d'abord), ou null : sans synthèse vocale ni voix française, pas de lecture.
function voixFrancaise() {
  try {
    const s = window.speechSynthesis;
    if (!s || typeof window.SpeechSynthesisUtterance !== 'function') return null;
    const fr = (s.getVoices() || []).filter((v) => v && /^fr([-_]|$)/i.test(v.lang || '') && v.localService !== false);
    return fr.find((v) => /^fr[-_]fr$/i.test(v.lang)) || fr[0] || null;
  } catch { return null; }
}

// Les voix arrivent parfois après le premier rendu (événement voiceschanged).
function useVoixFrancaise() {
  const [voix, setVoix] = useState(voixFrancaise);
  useEffect(() => {
    const s = window.speechSynthesis;
    if (!s || typeof s.addEventListener !== 'function') return undefined;
    const maj = () => setVoix(voixFrancaise());
    s.addEventListener('voiceschanged', maj);
    return () => s.removeEventListener('voiceschanged', maj);
  }, []);
  return voix;
}

// « 1:05 », « 0:09 » : le temps qui reste à l'étape, jamais négatif.
const minuteur = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

function Deroule({ ex }) {
  const [etat, setEtat] = useState('avant'); // 'avant', 'en-cours', 'pause', 'fin'
  const [place, setPlace] = useState(0);
  const [voixVoulue, setVoixVoulue] = useState(() => lireLocal(CLE_VOIX, false) === true);
  const [, tic] = useReducer((n) => n + 1, 0);
  const voix = useVoixFrancaise();
  const lecture = voixVoulue && voix != null;
  const seance = useSeance(ex.id, 'bien-etre');
  // Le temps d'exercice actif, en ms : cumulé aux pauses, compté depuis `depuis` quand l'exercice tourne.
  const temps = useRef({ cumul: 0, depuis: null, debutEtape: 0 });
  const verrou = useRef(null);
  const parle = useRef(false);
  // L'état courant, pour les gestionnaires installés une fois (page cachée, sortie).
  const courant = useRef({});
  courant.current = { etat, place, lecture };
  const derniere = place === ex.etapes.length - 1;
  const etape = ex.etapes[place];

  const ecoule = () => temps.current.cumul + (temps.current.depuis == null ? 0 : performance.now() - temps.current.depuis);
  const restant = () => (etape.dureeS == null ? null : etape.dureeS * 1000 - (ecoule() - temps.current.debutEtape));
  const arreterTemps = () => { temps.current.cumul = ecoule(); temps.current.depuis = null; };

  const dire = (texte) => {
    try {
      const s = window.speechSynthesis;
      s.cancel();
      const u = new window.SpeechSynthesisUtterance(texte);
      u.lang = voix.lang;
      u.voice = voix;
      s.speak(u);
      parle.current = true;
    } catch { /* pas de voix : l'exercice continue en silence */ }
  };
  const couperVoix = () => { if (!parle.current) return; try { window.speechSynthesis.cancel(); } catch { /* rien à couper */ } };
  const rendreVerrou = () => { if (verrou.current) { verrou.current.release().catch(() => {}); verrou.current = null; } };
  // Un verrou obtenu après la pause ou la fin est rendu tout de suite.
  const tenir = (v) => { if (v && courant.current.etat !== 'en-cours') { v.release().catch(() => {}); return; } if (v) verrou.current = v; };
  const noter = (terminee) => seance.noter({ dureeS: ecoule() / 1000, terminee });

  const aller = (n, lire = lecture) => {
    temps.current.debutEtape = ecoule();
    setPlace(n);
    if (lire) dire(ex.etapes[n].texte);
  };
  const commencer = () => {
    seance.commencer();
    temps.current = { cumul: 0, depuis: performance.now(), debutEtape: 0 };
    courant.current.etat = 'en-cours';
    setEtat('en-cours');
    setPlace(0);
    if (lecture) dire(ex.etapes[0].texte);
    garderEcran().then(tenir);
  };
  const terminer = (auto = false) => {
    arreterTemps();
    courant.current.etat = 'fin';
    setEtat('fin');
    rendreVerrou();
    if (auto && lecture) dire(FIN); else couperVoix();
    noter(derniere);
  };
  // Pause : à la page cachée ou à l'app en arrière-plan. La séance est notée dès maintenant si elle passe la règle (l'app
  // peut ne jamais revenir) ; reprise et finie, elle reste la même séance.
  const pause = () => {
    if (courant.current.etat !== 'en-cours') return;
    arreterTemps();
    courant.current.etat = 'pause';
    setEtat('pause');
    couperVoix();
    rendreVerrou();
    noter(false);
  };
  const reprendre = () => {
    temps.current.depuis = performance.now();
    courant.current.etat = 'en-cours';
    setEtat('en-cours');
    if (lecture) dire(etape.texte);
    garderEcran().then(tenir);
  };
  const changerVoix = (v) => {
    setVoixVoulue(v);
    ecrireLocal(CLE_VOIX, v || null);
    if (!v) { couperVoix(); return; }
    // Allumée pendant l'exercice : l'étape est lue et son temps repart, pour avancer seule à la fin de sa lecture.
    if (etat === 'en-cours' && voix) aller(place, true);
  };

  // Le minuteur : redessiné à chaque tic ; voix allumée, l'étape écoulée passe à la suivante.
  useEffect(() => {
    if (etat !== 'en-cours') return undefined;
    const m = setInterval(() => {
      // Un tic d'avant le nouveau rendu (pause, fin) ne fait rien.
      if (courant.current.etat !== 'en-cours') return;
      tic();
      const r = restant();
      if (!lecture || r == null || r > 0) return;
      if (derniere) terminer(true); else aller(place + 1);
    }, TIC_MS);
    return () => clearInterval(m);
  }, [etat, place, lecture]);

  // Page cachée (écran verrouillé, autre app) ou quittée : pause.
  useEffect(() => {
    const cachee = () => { if (document.visibilityState === 'hidden') pause(); };
    document.addEventListener('visibilitychange', cachee);
    window.addEventListener('pagehide', pause);
    return () => { document.removeEventListener('visibilitychange', cachee); window.removeEventListener('pagehide', pause); };
  }, []);
  // Sortie (« Fermer », un autre écran) : voix coupée, verrou rendu, séance notée si elle passe la règle.
  useEffect(() => () => {
    const { etat: e } = courant.current;
    if (e === 'en-cours' || e === 'pause') { arreterTemps(); noter(false); }
    courant.current.etat = 'sortie';
    rendreVerrou();
    couperVoix();
  }, []);

  const interrupteur = voix && html`<div class="voix-exercice">
    <span class="voix-libelle" aria-hidden="true">Lecture à voix haute</span>
    <${Interrupteur} etiquette="Lecture à voix haute" actif=${voixVoulue} surChanger=${changerVoix} />
  </div>`;
  const fermer = () => { location.hash = '#/bien-etre'; };

  let corps;
  let pied;
  if (etat === 'avant') {
    corps = html`<div class="exercice-avant">
      <p class="exercice-intro">${pourAffichage(ex.description)}</p>
      <p class="texte-secondaire">${`Environ ${ex.dureeMin}\u00a0minute${ex.dureeMin > 1 ? 's' : ''}.`}</p>
      ${voix && html`<p class="texte-secondaire">${pourAffichage('Voix allumée, les étapes avancent seules. Voix éteinte, tu avances avec « Suivant ».')}</p>`}
    </div>`;
    pied = html`<div class="actions-exercice"><button type="button" class="btn btn-teinte large" onClick=${commencer}>${Icones.lecture()}Commencer</button></div>`;
  } else if (etat === 'fin') {
    corps = html`<div class="exercice-fin">
      <p class="exercice-texte">${FIN}</p>
      <${NoterEmotion} />
    </div>`;
    pied = html`<div class="actions-exercice"><button type="button" class="btn large" onClick=${fermer}>Revenir à Bien-être</button></div>`;
  } else {
    const r = restant();
    corps = html`<section class="exercice-etape" aria-live="polite" aria-atomic="true">
      <p class="exercice-texte">${pourAffichage(etape.texte)}</p>
      ${etat === 'pause' ? html`<p class="minuteur-etape">En pause</p>`
        : r != null && html`<p class="minuteur-etape" role="timer" aria-label="Temps de l'étape">${minuteur(r)}</p>`}
    </section>`;
    pied = html`<div class="actions-exercice">
      ${etat === 'pause'
        ? html`<button type="button" class="btn btn-teinte large" onClick=${reprendre}>${Icones.lecture()}Reprendre</button>`
        : html`<button type="button" class="btn" disabled=${place === 0} onClick=${() => aller(place - 1)}>${Icones.retour({ trait: 2 })}Précédent</button>
          ${derniere ? html`<button type="button" class="btn btn-plein" onClick=${() => terminer()}>Terminer</button>`
            : html`<button type="button" class="btn btn-plein" onClick=${() => aller(place + 1)}>Suivant${Icones.chevron({ trait: 2 })}</button>`}`}
      ${(etat === 'pause' || !derniere) && html`<button type="button" class="btn-lien terminer-exercice" onClick=${() => terminer()}>Terminer</button>`}
    </div>`;
  }
  return html`<${CadreParcours} titre=${ex.titre} teinte="bien-etre" icone="bienEtre" surFermer=${fermer} droite=${interrupteur} pied=${pied}>
    <div class="exercice">${corps}</div>
  </${CadreParcours}>`;
}

// id : l'identifiant d'un exercice (la route en accepte d'autres : un exercice inconnu ramène à Bien-être).
export function Exercice({ id }) {
  const ex = exerciceDe(id);
  useEffect(() => { if (!ex) location.hash = '#/bien-etre'; }, [ex]);
  return ex ? html`<${Deroule} ex=${ex} />` : null;
}
