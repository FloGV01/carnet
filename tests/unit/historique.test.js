import { test } from 'node:test';
import assert from 'node:assert/strict';
import { grouperParSemaine, filtrerJours, filtrerEpisodes, filtrerSymptomes, debutTexte, extrait, chercher, CHAMPS_TEXTE } from '../../public/js/domain/historique.js';

const jours = [
  { date: '2026-09-21', humeur: 4, lieu: 'lieu:bureau', explosions: 1, notes: null },
  { date: '2026-09-23', humeur: 7, lieu: 'lieu:teletravail', explosions: 0, notes: 'calme' },
  { date: '2026-09-29', humeur: null, lieu: 'lieu:bureau', explosions: null, notes: null },
];

test('groupes par semaine, sans trou ni compte, du plus récent au plus ancien', () => {
  const g = grouperParSemaine(jours, (j) => j.date);
  assert.deepEqual(g.map((x) => x.lundi), ['2026-09-28', '2026-09-21']);
  assert.deepEqual(g[1].elements.map((x) => x.date), ['2026-09-23', '2026-09-21']);
});

test('filtres des jours : humeur absente jamais comptée comme basse', () => {
  assert.deepEqual(filtrerJours(jours, { humeur: 'bas' }).map((j) => j.date), ['2026-09-21']);
  assert.deepEqual(filtrerJours(jours, { lieu: 'lieu:bureau' }).map((j) => j.date), ['2026-09-21', '2026-09-29']);
  assert.deepEqual(filtrerJours(jours, { avecExplosions: true }).map((j) => j.date), ['2026-09-21']);
  assert.deepEqual(filtrerJours(jours, { avecExplosions: true, explosionsDe: (j) => (j.date === '2026-09-29' ? 2 : j.explosions) }).map((j) => j.date), ['2026-09-21', '2026-09-29'], 'v4 : épisodes « Explosion » comptés');
  assert.deepEqual(filtrerJours(jours, { avecNotes: true, du: '2026-09-22' }).map((j) => j.date), ['2026-09-23']);
});

test('v6 : filtres d\'humeur sur l\'humeur du jour, ≤ 4, entre les deux, ≥ 7, décimales comprises', () => {
  const decimales = [4, 4.3, 5, 6.9, 7, 8.5, null].map((humeur, i) => ({ date: `2026-10-0${i + 1}`, humeur }));
  const humeurs = (f) => filtrerJours(decimales, { humeur: f }).map((j) => j.humeur);
  assert.deepEqual(humeurs('bas'), [4]);
  assert.deepEqual(humeurs('moyen'), [4.3, 5, 6.9]);
  assert.deepEqual(humeurs('haut'), [7, 8.5]);
});

test('filtres des épisodes : jour logique et intensité', () => {
  const eps = [{ date: '2026-10-01', heure: '01:00', emotion: 'emotion:colere', intensite: 8 }, { date: '2026-10-01', heure: '12:00', emotion: 'emotion:joie', intensite: 3 }];
  assert.equal(filtrerEpisodes(eps, { au: '2026-09-30' }).length, 1);
  assert.equal(filtrerEpisodes(eps, { intenseSeulement: true }).length, 1);
  assert.equal(filtrerEpisodes(eps, { emotion: 'emotion:joie' })[0].intensite, 3);
});

test('recherche sans accents ni casse, avec extrait', () => {
  const ex = extrait('Déjeuner avec l\'équipe puis réunion tendue', 'REUNION');
  assert.equal(ex.trouve, 'réunion');
  assert.match(ex.avant, /puis $/);
  assert.equal(extrait('rien', 'absent'), null);
  assert.equal(chercher({ notes: 'Café avec Léo' }, 'journal', 'leo').champ, 'notes');
});

test('symptômes filtrés par période et par symptôme', () => {
  const sy = [{ date: '2026-09-20', symptome: 'symptome:ruminations' }, { date: '2026-09-29', symptome: 'symptome:hyperfocus' }];
  assert.deepEqual(filtrerSymptomes(sy, { du: '2026-09-25' }).map((s) => s.date), ['2026-09-29']);
  assert.deepEqual(filtrerSymptomes(sy, { symptome: 'symptome:ruminations' }).map((s) => s.date), ['2026-09-20']);
});

test('extrait court et début de texte coupé au mot', () => {
  const ex = extrait('Une longue journée de travail puis une réunion qui a débordé sur la soirée entière', 'reunion', 18, 28);
  assert.equal(ex.avant, '… travail puis une ');
  assert.equal(ex.apres, ' qui a débordé sur la soirée…');
  assert.equal(debutTexte('déjeuner au calme', 34), 'déjeuner au calme');
  assert.equal(debutTexte('marche de vingt minutes au soleil après le travail', 34), 'marche de vingt minutes au soleil…');
});

test('v11 : la recherche fouille aussi les gratitudes, après les points positifs et avant les notes', () => {
  assert.deepEqual(CHAMPS_TEXTE.journal, ['pointsPositifs', 'gratitudes', 'notes']);
  const j = { date: '2026-11-05', pointsPositifs: 'une marche au parc', gratitudes: 'Merci à la voisine pour le colis', notes: 'une voisine bruyante' };
  const ex = chercher(j, 'journal', 'voisine');
  assert.equal(ex.champ, 'gratitudes', 'les gratitudes passent avant les notes');
  assert.equal(ex.trouve, 'voisine');
  assert.equal(chercher({ ...j, gratitudes: null }, 'journal', 'voisine').champ, 'notes');
  assert.equal(chercher({ date: '2026-11-05', gratitudes: 'merci au collègue' }, 'journal', 'COLLEGUE').champ, 'gratitudes');
  assert.equal(chercher(j, 'journal', 'parc').champ, 'pointsPositifs');
  // Le filtre « Avec notes » ne change pas : des gratitudes ne sont pas des notes.
  assert.deepEqual(filtrerJours([{ date: '2026-11-05', gratitudes: 'merci au collègue', notes: null }], { avecNotes: true }), []);
});
