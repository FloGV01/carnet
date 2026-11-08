// Réglages de la saisie du soir (v4) : ordre des champs, champs masqués, heures de l'humeur du
// moment. Pur ; stocké dans meta.journee. Un champ masqué compte comme « non renseigné ».
// v11 : « Mes gratitudes », affichée par défaut (spec §6).
export const CHAMPS_JOURNEE = ['lieu', 'sommeil', 'humeur', 'contact', 'sport', 'explosions', 'traitement', 'positifs', 'gratitudes'];
export const NOMS_CHAMPS = {
  lieu: 'Lieu', sommeil: 'Sommeil', humeur: 'Humeur', contact: 'Contact humain', sport: 'Sport / mouvement',
  explosions: 'Explosions (compteur du soir)', traitement: 'Traitement pris', positifs: 'Mes points positifs', gratitudes: 'Mes gratitudes',
};
// Un champ nouveau arrive en fin d'ordre, sauf celui qui a sa place après un autre : v11, les gratitudes juste après les
// points positifs, où qu'ils soient (une app déjà installée a un ordre réglé sans elles, spec §6).
const PLACE_APRES = { gratitudes: 'positifs' };
// Heures proposées pour l'humeur du moment (Réglages › Rappels depuis la v6.1) : de 6 h à 23 h.
export const HEURE_MIN = 6;
export const HEURE_MAX = 23;
// Le repli « Ce qui a pesé · ce qui a rechargé » (v6) se masque comme un champ, mais n'a pas de place
// dans l'ordre : sa clé n'est acceptée que dans les masques.
export const MASQUE_PESE_RECHARGE = 'peseRecharge';
export const NOM_PESE_RECHARGE = 'Ce qui a pesé · ce qui a rechargé';
// Le repli « Nuit en détail » (coucher, lever, réveils) se masque de même depuis la v8 : le soir note la nuit en heures
// et en qualité (spec v8 §7 bis).
export const MASQUE_NUIT = 'nuit';
export const NOM_NUIT = 'Nuit en détail';
const MASQUABLES = new Set([...CHAMPS_JOURNEE, MASQUE_PESE_RECHARGE, MASQUE_NUIT]);
// Masqués par défaut : le compteur du soir (les épisodes « Explosion » font foi), depuis la v6
// l'Humeur du soir (l'humeur du jour est la moyenne des humeurs du moment), et depuis la v8 « Nuit
// en détail ». Réaffichables. La migration 6 de la base et la mise à niveau du format 5 ajoutent
// « nuit » aux masques déjà réglés, comme la v6 l'a fait pour l'humeur.
export const JOURNEE_DEFAUT = Object.freeze({ ordre: CHAMPS_JOURNEE, masques: ['explosions', 'humeur', MASQUE_NUIT], heuresMoment: [] });

export function normaliserJournee(brut) {
  const b = brut && typeof brut === 'object' ? brut : {};
  const connus = new Set(CHAMPS_JOURNEE);
  const ordre = [...new Set((Array.isArray(b.ordre) ? b.ordre : []).filter((c) => connus.has(c)))];
  for (const c of CHAMPS_JOURNEE) {
    if (ordre.includes(c)) continue;
    const apres = PLACE_APRES[c] ? ordre.indexOf(PLACE_APRES[c]) : -1;
    if (apres >= 0) ordre.splice(apres + 1, 0, c);
    else ordre.push(c);
  }
  const masques = Array.isArray(b.masques) ? [...new Set(b.masques.filter((c) => MASQUABLES.has(c)))] : [...JOURNEE_DEFAUT.masques];
  const heuresMoment = [...new Set((Array.isArray(b.heuresMoment) ? b.heuresMoment : []).filter((h) => Number.isInteger(h) && h >= HEURE_MIN && h <= HEURE_MAX))].sort((a, b2) => a - b2);
  return { ordre, masques, heuresMoment };
}

export const champsVisibles = (j) => j.ordre.filter((c) => !j.masques.includes(c));

// Champs du journal portés par chaque champ du soir (détails compris). La durée de la nuit (v8) est dans la carte
// Sommeil ; coucher, lever et réveils sont au repli « Nuit en détail ».
const DONNEES_CHAMP = {
  lieu: ['lieu'], sommeil: ['sommeilRessenti', 'heuresSommeil'], humeur: ['humeur'], contact: ['contactHumain', 'contacts'],
  sport: ['sportMouvement', 'activites'], explosions: ['explosions'], traitement: ['traitementPris'], positifs: ['pointsPositifs'],
  gratitudes: ['gratitudes'],
};
export const champRenseigne = (champ, entree) => Boolean(entree) && DONNEES_CHAMP[champ].some((k) => entree[k] != null);

// Écran du jour : un champ masqué reste affiché tant qu'il porte une valeur (rien ne se cache sans
// pouvoir être vu ni effacé), à sa place dans l'ordre choisi.
export const champsAffiches = (j, entree) => j.ordre.filter((c) => !j.masques.includes(c) || champRenseigne(c, entree));

// Repli « pesé · rechargé » : comme un champ, masqué il reste affiché tant qu'il porte une valeur ce jour-là.
export const repliAffiche = (j, entree) => !j.masques.includes(MASQUE_PESE_RECHARGE) || Boolean(entree && (entree.pese != null || entree.recharge != null));

// Repli « Nuit en détail » (v8) : affiché avec la carte Sommeil quand il n'est pas masqué ; masqué, ou la carte Sommeil
// masquée, il reste affiché un jour où la nuit a un coucher, un lever ou des réveils (les nuits déjà notées).
export const nuitRenseignee = (entree) => Boolean(entree) && ['heureCoucher', 'heureLever', 'reveilsNocturnes'].some((k) => entree[k] != null);
export const repliNuitAffiche = (j, entree) => (!j.masques.includes(MASQUE_NUIT) && champsAffiches(j, entree).includes('sommeil')) || nuitRenseignee(entree);

// Déplace un champ d'un cran (sens : -1 vers le haut, +1 vers le bas).
export function deplacerChamp(j, champ, sens) {
  const ordre = [...j.ordre];
  const i = ordre.indexOf(champ);
  const k = i + sens;
  if (i < 0 || k < 0 || k >= ordre.length) return j;
  [ordre[i], ordre[k]] = [ordre[k], ordre[i]];
  return { ...j, ordre };
}

// La roue d'une carte Sport ou Contact (v11, spec §5.4) écrit la durée (ou l'effet) de la première ligne : seule celle-ci
// change, les autres restent les mêmes. Sans ligne, elle crée la première. Devenue vide (rien que des null ou des listes
// vides, comme « avec qui » sans personne), elle sort, comme en base ; plus aucune ligne donne null.
const ligneVide = (l) => Object.values(l).every((v) => v == null || (Array.isArray(v) && v.length === 0));
export function changerPremiereLigne(lignes, champ, valeur) {
  const avant = Array.isArray(lignes) ? lignes : [];
  const [premiere = {}, ...autres] = avant;
  const nouvelle = { ...premiere, [champ]: valeur };
  const res = ligneVide(nouvelle) ? autres : [nouvelle, ...autres];
  return res.length ? res : null;
}
