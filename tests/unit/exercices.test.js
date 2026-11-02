// Bien-être (v7, spec §6.2 et §6.3) : les 8 exercices (identifiants figés, durées de la spec, textes selon les règles
// d'écriture, repris dans docs/decisions.md pour être relus) et la règle qui crée une séance. v8 (spec §6 et §12.4) : les
// 8 séances nouvelles du Programme, à la fin, avec les blocs « Arriver » et « Revenir » et les précautions de l'annexe.
// v10 (spec §5.2, §6 et §14) : les 10 exercices nouveaux, à la fin, et la durée au choix.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import {
  EXERCICES, BLOCS, DUREES_AU_CHOIX, aDureeAuChoix, exerciceAvecDuree, exerciceDe, dureeEtPosture, dureeExerciceS, exerciceMeneAuBout,
  PART_MENEE_AU_BOUT,
} from '../../public/js/domain/exercices.js';
import { doitEnregistrer, nouvelleSeance, dureeSeance, SEANCE_MIN_S } from '../../public/js/domain/seances.js';
import { normaliser } from '../../public/js/domain/champs.js';
import { cycleSouffleMs, seanceCoherence } from '../../public/js/domain/respiration.js';
import { seanceProgramme } from '../../public/js/domain/programme.js';
import { trouverInterdits, normaliser as sansAccents } from '../aides/mots-interdits.js';
import { RACINE, lire } from '../aides/fichiers.js';

// Les durées de la spec §6.2, dans l'ordre de la liste ; puis les séances nouvelles du Programme (v8, annexe
// programme-sophro.md §5), arrondies à la minute ; puis les exercices de la v10 (spec §6 et §5.2 ; 3 min de départ pour
// les trois à durée au choix).
const DUREES = {
  'respiration-abdominale': 3, 'respiration-carree': 3, epaules: 5, 'tension-detente': 8,
  'scan-corporel': 10, 'lieu-ressource': 8, 'ancrage-54321': 3, 'pause-une-minute': 1,
  'les-sons': 5, 'cinq-zones': 6, 'mouvements-lents': 4, 'point-corps': 3, 'marche-lente': 5, 'bon-moment-passe': 6,
  'moment-a-venir': 6, 'ce-qui-compte': 6,
  soupir: 3, 'expiration-longue': 3, noting: 3, 'ancrage-court': 2, 'scan-court': 3, savourer: 2,
  panique: 2, colere: 2, 'trop-plein': 2, 'reveil-nuit': 3,
};
const NOUVELLES = Object.keys(DUREES).slice(8, 16);
const V10 = Object.keys(DUREES).slice(16);
const AU_CHOIX = ['soupir', 'expiration-longue', 'noting'];
const DE_CRISE = ['panique', 'colere', 'trop-plein', 'reveil-nuit'];
const textes = (x) => [x.titre, x.description, ...x.etapes.map((e) => e.texte)];

test('26 exercices (8 de la v7, 8 du Programme, puis 10 de la v10), leurs identifiants dans l\'ordre de la spec, figés', () => {
  assert.equal(EXERCICES.length, 26);
  assert.deepEqual(EXERCICES.map((x) => x.id), Object.keys(DUREES));
  // Les 16 identifiants d'avant ne bougent pas ; les nouveaux viennent après, dans l'ordre du plan.
  assert.deepEqual(EXERCICES.slice(0, 16).map((x) => x.id), [
    'respiration-abdominale', 'respiration-carree', 'epaules', 'tension-detente', 'scan-corporel', 'lieu-ressource', 'ancrage-54321',
    'pause-une-minute', 'les-sons', 'cinq-zones', 'mouvements-lents', 'point-corps', 'marche-lente', 'bon-moment-passe', 'moment-a-venir',
    'ce-qui-compte',
  ]);
  assert.deepEqual(EXERCICES.slice(16).map((x) => x.id), [
    'soupir', 'expiration-longue', 'noting', 'ancrage-court', 'scan-court', 'savourer', 'panique', 'colere', 'trop-plein', 'reveil-nuit',
  ]);
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
    // Chaque étape a sa durée (voix allumée, elle avance seule à la fin) : un nombre entier de secondes, de 5 à 2 min (v10 :
    // l'étape qui se répète va au-delà, pour faire les 3 min de départ).
    for (const e of x.etapes) assert.ok(Number.isInteger(e.dureeS) && e.dureeS >= 5 && (e.repete || e.dureeS <= 120), `${x.id} : ${e.texte}`);
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
  assert.equal(new Set(EXERCICES.map((x) => x.titre)).size, 26);
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

test('v10 · les titres de la spec, et les exercices nouveaux sans rétention, sans cœur, sans nom déposé', () => {
  assert.deepEqual(V10.map((id) => exerciceDe(id).titre), [
    'Le soupir', 'Expiration longue', 'Noter ce qui passe', 'Ancrage court', 'Scan court', 'Savourer', 'Panique', 'Colère', 'Trop-plein', 'Réveil la nuit',
  ]);
  for (const id of V10) {
    const x = exerciceDe(id);
    assert.ok(x.posture && x.description, id);
    const n = sansAccents(textes(x).join(' '));
    assert.doesNotMatch(n, /\bretien|\bretenir|\bbloque/, `${id} : aucune rétention écrite`);
    assert.doesNotMatch(n, /\bc(oe|œ)ur\b|battement|pouls/, `${id} : rien sur le cœur`);
    assert.doesNotMatch(n, /headspace|how we feel|petit bambou/, `${id} : aucun nom repris`);
    for (const e of x.etapes.filter((y) => y.souffle)) {
      assert.deepEqual([e.souffle.retiens1, e.souffle.retiens2], [0, 0], `${id} : aucune rétention dans le rythme`);
      assert.equal(typeof e.souffle.inspi2, 'number', `${id} : les souffles de la v10 écrivent leur seconde inspiration`);
    }
  }
});

test('v10 · les quatre de Moment difficile : de 1 à 3 min, sans durée au choix, les yeux ouverts, bouger et passer une étape permis', () => {
  for (const id of DE_CRISE) {
    const x = exerciceDe(id);
    const total = dureeExerciceS(x);
    assert.ok(total >= 60 && total <= 180, `${id} : ${total} s`);
    assert.ok(x.etapes.every((e) => !e.repete), `${id} : rien ne se répète`);
    assert.equal(aDureeAuChoix(x), false, id);
    const tout = sansAccents(x.etapes.map((e) => e.texte).join(' '));
    assert.doesNotMatch(tout, /ferme.{0,10}yeux|yeux ferm/, `${id} : les yeux ouverts`);
    assert.match(tout, /passer une etape/, `${id} : le droit de passer une étape`);
    assert.match(tout, /\bbouge|marcher/, `${id} : le droit de bouger`);
  }
  // Seul « Réveil la nuit » est sur écran noir ; le champ n'existe pas ailleurs.
  assert.deepEqual(EXERCICES.filter((x) => 'nuit' in x).map((x) => x.id), ['reveil-nuit']);
  assert.equal(exerciceDe('reveil-nuit').nuit, true);
  // Le principe de chacun, dans l'ordre de la spec §5.2 : le rythme de chaque étape rythmée.
  const rythmes = (id) => exerciceDe(id).etapes.filter((e) => e.souffle).map((e) => cycleSouffleMs(e.souffle) / 1000);
  assert.deepEqual(DE_CRISE.map(rythmes), [[9, 10], [10], [10], [10]]);
  const panique = exerciceDe('panique').etapes.map((e) => e.texte);
  assert.match(panique[0], /pieds/);
  assert.match(panique[1], /^Trois soupirs/);
  assert.match(panique[5], /^Encore deux longues expirations/);
  // « Serrer cinq secondes » laisse ces cinq secondes après la lecture de la consigne, trois fois.
  const serrer = exerciceDe('colere').etapes.filter((e) => /cinq secondes/.test(e.texte));
  assert.equal(serrer.length, 3);
  for (const e of serrer) assert.ok(e.dureeS - e.texte.split(/\s+/).length / 3 >= 5, e.texte);
});

test('v10 · la durée au choix : 1, 3 ou 5 min, pour le soupir, l\'expiration longue et le noting seulement', () => {
  assert.deepEqual([...DUREES_AU_CHOIX], [1, 3, 5]);
  assert.ok(Object.isFrozen(DUREES_AU_CHOIX));
  assert.deepEqual(EXERCICES.filter(aDureeAuChoix).map((x) => x.id), AU_CHOIX);
  for (const x of EXERCICES) assert.equal(x.etapes.filter((e) => e.repete).length, AU_CHOIX.includes(x.id) ? 1 : 0, x.id);
  for (const brut of [null, undefined, seanceCoherence()]) assert.equal(aDureeAuChoix(brut), false);
  for (const id of AU_CHOIX) {
    const x = exerciceDe(id);
    for (const minutes of DUREES_AU_CHOIX) {
      const d = exerciceAvecDuree(x, minutes);
      const place = x.etapes.findIndex((e) => e.repete);
      const pas = x.etapes[place].souffle ? cycleSouffleMs(x.etapes[place].souffle) / 1000 : 1;
      assert.equal(d.dureeMin, minutes, id);
      // La somme à un demi-cycle près (mieux que le cycle près demandé), en secondes entières.
      assert.ok(Math.abs(dureeExerciceS(d) - minutes * 60) <= pas / 2, `${id} : ${dureeExerciceS(d)} s pour ${minutes} min`);
      assert.ok(Number.isInteger(d.etapes[place].dureeS));
      // Les autres étapes ne changent pas : les mêmes objets, dans le même ordre.
      d.etapes.forEach((e, i) => { if (i !== place) assert.equal(e, x.etapes[i], `${id} : ${e.texte}`); });
      assert.equal(d.etapes.length, x.etapes.length);
      assert.equal(d.etapes[place].texte, x.etapes[place].texte);
      assert.deepEqual(d.etapes[place].souffle, x.etapes[place].souffle);
      assert.equal(d.etapes[place].repete, true);
      // Voix allumée : même à 1 min, l'étape qui se répète laisse le temps de faire ce qu'elle dit.
      assert.ok(d.etapes[place].dureeS - d.etapes[place].texte.split(/\s+/).length / 3 >= 3, `${id} à ${minutes} min`);
      assert.ok(Object.isFrozen(d) && Object.isFrozen(d.etapes) && Object.isFrozen(d.etapes[place]), id);
      assert.equal(dureeEtPosture(d), `${minutes}\u00a0min · ${x.posture}`);
      // « Mené au bout » suit la durée choisie.
      assert.equal(exerciceMeneAuBout(d, { derniereAtteinte: true, dureeS: dureeExerciceS(d) / 2 }), true);
      assert.equal(exerciceMeneAuBout(d, { derniereAtteinte: true, dureeS: dureeExerciceS(d) / 2 - 1 }), false);
    }
    // À 3 min, la durée de départ tombe juste : l'exercice tel qu'il est écrit, sans rien modifier de la liste.
    assert.equal(dureeExerciceS(x), 180, id);
    assert.deepEqual(exerciceAvecDuree(x, 3), x, id);
    assert.equal(exerciceDe(id), x);
    // Une durée hors liste (une clé abîmée de l'appareil) : l'exercice tel quel.
    for (const brut of [2, 0, -1, '3', NaN, null, undefined]) assert.equal(exerciceAvecDuree(x, brut), x, String(brut));
  }
  // Les durées exactes de l'écran : l'expiration longue et le noting tombent juste, le soupir à moins de 5 s (cycles de 9 s).
  const totaux = (id) => DUREES_AU_CHOIX.map((m) => dureeExerciceS(exerciceAvecDuree(exerciceDe(id), m)));
  assert.deepEqual(totaux('expiration-longue'), [60, 180, 300]);
  assert.deepEqual(totaux('noting'), [60, 180, 300]);
  assert.deepEqual(totaux('soupir'), [63, 180, 297]);
  // Les sept autres, et ce qui n'est pas un exercice, ne changent pas.
  for (const x of EXERCICES.filter((y) => !AU_CHOIX.includes(y.id))) assert.equal(exerciceAvecDuree(x, 5), x, x.id);
  assert.equal(exerciceAvecDuree(null, 3), null);
  const coherence = seanceCoherence();
  assert.equal(exerciceAvecDuree(coherence, 1), coherence);
});

// À 1 min, la durée qu'on choisit quand on est pressé, l'étape qui fait l'exercice n'est pas la plus petite part : l'arrivée
// et la fin restent brèves. La posture de l'écran « avant » dit déjà « là où tu es » : aucune étape ne le répète.
test('v10 · la durée au choix : à 1 min, l\'étape qui se répète garde au moins la moitié du temps', () => {
  const repete = (id, m) => exerciceAvecDuree(exerciceDe(id), m).etapes.find((e) => e.repete);
  const partage = (id) => DUREES_AU_CHOIX.map((m) => repete(id, m).dureeS);
  assert.deepEqual(partage('soupir'), [36, 153, 270]);
  assert.deepEqual(partage('expiration-longue'), [30, 150, 270]);
  assert.deepEqual(partage('noting'), [30, 150, 270]);
  for (const id of AU_CHOIX) {
    const d = exerciceAvecDuree(exerciceDe(id), 1);
    const part = repete(id, 1).dureeS;
    assert.ok(part >= dureeExerciceS(d) - part, `${id} : ${part} s sur ${dureeExerciceS(d)}`);
    assert.ok(!d.etapes.some((e) => /^Reste là où tu es/.test(e.texte)), `${id} : pas d'étape qui répète la posture`);
    assert.equal(d.etapes.length, 5, id);
  }
  // Ce que ça laisse : 4 soupirs, 3 longues expirations, et plus de 25 s pour toucher une étiquette après la lecture.
  assert.equal(repete('soupir', 1).dureeS / (cycleSouffleMs(repete('soupir', 1).souffle) / 1000), 4);
  assert.equal(repete('expiration-longue', 1).dureeS / (cycleSouffleMs(repete('expiration-longue', 1).souffle) / 1000), 3);
  assert.ok(repete('noting', 1).dureeS - repete('noting', 1).texte.split(/\s+/).length / 3 > 25);
});

test('v10 · le noting : quatre étiquettes sur l\'étape qui se répète, et nulle part ailleurs', () => {
  const avec = EXERCICES.flatMap((x) => x.etapes.filter((e) => 'etiquettes' in e).map((e) => [x.id, e]));
  assert.deepEqual(avec.map(([id]) => id), ['noting']);
  const [[, etape]] = avec;
  assert.deepEqual([...etape.etiquettes], ['Pensée', 'Corps', 'Son', 'Émotion']);
  assert.ok(Object.isFrozen(etape.etiquettes));
  assert.equal(etape.repete, true);
  assert.ok(!etape.souffle, 'le temps avance seul, sans disque');
  assert.deepEqual(exerciceAvecDuree(exerciceDe('noting'), 5).etapes.find((e) => e.repete).etiquettes, etape.etiquettes);
  for (const t of etape.etiquettes) assert.deepEqual(trouverInterdits(t), [], t);
});

test('les titres et les étapes sont repris dans docs/decisions.md, pour être relus par l\'utilisateur, avec leurs durées', () => {
  const doc = lire(join(RACINE, 'docs', 'decisions.md'));
  for (const x of EXERCICES) for (const t of textes(x)) assert.ok(doc.includes(t), `absent de decisions.md : ${t}`);
  for (const x of EXERCICES) {
    x.etapes.forEach((e, i) => assert.ok(doc.includes(`${i + 1}. ${e.texte} *(${e.dureeS} s)*`), `durée à jour dans decisions.md : ${e.texte}`));
  }
  // Le partage de la durée au choix se relit sur la fiche : l'étape qui se répète, à 1 et à 5 min.
  for (const id of AU_CHOIX) {
    const [a, , b] = DUREES_AU_CHOIX.map((m) => exerciceAvecDuree(exerciceDe(id), m).etapes.find((e) => e.repete).dureeS);
    assert.ok(doc.includes(`ici à 3 min (${a} s à 1 min, ${b} s à 5 min)`), `${id} : le partage dans decisions.md`);
  }
  // « Réveil la nuit » : le même exercice partout (spec §7.2) ; « muet sauf la voix » ne vaut que dans Moment difficile.
  const nuit = 'dans Moment difficile, muet sauf la voix ; dans Bien-être, les réglages du lecteur';
  assert.ok(doc.includes(`Posture : allongé. Écran noir ; ${nuit}.`), 'la fiche de « Réveil la nuit »');
  assert.ok(lire(join(RACINE, 'public', 'js', 'domain', 'exercices.js')).includes(`\`nuit\` (écran noir ; ${nuit})`), 'le commentaire du champ `nuit`');
});

// Voix allumée, l'étape suivante est lue à la fin de la durée de l'étape. Une consigne se dit à environ 3 mots par seconde
// (voix française du système : « Inspire par le nez en comptant jusqu'à quatre. » prend de 2 à 2,5 s) : chaque étape
// laisse au moins 3 s après sa lecture, et une étape qui fait compter jusqu'à quatre en laisse au moins 5 (4 s pour
// compter, sans que la consigne suivante coupe le compte). v10 : la même règle pour une étape sans rythme qui dit « sur
// quatre temps » ou « sur six temps », 1 s de plus que ces temps (avec un rythme, c'est le disque qui mène le compte).
test('voix allumée : chaque étape laisse le temps de faire ce qu\'elle dit après sa lecture', () => {
  const lecture = (t) => t.split(/\s+/).length / 3;
  for (const x of EXERCICES) {
    for (const e of x.etapes) {
      const reste = e.dureeS - lecture(e.texte);
      assert.ok(reste >= 3, `${x.id} : ${e.texte} (${e.dureeS} s)`);
      if (/compt\w* jusqu'à quatre/.test(e.texte)) assert.ok(reste >= 5, `le temps de compter : ${e.texte} (${e.dureeS} s)`);
      const n = !e.souffle && /sur (quatre|six) temps/.exec(e.texte);
      if (n) assert.ok(reste >= { quatre: 4, six: 6 }[n[1]] + 1, `le temps de compter : ${e.texte} (${e.dureeS} s)`);
    }
  }
  // La garde voit bien les deux étapes de l'expiration longue qui comptent sans disque.
  assert.deepEqual(EXERCICES.flatMap((x) => x.etapes.filter((e) => !e.souffle && /sur (quatre|six) temps/.test(e.texte)).map(() => x.id)), ['expiration-longue', 'expiration-longue']);
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
