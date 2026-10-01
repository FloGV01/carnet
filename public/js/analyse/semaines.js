// Série hebdomadaire (lundi au dimanche) pour les courbes et le tableau Évolution.
import { SEUILS } from './seuils.js';
import { moyenne } from './stats.js';
import { addDays, lundiDe, jourEvenement } from '../domain/dates.js';
import { classer } from './classements.js';

export function serieHebdo({ journal, episodes, symptomes, traitements }, aujourdhui, items, nbSemaines = SEUILS.semaine.nbSemaines) {
  const horsClassement = new Set(items.filter((i) => i.horsClassement).map((i) => i.id));
  const dernier = lundiDe(aujourdhui);
  const semaines = [];
  for (let k = nbSemaines - 1; k >= 0; k--) {
    const lundi = addDays(dernier, -7 * k);
    const dimanche = addDays(lundi, 6) < aujourdhui ? addDays(lundi, 6) : aujourdhui;
    const dansSemaine = (d) => d >= lundi && d <= dimanche;
    const jours = journal.filter((j) => dansSemaine(j.date));
    const humeurs = jours.map((j) => j.humeur).filter((h) => h != null);
    const expl = jours.map((j) => j.explosions).filter((x) => x != null);
    const som = jours.map((j) => j.sommeilRessenti).filter(Boolean);
    // N°1 de la semaine : au moins 2 occurrences et première place unique (§7.2).
    const premier = (valeurs) => {
      const { tries } = classer(valeurs, horsClassement);
      if (!tries.length || tries[0][1] < SEUILS.semaine.minPremier) return null;
      return tries.length === 1 || tries[1][1] < tries[0][1] ? tries[0][0] : null;
    };
    const eps = episodes.filter((e) => dansSemaine(jourEvenement(e.date, e.heure)));
    semaines.push({
      lundi,
      humeur: humeurs.length ? moyenne(humeurs) : null,
      nHumeur: humeurs.length,
      fragile: humeurs.length > 0 && humeurs.length < SEUILS.semaine.minValeursPleines,
      explosions: expl.length ? expl.reduce((s, x) => s + x, 0) : null,
      sommeil: som.length ? { mal: som.filter((s) => s === 'sommeil:mal').length, moyen: som.filter((s) => s === 'sommeil:moyen').length, bien: som.filter((s) => s === 'sommeil:bien').length } : null,
      emotion: premier(eps.map((e) => e.emotion).filter(Boolean)),
      declencheur: premier(eps.map((e) => e.declencheur).filter(Boolean)),
      symptome: premier(symptomes.filter((s) => dansSemaine(s.date)).map((s) => s.symptome).filter(Boolean)),
      effetSecondaire: premier(traitements.filter((t) => dansSemaine(t.date)).flatMap((t) => t.effetsSecondaires || [])),
    });
  }
  return semaines;
}

export const semainesAvecDonnees = (serie) => serie.filter((s) => s.nHumeur > 0 || s.explosions != null || s.sommeil).length;
