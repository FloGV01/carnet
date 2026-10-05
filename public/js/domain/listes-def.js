// Les listes de l'app (12 en v1, 13 de plus en v4). sensFixe : on peut renommer, mais pas
// compléter, archiver ni réordonner.
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
};
export const NOMS_LISTES = Object.keys(LISTES);
export const estListe = (nom) => Object.prototype.hasOwnProperty.call(LISTES, nom);
export const listeDe = (id) => (typeof id === 'string' && id.includes(':') ? id.slice(0, id.indexOf(':')) : null);
