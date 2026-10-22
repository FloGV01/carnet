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
