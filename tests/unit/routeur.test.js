import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lireRoute, versHash, ongletDe, ROUTES, ENTREES_BIEN_ETRE } from '../../public/js/routeur.js';
import { ENTREES } from '../../public/js/domain/entrees-bien-etre.js';

test('routes connues', () => {
  assert.deepEqual(lireRoute('#/aujourdhui'), { nom: 'aujourdhui', params: {}, chemin: '/aujourdhui' });
  assert.equal(lireRoute('#/jour/2026-09-30').params.date, '2026-09-30');
  assert.equal(lireRoute('#/episode/nouveau').params.id, 'nouveau');
  assert.equal(lireRoute('#/episode/ep_abc-12').params.id, 'ep_abc-12');
  assert.equal(lireRoute('#/reglages/sauvegarde').nom, 'reglages-sauvegarde');
  assert.equal(lireRoute('#/reglages/moment-difficile').nom, 'reglages-moment-difficile');
  assert.equal(lireRoute('#/reglages/ressourcer').nom, 'reglages-ressourcer');
  assert.equal(lireRoute('#/reglages/emotions').nom, 'reglages-emotions');
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
  const exemples = { date: '2026-01-05', id: 'x1', liste: 'emotion', onglet: 'rythmes', entree: 'dormir' };
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
  assert.equal(ongletDe('crise'), 'aujourdhui', 'v10 : un exercice court reste à l\'onglet de Moment difficile');
  assert.equal(ongletDe('reglages-ressourcer'), 'reglages', 'Me ressourcer (la règle) se règle dans Réglages');
  assert.equal(ongletDe('reglages-aide-iphone'), 'reglages', 'l\'aide iPhone s\'ouvre depuis Réglages');
  assert.equal(ongletDe('reglages-emotions'), 'reglages', 'v8 : le sens des mots se règle dans Réglages');
  assert.equal(ongletDe('rdv'), 'soins');
  assert.equal(ongletDe('consultation'), 'soins');
  assert.equal(ongletDe('diagnostic'), 'reglages');
  assert.equal(ongletDe('comprendre'), 'analyse', 'Comprendre s\'ouvre depuis l\'Analyse');
});

test('v10 · un exercice court de Moment difficile : /crise/ID, à côté de la route de Moment difficile', () => {
  assert.deepEqual(lireRoute('#/crise/trop-plein'), { nom: 'crise', params: { id: 'trop-plein' }, chemin: '/crise/trop-plein' });
  assert.equal(versHash('crise', { id: 'reveil-nuit' }), '#/crise/reveil-nuit');
  assert.equal(lireRoute('#/moment-difficile').nom, 'moment-difficile');
  // Sans identifiant, l'adresse n'existe pas.
  for (const h of ['#/crise', '#/crise/']) assert.equal(lireRoute(h).inconnue, true, h);
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

test('v6.1 · Historique : un jour ouvert depuis l\'Historique (/historique/jour/DATE) garde l\'onglet de l\'Historique (v7 : Analyse) ; /jour/DATE garde Aujourd\'hui', () => {
  assert.deepEqual(lireRoute('#/historique/jour/2026-09-21'), { nom: 'historique-jour', params: { date: '2026-09-21' }, chemin: '/historique/jour/2026-09-21' });
  assert.equal(versHash('historique-jour', { date: '2026-09-21' }), '#/historique/jour/2026-09-21');
  assert.equal(ongletDe('historique-jour'), 'analyse');
  assert.equal(ongletDe('historique'), 'analyse');
  assert.equal(ongletDe('jour'), 'aujourdhui', 'ouvert autrement, le jour garde l\'onglet Aujourd\'hui');
  assert.deepEqual(lireRoute('#/historique'), { nom: 'historique', params: {}, chemin: '/historique' });
  for (const h of ['#/historique/jour', '#/historique/jour/', '#/historique/jour/2026-9-21', '#/historique/2026-09-21']) {
    assert.equal(lireRoute(h).inconnue, true, h);
  }
});

test('v10 · la liste d\'une entrée de Bien-être : /bien-etre/calmer, dormir ou concentrer, onglet Bien-être ; rien d\'autre', () => {
  assert.deepEqual(ENTREES_BIEN_ETRE, ENTREES.map((x) => x.id), 'les routes suivent les entrées du domaine');
  for (const entree of ENTREES_BIEN_ETRE) {
    assert.deepEqual(lireRoute(`#/bien-etre/${entree}`), { nom: 'entree-bien-etre', params: { entree }, chemin: `/bien-etre/${entree}` });
    assert.equal(versHash('entree-bien-etre', { entree }), `#/bien-etre/${entree}`);
    assert.equal(lireRoute(`#/bien-etre/${entree}/x`).inconnue, true);
  }
  assert.equal(ongletDe('entree-bien-etre'), 'bien-etre');
  assert.equal(lireRoute('#/bien-etre/autre').inconnue, true);
  // Les adresses d'à côté ne changent pas.
  assert.equal(lireRoute('#/bien-etre/coherence').nom, 'coherence');
  assert.equal(lireRoute('#/bien-etre/programme').nom, 'programme');
});

test('v10 · le minuteur silencieux, le minuteur de concentration et les sons de fond : des routes de l\'onglet Bien-être', () => {
  for (const nom of ['minuteur', 'concentration', 'sons']) {
    assert.deepEqual(lireRoute(`#/${nom}`), { nom, params: {}, chemin: `/${nom}` });
    assert.equal(versHash(nom), `#/${nom}`);
    assert.equal(ongletDe(nom), 'bien-etre');
    assert.equal(lireRoute(`#/${nom}/x`).inconnue, true);
  }
});

test('v7 · Bien-être : /bien-etre allume l\'onglet Bien-être ; l\'Historique, sorti de la barre, allume l\'Analyse', () => {
  assert.deepEqual(lireRoute('#/bien-etre'), { nom: 'bien-etre', params: {}, chemin: '/bien-etre' });
  assert.equal(versHash('bien-etre'), '#/bien-etre');
  assert.equal(ongletDe('bien-etre'), 'bien-etre');
  // L'adresse d'un exercice seul de la v7 n'existe plus (v10 : c'est #/exercice/<id>).
  for (const h of ['#/bien-etre/', '#/bien-etre/exercice/ancrage-54321', '#/bien-etre/exercice/']) assert.equal(lireRoute(h).inconnue, true, h);
  // L'Historique garde sa route et ses jours ; il n'a plus d'onglet à lui.
  assert.equal(lireRoute('#/historique').nom, 'historique');
  assert.equal(ongletDe('historique'), 'analyse');
  assert.equal(ongletDe('historique-jour'), 'analyse');
  assert.equal(ongletDe('moment'), 'aujourdhui', 'l\'Émotion du moment, ouverte depuis Bien-être, reste un parcours d\'Aujourd\'hui');
});

test('v8 · le Programme : /bien-etre/programme, et une séance du Programme dans le lecteur, /bien-etre/programme/ID ; onglet Bien-être', () => {
  assert.deepEqual(lireRoute('#/bien-etre/programme'), { nom: 'programme', params: {}, chemin: '/bien-etre/programme' });
  assert.deepEqual(lireRoute('#/bien-etre/programme/ancrage-54321'), { nom: 'seance-programme', params: { id: 'ancrage-54321' }, chemin: '/bien-etre/programme/ancrage-54321' });
  assert.equal(versHash('programme'), '#/bien-etre/programme');
  assert.equal(versHash('seance-programme', { id: 'coherence' }), '#/bien-etre/programme/coherence');
  assert.equal(ongletDe('programme'), 'bien-etre');
  assert.equal(ongletDe('seance-programme'), 'bien-etre');
  for (const h of ['#/bien-etre/programme/', '#/programme', '#/bien-etre/programme/a/b']) assert.equal(lireRoute(h).inconnue, true, h);
});

test('v10 · un exercice seul dans le lecteur : /exercice/ID, onglet Bien-être ; les routes d\'avant ne changent pas', () => {
  assert.deepEqual(lireRoute('#/exercice/scan-corporel'), { nom: 'exercice', params: { id: 'scan-corporel' }, chemin: '/exercice/scan-corporel' });
  assert.equal(versHash('exercice', { id: 'soupir' }), '#/exercice/soupir');
  assert.equal(ongletDe('exercice'), 'bien-etre');
  for (const h of ['#/exercice', '#/exercice/', '#/exercice/a/b']) assert.equal(lireRoute(h).inconnue, true, h);
  assert.equal(lireRoute('#/bien-etre/programme/soupir').nom, 'seance-programme');
  assert.equal(lireRoute('#/bien-etre/coherence').nom, 'coherence');
});

test('v8 · la cohérence cardiaque de Bien-être dans le lecteur : /bien-etre/coherence, onglet Bien-être', () => {
  assert.deepEqual(lireRoute('#/bien-etre/coherence'), { nom: 'coherence', params: {}, chemin: '/bien-etre/coherence' });
  assert.equal(versHash('coherence'), '#/bien-etre/coherence');
  assert.equal(ongletDe('coherence'), 'bien-etre');
  assert.equal(lireRoute('#/bien-etre/coherence/5').inconnue, true);
});

test('v7 · la barre d\'onglets : Aujourd\'hui · Analyse · Bien-être · Soins · Réglages, chacun avec une route et son onglet', async () => {
  const { ONGLETS_V1 } = await import('../../public/js/ui/composants/barre-onglets.js');
  assert.deepEqual(ONGLETS_V1.map((o) => o.libelle), ['Aujourd\'hui', 'Analyse', 'Bien-être', 'Soins', 'Réglages']);
  for (const o of ONGLETS_V1) {
    assert.equal(ongletDe(lireRoute(o.hash).nom), o.id, o.libelle);
    assert.equal(lireRoute(o.hash).inconnue, undefined, o.hash);
  }
});

test('v9 · un relevé de l\'Émotion du moment rouvert : /moment/ID (l\'écran 3), à côté de /moment (un relevé neuf) ; onglet Aujourd\'hui', () => {
  assert.deepEqual(lireRoute('#/moment'), { nom: 'moment', params: {}, chemin: '/moment' });
  assert.deepEqual(lireRoute('#/moment/hu_0a1b2c3d4e5f6a7b'), { nom: 'moment-releve', params: { id: 'hu_0a1b2c3d4e5f6a7b' }, chemin: '/moment/hu_0a1b2c3d4e5f6a7b' });
  assert.equal(versHash('moment-releve', { id: 'hu_x' }), '#/moment/hu_x');
  assert.equal(versHash('moment'), '#/moment');
  assert.equal(ongletDe('moment-releve'), 'aujourdhui');
  // Ni le Moment difficile, ni une adresse sans id ou plus longue.
  assert.equal(lireRoute('#/moment-difficile').nom, 'moment-difficile');
  for (const h of ['#/moment/', '#/moment/hu_x/y', '#/moment/hu x']) assert.equal(lireRoute(h).inconnue, true, h);
});

test('v11 · Mes refuges : /refuges, onglet Bien-être, qu\'on l\'ouvre de Bien-être ou de Réglages › Mon plan ; rien d\'autre', () => {
  assert.deepEqual(lireRoute('#/refuges'), { nom: 'refuges', params: {}, chemin: '/refuges' });
  assert.equal(versHash('refuges'), '#/refuges');
  assert.equal(ongletDe('refuges'), 'bien-etre');
  assert.equal(ongletDe('mon-plan'), 'reglages', 'Mon plan ne change pas d\'onglet');
  for (const h of ['#/refuges/', '#/refuges/x', '#/bien-etre/refuges', '#/mon-plan/refuges']) assert.equal(lireRoute(h).inconnue, true, h);
});

test('v12 · les réglages de Mes refuges : /refuges/reglages, onglet Bien-être ; rien d\'autre', () => {
  assert.deepEqual(lireRoute('#/refuges/reglages'), { nom: 'refuges-reglages', params: {}, chemin: '/refuges/reglages' });
  assert.equal(versHash('refuges-reglages'), '#/refuges/reglages');
  assert.equal(ongletDe('refuges-reglages'), 'bien-etre');
  for (const h of ['#/refuges/reglages/', '#/refuges/reglages/x', '#/reglages/refuges', '#/refuges/Reglages']) assert.equal(lireRoute(h).inconnue, true, h);
});
