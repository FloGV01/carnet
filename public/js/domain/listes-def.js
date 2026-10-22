// Les listes de l'app (12 en v1, 13 de plus en v4, 3 de plus en v6). sensFixe : on peut renommer,
// mais pas compléter, archiver ni réordonner.
export const LISTES = {
  lieu: { libelle: 'Lieu' },
  sommeil: { libelle: 'Sommeil ressenti', sensFixe: true },
  traitementPris: { libelle: 'Traitement pris', sensFixe: true },
  effetRessenti: { libelle: 'Effet ressenti', sensFixe: true },
  emotion: { libelle: 'Émotion' },
  declencheur: { libelle: 'Déclencheur' },
  dessous: { libelle: "Ce qu'il y avait dessous" },
  reaction: { libelle: 'Réaction' },
  symptome: { libelle: 'Symptôme' },
  duree: { libelle: 'Durée' },
  effetSecondaire: { libelle: 'Effet secondaire' },
  professionnel: { libelle: 'Professionnel' },
  // v4
  energie: { libelle: 'Énergie', sensFixe: true },
  typeSport: { libelle: 'Types de sport' },
  dureeSport: { libelle: 'Durée du sport', sensFixe: true },
  contactAvec: { libelle: 'Contact : avec qui' },
  contactEffet: { libelle: 'Contact : comment c\'était', sensFixe: true },
  typeExplosion: { libelle: 'C\'était plutôt', sensFixe: true },
  fragilite: { libelle: 'Fragilités' },
  signe: { libelle: 'Premiers signes' },
  piegePensee: { libelle: 'Ça ressemble à' },
  sourceSurcharge: { libelle: 'Ce qui était trop' },
  besoin: { libelle: 'Besoins' },
  consequenceCourt: { libelle: 'Sur le moment' },
  consequenceLong: { libelle: 'Plus tard' },
  // v6
  pese: { libelle: 'Ce qui a pesé' },
  recharge: { libelle: 'Ce qui a rechargé' },
  activiteMoment: { libelle: 'Ce que je faisais' },
};
export const NOMS_LISTES = Object.keys(LISTES);

// Réglages › Listes (v6.1) : chaque liste sous l'écran où on la choisit, dans l'ordre où elle y vient.
// Une liste qui sert à plusieurs écrans va sous le premier : Déclencheur sous Épisode (puis Après coup),
// Professionnel sous Épisode aussi, en dernier : on le choisit d'abord dans « En parler au rendez-vous », au
// récapitulatif d'un épisode (puis d'un symptôme, d'un Après coup, d'un traitement), avant le rendez-vous et la
// Vue soignants de Soins. Toutes les listes y sont, une seule fois.
export const GROUPES_LISTES = [
  { ecran: 'Le soir', listes: ['lieu', 'sommeil', 'contactAvec', 'contactEffet', 'typeSport', 'dureeSport', 'traitementPris', 'pese', 'recharge'] },
  { ecran: 'Émotion du moment', listes: ['energie', 'activiteMoment'] },
  { ecran: 'Épisode', listes: ['declencheur', 'emotion', 'dessous', 'reaction', 'professionnel'] },
  { ecran: 'Après coup', listes: ['typeExplosion', 'fragilite', 'signe', 'piegePensee', 'sourceSurcharge', 'besoin', 'consequenceCourt', 'consequenceLong'] },
  { ecran: 'Symptôme', listes: ['symptome', 'duree'] },
  { ecran: 'Soins', listes: ['effetSecondaire', 'effetRessenti'] },
];
export const estListe = (nom) => Object.prototype.hasOwnProperty.call(LISTES, nom);
export const listeDe = (id) => (typeof id === 'string' && id.includes(':') ? id.slice(0, id.indexOf(':')) : null);
