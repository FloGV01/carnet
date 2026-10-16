// Compter les explosions (v4) : les épisodes dont la réaction est « Explosion » font foi.
// Remplace la règle « aucune saisie n'est déduite de l'autre » (plan §5.3) pour ce seul champ.
// Le compteur du soir, masqué par défaut, compte encore s'il est renseigné (anciens jours ou
// champ réactivé) : on prend le plus grand des deux, sans jamais additionner les sources.
// Le symptôme « Explosion de colère » n'entre jamais dans ce compte. Pur.
import { jourEvenement } from './dates.js';

export const REACTION_EXPLOSION = 'reaction:explosion';

// L'id fait foi, quel que soit son libellé, même archivé.
export const estExplosion = (e) => Boolean(e) && e.reaction === REACTION_EXPLOSION;

// Nombre d'épisodes « Explosion » par jour logique.
export function explosionsParJour(episodes) {
  const n = new Map();
  for (const e of episodes || []) {
    if (!estExplosion(e) || !e.date) continue;
    const j = jourEvenement(e.date, e.heure);
    n.set(j, (n.get(j) || 0) + 1);
  }
  return n;
}

// Valeur d'un jour.
// - Analyse (zeroSiNote) : un jour noté sans épisode d'explosion vaut 0, mais seulement à partir
//   de zeroDepuis (jour logique de la mise à jour v4) ; avant, un compteur vide reste « inconnu ».
// - Affichage : rien à montrer tant qu'il n'y a ni compteur ni épisode.
export function valeurExplosions(compteur, nEpisodes, { jourNote = false, zeroSiNote = false, date = null, zeroDepuis = null } = {}) {
  if (compteur != null) return Math.max(compteur, nEpisodes);
  if (nEpisodes > 0) return nEpisodes;
  return zeroSiNote && jourNote && zeroDepuis && date && date >= zeroDepuis ? 0 : null;
}

// v6 : le prédicat jourNote d'un journal enrichi de l'humeur du jour (analyse/humeur-jour.js). Seules
// les dates du journal brut ont une saisie du soir ; un jour qui n'a que des relevés n'en a pas.
export function saisieDuSoir(journal) {
  const dates = new Set((journal || []).map((j) => j.date));
  return (j) => dates.has(j.date);
}

// Journal dont seul le champ explosions suit la règle. ajouterJours : les jours qui n'ont qu'un
// épisode d'explosion (sans saisie du soir) sont ajoutés avec ce seul champ, pour les comptes
// d'explosions uniquement. Jamais pour le calendrier, les bonnes journées, le sommeil ni le signal.
// jourNote : l'entrée a-t-elle une saisie du soir ? (v6 : une entrée qui ne porte que l'humeur du
// jour, faite de relevés, n'en a pas, et ne vaut donc jamais 0.) Un journal enrichi de l'humeur du
// jour passe toujours saisieDuSoir(journal brut). Sans prédicat, aucun jour n'est dit noté : pas de zéro
// fabriqué, les jours restent « inconnus ».
export function journalAvecExplosions(journal, episodes, { zeroSiNote = true, zeroDepuis = null, ajouterJours = true, jourNote = () => false } = {}) {
  const parJour = explosionsParJour(episodes);
  const res = (journal || []).map((j) => {
    const v = valeurExplosions(j.explosions ?? null, parJour.get(j.date) || 0, { jourNote: jourNote(j), zeroSiNote, date: j.date, zeroDepuis });
    return v === (j.explosions ?? null) ? j : { ...j, explosions: v };
  });
  if (ajouterJours) {
    const dates = new Set(res.map((j) => j.date));
    for (const [date, n] of parJour) if (!dates.has(date)) res.push({ date, explosions: n });
  }
  return res.sort((a, b) => a.date.localeCompare(b.date));
}
