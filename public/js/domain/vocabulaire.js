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

// Ajouts de la v4 (DB_VERSION 2), FIGÉS une fois publiés comme SEED_V1. Versés par
// MIGRATIONS[2] et par la mise à niveau des sauvegardes v1, sans écraser l'existant.
export const SEED_V2_AJOUTS = Object.freeze({
  energie: [['basse', 'Basse'], ['moyenne', 'Moyenne'], ['haute', 'Haute']],
  typeSport: [['marche', 'Marche'], ['velo', 'Vélo'], ['course', 'Course à pied'], ['natation', 'Natation'],
    ['renforcement', 'Renforcement'], ['yoga', 'Yoga / étirements'], ['autre', 'Autre']],
  dureeSport: [['moins_15', 'Moins de 15 min'], ['de_15_a_30', '15 à 30 min'], ['de_30_a_60', '30 à 60 min'], ['plus_60', "Plus d'1 h"]],
  contactAvec: [['famille', 'Famille'], ['amis', 'Amis'], ['collegues', 'Collègues'], ['soignants', 'Soignants'], ['autre', 'Autre']],
  contactEffet: [['ressourcant', 'Ressourçant'], ['neutre', 'Neutre'], ['couteux', 'Coûteux']],
  typeExplosion: [['colere', 'Colère'], ['surcharge', 'Surcharge'], ['fige', 'Figé'], ['ne_sais_pas', 'Je ne sais pas', [], { hc: 1, ex: 1 }]],
  fragilite: [['fatigue', 'Fatigue'], ['mauvaise_nuit', 'Mauvaise nuit'], ['faim', 'Faim'], ['douleur', 'Douleur'],
    ['imprevu', 'Imprévu'], ['trop_de_choses', 'Trop de choses à la fois'], ['bruit_monde', 'Bruit / monde'], ['tension_deja_la', 'Tension déjà là'],
    ['ne_sais_pas', 'Je ne sais pas', [], { hc: 1, ex: 1 }]],
  signe: [['chaleur', 'Chaleur'], ['coeur', "Cœur qui s'accélère"], ['machoire', 'Mâchoire ou poings serrés'],
    ['respiration', 'Respiration courte'], ['voix', 'Voix qui monte'], ['gestes', 'Gestes brusques'],
    ['envie_partir', 'Envie de partir'], ['pensees_tournent', 'Pensées qui tournent'], ['bruits_insupportables', 'Bruits insupportables'],
    ['ne_sais_pas', 'Je ne sais pas', [], { hc: 1, ex: 1 }]],
  piegePensee: [['expres', 'Il le fait exprès'], ['dois', 'Je dois / il doit'],
    ['tout_ou_rien', 'Tout ou rien'], ['lecture_pensees', "Je sais ce qu'il pense"], ['mal_finir', 'Ça va mal finir']],
  sourceSurcharge: [['bruit', 'Bruit'], ['lumiere', 'Lumière'], ['monde', 'Monde'], ['changement', 'Changement'],
    ['attente', 'Attente'], ['demandes', 'Trop de demandes'], ['fatigue', 'Fatigue']],
  besoin: [['calme', 'Calme'], ['sortir', 'Sortir'], ['pause', 'Une pause'], ['casque', 'Casque / bouchons'],
    ['seul', 'Être seul'], ['manger_boire', 'Manger / boire'], ['dormir', 'Dormir'], ['en_parler', 'En parler'],
    ['ne_sais_pas', 'Je ne sais pas', [], { hc: 1, ex: 1 }]],
  consequenceCourt: [['soulagement', 'Soulagement'], ['tension_tombee', 'La tension est tombée'], ['rien', 'Rien de spécial'], ['empire', 'Ça a empiré']],
  consequenceLong: [['regret', 'Regret'], ['honte', 'Honte'], ['conflit', 'Conflit'], ['fatigue', 'Fatigue'],
    ['rien', 'Rien de spécial'], ['reparer', "J'ai pu réparer"]],
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
