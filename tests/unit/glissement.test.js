import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sensGlissement, GLISSEMENT_MIN_PX, GLISSEMENT_RAPIDE_PX, GLISSEMENT_RAPIDE_PX_MS } from '../../public/js/ui/glissement.js';

// v7 · Changer de jour en glissant (B4) : un glissement horizontal net, au moins 60 px ou un geste rapide, avec
// |dx| > 1,5 × |dy|. Vers la droite, la veille ; vers la gauche, le lendemain.

test('les seuils de B4', () => {
  assert.equal(GLISSEMENT_MIN_PX, 60);
  assert.equal(GLISSEMENT_RAPIDE_PX, 30);
  assert.equal(GLISSEMENT_RAPIDE_PX_MS, 0.5);
});

test('vers la droite, la veille ; vers la gauche, le lendemain', () => {
  assert.equal(sensGlissement(80, 5, 400), 'precedent');
  assert.equal(sensGlissement(-80, -5, 400), 'suivant');
  assert.equal(sensGlissement(60, 0, 1000), 'precedent');
});

test('un geste lent de moins de 60 px ne change pas de jour ; un geste rapide de 30 px au moins, si', () => {
  assert.equal(sensGlissement(59, 0, 1000), null);
  assert.equal(sensGlissement(40, 0, 80), 'precedent'); // 0,5 px/ms
  assert.equal(sensGlissement(-40, 0, 79), 'suivant');
  assert.equal(sensGlissement(40, 0, 81), null);
  assert.equal(sensGlissement(29, 0, 5), null);
  assert.equal(sensGlissement(40, 0, 0), 'precedent'); // trop bref pour être mesuré
});

test('un geste qui n\'est pas nettement horizontal est laissé au défilement', () => {
  assert.equal(sensGlissement(90, 60, 200), null); // 90 = 1,5 × 60
  assert.equal(sensGlissement(91, 60, 200), 'precedent');
  assert.equal(sensGlissement(-91, 60, 200), 'suivant');
  assert.equal(sensGlissement(10, 300, 200), null);
  assert.equal(sensGlissement(0, 0, 200), null);
  assert.equal(sensGlissement(Number.NaN, 0, 200), null);
});
