import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sensGlissement, indiceAuCentre, GLISSEMENT_MIN_PX, GLISSEMENT_RAPIDE_PX, GLISSEMENT_RAPIDE_PX_MS } from '../../public/js/ui/glissement.js';

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

// v11 · La roue (spec §5.2) : la valeur au centre de la bande, d'après le centre de chaque valeur.
test('la roue : la valeur la plus proche du milieu, sur une place, entre deux, à égalité le plus petit indice', () => {
  const centres = [40, 120, 200, 280];
  assert.equal(indiceAuCentre(centres, 120), 1); // sur une place
  assert.equal(indiceAuCentre(centres, 40), 0);
  assert.equal(indiceAuCentre(centres, 280), 3);
  assert.equal(indiceAuCentre(centres, 150), 1); // entre deux, plus près de 120
  assert.equal(indiceAuCentre(centres, 171), 2); // entre deux, plus près de 200
  assert.equal(indiceAuCentre(centres, 160), 1); // à égalité entre 120 et 200 : le plus petit indice
  assert.equal(indiceAuCentre(centres, -50), 0); // au-delà des bords
  assert.equal(indiceAuCentre(centres, 999), 3);
  assert.equal(indiceAuCentre([12.5, 92.5], 52.5), 0); // à égalité, en fractions de px
  assert.equal(indiceAuCentre([], 100), -1);
});
