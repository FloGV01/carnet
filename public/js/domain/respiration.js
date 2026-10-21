// Respiration guidée (v6) : durée, rythme et signal sonore, réglés dans Réglages › Moment difficile
// (méta `respiration`). Pur : la phase se déduit du temps écoulé, rien n'est compté ni enregistré.
export const DUREES = [2, 5, 10];
export const RYTHMES = ['5-5', '4-6'];
export const RESPIRATION_DEFAUT = Object.freeze({ duree: 5, rythme: '5-5', son: false });

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
  };
}

export const dureeEnMs = (minutes) => minutes * 60 * 1000;

// Phase de la respiration à un instant donné : 'inspire', 'expire', ou 'fini' une fois la durée écoulée.
export function phaseRespiration(ecouleMs, rythme = RESPIRATION_DEFAUT.rythme, dureeMs = dureeEnMs(RESPIRATION_DEFAUT.duree)) {
  if (ecouleMs >= dureeMs) return 'fini';
  const inspiration = INSPIRATION_MS[rythme] ?? INSPIRATION_MS[RESPIRATION_DEFAUT.rythme];
  return ecouleMs % CYCLE_MS < inspiration ? 'inspire' : 'expire';
}

// « 5 minutes » ne se coupe pas : une espace insécable entre le nombre et l'unité (v6.1).
export const NOM_RESPIRATION = 'Cohérence cardiaque';
export const texteDuree = (minutes) => `${minutes}\u00a0minutes`;
export const texteAvant = (minutes) => `${NOM_RESPIRATION} · ${texteDuree(minutes)}`;
export const texteFin = (minutes) => `${minutes}\u00a0minutes de respiration.`;
// Le rythme en clair, sur la puce de Moment difficile (2b) : « 5 s · 5 s » (inspirer, expirer).
export const texteRythme = (rythme) => rythme.split('-').map((n) => `${n}\u00a0s`).join(' · ');
