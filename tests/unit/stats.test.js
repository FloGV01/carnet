import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../../public/js/analyse/stats.js';
import { generateur } from '../fixtures/generateur.js';

// v8 (Q32) : stats.js ne garde que la moyenne et la médiane, les seules utilisées par l'app.
test('stats.js n\'exporte que la moyenne et la médiane', () => {
  assert.deepEqual(Object.keys(S).sort(), ['mediane', 'moyenne']);
});

test('moyenne et médiane', () => {
  assert.equal(S.moyenne([]), null);
  assert.equal(S.moyenne([2, 4, 9]), 5);
  assert.equal(S.mediane([]), null);
  assert.equal(S.mediane([3, 1, 2, 10]), 2.5);
  assert.equal(S.mediane([5, 1, 3]), 3);
});

test('générateur des données inventées : même graine, même suite, entre 0 et 1', () => {
  const a = generateur(5);
  const b = generateur(5);
  const xs = Array.from({ length: 50 }, () => a());
  assert.deepEqual(xs, Array.from({ length: 50 }, () => b()));
  assert.ok(xs.every((x) => x >= 0 && x < 1));
  assert.notDeepEqual(xs, Array.from({ length: 50 }, generateur(6)));
});
