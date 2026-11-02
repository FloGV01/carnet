// Sons de fond (v10, spec §9.3 et §14) : bruit brun, bruit rose, vagues, pluie douce, fabriqués sur l'iPhone par Web Audio, sans
// fichier ni réseau, sans AudioWorklet ni élément <audio>.
// - Un son : un tampon de plus de 10 s, calculé une fois, dont la fin revient en fondu sur le début (le raccord ne s'entend
//   pas). Deux sources le jouent en boucle, une par oreille, à des vitesses à peine différentes : elles ne retombent ensemble
//   qu'après plusieurs minutes, et la répétition ne s'entend pas. Puis des filtres, et une houle lente (des oscillateurs
//   branchés sur les paramètres) : tout tourne dans le moteur audio, sans JavaScript, écran verrouillé compris.
// - La minuterie et ses 30 s de fondu sont programmées d'avance sur l'horloge audio, jamais par un minuteur de la page : iOS
//   suspend le JavaScript en arrière-plan.
// - Le volume (`regler`) et l'enveloppe (montée, fondus) ont chacun leur gain : l'un ne dérange pas l'autre.
// Un son vit sur son écran (spec §14.1) : l'écran le lance dans un toucher et l'arrête en se fermant. Le contexte est celui de
// signal-sonore.js ; rien ne passe par sons.js, dont la pause et la sortie du lecteur coupent tout.
import { contexteSon, preparerSon } from './signal-sonore.js';

export const SONS_DE_FOND = Object.freeze(['brun', 'rose', 'vagues', 'pluie']);
export const LIBELLES_FOND = Object.freeze({ brun: 'Bruit brun', rose: 'Bruit rose', vagues: 'Vagues', pluie: 'Pluie douce' });
export const FONDU_MINUTERIE_S = 30;
export const FONDU_SORTIE_S = 1.5;
const MONTEE_S = 1.5;
const RACCORD_S = 1;
const VITESSES = [1, 0.94];

const blanc = () => Math.random() * 2 - 1;

// Un bruit blanc intégré, avec une fuite vers 40 Hz : il ne dérive pas.
function bruitBrun(x, taux) {
  const fuite = Math.exp(-2 * Math.PI * 40 / taux);
  let b = 0;
  for (let i = 0; i < x.length; i += 1) {
    b = fuite * b + (1 - fuite) * blanc();
    x[i] = b;
  }
}

// Bruit rose (approximation de Paul Kellet, à sept termes).
function bruitRose(x) {
  let [b0, b1, b2, b3, b4, b5, b6] = [0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < x.length; i += 1) {
    const w = blanc();
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    x[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
}

// Un fond de bruit rose, et des gouttes intégrées au tampon : de brefs tintements amortis, rares, de forces inégales.
function pluieDouce(x, taux) {
  bruitRose(x);
  const gouttes = Math.round((x.length / taux) * 5);
  for (let g = 0; g < gouttes; g += 1) {
    const debut = Math.floor(Math.random() * x.length);
    const pulsation = (2 * Math.PI * (900 + Math.random() * 2400)) / taux;
    const amorti = (0.004 + Math.random() * 0.014) * taux;
    const force = 0.05 + Math.random() * Math.random() * 0.35;
    const fin = Math.min(x.length, debut + Math.round(amorti * 5));
    for (let i = debut; i < fin; i += 1) x[i] += force * Math.exp(-(i - debut) / amorti) * Math.sin(pulsation * (i - debut));
  }
}

// `force` : la force moyenne du tampon (efficace), pour que les quatre sons se valent à volume égal. `filtres` : [type, Hz],
// dans l'ordre. `houle` : les modulations, chacune un oscillateur lent [Hz, part du gain, Hz de coupure du dernier filtre] ; le
// gain de base est ce qui reste : le haut de la houle vaut 1.
const RECETTES = Object.freeze({
  brun: { dureeS: 13, fabriquer: bruitBrun, force: 0.3, filtres: [['highpass', 30], ['lowpass', 2400]], houle: [[0.067, 0.05, 0]] },
  rose: { dureeS: 11, fabriquer: bruitRose, force: 0.16, filtres: [['lowpass', 9000]], houle: [[0.053, 0.04, 0]] },
  vagues: { dureeS: 17, fabriquer: bruitRose, force: 0.36, filtres: [['lowpass', 650]], houle: [[0.083, 0.3, 350], [0.131, 0.15, 150]] },
  pluie: { dureeS: 15, fabriquer: pluieDouce, force: 0.19, filtres: [['highpass', 300], ['lowpass', 6000]], houle: [[0.047, 0.06, 0]] },
});

// Le tampon d'un son : `dureeS` secondes, et la seconde d'après revient en fondu sur le début. Sa première valeur est ainsi la
// suite exacte de sa dernière : la boucle n'a pas de saut.
export function fabriquerTampon(c, son) {
  const recette = RECETTES[son];
  const taux = c.sampleRate;
  const n = Math.round(recette.dureeS * taux);
  const raccord = Math.round(RACCORD_S * taux);
  const x = new Float32Array(n + raccord);
  recette.fabriquer(x, taux);
  const moyenne = x.reduce((somme, v) => somme + v, 0) / x.length;
  for (let i = 0; i < x.length; i += 1) x[i] -= moyenne;
  for (let i = 0; i < raccord; i += 1) {
    const a = ((i / raccord) * Math.PI) / 2;
    x[i] = x[i] * Math.sin(a) + x[n + i] * Math.cos(a);
  }
  let carres = 0;
  let crete = 0;
  for (let i = 0; i < n; i += 1) {
    carres += x[i] * x[i];
    crete = Math.max(crete, Math.abs(x[i]));
  }
  const gain = Math.min(recette.force / Math.sqrt(carres / n), 0.95 / crete);
  const tampon = c.createBuffer(1, n, taux);
  const d = tampon.getChannelData(0);
  for (let i = 0; i < n; i += 1) d[i] = x[i] * gain;
  return tampon;
}

// Seul le dernier tampon reste en mémoire (quelques Mo).
let dernier = null;
function tamponDe(c, son) {
  if (dernier && dernier.c === c && dernier.son === son) return dernier.tampon;
  dernier = { c, son, tampon: fabriquerTampon(c, son) };
  return dernier.tampon;
}

// Les nœuds d'un son, branchés sur `sortie` et partant à l'instant t0. Rend ce qu'il faudra arrêter.
function brancherFond(c, son, sortie, t0) {
  const recette = RECETTES[son];
  const tampon = tamponDe(c, son);
  const oreilles = c.createChannelMerger(2);
  const sources = VITESSES.map((vitesse, oreille) => {
    const source = c.createBufferSource();
    source.buffer = tampon;
    source.loop = true;
    source.playbackRate.value = vitesse;
    source.connect(oreilles, 0, oreille);
    source.start(t0, Math.random() * recette.dureeS);
    return source;
  });
  let suite = oreilles;
  let filtre = null;
  for (const [type, frequence] of recette.filtres) {
    filtre = c.createBiquadFilter();
    filtre.type = type;
    filtre.frequency.value = frequence;
    filtre.Q.value = 0.5;
    suite.connect(filtre);
    suite = filtre;
  }
  const houle = c.createGain();
  houle.gain.value = 1 - recette.houle.reduce((somme, [, part]) => somme + part, 0);
  const lents = recette.houle.map(([hz, part, coupure]) => {
    const lent = c.createOscillator();
    lent.frequency.value = hz;
    const versGain = c.createGain();
    versGain.gain.value = part;
    lent.connect(versGain);
    versGain.connect(houle.gain);
    if (coupure) {
      const versCoupure = c.createGain();
      versCoupure.gain.value = coupure;
      lent.connect(versCoupure);
      versCoupure.connect(filtre.frequency);
    }
    lent.start(t0);
    return lent;
  });
  suite.connect(houle);
  houle.connect(sortie);
  return [...sources, ...lents];
}

// Le curseur suit l'oreille : son carré.
const gainDe = (volume) => { const v = Math.min(1, Math.max(0, Number(volume) || 0)); return v * v; };

// Un son posé sur un contexte déjà prêt, en sortie sur le haut-parleur : { regler(volume), arreter(fonduS) }.
export function poserFond(c, son, { minuterieS = null, volume = 0.5 } = {}) {
  const t0 = c.currentTime;
  const enveloppe = c.createGain();
  enveloppe.gain.setValueAtTime(0, t0);
  enveloppe.gain.linearRampToValueAtTime(1, t0 + MONTEE_S);
  const reglage = c.createGain();
  reglage.gain.setValueAtTime(gainDe(volume), t0);
  enveloppe.connect(reglage);
  reglage.connect(c.destination);
  const noeuds = brancherFond(c, son, enveloppe, t0);
  if (minuterieS > 0) {
    const fin = t0 + minuterieS;
    enveloppe.gain.setValueAtTime(1, Math.max(t0 + MONTEE_S, fin - FONDU_MINUTERIE_S));
    enveloppe.gain.linearRampToValueAtTime(0, fin);
    for (const n of noeuds) n.stop(fin + 0.1);
  }
  let arrete = false;
  return {
    regler: (v) => {
      if (arrete) return;
      try { reglage.gain.setTargetAtTime(gainDe(v), c.currentTime, 0.05); } catch { /* facultatif */ }
    },
    // Un contexte endormi n'avance pas : le fondu se ferait à sa reprise, pour un autre écran. Il n'y en a donc pas.
    arreter: (fonduS = FONDU_SORTIE_S) => {
      if (arrete) return;
      arrete = true;
      try {
        const t = c.currentTime;
        const fondu = c.state === 'running' ? Math.max(0.02, fonduS) : 0.02;
        const p = enveloppe.gain;
        const valeur = p.value;
        if (typeof p.cancelAndHoldAtTime === 'function') p.cancelAndHoldAtTime(t);
        else { p.cancelScheduledValues(t); p.setValueAtTime(valeur, t); }
        p.linearRampToValueAtTime(0, t + fondu);
        for (const n of noeuds) { try { n.stop(t + fondu + 0.05); } catch { /* déjà arrêté */ } }
      } catch { /* facultatif */ }
    },
  };
}

const SANS_SON = Object.freeze({ regler() {}, arreter() {} });

// À appeler dans un toucher : le contexte y est créé ou relancé. `minuterieS` : le son s'éteint de lui-même au bout de ce temps,
// ses 30 dernières secondes en fondu. `session` : « playback » (écran verrouillé, mode silencieux) ou « ambient » (le minuteur de
// concentration). Un son qui échoue ne gêne rien : il est facultatif.
export function demarrerFond(son, { minuterieS = null, volume = 0.5, session = 'playback' } = {}) {
  preparerSon({ session });
  const c = contexteSon();
  if (!c || !Object.hasOwn(RECETTES, son)) return SANS_SON;
  try { return poserFond(c, son, { minuterieS, volume }); } catch { return SANS_SON; }
}
