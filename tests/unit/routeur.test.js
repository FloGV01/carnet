import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lireRoute, versHash, ongletDe, ROUTES } from '../../public/js/routeur.js';

test('routes connues', () => {
  assert.deepEqual(lireRoute('#/aujourdhui'), { nom: 'aujourdhui', params: {}, chemin: '/aujourdhui' });
  assert.equal(lireRoute('#/jour/2026-09-30').params.date, '2026-09-30');
  assert.equal(lireRoute('#/episode/nouveau').params.id, 'nouveau');
  assert.equal(lireRoute('#/episode/ep_abc-12').params.id, 'ep_abc-12');
  assert.equal(lireRoute('#/reglages/sauvegarde').nom, 'reglages-sauvegarde');
  assert.equal(lireRoute('#/reglages/listes/declencheur').params.liste, 'declencheur');
});

test('hash vide ou inconnu : retour sur Aujourd\'hui', () => {
  assert.equal(lireRoute('').nom, 'aujourdhui');
  const r = lireRoute('#/nimporte/quoi');
  assert.equal(r.nom, 'aujourdhui');
  assert.equal(r.inconnue, true);
  assert.equal(lireRoute('#/jour/2026-9-30').nom, 'aujourdhui');
});

test('aller-retour versHash / lireRoute pour chaque route', () => {
  const exemples = { date: '2026-01-05', id: 'x1', liste: 'emotion' };
  for (const r of ROUTES) {
    const params = Object.fromEntries((r.params || []).map((p) => [p, exemples[p]]));
    const lu = lireRoute(versHash(r.nom, params));
    assert.equal(lu.nom, r.nom, r.nom);
    assert.deepEqual(lu.params, params);
  }
});

test('onglet actif', () => {
  assert.equal(ongletDe('episode'), 'aujourdhui');
  assert.equal(ongletDe('pas-a-pas'), 'aujourdhui');
  assert.equal(ongletDe('rdv'), 'soins');
  assert.equal(ongletDe('consultation'), 'soins');
  assert.equal(ongletDe('diagnostic'), 'reglages');
  assert.equal(ongletDe('export-psy'), 'analyse');
});
