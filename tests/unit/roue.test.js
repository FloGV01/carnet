// Roue des émotions (v7) : un vocabulaire figé une fois publié, comme les listes `declencheur` et
// `dessous`. L'instantané ci-dessous est écrit en dur, à partir de la spec v7 (§4.1), mot pour mot :
// un libellé ne se lisse, ne se renomme et ne se réordonne jamais ; un ajout se fait à la fin d'une famille.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FAMILLES, estEmotion, familleDe, libelleEmotion } from '../../public/js/domain/roue.js';
import { trouverInterdits, normaliser } from '../aides/mots-interdits.js';

const INSTANTANE = [
  ['colere', 'Colère', ['Embarrassé', 'Dévasté', 'Insécurisé', 'Jaloux', 'Amer', 'Défiant', 'Furieux', 'Enragé', 'Provocateur',
    'Hostile', 'Mécontent', 'Irrité', 'Retiré', 'Suspect', 'Sceptique', 'Sarcastique']],
  ['degout', 'Dégoût', ['Jugé', 'Aversion', 'Répugnant', 'Révolté', 'Dégoût', 'Détestable', 'Hésitant']],
  ['tristesse', 'Tristesse', ['Fautif', 'Honteux', 'Ignoré', 'Replié', 'Impuissant', 'Vulnérable', 'Minable', 'Vide', 'Abandonné',
    'Isolé', 'Amorphe', 'Indifférent']],
  ['joie', 'Joie', ['Inspiré', 'Ouvert', 'Espiègle', 'Sensible', 'Optimiste', 'Aimant', 'Provocant', 'Courageux', 'Accompli',
    'Respecté', 'Important', 'Curieux', 'Amusé', 'Extasié', 'Libéré', 'Confiant']],
  ['surprise', 'Surprise', ['Énergique', 'Avide', 'Effrayé', 'Abasourdi', 'Perplexe', 'Désillusionné', 'Consterné', 'Choqué']],
  ['peur', 'Peur', ['Terrifié', 'Craintif', 'Accablé', 'Préoccupé', 'Incapable', 'Inférieur', 'Sans valeur', 'Inadéquat', 'Insignifiant',
    'Exclus', 'Non respecté', 'Ridiculisé']],
  ['serenite', 'Sérénité', ['Calme', 'Apaisé', 'Détendu', 'Reposé', 'Tranquille', 'Serein', 'Posé', 'En sécurité']],
];

// Règle des identifiants : ASCII minuscule, sans accent, l'espace devient « - ».
const slug = (libelle) => normaliser(libelle).replace(/ /g, '-');
const tousLesMots = () => FAMILLES.flatMap((f) => f.mots);

test('7 familles, dans l\'ordre de la roue, avec leur nom', () => {
  assert.deepEqual(FAMILLES.map((f) => f.cle), ['colere', 'degout', 'tristesse', 'joie', 'surprise', 'peur', 'serenite']);
  assert.deepEqual(FAMILLES.map((f) => f.id), FAMILLES.map((f) => `roue:${f.cle}`));
  assert.deepEqual(FAMILLES.map((f) => f.libelle), ['Colère', 'Dégoût', 'Tristesse', 'Joie', 'Surprise', 'Peur', 'Sérénité']);
});

test('79 mots en tout : 16 + 7 + 12 + 16 + 8 + 12 + 8, « Aversion » une seule fois', () => {
  assert.deepEqual(FAMILLES.map((f) => f.mots.length), [16, 7, 12, 16, 8, 12, 8]);
  assert.equal(tousLesMots().length, 79);
  assert.equal(tousLesMots().filter((m) => m.libelle === 'Aversion').length, 1);
});

test('libellés exacts, dans l\'ordre, comparés à l\'instantané', () => {
  assert.deepEqual(FAMILLES.map((f) => [f.cle, f.libelle, f.mots.map((m) => m.libelle)]), INSTANTANE);
});

test('identifiants uniques, au format roue:<famille>:<slug>, tirés du libellé', () => {
  const ids = [...FAMILLES.map((f) => f.id), ...tousLesMots().map((m) => m.id)];
  assert.equal(new Set(ids).size, 86, 'aucun doublon, familles comprises');
  for (const f of FAMILLES) {
    assert.match(f.id, /^roue:[a-z]+$/);
    for (const m of f.mots) {
      assert.match(m.id, /^roue:[a-z]+:[a-z]+(-[a-z]+)*$/, m.id);
      assert.equal(m.id, `roue:${f.cle}:${slug(m.libelle)}`, m.libelle);
    }
  }
  assert.equal(FAMILLES.find((f) => f.cle === 'peur').mots.find((m) => m.libelle === 'Sans valeur').id, 'roue:peur:sans-valeur');
  assert.equal(FAMILLES.find((f) => f.cle === 'serenite').mots.find((m) => m.libelle === 'En sécurité').id, 'roue:serenite:en-securite');
  assert.equal(FAMILLES.find((f) => f.cle === 'surprise').mots[0].id, 'roue:surprise:energique');
  assert.equal(FAMILLES.find((f) => f.cle === 'degout').mots.find((m) => m.libelle === 'Dégoût').id, 'roue:degout:degout');
});

test('estEmotion, familleDe et libelleEmotion', () => {
  assert.equal(libelleEmotion('roue:colere'), 'Colère');
  assert.equal(libelleEmotion('roue:colere:irrite'), 'Irrité');
  assert.equal(libelleEmotion('roue:serenite'), 'Sérénité');
  assert.equal(libelleEmotion('roue:peur:non-respecte'), 'Non respecté');
  assert.equal(familleDe('roue:colere:irrite'), 'colere');
  assert.equal(familleDe('roue:colere'), 'colere');
  assert.equal(familleDe('roue:serenite:en-securite'), 'serenite');
  for (const f of FAMILLES) {
    assert.ok(estEmotion(f.id));
    for (const m of f.mots) {
      assert.ok(estEmotion(m.id), m.id);
      assert.equal(familleDe(m.id), f.cle, m.id);
      assert.equal(libelleEmotion(m.id), m.libelle, m.id);
    }
  }
  for (const x of ['roue:colere:inconnu', 'roue:', 'roue', 'colere', 'emotion:colere', 'roue:joie:irrite', '', null, undefined, 3, {}, ['roue:colere'], 'constructor', '__proto__']) {
    assert.equal(estEmotion(x), false, String(x));
    assert.equal(familleDe(x), null, String(x));
    assert.equal(libelleEmotion(x), null, String(x));
  }
});

test('le vocabulaire est gelé', () => {
  assert.ok(Object.isFrozen(FAMILLES));
  for (const f of FAMILLES) {
    assert.ok(Object.isFrozen(f) && Object.isFrozen(f.mots), f.cle);
    for (const m of f.mots) assert.ok(Object.isFrozen(m), m.id);
  }
  assert.throws(() => { FAMILLES[0].mots[0].libelle = 'Autre'; }, TypeError);
});

test('aucune formulation interdite dans la roue', () => {
  const textes = [...FAMILLES.map((f) => f.libelle), ...tousLesMots().map((m) => m.libelle)];
  assert.deepEqual(textes.map((t) => [t, trouverInterdits(t)]).filter(([, f]) => f.length), []);
});
