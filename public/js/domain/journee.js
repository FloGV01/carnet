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
// Le repli « Ce qui a pesé · ce qui a rechargé » (v6) se masque comme un champ, mais n'a pas de place
// dans l'ordre : sa clé n'est acceptée que dans les masques.
export const MASQUE_PESE_RECHARGE = 'peseRecharge';
export const NOM_PESE_RECHARGE = 'Ce qui a pesé · ce qui a rechargé';
const MASQUABLES = new Set([...CHAMPS_JOURNEE, MASQUE_PESE_RECHARGE]);
// Masqués par défaut : le compteur du soir (les épisodes « Explosion » font foi) et, depuis la v6,
// l'Humeur du soir (l'humeur du jour est la moyenne des humeurs du moment). Réaffichables.
export const JOURNEE_DEFAUT = Object.freeze({ ordre: CHAMPS_JOURNEE, masques: ['explosions', 'humeur'], heuresMoment: [] });

export function normaliserJournee(brut) {
  const b = brut && typeof brut === 'object' ? brut : {};
  const connus = new Set(CHAMPS_JOURNEE);
  const ordre = [...new Set((Array.isArray(b.ordre) ? b.ordre : []).filter((c) => connus.has(c)))];
  for (const c of CHAMPS_JOURNEE) if (!ordre.includes(c)) ordre.push(c);
  const masques = Array.isArray(b.masques) ? [...new Set(b.masques.filter((c) => MASQUABLES.has(c)))] : [...JOURNEE_DEFAUT.masques];
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

// Repli « pesé · rechargé » : comme un champ, masqué il reste affiché tant qu'il porte une valeur ce jour-là.
export const repliAffiche = (j, entree) => !j.masques.includes(MASQUE_PESE_RECHARGE) || Boolean(entree && (entree.pese != null || entree.recharge != null));

// Déplace un champ d'un cran (sens : -1 vers le haut, +1 vers le bas).
export function deplacerChamp(j, champ, sens) {
  const ordre = [...j.ordre];
  const i = ordre.indexOf(champ);
  const k = i + sens;
  if (i < 0 || k < 0 || k >= ordre.length) return j;
  [ordre[i], ordre[k]] = [ordre[k], ordre[i]];
  return { ...j, ordre };
}
