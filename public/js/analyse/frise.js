// « Mes jours » (v5) : les colonnes de la frise, par jour (jusqu'à 31 jours), par semaine
// (jusqu'à 26 semaines) ou par mois au-delà. Trois rangées : humeur du soir, nuit, explosions et
// autres épisodes. Jamais de rangée oui / non (contact, sport) : ce serait un traqueur
// d'habitudes. Un jour sans rien reste une colonne vide, sans zéro. Pur.
import { addDays, diffDays, lundiDe, jourEvenement } from '../domain/dates.js';
import { estExplosion } from '../domain/explosions.js';
import { moyenne } from './stats.js';
import { SEUILS } from './seuils.js';

const S = SEUILS.frise;

export function pasFrise(du, au) {
  const n = diffDays(du, au) + 1;
  if (n <= S.joursJusqua) return 'jour';
  if (n <= S.semainesJusqua * 7) return 'semaine';
  return 'mois';
}

function autresParJour(episodes) {
  const n = new Map();
  for (const e of episodes || []) {
    if (!e || !e.date || estExplosion(e)) continue;
    const j = jourEvenement(e.date, e.heure);
    n.set(j, (n.get(j) || 0) + 1);
  }
  return n;
}

// journal : explosions déjà selon la règle de l'analyse (domain/explosions.js).
export function frise({ journal = [], episodes = [] }, du, au) {
  const pas = pasFrise(du, au);
  const parDate = new Map(journal.map((j) => [j.date, j]));
  const autres = autresParJour(episodes);

  if (pas === 'jour') {
    const colonnes = [];
    for (let d = du; d <= au; d = addDays(d, 1)) {
      const j = parDate.get(d) || null;
      const h7 = [];
      for (let k = 0; k < 7; k++) { const x = parDate.get(addDays(d, -k)); if (x && x.humeur != null) h7.push(x.humeur); }
      const col = {
        cle: d, du: d, au: d, entree: j,
        humeur: j && j.humeur != null ? j.humeur : null,
        moyenne7: h7.length >= S.minMoyenne7 ? moyenne(h7) : null,
        nuit: (j && j.sommeilRessenti) || null,
        explosions: j && j.explosions != null ? j.explosions : null,
        autres: autres.get(d) || 0,
      };
      col.aDonnee = col.humeur != null || col.nuit != null || col.explosions > 0 || col.autres > 0;
      colonnes.push(col);
    }
    return { pas, colonnes };
  }

  // Par semaine (du lundi au dimanche) ou par mois calendaire, bornés à [du, au].
  const cleDe = pas === 'semaine' ? (d) => lundiDe(d) : (d) => d.slice(0, 7);
  const groupes = new Map();
  for (let d = du; d <= au; d = addDays(d, 1)) {
    const cle = cleDe(d);
    if (!groupes.has(cle)) groupes.set(cle, { cle, du: d, au: d, humeurs: [], nuits: { mal: 0, moyen: 0, bien: 0 }, nNuits: 0, expl: 0, connues: 0, autres: 0 });
    const g = groupes.get(cle);
    g.au = d;
    const j = parDate.get(d);
    if (j) {
      if (j.humeur != null) g.humeurs.push(j.humeur);
      const n = j.sommeilRessenti && j.sommeilRessenti.split(':')[1];
      if (n in g.nuits) { g.nuits[n] += 1; g.nNuits += 1; }
      if (j.explosions != null) { g.expl += j.explosions; g.connues += 1; }
    }
    g.autres += autres.get(d) || 0;
  }
  const min = pas === 'semaine' ? 1 : S.moisMin;
  const plein = pas === 'semaine' ? S.semainePleine : S.moisPlein;
  const colonnes = [...groupes.values()].map((g) => {
    const col = {
      cle: g.cle, du: g.du, au: g.au,
      humeur: g.humeurs.length >= min ? moyenne(g.humeurs) : null,
      fragile: g.humeurs.length >= min && g.humeurs.length < plein,
      nHumeur: g.humeurs.length,
      nuits: g.nNuits ? g.nuits : null,
      explosions: g.connues ? g.expl : null,
      autres: g.autres,
    };
    col.aDonnee = col.humeur != null || col.nuits != null || col.explosions > 0 || col.autres > 0;
    return col;
  });
  return { pas, colonnes };
}
