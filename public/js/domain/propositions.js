// Après une émotion notée (v10, spec §8) : les exercices proposés sur l'écran 3, pour un relevé neuf dont le mot a une zone.
// Une table fixe, écrite à la main, à relire par l'utilisateur (docs/decisions.md) : rien n'est calculé, rien n'est appris
// des séances passées. L'ordre de chaque liste est celui de l'écran. Pur.
export const PROPOSITIONS = Object.freeze({
  rouge: Object.freeze(['soupir', 'ancrage-court', 'expiration-longue']),
  jaune: Object.freeze(['savourer', 'noting']),
  bleu: Object.freeze(['scan-court', 'expiration-longue', 'noting']),
  vert: Object.freeze(['savourer', 'expiration-longue']),
});

// Les exercices d'une zone ; aucun pour une zone nulle ou inconnue (« Aucun mot », un mot à soi sans zone).
export const propositionsPour = (zone) => (typeof zone === 'string' && Object.hasOwn(PROPOSITIONS, zone) ? PROPOSITIONS[zone] : []);
