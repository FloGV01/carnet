// Réglages de la saisie du soir (v4) : ordre des champs, champs masqués, heures de l'humeur du
// moment. Pur ; stocké dans meta.journee. Un champ masqué compte comme « non renseigné ».
export const CHAMPS_JOURNEE = ['lieu', 'sommeil', 'humeur', 'contact', 'sport', 'explosions', 'traitement', 'positifs'];
export const NOMS_CHAMPS = {
  lieu: 'Lieu', sommeil: 'Sommeil', humeur: 'Humeur', contact: 'Contact humain', sport: 'Sport / mouvement',
  explosions: 'Explosions (compteur du soir)', traitement: 'Traitement pris', positifs: 'Mes points positifs',
};
// Heures proposées pour l'humeur du moment (Réglages › Ma journée) : de 6 h à 23 h.
export const HEURE_MIN = 6;
export const HEURE_MAX = 23;
// Le compteur du soir est masqué par défaut : les épisodes « Explosion » font foi.
export const JOURNEE_DEFAUT = Object.freeze({ ordre: CHAMPS_JOURNEE, masques: ['explosions'], heuresMoment: [] });

export function normaliserJournee(brut) {
  const b = brut && typeof brut === 'object' ? brut : {};
  const connus = new Set(CHAMPS_JOURNEE);
  const ordre = [...new Set((Array.isArray(b.ordre) ? b.ordre : []).filter((c) => connus.has(c)))];
  for (const c of CHAMPS_JOURNEE) if (!ordre.includes(c)) ordre.push(c);
  const masques = Array.isArray(b.masques) ? [...new Set(b.masques.filter((c) => connus.has(c)))] : [...JOURNEE_DEFAUT.masques];
  const heuresMoment = [...new Set((Array.isArray(b.heuresMoment) ? b.heuresMoment : []).filter((h) => Number.isInteger(h) && h >= HEURE_MIN && h <= HEURE_MAX))].sort((a, b2) => a - b2);
  return { ordre, masques, heuresMoment };
}

export const champsVisibles = (j) => j.ordre.filter((c) => !j.masques.includes(c));

// Champs du journal portés par chaque champ du soir (détails compris).
const DONNEES_CHAMP = {
  lieu: ['lieu'], sommeil: ['sommeilRessenti'], humeur: ['humeur'], contact: ['contactHumain', 'contacts'],
  sport: ['sportMouvement', 'activites'], explosions: ['explosions'], traitement: ['traitementPris'], positifs: ['pointsPositifs'],
};
export const champRenseigne = (champ, entree) => Boolean(entree) && DONNEES_CHAMP[champ].some((k) => entree[k] != null);

// Écran du jour : un champ masqué reste affiché tant qu'il porte une valeur (rien ne se cache sans
// pouvoir être vu ni effacé), à sa place dans l'ordre choisi.
export const champsAffiches = (j, entree) => j.ordre.filter((c) => !j.masques.includes(c) || champRenseigne(c, entree));

// Déplace un champ d'un cran (sens : -1 vers le haut, +1 vers le bas).
export function deplacerChamp(j, champ, sens) {
  const ordre = [...j.ordre];
  const i = ordre.indexOf(champ);
  const k = i + sens;
  if (i < 0 || k < 0 || k >= ordre.length) return j;
  [ordre[i], ordre[k]] = [ordre[k], ordre[i]];
  return { ...j, ordre };
}
