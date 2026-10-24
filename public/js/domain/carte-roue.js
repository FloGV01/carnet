// Carte des émotions (v8, spec §4 et §12.5) : la place des 79 mots de la roue sur la carte de l'écran « Émotion du
// moment », comme How We Feel. Pur. La place n'est jamais enregistrée ni calculée ailleurs : elle sert seulement à
// dessiner la carte, et se corrige ici sans toucher aux relevés (`roue:<famille>:<mot>`).
// col : de 1 (bord gauche, le plus désagréable) à 6 (bord droit, le plus agréable) ; 3 et 4 bordent le centre.
// rang : la hauteur d'énergie, de 1 (en bas) à 6 (en haut). Sur la carte, rangs 5-6 = Haute, 3-4 = Moyenne, 1-2 = Basse.
// Source (docs/decisions.md, v8) : un mot qui a un équivalent clair dans la liste de How We Feel (144 mots en quatre
// zones de 6 × 6) prend sa zone et sa hauteur, ramenées de 12 à 6 cases par paires ; l'équivalent est noté en
// commentaire. Les autres gardent le tableau §9 de l'annexe hwf-placement.md (« annexe »).
import { FAMILLES } from './roue.js';

const P = {
  // Colère
  'roue:colere:embarrasse': [2, 4], // embarrassed
  'roue:colere:devaste': [1, 2], // annexe
  'roue:colere:insecurise': [2, 3], // insecure
  'roue:colere:jaloux': [1, 5], // jealous
  'roue:colere:amer': [2, 3], // annexe
  'roue:colere:defiant': [3, 4], // annexe
  'roue:colere:furieux': [1, 5], // furious
  'roue:colere:enrage': [1, 6], // enraged
  'roue:colere:provocateur': [3, 5], // annexe
  'roue:colere:hostile': [1, 5], // annexe
  'roue:colere:mecontent': [2, 3], // annexe
  'roue:colere:irrite': [3, 5], // irritated
  'roue:colere:retire': [3, 2], // annexe
  'roue:colere:suspect': [3, 4], // annexe
  'roue:colere:sceptique': [3, 3], // annexe
  'roue:colere:sarcastique': [3, 4], // annexe
  // Dégoût
  'roue:degout:juge': [2, 3], // annexe
  'roue:degout:aversion': [2, 4], // annexe
  'roue:degout:repugnant': [1, 4], // repulsed
  'roue:degout:revolte': [1, 5], // annexe
  'roue:degout:degout': [1, 3], // disgusted
  'roue:degout:detestable': [1, 3], // annexe
  'roue:degout:hesitant': [3, 3], // annexe
  // Tristesse
  'roue:tristesse:fautif': [1, 2], // guilty
  'roue:tristesse:honteux': [1, 3], // ashamed
  'roue:tristesse:ignore': [2, 2], // annexe
  'roue:tristesse:replie': [3, 1], // annexe
  'roue:tristesse:impuissant': [3, 1], // helpless
  'roue:tristesse:vulnerable': [1, 2], // vulnerable
  'roue:tristesse:minable': [1, 2], // annexe
  'roue:tristesse:vide': [2, 1], // annexe
  'roue:tristesse:abandonne': [1, 2], // annexe
  'roue:tristesse:isole': [2, 2], // annexe
  'roue:tristesse:amorphe': [3, 1], // annexe
  'roue:tristesse:indifferent': [3, 1], // annexe
  // Joie
  'roue:joie:inspire': [6, 6], // inspired
  'roue:joie:ouvert': [5, 3], // annexe
  'roue:joie:espiegle': [4, 4], // playful
  'roue:joie:sensible': [4, 3], // annexe
  'roue:joie:optimiste': [6, 5], // optimistic
  'roue:joie:aimant': [5, 3], // annexe
  'roue:joie:provocant': [4, 5], // annexe
  'roue:joie:courageux': [5, 5], // annexe
  'roue:joie:accompli': [6, 4], // accomplished
  'roue:joie:respecte': [5, 3], // respected
  'roue:joie:important': [5, 4], // annexe
  'roue:joie:curieux': [4, 5], // curious
  'roue:joie:amuse': [5, 5], // annexe
  'roue:joie:extasie': [6, 6], // ecstatic
  'roue:joie:libere': [6, 4], // annexe
  'roue:joie:confiant': [5, 4], // confident
  // Surprise
  'roue:surprise:energique': [4, 5], // energized
  'roue:surprise:avide': [4, 5], // eager
  'roue:surprise:effraye': [1, 5], // frightened
  'roue:surprise:abasourdi': [3, 5], // annexe
  'roue:surprise:perplexe': [3, 5], // confused
  'roue:surprise:desillusionne': [2, 2], // annexe
  'roue:surprise:consterne': [2, 3], // annexe
  'roue:surprise:choque': [2, 6], // shocked
  // Peur
  'roue:peur:terrifie': [1, 6], // terrified
  'roue:peur:craintif': [2, 4], // annexe
  'roue:peur:accable': [1, 3], // annexe (le plus ambigu : « overwhelmed » ou « écrasé »)
  'roue:peur:preoccupe': [2, 4], // worried
  'roue:peur:incapable': [2, 2], // annexe
  'roue:peur:inferieur': [2, 2], // annexe
  'roue:peur:sans-valeur': [1, 1], // annexe
  'roue:peur:inadequat': [2, 2], // annexe
  'roue:peur:insignifiant': [2, 1], // annexe
  'roue:peur:exclus': [2, 2], // excluded
  'roue:peur:non-respecte': [2, 4], // annexe
  'roue:peur:ridiculise': [1, 4], // annexe
  // Sérénité
  'roue:serenite:calme': [4, 3], // calm
  'roue:serenite:apaise': [5, 2], // annexe
  'roue:serenite:detendu': [4, 2], // relaxed
  'roue:serenite:repose': [5, 3], // annexe
  'roue:serenite:tranquille': [4, 1], // tranquil
  'roue:serenite:serein': [6, 1], // serene
  'roue:serenite:pose': [4, 3], // annexe
  'roue:serenite:en-securite': [5, 1], // safe
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
// quand la zone en a plusieurs.
export const EXEMPLES = Object.freeze({
  'haute-gauche': ['roue:colere:furieux', 'roue:peur:terrifie', 'roue:surprise:choque'],
  'haute-droite': ['roue:joie:extasie', 'roue:surprise:energique', 'roue:joie:curieux'],
  'moyenne-gauche': ['roue:colere:mecontent', 'roue:tristesse:honteux', 'roue:peur:preoccupe'],
  'moyenne-droite': ['roue:serenite:calme', 'roue:joie:confiant'],
  'basse-gauche': ['roue:tristesse:vide', 'roue:colere:devaste', 'roue:peur:incapable'],
  'basse-droite': ['roue:serenite:detendu', 'roue:serenite:serein'],
});
