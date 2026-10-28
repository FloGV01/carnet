// v9 (2/8) · Les mots à soi (spec §4.5 et §9) : la méta `motsPerso` et ses changements (domain/mots-perso.js, pur), et la
// validation des relevés qui en citent un, à l'écriture (db/repository.js, même transaction que la méta).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nouveauRepo } from '../aides/repo.js';
import { trouverInterdits } from '../aides/mots-interdits.js';
import {
  creerMot, modifierMot, mettreDeCote, effacerMot, motsActifs, recreerSiAbsent, persoDe, nouvelIdMot, ErreurMot, MOT_SANS_LIBELLE,
} from '../../public/js/domain/mots-perso.js';
import { estEmotion, familleDe, libelleEmotion, motsDeLaRoue } from '../../public/js/domain/roue.js';
import { zoneDe, energieDe, motsDeLaCarte } from '../../public/js/domain/carte-roue.js';
import { definition } from '../../public/js/domain/definitions-roue.js';

const A = 'roue:perso:u-0a1b2c3d';
const B = 'roue:perso:u-11111111';
const C = 'roue:perso:u-22222222';
const LE_1ER = '2026-11-01T08:00:00.000Z';
const LE_2 = '2026-11-02T08:00:00.000Z';
const code = (c) => (e) => e instanceof ErreurMot && e.code === c;
// Deux mots : Flottant (bleu, tristesse) puis Débordé (rouge, sans famille, avec définition).
const deuxMots = () => {
  const { perso } = creerMot(null, { libelle: 'Flottant', zone: 'bleu', famille: 'tristesse' }, { id: A, maintenant: new Date(LE_1ER) });
  return creerMot(perso, { libelle: 'Débordé', zone: 'rouge', definition: ' Plus de place pour rien. ' }, { id: B, maintenant: LE_2 }).perso;
};

// ---------- pur ----------

test('créer : le nom et la zone suffisent, la famille et la définition sont facultatives ; la méta reçue reste intacte', () => {
  const vide = Object.freeze({});
  const { perso, id } = creerMot(vide, { libelle: '  Flottant ', zone: 'bleu' }, { id: A, maintenant: new Date(LE_1ER) });
  assert.equal(id, A);
  assert.deepEqual(perso, { [A]: { libelle: 'Flottant', zone: 'bleu', famille: null, definition: null, archive: false, createdAt: LE_1ER } });
  assert.deepEqual(vide, {});
  const avant = structuredClone(perso);
  const suite = creerMot(perso, { libelle: 'Débordé', zone: 'rouge', famille: 'peur', definition: '  Plus de place.  ' }, { id: B, maintenant: LE_2 }).perso;
  assert.deepEqual(perso, avant, 'pas de modification en place');
  assert.deepEqual(suite[B], { libelle: 'Débordé', zone: 'rouge', famille: 'peur', definition: 'Plus de place.', archive: false, createdAt: LE_2 });
  assert.deepEqual(Object.keys(suite), [A, B]);
  // Le libellé est mis en NFC, une définition blanche vaut null, « Aucune » famille vaut null.
  const nfd = creerMot(null, { libelle: 'Étourdi', zone: 'jaune', famille: '', definition: '   ' }, { id: C, maintenant: LE_2 }).perso[C];
  assert.equal(nfd.libelle, 'Étourdi');
  assert.equal(nfd.famille, null);
  assert.equal(nfd.definition, null);
  // Une méta illisible se lit vide.
  for (const illisible of [null, undefined, 'texte', 3, [A]]) assert.deepEqual(Object.keys(creerMot(illisible, { libelle: 'X', zone: 'vert' }, { id: A, maintenant: LE_1ER }).perso), [A]);
});

test('créer : le mot entre aussitôt dans la roue (libellé, famille, zone, énergie, définition), sur la carte hors du carré', () => {
  const perso = deuxMots();
  assert.equal(estEmotion(A, perso), true);
  assert.equal(libelleEmotion(A, perso), 'Flottant');
  assert.equal(familleDe(A, perso), 'tristesse');
  assert.equal(familleDe(B, perso), null);
  assert.equal(zoneDe(B, perso), 'rouge');
  assert.equal(energieDe(B, perso), 'energie:haute');
  assert.equal(energieDe(A, perso), 'energie:basse');
  assert.equal(definition(B, null, perso), 'Plus de place pour rien.');
  const siens = motsDeLaCarte(perso).filter((m) => m.perso);
  assert.deepEqual(siens.map((m) => [m.id, m.col, m.rang]), [[A, 0, 1], [B, 0, 12]]);
});

test('créer : un nom déjà pris par un mot de la carte ou un mot à soi actif est refusé, sans accents ni casse', () => {
  const perso = deuxMots();
  for (const libelle of ['Calme', 'calme', ' CALME ', 'emu', 'Ému', 'mal a l’aise', 'Epuise', 'Fatigué', 'flottant', 'DÉBORDÉ']) {
    assert.throws(() => creerMot(perso, { libelle, zone: 'vert' }, { id: C, maintenant: LE_2 }), code('LIBELLE_EXISTANT'), libelle);
  }
  // Les 144 mots de la carte, tous.
  for (const m of motsDeLaRoue()) assert.throws(() => creerMot(null, { libelle: m.libelle, zone: 'vert' }, { id: C, maintenant: LE_2 }), code('LIBELLE_EXISTANT'), m.libelle);
  // Un mot mis de côté ne prend plus son nom.
  const deCote = mettreDeCote(perso, A);
  assert.equal(creerMot(deCote, { libelle: 'Flottant', zone: 'bleu' }, { id: C, maintenant: LE_2 }).perso[C].libelle, 'Flottant');
});

test('créer : nom vide, zone ou famille inconnue, identifiant mal formé ou déjà pris sont refusés', () => {
  const perso = deuxMots();
  const essai = (champs, options = { id: C, maintenant: LE_2 }) => () => creerMot(perso, { libelle: 'Neuf', zone: 'vert', ...champs }, options);
  for (const libelle of ['', '   ', null, undefined]) assert.throws(essai({ libelle }), code('LIBELLE_VIDE'), String(libelle));
  for (const zone of [null, undefined, 'orange', 'Rouge', 1]) assert.throws(essai({ zone }), code('ZONE_INCONNUE'), String(zone));
  for (const famille of ['aucune', 'perso', 'Colère', 'roue:colere']) assert.throws(essai({ famille }), code('FAMILLE_INCONNUE'), famille);
  for (const id of [undefined, 'roue:perso:u-zzzzzzzz', 'roue:perso:u-0a1b2c3', 'roue:colere:irrite', 'symptome:u-0a1b2c3d']) {
    assert.throws(essai({}, { id, maintenant: LE_2 }), code('ID_INVALIDE'), String(id));
  }
  assert.throws(essai({}, { id: A, maintenant: LE_2 }), code('ID_EXISTANT'));
  // Chaque erreur a un message, sans formulation interdite.
  for (const c of ['LIBELLE_VIDE', 'LIBELLE_EXISTANT', 'ZONE_INCONNUE', 'FAMILLE_INCONNUE', 'ID_INVALIDE', 'ID_EXISTANT', 'INTROUVABLE', 'MOT_UTILISE']) {
    const e = new ErreurMot(c);
    assert.ok(e.message && e.message !== c, c);
    assert.deepEqual(trouverInterdits(e.message), [], c);
  }
});

test('nouvelIdMot : la forme d\'un élément de liste créé par l\'utilisateur, `roue:perso:u-<8 hexa>`', () => {
  const alea = { getRandomValues: (t) => { t.fill(0xab); return t; } };
  assert.equal(nouvelIdMot(alea), 'roue:perso:u-abababab');
  assert.match(nouvelIdMot(), /^roue:perso:u-[0-9a-f]{8}$/);
});

test('modifier : nom, zone, famille et définition, seuls ceux donnés ; doublon refusé ; la méta reçue reste intacte', () => {
  const perso = deuxMots();
  const avant = structuredClone(perso);
  const renomme = modifierMot(perso, A, { libelle: ' Dans le flou ' });
  assert.deepEqual(perso, avant);
  assert.deepEqual(renomme[A], { ...perso[A], libelle: 'Dans le flou' });
  assert.equal(renomme[B], perso[B], 'l\'autre mot est le même objet');
  assert.equal(modifierMot(perso, A, { libelle: 'FLOTTANT' })[A].libelle, 'FLOTTANT', 'son propre nom, autrement écrit');
  assert.throws(() => modifierMot(perso, A, { libelle: 'débordé' }), code('LIBELLE_EXISTANT'));
  assert.throws(() => modifierMot(perso, A, { libelle: 'Serein' }), code('LIBELLE_EXISTANT'));
  assert.throws(() => modifierMot(perso, A, { libelle: '  ' }), code('LIBELLE_VIDE'));
  const change = modifierMot(perso, A, { zone: 'vert', famille: null, definition: 'Un peu ailleurs.' });
  assert.deepEqual(change[A], { ...perso[A], zone: 'vert', famille: null, definition: 'Un peu ailleurs.' });
  assert.equal(modifierMot(change, A, { definition: '' })[A].definition, null);
  assert.throws(() => modifierMot(perso, A, { zone: null }), code('ZONE_INCONNUE'));
  assert.throws(() => modifierMot(perso, A, { famille: 'inconnue' }), code('FAMILLE_INCONNUE'));
  assert.throws(() => modifierMot(perso, C, { libelle: 'X' }), code('INTROUVABLE'));
  assert.deepEqual(modifierMot(perso, A, { archive: true, createdAt: 'x', autre: 1 })[A], perso[A], 'rien d\'autre ne change ici');
});

test('mettre de côté : le mot quitte la carte et la recherche, ses relevés le lisent toujours', () => {
  const perso = mettreDeCote(deuxMots(), B);
  assert.equal(perso[B].archive, true);
  assert.deepEqual(motsActifs(perso).map((m) => m.id), [A]);
  assert.ok(!motsDeLaCarte(perso).some((m) => m.id === B));
  assert.equal(estEmotion(B, perso), true);
  assert.equal(libelleEmotion(B, perso), 'Débordé');
  assert.equal(zoneDe(B, perso), 'rouge');
  assert.equal(definition(B, null, perso), 'Plus de place pour rien.');
  assert.throws(() => mettreDeCote(perso, C), code('INTROUVABLE'));
});

test('effacer : refusé pour un mot utilisé, permis sinon ; la méta reçue reste intacte', () => {
  const perso = deuxMots();
  assert.throws(() => effacerMot(perso, A, true), code('MOT_UTILISE'));
  const reste = effacerMot(perso, A, false);
  assert.deepEqual(Object.keys(reste), [B]);
  assert.deepEqual(Object.keys(perso), [A, B]);
  assert.equal(estEmotion(A, reste), false);
  assert.throws(() => effacerMot(perso, C, false), code('INTROUVABLE'));
});

test('motsActifs : dans l\'ordre de création, sans les mots mis de côté ni les entrées illisibles', () => {
  const perso = {
    [B]: { libelle: 'Deuxième', zone: 'jaune', famille: 'joie', definition: 'Avec une définition.', archive: false, createdAt: LE_2 },
    [A]: { libelle: ' Premier ', zone: 'orange', famille: 'inconnue', archive: false, createdAt: LE_1ER },
    [C]: { libelle: 'De côté', zone: 'vert', archive: true, createdAt: LE_1ER },
    'roue:perso:u-33333333': { libelle: ' ', zone: 'rouge' },
    'roue:perso:u-44444444': 'Pas un objet',
    'roue:perso:u-zzzzzzzz': { libelle: 'Id mal formé', zone: 'rouge' },
  };
  assert.deepEqual(motsActifs(perso), [
    { id: A, libelle: 'Premier', zone: null, famille: null, definition: null, createdAt: LE_1ER },
    { id: B, libelle: 'Deuxième', zone: 'jaune', famille: 'joie', definition: 'Avec une définition.', createdAt: LE_2 },
  ]);
  for (const illisible of [null, undefined, 'texte', []]) assert.deepEqual(motsActifs(illisible), []);
  assert.deepEqual(persoDe([A]), {});
  assert.equal(persoDe(perso), perso);
});

// Point de vigilance 4, à l'import : db/sauvegarde.js recrée ainsi un mot cité par un relevé et absent du fichier.
test('recreerSiAbsent : un mot à soi absent ou illisible est recréé mis de côté, « Mot sans libellé », sans zone', () => {
  const perso = deuxMots();
  const absent = 'roue:perso:u-99999999';
  const recree = { libelle: MOT_SANS_LIBELLE, zone: null, famille: null, definition: null, archive: true, createdAt: '2026-11-05T19:00:00.000Z' };
  const suite = recreerSiAbsent(perso, absent, '2026-11-05T19:00:00.000Z');
  assert.deepEqual(suite, { ...perso, [absent]: recree });
  assert.equal(Object.hasOwn(perso, absent), false, 'pas de modification en place');
  assert.deepEqual(recreerSiAbsent({ [absent]: { libelle: '' } }, absent, new Date('2026-11-05T19:00:00.000Z')), { [absent]: recree });
  assert.deepEqual(recreerSiAbsent(null, absent, '2026-11-05T19:00:00.000Z'), { [absent]: recree });
  // Rien à recréer : la même méta, telle quelle.
  for (const id of [A, 'roue:colere:irrite', 'roue:aucune:fatigue', 'roue:colere', 'roue:perso:zzz', null, undefined]) {
    assert.equal(recreerSiAbsent(perso, id, '2026-11-05T19:00:00.000Z'), perso, String(id));
  }
  const deCote = mettreDeCote(perso, A);
  assert.equal(recreerSiAbsent(deCote, A, '2026-11-05T19:00:00.000Z'), deCote, 'un mot mis de côté est connu');
  assert.equal(libelleEmotion(absent, suite), 'Mot sans libellé');
  assert.equal(zoneDe(absent, suite), null);
  assert.ok(!motsDeLaCarte(suite).some((m) => m.id === absent));
});

// ---------- écriture des relevés (repository) ----------

const releve = (emotion, extra = {}) => ({ date: '2026-09-30', heure: '15:00', emotion, ...extra });

test('un relevé qui cite un mot à soi inconnu est refusé, rien n\'est écrit ; connu, il est accepté avec son énergie', async () => {
  const { repo } = nouveauRepo();
  await assert.rejects(repo.humeurs.creer(releve(A, { energie: 'energie:basse' })), (e) => e.code === 'VALIDATION' && /emotion : émotion inconnue/.test(e.message));
  assert.deepEqual(await repo.humeurs.tous(), []);
  // Un autre mot à soi que celui cité ne suffit pas.
  await repo.meta.ecrire('motsPerso', creerMot(null, { libelle: 'Autre', zone: 'vert' }, { id: C, maintenant: LE_1ER }).perso);
  await assert.rejects(repo.humeurs.creer(releve(A)), (e) => e.code === 'VALIDATION');
  const perso = deuxMots();
  await repo.meta.ecrire('motsPerso', perso);
  const h = await repo.humeurs.creer(releve(A, { energie: energieDe(A, perso) }));
  assert.equal(h.emotion, A);
  assert.equal(h.energie, 'energie:basse');
  assert.deepEqual(await repo.humeurs.lire(h.id), h);
  // Les mots de la roue, sans famille compris, n'ont pas besoin de la méta.
  await repo.meta.ecrire('motsPerso', null);
  for (const id of ['roue:colere:irrite', 'roue:aucune:epuise', 'roue:serenite:insouciant', 'roue:colere']) assert.equal((await repo.humeurs.creer(releve(id))).emotion, id);
  // Un relevé qui cite un mot à soi disparu de la méta ne se modifie plus : il garde son mot, rien n'est perdu.
  await assert.rejects(repo.humeurs.modifier(h.id, { vers: true }), (e) => e.code === 'VALIDATION');
  assert.deepEqual(await repo.humeurs.lire(h.id), h);
});

test('passer d\'un mot de la roue à un mot à soi, et l\'inverse, dans le même relevé', async () => {
  const { repo } = nouveauRepo();
  const perso = deuxMots();
  await repo.meta.ecrire('motsPerso', perso);
  const h = await repo.humeurs.creer(releve('roue:joie:curieux', { energie: energieDe('roue:joie:curieux') }));
  const vers = await repo.humeurs.modifier(h.id, { emotion: B, energie: energieDe(B, perso) });
  assert.deepEqual([vers.emotion, vers.energie], [B, 'energie:haute']);
  const retour = await repo.humeurs.modifier(h.id, { emotion: 'roue:aucune:fatigue', energie: energieDe('roue:aucune:fatigue') });
  assert.deepEqual([retour.emotion, retour.energie], ['roue:aucune:fatigue', 'energie:moyenne']);
  // Effacer le mot et l'énergie : le relevé, vide, est supprimé.
  assert.equal(await repo.humeurs.modifier(h.id, { emotion: null, energie: null }), null);
  assert.equal(await repo.humeurs.lire(h.id), null);
});

// Point de vigilance 4 : un mot à soi qui change après usage. Ses relevés affichent son nom et la couleur de sa zone
// d'aujourd'hui ; leur énergie, enregistrée au toucher, ne change pas. Mis de côté, il reste lisible et modifiable.
test('point de vigilance 4 : renommé, changé de zone ou de famille, puis mis de côté, le mot reste celui de ses relevés', async () => {
  const { repo } = nouveauRepo();
  await repo.meta.ecrire('motsPerso', deuxMots());
  const lirePerso = () => repo.meta.lire('motsPerso');
  const h = await repo.humeurs.creer(releve(B, { energie: energieDe(B, await lirePerso()) }));
  assert.equal(h.energie, 'energie:haute');

  await repo.meta.modifier('motsPerso', (p) => modifierMot(p, B, { libelle: 'Submergé', zone: 'vert', famille: 'peur' }));
  let perso = await lirePerso();
  const lu = await repo.humeurs.lire(h.id);
  assert.deepEqual(lu, h, 'le relevé n\'est pas réécrit');
  assert.equal(libelleEmotion(lu.emotion, perso), 'Submergé');
  assert.equal(zoneDe(lu.emotion, perso), 'vert');
  assert.equal(familleDe(lu.emotion, perso), 'peur');
  assert.equal(lu.energie, 'energie:haute', 'l\'énergie enregistrée reste celle d\'alors');
  assert.equal(energieDe(lu.emotion, perso), 'energie:basse', 'un nouveau toucher prendrait celle de la nouvelle zone');

  // Utilisé : il ne s'efface pas, il se met de côté.
  const utilise = (await repo.humeurs.tous()).some((x) => x.emotion === B);
  await assert.rejects(repo.meta.modifier('motsPerso', (p) => effacerMot(p, B, utilise)), code('MOT_UTILISE'));
  assert.ok((await lirePerso())[B], 'la méta n\'a pas changé');
  await repo.meta.modifier('motsPerso', (p) => mettreDeCote(p, B));
  perso = await lirePerso();
  assert.ok(!motsDeLaCarte(perso).some((m) => m.id === B), 'hors de la carte');
  assert.ok(!motsActifs(perso).some((m) => m.id === B), 'hors de la recherche');
  assert.equal(libelleEmotion(B, perso), 'Submergé', 'toujours lisible');
  const modifie = await repo.humeurs.modifier(h.id, { faisais: ['activiteMoment:travail'] });
  assert.deepEqual([modifie.emotion, modifie.energie], [B, 'energie:haute'], 'son relevé reste modifiable');

  // Jamais utilisé, A s'efface.
  await repo.meta.modifier('motsPerso', (p) => effacerMot(p, A, false));
  assert.deepEqual(Object.keys(await lirePerso()), [B]);
});
