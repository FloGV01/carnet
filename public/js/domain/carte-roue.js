// Carte des émotions (v9, spec §6 et §7) : la place des 144 mots de la roue sur la grille 12 × 12 de How We Feel. Pur.
// La place n'est jamais enregistrée : elle dessine la carte et donne la zone et l'énergie d'un mot. Elle se corrige ici
// sans toucher aux relevés (`roue:<famille>:<mot>`), sauf l'énergie, qui est enregistrée au toucher du mot.
// col : de 1 (à gauche, le plus désagréable) à 12 (à droite, le plus agréable). rang : l'énergie, de 1 (en bas, la plus
// basse) à 12 (en haut, la plus haute). Quatre zones de 6 × 6 : rouge (énergie haute, désagréable), jaune (haute,
// agréable), bleu (basse, désagréable), vert (basse, agréable).
// Source : docs/superpowers/specs/2026-10-28-carnet-v9/carte-proposee.json (les mots de How We Feel, à leur case, et les
// 79 mots de la roue à la case de leur équivalent ou d'un mot écarté), avec les changements de la spec §6 : Insouciant à
// la case d'Ensommeillé, Fatigué et Épuisé sans famille. Un seul mot de la roue change de zone : Accablé, du bleu (v8) au
// rouge (« Overwhelmed »).
import { FAMILLES, libelleEmotion, motPerso } from './roue.js';

// Du rang 12 (en haut) au rang 1 ; sur chaque rang, les colonnes 1 à 6, puis 7 à 12. Sans « roue: ».
const GRILLE = [
  /* 12 */ ['colere:enrage', 'peur:terrifie', 'peur:panique', 'surprise:choque', 'surprise:abasourdi', 'peur:survolte',
    'surprise:surpris', 'surprise:emerveille', 'joie:euphorique', 'joie:electrise', 'joie:aux-anges', 'joie:extasie'],
  /* 11 */ ['degout:revolte', 'colere:hostile', 'peur:accable', 'peur:stresse', 'colere:provocateur', 'peur:sous-pression',
    'surprise:emballe', 'joie:determine', 'joie:courageux', 'surprise:epate', 'joie:inspire', 'joie:fort'],
  /* 10 */ ['colere:furieux', 'surprise:effraye', 'peur:anxieux', 'peur:craintif', 'colere:irrite', 'peur:agite',
    'surprise:energique', 'surprise:avide', 'joie:enthousiaste', 'joie:joyeux', 'joie:productif', 'joie:fier'],
  /*  9 */ ['colere:jaloux', 'peur:apeure', 'colere:en-colere', 'colere:defiant', 'colere:suspect', 'surprise:perplexe',
    'joie:provocant', 'joie:curieux', 'joie:amuse', 'joie:heureux', 'joie:motive', 'joie:optimiste'],
  /*  8 */ ['peur:ridiculise', 'degout:repugnant', 'colere:frustre', 'colere:embarrasse', 'peur:preoccupe', 'peur:tendu',
    'joie:gai', 'joie:concentre', 'joie:vivant', 'joie:confiant', 'joie:libere', 'joie:stimule'],
  /*  7 */ ['degout:mepris', 'degout:aversion', 'peur:inquiet', 'peur:non-respecte', 'colere:sarcastique', 'peur:mal-a-l-aise',
    'joie:rejoui', 'joie:espiegle', 'joie:ravi', 'joie:important', 'joie:competent', 'joie:accompli'],
  /*  6 */ ['degout:degout', 'degout:juge', 'colere:insecurise', 'surprise:consterne', 'degout:hesitant', 'tristesse:ennui',
    'serenite:calme', 'serenite:a-l-aise', 'joie:compris', 'joie:respecte', 'joie:epanoui', 'joie:comble'],
  /*  5 */ ['degout:detestable', 'tristesse:honteux', 'colere:mecontent', 'surprise:desillusionne', 'colere:sceptique', 'aucune:fatigue',
    'serenite:bien', 'serenite:pensif', 'joie:apprecie', 'joie:soutenu', 'joie:aime', 'joie:relie'],
  /*  4 */ ['colere:amer', 'tristesse:vulnerable', 'tristesse:fautif', 'tristesse:abandonne', 'tristesse:triste', 'tristesse:replie',
    'serenite:detendu', 'serenite:repose', 'joie:compatissant', 'joie:inclus', 'joie:aimant', 'joie:reconnaissant'],
  /*  3 */ ['colere:devaste', 'tristesse:minable', 'peur:exclus', 'peur:incapable', 'tristesse:decourage', 'colere:retire',
    'joie:bienveillant', 'joie:sensible', 'joie:ecoute', 'joie:content', 'joie:accepte', 'joie:emu'],
  /*  2 */ ['peur:inferieur', 'peur:inadequat', 'tristesse:ignore', 'tristesse:isole', 'tristesse:amorphe', 'tristesse:indifferent',
    'serenite:pose', 'joie:ouvert', 'serenite:equilibre', 'serenite:en-securite', 'serenite:solide', 'joie:chanceux'],
  /*  1 */ ['peur:sans-valeur', 'tristesse:desespere', 'peur:insignifiant', 'tristesse:vide', 'aucune:epuise', 'tristesse:impuissant',
    'serenite:insouciant', 'serenite:tranquille', 'serenite:apaise', 'serenite:soulage', 'joie:satisfait', 'serenite:serein'],
];
const COTE = 12;

// Les 144 cases, dans l'ordre de lecture de la carte (de haut en bas, de gauche à droite).
const CASES = GRILLE.flatMap((ligne, i) => ligne.map((m, j) => ({ id: `roue:${m}`, col: j + 1, rang: COTE - i })));
export const PLACEMENT = Object.freeze(Object.fromEntries(CASES.map(({ id, col, rang }) => [id, Object.freeze({ col, rang })])));

// Les zones, dans l'ordre où l'app les montre et les compte.
export const ZONES = Object.freeze(['rouge', 'jaune', 'bleu', 'vert']);
// Le nom d'une zone (v9, spec §2) : son énergie et son ressenti, pour les légendes et VoiceOver. Jamais bien ou mal.
export const NOMS_ZONES = Object.freeze({
  rouge: 'Énergie haute · désagréable', jaune: 'Énergie haute · agréable', bleu: 'Énergie basse · désagréable', vert: 'Énergie basse · agréable',
});
const estZone = (z) => ZONES.includes(z);
const dansLaGrille = (n) => Number.isInteger(n) && n >= 1 && n <= COTE;

// La zone d'une case de la grille ; null hors de la grille.
export function zoneDeCase(col, rang) {
  if (!dansLaGrille(col) || !dansLaGrille(rang)) return null;
  if (rang >= 7) return col <= 6 ? 'rouge' : 'jaune';
  return col <= 6 ? 'bleu' : 'vert';
}

const caseDe = (id) => (typeof id === 'string' && Object.hasOwn(PLACEMENT, id) ? PLACEMENT[id] : null);

// La zone d'un mot : celle de sa case, ou celle d'un mot à soi (méta `motsPerso`) ; null pour une famille seule (relevé
// de la v7), un mot à soi sans zone et un id inconnu.
export function zoneDe(id, perso) {
  const c = caseDe(id);
  if (c) return zoneDeCase(c.col, c.rang);
  const mot = motPerso(id, perso);
  return mot && estZone(mot.zone) ? mot.zone : null;
}

// L'énergie enregistrée avec un mot (liste `energie`, spec §7) : rangs 1-4 basse, 5-8 moyenne, 9-12 haute. Un mot à soi,
// qui n'a pas de rang : haute en rouge et en jaune, basse en bleu et en vert. null sans zone ni case.
export function energieDe(id, perso) {
  const c = caseDe(id);
  if (c) return c.rang <= 4 ? 'energie:basse' : c.rang <= 8 ? 'energie:moyenne' : 'energie:haute';
  const zone = zoneDe(id, perso);
  if (!zone) return null;
  return zone === 'rouge' || zone === 'jaune' ? 'energie:haute' : 'energie:basse';
}

// Les mots à soi sur la carte (spec §4.5) : hors du carré, du côté extérieur de leur zone (rouge et bleu à gauche, col 0,
// −1, … ; jaune et vert à droite, col 13, 14, …), une colonne de 6 cases après l'autre, en partant du bord d'énergie
// extérieur (rouge et jaune : du rang 12 au 7 ; bleu et vert : du rang 1 au 6). Ils ne recouvrent jamais un mot.
const A_GAUCHE = new Set(['rouge', 'bleu']);
const EN_HAUT = new Set(['rouge', 'jaune']);
function caseDuMotPerso(zone, n) {
  const colonne = Math.floor(n / 6) + 1;
  const pas = n % 6;
  return {
    col: A_GAUCHE.has(zone) ? 1 - colonne : COTE + colonne,
    rang: EN_HAUT.has(zone) ? COTE - pas : 1 + pas,
  };
}

// Tous les mots de la carte : [{ id, libelle, col, rang, zone, perso }]. Les 144 de la roue dans l'ordre de lecture, puis
// les mots à soi qui ne sont pas mis de côté et ont une zone de la carte, dans l'ordre de création. La loupe trouve les
// mêmes : motsActifs (mots-perso.js) les prend ici.
export function motsDeLaCarte(perso) {
  const roue = CASES.map(({ id, col, rang }) => ({ id, libelle: libelleEmotion(id), col, rang, zone: zoneDeCase(col, rang), perso: false }));
  const actifs = Object.keys(perso && typeof perso === 'object' ? perso : {})
    .map((id) => [id, motPerso(id, perso)])
    .filter(([, mot]) => mot && !mot.archive && estZone(mot.zone))
    .sort(([a, x], [b, y]) => String(x.createdAt || '').localeCompare(String(y.createdAt || '')) || a.localeCompare(b));
  const parZone = Object.fromEntries(ZONES.map((z) => [z, 0]));
  const siens = actifs.map(([id, mot]) => ({ id, libelle: mot.libelle.trim(), ...caseDuMotPerso(mot.zone, parZone[mot.zone]++), zone: mot.zone, perso: true }));
  return [...roue, ...siens];
}

// ---------- TRANSITOIRE : la carte de la v8 ----------
// L'écran « Émotion du moment » de la v8 (ui/composants/carte-emotions.js) montre encore les 79 mots de la v8 en six
// tuiles, jusqu'aux écrans plein écran de la v9 (tâche 4 du plan v9), qui retirent cette section et son test
// (tests/unit/carte-roue-v8.test.js). Gardée telle quelle depuis la v8 (spec v8 §4 et §12.5), sous deux noms changés :
// PLACEMENT_V8 et tuileDe.
// col : de 1 (bord gauche, le plus désagréable) à 6 (bord droit, le plus agréable) ; 3 et 4 bordent le centre.
// rang : la hauteur d'énergie, de 1 (en bas) à 6 (en haut). Sur la carte, rangs 5-6 = Haute, 3-4 = Moyenne, 1-2 = Basse.
// Source (docs/decisions.md, v8) : le tableau §9 de l'annexe hwf-placement.md, pour les 79 mots. La liste de How We
// Feel (144 mots en quatre zones, sans place dans la zone) n'atteste que le quadrant : le côté et la moitié, haute
// (rangs 4-6) ou basse (rangs 1-3). Un mot qui y a un équivalent clair (noté en commentaire ; « annexe » : aucun)
// garde ce quadrant, que l'annexe lui donne déjà pour 31 des 33. Les deux autres, que l'annexe met dans l'autre
// moitié, prennent le rang de ce quadrant le plus proche de l'annexe (Dégoût, Perplexe). Aucune source vérifiable ne
// donne la hauteur dans le quadrant (spec §12.5) : c'est celle de l'annexe, et la bande d'énergie aussi.

const P_V8 = {
  // Colère
  'roue:colere:embarrasse': [2, 4], // embarrassed
  'roue:colere:devaste': [1, 2], // annexe
  'roue:colere:insecurise': [2, 3], // insecure
  'roue:colere:jaloux': [2, 4], // jealous
  'roue:colere:amer': [2, 3], // annexe
  'roue:colere:defiant': [3, 4], // annexe
  'roue:colere:furieux': [1, 6], // furious
  'roue:colere:enrage': [1, 6], // enraged
  'roue:colere:provocateur': [3, 5], // annexe
  'roue:colere:hostile': [1, 5], // annexe
  'roue:colere:mecontent': [2, 3], // annexe
  'roue:colere:irrite': [2, 4], // irritated
  'roue:colere:retire': [3, 2], // annexe
  'roue:colere:suspect': [3, 4], // annexe
  'roue:colere:sceptique': [3, 3], // annexe
  'roue:colere:sarcastique': [3, 4], // annexe
  // Dégoût
  'roue:degout:juge': [2, 3], // annexe
  'roue:degout:aversion': [2, 4], // annexe
  'roue:degout:repugnant': [1, 4], // repulsed
  'roue:degout:revolte': [1, 5], // annexe
  'roue:degout:degout': [1, 3], // disgusted : moitié basse chez How We Feel, l'annexe dit 1, 4
  'roue:degout:detestable': [1, 3], // annexe
  'roue:degout:hesitant': [3, 3], // annexe
  // Tristesse
  'roue:tristesse:fautif': [2, 3], // guilty
  'roue:tristesse:honteux': [1, 3], // ashamed
  'roue:tristesse:ignore': [2, 2], // annexe
  'roue:tristesse:replie': [3, 1], // annexe
  'roue:tristesse:impuissant': [1, 2], // helpless
  'roue:tristesse:vulnerable': [2, 3], // vulnerable
  'roue:tristesse:minable': [1, 2], // annexe
  'roue:tristesse:vide': [2, 1], // annexe
  'roue:tristesse:abandonne': [1, 2], // annexe
  'roue:tristesse:isole': [2, 2], // annexe
  'roue:tristesse:amorphe': [3, 1], // annexe
  'roue:tristesse:indifferent': [3, 1], // annexe
  // Joie
  'roue:joie:inspire': [5, 5], // inspired
  'roue:joie:ouvert': [5, 3], // annexe
  'roue:joie:espiegle': [5, 5], // playful
  'roue:joie:sensible': [4, 3], // annexe
  'roue:joie:optimiste': [5, 4], // optimistic
  'roue:joie:aimant': [5, 3], // annexe
  'roue:joie:provocant': [4, 5], // annexe
  'roue:joie:courageux': [5, 5], // annexe
  'roue:joie:accompli': [6, 4], // accomplished
  'roue:joie:respecte': [5, 3], // respected
  'roue:joie:important': [5, 4], // annexe
  'roue:joie:curieux': [4, 4], // curious
  'roue:joie:amuse': [5, 5], // annexe
  'roue:joie:extasie': [6, 6], // ecstatic
  'roue:joie:libere': [6, 4], // annexe
  'roue:joie:confiant': [5, 4], // confident
  // Surprise
  'roue:surprise:energique': [5, 6], // energized
  'roue:surprise:avide': [4, 5], // eager
  'roue:surprise:effraye': [2, 5], // frightened
  'roue:surprise:abasourdi': [3, 5], // annexe
  'roue:surprise:perplexe': [3, 4], // confused : moitié haute chez How We Feel, l'annexe dit 3, 3
  'roue:surprise:desillusionne': [2, 2], // annexe
  'roue:surprise:consterne': [2, 3], // annexe
  'roue:surprise:choque': [2, 5], // shocked
  // Peur
  'roue:peur:terrifie': [1, 6], // terrified
  'roue:peur:craintif': [2, 4], // annexe
  'roue:peur:accable': [1, 3], // annexe (le plus ambigu : « overwhelmed » ou « écrasé »)
  'roue:peur:preoccupe': [3, 4], // worried
  'roue:peur:incapable': [2, 2], // annexe
  'roue:peur:inferieur': [2, 2], // annexe
  'roue:peur:sans-valeur': [1, 1], // annexe
  'roue:peur:inadequat': [2, 2], // annexe
  'roue:peur:insignifiant': [2, 1], // annexe
  'roue:peur:exclus': [1, 3], // excluded
  'roue:peur:non-respecte': [2, 4], // annexe
  'roue:peur:ridiculise': [1, 4], // annexe
  // Sérénité
  'roue:serenite:calme': [5, 2], // calm
  'roue:serenite:apaise': [5, 2], // annexe
  'roue:serenite:detendu': [5, 2], // relaxed
  'roue:serenite:repose': [5, 3], // annexe
  'roue:serenite:tranquille': [5, 1], // tranquil
  'roue:serenite:serein': [6, 2], // serene
  'roue:serenite:pose': [4, 3], // annexe
  'roue:serenite:en-securite': [5, 2], // safe
};

export const PLACEMENT_V8 = Object.freeze(Object.fromEntries(Object.entries(P_V8)
  .map(([id, [col, rang]]) => [id, Object.freeze({ col, rang })])));

// Les zones de la carte : trois bandes d'énergie (de haut en bas) et deux côtés. Une zone est celle d'une tuile.
export const ENERGIES = Object.freeze(['haute', 'moyenne', 'basse']);
export const COTES = Object.freeze(['gauche', 'droite']);
export const cleZone = ({ energie, cote }) => `${energie}-${cote}`;
const bandeV8 = (rang) => (rang >= 5 ? 'haute' : rang >= 3 ? 'moyenne' : 'basse');

// La tuile d'un mot de la v8 : { cote, energie } ; null pour un id qui n'est pas un des 79 (une famille seule, un ajout).
export function tuileDe(id) {
  const p = Object.prototype.hasOwnProperty.call(PLACEMENT_V8, id) ? PLACEMENT_V8[id] : null;
  return p ? { cote: p.col <= 3 ? 'gauche' : 'droite', energie: bandeV8(p.rang) } : null;
}

// L'ordre des mots de la roue : famille, puis place dans la famille.
const ORDRE = new Map(FAMILLES.flatMap((f, i) => f.mots.map((m, j) => [m.id, [i, j]])));
const familleDuMot = (id) => ORDRE.get(id)[0];

// Les mots d'une zone, dans l'ordre où la carte les pose : du plus haut au plus bas, du bord vers le centre, puis
// regroupés par famille (une famille reste d'un seul tenant, à la place de son premier mot) : les mots d'une même
// famille sont côte à côte, et la carte est toujours la même.
export function motsDeZone({ energie, cote }) {
  const bord = (col) => (cote === 'gauche' ? col : 7 - col);
  const tries = Object.keys(PLACEMENT_V8)
    .filter((id) => { const z = tuileDe(id); return z.energie === energie && z.cote === cote; })
    .sort((a, b) => PLACEMENT_V8[b].rang - PLACEMENT_V8[a].rang || bord(PLACEMENT_V8[a].col) - bord(PLACEMENT_V8[b].col)
      || ORDRE.get(a)[0] - ORDRE.get(b)[0] || ORDRE.get(a)[1] - ORDRE.get(b)[1]);
  const familles = [...new Set(tries.map(familleDuMot))];
  return familles.flatMap((f) => tries.filter((id) => familleDuMot(id) === f));
}

// Deux ou trois mots d'exemple par tuile, à la couleur de leur famille : des mots de la zone, de familles différentes
// quand la zone en a plusieurs, et vus dès l'ouverture de la carte. Les zones Moyenne et Basse, plus hautes que le
// cadre, s'ouvrent sur leur haut : leurs exemples sont pris parmi leurs premiers mots (e2e v8-emotion, 390 × 844).
export const EXEMPLES = Object.freeze({
  'haute-gauche': ['roue:colere:furieux', 'roue:peur:terrifie', 'roue:surprise:choque'],
  'haute-droite': ['roue:joie:extasie', 'roue:surprise:energique', 'roue:joie:amuse'],
  'moyenne-gauche': ['roue:peur:preoccupe', 'roue:degout:juge'],
  'moyenne-droite': ['roue:joie:confiant', 'roue:joie:curieux', 'roue:serenite:repose'],
  'basse-gauche': ['roue:tristesse:vide', 'roue:colere:devaste'],
  'basse-droite': ['roue:serenite:calme', 'roue:serenite:serein'],
});
