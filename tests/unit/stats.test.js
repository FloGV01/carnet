import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../../public/js/analyse/stats.js';

const proche = (a, b, eps = 1e-3) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

test('Wilson et Newcombe (exemple de Newcombe 1998 : 56/70 contre 48/80)', () => {
  const [l, u] = S.wilson(81, 263);
  proche(l, 0.2553, 1e-3); proche(u, 0.3662, 1e-3);
  const [a, b] = S.newcombe(56, 70, 48, 80);
  proche(a, 0.0524, 1e-3); proche(b, 0.3339, 1e-3);
});

test('Fisher exact bilatéral (tea tasting : 3,1,1,3)', () => {
  proche(S.fisher(3, 1, 1, 3), 0.4857, 1e-3);
  proche(S.fisher(10, 0, 0, 10), 1.0825e-5, 1e-6);
});

test('Benjamini-Hochberg', () => {
  const q = S.benjaminiHochberg([0.01, 0.04, 0.03, 0.20]);
  q.forEach((x, i) => proche(x, [0.04, 0.0533, 0.0533, 0.2][i]));
});

test('Spearman et Spearman partielle', () => {
  proche(S.spearman([1, 2, 3, 4, 5], [5, 6, 7, 8, 7]), 0.8208);
  assert.equal(S.spearman([1, 1, 1], [1, 2, 3]), null);
  const x = [1, 2, 3, 4, 5, 6, 7, 8]; const z = [2, 1, 4, 3, 6, 5, 8, 7]; const y = z.map((v) => v * 2);
  proche(S.spearmanPartielle(x, y, z), 0, 1e-9);
});

test('même graine, même p ; permutation par blocs conserve les valeurs', () => {
  const serie = Array.from({ length: 50 }, (_, i) => i % 3);
  const perm = S.permuterBlocs(serie, 7, S.generateur(5));
  assert.deepEqual([...perm].sort(), [...serie].sort());
  const stat = (s) => Math.abs(S.moyenne(s.slice(0, 25)) - S.moyenne(s.slice(25)));
  const o = { permutations: 199, blocJours: 7, seed: 1234 };
  assert.equal(S.testPermutation(serie, stat, o).p, S.testPermutation(serie, stat, o).p);
});

test('médiane, quantile, écart-type', () => {
  assert.equal(S.mediane([3, 1, 2, 10]), 2.5);
  assert.equal(S.quantile([1, 2, 3, 4, 5], 0.5), 3);
  proche(S.ecartType([2, 4, 4, 4, 5, 5, 7, 9]), 2.138);
});

test('versions rapides identiques aux versions de référence', () => {
  const xs = [0, 2, 1, 1, 2, 0, 2, 1, 0, 2]; const ys = [3, 8, 5, 6, 9, 2, 7, 6, 4, 8];
  const rx = S.rangsEntiers(Int32Array.from(xs), xs.length, 2, new Float64Array(10));
  assert.deepEqual(Array.from(rx), S.rangs(xs));
  const ry = S.rangsEntiers(Int32Array.from(ys), ys.length, 10, new Float64Array(10));
  proche(S.pearsonTableaux(rx, ry, 10), S.spearman(xs, ys), 1e-12);
  const serie = Float64Array.from({ length: 30 }, (_, i) => i);
  const dst = S.creerPermuteur(30, 7)(serie, new Float64Array(30), S.generateur(3));
  assert.deepEqual([...dst].sort((a, b) => a - b), [...serie]);
});
