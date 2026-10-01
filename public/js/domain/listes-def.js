// Les 12 listes de l'app. sensFixe : on peut renommer, mais pas compléter, archiver ni réordonner.
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
};
export const NOMS_LISTES = Object.keys(LISTES);
export const estListe = (nom) => Object.prototype.hasOwnProperty.call(LISTES, nom);
export const listeDe = (id) => (typeof id === 'string' && id.includes(':') ? id.slice(0, id.indexOf(':')) : null);
