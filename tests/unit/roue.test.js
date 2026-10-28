// Roue des émotions (v7) : un vocabulaire figé une fois publié, comme les listes `declencheur` et
// `dessous`. L'instantané ci-dessous est écrit en dur, à partir de la spec v7 (§4.1), mot pour mot :
// un libellé ne se lisse, ne se renomme et ne se réordonne jamais ; un ajout se fait à la fin d'une famille.
// v9 (1/8, spec §6) : 144 mots. L'instantané des 79 mots est celui du tag v8.0.0 (public/js/domain/roue.js, identique
// à la v7) ; les 65 ajouts de la v9 ont le leur, figé à son tour une fois publié.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FAMILLES, MOTS_SANS_FAMILLE, estEmotion, familleDe, libelleEmotion, motPerso, motsDeLaRoue,
} from '../../public/js/domain/roue.js';
import { trouverInterdits, normaliser } from '../aides/mots-interdits.js';

// Tag v8.0.0 : les 79 mots, dans l'ordre de leur famille.
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
// v9 : les ajouts, à la fin de chaque famille, dans l'ordre de la carte (carte-proposee.json, spec §6).
const AJOUTS_V9 = {
  colere: ['En colère', 'Frustré'],
  degout: ['Mépris'],
  tristesse: ['Ennui', 'Triste', 'Découragé', 'Désespéré'],
  joie: ['Euphorique', 'Électrisé', 'Aux anges', 'Déterminé', 'Fort', 'Enthousiaste', 'Joyeux', 'Productif', 'Fier', 'Heureux',
    'Motivé', 'Gai', 'Concentré', 'Vivant', 'Stimulé', 'Réjoui', 'Ravi', 'Compétent', 'Compris', 'Épanoui', 'Comblé', 'Apprécié',
    'Soutenu', 'Aimé', 'Relié', 'Compatissant', 'Inclus', 'Reconnaissant', 'Bienveillant', 'Écouté', 'Content', 'Accepté', 'Ému',
    'Chanceux', 'Satisfait'],
  surprise: ['Surpris', 'Émerveillé', 'Emballé', 'Épaté'],
  peur: ['Paniqué', 'Survolté', 'Stressé', 'Sous pression', 'Anxieux', 'Agité', 'Apeuré', 'Tendu', 'Inquiet', 'Mal à l\'aise'],
  serenite: ['À l\'aise', 'Bien', 'Pensif', 'Équilibré', 'Solide', 'Insouciant', 'Soulagé'],
};

// Règle des identifiants : ASCII minuscule, sans accent, l'espace et l'apostrophe deviennent « - ».
const slug = (libelle) => normaliser(libelle).replace(/[ ']/g, '-');
const tousLesMots = () => FAMILLES.flatMap((f) => f.mots);
const PERSO = Object.freeze({
  'roue:perso:u-0a1b2c3d': { libelle: ' Flottant ', zone: 'bleu', famille: 'tristesse', definition: null, archive: false, createdAt: '2026-11-02T08:00:00.000Z' },
  'roue:perso:u-11111111': { libelle: 'À part', zone: 'vert', famille: null, definition: 'Un peu en dehors.', archive: true, createdAt: '2026-11-01T08:00:00.000Z' },
  'roue:perso:u-22222222': { libelle: 'Bizarre', zone: 'rouge', famille: 'inconnue', definition: null, archive: false, createdAt: '2026-11-03T08:00:00.000Z' },
  'roue:perso:u-33333333': { libelle: '  ', zone: 'rouge', famille: 'colere', archive: false },
  'roue:perso:u-44444444': 'Pas un objet',
  'roue:perso:u-zzzzzzzz': { libelle: 'Id mal formé', zone: 'rouge', famille: 'colere', archive: false },
});

test('7 familles, dans l\'ordre de la roue, avec leur nom', () => {
  assert.deepEqual(FAMILLES.map((f) => f.cle), ['colere', 'degout', 'tristesse', 'joie', 'surprise', 'peur', 'serenite']);
  assert.deepEqual(FAMILLES.map((f) => f.id), FAMILLES.map((f) => `roue:${f.cle}`));
  assert.deepEqual(FAMILLES.map((f) => f.libelle), ['Colère', 'Dégoût', 'Tristesse', 'Joie', 'Surprise', 'Peur', 'Sérénité']);
});

test('v9 : 144 mots, 142 dans les familles (18 + 8 + 16 + 51 + 12 + 22 + 15) et 2 sans famille ; « Aversion » une seule fois', () => {
  assert.deepEqual(FAMILLES.map((f) => f.mots.length), [18, 8, 16, 51, 12, 22, 15]);
  assert.equal(tousLesMots().length, 142);
  assert.deepEqual(MOTS_SANS_FAMILLE.map((m) => [m.id, m.libelle]), [['roue:aucune:fatigue', 'Fatigué'], ['roue:aucune:epuise', 'Épuisé']]);
  assert.equal(motsDeLaRoue().length, 144);
  assert.equal(tousLesMots().filter((m) => m.libelle === 'Aversion').length, 1);
  // Les ajouts : 65, dont Fatigué et Épuisé.
  assert.equal(Object.values(AJOUTS_V9).flat().length + MOTS_SANS_FAMILLE.length, 65);
});

test('les 79 mots du tag v8.0.0 ne changent ni d\'identifiant, ni de libellé, ni de famille, ni de place dans leur famille', () => {
  for (const [cle, libelle, mots] of INSTANTANE) {
    const f = FAMILLES.find((x) => x.cle === cle);
    assert.equal(f.libelle, libelle);
    assert.deepEqual(f.mots.slice(0, mots.length).map((m) => [m.id, m.libelle]), mots.map((m) => [`roue:${cle}:${slug(m)}`, m]), cle);
  }
  assert.equal(INSTANTANE.flatMap(([, , m]) => m).length, 79);
});

test('libellés exacts, dans l\'ordre : l\'instantané v8.0.0, puis les ajouts de la v9 à la fin de chaque famille', () => {
  assert.deepEqual(FAMILLES.map((f) => [f.cle, f.libelle, f.mots.map((m) => m.libelle)]),
    INSTANTANE.map(([cle, libelle, mots]) => [cle, libelle, [...mots, ...AJOUTS_V9[cle]]]));
});

test('identifiants uniques, au format roue:<famille>:<slug>, tirés du libellé ; aucun libellé en double', () => {
  const ids = [...FAMILLES.map((f) => f.id), ...tousLesMots().map((m) => m.id), ...MOTS_SANS_FAMILLE.map((m) => m.id)];
  assert.equal(new Set(ids).size, 151, 'aucun doublon, familles comprises');
  for (const f of FAMILLES) {
    assert.match(f.id, /^roue:[a-z]+$/);
    for (const m of f.mots) {
      assert.match(m.id, /^roue:[a-z]+:[a-z]+(-[a-z]+)*$/, m.id);
      assert.equal(m.id, `roue:${f.cle}:${slug(m.libelle)}`, m.libelle);
    }
  }
  for (const m of MOTS_SANS_FAMILLE) assert.equal(m.id, `roue:aucune:${slug(m.libelle)}`, m.libelle);
  // « aucune » est un préfixe réservé, jamais une famille.
  assert.ok(!FAMILLES.some((f) => f.cle === 'aucune' || f.cle === 'perso'));
  const libelles = motsDeLaRoue().map((m) => normaliser(m.libelle));
  assert.equal(new Set(libelles).size, 144, 'aucun libellé en double, sans accents ni casse');
  assert.equal(FAMILLES.find((f) => f.cle === 'peur').mots.find((m) => m.libelle === 'Sans valeur').id, 'roue:peur:sans-valeur');
  assert.equal(FAMILLES.find((f) => f.cle === 'serenite').mots.find((m) => m.libelle === 'En sécurité').id, 'roue:serenite:en-securite');
  assert.equal(FAMILLES.find((f) => f.cle === 'surprise').mots[0].id, 'roue:surprise:energique');
  assert.equal(FAMILLES.find((f) => f.cle === 'degout').mots.find((m) => m.libelle === 'Dégoût').id, 'roue:degout:degout');
  // L'apostrophe (corrections.md, 48) ; Insouciant à la place d'Ensommeillé (spec §6).
  assert.equal(FAMILLES.find((f) => f.cle === 'peur').mots.find((m) => m.libelle === 'Mal à l\'aise').id, 'roue:peur:mal-a-l-aise');
  assert.equal(FAMILLES.find((f) => f.cle === 'serenite').mots.find((m) => m.libelle === 'À l\'aise').id, 'roue:serenite:a-l-aise');
  assert.ok(estEmotion('roue:serenite:insouciant'));
  for (const absent of ['roue:serenite:ensommeille', 'roue:tristesse:fatigue', 'roue:tristesse:epuise']) assert.equal(estEmotion(absent), false, absent);
});

test('motsDeLaRoue : les 144, familles dans leur ordre puis les mots sans famille', () => {
  const mots = motsDeLaRoue();
  assert.deepEqual(mots.slice(0, 142), FAMILLES.flatMap((f) => f.mots.map((m) => ({ id: m.id, libelle: m.libelle, famille: f.cle }))));
  assert.deepEqual(mots.slice(142), [
    { id: 'roue:aucune:fatigue', libelle: 'Fatigué', famille: null }, { id: 'roue:aucune:epuise', libelle: 'Épuisé', famille: null }]);
  // Une copie à chaque appel : la modifier ne touche pas la roue.
  mots[0].libelle = 'Autre';
  assert.equal(motsDeLaRoue()[0].libelle, 'Embarrassé');
});

test('estEmotion, familleDe et libelleEmotion', () => {
  assert.equal(libelleEmotion('roue:colere'), 'Colère');
  assert.equal(libelleEmotion('roue:colere:irrite'), 'Irrité');
  assert.equal(libelleEmotion('roue:serenite'), 'Sérénité');
  assert.equal(libelleEmotion('roue:peur:non-respecte'), 'Non respecté');
  assert.equal(familleDe('roue:colere:irrite'), 'colere');
  assert.equal(familleDe('roue:colere'), 'colere');
  assert.equal(familleDe('roue:serenite:en-securite'), 'serenite');
  assert.equal(familleDe('roue:peur:survolte'), 'peur');
  for (const f of FAMILLES) {
    assert.ok(estEmotion(f.id));
    for (const m of f.mots) {
      assert.ok(estEmotion(m.id), m.id);
      assert.equal(familleDe(m.id), f.cle, m.id);
      assert.equal(libelleEmotion(m.id), m.libelle, m.id);
    }
  }
  // Fatigué et Épuisé : des émotions, sans famille.
  for (const m of MOTS_SANS_FAMILLE) {
    assert.ok(estEmotion(m.id), m.id);
    assert.equal(familleDe(m.id), null, m.id);
    assert.equal(libelleEmotion(m.id), m.libelle, m.id);
  }
  for (const x of ['roue:colere:inconnu', 'roue:', 'roue', 'colere', 'emotion:colere', 'roue:joie:irrite', 'roue:aucune', 'roue:aucune:',
    'roue:aucune:irrite', 'roue:perso', 'roue:perso:u-0a1b2c3d', '', null, undefined, 3, {}, ['roue:colere'], 'constructor', '__proto__']) {
    assert.equal(estEmotion(x), false, String(x));
    assert.equal(familleDe(x), null, String(x));
    assert.equal(libelleEmotion(x), null, String(x));
  }
});

test('mots à soi (méta motsPerso) : lus d\'après la méta passée en dernier paramètre, mis de côté compris', () => {
  // Un mot à soi, avec sa famille ; libellé sans espaces autour.
  assert.equal(estEmotion('roue:perso:u-0a1b2c3d', PERSO), true);
  assert.equal(familleDe('roue:perso:u-0a1b2c3d', PERSO), 'tristesse');
  assert.equal(libelleEmotion('roue:perso:u-0a1b2c3d', PERSO), 'Flottant');
  // Mis de côté : toujours lisible ; sans famille : null.
  assert.equal(estEmotion('roue:perso:u-11111111', PERSO), true);
  assert.equal(familleDe('roue:perso:u-11111111', PERSO), null);
  assert.equal(libelleEmotion('roue:perso:u-11111111', PERSO), 'À part');
  // Une famille qui n'existe pas : aucune.
  assert.equal(familleDe('roue:perso:u-22222222', PERSO), null);
  // Libellé vide, entrée illisible, id mal formé, mot absent de la méta : rien.
  for (const id of ['roue:perso:u-33333333', 'roue:perso:u-44444444', 'roue:perso:u-zzzzzzzz', 'roue:perso:u-99999999']) {
    assert.equal(estEmotion(id, PERSO), false, id);
    assert.equal(familleDe(id, PERSO), null, id);
    assert.equal(libelleEmotion(id, PERSO), null, id);
    assert.equal(motPerso(id, PERSO), null, id);
  }
  // Sans méta, ou une méta illisible.
  for (const perso of [undefined, null, 'texte', 42, [], ['roue:perso:u-0a1b2c3d']]) {
    assert.equal(estEmotion('roue:perso:u-0a1b2c3d', perso), false, JSON.stringify(perso));
    assert.equal(motPerso('roue:perso:u-0a1b2c3d', perso), null);
  }
  // La méta ne change rien aux mots de la roue, et ne crée pas de mot sous un autre préfixe.
  assert.equal(familleDe('roue:colere:irrite', PERSO), 'colere');
  assert.equal(estEmotion('roue:colere:inconnu', { 'roue:colere:inconnu': { libelle: 'Inconnu', zone: 'rouge' } }), false);
  assert.equal(motPerso('roue:perso:u-0a1b2c3d', PERSO), PERSO['roue:perso:u-0a1b2c3d']);
  // Une clé héritée n'est pas un mot.
  assert.equal(estEmotion('roue:perso:u-0a1b2c3d', Object.create({ 'roue:perso:u-0a1b2c3d': { libelle: 'Hérité' } })), false);
});

test('le vocabulaire est gelé', () => {
  assert.ok(Object.isFrozen(FAMILLES) && Object.isFrozen(MOTS_SANS_FAMILLE));
  for (const f of FAMILLES) {
    assert.ok(Object.isFrozen(f) && Object.isFrozen(f.mots), f.cle);
    for (const m of f.mots) assert.ok(Object.isFrozen(m), m.id);
  }
  for (const m of MOTS_SANS_FAMILLE) assert.ok(Object.isFrozen(m), m.id);
  assert.throws(() => { FAMILLES[0].mots[0].libelle = 'Autre'; }, TypeError);
  assert.throws(() => { MOTS_SANS_FAMILLE[0].libelle = 'Autre'; }, TypeError);
});

test('aucune formulation interdite dans la roue', () => {
  const textes = [...FAMILLES.map((f) => f.libelle), ...motsDeLaRoue().map((m) => m.libelle)];
  assert.deepEqual(textes.map((t) => [t, trouverInterdits(t)]).filter(([, f]) => f.length), []);
});
