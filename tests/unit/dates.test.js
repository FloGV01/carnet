import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../../public/js/domain/dates.js';

test('jour logique : avant 4 h, encore la veille', () => {
  assert.equal(D.jourLogique(new Date(2026, 9, 1, 0, 30)), '2026-09-30');
  assert.equal(D.jourLogique(new Date(2026, 9, 1, 3, 59)), '2026-09-30');
  assert.equal(D.jourLogique(new Date(2026, 9, 1, 4, 0)), '2026-10-01');
  assert.equal(D.jourLogique(new Date(2026, 0, 1, 1, 0)), '2025-12-31');
});

test('rattachement d\'un événement : une seule règle', () => {
  assert.equal(D.jourEvenement('2026-10-01', '01:30'), '2026-09-30');
  assert.equal(D.jourEvenement('2026-10-01', '04:00'), '2026-10-01');
  assert.equal(D.jourEvenement('2026-10-01', null), '2026-10-01');
  assert.equal(D.jourEvenement('2026-03-01', '00:10'), '2026-02-28');
});

test('arithmétique insensible aux changements d\'heure', () => {
  assert.equal(D.addDays('2026-03-28', 1), '2026-03-29');
  assert.equal(D.addDays('2026-03-29', 1), '2026-03-30');
  assert.equal(D.addDays('2026-10-25', 1), '2026-10-26');
  assert.equal(D.diffDays('2026-03-28', '2026-03-30'), 2);
  assert.equal(D.diffDays('2026-10-24', '2026-10-26'), 2);
  assert.equal(D.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(D.addDays('2024-02-28', 1), '2024-02-29');
});

test('semaines du lundi au dimanche', () => {
  assert.equal(D.lundiDe('2026-09-30'), '2026-09-28');
  assert.equal(D.lundiDe('2026-09-28'), '2026-09-28');
  assert.equal(D.lundiDe('2026-10-04'), '2026-09-28');
  assert.equal(D.jourSemaine('2026-09-30'), 2);
});

test('validité des dates et des heures', () => {
  assert.ok(D.estDateValide('2026-02-28'));
  assert.ok(!D.estDateValide('2026-02-31'));
  assert.ok(!D.estDateValide('2026-2-3'));
  assert.ok(D.estHeureValide('23:59'));
  assert.ok(!D.estHeureValide('24:00'));
  assert.ok(!D.estHeureValide('7:05'));
});

test('formats français', () => {
  assert.equal(D.formaterJour('2026-09-30'), 'mercredi 30 sept.');
  assert.equal(D.formaterJourCourt('2026-09-21'), 'lun 21/09');
  assert.equal(D.formaterDateLongue('2026-10-01'), '1er octobre 2026');
  assert.equal(D.formaterSemaine('2026-09-21'), 'Semaine du 21 septembre');
  assert.equal(D.formaterDuree(24400), '0:24');
  assert.equal(D.formaterDuree(300000), '5:00');
  assert.deepEqual(D.plageJours('2026-09-29', '2026-10-01'), ['2026-09-29', '2026-09-30', '2026-10-01']);
});
