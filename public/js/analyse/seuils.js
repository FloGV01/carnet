// Tous les seuils du moteur d'analyse, et nulle part ailleurs (plan §7.0).
export const SEUILS = Object.freeze({
  moyenne: { peuDeValeurs: 3 },
  horaires: { minMedian: 3, dureeMin: 120, dureeMax: 960 },
  semaine: { minValeursPleines: 3, minPremier: 2, nbSemaines: 12, minSemainesGraphe: 2 },
  classement: { minOccurrences: 3, minTop: 2 },
  bonnesJournees: {
    haut: 7, bas: 4, minParGroupe: 5, minConnusParGroupe: 5, minOuiNon: 3, q: 0.10, qSortie: 0.20,
    ecartMin: 0.20, maxConstats: 3, joursStables: 7, permutations: 999, blocJours: 7, seed: 1234,
  },
  sommeil: {
    minPaires: 14, minParModalite: 4, minModalites: 2, alpha: 0.025, alphaSortie: 0.05, permutations: 999,
    blocJours: 7, seed: 1234, autocorrSuite: 0.3, joursStables: 7,
  },
  signal: {
    baseDe: 60, baseA: 8, baseMin: 20, ecartMin: 2, plafond: 5, lissage: 3, lissageMin: 2,
    minJoursBas: 4, trouMax: 3, fusion: 10, fenetre: 4, fenetreMin: 3, minJoursHumeur: 60,
    minPeriodes: 3, minOrdinaires: 40, margeAvant: 14, margeApres: 7, quantile: 0.05,
    sensibiliteMin: 0.6, precisionMin: 1 / 3, horizonPrecision: 10, signatureZ: 0.5,
    signatureAccord: 2 / 3, minCaracs: 2, sdPlancher: 0.05, couvertureCarac: 0.5,
  },
  export: { maxTexteLibre: 280 },
});
