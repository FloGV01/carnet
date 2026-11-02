import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FONDU_MINUTERIE_S, LIBELLES_FOND, SONS_DE_FOND, fabriquerTampon } from '../../public/js/ui/composants/sons-de-fond.js';

// v10 (spec §9.3) · Les quatre sons de fond, fabriqués sans fichier : un tampon de 10 s au moins, dont le raccord de la boucle ne
// claque pas. Le reste (minuterie, fondu, sortie de l'écran) est dans tests/e2e/v10-sons.spec.js.
const TAUX = 44100;
const contexte = { sampleRate: TAUX, createBuffer: (canaux, longueur, sampleRate) => { const d = new Float32Array(longueur); return { numberOfChannels: canaux, length: longueur, sampleRate, getChannelData: () => d }; } };

test('quatre sons, dans cet ordre, avec leurs libellés ; 30 s de fondu au bout de la minuterie', () => {
  assert.deepEqual([...SONS_DE_FOND], ['brun', 'rose', 'vagues', 'pluie']);
  assert.deepEqual(SONS_DE_FOND.map((s) => LIBELLES_FOND[s]), ['Bruit brun', 'Bruit rose', 'Vagues', 'Pluie douce']);
  assert.equal(FONDU_MINUTERIE_S, 30);
});

for (const son of SONS_DE_FOND) {
  test(`${son} : 10 s au moins, sans valeur folle ni écrêtage, centré, et la boucle se referme sans saut`, () => {
    const tampon = fabriquerTampon(contexte, son);
    assert.ok(tampon.length >= 10 * TAUX, `${tampon.length / TAUX} s`);
    assert.equal(tampon.numberOfChannels, 1);
    const d = tampon.getChannelData(0);
    let somme = 0;
    let carres = 0;
    let crete = 0;
    let sautMax = 0;
    for (let i = 0; i < d.length; i += 1) {
      assert.ok(Number.isFinite(d[i]));
      somme += d[i];
      carres += d[i] * d[i];
      crete = Math.max(crete, Math.abs(d[i]));
      if (i > 0) sautMax = Math.max(sautMax, Math.abs(d[i] - d[i - 1]));
    }
    assert.ok(crete <= 0.95 + 1e-6, `crête ${crete}`);
    assert.ok(Math.abs(somme / d.length) < 0.01, `moyenne ${somme / d.length}`);
    assert.ok(Math.sqrt(carres / d.length) > 0.05, 'un vrai son, pas un silence');
    // Le passage de la dernière valeur à la première est un pas comme les autres : il ne dépasse pas le plus grand d'entre eux,
    // ni, pour un son doux, une petite part de la crête. Le début du tampon n'est pas un fondu depuis le silence.
    const raccord = Math.abs(d[0] - d[d.length - 1]);
    assert.ok(raccord <= sautMax, `raccord ${raccord}, plus grand pas ${sautMax}`);
    assert.ok(raccord < crete / 2, `raccord ${raccord}, crête ${crete}`);
    const force = (de, a) => { let k = 0; for (let i = de; i < a; i += 1) k += d[i] * d[i]; return Math.sqrt(k / (a - de)); };
    assert.ok(force(0, TAUX / 2) > force(TAUX, 2 * TAUX) / 3, 'le début n\'est pas un fondu depuis le silence');
  });
}

test('deux tampons d\'un même son ne sont pas le même : rien de figé', () => {
  const [a, b] = [fabriquerTampon(contexte, 'rose'), fabriquerTampon(contexte, 'rose')].map((t) => t.getChannelData(0));
  let ecarts = 0;
  for (let i = 0; i < 1000; i += 1) if (a[i] !== b[i]) ecarts += 1;
  assert.ok(ecarts > 900);
});
