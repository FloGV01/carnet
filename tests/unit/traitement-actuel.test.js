import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normaliserTraitement, momentsUtilises, decrireChangements, resumeLigne } from '../../public/js/domain/traitement-actuel.js';

// Noms fictifs uniquement : jamais de vrai médicament dans les tests.
const ligne = (id, nom, doses) => ({ id, nom, doses });
const base = { depuis: '2026-09-01', lignes: [ligne('a', 'Médicament A', { matin: '½', apresMidi: '½', soir: '1' }), ligne('b', 'Médicament B', { matin: '50 mg' })] };

test('normalisation : champs vides à null, lignes vides retirées, date invalide ignorée', () => {
  const t = normaliserTraitement({ depuis: 'hier', lignes: [ligne('a', '  Médicament  A ', { matin: ' ½ ', soir: '' }), ligne('z', '', {}), { nom: 'sans id' }] });
  assert.equal(t.depuis, null);
  assert.equal(t.lignes.length, 1);
  assert.deepEqual(t.lignes[0], { id: 'a', nom: 'Médicament A', doses: { matin: '½', midi: null, apresMidi: null, soir: null, coucher: null } });
  assert.deepEqual(normaliserTraitement(null), { depuis: null, lignes: [] });
});

test('moments affichés : seulement ceux utilisés, tous quand rien n\'est saisi', () => {
  assert.deepEqual(momentsUtilises(normaliserTraitement(base)).map(([c]) => c), ['matin', 'apresMidi', 'soir']);
  assert.equal(momentsUtilises(normaliserTraitement({})).length, 5);
  assert.equal(resumeLigne(normaliserTraitement(base).lignes[0]), 'matin ½ · après-midi ½ · soir 1');
});

test('changements : dose, ajout, arrêt, nom ; rien quand rien ne change', () => {
  assert.deepEqual(decrireChangements(base, base), []);
  const apres = { ...base, lignes: [ligne('a', 'Médicament A', { matin: '½', apresMidi: '½', soir: '1½' }), ligne('c', 'Médicament C', { coucher: '1' })] };
  assert.deepEqual(decrireChangements(base, apres), ['Médicament A : soir 1 → 1½', 'Ajout : Médicament C (coucher 1)', 'Arrêt : Médicament B']);
  const renomme = { ...base, lignes: [ligne('a', 'Médicament A2', base.lignes[0].doses), base.lignes[1]] };
  assert.deepEqual(decrireChangements(base, renomme), ['Médicament A2 : nom Médicament A → Médicament A2']);
  assert.deepEqual(decrireChangements(null, base), ['Ajout : Médicament A (matin ½, après-midi ½, soir 1)', 'Ajout : Médicament B (matin 50 mg)']);
});
