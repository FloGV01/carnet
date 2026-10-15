import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAMPS_JOURNEE, JOURNEE_DEFAUT, normaliserJournee, champsVisibles, champsAffiches, repliAffiche,
} from '../../public/js/domain/journee.js';

test('le masque peseRecharge survit à normaliserJournee, hors de l\'ordre des champs', () => {
  const j = normaliserJournee({ ordre: ['humeur', 'lieu'], masques: ['explosions', 'peseRecharge'], heuresMoment: [] });
  assert.deepEqual(j.masques, ['explosions', 'peseRecharge']);
  assert.ok(!j.ordre.includes('peseRecharge'));
  assert.deepEqual([...j.ordre].sort(), [...CHAMPS_JOURNEE].sort());
  assert.equal(j.ordre[0], 'humeur');
});

test('peseRecharge seul, doublons et clés inconnues : seul le masque connu est gardé', () => {
  assert.deepEqual(normaliserJournee({ masques: ['peseRecharge', 'peseRecharge', 'inconnu', 'humeur'] }).masques, ['peseRecharge', 'humeur']);
  assert.deepEqual(normaliserJournee({ masques: [] }).masques, []);
  assert.deepEqual(normaliserJournee({ masques: ['peseRecharge'] }).masques, ['peseRecharge']);
});

test('sans réglage, les masques par défaut s\'appliquent (copie, jamais l\'objet figé)', () => {
  for (const brut of [undefined, null, {}, { masques: 'explosions' }]) {
    const j = normaliserJournee(brut);
    assert.deepEqual(j.masques, [...JOURNEE_DEFAUT.masques]);
    assert.notEqual(j.masques, JOURNEE_DEFAUT.masques);
    assert.deepEqual(j.ordre, CHAMPS_JOURNEE);
  }
});

test('un masque peseRecharge ne change ni les champs visibles ni les champs affichés', () => {
  const j = normaliserJournee({ masques: ['explosions', 'peseRecharge'] });
  assert.deepEqual(champsVisibles(j), CHAMPS_JOURNEE.filter((c) => c !== 'explosions'));
  assert.deepEqual(champsAffiches(j, null), CHAMPS_JOURNEE.filter((c) => c !== 'explosions'));
});

test('repliAffiche : visible sauf masqué', () => {
  const visible = normaliserJournee({ masques: ['explosions'] });
  assert.equal(repliAffiche(visible, null), true);
  assert.equal(repliAffiche(visible, { pese: null, recharge: null }), true);
  const masque = normaliserJournee({ masques: ['explosions', 'peseRecharge'] });
  assert.equal(repliAffiche(masque, null), false);
  assert.equal(repliAffiche(masque, undefined), false);
  assert.equal(repliAffiche(masque, {}), false);
  assert.equal(repliAffiche(masque, { pese: null, recharge: null }), false);
});

test('repliAffiche : masqué mais portant des valeurs ce jour-là, il reste affiché', () => {
  const masque = normaliserJournee({ masques: ['peseRecharge'] });
  assert.equal(repliAffiche(masque, { pese: ['pese:bruit'], recharge: null }), true);
  assert.equal(repliAffiche(masque, { pese: null, recharge: ['recharge:calme'] }), true);
  assert.equal(repliAffiche(masque, { pese: ['pese:bruit'], recharge: ['recharge:calme'] }), true);
});

test('v6 : le champ Humeur du soir est masqué par défaut, avec le compteur d\'explosions', () => {
  assert.deepEqual(JOURNEE_DEFAUT.masques, ['explosions', 'humeur']);
  const j = normaliserJournee(null);
  assert.ok(!champsVisibles(j).includes('humeur'));
  assert.ok(!champsAffiches(j, { date: '2026-10-14', lieu: 'lieu:bureau' }).includes('humeur'));
});

test('v6 : un jour passé noté le soir garde son champ Humeur', () => {
  const j = normaliserJournee(null);
  assert.ok(champsAffiches(j, { date: '2026-09-30', humeur: 6 }).includes('humeur'));
  assert.ok(!champsAffiches(j, { date: '2026-09-30', humeur: null }).includes('humeur'));
});
