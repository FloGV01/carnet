// « Tes moments, étape par étape » (v5, ex « Avant tes explosions ») : ce que l'utilisateur a
// noté autour de ses épisodes, rassemblé par groupe : les explosions (réaction « Explosion »),
// puis chaque type d'Après coup (Colère, Surcharge, Figé). Des comptes et ses propres mots ;
// jamais une cause, jamais un conseil, jamais « ce qui marche ». Ne sont jamais rassemblés :
// pensées, « ça ressemble à », regrets, « sur le moment », autre façon de voir, tension après. Pur.
import { jourEvenement, formaterDateNumerique } from '../domain/dates.js';
import { estExplosion } from '../domain/explosions.js';
import { mediane } from './stats.js';
import { SEUILS } from './seuils.js';

const S = SEUILS.explosions;
export const TYPES_MOMENTS = ['typeExplosion:colere', 'typeExplosion:surcharge', 'typeExplosion:fige'];

// Une liste : n = nombre d'épisodes du groupe où l'étape a été remplie (la base du « 3 sur 4 ») ;
// elements = ceux notés au moins minTete fois, hors « Je ne sais pas » (hors classement).
function plusFrequents(listes, horsClassement) {
  const remplies = listes.filter((ids) => ids && ids.length);
  const n = new Map();
  for (const ids of remplies) for (const id of new Set(ids)) if (!horsClassement.has(id)) n.set(id, (n.get(id) || 0) + 1);
  const elements = [...n.entries()].filter(([, nb]) => nb >= S.minTete)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, S.maxElements).map(([id, nb]) => ({ id, n: nb }));
  return { n: remplies.length, elements };
}

const parHeure = (a, b) => `${b.date} ${b.heure || ''}`.localeCompare(`${a.date} ${a.heure || ''}`);

function groupe(cle, episodes, autres, hc, max) {
  const ac = episodes.map((e) => e.apresCoup).filter(Boolean);
  const frequents = (listes) => plusFrequents(listes, hc);
  const reperes = ac.map((a) => a.repereA).filter((v) => v != null);
  return {
    cle,
    statut: 'ok',
    n: episodes.length,
    declencheurs: frequents(episodes.map((e) => (e.declencheur ? [e.declencheur] : []))),
    dessous: frequents(episodes.map((e) => (e.dessous ? [e.dessous] : []))),
    types: frequents(ac.map((a) => a.types)),
    fragilites: frequents(ac.map((a) => a.fragilites)),
    tropDe: frequents(ac.map((a) => a.tropDe)),
    signes: frequents(ac.map((a) => a.signes)),
    besoins: frequents(ac.map((a) => a.besoins)),
    repere: reperes.length >= S.minExplosions ? mediane(reperes) : null,
    siAlors: [...new Map(ac.filter((a) => a.siJe || a.alorsJe).map((a) => [`${a.siJe}|${a.alorsJe}`, { si: a.siJe, alors: a.alorsJe }])).values()].slice(0, max),
    // « Ce qui a aidé, d'autres fois » : les mots des épisodes qui n'ont pas été des explosions.
    aide: autres.slice(0, max).map((e) => ({ texte: e.ceQuiAAide, date: formaterDateNumerique(jourEvenement(e.date, e.heure)).slice(0, 5) })),
  };
}

export function tesMoments(episodes, du, au, items = []) {
  const hc = new Set(items.filter((i) => i.horsClassement).map((i) => i.id));
  const dans = (episodes || []).filter((e) => { const j = jourEvenement(e.date, e.heure); return j >= du && j <= au; }).sort(parHeure);
  const autres = dans.filter((e) => !estExplosion(e) && e.ceQuiAAide);
  const explosions = dans.filter(estExplosion);
  const groupes = [];
  // Explosions : seuil sur le nombre d'explosions, avec ou sans Après coup (comme en v4).
  groupes.push(explosions.length >= S.minExplosions ? groupe('explosions', explosions, autres, hc, S.maxCitations) : { cle: 'explosions', statut: 'insuffisant', n: explosions.length });
  // Par type d'Après coup : le groupe n'apparaît qu'à partir de 3 épisodes, sans message sinon.
  for (const t of TYPES_MOMENTS) {
    const eps = dans.filter((e) => e.apresCoup && (e.apresCoup.types || []).includes(t));
    if (eps.length >= S.minExplosions) groupes.push(groupe(t, eps, autres, hc, S.maxCitations));
  }
  return { groupes };
}
