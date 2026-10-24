// Carte des émotions (v8, spec §4 et §12.5) : la place des 79 mots de la roue sur la carte de l'écran « Émotion du
// moment », comme How We Feel. Pur. La place n'est jamais enregistrée ni calculée ailleurs : elle sert seulement à
// dessiner la carte, et se corrige ici sans toucher aux relevés (`roue:<famille>:<mot>`).
// col : de 1 (bord gauche, le plus désagréable) à 6 (bord droit, le plus agréable) ; 3 et 4 bordent le centre.
// rang : la hauteur d'énergie, de 1 (en bas) à 6 (en haut). Sur la carte, rangs 5-6 = Haute, 3-4 = Moyenne, 1-2 = Basse.
// Source (docs/decisions.md, v8) : le tableau §9 de l'annexe hwf-placement.md, pour les 79 mots. La liste de How We
// Feel (144 mots en quatre zones, sans place dans la zone) n'atteste que le quadrant : le côté et la moitié, haute
// (rangs 4-6) ou basse (rangs 1-3). Un mot qui y a un équivalent clair (noté en commentaire ; « annexe » : aucun)
// garde ce quadrant, que l'annexe lui donne déjà pour 31 des 33. Les deux autres, que l'annexe met dans l'autre
// moitié, prennent le rang de ce quadrant le plus proche de l'annexe (Dégoût, Perplexe). Aucune source vérifiable ne
// donne la hauteur dans le quadrant (spec §12.5) : c'est celle de l'annexe, et la bande d'énergie aussi.
import { FAMILLES } from './roue.js';

const P = {
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

export const PLACEMENT = Object.freeze(Object.fromEntries(Object.entries(P)
  .map(([id, [col, rang]]) => [id, Object.freeze({ col, rang })])));

// Les zones de la carte : trois bandes d'énergie (de haut en bas) et deux côtés. Une zone est celle d'une tuile.
export const ENERGIES = Object.freeze(['haute', 'moyenne', 'basse']);
export const COTES = Object.freeze(['gauche', 'droite']);
export const cleZone = ({ energie, cote }) => `${energie}-${cote}`;
const bande = (rang) => (rang >= 5 ? 'haute' : rang >= 3 ? 'moyenne' : 'basse');

// La zone d'un mot : { cote, energie } ; null pour un id qui n'est pas un mot de la roue (une famille seule, par exemple).
export function zoneDe(id) {
  const p = Object.prototype.hasOwnProperty.call(PLACEMENT, id) ? PLACEMENT[id] : null;
  return p ? { cote: p.col <= 3 ? 'gauche' : 'droite', energie: bande(p.rang) } : null;
}

// L'ordre des mots de la roue : famille, puis place dans la famille.
const ORDRE = new Map(FAMILLES.flatMap((f, i) => f.mots.map((m, j) => [m.id, [i, j]])));
const familleDuMot = (id) => ORDRE.get(id)[0];

// Les mots d'une zone, dans l'ordre où la carte les pose : du plus haut au plus bas, du bord vers le centre, puis
// regroupés par famille (une famille reste d'un seul tenant, à la place de son premier mot) : les mots d'une même
// famille sont côte à côte, et la carte est toujours la même.
export function motsDeZone({ energie, cote }) {
  const bord = (col) => (cote === 'gauche' ? col : 7 - col);
  const tries = Object.keys(PLACEMENT)
    .filter((id) => { const z = zoneDe(id); return z.energie === energie && z.cote === cote; })
    .sort((a, b) => PLACEMENT[b].rang - PLACEMENT[a].rang || bord(PLACEMENT[a].col) - bord(PLACEMENT[b].col)
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
