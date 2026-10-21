// « Mes jours » (v5) : les colonnes de la frise, par jour (jusqu'à 31 jours), par semaine
// (jusqu'à 26 semaines) ou par mois au-delà. Rangées : les émotions du moment (v7, à l'écran : les émotions
// notées d'un jour, dans l'ordre des heures ; par semaine ou par mois, le nombre de relevés de chaque famille),
// les anciennes notes de 1 à 10 (humeur du jour, v6 ; avecHumeur dit si la période en a), nuit, explosions et
// autres épisodes, et l'énergie basse (v6, à l'écran seulement) : une marque les jours concernés, le nombre
// de jours par semaine ou par mois, rien pour les autres jours, et pas de rangée (avecEnergie) tant qu'aucun
// relevé d'énergie n'est noté sur la période. Bien-être (v7, spec §6.4) : un repère pour chaque jour (semaine, mois) qui
// a au moins une séance, toutes origines comprises, sans aucun total ; pas de rangée (avecBienEtre) sur une période sans
// séance. Jamais de rangée oui / non (contact, sport) : ce serait un traqueur d'habitudes. Un jour sans rien reste une
// colonne vide, sans zéro. Pur.
import { addDays, diffDays, lundiDe, jourEvenement } from '../domain/dates.js';
import { estExplosion } from '../domain/explosions.js';
import { moyenne } from './stats.js';
import { energieBasseParJour } from './energie-jour.js';
import { emotionsParJour, comptesVides } from './emotions.js';
import { familleDe } from '../domain/roue.js';
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

// Les jours logiques qui ont au moins une séance de Bien-être (bascule à 4 h).
const joursAvecSeance = (seances) => new Set((seances || []).filter((s) => s && s.date).map((s) => jourEvenement(s.date, s.heure)));

// journal : explosions déjà selon la règle de l'analyse (domain/explosions.js).
// humeurs : les relevés, pour l'énergie basse et les émotions (un relevé compte pour son jour logique, « vers » compris).
// seances : les séances de Bien-être (v7) ; la Vue soignants n'en passe pas.
export function frise({ journal = [], episodes = [], humeurs = [], seances = [] }, du, au) {
  const pas = pasFrise(du, au);
  const parDate = new Map(journal.map((j) => [j.date, j]));
  const autres = autresParJour(episodes);
  const basse = energieBasseParJour(humeurs);
  const emotions = emotionsParJour(humeurs, du, au);
  const bienEtre = joursAvecSeance(seances);
  const avec = (colonnes) => ({
    avecEnergie: colonnes.some((c) => c.energieBasse != null), avecHumeur: colonnes.some((c) => c.humeur != null),
    avecBienEtre: colonnes.some((c) => c.bienEtre),
  });

  if (pas === 'jour') {
    const colonnes = [];
    for (let d = du; d <= au; d = addDays(d, 1)) {
      const j = parDate.get(d) || null;
      const h7 = [];
      for (let k = 0; k < 7; k++) { const x = parDate.get(addDays(d, -k)); if (x && x.humeur != null) h7.push(x.humeur); }
      const col = {
        cle: d, du: d, au: d, entree: j,
        humeur: j && j.humeur != null ? j.humeur : null,
        // Au moins 2 relevés : le trait du plus bas au plus haut (une journée mêlée se voit).
        humeurMin: j && j.humeurN >= 2 ? j.humeurMin : null,
        humeurMax: j && j.humeurN >= 2 ? j.humeurMax : null,
        moyenne7: h7.length >= S.minMoyenne7 ? moyenne(h7) : null,
        nuit: (j && j.sommeilRessenti) || null,
        explosions: j && j.explosions != null ? j.explosions : null,
        autres: autres.get(d) || 0,
        // Vrai dès un relevé « basse », faux si les relevés d'énergie du jour n'en ont aucun, nul sans relevé.
        energieBasse: basse.has(d) ? basse.get(d) : null,
        // Les émotions notées (identifiants de la roue), dans l'ordre des heures.
        emotions: emotions.get(d) || [],
        // Vrai dès une séance de Bien-être ce jour-là ; jamais leur nombre.
        bienEtre: bienEtre.has(d),
      };
      // Un jour se touche dès qu'il porte une saisie que le détail sait montrer (sans rangée oui / non).
      col.aDonnee = col.humeur != null || col.emotions.length > 0 || col.nuit != null || col.explosions > 0 || col.autres > 0 || col.energieBasse === true
        || col.bienEtre || Boolean(j && (j.reveilsNocturnes != null || j.lieu || (j.contacts || []).length || (j.activites || []).length));
      colonnes.push(col);
    }
    return { pas, colonnes, ...avec(colonnes) };
  }

  // Par semaine (du lundi au dimanche) ou par mois calendaire, bornés à [du, au].
  const cleDe = pas === 'semaine' ? (d) => lundiDe(d) : (d) => d.slice(0, 7);
  const groupes = new Map();
  for (let d = du; d <= au; d = addDays(d, 1)) {
    const cle = cleDe(d);
    if (!groupes.has(cle)) groupes.set(cle, { cle, du: d, au: d, humeurs: [], familles: comptesVides(), nEmotions: 0, nuits: { mal: 0, moyen: 0, bien: 0 }, nNuits: 0, expl: 0, connues: 0, autres: 0, energieConnue: 0, basses: 0, bienEtre: false });
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
    for (const id of emotions.get(d) || []) { g.familles[familleDe(id)] += 1; g.nEmotions += 1; }
    if (basse.has(d)) { g.energieConnue += 1; if (basse.get(d)) g.basses += 1; }
    if (bienEtre.has(d)) g.bienEtre = true;
  }
  const min = pas === 'semaine' ? 1 : S.moisMin;
  const plein = pas === 'semaine' ? S.semainePleine : S.moisPlein;
  const colonnes = [...groupes.values()].map((g) => {
    const col = {
      cle: g.cle, du: g.du, au: g.au,
      humeur: g.humeurs.length >= min ? moyenne(g.humeurs) : null,
      fragile: g.humeurs.length >= min && g.humeurs.length < plein,
      nHumeur: g.humeurs.length,
      // Le nombre de relevés de chaque famille ; nul sans émotion notée.
      familles: g.nEmotions ? g.familles : null,
      nEmotions: g.nEmotions,
      nuits: g.nNuits ? g.nuits : null,
      explosions: g.connues ? g.expl : null,
      autres: g.autres,
      // Le nombre de jours à énergie basse ; nul si aucun jour n'a de relevé d'énergie.
      energieBasse: g.energieConnue ? g.basses : null,
      // Vrai dès une séance de Bien-être dans la semaine (le mois) : un repère, sans le nombre de jours.
      bienEtre: g.bienEtre,
    };
    col.aDonnee = col.humeur != null || col.nEmotions > 0 || col.nuits != null || col.explosions > 0 || col.autres > 0 || col.energieBasse > 0 || col.bienEtre;
    return col;
  });
  return { pas, colonnes, ...avec(colonnes) };
}
