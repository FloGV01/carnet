import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normaliser, valider, estVide, referencesDe, basculerMultiple, ErreurValidation } from '../../public/js/domain/champs.js';

test('vide devient null, 0 et false sont conservés', () => {
  const { valeur, erreurs } = normaliser('journal', { date: '2026-09-30', notes: '   ', explosions: 0, contactHumain: false, pointsPositifs: undefined });
  assert.deepEqual(erreurs, []);
  assert.equal(valeur.notes, null);
  assert.equal(valeur.explosions, 0);
  assert.equal(valeur.contactHumain, false);
  assert.equal(valeur.pointsPositifs, null);
  assert.equal(valeur.humeur, null);
  assert.ok('lieu' in valeur);
});

test('bornes et types', () => {
  assert.throws(() => valider('journal', { date: '2026-09-30', humeur: 11 }), ErreurValidation);
  assert.throws(() => valider('journal', { date: '2026-09-30', humeur: 6.5 }), ErreurValidation);
  assert.throws(() => valider('journal', { date: '2026-09-30', explosions: -1 }), ErreurValidation);
  assert.throws(() => valider('journal', { date: '2026-09-30', contactHumain: 'oui' }), ErreurValidation);
  assert.throws(() => valider('journal', { date: '2026-02-31' }), ErreurValidation);
  assert.throws(() => valider('journal', {}), ErreurValidation);
  assert.throws(() => valider('journal', { date: '2026-09-30', lieu: 'sommeil:bien' }), /référence invalide/);
  assert.throws(() => valider('journal', { date: '2026-09-30', heureLever: '7h' }), ErreurValidation);
});

test('aucune limite de longueur pour une saisie, mais une à l\'import', () => {
  const long = 'x'.repeat(50000);
  assert.equal(valider('journal', { date: '2026-09-30', notes: long }).notes.length, 50000);
  assert.throws(() => valider('journal', { date: '2026-09-30', notes: long }, { origine: 'import' }), ErreurValidation);
  assert.equal(valider('journal', { date: '2026-09-30', notes: long }, { origine: 'sauvegarde' }).notes.length, 50000);
});

test('texte en NFC, retours à la ligne gardés, extrémités nettoyées', () => {
  const v = valider('journal', { date: '2026-09-30', pointsPositifs: '  été\nmarche  ' });
  assert.equal(v.pointsPositifs, 'été\nmarche');
});

test('questions de rendez-vous et effets secondaires', () => {
  const v = valider('rdv', { id: 'rdv_1', questions: [{ texte: ' Sommeil ? ' }, { texte: '  ' }, { texte: 'Dose', abordee: true }] });
  assert.deepEqual(v.questions, [{ texte: 'Sommeil ?', abordee: false }, { texte: 'Dose', abordee: true }]);
  assert.equal(v.date, null);
  const tr = valider('traitements', { id: 'tr_1', date: '2026-09-30', effetsSecondaires: ['effetSecondaire:somnolence', 'effetSecondaire:somnolence'] });
  assert.deepEqual(tr.effetsSecondaires, ['effetSecondaire:somnolence']);
  assert.deepEqual(referencesDe('traitements', tr), ['effetSecondaire:somnolence']);
});

test('champs inconnus ignorés avec avertissement', () => {
  const r = normaliser('journal', { date: '2026-09-30', bizarre: 1 });
  assert.equal('bizarre' in r.valeur, false);
  assert.equal(r.avertissements.length, 1);
});

test('estVide et « Aucun » exclusif', () => {
  assert.ok(estVide('journal', valider('journal', { date: '2026-09-30' })));
  assert.ok(!estVide('journal', valider('journal', { date: '2026-09-30', explosions: 0 })));
  const ex = new Set(['effetSecondaire:aucun']);
  assert.deepEqual(basculerMultiple(['effetSecondaire:fatigue'], 'effetSecondaire:aucun', ex), ['effetSecondaire:aucun']);
  assert.deepEqual(basculerMultiple(['effetSecondaire:aucun'], 'effetSecondaire:fatigue', ex), ['effetSecondaire:fatigue']);
  assert.equal(basculerMultiple(['effetSecondaire:fatigue'], 'effetSecondaire:fatigue', ex), null);
});
