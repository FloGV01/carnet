import { test } from 'node:test';
import assert from 'node:assert/strict';
import { geometrieHumeur, geometrieExplosions, geometrieSommeil, DIM } from '../../public/js/ui/graphes/geometrie.js';

const semaines = [
  { lundi: '2026-09-07', humeur: 10, fragile: false, explosions: 0, sommeil: { mal: 1, moyen: 2, bien: 3 } },
  { lundi: '2026-09-14', humeur: null, fragile: false, explosions: null, sommeil: null },
  { lundi: '2026-09-21', humeur: 4.5, fragile: true, explosions: 3, sommeil: { mal: 3, moyen: 0, bien: 0 } },
  { lundi: '2026-09-28', humeur: 1, fragile: false, explosions: 1, sommeil: null },
];

test('humeur : y(10) au bord haut, pas de segment au-dessus d\'une semaine vide, anneau si fragile', () => {
  const g = geometrieHumeur(semaines);
  assert.equal(g.y(10), DIM.haut);
  assert.equal(g.y(10), 8);
  assert.equal(g.y(1), DIM.hauteur - DIM.bas);
  assert.equal(g.points.length, 3);
  assert.equal(g.segments.length, 1, 'seul le segment entre les semaines 3 et 4');
  assert.equal(g.points[1].plein, false);
  for (const p of g.points) { assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y)); assert.equal(Math.round(p.x * 10) / 10, p.x); }
});

test('explosions : zéro = trait de 2, semaine vide = rien', () => {
  const g = geometrieExplosions(semaines);
  assert.equal(g.barres.length, 3);
  assert.equal(g.barres[0].h, 2);
  assert.ok(g.barres.every((b) => Number.isFinite(b.y) && b.h > 0));
});

test('sommeil : piles sans NaN, sans morceau vide', () => {
  const g = geometrieSommeil(semaines);
  assert.equal(g.piles.length, 2);
  assert.deepEqual(g.piles[1].morceaux.map((m) => m.cle), ['mal']);
  assert.ok(JSON.stringify(g).indexOf('NaN') < 0);
});
