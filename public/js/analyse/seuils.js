// Tous les seuils du moteur d'analyse, et nulle part ailleurs (plan §7.0).
// v7 : les analyses fondées sur la note de 1 à 10 sont retirées (bonnes journées, sommeil et humeur, tendances,
// signal de ressemblance), avec leurs seuils.
export const SEUILS = Object.freeze({
  moyenne: { peuDeValeurs: 3 },
  reveils: { plafond: 5 }, // 5 = « 5 ou plus » (§5.3)
  horaires: { minMedian: 3, dureeMin: 120, dureeMax: 960 },
  // Anciennes notes de 1 à 10 (vue soignants) : journées à 7 ou plus, à 4 ou moins.
  notes: { haut: 7, bas: 4 },
  classement: { minOccurrences: 3, minTop: 2 },
  export: { maxTexteLibre: 280 },
  // v4 : énergie du moment par créneau de 2 h ; notes réunies avant les explosions.
  // Profil : un créneau s'affiche avec des relevés d'énergie d'au moins 3 jours différents.
  // Avant tes explosions : une liste montre ses éléments notés au moins 2 fois.
  moments: { minJours: 3, largeurCreneau: 2 },
  explosions: { minExplosions: 3, maxElements: 3, maxTextes: 5, minTete: 2, maxCitations: 3 },
  // v5 · Mes jours : une colonne par jour jusqu'à 31 jours, par semaine jusqu'à 26 semaines, par
  // mois au-delà. Anciennes notes : moyenne des 7 jours tracée avec au moins 4 valeurs (vue soignants) ;
  // semaine pleine à 3 notes ; mois affiché à partir de 3 notes, plein à partir de 10.
  frise: { joursJusqua: 31, semainesJusqua: 26, minMoyenne7: 4, semainePleine: 3, moisMin: 3, moisPlein: 10 },
  // v6 · Comprendre (spec §2) : un graphique aligné à partir de 3 événements (jours d'explosion, jours à
  // énergie basse, retours au bureau) ; « peu de valeurs » sous 3 ; un graphique en colonnes à partir de 2
  // colonnes d'au moins 3 valeurs ; une activité à partir de 3 relevés avec énergie ; un élément pesé ou
  // rechargé à partir de 3 jours notés sur la période.
  comprendre: { minEvenements: 3, minValeurs: 3, minColonnes: 2, minActivite: 3, minElement: 3 },
  // v7 · Émotions du moment (spec §5, §6.4) : une vue d'émotions (Ta journée, colonnes de Comprendre, après une nuit,
  // autour des explosions) apparaît à partir de 5 relevés à émotion pris en compte. Autour d'un instant : 3 heures
  // avant, 3 heures après.
  emotions: { minReleves: 5, heuresAutour: 3 },
});
