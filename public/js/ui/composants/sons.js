// Sons du lecteur de Bien-être (v8, spec §5) : des bols et un souffle, fabriqués par Web Audio dans l'app, sans fichier ni
// réseau. Ils passent par le contexte unique de signal-sonore.js, préparé dans un toucher (`preparerSon()`), et sont
// calés sur son horloge (`currentTime`), pas sur un minuteur :
// - un bol de début, d'environ 4 s ; un bol de changement d'étape, plus court et plus doux, joué avant la voix ;
// - trois bols de fin ;
// - v10, pour les deux minuteurs : un seul bol, le même au début et à la fin, et un bol d'intervalle, le plus doux. Ils se
//   programment à l'avance (`dansS`), sur l'horloge audio, comme le souffle : la pause et la sortie les annulent (`couper`) ;
// - le souffle : un bruit doux, filtré, qui monte pendant l'inspiration (v10 : et pendant la petite inspiration du soupir,
//   plus claire) et redescend à l'expiration ; rien pendant « Retiens ».
// Doux, courts, jamais surprenants : une attaque adoucie, aucun son fort. Sans contexte (son « Aucun », ou rien préparé),
// rien ne joue. Les écrans de crise (Moment difficile, « Respirer », et le lecteur en mode `crise`) ne jouent rien de ce module
// (spec §12.1) : seulement le signal sonore de signal-sonore.js.
import { quandSonPret } from './signal-sonore.js';

// La fréquence de base de chaque bol, en Hz : les tests reconnaissent un bol à elle.
export const BOLS = Object.freeze({ debut: 196, etape: 294, intervalle: 349, fin: Object.freeze([262, 233, 196]) });
// Les trois bols de fin se suivent à 1,2 s d'écart ; le dernier s'éteint avant la fermeture du lecteur (6 s).
export const ECART_FIN_S = 1.2;
// Un bol chanté : des partiels inharmoniques [rapport, amplitude, part de la durée], chacun doublé d'un oscillateur à peine
// désaccordé, qui le fait battre doucement.
const PARTIELS = [[1, 1, 1], [2.71, 0.4, 0.6], [5.15, 0.15, 0.35]];
const BATTEMENT_HZ = 0.7;
const ATTAQUE_S = 0.03;
const VOLUME_SOUFFLE = 0.18;
const SILENCE = 0.0001;
const PHASES_SONORES = new Set(['inspire', 'inspire-encore', 'expire']);

// Les sons qui jouent ou vont jouer : { c, gain, sources, finS, souffle }. La pause, l'arrière-plan et la sortie les coupent.
const vivants = new Set();
const garder = (v) => {
  for (const x of vivants) if (x.c !== v.c || x.finS < v.c.currentTime) vivants.delete(x);
  vivants.add(v);
};

function bol(c, t, { frequence, dureeS, volume }) {
  try {
    const sortie = c.createGain();
    sortie.gain.setValueAtTime(volume, t);
    sortie.connect(c.destination);
    const sources = [];
    for (const [rapport, amplitude, part] of PARTIELS) {
      for (const ecart of [0, BATTEMENT_HZ]) {
        const o = c.createOscillator();
        const g = c.createGain();
        const fin = t + dureeS * part;
        o.type = 'sine';
        o.frequency.value = frequence * rapport + ecart;
        g.gain.setValueAtTime(SILENCE, t);
        g.gain.linearRampToValueAtTime(amplitude / 2, t + ATTAQUE_S);
        g.gain.exponentialRampToValueAtTime(SILENCE, fin);
        o.connect(g);
        g.connect(sortie);
        o.start(t);
        o.stop(fin + 0.05);
        sources.push(o);
      }
    }
    garder({ c, gain: sortie, sources, finS: t + dureeS, souffle: false });
  } catch { /* facultatif : un son qui échoue ne gêne pas l'exercice */ }
}

// Deux secondes de bruit rose (approximation de Paul Kellet), plus doux qu'un bruit blanc, jouées en boucle.
let bruitPret = null;
function bruit(c) {
  if (bruitPret && bruitPret.c === c) return bruitPret.buffer;
  const n = Math.round(c.sampleRate * 2);
  const buffer = c.createBuffer(1, n, c.sampleRate);
  const d = buffer.getChannelData(0);
  let [b0, b1, b2] = [0, 0, 0];
  for (let i = 0; i < n; i += 1) {
    const blanc = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + blanc * 0.099046;
    b1 = 0.963 * b1 + blanc * 0.2965164;
    b2 = 0.57 * b2 + blanc * 1.0526913;
    d[i] = (b0 + b1 + b2 + blanc * 0.1848) * 0.2;
  }
  bruitPret = { c, buffer };
  return buffer;
}

// L'inspiration s'éclaircit et enfle jusqu'aux quatre cinquièmes, puis s'efface ; l'expiration enfle vite et redescend
// en s'assombrissant. Les deux finissent en silence : rien ne déborde sur un « Retiens ».
function souffleSur(c, t0, dureeS, phase) {
  try {
    const t1 = t0 + dureeS;
    const encore = phase === 'inspire-encore';
    const inspire = phase === 'inspire' || encore;
    const source = c.createBufferSource();
    source.buffer = bruit(c);
    source.loop = true;
    const filtre = c.createBiquadFilter();
    filtre.type = 'lowpass';
    filtre.Q.value = 0.5;
    filtre.frequency.setValueAtTime(encore ? 700 : inspire ? 380 : 1000, t0);
    filtre.frequency.linearRampToValueAtTime(encore ? 1300 : inspire ? 1100 : 340, t1);
    const g = c.createGain();
    g.gain.setValueAtTime(SILENCE, t0);
    g.gain.linearRampToValueAtTime(VOLUME_SOUFFLE, t0 + dureeS * (inspire ? 0.8 : 0.15));
    g.gain.linearRampToValueAtTime(SILENCE, t1);
    source.connect(filtre);
    filtre.connect(g);
    g.connect(c.destination);
    source.start(t0, Math.random() * 1.5);
    source.stop(t1 + 0.02);
    garder({ c, gain: g, sources: [source], finS: t1, souffle: true });
  } catch { /* facultatif */ }
}

// Coupe les sons choisis en 40 ms environ (sans claquement), même ceux programmés pour plus tard.
function couper(choisir) {
  for (const v of [...vivants]) {
    if (!choisir(v)) continue;
    vivants.delete(v);
    try {
      const t = v.c.currentTime;
      const p = v.gain.gain;
      if (typeof p.cancelAndHoldAtTime === 'function') p.cancelAndHoldAtTime(t); else p.cancelScheduledValues(t);
      p.setTargetAtTime(0, t, 0.04);
      for (const s of v.sources) { try { s.stop(t + 0.2); } catch { /* déjà arrêtée */ } }
    } catch { /* facultatif */ }
  }
}

const maintenant = (c) => c.currentTime + 0.02;
// Le bol d'un minuteur s'éteint en ce temps-là : on laisse le contexte éveillé jusque-là (suspendreSon).
export const DUREE_BOL_MINUTEUR_S = 4.2;
const plusTard = (c, dansS) => maintenant(c) + Math.max(0, dansS);
export const sons = {
  bolDebut: () => quandSonPret((c) => bol(c, maintenant(c), { frequence: BOLS.debut, dureeS: 4.2, volume: 0.2 })),
  bolEtape: () => quandSonPret((c) => bol(c, maintenant(c), { frequence: BOLS.etape, dureeS: 2.2, volume: 0.1 })),
  bolsFin: () => quandSonPret((c) => BOLS.fin.forEach((f, i) => bol(c, maintenant(c) + i * ECART_FIN_S, { frequence: f, dureeS: 3.4, volume: 0.16 }))),
  // Le bol d'un minuteur et celui de l'intervalle, `dansS` secondes après maintenant.
  bolMinuteur: ({ dansS = 0 } = {}) => quandSonPret((c) => bol(c, plusTard(c, dansS), { frequence: BOLS.debut, dureeS: DUREE_BOL_MINUTEUR_S, volume: 0.2 })),
  bolIntervalle: ({ dansS = 0 } = {}) => quandSonPret((c) => bol(c, plusTard(c, dansS), { frequence: BOLS.intervalle, dureeS: 2.2, volume: 0.07 })),
  // Une phase du souffle, `dansS` secondes après maintenant, pendant `dureeS` : seulement une inspiration ou une expiration.
  souffle: ({ phase, dureeS, dansS = 0 }) => {
    if (!PHASES_SONORES.has(phase) || !(dureeS >= 0.3)) return;
    quandSonPret((c) => souffleSur(c, maintenant(c) + Math.max(0, dansS), dureeS, phase));
  },
  couperSouffle: () => couper((v) => v.souffle),
  couper: () => couper(() => true),
};
