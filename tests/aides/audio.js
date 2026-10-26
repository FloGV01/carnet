// Faux contexte Web Audio pour les tests de navigateur (respiration, signal sonore, sons du lecteur), comme celui d'iOS :
// il naît « suspendu » et ne tourne qu'une fois `resume()` résolu. Il compte les contextes créés, les notes jouées (la
// fréquence de chaque oscillateur), les reprises, les mises en veille et les fermetures. Pour chaque contexte créé,
// `montees` dit si la respiration était déjà à l'écran : un appelant qui prépare le son dans son toucher le crée avant.
// v8 : son horloge (`currentTime`) suit celle de la page (performance.now, que l'horloge factice de Playwright fait
// avancer) ; `oscillateurs` garde la fréquence et l'instant de départ de chacun (un bol en fait plusieurs, au même
// instant), `souffles` le début et la fin de chaque souffle (une source de bruit en boucle), sa fin ramenée à l'instant
// où il est coupé.
// `window.__audioCtl.interrompre()` le suspend et fait attendre les reprises (écran verrouillé), `liberer()` les laisse
// aboutir. Avec `session`, `navigator.audioSession` existe (Safari 16.4 et plus).
export const espionnerAudio = (page, { session = false } = {}) => page.evaluate((avecSession) => {
  const j = { contextes: 0, notes: [], oscillateurs: [], souffles: [], reprises: 0, suspensions: 0, fermes: 0, montees: [] };
  const attentes = [];
  let retenu = false;
  let dernier = null;
  window.__audio = j;
  window.__audioCtl = {
    etat: () => (dernier ? dernier.state : null),
    interrompre: () => { retenu = true; dernier.state = 'suspended'; },
    liberer: () => { retenu = false; attentes.splice(0).forEach((reprendre) => reprendre()); },
  };
  const parametre = (value = 0) => ({
    value, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {},
    cancelScheduledValues() {}, cancelAndHoldAtTime() {},
  });
  const maintenant = () => performance.now() / 1000;
  class FauxContexte {
    constructor() { j.contextes += 1; j.montees.push(Boolean(document.querySelector('.respiration'))); this.state = 'suspended'; this.sampleRate = 8000; this.destination = {}; dernier = this; }
    get currentTime() { return maintenant(); }
    createGain() { return { gain: parametre(1), connect() {}, disconnect() {} }; }
    createOscillator() {
      const o = {
        type: '', frequency: parametre(0), connect() {}, disconnect() {}, stop() {},
        start(t) { j.notes.push(o.frequency.value); j.oscillateurs.push({ f: o.frequency.value, t: t ?? maintenant() }); },
      };
      return o;
    }
    createBiquadFilter() { return { type: '', frequency: parametre(350), Q: parametre(1), connect() {}, disconnect() {} }; }
    createBuffer(canaux, longueur, taux) { const d = new Float32Array(longueur); return { numberOfChannels: canaux, length: longueur, sampleRate: taux, getChannelData: () => d }; }
    createBufferSource() {
      const s = {
        buffer: null, loop: false, connect() {}, disconnect() {},
        start(t) { s.i = j.souffles.push({ t: t ?? maintenant(), fin: null }) - 1; },
        stop(t) { const x = j.souffles[s.i]; if (x) x.fin = x.fin == null ? t : Math.min(x.fin, t); },
      };
      return s;
    }
    resume() {
      j.reprises += 1;
      const tourner = () => { this.state = 'running'; };
      if (retenu) return new Promise((ok) => attentes.push(() => { tourner(); ok(); }));
      return Promise.resolve().then(tourner);
    }
    suspend() { j.suspensions += 1; this.state = 'suspended'; return Promise.resolve(); }
    close() { j.fermes += 1; this.state = 'closed'; return Promise.resolve(); }
  }
  window.AudioContext = FauxContexte;
  window.webkitAudioContext = FauxContexte;
  if (avecSession) Object.defineProperty(navigator, 'audioSession', { configurable: true, value: { type: 'auto' } });
}, session);
export const audio = (page) => page.evaluate(() => ({ ...window.__audio, etat: window.__audioCtl.etat(), session: navigator.audioSession ? navigator.audioSession.type : null }));
export const notes = (page) => page.evaluate(() => window.__audio.notes.length);
