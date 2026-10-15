// Faux contexte Web Audio pour les tests de navigateur (respiration, signal sonore), comme celui d'iOS :
// il naît « suspendu » et ne tourne qu'une fois `resume()` résolu. Il compte les contextes créés, les notes
// jouées (avec leur fréquence), les reprises, les mises en veille et les fermetures. Pour chaque contexte créé,
// `montees` dit si la respiration était déjà à l'écran : un appelant qui prépare le son dans son toucher le crée avant.
// `window.__audioCtl.interrompre()` le suspend et fait attendre les reprises (écran verrouillé), `liberer()` les laisse
// aboutir. Avec `session`, `navigator.audioSession` existe (Safari 16.4 et plus).
export const espionnerAudio = (page, { session = false } = {}) => page.evaluate((avecSession) => {
  const j = { contextes: 0, notes: [], reprises: 0, suspensions: 0, fermes: 0, montees: [] };
  const attentes = [];
  let retenu = false;
  let dernier = null;
  window.__audio = j;
  window.__audioCtl = {
    etat: () => (dernier ? dernier.state : null),
    interrompre: () => { retenu = true; dernier.state = 'suspended'; },
    liberer: () => { retenu = false; attentes.splice(0).forEach((reprendre) => reprendre()); },
  };
  class FauxContexte {
    constructor() { j.contextes += 1; j.montees.push(Boolean(document.querySelector('.respiration'))); this.state = 'suspended'; this.currentTime = 0; this.destination = {}; dernier = this; }
    createGain() { return { gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
    createOscillator() {
      const o = { type: '', frequency: { value: 0 }, connect() {}, stop() {}, start() { j.notes.push(o.frequency.value); } };
      return o;
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
