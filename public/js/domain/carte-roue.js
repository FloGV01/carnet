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
import { libelleEmotion, motPerso } from './roue.js';

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
