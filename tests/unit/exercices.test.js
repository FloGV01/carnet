// Bien-être (v7, spec §6.2 et §6.3) : les 8 exercices (identifiants figés, durées de la spec, textes selon les règles
// d'écriture, repris dans docs/decisions.md pour être relus) et la règle qui crée une séance. v8 (spec §6 et §12.4) : les
// 8 séances nouvelles du Programme, à la fin, avec les blocs « Arriver » et « Revenir » et les précautions de l'annexe.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { EXERCICES, BLOCS, exerciceDe, dureeExerciceS, exerciceMeneAuBout, PART_MENEE_AU_BOUT } from '../../public/js/domain/exercices.js';
import { doitEnregistrer, nouvelleSeance, dureeSeance, SEANCE_MIN_S } from '../../public/js/domain/seances.js';
import { normaliser } from '../../public/js/domain/champs.js';
import { seanceCoherence } from '../../public/js/domain/respiration.js';
import { seanceProgramme } from '../../public/js/domain/programme.js';
import { trouverInterdits, normaliser as sansAccents } from '../aides/mots-interdits.js';
import { RACINE, lire } from '../aides/fichiers.js';

// Les durées de la spec §6.2, dans l'ordre de la liste ; puis les séances nouvelles du Programme (v8, annexe
// programme-sophro.md §5), arrondies à la minute.
const DUREES = {
  'respiration-abdominale': 3, 'respiration-carree': 3, epaules: 5, 'tension-detente': 8,
  'scan-corporel': 10, 'lieu-ressource': 8, 'ancrage-54321': 3, 'pause-une-minute': 1,
  'les-sons': 5, 'cinq-zones': 6, 'mouvements-lents': 4, 'point-corps': 3, 'marche-lente': 5, 'bon-moment-passe': 6,
  'moment-a-venir': 6, 'ce-qui-compte': 6,
};
const NOUVELLES = Object.keys(DUREES).slice(8);
const textes = (x) => [x.titre, x.description, ...x.etapes.map((e) => e.texte)];

test('16 exercices (8 de la v7, puis 8 du Programme), leurs identifiants dans l\'ordre de la spec, figés', () => {
  assert.equal(EXERCICES.length, 16);
  assert.deepEqual(EXERCICES.map((x) => x.id), Object.keys(DUREES));
  assert.ok(Object.isFrozen(EXERCICES));
  for (const x of EXERCICES) {
    assert.ok(Object.isFrozen(x) && Object.isFrozen(x.etapes), x.id);
    assert.equal(exerciceDe(x.id), x);
    assert.match(x.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, 'identifiant ASCII minuscule, accepté par la route');
  }
  assert.equal(exerciceDe('inconnu'), null);
  assert.equal(exerciceDe(undefined), null);
});

test('durées de la spec, et la somme des étapes proche de la durée annoncée', () => {
  for (const x of EXERCICES) {
    assert.equal(x.dureeMin, DUREES[x.id], x.id);
    assert.ok(x.etapes.length >= 5, `${x.id} : au moins 5 étapes`);
    // Chaque étape a sa durée (voix allumée, elle avance seule à la fin) : un nombre entier de secondes, de 5 à 2 min.
    for (const e of x.etapes) assert.ok(Number.isInteger(e.dureeS) && e.dureeS >= 5 && e.dureeS <= 120, `${x.id} : ${e.texte}`);
    const ecart = Math.abs(dureeExerciceS(x) - x.dureeMin * 60);
    assert.ok(ecart <= Math.max(10, x.dureeMin * 6), `${x.id} : ${dureeExerciceS(x)} s pour ${x.dureeMin} min`);
  }
  assert.equal(dureeExerciceS(null), 0);
  assert.equal(dureeExerciceS({ etapes: [{ texte: 'a', dureeS: 10 }, { texte: 'b', dureeS: null }] }), 10);
});

test('textes : titre et description sur une ligne, aucun mot interdit, tutoiement, phrases courtes', () => {
  for (const x of EXERCICES) {
    assert.ok(x.titre && !/\n/.test(x.titre), x.id);
    assert.ok(x.description && !/\n/.test(x.description) && x.description.length <= 80, `${x.id} : une ligne de description`);
    for (const t of textes(x)) {
      assert.deepEqual(trouverInterdits(t), [], t);
      assert.doesNotMatch(sansAccents(t), /\bvous\b|\bvotre\b|\bvos\b/, `tutoiement : ${t}`);
      assert.match(t.trim(), /^[A-ZÉÈÀÇ0-9]/, `majuscule : ${t}`);
      assert.doesNotMatch(t, /\s{2,}|^\s|\s$/, `espaces : ${t}`);
      // Une phrase courte : 16 mots au plus.
      for (const phrase of t.split(/[.:!?]\s+/)) assert.ok(phrase.split(/\s+/).length <= 16, `phrase longue : ${phrase}`);
    }
    for (const e of x.etapes) assert.match(e.texte, /[.?]$/, `une consigne finit par un point : ${e.texte}`);
  }
  // Les titres ne se répètent pas.
  assert.equal(new Set(EXERCICES.map((x) => x.titre)).size, 16);
});

// Ni promesse d'effet, ni conseil de santé, ni émotion à atteindre (spec §6.2) ; jamais « positive » ou « négative ».
const PROMESSES = [
  /\bt'aide/, /\baide a\b/, /\bpour (te )?(calmer|detendre|apaiser|relaxer)/, /\bte (calmer|calmera|detendra|apaisera)/, /apais/, /soulag/,
  /\bstress/, /anxi/, /angoiss/, /bienfait/, /efficace/, /\bmieux\b/, /guer/, /therap/, /\bsante\b/, /medic/, /sommeil/, /\bsoigne/,
  /tu (vas|te sentiras|seras)/, /tu te sens (bien|calme|detendu)/, /\bpositi/, /\bnegati/, /\bdois\b/, /recommand/, /conseil/,
];
test('textes : aucune promesse d\'effet ni conseil de santé', () => {
  for (const x of EXERCICES) {
    for (const t of textes(x)) {
      const n = sansAccents(t);
      assert.deepEqual(PROMESSES.filter((re) => re.test(n)).map(String), [], t);
    }
  }
});

// Les précautions de l'annexe (§1.6), reprises par la spec §6 : chaque séance nouvelle rappelle qu'on peut s'arrêter ;
// aucune n'impose de retenir son souffle ni n'a de rythme écrit (ni disque ni souffle) ; rien sur le cœur ; les yeux
// ouverts sont permis ; les souvenirs ont une sortie écrite. Aucun nom déposé.
test('v8 · séances nouvelles : les précautions de l\'annexe', () => {
  const arreter = 'Tu peux t\'arrêter à tout moment.';
  for (const id of NOUVELLES) {
    const x = exerciceDe(id);
    const tout = x.etapes.map((e) => e.texte).join(' ');
    assert.ok(tout.includes(arreter), `${id} : « ${arreter} »`);
    assert.ok(x.etapes.every((e) => !e.souffle), `${id} : aucun rythme écrit`);
    const n = sansAccents(tout);
    assert.doesNotMatch(n, /\bretien|\bretenir|\bbloque/, `${id} : aucune rétention`);
    assert.doesNotMatch(n, /\bc(oe|œ)ur\b|battement|pouls/, `${id} : rien sur le cœur`);
    assert.doesNotMatch(sansAccents(textes(x).join(' ')), /caycedo|sophronis|\brdc\b/, `${id} : aucun nom déposé`);
    assert.ok(x.posture && x.description, id);
  }
  // Les yeux ouverts sont permis : dans le bloc « Arriver », ou dans la séance.
  for (const id of NOUVELLES) {
    const n = sansAccents(exerciceDe(id).etapes.map((e) => e.texte).join(' '));
    assert.ok(/yeux ouverts|garde les yeux|debout|marche/.test(n), `${id} : les yeux ouverts permis`);
  }
  // Les souvenirs (un moment passé) ont une sortie écrite.
  assert.ok(exerciceDe('bon-moment-passe').etapes.some((e) => /ouvre les yeux.*arrêter/.test(e.texte)));
});

test('v8 · les blocs « Arriver » (60 s) et « Revenir » (55 s) ouvrent et ferment cinq séances nouvelles, tels quels', () => {
  const duree = (l) => l.reduce((n, e) => n + e.dureeS, 0);
  assert.equal(duree(BLOCS.arriver), 60);
  assert.equal(duree(BLOCS.revenir), 55);
  assert.ok(Object.isFrozen(BLOCS) && Object.isFrozen(BLOCS.arriver) && Object.isFrozen(BLOCS.revenir));
  const avecBlocs = NOUVELLES.filter((id) => exerciceDe(id).etapes[0] === BLOCS.arriver[0]);
  assert.deepEqual(avecBlocs, ['les-sons', 'cinq-zones', 'bon-moment-passe', 'moment-a-venir', 'ce-qui-compte']);
  for (const id of avecBlocs) {
    const { etapes } = exerciceDe(id);
    assert.deepEqual(etapes.slice(0, 4), [...BLOCS.arriver], id);
    assert.deepEqual(etapes.slice(-4), [...BLOCS.revenir], id);
  }
  // Les huit exercices de la v7 n'ont pas changé de texte (spec §6) : ils ne prennent aucun bloc.
  for (const x of EXERCICES.slice(0, 8)) assert.ok(!x.etapes.some((e) => BLOCS.arriver.includes(e) || BLOCS.revenir.includes(e)), x.id);
});

test('les titres et les étapes sont repris dans docs/decisions.md, pour être relus par l\'utilisateur, avec leurs durées', () => {
  const doc = lire(join(RACINE, 'docs', 'decisions.md'));
  for (const x of EXERCICES) for (const t of textes(x)) assert.ok(doc.includes(t), `absent de decisions.md : ${t}`);
  for (const x of EXERCICES) {
    x.etapes.forEach((e, i) => assert.ok(doc.includes(`${i + 1}. ${e.texte} *(${e.dureeS} s)*`), `durée à jour dans decisions.md : ${e.texte}`));
  }
});

// Voix allumée, l'étape suivante est lue à la fin de la durée de l'étape. Une consigne se dit à environ 3 mots par seconde
// (voix française du système : « Inspire par le nez en comptant jusqu'à quatre. » prend de 2 à 2,5 s) : chaque étape
// laisse au moins 3 s après sa lecture, et une étape qui fait compter jusqu'à quatre en laisse au moins 5 (4 s pour
// compter, sans que la consigne suivante coupe le compte).
test('voix allumée : chaque étape laisse le temps de faire ce qu\'elle dit après sa lecture', () => {
  const lecture = (t) => t.split(/\s+/).length / 3;
  for (const x of EXERCICES) {
    for (const e of x.etapes) {
      const reste = e.dureeS - lecture(e.texte);
      assert.ok(reste >= 3, `${x.id} : ${e.texte} (${e.dureeS} s)`);
      if (/compt\w* jusqu'à quatre/.test(e.texte)) assert.ok(reste >= 5, `le temps de compter : ${e.texte} (${e.dureeS} s)`);
    }
  }
  const carree = exerciceDe('respiration-carree').etapes.filter((e) => /en comptant jusqu'à quatre/.test(e.texte));
  assert.equal(carree.length, 4);
  for (const e of carree) assert.ok(e.dureeS >= 8, e.texte);
});

test('exerciceMeneAuBout : la dernière étape atteinte après la moitié de la durée au moins, en temps actif', () => {
  assert.equal(PART_MENEE_AU_BOUT, 0.5);
  const pause = exerciceDe('pause-une-minute');
  const scan = exerciceDe('scan-corporel');
  assert.equal(dureeExerciceS(pause), 60);
  assert.equal(exerciceMeneAuBout(pause, { derniereAtteinte: true, dureeS: 30 }), true);
  assert.equal(exerciceMeneAuBout(pause, { derniereAtteinte: true, dureeS: 45 }), true);
  // Les textes parcourus d'un bout à l'autre sans prendre le temps : pas mené au bout.
  assert.equal(exerciceMeneAuBout(pause, { derniereAtteinte: true, dureeS: 0 }), false);
  assert.equal(exerciceMeneAuBout(pause, { derniereAtteinte: true, dureeS: 29.9 }), false);
  // Assez de temps, mais arrêté avant la dernière étape : pas mené au bout (la règle des 60 s joue seule).
  assert.equal(exerciceMeneAuBout(pause, { derniereAtteinte: false, dureeS: 60 }), false);
  assert.equal(exerciceMeneAuBout(scan, { derniereAtteinte: true, dureeS: dureeExerciceS(scan) / 2 }), true);
  assert.equal(exerciceMeneAuBout(scan, { derniereAtteinte: true, dureeS: 120 }), false);
  for (const brut of [{}, undefined, { derniereAtteinte: true }, { derniereAtteinte: true, dureeS: NaN }, { derniereAtteinte: 'oui', dureeS: 60 }]) {
    assert.equal(exerciceMeneAuBout(pause, brut), false, JSON.stringify(brut));
  }
  assert.equal(exerciceMeneAuBout(null, { derniereAtteinte: true, dureeS: 600 }), false);
  // Ce qui fait la séance : mené au bout, ou 60 s au moins.
  const seance = (ex, derniereAtteinte, dureeS) => doitEnregistrer({ dureeS, terminee: exerciceMeneAuBout(ex, { derniereAtteinte, dureeS }) });
  assert.deepEqual([seance(pause, true, 5), seance(pause, true, 35), seance(pause, false, 35), seance(scan, true, 50), seance(scan, false, 61)],
    [false, true, false, false, true]);
});

test('exerciceMeneAuBout : une séance d\'une seule étape (la cohérence cardiaque) n\'est menée au bout qu\'au bout de tout son temps', () => {
  // Sur sa dernière étape dès le début : « Terminer » après la moitié du temps est un arrêt en route, qui ne date rien
  // dans le Programme (spec §6 et §12.2), comme dans Moment difficile.
  const programme = seanceProgramme('coherence', { duree: 2, rythme: '4-6' });
  assert.equal(programme.etapes.length, 1);
  assert.equal(dureeExerciceS(programme), 300);
  for (const dureeS of [0, 150, 151, 299.9]) {
    assert.equal(exerciceMeneAuBout(programme, { derniereAtteinte: true, dureeS }), false, `${dureeS} s sur 300`);
  }
  assert.equal(exerciceMeneAuBout(programme, { derniereAtteinte: true, dureeS: 300 }), true);
  assert.equal(exerciceMeneAuBout(programme, { derniereAtteinte: true, dureeS: 300.2 }), true);
  assert.equal(exerciceMeneAuBout(programme, { derniereAtteinte: false, dureeS: 300 }), false);
  // La carte de Bien-être, de 2 min : « Terminer » à 61 s, gardée (60 s au moins) mais pas menée au bout ; à 59 s, rien.
  const carte = seanceCoherence({ duree: 2, rythme: '5-5' });
  assert.equal(dureeExerciceS(carte), 120);
  assert.equal(exerciceMeneAuBout(carte, { derniereAtteinte: true, dureeS: 61 }), false);
  assert.equal(doitEnregistrer({ dureeS: 59, terminee: exerciceMeneAuBout(carte, { derniereAtteinte: true, dureeS: 59 }) }), false);
  assert.equal(exerciceMeneAuBout(carte, { derniereAtteinte: true, dureeS: 120 }), true);
  // Arrêtée à 151 s, elle reste une séance (règle des 60 s), sans `fin`.
  assert.equal(doitEnregistrer({ dureeS: 151, terminee: exerciceMeneAuBout(programme, { derniereAtteinte: true, dureeS: 151 }) }), true);
  // Les séances de plusieurs étapes gardent la règle de la moitié (annexe programme-sophro.md, §6.8).
  for (const ex of EXERCICES) assert.ok(ex.etapes.length > 1, ex.id);
  const abdo = exerciceDe('respiration-abdominale');
  assert.equal(exerciceMeneAuBout(abdo, { derniereAtteinte: true, dureeS: dureeExerciceS(abdo) / 2 }), true);
});

test('doitEnregistrer : une séance menée au bout, ou arrêtée après 60 s au moins', () => {
  assert.equal(SEANCE_MIN_S, 60);
  assert.equal(doitEnregistrer({ dureeS: 5, terminee: true }), true, 'menée au bout, même vite');
  assert.equal(doitEnregistrer({ dureeS: 0, terminee: true }), true);
  assert.equal(doitEnregistrer({ dureeS: 60, terminee: false }), true);
  assert.equal(doitEnregistrer({ dureeS: 60.4 }), true);
  assert.equal(doitEnregistrer({ dureeS: 59.9, terminee: false }), false);
  assert.equal(doitEnregistrer({ dureeS: 30 }), false);
  for (const brut of [{}, undefined, { dureeS: NaN }, { dureeS: Infinity }, { dureeS: '120' }, { terminee: 'oui', dureeS: 10 }]) {
    assert.equal(doitEnregistrer(brut), false, JSON.stringify(brut));
  }
});

test('nouvelleSeance : la date et l\'heure du début, l\'exercice, l\'origine, la durée en secondes entières ; valide pour le store', () => {
  const s = nouvelleSeance({ exercice: 'scan-corporel', origine: 'bien-etre', debut: new Date(2026, 9, 21, 1, 30, 40), dureeS: 612.6 });
  assert.deepEqual(s, { date: '2026-10-21', heure: '01:30', exercice: 'scan-corporel', origine: 'bien-etre', dureeS: 613 });
  assert.deepEqual(normaliser('seances', { ...s, id: 'se_x' }, { origine: 'app' }).erreurs, []);
  for (const origine of ['bien-etre', 'moment-difficile', 'ressourcer']) {
    const c = nouvelleSeance({ exercice: 'coherence', origine, debut: new Date(2026, 9, 21, 20, 0), dureeS: 300 });
    assert.deepEqual(normaliser('seances', { ...c, id: 'se_y' }, { origine: 'app' }).erreurs, [], origine);
  }
  assert.deepEqual([dureeSeance(-3), dureeSeance(59.5), dureeSeance(1e9), dureeSeance(undefined)], [0, 60, 86400, 0]);
});
