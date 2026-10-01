import { test } from 'node:test';
import assert from 'node:assert/strict';
import { grouperParSemaine, filtrerJours, filtrerEpisodes, extrait, chercher } from '../../public/js/domain/historique.js';

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
  assert.deepEqual(filtrerJours(jours, { avecNotes: true, du: '2026-09-22' }).map((j) => j.date), ['2026-09-23']);
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
