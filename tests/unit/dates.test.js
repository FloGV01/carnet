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
  assert.equal(D.formaterJourComplet('2026-10-14'), 'mercredi 14 octobre');
  assert.equal(D.formaterJourComplet('2026-10-01'), 'jeudi 1er octobre');
  assert.equal(D.formaterJourAbrege('2026-09-16'), 'mer. 16 sept.');
  assert.equal(D.formaterJourCourt('2026-09-21'), 'lun 21/09');
  assert.equal(D.formaterJourCourt('2026-10-03', { zero: false }), 'sam 3/10');
  assert.equal(D.formaterJourMois('2026-09-10'), '10/09');
  assert.equal(D.formaterJourMois('2026-10-02', { zero: false }), '2/10');
  assert.equal(D.formaterHeure('18:00'), '18 h');
  assert.equal(D.formaterHeure('09:05'), '9 h 05');
  assert.equal(D.formaterHeure('00:30'), '0 h 30');
  assert.equal(D.formaterDateLongue('2026-10-01'), '1er octobre 2026');
  assert.equal(D.formaterSemaine('2026-09-21'), 'Semaine du 21 septembre');
  assert.equal(D.formaterDuree(24400), '0:24');
  assert.equal(D.formaterDuree(300000), '5:00');
  assert.deepEqual(D.plageJours('2026-09-29', '2026-10-01'), ['2026-09-29', '2026-09-30', '2026-10-01']);
});

// ---------- v6 : « C'était vers… » ----------

const a = (jour, h, min) => new Date(2026, 9, jour, h, min);

test('vers : les heures proposées suivent le jour logique, heure en cours comprise', () => {
  assert.deepEqual(D.heuresVers(a(13, 4, 30)), [], 'à 04:30 : aucune');
  assert.deepEqual(D.heuresVers(a(13, 5, 59)), [], 'à 05:59 : aucune');
  assert.deepEqual(D.heuresVers(a(13, 6, 0)), [6]);
  assert.deepEqual(D.heuresVers(a(13, 14, 5)), [6, 8, 10, 12, 14]);
  assert.deepEqual(D.heuresVers(a(13, 21, 59)), [6, 8, 10, 12, 14, 16, 18, 20]);
  assert.deepEqual(D.heuresVers(a(13, 22, 0)), [6, 8, 10, 12, 14, 16, 18, 20, 22]);
  // Après minuit, on est encore dans la journée d'hier : minuit est atteint, 2 h pas encore.
  assert.deepEqual(D.heuresVers(a(13, 1, 30)), [6, 8, 10, 12, 14, 16, 18, 20, 22, 0]);
  assert.deepEqual(D.heuresVers(a(13, 3, 59)), [6, 8, 10, 12, 14, 16, 18, 20, 22, 0, 2]);
  assert.deepEqual(D.heuresVers(a(13, 0, 0)), [6, 8, 10, 12, 14, 16, 18, 20, 22, 0]);
  assert.deepEqual(D.heuresVers(a(13, 1, 59)), [6, 8, 10, 12, 14, 16, 18, 20, 22, 0]);
  assert.deepEqual(D.heuresVers(a(13, 2, 0)), [6, 8, 10, 12, 14, 16, 18, 20, 22, 0, 2]);
});

test('vers : le couple (date, heure) écrit, le 13/10 à 01:30', () => {
  const maintenant = a(13, 1, 30);
  assert.deepEqual(D.versDateHeure(maintenant, 22), { date: '2026-10-12', heure: '22:00' });
  assert.deepEqual(D.versDateHeure(maintenant, 0), { date: '2026-10-13', heure: '00:00' });
  assert.deepEqual(D.versDateHeure(a(13, 3, 59), 2), { date: '2026-10-13', heure: '02:00' });
  assert.deepEqual(D.versDateHeure(a(13, 14, 5), 6), { date: '2026-10-13', heure: '06:00' });
  // Les deux relevés de la nuit sont au jour logique du 12.
  assert.equal(D.jourEvenement('2026-10-12', '22:00'), '2026-10-12');
  assert.equal(D.jourEvenement('2026-10-13', '00:00'), '2026-10-12');
});

test('vers : le couple traverse un changement de mois et d\'année', () => {
  assert.deepEqual(D.versDateHeure(new Date(2026, 10, 1, 0, 30), 0), { date: '2026-11-01', heure: '00:00' });
  assert.deepEqual(D.versDateHeure(new Date(2026, 10, 1, 0, 30), 22), { date: '2026-10-31', heure: '22:00' });
  assert.deepEqual(D.versDateHeure(new Date(2027, 0, 1, 1, 0), 0), { date: '2027-01-01', heure: '00:00' });
  assert.deepEqual(D.versDateHeure(new Date(2027, 0, 1, 1, 0), 22), { date: '2026-12-31', heure: '22:00' });
});

test('vers : chaque heure proposée donne un relevé du jour logique d\'aujourd\'hui', () => {
  for (const [jour, h, min] of [[13, 1, 30], [13, 3, 59], [13, 14, 5], [13, 22, 0], [25, 3, 30], [29, 2, 30]]) {
    const maintenant = a(jour, h, min);
    for (const heure of D.heuresVers(maintenant)) {
      const { date, heure: hhmm } = D.versDateHeure(maintenant, heure);
      assert.equal(D.jourEvenement(date, hhmm), D.jourLogique(maintenant), `${jour}/10 ${h}:${min} vers ${heure} h`);
    }
  }
});

test('vers : « vers 14 h »', () => {
  assert.equal(D.formaterVers('14:00'), 'vers 14 h');
  assert.equal(D.formaterVers('06:00'), 'vers 6 h');
  assert.equal(D.formaterVers('00:00'), 'vers 0 h');
  assert.equal(D.formaterVers('02:00'), 'vers 2 h');
});

test('formaterPlage (v7, Ma semaine) : « 12 – 18 oct. », à cheval sur deux mois ou deux années', () => {
  assert.equal(D.formaterPlage('2026-10-12', '2026-10-18'), '12 – 18 oct.');
  assert.equal(D.formaterPlage('2026-09-28', '2026-10-04'), '28 sept. – 4 oct.');
  assert.equal(D.formaterPlage('2026-12-28', '2027-01-03'), '28 déc. 2026 – 3 janv. 2027');
});
