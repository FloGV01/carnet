// v10 · Bien-être par besoin (spec §7.2 et §14.4) : les trois entrées à liste, leur contenu et leur ordre, tout ce qui peut
// être lancé, épinglé ou repris, et le titre de chaque élément.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENTREES, ELEMENTS_BIEN_ETRE, titreElement } from '../../public/js/domain/entrees-bien-etre.js';
import { EXERCICES } from '../../public/js/domain/exercices.js';
import { NOM_RESPIRATION } from '../../public/js/domain/respiration.js';
import { trouverInterdits } from '../aides/mots-interdits.js';

test('les trois entrées à liste, dans l\'ordre fixe de la spec (« Programme », la quatrième, ouvre son écran)', () => {
  assert.deepEqual(ENTREES.map((x) => [x.id, x.titre]), [
    ['calmer', 'Me calmer vite'],
    ['dormir', 'Dormir ou me rendormir'],
    ['concentrer', 'Me concentrer'],
  ]);
  assert.ok(Object.isFrozen(ENTREES));
  for (const x of ENTREES) assert.ok(Object.isFrozen(x) && Object.isFrozen(x.elements), x.id);
});

test('le contenu de chaque entrée, tel que la spec §7.2 le donne, dans l\'ordre et par titre', () => {
  const titres = (id) => ENTREES.find((x) => x.id === id).elements.map(titreElement);
  assert.deepEqual(titres('calmer'), ['Le soupir', 'Expiration longue', 'Ancrage court', 'Noter ce qui passe', 'Cohérence cardiaque', 'Minuteur silencieux']);
  assert.deepEqual(titres('dormir'), ['Réveil la nuit', 'Expiration longue', 'Scan court', 'Sons de fond']);
  assert.deepEqual(titres('concentrer'), ['Minuteur de concentration', 'Sons de fond', 'Noter ce qui passe']);
});

test('chaque élément d\'une entrée existe ; un élément paraît au plus une fois par entrée', () => {
  for (const x of ENTREES) {
    for (const id of x.elements) assert.ok(ELEMENTS_BIEN_ETRE.includes(id), `${x.id} : ${id}`);
    assert.equal(new Set(x.elements).size, x.elements.length, x.id);
  }
  // Savourer n'est dans aucune entrée (il se propose après une émotion) ; il reste un élément, qu'on peut épingler.
  const dansUneEntree = ENTREES.flatMap((x) => x.elements);
  assert.ok(!dansUneEntree.includes('savourer'));
  assert.ok(ELEMENTS_BIEN_ETRE.includes('savourer'));
  // Panique, Colère et Trop-plein restent à Moment difficile ; Réveil la nuit paraît aussi dans « Dormir » (spec §7.2).
  for (const id of ['panique', 'colere', 'trop-plein']) assert.ok(!dansUneEntree.includes(id), id);
  // Un exercice du Programme d'avant la v10 n'entre pas dans une liste : les entrées ne montrent que le nouveau.
  for (const x of EXERCICES.slice(0, 16)) assert.ok(!dansUneEntree.includes(x.id), x.id);
});

test('ce qui peut être épinglé ou repris : tous les exercices, la cohérence, les deux minuteurs et les sons de fond', () => {
  assert.deepEqual([...ELEMENTS_BIEN_ETRE], [...EXERCICES.map((x) => x.id), 'coherence', 'minuteur', 'concentration', 'sons-de-fond']);
  assert.equal(ELEMENTS_BIEN_ETRE.length, 30);
  assert.equal(new Set(ELEMENTS_BIEN_ETRE).size, 30);
  assert.ok(Object.isFrozen(ELEMENTS_BIEN_ETRE));
});

test('titreElement : le titre de l\'exercice, ou celui de l\'élément ; une chaîne vide pour un identifiant inconnu', () => {
  for (const x of EXERCICES) assert.equal(titreElement(x.id), x.titre);
  assert.equal(titreElement('coherence'), NOM_RESPIRATION);
  assert.equal(titreElement('minuteur'), 'Minuteur silencieux');
  assert.equal(titreElement('concentration'), 'Minuteur de concentration');
  assert.equal(titreElement('sons-de-fond'), 'Sons de fond');
  for (const id of ELEMENTS_BIEN_ETRE) {
    assert.ok(titreElement(id).length > 0, id);
    assert.deepEqual(trouverInterdits(titreElement(id)), [], id);
  }
  for (const brut of ['inconnu', '', null, undefined, 3, {}, 'constructor', 'toString', '__proto__']) {
    assert.equal(titreElement(brut), '', String(brut));
  }
  assert.equal(new Set(ELEMENTS_BIEN_ETRE.map(titreElement)).size, ELEMENTS_BIEN_ETRE.length, 'deux éléments ne portent pas le même titre');
});
