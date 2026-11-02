import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { RACINE, lister, rel, lire } from '../aides/fichiers.js';

// v10 (4/9, relecture) · Un mot de la carte se touche par `toucherMot` (tests/aides/emotion.js) : un `.click()` seul fait
// défiler la carte au dernier moment, la lentille emporte alors la bulle sous le pointeur, et le toucher est ignoré. Le test
// échoue ainsi au hasard, sous charge, sans qu'aucun défaut du produit n'y soit pour rien.
const FICHIERS = [...lister(join(RACINE, 'tests', 'e2e'), (p) => p.endsWith('.js')), ...lister(join(RACINE, 'tests', 'aides'), (p) => p.endsWith('.js'))];
const CLIC_SEUL = /\bmot\((?:[^()]|\([^()]*\))*\)\s*\.click\(/g;

test('la recherche voit bien un clic seul, même sur un mot calculé', () => {
  for (const code of ['await mot(vue, \'Calme\').click();', 'await mot(vue, en(8, 6)).click();', 'mot(vue, n)\n  .click({ force: true })']) assert.equal(code.match(CLIC_SEUL)?.length, 1, code);
  for (const code of ['await toucherMot(vue, \'Calme\');', 'await expect(mot(vue, \'Calme\')).toBeVisible();', 'await bulleDuMot.click();']) assert.equal(code.match(CLIC_SEUL), null, code);
});

test('aucun test e2e ne touche un mot de la carte par un .click() seul', () => {
  const fautes = FICHIERS.flatMap((f) => [...lire(f).matchAll(CLIC_SEUL)].map((m) => `${rel(f)} : ${m[0]}`));
  assert.deepEqual(fautes, []);
});
