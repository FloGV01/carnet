// Respiration guidée (v6) : durée, rythme et signal sonore, réglés dans Réglages › Moment difficile
// (méta `respiration`). Pur : la phase se déduit du temps écoulé, rien n'est compté ni enregistré. v8 : le souffle à
// quatre temps du lecteur de Bien-être, et la cohérence cardiaque en séance du lecteur. v10 (spec §6 et §14.5) : la seconde
// inspiration du soupir, et `voix` (« Lire les consignes à voix haute », pour les exercices courts de Moment difficile).
export const DUREES = [2, 5, 10];
export const RYTHMES = ['5-5', '4-6'];
export const RESPIRATION_DEFAUT = Object.freeze({ duree: 5, rythme: '5-5', son: false, voix: false });

// Les deux rythmes font un cycle de 10 s, et chaque durée est un nombre entier de cycles : l'exercice
// s'arrête toujours à une fin d'expiration. L'animation CSS dure donc 10 s dans les deux rythmes.
export const CYCLE_MS = 10000;
const INSPIRATION_MS = { '5-5': 5000, '4-6': 4000 };

// Lecture d'un réglage : un champ absent ou hors liste prend sa valeur par défaut.
export function normaliserRespiration(brut) {
  const b = brut && typeof brut === 'object' ? brut : {};
  return {
    duree: DUREES.includes(b.duree) ? b.duree : RESPIRATION_DEFAUT.duree,
    rythme: RYTHMES.includes(b.rythme) ? b.rythme : RESPIRATION_DEFAUT.rythme,
    son: b.son === true,
    voix: b.voix === true,
  };
}

export const dureeEnMs = (minutes) => minutes * 60 * 1000;

// Phase de la respiration à un instant donné : 'inspire', 'expire', ou 'fini' une fois la durée écoulée.
export function phaseRespiration(ecouleMs, rythme = RESPIRATION_DEFAUT.rythme, dureeMs = dureeEnMs(RESPIRATION_DEFAUT.duree)) {
  if (ecouleMs >= dureeMs) return 'fini';
  const inspiration = INSPIRATION_MS[rythme] ?? INSPIRATION_MS[RESPIRATION_DEFAUT.rythme];
  return ecouleMs % CYCLE_MS < inspiration ? 'inspire' : 'expire';
}

// Le souffle du lecteur de Bien-être (v8, spec §5 et §12.3) : quatre temps en secondes entières, { inspi, retiens1, expi,
// retiens2 } (inspirer, retenir poumons pleins, expirer, retenir poumons vides). Un temps de 0 n'existe pas. Le cycle se
// répète depuis son origine ; la phase d'un instant se lit sur le temps écoulé depuis cette origine.
// v10 (spec §6) : un temps de plus pour le soupir, `inspi2`, la petite inspiration qui suit la première, sans expirer entre
// les deux. Absent, il vaut 0 : les souffles d'avant la v10 restent tels quels.
export const TEMPS_SOUFFLE = ['inspi', 'inspi2', 'retiens1', 'expi', 'retiens2'];
const PHASES_SOUFFLE = { inspi: 'inspire', inspi2: 'inspire-encore', retiens1: 'retiens-plein', expi: 'expire', retiens2: 'retiens-vide' };
// Le plus long temps accepté : l'animation du disque a une classe par durée, de 1 à 12 s (ecrans.css).
export const TEMPS_MAX_S = 12;
// Une petite inspiration en plus : 3 s au plus.
export const INSPI2_MAX_S = 3;

const tempsValide = (v, max) => Number.isInteger(v) && v >= 0 && v <= max;
// Un souffle valide : des entiers de 0 à 12 (`inspi2` : absent, ou de 0 à 3), une inspiration et une expiration d'au moins 1 s.
export function souffleValide(s) {
  if (!s || typeof s !== 'object') return false;
  const valide = (k) => (k === 'inspi2' ? s[k] === undefined || tempsValide(s[k], INSPI2_MAX_S) : tempsValide(s[k], TEMPS_MAX_S));
  if (!TEMPS_SOUFFLE.every(valide)) return false;
  return s.inspi >= 1 && s.expi >= 1;
}
export const cycleSouffleMs = (s) => TEMPS_SOUFFLE.reduce((n, k) => n + (s[k] || 0), 0) * 1000;

// La phase à `ms` du début du cycle : { phase, debutMs, dureeMs }, debutMs compté depuis l'origine (et non depuis le début
// du cycle en cours). phase : 'inspire', 'inspire-encore', 'retiens-plein', 'expire' ou 'retiens-vide'.
export function phaseSouffle(ms, s) {
  const cycle = cycleSouffleMs(s);
  const t = Math.max(0, ms);
  const base = Math.floor(t / cycle) * cycle;
  let debut = base;
  for (const k of TEMPS_SOUFFLE) {
    const duree = (s[k] || 0) * 1000;
    if (duree > 0 && t < debut + duree) return { phase: PHASES_SOUFFLE[k], debutMs: debut, dureeMs: duree };
    debut += duree;
  }
  return { phase: PHASES_SOUFFLE.inspi, debutMs: base + cycle, dureeMs: s.inspi * 1000 };
}

// Les phases qui commencent dans [deMs, aMs[, dans l'ordre : le lecteur programme le souffle sonore un peu en avance, calé
// sur l'horloge audio.
export function phasesEntre(deMs, aMs, s) {
  const r = [];
  let p = phaseSouffle(deMs, s);
  if (p.debutMs < deMs) p = phaseSouffle(p.debutMs + p.dureeMs, s);
  while (p.debutMs < aMs) {
    r.push(p);
    p = phaseSouffle(p.debutMs + p.dureeMs, s);
  }
  return r;
}

// Le mot de la phase, sous lequel le disque grandit ou rétrécit.
const MOTS_PHASE = Object.freeze({ inspire: 'Inspire', 'inspire-encore': 'Encore un peu', expire: 'Expire' });
export const motPhase = (phase) => MOTS_PHASE[phase] || 'Retiens';

// Le souffle d'un rythme de la cohérence cardiaque (sans rétention).
export const souffleDeRythme = (rythme) => {
  const [inspi, expi] = (RYTHMES.includes(rythme) ? rythme : RESPIRATION_DEFAUT.rythme).split('-').map(Number);
  return { inspi, retiens1: 0, expi, retiens2: 0 };
};

// « 5 minutes » ne se coupe pas : une espace insécable entre le nombre et l'unité (v6.1).
export const NOM_RESPIRATION = 'Cohérence cardiaque';
export const texteDuree = (minutes) => `${minutes}\u00a0minutes`;
export const texteAvant = (minutes) => `${NOM_RESPIRATION} · ${texteDuree(minutes)}`;
export const texteFin = (minutes) => `${minutes}\u00a0minutes de respiration.`;
// Le rythme en clair, sur la puce de Moment difficile (2b) : « 5 s · 5 s » (inspirer, expirer).
export const texteRythme = (rythme) => rythme.split('-').map((n) => `${n}\u00a0s`).join(' · ');

// La cohérence cardiaque dans le lecteur de Bien-être (v8, spec §5) : une seule étape, rythmée, de la durée réglée. Son
// identifiant est celui des séances de respiration (`coherence`). Ses textes s'appuient sur les mots affichés
// (« Inspire », « Expire »), et non sur le disque : avec « Réduire les animations », il ne grandit ni ne rétrécit.
export const TEXTE_COHERENCE = 'Respire au rythme des mots, sans forcer.';
export function seanceCoherence(reglages) {
  const r = normaliserRespiration(reglages);
  return {
    id: 'coherence',
    titre: NOM_RESPIRATION,
    dureeMin: r.duree,
    posture: 'assis',
    description: 'Inspirer sur « Inspire », expirer sur « Expire ».',
    etapes: [{ texte: TEXTE_COHERENCE, dureeS: r.duree * 60, souffle: souffleDeRythme(r.rythme) }],
  };
}
