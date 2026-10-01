// Série calendaire continue (un élément par jour, null si rien n'est noté).
import { addDays, diffDays } from '../domain/dates.js';

export function calendrier(journal, fin) {
  const jours = journal.filter((j) => !fin || j.date <= fin);
  if (!jours.length) return { debut: null, fin: null, entrees: [] };
  const parDate = new Map(jours.map((j) => [j.date, j]));
  const debut = jours.reduce((m, j) => (j.date < m ? j.date : m), jours[0].date);
  const dernier = fin || jours.reduce((m, j) => (j.date > m ? j.date : m), jours[0].date);
  const n = diffDays(debut, dernier) + 1;
  const entrees = new Array(n);
  for (let i = 0; i < n; i++) entrees[i] = parDate.get(addDays(debut, i)) || null;
  return { debut, fin: dernier, entrees };
}
