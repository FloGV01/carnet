// v8 · Le souffle du lecteur de Bien-être (spec §5 et §12.3) : quatre temps par étape rythmée, la phase d'un instant, les
// phases à programmer sur l'horloge audio, la cohérence cardiaque en séance du lecteur, et les étapes rythmées des
// exercices (seulement celles dont le texte donne un rythme, aux temps du texte). v10 (spec §6) : la seconde inspiration du
// soupir, et l'étape qui s'allonge en cycles entiers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TEMPS_SOUFFLE, TEMPS_MAX_S, INSPI2_MAX_S, souffleValide, cycleSouffleMs, phaseSouffle, phasesEntre, motPhase, souffleDeRythme, seanceCoherence,
  TEXTE_COHERENCE, NOM_RESPIRATION, DUREES, RYTHMES,
} from '../../public/js/domain/respiration.js';
import { DUREES_AU_CHOIX, EXERCICES, exerciceAvecDuree, exerciceDe, dureeExerciceS, dureeEtPosture } from '../../public/js/domain/exercices.js';
import { trouverInterdits } from '../aides/mots-interdits.js';

const CARRE = { inspi: 4, retiens1: 4, expi: 4, retiens2: 4 };
const SOUPIR = { inspi: 2, inspi2: 1, retiens1: 0, expi: 6, retiens2: 0 };
const LONGUE = { inspi: 4, inspi2: 0, retiens1: 0, expi: 6, retiens2: 0 };
const phases = (s, instants) => instants.map((t) => phaseSouffle(t, s).phase);

test('quatre temps entiers, de 0 à 12 s ; une inspiration et une expiration d\'au moins 1 s', () => {
  assert.deepEqual(TEMPS_SOUFFLE, ['inspi', 'inspi2', 'retiens1', 'expi', 'retiens2']);
  assert.equal(TEMPS_MAX_S, 12);
  assert.equal(souffleValide(CARRE), true);
  assert.equal(souffleValide({ inspi: 5, retiens1: 0, expi: 5, retiens2: 0 }), true);
  for (const brut of [null, undefined, {}, 'carre', { inspi: 4, expi: 4 }, { ...CARRE, inspi: 0 }, { ...CARRE, expi: 0 },
    { ...CARRE, retiens1: -1 }, { ...CARRE, retiens2: 13 }, { ...CARRE, inspi: 4.5 }, { ...CARRE, expi: '4' }]) {
    assert.equal(souffleValide(brut), false, JSON.stringify(brut));
  }
  assert.equal(cycleSouffleMs(CARRE), 16000);
  assert.equal(cycleSouffleMs(souffleDeRythme('4-6')), 10000);
});

test('v10 · la seconde inspiration : absente, elle vaut 0 ; sinon un entier, 3 s au plus', () => {
  assert.equal(INSPI2_MAX_S, 3);
  assert.equal(souffleValide(SOUPIR), true);
  assert.equal(souffleValide(LONGUE), true);
  for (const inspi2 of [0, 1, 2, 3, undefined]) assert.equal(souffleValide({ ...CARRE, inspi2 }), true, String(inspi2));
  for (const inspi2 of [4, 12, -1, 1.5, '1', null]) assert.equal(souffleValide({ ...CARRE, inspi2 }), false, String(inspi2));
  // Absente ou à 0 : le même cycle, les mêmes phases.
  assert.equal(cycleSouffleMs(CARRE), cycleSouffleMs({ ...CARRE, inspi2: 0 }));
  for (let t = 0; t < 32000; t += 500) assert.deepEqual(phaseSouffle(t, CARRE), phaseSouffle(t, { ...CARRE, inspi2: 0 }), `à ${t} ms`);
});

test('v10 · le soupir : inspire 2 s, « Encore un peu » 1 s, expire 6 s ; un cycle de 9 s finit poumons vides', () => {
  assert.equal(cycleSouffleMs(SOUPIR), 9000);
  assert.deepEqual(phases(SOUPIR, [0, 1999, 2000, 2999, 3000, 8999, 9000, 11000, 12000]),
    ['inspire', 'inspire', 'inspire-encore', 'inspire-encore', 'expire', 'expire', 'inspire', 'inspire-encore', 'expire']);
  assert.deepEqual(phaseSouffle(2500, SOUPIR), { phase: 'inspire-encore', debutMs: 2000, dureeMs: 1000 });
  // Compté depuis l'origine : la deuxième petite inspiration commence à 11 s.
  assert.deepEqual(phaseSouffle(11200, SOUPIR), { phase: 'inspire-encore', debutMs: 11000, dureeMs: 1000 });
  assert.deepEqual(phasesEntre(0, 9000, SOUPIR).map((p) => [p.phase, p.debutMs, p.dureeMs]),
    [['inspire', 0, 2000], ['inspire-encore', 2000, 1000], ['expire', 3000, 6000]]);
  assert.deepEqual(['inspire', 'inspire-encore', 'expire'].map(motPhase), ['Inspire', 'Encore un peu', 'Expire']);
  assert.deepEqual(trouverInterdits(motPhase('inspire-encore')), []);
  // Aucune rétention, à aucun instant.
  for (let t = 0; t < 90000; t += 250) assert.doesNotMatch(phaseSouffle(t, SOUPIR).phase, /retiens/);
  assert.equal(phaseSouffle(9000 - 1, SOUPIR).phase, 'expire');
});

test('v10 · l\'expiration longue : 4 s, puis 6 s, sans « Encore un peu » ni « Retiens »', () => {
  assert.equal(cycleSouffleMs(LONGUE), 10000);
  assert.deepEqual(phases(LONGUE, [0, 3999, 4000, 9999, 10000]), ['inspire', 'inspire', 'expire', 'expire', 'inspire']);
  for (let t = 0; t < 60000; t += 250) assert.match(phaseSouffle(t, LONGUE).phase, /^(inspire|expire)$/);
  assert.deepEqual(phasesEntre(0, 10000, LONGUE).map((p) => p.phase), ['inspire', 'expire']);
});

test('respiration carrée : inspire, retiens poumons pleins, expire, retiens poumons vides, puis le cycle repart', () => {
  assert.deepEqual(phases(CARRE, [0, 3999, 4000, 7999, 8000, 11999, 12000, 15999, 16000, 20000]),
    ['inspire', 'inspire', 'retiens-plein', 'retiens-plein', 'expire', 'expire', 'retiens-vide', 'retiens-vide', 'inspire', 'retiens-plein']);
  assert.deepEqual(phaseSouffle(9000, CARRE), { phase: 'expire', debutMs: 8000, dureeMs: 4000 });
  // Compté depuis l'origine : la troisième expiration commence à 40 s.
  assert.deepEqual(phaseSouffle(41000, CARRE), { phase: 'expire', debutMs: 40000, dureeMs: 4000 });
  // Avant l'origine, c'est le début.
  assert.equal(phaseSouffle(-50, CARRE).phase, 'inspire');
});

test('sans rétention (cohérence cardiaque) : inspire puis expire, aucun « Retiens »', () => {
  const s = souffleDeRythme('5-5');
  assert.deepEqual(s, { inspi: 5, retiens1: 0, expi: 5, retiens2: 0 });
  assert.deepEqual(souffleDeRythme('4-6'), { inspi: 4, retiens1: 0, expi: 6, retiens2: 0 });
  assert.deepEqual(souffleDeRythme('autre'), s);
  assert.deepEqual(phases(s, [0, 4999, 5000, 9999, 10000]), ['inspire', 'inspire', 'expire', 'expire', 'inspire']);
  for (let t = 0; t < 60000; t += 250) assert.doesNotMatch(phaseSouffle(t, souffleDeRythme('4-6')).phase, /retiens/);
});

test('phasesEntre : les phases qui commencent dans l\'intervalle, dans l\'ordre ; une phase commencée avant n\'y est pas', () => {
  assert.deepEqual(phasesEntre(0, 450, CARRE).map((p) => [p.phase, p.debutMs]), [['inspire', 0]]);
  assert.deepEqual(phasesEntre(1, 450, CARRE), []);
  assert.deepEqual(phasesEntre(3800, 4250, CARRE).map((p) => [p.phase, p.debutMs]), [['retiens-plein', 4000]]);
  assert.deepEqual(phasesEntre(0, 16000, CARRE).map((p) => p.phase), ['inspire', 'retiens-plein', 'expire', 'retiens-vide']);
  assert.deepEqual(phasesEntre(15900, 16100, CARRE).map((p) => [p.phase, p.debutMs]), [['inspire', 16000]]);
  assert.deepEqual(phasesEntre(0, 20000, souffleDeRythme('5-5')).map((p) => [p.phase, p.debutMs]),
    [['inspire', 0], ['expire', 5000], ['inspire', 10000], ['expire', 15000]]);
  assert.deepEqual(phasesEntre(500, 500, CARRE), []);
});

test('les mots de la phase : « Inspire », « Retiens », « Expire »', () => {
  assert.deepEqual(['inspire', 'retiens-plein', 'expire', 'retiens-vide'].map(motPhase), ['Inspire', 'Retiens', 'Expire', 'Retiens']);
});

test('la cohérence cardiaque en séance du lecteur : une étape rythmée, de la durée et du rythme réglés', () => {
  for (const duree of DUREES) {
    for (const rythme of RYTHMES) {
      const s = seanceCoherence({ duree, rythme, son: true });
      assert.equal(s.id, 'coherence');
      assert.equal(s.titre, NOM_RESPIRATION);
      assert.equal(s.dureeMin, duree);
      assert.equal(s.etapes.length, 1);
      assert.deepEqual(s.etapes[0], { texte: TEXTE_COHERENCE, dureeS: duree * 60, souffle: souffleDeRythme(rythme) });
      assert.equal(dureeExerciceS(s), duree * 60);
      // Chaque durée est un nombre entier de cycles : la séance finit à une fin d'expiration.
      assert.equal((duree * 60 * 1000) % cycleSouffleMs(s.etapes[0].souffle), 0);
      assert.equal(dureeEtPosture(s), `${duree} min · assis`);
    }
  }
  // Sans réglage : 5 min, 5-5.
  assert.deepEqual(seanceCoherence(null).etapes[0].souffle, souffleDeRythme('5-5'));
  assert.equal(seanceCoherence(undefined).dureeMin, 5);
  for (const t of [TEXTE_COHERENCE, seanceCoherence().description]) assert.deepEqual(trouverInterdits(t), [], t);
});

test('les textes de la cohérence cardiaque restent vrais avec « Réduire les animations » : ils suivent les mots affichés, pas le disque', () => {
  // Avec ce réglage, le disque ne grandit ni ne rétrécit (ecrans.css) : les textes ne parlent que des mots de la phase.
  const { description } = seanceCoherence();
  assert.equal(TEXTE_COHERENCE, 'Respire au rythme des mots, sans forcer.');
  assert.equal(description, 'Inspirer sur « Inspire », expirer sur « Expire ».');
  for (const t of [TEXTE_COHERENCE, description]) assert.doesNotMatch(t, /disque|grandi|rétréci|cercle|bouge/i, t);
  assert.ok(description.includes(`« ${motPhase('inspire')} »`) && description.includes(`« ${motPhase('expire')} »`), description);
});

test('exercices : une posture chacun, et « 3 min · assis ou allongé »', () => {
  for (const x of EXERCICES) assert.ok(typeof x.posture === 'string' && x.posture.length > 0 && !/\n/.test(x.posture), x.id);
  assert.equal(dureeEtPosture(exerciceDe('respiration-abdominale')), '3 min · assis ou allongé');
  assert.equal(dureeEtPosture(exerciceDe('scan-corporel')), '10 min · allongé ou assis');
  assert.equal(dureeEtPosture({ dureeMin: 2 }), '2 min');
});

test('étapes rythmées : seulement celles dont le texte donne un rythme (respiration carrée, 4 · 4 · 4 · 4 ; v10 : soupir, expiration longue), figées', () => {
  const rythmees = EXERCICES.flatMap((x) => x.etapes.filter((e) => e.souffle).map((e) => [x.id, e.texte, e.souffle]));
  assert.deepEqual(rythmees.map(([id, texte, s]) => [id, texte, s]), [
    ['respiration-carree', 'Recommence ces quatre temps, à ton rythme. Si retenir te gêne, compte jusqu\'à deux.', CARRE],
    ['respiration-carree', 'Inspire, quatre. Retiens, quatre. Expire, quatre. Retiens, quatre.', CARRE],
    ['soupir', 'Inspire, encore un peu, puis expire longuement. Sans forcer.', SOUPIR],
    ['expiration-longue', 'Inspire, quatre temps. Expire, six temps. Sans forcer.', LONGUE],
    ['panique', 'Trois soupirs : inspire, une petite inspiration en plus, une longue expiration.', SOUPIR],
    ['panique', 'Encore deux longues expirations : inspire, puis souffle lentement.', LONGUE],
    ['colere', 'Longues expirations : inspire, puis souffle lentement par la bouche.', LONGUE],
    ['trop-plein', 'Longues expirations : inspire, puis souffle lentement.', LONGUE],
    ['reveil-nuit', 'Inspire sur quatre temps. Expire sur six temps, sans forcer.', LONGUE],
  ]);
  for (const [, , s] of rythmees) {
    assert.ok(souffleValide(s));
    assert.ok(Object.isFrozen(s));
  }
  assert.deepEqual(exerciceDe('respiration-carree').etapes.map((e) => e.dureeS), [15, 10, 9, 9, 9, 9, 48, 48, 15]);
  // Les autres étapes n'ont pas de clé `souffle` (le lecteur n'y montre pas le disque).
  for (const x of EXERCICES) for (const e of x.etapes) if (!e.souffle) assert.ok(!('souffle' in e), e.texte);
});

test('une étape rythmée dure un nombre entier de cycles : elle finit poumons vides, et la suivante commence par « Inspire »', () => {
  for (const x of EXERCICES) {
    for (const e of x.etapes.filter((y) => y.souffle)) {
      assert.equal((e.dureeS * 1000) % cycleSouffleMs(e.souffle), 0, `${x.id} : ${e.texte} (${e.dureeS} s)`);
      // Juste avant la fin, la dernière phase est celle qui suit l'expiration (ou l'expiration, sans rétention) ; jamais
      // une inspiration, que l'étape suivante répéterait.
      const derniere = phaseSouffle(e.dureeS * 1000 - 1, e.souffle).phase;
      assert.ok(['retiens-vide', 'expire'].includes(derniere), `${x.id} : ${e.texte} finit sur ${derniere}`);
      assert.equal(phaseSouffle(e.dureeS * 1000, e.souffle).phase, 'inspire');
    }
  }
  // v10 : à 1, 3 et 5 min, l'étape qui s'allonge reste en cycles entiers, et finit de même.
  for (const id of ['soupir', 'expiration-longue']) {
    for (const minutes of DUREES_AU_CHOIX) {
      const { dureeS, souffle } = exerciceAvecDuree(exerciceDe(id), minutes).etapes.find((e) => e.repete);
      assert.equal((dureeS * 1000) % cycleSouffleMs(souffle), 0, `${id} à ${minutes} min : ${dureeS} s`);
      assert.equal(phaseSouffle(dureeS * 1000 - 1, souffle).phase, 'expire', `${id} à ${minutes} min`);
      assert.equal(phaseSouffle(dureeS * 1000, souffle).phase, 'inspire', `${id} à ${minutes} min`);
      assert.ok(dureeS > 0);
    }
  }
  // Trois soupirs, et deux longues expirations : les durées de Panique disent ce que dit le texte.
  const panique = exerciceDe('panique').etapes.filter((e) => e.souffle);
  assert.deepEqual(panique.map((e) => e.dureeS * 1000 / cycleSouffleMs(e.souffle)), [3, 2]);
  // Le défaut épinglé : 52 s de respiration carrée (3 cycles et 4 s) finissaient sur une inspiration.
  assert.equal(phaseSouffle(52000 - 1, CARRE).phase, 'inspire');
});
