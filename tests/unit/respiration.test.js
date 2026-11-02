import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DUREES, RYTHMES, CYCLE_MS, RESPIRATION_DEFAUT, normaliserRespiration, dureeEnMs, phaseRespiration, texteAvant, texteFin,
  NOM_RESPIRATION, texteDuree, texteRythme,
} from '../../public/js/domain/respiration.js';

const phases = (rythme, instants) => instants.map((t) => phaseRespiration(t, rythme));

test('5-5 : cinq secondes pour inspirer, cinq pour expirer, puis le cycle repart', () => {
  assert.deepEqual(phases('5-5', [0, 4999, 5000, 9999, 10000, 14999, 15000]),
    ['inspire', 'inspire', 'expire', 'expire', 'inspire', 'inspire', 'expire']);
});

test('4-6 : quatre secondes pour inspirer, six pour expirer', () => {
  assert.deepEqual(phases('4-6', [0, 3999, 4000, 9999, 10000, 13999, 14000, 19999]),
    ['inspire', 'inspire', 'expire', 'expire', 'inspire', 'inspire', 'expire', 'expire']);
});

test('sans rythme ni durée : 5-5 pendant 5 minutes', () => {
  assert.equal(phaseRespiration(0), 'inspire');
  assert.equal(phaseRespiration(5000), 'expire');
  assert.equal(phaseRespiration(5 * 60 * 1000 - 1), 'expire');
  assert.equal(phaseRespiration(5 * 60 * 1000), 'fini');
});

test('un rythme inconnu retombe sur 5-5', () => {
  assert.equal(phaseRespiration(4500, 'autre'), 'inspire');
  assert.equal(phaseRespiration(5000, undefined), 'expire');
});

test('2, 5 et 10 minutes : « fini » à la durée exacte, dans les deux rythmes', () => {
  for (const rythme of RYTHMES) {
    for (const minutes of DUREES) {
      const fin = dureeEnMs(minutes);
      assert.equal(fin, minutes * 60 * 1000);
      assert.equal(phaseRespiration(fin - 1, rythme, fin), 'expire', `${rythme} · ${minutes} min, avant la fin`);
      assert.equal(phaseRespiration(fin, rythme, fin), 'fini', `${rythme} · ${minutes} min, à la fin`);
      assert.equal(phaseRespiration(fin + 1, rythme, fin), 'fini', `${rythme} · ${minutes} min, après la fin`);
    }
  }
});

test('le cycle fait CYCLE_MS dans les deux rythmes, et chaque durée est un nombre entier de cycles', () => {
  assert.equal(CYCLE_MS, 10000);
  for (const rythme of RYTHMES) {
    for (let t = 0; t < CYCLE_MS; t += 250) {
      assert.equal(phaseRespiration(t + CYCLE_MS, rythme), phaseRespiration(t, rythme), `${rythme} à ${t} ms`);
    }
  }
  for (const minutes of DUREES) assert.equal(dureeEnMs(minutes) % CYCLE_MS, 0);
});

test('en 4-6 l\'inspiration dure 4 s au lieu de 5 s : l\'expiration est plus longue', () => {
  const inspire = (rythme) => [...Array(CYCLE_MS).keys()].filter((t) => phaseRespiration(t, rythme) === 'inspire').length;
  assert.equal(inspire('5-5'), 5000);
  assert.equal(inspire('4-6'), 4000);
});

test('sans réglage, les valeurs par défaut s\'appliquent à la lecture (copie, jamais l\'objet figé)', () => {
  assert.deepEqual(RESPIRATION_DEFAUT, { duree: 5, rythme: '5-5', son: false, voix: false });
  for (const brut of [undefined, null, {}, 'texte', 12, []]) {
    const r = normaliserRespiration(brut);
    assert.deepEqual(r, { duree: 5, rythme: '5-5', son: false, voix: false });
    assert.notEqual(r, RESPIRATION_DEFAUT);
  }
});

test('un réglage partiel garde ce qui est valide et complète le reste', () => {
  assert.deepEqual(normaliserRespiration({ duree: 10 }), { duree: 10, rythme: '5-5', son: false, voix: false });
  assert.deepEqual(normaliserRespiration({ rythme: '4-6' }), { duree: 5, rythme: '4-6', son: false, voix: false });
  assert.deepEqual(normaliserRespiration({ son: true }), { duree: 5, rythme: '5-5', son: true, voix: false });
  assert.deepEqual(normaliserRespiration({ duree: 2, rythme: '4-6', son: true }), { duree: 2, rythme: '4-6', son: true, voix: false });
});

test('une valeur hors liste est ignorée, une clé inconnue n\'est pas gardée', () => {
  assert.deepEqual(normaliserRespiration({ duree: 3, rythme: '6-4', son: 'oui', autre: 1 }), { duree: 5, rythme: '5-5', son: false, voix: false });
  assert.deepEqual(normaliserRespiration({ duree: '10', son: 1 }), { duree: 5, rythme: '5-5', son: false, voix: false });
});

test('v10 · `voix` (la lecture à voix haute des exercices courts) : un booléen, éteint au départ, gardé quand il est allumé', () => {
  assert.equal(normaliserRespiration({ voix: true }).voix, true);
  assert.equal(normaliserRespiration({ voix: false }).voix, false);
  for (const brut of ['oui', 1, null, {}, undefined]) assert.equal(normaliserRespiration({ voix: brut }).voix, false, String(brut));
  // Une méta écrite avant la v10 (sans la clé) reste valide, et ses autres réglages ne bougent pas.
  assert.deepEqual(normaliserRespiration({ duree: 2, rythme: '4-6', son: true }), { duree: 2, rythme: '4-6', son: true, voix: false });
  // La voix et le signal se règlent l'un sans l'autre.
  assert.deepEqual(normaliserRespiration({ son: false, voix: true }), { duree: 5, rythme: '5-5', son: false, voix: true });
});

test('les textes d\'avant et de fin suivent la durée ; « 5 minutes » ne se coupe pas (espace insécable)', () => {
  for (const minutes of DUREES) {
    assert.equal(texteAvant(minutes), `Cohérence cardiaque · ${minutes}\u00a0minutes`);
    assert.equal(texteFin(minutes), `${minutes}\u00a0minutes de respiration.`);
    // Dans une carte (v7), les deux morceaux sur deux lignes, sans « · ».
    assert.equal(`${NOM_RESPIRATION} · ${texteDuree(minutes)}`, texteAvant(minutes));
  }
  assert.equal(NOM_RESPIRATION, 'Cohérence cardiaque');
  assert.equal(texteDuree(10), '10\u00a0minutes');
});

test('le rythme en clair sur la puce de Moment difficile (2b) : inspirer, puis expirer, chaque durée d\'un tenant', () => {
  assert.deepEqual(RYTHMES.map(texteRythme), ['5\u00a0s · 5\u00a0s', '4\u00a0s · 6\u00a0s']);
});
