import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statutRdv, trierRdv, prochainRdv } from '../../public/js/domain/soins.js';

const rdvs = [
  { id: 'a', date: '2026-09-20' }, { id: 'b', date: '2026-10-14', heure: '10:30' }, { id: 'c', date: null },
  { id: 'd', date: '2026-09-30', heure: '08:00' }, { id: 'e', date: '2026-11-30' },
];

test('statut calculé, jamais stocké : un RDV du jour reste à venir', () => {
  assert.equal(statutRdv(rdvs[0], '2026-09-30'), 'passe');
  assert.equal(statutRdv(rdvs[3], '2026-09-30'), 'a-venir');
  assert.equal(statutRdv(rdvs[2], '2026-09-30'), 'a-venir');
});

test('tri : à venir par date (sans date en dernier), passés du plus récent au plus ancien', () => {
  const t = trierRdv(rdvs, '2026-09-30');
  assert.deepEqual(t.aVenir.map((r) => r.id), ['d', 'b', 'e', 'c']);
  assert.deepEqual(t.passes.map((r) => r.id), ['a']);
});

test('prochain RDV seulement dans les 14 jours', () => {
  assert.equal(prochainRdv(rdvs, '2026-10-01').id, 'b');
  assert.equal(prochainRdv(rdvs.filter((r) => r.id !== 'b'), '2026-10-01'), null);
});
