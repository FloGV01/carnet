// v8 · Le Programme (spec §6, §12.2 et §12.4 ; annexe programme-sophro.md §3) : 8 étapes et 17 séances aux identifiants
// figés, la dernière séance faite (lancée depuis le Programme et menée au bout), la séance qui vient, « Faite le 12/10 »,
// et des textes sans compteur ni promesse. Données inventées.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ETAPES, SEANCES_PROGRAMME, PRESENTATION, DUREE_COHERENCE_MIN, estSeanceProgramme, seanceProgramme, derniereFaite, suivante,
  faitesLe, texteFaite,
} from '../../public/js/domain/programme.js';
import { EXERCICES, dureeExerciceS, exerciceDe } from '../../public/js/domain/exercices.js';
import { trouverInterdits, normaliser } from '../aides/mots-interdits.js';

const ORDRE = [
  'respiration-abdominale', 'pause-une-minute', 'les-sons', 'ancrage-54321', 'cinq-zones', 'respiration-carree', 'epaules',
  'mouvements-lents', 'tension-detente', 'point-corps', 'marche-lente', 'coherence', 'lieu-ressource', 'bon-moment-passe',
  'moment-a-venir', 'scan-corporel', 'ce-qui-compte',
];
// Une séance enregistrée (store `seances`), lancée depuis le Programme et menée au bout, sauf mention contraire.
const s = (programme, date, heure = '10:00', autres = {}) => ({
  id: `se_${programme}_${date}_${heure}`, date, heure, exercice: programme, origine: 'bien-etre', dureeS: 300, fin: true, programme, ...autres,
});

test('8 étapes, 17 séances dans l\'ordre de l\'annexe (Respiration abdominale à la place de « Premiers pas »), identifiants uniques et figés', () => {
  assert.equal(ETAPES.length, 8);
  assert.deepEqual(ETAPES.map((e) => e.id), ['respirer', 'autour-de-toi', 'cinq-zones', 'tendre-relacher', 'zone-par-zone', 'marcher-rythme', 'lieu-souvenir', 'corps-entier']);
  assert.deepEqual(ETAPES.map((e) => e.titre), [
    'Respirer', 'Autour de toi', 'Les cinq zones', 'Tendre et relâcher', 'Zone par zone', 'Marcher, respirer en rythme',
    'Un lieu, un souvenir', 'Le corps entier, ce qui compte',
  ]);
  assert.deepEqual(ETAPES.map((e) => e.seances.length), [2, 2, 2, 2, 2, 2, 3, 2]);
  assert.deepEqual([...SEANCES_PROGRAMME], ORDRE);
  assert.equal(new Set(SEANCES_PROGRAMME).size, 17);
  assert.equal(new Set(ETAPES.map((e) => e.id)).size, 8);
  assert.ok(Object.isFrozen(ETAPES) && Object.isFrozen(SEANCES_PROGRAMME));
  for (const e of ETAPES) assert.ok(Object.isFrozen(e) && Object.isFrozen(e.seances), e.id);
  // Tous les exercices sont dans le Programme (aucune séance hors du Programme, sauf la cohérence de l'onglet), une fois.
  assert.deepEqual(EXERCICES.map((x) => x.id).sort(), ORDRE.filter((id) => id !== 'coherence').sort());
  assert.ok(!SEANCES_PROGRAMME.includes('premiers-pas'));
  for (const id of SEANCES_PROGRAMME) assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/, 'identifiant accepté par la route');
  assert.equal(estSeanceProgramme('scan-corporel'), true);
  for (const x of ['premiers-pas', '', null, undefined, 3, 'Scan-corporel']) assert.equal(estSeanceProgramme(x), false, String(x));
});

test('seanceProgramme : l\'exercice, ou la cohérence cardiaque de 5 min au rythme réglé ; la durée des étapes proche de la durée annoncée', () => {
  for (const id of SEANCES_PROGRAMME) {
    const x = seanceProgramme(id);
    assert.ok(x && x.titre && x.posture && x.description && x.etapes.length, id);
    assert.equal(x.id, id);
    const ecart = Math.abs(dureeExerciceS(x) - x.dureeMin * 60);
    assert.ok(ecart <= Math.max(10, x.dureeMin * 6), `${id} : ${dureeExerciceS(x)} s pour ${x.dureeMin} min`);
    // Les séances durent de 1 à 10 min.
    assert.ok(x.dureeMin >= 1 && x.dureeMin <= 10, id);
    if (id !== 'coherence') assert.equal(x, exerciceDe(id));
  }
  assert.equal(DUREE_COHERENCE_MIN, 5);
  const c = seanceProgramme('coherence', { duree: 10, rythme: '4-6', son: true });
  assert.equal(c.dureeMin, 5);
  assert.equal(dureeExerciceS(c), 300);
  assert.deepEqual(c.etapes[0].souffle, { inspi: 4, retiens1: 0, expi: 6, retiens2: 0 });
  assert.equal(seanceProgramme('coherence').etapes[0].souffle.inspi, 5, 'sans réglage, 5-5');
  assert.equal(seanceProgramme('coherence', 'n\'importe quoi').dureeMin, 5);
  assert.equal(seanceProgramme('premiers-pas'), null);
  assert.equal(seanceProgramme(undefined), null);
});

test('derniereFaite : la plus récente des séances lancées depuis le Programme et menées au bout ; son jour (bascule à 4 h)', () => {
  assert.equal(derniereFaite([]), null);
  assert.equal(derniereFaite(undefined), null);
  assert.deepEqual(derniereFaite([s('les-sons', '2026-10-12'), s('epaules', '2026-10-14'), s('cinq-zones', '2026-10-13')]), { idSeance: 'epaules', date: '2026-10-14' });
  // Le même jour, l'heure départage.
  assert.deepEqual(derniereFaite([s('epaules', '2026-10-14', '21:00'), s('les-sons', '2026-10-14', '09:00')]), { idSeance: 'epaules', date: '2026-10-14' });
  // À 1 h 30 le 15, c'est encore le 14 ; et c'est la plus récente.
  assert.deepEqual(derniereFaite([s('epaules', '2026-10-14', '21:00'), s('les-sons', '2026-10-15', '01:30')]), { idSeance: 'les-sons', date: '2026-10-14' });
  // Ignorées : sans `fin` (arrêtée en route, ou une séance de la v7), sans `programme` (lancée ailleurs), un programme
  // inconnu, un `fin` qui n'est pas `true`.
  const ignorees = [
    s('scan-corporel', '2026-10-20', '10:00', { fin: undefined }),
    s('coherence', '2026-10-20', '11:00', { programme: undefined, origine: 'moment-difficile' }),
    s('coherence', '2026-10-20', '12:00', { programme: null }),
    s('premiers-pas', '2026-10-20', '13:00'),
    s('epaules', '2026-10-20', '14:00', { fin: 'oui' }),
    { date: '2026-10-20', heure: '15:00', exercice: 'scan-corporel', origine: 'bien-etre', dureeS: 600 },
    null,
  ];
  assert.equal(derniereFaite(ignorees), null);
  assert.deepEqual(derniereFaite([...ignorees, s('ancrage-54321', '2026-10-01')]), { idSeance: 'ancrage-54321', date: '2026-10-01' });
});

test('suivante : la première au début ; celle qui suit la dernière faite, jamais une séance sautée ; après la dernière, la première', () => {
  assert.equal(suivante([]), 'respiration-abdominale');
  assert.equal(suivante(undefined), 'respiration-abdominale');
  assert.equal(suivante([s('respiration-abdominale', '2026-10-12')]), 'pause-une-minute');
  // En milieu : l'étape « Tendre et relâcher » faite sans les précédentes : la suite, pas la première sautée.
  assert.equal(suivante([s('respiration-abdominale', '2026-10-01'), s('epaules', '2026-10-12')]), 'mouvements-lents');
  // D'une étape à la suivante, et dans l'étape à trois séances.
  assert.equal(suivante([s('ancrage-54321', '2026-10-12')]), 'cinq-zones');
  assert.equal(suivante([s('bon-moment-passe', '2026-10-12')]), 'moment-a-venir');
  assert.equal(suivante([s('moment-a-venir', '2026-10-12')]), 'scan-corporel');
  assert.equal(suivante([s('marche-lente', '2026-10-12')]), 'coherence');
  assert.equal(suivante([s('coherence', '2026-10-12')]), 'lieu-ressource');
  // C'est la plus récente qui compte, même plus tôt dans l'ordre : refaire une séance d'avant y ramène.
  assert.equal(suivante([s('scan-corporel', '2026-10-10'), s('les-sons', '2026-10-12')]), 'ancrage-54321');
  // Après la dernière, de nouveau la première.
  assert.equal(suivante([s('ce-qui-compte', '2026-10-12')]), 'respiration-abdominale');
  // Les séances sans `fin` ou hors du Programme ne comptent pas.
  assert.equal(suivante([s('epaules', '2026-10-12'), s('tension-detente', '2026-10-13', '10:00', { fin: undefined })]), 'mouvements-lents');
  assert.equal(suivante([s('epaules', '2026-10-12'), s('coherence', '2026-10-13', '10:00', { programme: undefined })]), 'mouvements-lents');
  assert.equal(suivante([s('tension-detente', '2026-10-13', '10:00', { fin: undefined })]), 'respiration-abdominale');
});

test('faitesLe : le jour le plus récent de chaque séance faite ; une séance jamais faite n\'y est pas', () => {
  assert.deepEqual(faitesLe([]), {});
  assert.deepEqual(faitesLe(undefined), {});
  const l = [
    s('les-sons', '2026-10-12'), s('les-sons', '2026-10-14', '08:00'), s('les-sons', '2026-10-13'),
    s('epaules', '2026-10-15', '02:00'),
    s('scan-corporel', '2026-10-15', '10:00', { fin: undefined }),
    s('coherence', '2026-10-15', '10:00', { programme: undefined }),
  ];
  assert.deepEqual(faitesLe(l), { 'les-sons': '2026-10-14', epaules: '2026-10-14' });
});

test('texteFaite : « Faite le 12/10 », l\'année seulement si ce n\'est pas celle du jour', () => {
  assert.equal(texteFaite('2026-10-12', '2026-10-25'), 'Faite le 12/10');
  assert.equal(texteFaite('2026-03-05', '2026-10-25'), 'Faite le 05/03');
  assert.equal(texteFaite('2025-12-30', '2026-01-02'), 'Faite le 30/12/2025');
  assert.equal(texteFaite('2026-10-12'), 'Faite le 12/10');
});

// Ni compteur, ni repère de progression, ni promesse, ni avis clinique (spec §2 et §6) ; aucun nom déposé.
test('textes du Programme : aucun mot interdit, aucun nombre, aucune promesse ni nom déposé', () => {
  const textes = [...ETAPES.map((e) => e.titre), ...PRESENTATION, texteFaite('2026-10-12', '2026-10-25')];
  for (const t of textes) {
    assert.deepEqual(trouverInterdits(t), [], t);
    const n = normaliser(t);
    assert.doesNotMatch(n, /\bsemaine \d|\betape \d|\d+ ?(sur|\/) ?\d+ (seances|etapes)|%|termine|fini|progress|retard|depuis|il y a|total/, t);
    assert.doesNotMatch(n, /caycedo|sophronis|\brdc\b|methode|soign|guer|efficace|stress|mieux|bienfait|apais|therap|traitement/, t);
  }
  // Aucun chiffre, et aucun total du Programme en toutes lettres (« huit étapes », « dix-sept séances »).
  for (const t of [...ETAPES.map((e) => e.titre), ...PRESENTATION]) assert.doesNotMatch(t, /\d|\b(huit|dix-sept) (séances|étapes)\b/i, t);
  assert.match(PRESENTATION[0], /^Inspiré de la sophrologie et de la pleine conscience/);
  // Le rythme est écrit une fois, et seulement comme une façon de faire.
  assert.equal(PRESENTATION.filter((t) => /par semaine/.test(t)).length, 1);
  assert.match(PRESENTATION[1], /une étape par semaine, une ou deux séances, si tu veux/);
});
