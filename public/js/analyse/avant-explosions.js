// « Avant tes explosions » (v4) : ce que l'utilisateur a noté autour de ses explosions, rassemblé.
// Des comptes et ses propres mots ; jamais une cause, jamais un conseil. Pur.
import { jourEvenement } from '../domain/dates.js';
import { estExplosion } from '../domain/explosions.js';
import { mediane } from './stats.js';
import { SEUILS } from './seuils.js';

const S = SEUILS.explosions;

// Une liste : n = nombre d'explosions où l'étape a été remplie (la base du « 3 sur 4 ») ;
// elements = ceux notés au moins minTete fois, hors « Je ne sais pas » (hors classement).
function plusFrequents(listes, horsClassement) {
  const remplies = listes.filter((ids) => ids && ids.length);
  const n = new Map();
  for (const ids of remplies) for (const id of new Set(ids)) if (!horsClassement.has(id)) n.set(id, (n.get(id) || 0) + 1);
  const elements = [...n.entries()].filter(([, nb]) => nb >= S.minTete)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, S.maxElements).map(([id, nb]) => ({ id, n: nb }));
  return { n: remplies.length, elements };
}

export function avantExplosions(episodes, du, au, items = []) {
  const hc = new Set(items.filter((i) => i.horsClassement).map((i) => i.id));
  const frequents = (listes) => plusFrequents(listes, hc);
  const dans = (episodes || []).filter((e) => { const j = jourEvenement(e.date, e.heure); return j >= du && j <= au; })
    .sort((a, b) => `${b.date} ${b.heure || ''}`.localeCompare(`${a.date} ${a.heure || ''}`));
  const explosions = dans.filter(estExplosion);
  if (explosions.length < S.minExplosions) return { statut: 'insuffisant', n: explosions.length };
  const ac = explosions.map((e) => e.apresCoup).filter(Boolean);
  const reperes = ac.map((a) => a.repereA).filter((v) => v != null);
  return {
    statut: 'ok',
    n: explosions.length,
    avecApresCoup: ac.length,
    declencheurs: frequents(explosions.map((e) => (e.declencheur ? [e.declencheur] : []))),
    dessous: frequents(explosions.map((e) => (e.dessous ? [e.dessous] : []))),
    types: frequents(ac.map((a) => a.types)),
    fragilites: frequents(ac.map((a) => a.fragilites)),
    signes: frequents(ac.map((a) => a.signes)),
    repere: reperes.length >= S.minExplosions ? mediane(reperes) : null,
    siAlors: ac.filter((a) => a.siJe || a.alorsJe).slice(0, S.maxTextes).map((a) => ({ si: a.siJe, alors: a.alorsJe })),
    aide: dans.filter((e) => !estExplosion(e) && e.ceQuiAAide).slice(0, S.maxTextes).map((e) => e.ceQuiAAide),
  };
}
