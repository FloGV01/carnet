// Vocabulaire par défaut des listes, repris du tableau Numbers, SANS lissage.
// SEED_V1 est FIGÉ une fois publié : tout ajout futur passe par SEED_V2_AJOUTS (empreinte
// vérifiée par tests/unit/migrations-figees.test.js).
// [slug, libellé, alias?, options?]  hc = horsClassement, ag = agreable, ex = exclusif
export const SEED_V1 = Object.freeze({
  lieu: [['bureau', 'Bureau'], ['teletravail', 'Télétravail'], ['conge_repos', 'Congé / repos'],
    ['arret', 'Arrêt'], ['clinique', 'Clinique'], ['autre', 'Autre']],
  sommeil: [['mal', 'Mal'], ['moyen', 'Moyen'], ['bien', 'Bien']],
  traitementPris: [['oui', 'Oui'], ['partiel', 'Partiel'], ['non', 'Non']],
  effetRessenti: [['moins_bien', 'Moins bien'], ['stable', 'Stable'], ['mieux', 'Mieux']],
  emotion: [['colere', 'Colère'], ['frustration', 'Frustration'], ['sentiment_injustice', "Sentiment d'injustice"],
    ['honte', 'Honte'], ['culpabilite', 'Culpabilité'], ['tristesse', 'Tristesse'], ['anxiete', 'Anxiété'], ['peur', 'Peur'],
    ['vide_rien', 'Vide / rien'], ['epuisement', 'Épuisement'], ['surcharge', 'Surcharge'], ['irritabilite', 'Irritabilité'],
    ['soulagement', 'Soulagement', [], { ag: 1 }], ['joie', 'Joie', [], { ag: 1 }], ['fierte', 'Fierté', [], { ag: 1 }],
    ['calme', 'Calme', [], { ag: 1 }], ['enthousiasme', 'Enthousiasme', [], { ag: 1 }]],
  declencheur: [['pris_pour_un_con', 'Me sentir pris pour un con'], ['injustice', 'Injustice'],
    ['pas_compris', 'Ne pas être compris'], ['imprevu_changement', 'Imprévu / changement'],
    ['surcharge_sensorielle', 'Surcharge sensorielle (bruit, monde)', ['Surcharge sensorielle']],
    ['manque_sommeil', 'Manque de sommeil'], ['trop_sollicitations', 'Trop de sollicitations'], ['conflit', 'Conflit'],
    ['attente_lenteur', 'Attente / lenteur'], ['erreur_echec', 'Erreur / échec'], ['solitude', 'Solitude'],
    ['rien_identifie', "Rien d'identifié", [], { hc: 1 }]],
  dessous: [['injustice', 'Injustice'], ['pas_vu_reconnu', 'Ne pas être vu / reconnu'], ['honte', 'Honte'],
    ['peur', 'Peur'], ['tristesse', 'Tristesse'], ['fatigue_debordement', 'Fatigue / débordement'],
    ['ne_sais_pas', 'Je ne sais pas', [], { hc: 1 }]],
  reaction: [['explosion', 'Explosion'], ['retrait_isolement', 'Retrait / isolement'],
    ['masquage', 'Masquage (fait comme si)', ['Masquage', 'Masquage (faire comme si)']],
    ['en_parler', "J'ai réussi à en parler"], ['rien_fait', 'Rien fait'], ['report_a_froid', 'Report (revenu à froid)', ['Report']]],
  symptome: [['crise_angoisse', "Crise d'angoisse"], ['vide_shutdown', 'Vide / shutdown'],
    ['paralysie', "Paralysie (impossible d'agir)", ['Paralysie']], ['ruminations', 'Ruminations'],
    ['explosion_colere', 'Explosion de colère'], ['surcharge_sensorielle', 'Surcharge sensorielle'], ['hyperfocus', 'Hyperfocus'],
    ['endormissement_difficile', 'Endormissement difficile'], ['reveil_non_repose', 'Réveil non reposé'],
    ['irritabilite', 'Irritabilité'], ['fatigue_extreme', 'Fatigue extrême'],
    ['difficulte_concentration', 'Difficulté de concentration'], ['evitement_social', 'Évitement social'],
    ['douleurs_tensions', 'Douleurs / tensions']],
  duree: [['quelques_minutes', 'Quelques minutes'], ['moins_une_heure', "Moins d'une heure"],
    ['quelques_heures', 'Quelques heures'], ['journee', 'Toute la journée'], ['plusieurs_jours', 'Plusieurs jours']],
  effetSecondaire: [['aucun', 'Aucun', [], { ex: 1, hc: 1 }], ['bouche_seche', 'Bouche sèche'], ['somnolence', 'Somnolence'],
    ['fatigue', 'Fatigue'], ['nausees', 'Nausées'], ['maux_de_tete', 'Maux de tête'], ['tremblements', 'Tremblements'],
    ['prise_de_poids', 'Prise de poids'], ['perte_appetit', "Perte d'appétit"], ['troubles_digestifs', 'Troubles digestifs'],
    ['baisse_libido', 'Baisse de libido'], ['vertiges', 'Vertiges'], ['sueurs', 'Sueurs'], ['agitation_nervosite', 'Agitation / nervosité']],
  professionnel: [['psychiatre', 'Psychiatre'], ['neuropsychologue', 'Neuropsychologue'], ['psychologue', 'Psychologue'],
    ['medecin_traitant', 'Médecin traitant'], ['medecin_travail', 'Médecin du travail'],
    ['equipe_rehab', 'Équipe de réhabilitation'], ['autre', 'Autre']],
});

export function seedItems(seed, horodatage) {
  const items = [];
  for (const [liste, entrees] of Object.entries(seed)) {
    entrees.forEach(([slug, libelle, alias = [], opt = {}], i) => {
      items.push({
        id: `${liste}:${slug}`, liste, libelle, ordre: (i + 1) * 10, archive: false, alias: [...alias],
        exclusif: Boolean(opt.ex), horsClassement: Boolean(opt.hc), agreable: Boolean(opt.ag),
        origine: 'defaut', createdAt: horodatage, updatedAt: horodatage,
      });
    });
  }
  return items;
}

// Comparaison de libellés : casse, accents, espaces autour de « / », espaces multiples, apostrophes.
export function normLabel(s) {
  return String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s+/g, ' ')
    .trim();
}
