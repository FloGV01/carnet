// Bien-être (v7, spec §6.2 et §6.3) : les 8 exercices (identifiants figés, durées de la spec, textes selon les règles
// d'écriture, repris dans docs/decisions.md pour être relus) et la règle qui crée une séance.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { EXERCICES, exerciceDe, dureeExerciceS, pourAffichage } from '../../public/js/domain/exercices.js';
import { doitEnregistrer, nouvelleSeance, dureeSeance, SEANCE_MIN_S } from '../../public/js/domain/seances.js';
import { normaliser } from '../../public/js/domain/champs.js';
import { trouverInterdits, normaliser as sansAccents } from '../aides/mots-interdits.js';
import { RACINE, lire } from '../aides/fichiers.js';

// Les durées de la spec §6.2, dans l'ordre de la liste.
const DUREES = {
  'respiration-abdominale': 3, 'respiration-carree': 3, epaules: 5, 'tension-detente': 8,
  'scan-corporel': 10, 'lieu-ressource': 8, 'ancrage-54321': 3, 'pause-une-minute': 1,
};
const textes = (x) => [x.titre, x.description, ...x.etapes.map((e) => e.texte)];

test('8 exercices, leurs identifiants dans l\'ordre de la spec, figés', () => {
  assert.equal(EXERCICES.length, 8);
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
  assert.equal(new Set(EXERCICES.map((x) => x.titre)).size, 8);
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

test('les titres et les étapes sont repris dans docs/decisions.md, pour être relus par l\'utilisateur', () => {
  const doc = lire(join(RACINE, 'docs', 'decisions.md'));
  for (const x of EXERCICES) for (const t of textes(x)) assert.ok(doc.includes(t), `absent de decisions.md : ${t}`);
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

test('pourAffichage : une espace insécable avant la ponctuation haute et dans les guillemets, le reste intact', () => {
  assert.equal(pourAffichage('Va vers tes pieds : les orteils.'), 'Va vers tes pieds\u00a0: les orteils.');
  assert.equal(pourAffichage('avec « Suivant » ; ou ? et !'), 'avec «\u00a0Suivant\u00a0»\u00a0; ou\u00a0? et\u00a0!');
  assert.equal(pourAffichage('Sens tes pieds sur le sol.'), 'Sens tes pieds sur le sol.');
});
