import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENERGIE_BASSE, TITRE_RECUPERER, normaliserRessourcer, regleRessourcer } from '../../public/js/domain/ressourcer.js';

// v6 · « Me ressourcer » (spec §5) : la règle est vraie seulement si l'interrupteur est allumé, si le relevé
// est noté maintenant (jamais « vers »), si l'énergie est « basse » et si « Pour récupérer, je… » est écrit.
// Les mots du plan sont inventés pour le test.
const reglage = { energieBasse: true };
const releve = { vers: null, energie: ENERGIE_BASSE };
const plan = { pourRecuperer: 'je m\'allonge', quandCaMonte: 'je sors marcher', siAlors: [] };
const regle = (surcharge = {}) => regleRessourcer({ reglage, releve, plan, ...surcharge });

test('toutes les conditions réunies : la règle joue', () => {
  assert.equal(regle(), true);
  assert.equal(ENERGIE_BASSE, 'energie:basse', 'l\'identifiant publié de la liste Énergie ne change pas');
});

test('interrupteur éteint, absent ou illisible : la règle ne joue pas', () => {
  assert.equal(regle({ reglage: { energieBasse: false } }), false);
  assert.equal(regle({ reglage: {} }), false);
  assert.equal(regle({ reglage: null }), false);
  assert.equal(regle({ reglage: undefined }), false);
  assert.equal(regle({ reglage: { energieBasse: 'oui' } }), false, 'seul true allume');
  assert.equal(regle({ reglage: 'allumé' }), false);
});

test('un relevé « vers » ne la déclenche jamais, même avec une énergie basse', () => {
  assert.equal(regle({ releve: { vers: true, energie: ENERGIE_BASSE } }), false);
  // « Maintenant » : vers est null (jamais false dans la base), et un champ absent vaut maintenant.
  assert.equal(regle({ releve: { vers: null, energie: ENERGIE_BASSE } }), true);
  assert.equal(regle({ releve: { vers: false, energie: ENERGIE_BASSE } }), true);
  assert.equal(regle({ releve: { energie: ENERGIE_BASSE } }), true);
});

test('seule l\'énergie « basse » la déclenche : moyenne, haute, vide, inconnue', () => {
  for (const energie of ['energie:moyenne', 'energie:haute', null, undefined, '', 'basse', 'energie:Basse']) {
    assert.equal(regle({ releve: { vers: null, energie } }), false, String(energie));
  }
  assert.equal(regle({ releve: null }), false);
  assert.equal(regle({ releve: undefined }), false);
});

test('« Pour récupérer, je… » doit être écrit : vide, espaces, absent ou autre rubrique seule', () => {
  assert.equal(regle({ plan: { pourRecuperer: null } }), false);
  assert.equal(regle({ plan: { pourRecuperer: '' } }), false);
  assert.equal(regle({ plan: { pourRecuperer: '  \n \t ' } }), false);
  assert.equal(regle({ plan: { quandCaMonte: 'je sors marcher', siAlors: [{ si: 'la chaleur monte', alors: 'je respire' }] } }), false);
  assert.equal(regle({ plan: {} }), false);
  assert.equal(regle({ plan: null }), false);
  assert.equal(regle({ plan: undefined }), false);
  assert.equal(regle({ plan: { pourRecuperer: 42 } }), false);
  assert.equal(regle({ plan: { pourRecuperer: ' je m\'allonge ' } }), true);
});

test('sans aucun argument : la règle ne joue pas', () => {
  assert.equal(regleRessourcer(), false);
  assert.equal(regleRessourcer({}), false);
});

test('la règle ne lit rien d\'autre : ni l\'humeur, ni le jour, ni les relevés précédents', () => {
  // Les mêmes conditions donnent le même résultat, quelle que soit l'humeur : rien n'est calculé.
  for (const humeur of [1, 5, 10, null]) assert.equal(regle({ releve: { ...releve, humeur } }), true);
  const avant = JSON.stringify({ reglage, releve, plan });
  regle();
  assert.equal(JSON.stringify({ reglage, releve, plan }), avant, 'les entrées ne sont pas modifiées');
});

test('le réglage se lit avec son défaut : éteint', () => {
  assert.deepEqual(normaliserRessourcer(null), { energieBasse: false });
  assert.deepEqual(normaliserRessourcer(undefined), { energieBasse: false });
  assert.deepEqual(normaliserRessourcer({}), { energieBasse: false });
  assert.deepEqual(normaliserRessourcer('allumé'), { energieBasse: false });
  assert.deepEqual(normaliserRessourcer({ energieBasse: 'oui' }), { energieBasse: false });
  assert.deepEqual(normaliserRessourcer({ energieBasse: true }), { energieBasse: true });
  assert.deepEqual(normaliserRessourcer({ energieBasse: true, autre: 1 }), { energieBasse: true }, 'une clé inconnue est écartée');
});

test('le titre de la rubrique est celui de Mon plan', () => {
  assert.equal(TITRE_RECUPERER, 'Pour récupérer, je…');
});
