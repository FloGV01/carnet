// Signal sonore de la respiration (v6) : un oscillateur doux au début de chaque phase, plus grave à
// l'expiration. Web Audio, sans fichier ni élément <audio> (qui jouerait malgré le mode silencieux).
//
// Un seul contexte pour toute l'app. iOS ne laisse démarrer un contexte que dans un geste : l'appelant
// l'amorce avec `preparerSon()` dans le gestionnaire du toucher qui lance la respiration (« Commencer »,
// « Respirer »), de façon synchrone, avant toute lecture asynchrone. Rien ne le crée ailleurs. Le contexte
// n'est jamais fermé : il se met en veille à la fin de l'exercice et se relance au toucher suivant.
// Web Audio suit la session audio « ambiante » d'iOS : le son se tait en mode silencieux et se mêle à la
// musique. Quand Safari propose `navigator.audioSession`, elle est réglée sur « ambient » pendant l'exercice.
// v8 : le même contexte sert aux sons du lecteur de Bien-être (sons.js). Le lecteur peut demander la session « playback »
// (« Jouer même en mode silencieux », qui met la musique en pause) ; les écrans de crise gardent « ambient » (spec §12.1).
const FREQUENCE = { inspire: 440, expire: 330, fini: 330 };
const DUREE_NOTE_S = 0.7;
// Le temps de laisser finir la dernière note avant de mettre le contexte en veille.
const VEILLE_APRES_MS = 1000;
// Une note qui attend la reprise du contexte ne sonne plus passé ce délai : elle ne dirait plus la phase en cours.
const NOTE_PERIMEE_MS = 1000;

let contexte = null;
let veille = null;
let enAttente = null;

const annulerVeille = () => { clearTimeout(veille); veille = null; };

// Toujours une promesse, jamais d'erreur : le son est facultatif.
function reprendre(c) {
  try { return Promise.resolve(c.resume()).catch(() => {}); } catch { return Promise.resolve(); }
}

function reglerSession(type) {
  try { if (navigator.audioSession) navigator.audioSession.type = type; } catch { /* facultatif */ }
}

// À appeler dans le toucher qui lance la respiration. Idempotent : crée le contexte la première fois,
// le relance ensuite (il dort après chaque exercice). `session` : 'ambient' (par défaut) ou 'playback'.
export function preparerSon({ session = 'ambient' } = {}) {
  annulerVeille();
  reglerSession(session === 'playback' ? 'playback' : 'ambient');
  try {
    if (!contexte || contexte.state === 'closed') {
      const Contexte = window.AudioContext || window.webkitAudioContext;
      if (!Contexte) return;
      contexte = new Contexte();
    }
    reprendre(contexte);
  } catch { /* facultatif */ }
}

function jouer(c, phase) {
  try {
    const t = c.currentTime;
    const oscillateur = c.createOscillator();
    const volume = c.createGain();
    oscillateur.type = 'sine';
    oscillateur.frequency.value = FREQUENCE[phase];
    volume.gain.setValueAtTime(0.0001, t);
    volume.gain.linearRampToValueAtTime(0.12, t + 0.06);
    volume.gain.exponentialRampToValueAtTime(0.0001, t + DUREE_NOTE_S);
    oscillateur.connect(volume);
    volume.connect(c.destination);
    oscillateur.start(t);
    oscillateur.stop(t + DUREE_NOTE_S + 0.05);
  } catch { /* facultatif : un son qui échoue ne gêne pas l'exercice */ }
}

// Une note, au changement de phase. Sans contexte préparé, rien ne sonne. Si le contexte dort (iOS
// l'interrompt écran verrouillé), on ne programme rien : les notes se seraient empilées et seraient parties
// toutes ensemble à la reprise. Seule la dernière attend la reprise, et seulement si elle est encore fraîche.
export function sonner(phase) {
  const c = contexte;
  if (!c) return;
  annulerVeille();
  if (c.state === 'running') { jouer(c, phase); return; }
  enAttente = { phase, instant: performance.now() };
  reprendre(c).then(() => {
    const note = enAttente;
    enAttente = null;
    if (note && c.state === 'running' && performance.now() - note.instant < NOTE_PERIMEE_MS) jouer(c, note.phase);
  });
}

// Au retour au premier plan pendant un exercice avec le signal.
export function relancerSon() {
  if (contexte) reprendre(contexte);
}

// Le contexte préparé, pour les sons du lecteur (sons.js) : `jouer(c)` tout de suite s'il tourne ; s'il dort encore (une
// reprise en cours), une seule fois à la reprise, et seulement si elle vient vite. Sans contexte, rien.
export function quandSonPret(jouerSon) {
  const c = contexte;
  if (!c || c.state === 'closed') return;
  annulerVeille();
  if (c.state === 'running') { jouerSon(c); return; }
  const instant = performance.now();
  reprendre(c).then(() => { if (c.state === 'running' && performance.now() - instant < NOTE_PERIMEE_MS) jouerSon(c); });
}

// Fin ou arrêt de l'exercice : le contexte dort après la dernière note, et la session audio est rendue à
// iOS (la dictée d'un mémo ne doit pas rester en session « ambiante »).
export function suspendreSon() {
  if (!contexte) return;
  annulerVeille();
  veille = setTimeout(() => {
    veille = null;
    enAttente = null;
    reglerSession('auto');
    try { Promise.resolve(contexte.suspend()).catch(() => {}); } catch { /* facultatif */ }
  }, VEILLE_APRES_MS);
}
