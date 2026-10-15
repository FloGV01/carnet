import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RUBRIQUES_PLAN, UNE_CHOSE_DEFAUT, cartesPlan, normaliserPlan, normaliserUneChose, phraseSiAlors } from '../../public/js/domain/mon-plan.js';

// Un plan écrit avec des mots inventés pour le test : une rubrique par clé, plusieurs lignes par endroits.
const plan = {
  premiersSignes: 'ma voix monte',
  quandCaMonte: 'je sors marcher\nje bois de l\'eau',
  siSurcharge: 'je coupe le bruit',
  pourRecuperer: 'je m\'allonge\n\nje ferme les yeux',
  prevenir: 'mon frère',
  siAlors: [{ si: 'la chaleur monte', alors: 'je respire' }, { si: 'je suis dehors', alors: 'je rentre' }],
};
const libelle = (cle) => RUBRIQUES_PLAN.find(([k]) => k === cle)[1];

test('par défaut : toutes les rubriques sauf « Mes premiers signes », sans les si… alors…', () => {
  assert.deepEqual(UNE_CHOSE_DEFAUT, { rubriques: ['quandCaMonte', 'siSurcharge', 'pourRecuperer', 'prevenir'], siAlors: false });
  assert.deepEqual(cartesPlan(plan), [
    { rubrique: libelle('quandCaMonte'), texte: 'je sors marcher' },
    { rubrique: libelle('quandCaMonte'), texte: 'je bois de l\'eau' },
    { rubrique: libelle('siSurcharge'), texte: 'je coupe le bruit' },
    { rubrique: libelle('pourRecuperer'), texte: 'je m\'allonge' },
    { rubrique: libelle('pourRecuperer'), texte: 'je ferme les yeux' },
    { rubrique: libelle('prevenir'), texte: 'mon frère' },
  ]);
  assert.deepEqual(cartesPlan(plan, {}), cartesPlan(plan), 'des réglages vides valent les réglages par défaut');
});

test('une carte par ligne non vide : lignes vides et espaces écartés, retours Windows compris', () => {
  const cartes = cartesPlan({ quandCaMonte: '  je sors  \r\n\r\n   \n \nje respire\r\n' });
  assert.deepEqual(cartes.map((c) => c.texte), ['je sors', 'je respire']);
  assert.equal(cartesPlan({ quandCaMonte: 'une seule ligne' }).length, 1);
});

test('les si… alors… s\'ajoutent à la fin quand ils sont choisis, et se lisent « Si …, alors … »', () => {
  const sans = cartesPlan(plan, { rubriques: ['prevenir'], siAlors: false });
  assert.deepEqual(sans, [{ rubrique: libelle('prevenir'), texte: 'mon frère' }]);
  const avec = cartesPlan(plan, { rubriques: ['prevenir'], siAlors: true });
  assert.deepEqual(avec, [
    { rubrique: libelle('prevenir'), texte: 'mon frère' },
    { rubrique: 'Si… alors…', texte: 'Si la chaleur monte, alors je respire' },
    { rubrique: 'Si… alors…', texte: 'Si je suis dehors, alors je rentre' },
  ]);
  // Une moitié absente se lit « … », comme dans la liste de Mon plan.
  assert.equal(phraseSiAlors({ si: null, alors: 'je respire' }), 'Si …, alors je respire');
  assert.equal(phraseSiAlors({ si: 'la chaleur monte', alors: null }), 'Si la chaleur monte, alors …');
});

test('les rubriques choisies passent dans l\'ordre de Mon plan, « Mes premiers signes » comprise si elle est choisie', () => {
  const cartes = cartesPlan(plan, { rubriques: ['prevenir', 'premiersSignes'], siAlors: false });
  assert.deepEqual(cartes.map((c) => c.rubrique), [libelle('premiersSignes'), libelle('prevenir')]);
  assert.deepEqual(cartesPlan(plan, { rubriques: [], siAlors: false }), [], 'aucune rubrique choisie : aucune carte');
  assert.deepEqual(cartesPlan(plan, { rubriques: [], siAlors: true }).map((c) => c.rubrique), ['Si… alors…', 'Si… alors…']);
});

test('un plan vide, absent ou illisible ne donne aucune carte', () => {
  assert.deepEqual(cartesPlan(normaliserPlan(null)), []);
  assert.deepEqual(cartesPlan(null), []);
  assert.deepEqual(cartesPlan({}, { rubriques: RUBRIQUES_PLAN.map(([cle]) => cle), siAlors: true }), []);
  assert.deepEqual(cartesPlan({ quandCaMonte: '  \n  ', siAlors: [{ si: ' ', alors: '' }] }, { siAlors: true }), []);
});

test('cartesPlan ne modifie ni le plan ni les réglages reçus', () => {
  const figeP = Object.freeze({ ...plan, siAlors: Object.freeze([...plan.siAlors]) });
  const figeR = Object.freeze({ rubriques: Object.freeze(['quandCaMonte']), siAlors: true });
  assert.equal(cartesPlan(figeP, figeR).length, 4);
});

test('lecture des réglages : défauts à la lecture, hors liste ignoré, liste vide gardée', () => {
  assert.deepEqual(normaliserUneChose(null), UNE_CHOSE_DEFAUT);
  assert.deepEqual(normaliserUneChose({}), UNE_CHOSE_DEFAUT);
  assert.deepEqual(normaliserUneChose({ rubriques: 'prevenir', siAlors: 'oui' }), UNE_CHOSE_DEFAUT, 'un type inattendu retombe sur les défauts');
  assert.deepEqual(normaliserUneChose({ rubriques: ['prevenir', 'inconnue', 'prevenir', 'premiersSignes'], siAlors: true }),
    { rubriques: ['premiersSignes', 'prevenir'], siAlors: true }, 'doublons et clés inconnues écartés, ordre de Mon plan');
  assert.deepEqual(normaliserUneChose({ rubriques: [], siAlors: false }), { rubriques: [], siAlors: false });
  // Le résultat est une copie : modifier l'un ne touche pas aux défauts.
  normaliserUneChose(null).rubriques.push('premiersSignes');
  assert.equal(UNE_CHOSE_DEFAUT.rubriques.includes('premiersSignes'), false);
});
