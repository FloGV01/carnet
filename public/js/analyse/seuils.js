// Tous les seuils du moteur d'analyse, et nulle part ailleurs (plan §7.0).
export const SEUILS = Object.freeze({
  moyenne: { peuDeValeurs: 3 },
  reveils: { plafond: 5 }, // 5 = « 5 ou plus » (§5.3)
  calendrier: { trouMaxJours: 28, histoireSignal: 1095 },
  horaires: { minMedian: 3, dureeMin: 120, dureeMax: 960 },
  semaine: { minValeursPleines: 3, minPremier: 2, nbSemaines: 12, minSemainesGraphe: 2 },
  classement: { minOccurrences: 3, minTop: 2 },
  bonnesJournees: {
    // q et blocs calibrés sur un an de recalcul quotidien (docs/decisions.md, relecture J7) :
    // q 0,02 à l'entrée, 0,05 pour rester affiché ; blocs de longueur variable, 21 jours en moyenne.
    haut: 7, bas: 4, minParGroupe: 5, minConnusParGroupe: 5, minOuiNon: 3, q: 0.02, qSortie: 0.05,
    ecartMin: 0.20, maxConstats: 3, joursStables: 7, permutations: 999, blocJours: 21, seed: 1234,
  },
  sommeil: {
    minPaires: 14, minParModalite: 4, minModalites: 2, alpha: 0.005, alphaSortie: 0.01, permutations: 999,
    blocJours: 14, seed: 1234, autocorrSuite: 0.3, joursStables: 7,
  },
  signal: {
    baseDe: 60, baseA: 8, baseMin: 20, ecartMin: 2, plafond: 5, lissage: 3, lissageMin: 2,
    minJoursBas: 4, trouMax: 3, fusion: 10, fenetre: 4, fenetreMin: 3, minJoursHumeur: 60,
    minPeriodes: 3, minOrdinaires: 40, margeAvant: 14, margeApres: 7, quantile: 0.05,
    sensibiliteMin: 0.6, precisionMin: 1 / 3, horizonPrecision: 10, signatureZ: 0.5,
    signatureAccord: 2 / 3, minCaracs: 2, sdPlancher: 0.05, couvertureCarac: 0.5,
  },
  export: { maxTexteLibre: 280 },
  // v4 : humeurs du moment par créneau de 2 h ; notes réunies avant les explosions.
  // Profil : un créneau s'affiche avec des relevés d'au moins 3 jours différents.
  // Avant tes explosions : une liste montre ses éléments notés au moins 2 fois.
  moments: { minJours: 3, largeurCreneau: 2 },
  explosions: { minExplosions: 3, maxElements: 3, maxTextes: 5, minTete: 2 },
});
