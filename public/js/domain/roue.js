// Roue des émotions (v7) : les mots de la couronne extérieure de la roue de l'utilisateur, au
// masculin comme sur l'image, rangés par famille, plus une 7ᵉ famille, Sérénité. Pur.
// Vocabulaire FIGÉ une fois publié, comme les listes `declencheur` et `dessous` : un libellé ne se
// lisse, ne se renomme et ne se réordonne jamais ; un ajout se fait à la fin d'une famille. Il ne
// passe pas par le store `listes` : il ne se règle pas dans Réglages › Listes.
// Identifiants stockés (humeurs.emotion) : `roue:<famille>` pour une famille seule, quand le mot
// n'est pas trouvé, et `roue:<famille>:<mot>` pour un mot. Le slug est en ASCII minuscule, l'espace
// et l'apostrophe y deviennent « - » (« Mal à l'aise » : `mal-a-l-aise`). Il est écrit ici en dur :
// il ne suit pas un libellé, il ne change plus.
// v9 (spec §6) : la carte de How We Feel, 144 mots. Les 79 mots de la v7 gardent identifiant, libellé
// et famille ; les ajouts viennent à la fin de chaque famille, dans l'ordre de la carte (du rang le
// plus haut au plus bas, de gauche à droite). Fatigué et Épuisé n'ont pas de famille, comme chez How
// We Feel : `roue:aucune:<mot>`, où `aucune` est un préfixe réservé, jamais une famille. Les mots à
// soi (`roue:perso:u-<8 hexa>`) vivent dans la méta `motsPerso` : libellé, zone, famille et
// définition y sont, jamais dans l'identifiant. Les fonctions qui lisent un mot la reçoivent en
// dernier paramètre facultatif, `perso`.

// [famille, libellé, [[mot, libellé], …]], dans l'ordre des familles.
const ROUE = [
  ['colere', 'Colère', [
    ['embarrasse', 'Embarrassé'], ['devaste', 'Dévasté'], ['insecurise', 'Insécurisé'], ['jaloux', 'Jaloux'],
    ['amer', 'Amer'], ['defiant', 'Défiant'], ['furieux', 'Furieux'], ['enrage', 'Enragé'], ['provocateur', 'Provocateur'],
    ['hostile', 'Hostile'], ['mecontent', 'Mécontent'], ['irrite', 'Irrité'], ['retire', 'Retiré'], ['suspect', 'Suspect'],
    ['sceptique', 'Sceptique'], ['sarcastique', 'Sarcastique'],
    // v9
    ['en-colere', 'En colère'], ['frustre', 'Frustré']]],
  // « Aversion » figure deux fois sur l'image : une seule bulle.
  ['degout', 'Dégoût', [
    ['juge', 'Jugé'], ['aversion', 'Aversion'], ['repugnant', 'Répugnant'], ['revolte', 'Révolté'], ['degout', 'Dégoût'],
    ['detestable', 'Détestable'], ['hesitant', 'Hésitant'],
    // v9
    ['mepris', 'Mépris']]],
  ['tristesse', 'Tristesse', [
    ['fautif', 'Fautif'], ['honteux', 'Honteux'], ['ignore', 'Ignoré'], ['replie', 'Replié'], ['impuissant', 'Impuissant'],
    ['vulnerable', 'Vulnérable'], ['minable', 'Minable'], ['vide', 'Vide'], ['abandonne', 'Abandonné'], ['isole', 'Isolé'],
    ['amorphe', 'Amorphe'], ['indifferent', 'Indifférent'],
    // v9
    ['ennui', 'Ennui'], ['triste', 'Triste'], ['decourage', 'Découragé'], ['desespere', 'Désespéré']]],
  ['joie', 'Joie', [
    ['inspire', 'Inspiré'], ['ouvert', 'Ouvert'], ['espiegle', 'Espiègle'], ['sensible', 'Sensible'], ['optimiste', 'Optimiste'],
    ['aimant', 'Aimant'], ['provocant', 'Provocant'], ['courageux', 'Courageux'], ['accompli', 'Accompli'], ['respecte', 'Respecté'],
    ['important', 'Important'], ['curieux', 'Curieux'], ['amuse', 'Amusé'], ['extasie', 'Extasié'], ['libere', 'Libéré'],
    ['confiant', 'Confiant'],
    // v9
    ['euphorique', 'Euphorique'], ['electrise', 'Électrisé'], ['aux-anges', 'Aux anges'], ['determine', 'Déterminé'],
    ['fort', 'Fort'], ['enthousiaste', 'Enthousiaste'], ['joyeux', 'Joyeux'], ['productif', 'Productif'], ['fier', 'Fier'],
    ['heureux', 'Heureux'], ['motive', 'Motivé'], ['gai', 'Gai'], ['concentre', 'Concentré'], ['vivant', 'Vivant'],
    ['stimule', 'Stimulé'], ['rejoui', 'Réjoui'], ['ravi', 'Ravi'], ['competent', 'Compétent'], ['compris', 'Compris'],
    ['epanoui', 'Épanoui'], ['comble', 'Comblé'], ['apprecie', 'Apprécié'], ['soutenu', 'Soutenu'], ['aime', 'Aimé'],
    ['relie', 'Relié'], ['compatissant', 'Compatissant'], ['inclus', 'Inclus'], ['reconnaissant', 'Reconnaissant'],
    ['bienveillant', 'Bienveillant'], ['ecoute', 'Écouté'], ['content', 'Content'], ['accepte', 'Accepté'], ['emu', 'Ému'],
    ['chanceux', 'Chanceux'], ['satisfait', 'Satisfait']]],
  ['surprise', 'Surprise', [
    ['energique', 'Énergique'], ['avide', 'Avide'], ['effraye', 'Effrayé'], ['abasourdi', 'Abasourdi'], ['perplexe', 'Perplexe'],
    ['desillusionne', 'Désillusionné'], ['consterne', 'Consterné'], ['choque', 'Choqué'],
    // v9
    ['surpris', 'Surpris'], ['emerveille', 'Émerveillé'], ['emballe', 'Emballé'], ['epate', 'Épaté']]],
  ['peur', 'Peur', [
    ['terrifie', 'Terrifié'], ['craintif', 'Craintif'], ['accable', 'Accablé'], ['preoccupe', 'Préoccupé'], ['incapable', 'Incapable'],
    ['inferieur', 'Inférieur'], ['sans-valeur', 'Sans valeur'], ['inadequat', 'Inadéquat'], ['insignifiant', 'Insignifiant'],
    ['exclus', 'Exclus'], ['non-respecte', 'Non respecté'], ['ridiculise', 'Ridiculisé'],
    // v9 (Survolté : la case de « Hyper » chez How We Feel)
    ['panique', 'Paniqué'], ['survolte', 'Survolté'], ['stresse', 'Stressé'], ['sous-pression', 'Sous pression'],
    ['anxieux', 'Anxieux'], ['agite', 'Agité'], ['apeure', 'Apeuré'], ['tendu', 'Tendu'], ['inquiet', 'Inquiet'],
    ['mal-a-l-aise', 'Mal à l\'aise']]],
  // Ajoutée à la roue de l'image (spec v7 §4.1).
  ['serenite', 'Sérénité', [
    ['calme', 'Calme'], ['apaise', 'Apaisé'], ['detendu', 'Détendu'], ['repose', 'Reposé'], ['tranquille', 'Tranquille'],
    ['serein', 'Serein'], ['pose', 'Posé'], ['en-securite', 'En sécurité'],
    // v9 (Insouciant : la case de « Carefree »)
    ['a-l-aise', 'À l\'aise'], ['bien', 'Bien'], ['pensif', 'Pensif'], ['equilibre', 'Équilibré'], ['solide', 'Solide'],
    ['insouciant', 'Insouciant'], ['soulage', 'Soulagé']]],
];

// id : l'identifiant stocké de la famille ; cle : son nom court (classes emo-<cle>, comptes par famille).
export const FAMILLES = Object.freeze(ROUE.map(([cle, libelle, mots]) => Object.freeze({
  id: `roue:${cle}`, cle, libelle,
  mots: Object.freeze(mots.map(([slug, mot]) => Object.freeze({ id: `roue:${cle}:${slug}`, libelle: mot }))),
})));

// v9 : les mots sans famille (spec §2 et §6). Ils ne comptent dans aucune famille, seulement dans leur zone.
export const MOTS_SANS_FAMILLE = Object.freeze([['fatigue', 'Fatigué'], ['epuise', 'Épuisé']]
  .map(([slug, libelle]) => Object.freeze({ id: `roue:aucune:${slug}`, libelle })));

// id → { famille, libelle }, pour les familles et pour les mots (famille null pour un mot sans famille).
const PAR_ID = new Map([
  ...FAMILLES.flatMap((f) => [
    [f.id, { famille: f.cle, libelle: f.libelle }],
    ...f.mots.map((m) => [m.id, { famille: f.cle, libelle: m.libelle }]),
  ]),
  ...MOTS_SANS_FAMILLE.map((m) => [m.id, { famille: null, libelle: m.libelle }]),
]);
const CLES = new Set(FAMILLES.map((f) => f.cle));

// Un mot à soi (v9) : son entrée de la méta `motsPerso` ({ libelle, zone, famille, definition, archive, createdAt }), mis
// de côté compris ; null pour un autre id, une méta illisible ou une entrée sans libellé.
const ID_PERSO = /^roue:perso:u-[0-9a-f]{8}$/;
// L'identifiant a-t-il la forme de celui d'un mot à soi, qu'il soit connu ou non ?
export const estIdPerso = (id) => typeof id === 'string' && ID_PERSO.test(id);
const estObjet = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
export function motPerso(id, perso) {
  if (!estIdPerso(id) || !estObjet(perso) || !Object.hasOwn(perso, id)) return null;
  const mot = perso[id];
  return estObjet(mot) && typeof mot.libelle === 'string' && mot.libelle.trim() !== '' ? mot : null;
}

export const estEmotion = (id, perso) => (typeof id === 'string' && PAR_ID.has(id)) || motPerso(id, perso) !== null;

// Le nom court de la famille (`colere`) d'une famille ou d'un mot ; null pour un mot sans famille (Fatigué, Épuisé, un
// mot à soi sans famille) et pour un id inconnu.
export function familleDe(id, perso) {
  if (typeof id === 'string' && PAR_ID.has(id)) return PAR_ID.get(id).famille;
  const mot = motPerso(id, perso);
  return mot && CLES.has(mot.famille) ? mot.famille : null;
}

// Le mot, ou le nom de la famille pour une famille seule ; null pour un id inconnu.
export function libelleEmotion(id, perso) {
  if (typeof id === 'string' && PAR_ID.has(id)) return PAR_ID.get(id).libelle;
  const mot = motPerso(id, perso);
  return mot ? mot.libelle.trim() : null;
}

// Les 144 mots de la roue (v9), familles dans leur ordre puis les mots sans famille : [{ id, libelle, famille }].
export const motsDeLaRoue = () => [
  ...FAMILLES.flatMap((f) => f.mots.map((m) => ({ id: m.id, libelle: m.libelle, famille: f.cle }))),
  ...MOTS_SANS_FAMILLE.map((m) => ({ id: m.id, libelle: m.libelle, famille: null })),
];
