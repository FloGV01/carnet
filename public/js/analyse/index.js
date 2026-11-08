// Point d'entrée unique du moteur d'analyse. Pur : la date du jour et les libellés
// arrivent par ctx. L'écran Analyse, l'export PSY et la vue soignants lisent ce même objet.
// v7 : les analyses fondées sur la note de 1 à 10 sont retirées (bonnes journées, sommeil et humeur, tendances,
// signal de ressemblance) ; les émotions du moment (emotions.js) sont comptées par période.
import { indicateurs, bornesFenetre, premiereDate } from './fenetres.js';
import { classements, classer } from './classements.js';
import { journalAvecExplosions, saisieDuSoir } from '../domain/explosions.js';
import { addDays, estDateValide, jourEvenement } from '../domain/dates.js';
import { profilJournee } from './moments.js';
import { tesMoments } from './avant-explosions.js';
import { frise } from './frise.js';
import { avecHumeurDuJour } from './humeur-jour.js';
import { reperesTraitement } from './reperes.js';
import { relevesAEmotion, parFamille, famillesParHeure, parZone, zonesParSemaine, dernieresSemaines } from './emotions.js';

export const FENETRES = ['7', '30', '90', 'tout'];

// Les émotions du moment d'une période : le nombre de relevés de chaque famille, par heure de la journée (hors « vers »),
// et le classement des mots notés (une famille seule n'est pas un mot). v9 : et de chaque zone (Tes zones), avec `perso`.
function emotionsDe(releves, perso) {
  return {
    n: releves.length,
    parFamille: parFamille(releves),
    parZone: parZone(releves, perso),
    parHeure: famillesParHeure(releves),
    mots: classer(releves.filter((r) => r.mot).map((r) => r.mot), new Set()),
  };
}

// Ma semaine : les 2 textes les plus récents d'un champ du soir depuis `du` (les points positifs, v11 les gratitudes), chacun
// avec son jour et coupé à 120 signes. Jamais leur nombre.
const DERNIERS_TEXTES = 2;
const MAX_TEXTE_SEMAINE = 120;
function derniersTextes(journal, champ, du) {
  return journal.filter((j) => j.date >= du && j[champ]).sort((a, b) => b.date.localeCompare(a.date)).slice(0, DERNIERS_TEXTES)
    .map((j) => ({ date: j.date, texte: j[champ].length > MAX_TEXTE_SEMAINE ? `${j[champ].slice(0, MAX_TEXTE_SEMAINE - 1)}…` : j[champ] }));
}

export function analyze(data, ctx) {
  const { aujourdhui, items, zeroDepuis = null } = ctx;
  // Humeur du jour (v6, humeur-jour.js), avant tout le reste : dans chaque journal, `humeur` est la
  // moyenne des anciennes notes de 1 à 10 du jour (relevés), sinon l'humeur du soir. Elle ne sert plus qu'à
  // montrer ces notes (rangée « Humeur (notes) » de Mes jours) et aux exports.
  const journal = avecHumeurDuJour(data.journal, data.humeurs || []).filter((j) => j.date <= aujourdhui);
  const episodes = data.episodes || [];
  // Explosions (v4, domain/explosions.js) : la règle ne change que la valeur des explosions.
  // Les jours qui n'ont qu'un épisode d'explosion n'entrent que dans les comptes d'explosions.
  // Un jour de relevés seuls n'a pas de saisie du soir : il ne vaut jamais 0 explosion.
  const regle = { zeroDepuis, jourNote: saisieDuSoir(data.journal) };
  const brut = { ...data, journal };
  const d = { ...data, journal: journalAvecExplosions(journal, episodes, regle).filter((j) => j.date <= aujourdhui) };
  // perso (v9) : la méta `motsPerso` ; un relevé de mot à soi est une émotion, comptée dans sa famille s'il en a une. Elle
  // passe aussi à la frise, par `d`.
  const releves = relevesAEmotion(data.humeurs || [], data.perso).filter((r) => r.date <= aujourdhui);
  // « Tout » part du premier jour noté, toutes sources, émotions du moment comprises (v7 : un relevé à émotion n'a pas
  // d'humeur du jour, il n'est pas dans le journal).
  // Les séances de Bien-être aussi (v7), à leur jour logique : leur rangée de Mes jours remonte jusqu'à la première.
  const joursSeances = (data.seances || []).filter((x) => x && estDateValide(x.date)).map((x) => ({ date: jourEvenement(x.date, x.heure) }));
  const premier = premiereDate({ ...brut, journal: [...journal, ...releves.map((r) => ({ date: r.date })), ...joursSeances] }, aujourdhui);
  const fenetres = {};
  const classes = {};
  const moments = {};
  const lesMoments = {};
  const frises = {};
  const reperes = {};
  const emotions = {};
  for (const f of FENETRES) {
    const [du, au] = bornesFenetre(f, aujourdhui, premier);
    fenetres[f] = indicateurs(d, du, au);
    classes[f] = classements(brut, du, au, items);
    moments[f] = profilJournee(data.humeurs || [], du, au);
    lesMoments[f] = tesMoments(episodes, du, au, items);
    // Mes jours, avec la rangée Bien-être (v7) : les séances de `data.seances`, passées par `d`.
    frises[f] = frise(d, du, au);
    // Repères de traitement (v6) : les changements notés, sur les colonnes de cette frise.
    reperes[f] = reperesTraitement(data.traitements, frises[f].colonnes);
    emotions[f] = emotionsDe(releves.filter((r) => r.date >= du && r.date <= au), data.perso);
  }
  // Ma semaine : les 7 derniers jours, quelle que soit la période choisie. Les émotions par famille, et les 2 points
  // positifs les plus récents, comme les 2 gratitudes (v11), chacun dans un repli fermé.
  const debut7 = addDays(aujourdhui, -6);
  const positifs = derniersTextes(journal, 'pointsPositifs', debut7);
  const gratitudes = derniersTextes(journal, 'gratitudes', debut7);
  // Tes zones (v9, spec §13.2) : les relevés de chaque zone par semaine, sur les 12 dernières semaines quelle que soit la
  // période choisie ; rien après aujourd'hui (jour logique, comme les périodes).
  const zonesSemaines = zonesParSemaine(releves, dernieresSemaines(aujourdhui), data.perso);
  return {
    aujourdhui, premier, fenetres, classements: classes, moments, tesMoments: lesMoments, frise: frises, reperesTraitement: reperes, emotions, zonesSemaines,
    semaine: { du: debut7, au: aujourdhui, positifs, gratitudes, emotions: parFamille(releves.filter((r) => r.date >= debut7)) },
  };
}
