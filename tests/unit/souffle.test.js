// v8 · Le souffle du lecteur de Bien-être (spec §5 et §12.3) : quatre temps par étape rythmée, la phase d'un instant, les
// phases à programmer sur l'horloge audio, la cohérence cardiaque en séance du lecteur, et les étapes rythmées des
// exercices (seulement celles dont le texte donne un rythme, aux temps du texte).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TEMPS_SOUFFLE, TEMPS_MAX_S, souffleValide, cycleSouffleMs, phaseSouffle, phasesEntre, motPhase, souffleDeRythme, seanceCoherence,
  TEXTE_COHERENCE, NOM_RESPIRATION, DUREES, RYTHMES,
} from '../../public/js/domain/respiration.js';
import { EXERCICES, exerciceDe, dureeExerciceS, dureeEtPosture } from '../../public/js/domain/exercices.js';
import { trouverInterdits } from '../aides/mots-interdits.js';

const CARRE = { inspi: 4, retiens1: 4, expi: 4, retiens2: 4 };
const phases = (s, instants) => instants.map((t) => phaseSouffle(t, s).phase);

test('quatre temps entiers, de 0 à 12 s ; une inspiration et une expiration d\'au moins 1 s', () => {
  assert.deepEqual(TEMPS_SOUFFLE, ['inspi', 'retiens1', 'expi', 'retiens2']);
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

test('étapes rythmées : seulement celles dont le texte donne un rythme (respiration carrée, 4 · 4 · 4 · 4), figées', () => {
  const rythmees = EXERCICES.flatMap((x) => x.etapes.filter((e) => e.souffle).map((e) => [x.id, e.texte, e.souffle]));
  assert.deepEqual(rythmees.map(([id, texte]) => [id, texte]), [
    ['respiration-carree', 'Recommence ces quatre temps, à ton rythme. Si retenir te gêne, compte jusqu\'à deux.'],
    ['respiration-carree', 'Inspire, quatre. Retiens, quatre. Expire, quatre. Retiens, quatre.'],
  ]);
  for (const [, , s] of rythmees) {
    assert.deepEqual(s, CARRE);
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
  // Le défaut épinglé : 52 s de respiration carrée (3 cycles et 4 s) finissaient sur une inspiration.
  assert.equal(phaseSouffle(52000 - 1, CARRE).phase, 'inspire');
});
