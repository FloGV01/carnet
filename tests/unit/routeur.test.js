import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lireRoute, versHash, ongletDe, ROUTES } from '../../public/js/routeur.js';

test('routes connues', () => {
  assert.deepEqual(lireRoute('#/aujourdhui'), { nom: 'aujourdhui', params: {}, chemin: '/aujourdhui' });
  assert.equal(lireRoute('#/jour/2026-09-30').params.date, '2026-09-30');
  assert.equal(lireRoute('#/episode/nouveau').params.id, 'nouveau');
  assert.equal(lireRoute('#/episode/ep_abc-12').params.id, 'ep_abc-12');
  assert.equal(lireRoute('#/reglages/sauvegarde').nom, 'reglages-sauvegarde');
  assert.equal(lireRoute('#/reglages/moment-difficile').nom, 'reglages-moment-difficile');
  assert.equal(lireRoute('#/reglages/ressourcer').nom, 'reglages-ressourcer');
  assert.equal(lireRoute('#/reglages/aide-iphone').nom, 'reglages-aide-iphone');
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
  const exemples = { date: '2026-01-05', id: 'x1', liste: 'emotion', onglet: 'rythmes' };
  for (const r of ROUTES) {
    const params = Object.fromEntries((r.params || []).map((p) => [p, exemples[p]]));
    const lu = lireRoute(versHash(r.nom, params));
    assert.equal(lu.nom, r.nom, r.nom);
    assert.deepEqual(lu.params, params);
  }
});

test('onglet actif', () => {
  assert.equal(ongletDe('episode'), 'aujourdhui');
  assert.equal(ongletDe('apres-coup'), 'aujourdhui');
  assert.equal(ongletDe('apres-coup-liste'), 'aujourdhui');
  assert.equal(ongletDe('mon-plan'), 'reglages', 'Mon plan s\'ouvre depuis Réglages');
  assert.equal(ongletDe('reglages-journee'), 'reglages');
  assert.equal(ongletDe('reglages-moment-difficile'), 'reglages', 'les réglages ne sont pas l\'écran Moment difficile');
  assert.equal(ongletDe('moment-difficile'), 'aujourdhui');
  assert.equal(ongletDe('reglages-ressourcer'), 'reglages', 'Me ressourcer (la règle) se règle dans Réglages');
  assert.equal(ongletDe('reglages-aide-iphone'), 'reglages', 'l\'aide iPhone s\'ouvre depuis Réglages');
  assert.equal(ongletDe('rdv'), 'soins');
  assert.equal(ongletDe('consultation'), 'soins');
  assert.equal(ongletDe('diagnostic'), 'reglages');
  assert.equal(ongletDe('comprendre'), 'analyse', 'Comprendre s\'ouvre depuis l\'Analyse');
});

test('v6.1 · « Pour mes soignants » : Export PSY et Vue soignants allument l\'onglet Soins, l\'Analyse garde Comprendre', () => {
  assert.equal(ongletDe('export-psy'), 'soins');
  assert.equal(ongletDe('soignants'), 'soins');
  assert.equal(ongletDe('soins'), 'soins');
  assert.equal(ongletDe('analyse'), 'analyse');
  assert.equal(ongletDe('comprendre'), 'analyse');
  assert.equal(lireRoute('#/export-psy').nom, 'export-psy');
  assert.equal(lireRoute('#/soignants').nom, 'soignants');
  assert.equal(versHash('export-psy'), '#/export-psy');
  assert.equal(versHash('soignants'), '#/soignants');
});

test('v6 · Comprendre : /comprendre/ID avec ID parmi explosions, energie, rythmes', () => {
  for (const onglet of ['explosions', 'energie', 'rythmes']) {
    assert.deepEqual(lireRoute(`#/comprendre/${onglet}`), { nom: 'comprendre', params: { onglet }, chemin: `/comprendre/${onglet}` });
    assert.equal(versHash('comprendre', { onglet }), `#/comprendre/${onglet}`);
  }
  for (const h of ['#/comprendre', '#/comprendre/', '#/comprendre/autre', '#/comprendre/Energie']) {
    assert.equal(lireRoute(h).inconnue, true, h);
  }
});

test('v6 · Après coup : la liste (/apres-coup) et un épisode (/apres-coup/ID) ne se confondent pas', () => {
  assert.deepEqual(lireRoute('#/apres-coup'), { nom: 'apres-coup-liste', params: {}, chemin: '/apres-coup' });
  assert.deepEqual(lireRoute('#/apres-coup/ep_abc-12'), { nom: 'apres-coup', params: { id: 'ep_abc-12' }, chemin: '/apres-coup/ep_abc-12' });
  assert.equal(versHash('apres-coup-liste'), '#/apres-coup');
  assert.equal(versHash('apres-coup', { id: 'ep_x' }), '#/apres-coup/ep_x');
  assert.equal(lireRoute('#/apres-coup/').inconnue, true);
});

test('v6.1 · Me ressourcer : l\'écran (/ressourcer) n\'existe plus et ramène sur Aujourd\'hui ; ses réglages restent', () => {
  assert.equal(ROUTES.some((r) => r.nom === 'ressourcer'), false);
  for (const h of ['#/ressourcer', '#/ressourcer/', '#/ressourcer/autre']) {
    assert.deepEqual(lireRoute(h), { nom: 'aujourdhui', params: {}, chemin: '/aujourdhui', inconnue: true }, h);
  }
  assert.equal(versHash('ressourcer'), '#/aujourdhui');
  assert.deepEqual(lireRoute('#/reglages/ressourcer'), { nom: 'reglages-ressourcer', params: {}, chemin: '/reglages/ressourcer' });
  assert.equal(versHash('reglages-ressourcer'), '#/reglages/ressourcer');
});

test('v6 · Aide iPhone : /reglages/aide-iphone, sans suite ni variante', () => {
  assert.deepEqual(lireRoute('#/reglages/aide-iphone'), { nom: 'reglages-aide-iphone', params: {}, chemin: '/reglages/aide-iphone' });
  assert.equal(versHash('reglages-aide-iphone'), '#/reglages/aide-iphone');
  for (const h of ['#/reglages/aide-iphone/', '#/reglages/aide-iphone/autre', '#/aide-iphone']) {
    assert.equal(lireRoute(h).inconnue, true, h);
  }
});

test('v6.1 · Historique : un jour ouvert depuis l\'Historique (/historique/jour/DATE) garde l\'onglet Historique ; /jour/DATE garde Aujourd\'hui', () => {
  assert.deepEqual(lireRoute('#/historique/jour/2026-09-21'), { nom: 'historique-jour', params: { date: '2026-09-21' }, chemin: '/historique/jour/2026-09-21' });
  assert.equal(versHash('historique-jour', { date: '2026-09-21' }), '#/historique/jour/2026-09-21');
  assert.equal(ongletDe('historique-jour'), 'historique');
  assert.equal(ongletDe('historique'), 'historique');
  assert.equal(ongletDe('jour'), 'aujourdhui', 'ouvert autrement, le jour garde l\'onglet Aujourd\'hui');
  assert.deepEqual(lireRoute('#/historique'), { nom: 'historique', params: {}, chemin: '/historique' });
  for (const h of ['#/historique/jour', '#/historique/jour/', '#/historique/jour/2026-9-21', '#/historique/2026-09-21']) {
    assert.equal(lireRoute(h).inconnue, true, h);
  }
});
