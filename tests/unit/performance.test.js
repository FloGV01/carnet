import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../../public/js/analyse/index.js';
import {
  facteursParJour, periodeComprendre, explosionsAvant, explosionsApres, energieAvant, retoursBureau, parColonnes, nuitsParSoir,
  energieParActivite, peseRecharge, mesNuits, periodeMesNuits, MESURES,
} from '../../public/js/analyse/comprendre.js';
import { apresNuit, autourDe, autourDuBienEtre, emotionsParActivite, relevesAvecActivite } from '../../public/js/analyse/emotions.js';
import { premiereDate } from '../../public/js/analyse/fenetres.js';
import { avecHumeurDuJour } from '../../public/js/analyse/humeur-jour.js';
import { modeleSoignants } from '../../public/js/export/soignants.js';
import { mettreEnPage } from '../../public/js/export/page-a4.js';
import { filtrerJours, grouperParSemaine, chercher } from '../../public/js/domain/historique.js';
import { estExplosion } from '../../public/js/domain/explosions.js';
import { SEED_V1, SEED_V2_AJOUTS, seedItems } from '../../public/js/domain/vocabulaire.js';
import { carteLibelles } from '../../public/js/domain/libelles.js';
import { FAMILLES } from '../../public/js/domain/roue.js';
import { generer } from '../fixtures/generateur.js';

// v8 (Q26) : un garde-fou de performance sur 5 ans de données inventées, jamais réelles. Les calculs de l'Analyse, de
// Comprendre, de la Vue soignants et de l'Historique tournent à chaque ouverture de leur écran quand la base a changé
// (ui/lecture.js). Deux contrôles, pour qu'une lenteur se voie ici avant d'arriver sur l'iPhone :
// - ils grandissent avec les années comme les données, pas plus : 5 ans coûtent moins de 10 fois 1 an (un calcul qui
//   croît comme le produit de deux listes, relevés × séances par exemple, en coûterait 25) ;
// - 5 ans tiennent sous un budget large. Mesuré sur Mac au repos à la v8 : 60 ms pour l'Analyse, 170 pour Comprendre,
//   20 pour la Vue soignants, 10 pour l'Historique ; les tests tournant en parallèle, une machine chargée en met jusqu'à
//   sept fois plus.
// 1 an et 5 ans sont mesurés en alternance, le meilleur de cinq essais chacun : la charge de la machine touche les deux.
// Les lectures de la base, elles, sont mesurées dans WebKit (tests/e2e/v8-fiabilite.spec.js).
const items = [...seedItems(SEED_V1, 'x'), ...seedItems(SEED_V2_AJOUTS, 'x')];
const carte = carteLibelles(items);
const MOTS = FAMILLES.flatMap((f) => [f.id, ...f.mots.map((m) => m.id)]);
const ENERGIES = ['energie:basse', 'energie:moyenne', 'energie:haute'];

// `annees` ans finissant le 25 octobre 2026 : un soir presque chaque jour (avec ses textes et la durée de la nuit), 0 à 6
// émotions du moment par jour, un épisode tous les trois jours, un symptôme tous les cinq, une séance de Bien-être tous
// les deux.
function donnees(annees) {
  const jours = annees * 365 + 1;
  const debut = new Date(Date.UTC(2026, 9, 25 - jours + 1)).toISOString().slice(0, 10);
  const { journal: j, humeurs: h } = generer({ jours, seed: 31, scenario: 'bureau', releves: true, debut, trous: 0.05 });
  const journal = j.map((x, i) => ({ ...x, heuresSommeil: 4 + (i % 7), notes: i % 3 ? null : 'une note du soir inventée, de longueur moyenne, pour la recherche',
    pointsPositifs: i % 4 ? null : 'un point positif inventé', pese: i % 5 ? null : ['pese:bruit'], recharge: i % 6 ? null : ['recharge:calme'] }));
  const humeurs = h.map((x, i) => ({ ...x, humeur: null, emotion: MOTS[(i * 7) % MOTS.length], energie: ENERGIES[i % 3], faisais: i % 4 ? null : ['activiteMoment:travail'] }));
  const episodes = journal.filter((_, i) => i % 3 === 0).map((x, i) => ({ id: `e${i}`, date: x.date, heure: '15:00', emotion: 'emotion:colere',
    reaction: i % 2 ? 'reaction:explosion' : 'reaction:report_a_froid', declencheur: 'declencheur:surcharge_sensorielle', intensite: 6, situation: 'texte inventé assez long pour une recherche' }));
  const symptomes = journal.filter((_, i) => i % 5 === 0).map((x, i) => ({ id: `s${i}`, date: x.date, symptome: 'symptome:ruminations', intensite: 4 }));
  const seances = journal.filter((_, i) => i % 2 === 0).map((x, i) => ({ id: `b${i}`, date: x.date, heure: '21:00', exercice: 'coherence', dureeS: 300, origine: 'bien-etre' }));
  return { journal, humeurs, episodes, symptomes, seances, traitements: [], aujourdhui: journal[journal.length - 1].date };
}
const UN = donnees(1);
const CINQ = donnees(5);

// Le meilleur de cinq essais (ms) sur 1 an et sur 5 ans, mesurés en alternance.
function chrono(calcul) {
  const meilleur = [Infinity, Infinity];
  for (let k = 0; k < 5; k++) {
    [UN, CINQ].forEach((d, i) => {
      const t0 = performance.now();
      calcul(d);
      meilleur[i] = Math.min(meilleur[i], performance.now() - t0);
    });
  }
  return meilleur.map((x) => Math.round(x * 10) / 10);
}
function controler(nom, calcul, budget) {
  const [un, cinq] = chrono(calcul);
  console.log(`  ${nom} : ${un} ms sur 1 an, ${cinq} ms sur 5 ans`);
  assert.ok(cinq <= Math.max(10 * un, 30), `${nom} : ${cinq} ms sur 5 ans contre ${un} ms sur 1 an`);
  assert.ok(cinq < budget, `${nom} : ${cinq} ms sur 5 ans`);
}

test('les données inventées : 1 an et 5 ans, assez pour mesurer', () => {
  assert.ok(CINQ.journal.length > 1700, `${CINQ.journal.length} soirs`);
  assert.ok(CINQ.humeurs.length > 4500, `${CINQ.humeurs.length} relevés`);
  assert.ok(CINQ.episodes.length > 500 && CINQ.seances.length > 800);
  assert.ok(UN.journal.length > 330 && UN.journal.length < 400);
  assert.equal(UN.aujourdhui, CINQ.aujourdhui);
});

test('Analyse : toutes les périodes ; 5 ans, moins de 10 fois 1 an, et moins de 2 s', () => {
  controler('Analyse', (d) => analyze(d, { aujourdhui: d.aujourdhui, items }), 2000);
  assert.ok(analyze(CINQ, { aujourdhui: CINQ.aujourdhui, items }).frise.tout);
});

test('Comprendre : les jours et tous les graphiques sur « Tout » ; 5 ans, moins de 10 fois 1 an, et moins de 2 s', () => {
  controler('Comprendre', (d) => {
    const jours = facteursParJour({ journal: d.journal, humeurs: d.humeurs, episodes: d.episodes, symptomes: d.symptomes });
    const p = periodeComprendre('tout', d.aujourdhui, premiereDate({ journal: [...jours.values()] }, d.aujourdhui));
    explosionsAvant(jours, p, items); explosionsApres(jours, p, items); energieAvant(jours, p, items); retoursBureau(jours, p);
    for (const cle of ['semaine', 'mois']) for (const mesure of MESURES) parColonnes(jours, p, { cle, mesure }, items);
    nuitsParSoir(d.journal, p); mesNuits(d.journal, periodeMesNuits(d.aujourdhui));
    energieParActivite(d.humeurs, p, items); peseRecharge(d.journal, p, items);
    apresNuit(d.journal, d.humeurs, p); autourDuBienEtre(d.seances, d.humeurs, p);
    relevesAvecActivite(d.humeurs, p); emotionsParActivite(d.humeurs, p, items);
    autourDe(d.episodes.filter(estExplosion), d.humeurs);
  }, 2000);
});

test('Vue soignants : le modèle et la mise en page A4, l\'analyse faite ; 5 ans, moins de 10 fois 1 an, et moins de 1 s', () => {
  const analyses = new Map([UN, CINQ].map((d) => [d, analyze(d, { aujourdhui: d.aujourdhui, items })]));
  controler('Vue soignants', (d) => mettreEnPage(modeleSoignants(d, { aujourdhui: d.aujourdhui, carte, analyse: analyses.get(d), professionnel: 'professionnel:psychiatre', prenom: null })), 1000);
});

test('Historique : toutes les semaines, un filtre et une recherche ; 5 ans, moins de 10 fois 1 an, et moins de 1 s', () => {
  controler('Historique', (d) => {
    const jours = avecHumeurDuJour(d.journal, d.humeurs);
    grouperParSemaine(filtrerJours(jours, {}), (j) => j.date);
    grouperParSemaine(filtrerJours(jours, { lieu: 'lieu:bureau' }), (j) => j.date);
    jours.filter((j) => chercher(j, 'journal', 'note', 18, 28));
    d.episodes.filter((e) => chercher(e, 'episodes', 'recherche', 18, 28));
  }, 1000);
  assert.ok(grouperParSemaine(avecHumeurDuJour(CINQ.journal, CINQ.humeurs), (j) => j.date).length > 250);
});

test('le garde-fou repère un calcul qui croît comme le produit de deux listes (relevés × séances)', () => {
  // L'ancienne recherche de « Autour du Bien-être » : chaque relevé parcourait toutes les séances.
  const produit = (d) => {
    let n = 0;
    for (const h of d.humeurs) if (d.seances.some((s) => s.date === h.date && s.heure > h.heure)) n += 1;
    return n;
  };
  const [un, cinq] = chrono(produit);
  console.log(`  produit relevés × séances : ${un} ms sur 1 an, ${cinq} ms sur 5 ans`);
  assert.ok(cinq > 10 * un, `${cinq} ms contre ${un} ms`);
});
