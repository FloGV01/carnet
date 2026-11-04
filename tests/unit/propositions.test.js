// v10 · Après une émotion notée (spec §8) : la table fixe zone → exercices, écrite à la main, pour les quatre zones.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROPOSITIONS, propositionsPour } from '../../public/js/domain/propositions.js';
import { ELEMENTS_BIEN_ETRE } from '../../public/js/domain/entrees-bien-etre.js';
import { ZONES } from '../../public/js/domain/carte-roue.js';
import { exerciceDe } from '../../public/js/domain/exercices.js';

test('la table de la spec §8, zone par zone, dans l\'ordre de l\'écran', () => {
  assert.deepEqual(propositionsPour('rouge'), ['soupir', 'ancrage-court', 'expiration-longue']);
  assert.deepEqual(propositionsPour('jaune'), ['savourer', 'noting']);
  assert.deepEqual(propositionsPour('bleu'), ['scan-court', 'expiration-longue', 'noting']);
  assert.deepEqual(propositionsPour('vert'), ['savourer', 'expiration-longue']);
});

test('chaque zone de la carte a sa ligne, de deux ou trois exercices, sans doublon', () => {
  assert.deepEqual(Object.keys(PROPOSITIONS).sort(), [...ZONES].sort());
  for (const zone of ZONES) {
    const liste = propositionsPour(zone);
    assert.ok(liste.length >= 2 && liste.length <= 3, zone);
    assert.equal(new Set(liste).size, liste.length, zone);
  }
  assert.ok(Object.isFrozen(PROPOSITIONS));
  for (const liste of Object.values(PROPOSITIONS)) assert.ok(Object.isFrozen(liste));
});

test('une zone nulle ou inconnue n\'a aucune proposition (« Aucun mot », un mot à soi sans zone)', () => {
  for (const brut of [null, undefined, '', 'inconnue', 'Rouge', 'constructor', 'toString', '__proto__', 3, {}, []]) {
    assert.deepEqual(propositionsPour(brut), [], String(brut));
  }
});

test('chaque proposition existe, est un exercice du lecteur, et n\'est pas un exercice de Moment difficile', () => {
  for (const [zone, liste] of Object.entries(PROPOSITIONS)) {
    for (const id of liste) {
      assert.ok(ELEMENTS_BIEN_ETRE.includes(id), `${zone} : ${id}`);
      assert.ok(exerciceDe(id), `${zone} : ${id} se lance dans le lecteur`);
      assert.ok(!['panique', 'colere', 'trop-plein', 'reveil-nuit'].includes(id), `${zone} : ${id}`);
    }
  }
});
