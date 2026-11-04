// v10 · Les favoris de Bien-être (spec §7.3 et §14.4, point de vigilance 4 du plan) : une liste d'identifiants dans l'ordre
// d'épinglage. Une sauvegarde d'une autre version, une clé abîmée ou un exercice retiré n'y laissent ni erreur ni ligne vide.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normaliserFavoris, basculerFavori } from '../../public/js/domain/favoris.js';
import { ELEMENTS_BIEN_ETRE } from '../../public/js/domain/entrees-bien-etre.js';

test('normaliserFavoris : l\'ordre d\'épinglage est gardé', () => {
  assert.deepEqual(normaliserFavoris(['sons-de-fond', 'soupir', 'coherence', 'scan-corporel']), ['sons-de-fond', 'soupir', 'coherence', 'scan-corporel']);
  assert.deepEqual(normaliserFavoris(['soupir', 'sons-de-fond']), ['soupir', 'sons-de-fond']);
  assert.deepEqual(normaliserFavoris([]), []);
  // Tout ce qui peut être épinglé passe, Savourer et les exercices du Programme compris.
  assert.deepEqual(normaliserFavoris([...ELEMENTS_BIEN_ETRE]), [...ELEMENTS_BIEN_ETRE]);
});

test('normaliserFavoris : un identifiant inconnu est ignoré, sans laisser de trou', () => {
  assert.deepEqual(normaliserFavoris(['soupir', 'exercice-retire', 'noting']), ['soupir', 'noting']);
  assert.deepEqual(normaliserFavoris(['exercice-retire']), []);
  // Ce qui ressemble à un identifiant sans en être un : la casse, un nom de propriété, une chaîne vide.
  assert.deepEqual(normaliserFavoris(['Soupir', 'constructor', '__proto__', '', ' soupir']), []);
});

test('normaliserFavoris : un doublon compte une fois, à sa première place', () => {
  assert.deepEqual(normaliserFavoris(['noting', 'soupir', 'noting', 'soupir', 'minuteur']), ['noting', 'soupir', 'minuteur']);
});

test('normaliserFavoris : une valeur qui n\'est pas une chaîne est ignorée dans la liste, et ce qui n\'est pas une liste donne une liste vide', () => {
  assert.deepEqual(normaliserFavoris(['soupir', null, undefined, 3, {}, ['noting'], true, 'noting']), ['soupir', 'noting']);
  for (const brut of [null, undefined, 'soupir', 3, true, {}, { 0: 'soupir', length: 1 }]) {
    assert.deepEqual(normaliserFavoris(brut), [], String(brut));
  }
});

test('normaliserFavoris rend une liste neuve, et ne touche pas à celle qu\'on lui donne', () => {
  const brut = Object.freeze(['soupir', 'inconnu', 'soupir']);
  const r = normaliserFavoris(brut);
  assert.deepEqual(r, ['soupir']);
  assert.notEqual(r, brut);
  assert.deepEqual([...brut], ['soupir', 'inconnu', 'soupir']);
});

test('basculerFavori : ajoute à la fin, ou retire ; un second toucher revient à la liste de départ', () => {
  assert.deepEqual(basculerFavori([], 'soupir'), ['soupir']);
  assert.deepEqual(basculerFavori(['soupir'], 'minuteur'), ['soupir', 'minuteur']);
  assert.deepEqual(basculerFavori(['soupir', 'minuteur', 'noting'], 'minuteur'), ['soupir', 'noting']);
  const depart = ['soupir', 'noting'];
  assert.deepEqual(basculerFavori(basculerFavori(depart, 'savourer'), 'savourer'), depart);
  // Retiré puis épinglé de nouveau, il repart à la fin.
  assert.deepEqual(basculerFavori(basculerFavori(depart, 'soupir'), 'soupir'), ['noting', 'soupir']);
});

test('basculerFavori : un identifiant inconnu ne s\'ajoute pas, une liste abîmée est nettoyée, rien n\'est modifié sur place', () => {
  assert.deepEqual(basculerFavori(['soupir'], 'inconnu'), ['soupir']);
  assert.deepEqual(basculerFavori(['soupir'], null), ['soupir']);
  assert.deepEqual(basculerFavori(null, 'soupir'), ['soupir']);
  assert.deepEqual(basculerFavori(['inconnu', 'soupir', 'soupir'], 'noting'), ['soupir', 'noting']);
  const liste = Object.freeze(['soupir']);
  assert.deepEqual(basculerFavori(liste, 'noting'), ['soupir', 'noting']);
  assert.deepEqual(basculerFavori(liste, 'soupir'), []);
  assert.deepEqual([...liste], ['soupir']);
});
