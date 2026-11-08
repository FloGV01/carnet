import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sensGlissement, ecouterGlissement, indiceAuCentre, GLISSEMENT_MIN_PX, GLISSEMENT_RAPIDE_PX, GLISSEMENT_RAPIDE_PX_MS } from '../../public/js/ui/glissement.js';

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

// v11 · Le geste de retour (spec §11) : changer de jour et revenir en arrière écoutent le doigt de la même façon
// (ecouterGlissement). Un EventTarget tient lieu de document ; les événements portent ce que lit l'écoute d'un PointerEvent ;
// l'heure (performance.now) est simulée.
const pointeur = (type, champs = {}) => Object.assign(new Event(type), { pointerId: 1, pointerType: 'touch', isPrimary: true, clientX: 100, clientY: 300, ...champs });
let horloge = 1000;
function ecoute(t, { accepter = () => true } = {}) {
  t.mock.method(performance, 'now', () => horloge);
  const doc = new EventTarget();
  const sens = [];
  const recus = [];
  const retirer = ecouterGlissement({ doc, accepter: (e) => { recus.push(e.type); return accepter(e); }, surSens: (s) => sens.push(s) });
  // Un glissement : posé en (100, 300), levé (dx, dy) plus loin, `duree` ms plus tard.
  const glisser = (dx, dy = 0, duree = 300, pose = {}, leve = {}) => {
    doc.dispatchEvent(pointeur('pointerdown', pose));
    horloge += duree;
    doc.dispatchEvent(pointeur('pointerup', { clientX: 100 + dx, clientY: 300 + dy, ...leve }));
  };
  return { doc, sens, recus, retirer, glisser };
}

test('ecouterGlissement : un doigt posé puis levé au même pointeur donne le sens, aux seuils de sensGlissement', (t) => {
  const e = ecoute(t);
  e.glisser(120);
  e.glisser(-120, 10);
  e.glisser(59, 0, 1000); // lent et court : rien
  e.glisser(40, 0, 60); // rapide : le sens
  e.glisser(90, 60); // pas nettement horizontal : rien
  assert.deepEqual(e.sens, ['precedent', 'suivant', 'precedent']);
  assert.deepEqual(e.recus, Array(5).fill('pointerdown')); // accepter ne voit que le toucher
  e.retirer();
});

test('ecouterGlissement : un autre pointeur, la souris, le stylet, un second doigt, un pointercancel ou accepter faux ne donnent rien', (t) => {
  const e = ecoute(t);
  e.glisser(120, 0, 300, {}, { pointerId: 2 }); // levé par un autre pointeur
  e.glisser(120, 0, 300, { pointerType: 'mouse' }, { pointerType: 'mouse' });
  e.glisser(120, 0, 300, { pointerType: 'pen' }, { pointerType: 'pen' });
  e.glisser(120, 0, 300, { isPrimary: false }, { isPrimary: false });
  e.doc.dispatchEvent(pointeur('pointerdown'));
  e.doc.dispatchEvent(pointeur('pointercancel'));
  e.doc.dispatchEvent(pointeur('pointerup', { clientX: 220 }));
  // Un nouveau toucher refusé efface le départ d'avant : son lâcher ne compte pas.
  const refus = ecoute(t, { accepter: (x) => x.clientX !== 50 });
  refus.glisser(120, 0, 300, { clientX: 50 }, { clientX: 170 });
  refus.doc.dispatchEvent(pointeur('pointerdown'));
  refus.doc.dispatchEvent(pointeur('pointerdown', { clientX: 50 }));
  refus.doc.dispatchEvent(pointeur('pointerup', { clientX: 220 }));
  assert.deepEqual(e.sens, []);
  assert.deepEqual(refus.sens, []);
  // Le lâcher seul, sans toucher, ne donne rien non plus ; un geste ensuite repart de zéro.
  e.doc.dispatchEvent(pointeur('pointerup', { clientX: 220 }));
  e.glisser(120);
  assert.deepEqual(e.sens, ['precedent']);
  e.retirer();
  refus.retirer();
});

test('ecouterGlissement : retirer() coupe tout, même un geste commencé', (t) => {
  const e = ecoute(t);
  e.doc.dispatchEvent(pointeur('pointerdown'));
  e.retirer();
  e.doc.dispatchEvent(pointeur('pointerup', { clientX: 220 }));
  e.glisser(120);
  e.glisser(-120);
  assert.deepEqual(e.sens, []);
  assert.deepEqual(e.recus, ['pointerdown']);
});
