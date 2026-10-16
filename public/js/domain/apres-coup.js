// Accès à l'Après coup (v6) : les épisodes des 7 derniers jours logiques, du plus récent au plus
// ancien, et leur ligne. Une ligne n'a qu'une forme : aucun nombre, aucune coche, aucun état.
// Pur : le jour logique d'aujourd'hui est passé en paramètre.
import { addDays, jourEvenement, formaterJourCourt } from './dates.js';
import { libelle } from './libelles.js';

export const JOURS_RECENTS = 7;

// Premier des sept jours logiques (aujourd'hui compris), pour borner la lecture en base.
export const premierJourRecent = (aujourdhui) => addDays(aujourdhui, 1 - JOURS_RECENTS);

// Épisodes rattachés par jourEvenement (avant 04:00, c'est la veille) à l'un des 7 derniers jours
// logiques, du plus récent au plus ancien. Dans un jour logique, l'ordre est celui des heures,
// après minuit comprises ; un épisode sans heure passe après tous les autres de son jour.
export function episodesRecents(episodes, aujourdhui) {
  const debut = premierJourRecent(aujourdhui);
  return (episodes || [])
    .filter((e) => {
      if (!e || !e.date) return false;
      const jour = jourEvenement(e.date, e.heure);
      return jour >= debut && jour <= aujourdhui;
    })
    .map((e) => ({ e, jour: jourEvenement(e.date, e.heure), instant: `${e.date} ${e.heure || ''}` }))
    .sort((a, b) => b.jour.localeCompare(a.jour) || b.instant.localeCompare(a.instant))
    .map(({ e }) => e);
}

// « sam 10/10 18:42 · Colère · 7 » : jour logique, heure, émotion, intensité. À défaut des deux,
// le déclencheur, puis « Épisode » : la ligne reste toujours reconnaissable.
export function ligneEpisodeRecent(episode, carte) {
  const quand = [formaterJourCourt(jourEvenement(episode.date, episode.heure)), episode.heure].filter(Boolean).join(' ');
  const morceaux = [libelle(carte, episode.emotion), episode.intensite].filter((x) => x != null);
  if (morceaux.length === 0) morceaux.push(libelle(carte, episode.declencheur) ?? 'Épisode');
  return [quand, ...morceaux].join(' · ');
}
