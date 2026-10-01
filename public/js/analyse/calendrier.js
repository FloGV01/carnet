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

const humeurValide = (j) => j && Number.isInteger(j.humeur) && j.humeur >= 1 && j.humeur <= 10;

// Série des tests par permutation : part du premier jour où l'humeur est notée (une entrée vide en
// tête ne décale rien), et retire les trous de plus de `trouMax` jours sans rien (une date aberrante
// ne fait pas exploser le calcul). consecutif[i] : i et i + 1 se suivent au calendrier.
export function calendrierTests(journal, fin, trouMax) {
  const valides = journal.filter((j) => (!fin || j.date <= fin));
  const ancres = valides.filter(humeurValide);
  if (!ancres.length) return { entrees: [], consecutif: [] };
  const debut = ancres.reduce((m, j) => (j.date < m ? j.date : m), ancres[0].date);
  const { entrees } = calendrier(valides.filter((j) => j.date >= debut), fin);
  const garde = [];
  const origine = [];
  let vides = [];
  entrees.forEach((j, i) => {
    if (j) {
      if (vides.length <= trouMax) for (const k of vides) { garde.push(null); origine.push(k); }
      vides = [];
      garde.push(j); origine.push(i);
    } else vides.push(i);
  });
  if (vides.length <= trouMax) for (const k of vides) { garde.push(null); origine.push(k); }
  return { entrees: garde, consecutif: origine.map((o, i) => i + 1 < origine.length && origine[i + 1] === o + 1) };
}
