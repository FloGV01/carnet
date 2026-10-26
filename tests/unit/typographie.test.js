// v7 · Typographie des textes affichés (exercices de Bien-être, Rappels, aide de Réglages) : la ponctuation haute et les
// guillemets tiennent au mot voisin.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pourAffichage } from '../../public/js/domain/typographie.js';

test('pourAffichage : une espace insécable avant la ponctuation haute et dans les guillemets, le reste intact', () => {
  assert.equal(pourAffichage('Va vers tes pieds : les orteils.'), 'Va vers tes pieds : les orteils.');
  assert.equal(pourAffichage('avec « Suivant » ; ou ? et !'), 'avec « Suivant » ; ou ? et !');
  assert.equal(pourAffichage('Sens tes pieds sur le sol.'), 'Sens tes pieds sur le sol.');
});

test('pourAffichage : une heure garde son deux-points ; deux guillemets de suite et un texte déjà insécable restent justes', () => {
  assert.equal(pourAffichage('Choisis « Heure de la journée » : 21:00, chaque jour.'), 'Choisis « Heure de la journée » : 21:00, chaque jour.');
  assert.equal(pourAffichage('touche « + », puis « Personnalisé ».'), 'touche « + », puis « Personnalisé ».');
  assert.equal(pourAffichage('« Ajouter »'), '« Ajouter »');
  assert.equal(pourAffichage(''), '');
});

test('v8 (Q29) · pourAffichage : le point médian tient au mot qui le précède, jamais en début de ligne', () => {
  assert.equal(pourAffichage('Irrité · 4 relevés sur 11'), 'Irrité\u00a0· 4 relevés sur 11');
  assert.equal(pourAffichage('à égalité : A et B · 2 épisodes sur 4'), 'à égalité\u00a0: A et B\u00a0· 2 épisodes sur 4');
  assert.equal(pourAffichage('A\u00a0· B'), 'A\u00a0· B');
});
