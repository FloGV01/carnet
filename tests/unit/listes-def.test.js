import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LISTES, NOMS_LISTES, GROUPES_LISTES } from '../../public/js/domain/listes-def.js';

// v6.1 · Réglages › Listes (P16) : l'index range les listes par écran. Aucune ne disparaît, aucune n'est
// renommée : chaque liste est rangée une fois et une seule, sous l'écran où on la choisit.
test('v6.1 · index des listes : six écrans dans l\'ordre, toutes les listes une seule fois', () => {
  assert.deepEqual(GROUPES_LISTES.map((g) => g.ecran), ['Le soir', 'Humeur du moment', 'Épisode', 'Après coup', 'Symptôme', 'Soins']);
  const rangees = GROUPES_LISTES.flatMap((g) => g.listes);
  assert.equal(rangees.length, NOMS_LISTES.length, 'aucun doublon');
  assert.deepEqual([...rangees].sort(), [...NOMS_LISTES].sort(), 'aucune liste oubliée ni inventée');
  for (const g of GROUPES_LISTES) assert.ok(g.listes.length > 0, g.ecran);
  for (const nom of rangees) assert.ok(LISTES[nom].libelle, nom);
});

test('v6.1 · index des listes : une liste qui sert à plusieurs écrans va sous le premier', () => {
  const ecranDe = (nom) => GROUPES_LISTES.find((g) => g.listes.includes(nom)).ecran;
  assert.equal(ecranDe('declencheur'), 'Épisode', 'Déclencheur : Épisode, puis Après coup');
  assert.equal(ecranDe('dessous'), 'Épisode');
  assert.equal(ecranDe('professionnel'), 'Soins', 'Professionnel : rendez-vous, puis Vue soignants');
  assert.equal(ecranDe('energie'), 'Humeur du moment');
  assert.equal(ecranDe('activiteMoment'), 'Humeur du moment');
  assert.equal(ecranDe('pese'), 'Le soir');
  assert.equal(ecranDe('typeExplosion'), 'Après coup');
  assert.equal(ecranDe('duree'), 'Symptôme');
  assert.equal(ecranDe('effetRessenti'), 'Soins');
});
