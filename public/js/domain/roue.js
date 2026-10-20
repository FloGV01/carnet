// Roue des émotions (v7) : les mots de la couronne extérieure de la roue de l'utilisateur, au
// masculin comme sur l'image, rangés par famille, plus une 7ᵉ famille, Sérénité. Pur.
// Vocabulaire FIGÉ une fois publié, comme les listes `declencheur` et `dessous` : un libellé ne se
// lisse, ne se renomme et ne se réordonne jamais ; un ajout se fait à la fin d'une famille. Il ne
// passe pas par le store `listes` : il ne se règle pas dans Réglages › Listes.
// Identifiants stockés (humeurs.emotion) : `roue:<famille>` pour une famille seule, quand le mot
// n'est pas trouvé, et `roue:<famille>:<mot>` pour un mot. Le slug est en ASCII minuscule, l'espace
// y devient « - ». Il est écrit ici en dur : il ne suit pas un libellé, il ne change plus.

// [famille, libellé, [[mot, libellé], …]], dans l'ordre des familles.
const ROUE = [
  ['colere', 'Colère', [
    ['embarrasse', 'Embarrassé'], ['devaste', 'Dévasté'], ['insecurise', 'Insécurisé'], ['jaloux', 'Jaloux'],
    ['amer', 'Amer'], ['defiant', 'Défiant'], ['furieux', 'Furieux'], ['enrage', 'Enragé'], ['provocateur', 'Provocateur'],
    ['hostile', 'Hostile'], ['mecontent', 'Mécontent'], ['irrite', 'Irrité'], ['retire', 'Retiré'], ['suspect', 'Suspect'],
    ['sceptique', 'Sceptique'], ['sarcastique', 'Sarcastique']]],
  // « Aversion » figure deux fois sur l'image : une seule bulle.
  ['degout', 'Dégoût', [
    ['juge', 'Jugé'], ['aversion', 'Aversion'], ['repugnant', 'Répugnant'], ['revolte', 'Révolté'], ['degout', 'Dégoût'],
    ['detestable', 'Détestable'], ['hesitant', 'Hésitant']]],
  ['tristesse', 'Tristesse', [
    ['fautif', 'Fautif'], ['honteux', 'Honteux'], ['ignore', 'Ignoré'], ['replie', 'Replié'], ['impuissant', 'Impuissant'],
    ['vulnerable', 'Vulnérable'], ['minable', 'Minable'], ['vide', 'Vide'], ['abandonne', 'Abandonné'], ['isole', 'Isolé'],
    ['amorphe', 'Amorphe'], ['indifferent', 'Indifférent']]],
  ['joie', 'Joie', [
    ['inspire', 'Inspiré'], ['ouvert', 'Ouvert'], ['espiegle', 'Espiègle'], ['sensible', 'Sensible'], ['optimiste', 'Optimiste'],
    ['aimant', 'Aimant'], ['provocant', 'Provocant'], ['courageux', 'Courageux'], ['accompli', 'Accompli'], ['respecte', 'Respecté'],
    ['important', 'Important'], ['curieux', 'Curieux'], ['amuse', 'Amusé'], ['extasie', 'Extasié'], ['libere', 'Libéré'],
    ['confiant', 'Confiant']]],
  ['surprise', 'Surprise', [
    ['energique', 'Énergique'], ['avide', 'Avide'], ['effraye', 'Effrayé'], ['abasourdi', 'Abasourdi'], ['perplexe', 'Perplexe'],
    ['desillusionne', 'Désillusionné'], ['consterne', 'Consterné'], ['choque', 'Choqué']]],
  ['peur', 'Peur', [
    ['terrifie', 'Terrifié'], ['craintif', 'Craintif'], ['accable', 'Accablé'], ['preoccupe', 'Préoccupé'], ['incapable', 'Incapable'],
    ['inferieur', 'Inférieur'], ['sans-valeur', 'Sans valeur'], ['inadequat', 'Inadéquat'], ['insignifiant', 'Insignifiant'],
    ['exclus', 'Exclus'], ['non-respecte', 'Non respecté'], ['ridiculise', 'Ridiculisé']]],
  // Ajoutée à la roue de l'image (spec v7 §4.1).
  ['serenite', 'Sérénité', [
    ['calme', 'Calme'], ['apaise', 'Apaisé'], ['detendu', 'Détendu'], ['repose', 'Reposé'], ['tranquille', 'Tranquille'],
    ['serein', 'Serein'], ['pose', 'Posé'], ['en-securite', 'En sécurité']]],
];

// id : l'identifiant stocké de la famille ; cle : son nom court (classes emo-<cle>, comptes par famille).
export const FAMILLES = Object.freeze(ROUE.map(([cle, libelle, mots]) => Object.freeze({
  id: `roue:${cle}`, cle, libelle,
  mots: Object.freeze(mots.map(([slug, mot]) => Object.freeze({ id: `roue:${cle}:${slug}`, libelle: mot }))),
})));

// id → { famille, libelle }, pour les familles et pour les mots.
const PAR_ID = new Map(FAMILLES.flatMap((f) => [
  [f.id, { famille: f.cle, libelle: f.libelle }],
  ...f.mots.map((m) => [m.id, { famille: f.cle, libelle: m.libelle }]),
]));

export const estEmotion = (id) => typeof id === 'string' && PAR_ID.has(id);

// Le nom court de la famille (`colere`) d'une famille ou d'un mot ; null pour un id inconnu.
export const familleDe = (id) => (estEmotion(id) ? PAR_ID.get(id).famille : null);

// Le mot, ou le nom de la famille pour une famille seule ; null pour un id inconnu.
export const libelleEmotion = (id) => (estEmotion(id) ? PAR_ID.get(id).libelle : null);
