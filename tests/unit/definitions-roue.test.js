// v8 (2/9), puis v9 (1/8, spec §6 et §13.3) · Les définitions des mots de la roue (domain/definitions-roue.js) : une
// phrase courte et neutre par mot, écrite pour Carnet, figée comme la roue. 144 en v9 : les 65 ajouts viennent de la
// proposition (carte-proposee.json), six textes de Carnet changent. L'utilisateur les corrige dans Réglages › Émotions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { FAMILLES, motsDeLaRoue } from '../../public/js/domain/roue.js';
import { DEFINITIONS, definition, estCorrigee, corriger } from '../../public/js/domain/definitions-roue.js';
import { trouverInterdits, normaliser } from '../aides/mots-interdits.js';
import { EMPREINTES_PRIVEES } from '../aides/empreintes-privees.js';

const lire = (chemin) => readFileSync(new URL(`../../${chemin}`, import.meta.url), 'utf8');
const PROPOSITION = JSON.parse(lire('docs/superpowers/specs/2026-10-28-carnet-v9/carte-proposee.json'));
const MOTS = motsDeLaRoue();
const IDS = MOTS.map((m) => m.id);
// Les 79 mots de la v8 : les premiers de chaque famille.
const NOMBRE_V8 = { colere: 16, degout: 7, tristesse: 12, joie: 16, surprise: 8, peur: 12, serenite: 8 };
const MOTS_V8 = FAMILLES.flatMap((f) => f.mots.slice(0, NOMBRE_V8[f.cle]));

// Les six textes de Carnet que la v9 change (spec §6 et §13.3), au texte de la v8 : ils contenaient le mot d'une nouvelle
// bulle (Craintif, Accompli, Mécontent, Extasié) ou le sens d'un ajout (Libéré, celui de Soulagé ; Tranquille, celui
// d'Insouciant).
const TEXTES_V8 = {
  'roue:colere:mecontent': 'Pas satisfait de ce qui se passe ou de ce qu\'on a reçu.',
  'roue:joie:accompli': 'Satisfait d\'avoir mené quelque chose au bout.',
  'roue:joie:extasie': 'Émerveillé, transporté de joie.',
  'roue:joie:libere': 'Soulagé d\'un poids, plus léger.',
  'roue:peur:craintif': 'Inquiet de ce qui pourrait arriver, sur la réserve.',
  'roue:serenite:tranquille': 'Sans souci pour l\'instant, rien ne presse.',
};

// Le libellé d'une autre bulle, comme mot entier, sans accents ni casse. Ceux qu'une définition garde, relus : deux textes
// de la v8 qui citent un mot de la v8 (la v9 ne change que six textes) ; « s'agite », le verbe, pas l'adjectif Agité ;
// « bien dans la situation », l'adverbe, dans deux textes de la proposition relus (corrections.md, 12).
const GARDES = {
  'roue:degout:revolte': ['Choqué'],
  'roue:joie:optimiste': ['Confiant'],
  'roue:peur:mal-a-l-aise': ['Bien'],
  'roue:serenite:calme': ['Agité'],
  'roue:serenite:a-l-aise': ['Bien'],
};
const echapper = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const autresBulles = (id, texte) => MOTS.filter((m) => m.id !== id)
  .filter((m) => new RegExp(`(^|[^a-z0-9])${echapper(normaliser(m.libelle))}($|[^a-z0-9])`).test(normaliser(texte))).map((m) => m.libelle);

test('144 définitions, une par mot (Fatigué et Épuisé compris), courtes, sans texte vide ni mot interdit, toutes différentes', () => {
  assert.equal(IDS.length, 144);
  assert.deepEqual(Object.keys(DEFINITIONS).sort(), [...IDS].sort());
  assert.ok(Object.isFrozen(DEFINITIONS));
  for (const m of MOTS) {
    const t = DEFINITIONS[m.id];
    assert.equal(typeof t, 'string', m.id);
    assert.ok(t.trim().length >= 10 && t.length <= 100, `${m.libelle} : ${t.length} signes`);
    assert.match(t, /^\p{Lu}.*\.$/u, `${m.libelle} : une phrase, majuscule et point`);
    assert.equal(t, t.trim());
    assert.deepEqual(trouverInterdits(t), [], `${m.libelle} : ${t}`);
    // Spec v8 §2 : jamais « positif », « négatif », « bon » ni « mauvais » ; aucun conseil, aucun avis clinique.
    assert.doesNotMatch(normaliser(t), /\b(positi|negati|bons?\b|bonnes?\b|mauvais|tu devrais|il faut|essaie|symptome|trouble|diagnostic)/, `${m.libelle} : ${t}`);
    // La définition ne répète pas le mot qu'elle définit.
    assert.ok(!normaliser(t).includes(normaliser(m.libelle)), `${m.libelle} : le mot dans sa définition`);
  }
  assert.equal(new Set(Object.values(DEFINITIONS)).size, 144);
  // L'exemple de la spec v8 §4, mot pour mot.
  assert.equal(DEFINITIONS['roue:colere:irrite'], 'Agacé par quelque chose qui gêne ou qui se répète.');
});

test('aucune définition ne contient le libellé d\'une autre bulle, sauf les cas relus', () => {
  const trouves = Object.fromEntries(IDS.map((id) => [id, autresBulles(id, DEFINITIONS[id])]).filter(([, l]) => l.length));
  assert.deepEqual(trouves, GARDES);
});

test('vie privée : aucune définition ne contient un mot personnel (empreintes)', () => {
  const empreinte = (m) => createHash('sha256').update(m).digest('hex');
  for (const [id, t] of Object.entries(DEFINITIONS)) {
    const mots = normaliser(t).split(/[^a-z0-9]+/).filter((m) => m.length > 2);
    assert.deepEqual(mots.filter((m) => EMPREINTES_PRIVEES.has(empreinte(m))), [], id);
  }
});

test('v9 : six textes de Carnet changent, sans le mot d\'une autre bulle ; les 73 autres de la v8 ne changent pas', () => {
  for (const [id, avant] of Object.entries(TEXTES_V8)) {
    assert.notEqual(DEFINITIONS[id], avant, id);
    assert.deepEqual(autresBulles(id, DEFINITIONS[id]), [], `${id} : ${DEFINITIONS[id]}`);
  }
  // Extasié et Libéré : les textes v9 de la proposition.
  for (const [id, { v8, v9 }] of Object.entries(PROPOSITION.definitionsRoueV9)) {
    assert.equal(v8, TEXTES_V8[id], id);
    assert.equal(DEFINITIONS[id], v9, id);
  }
  // Tranquille laisse à Insouciant le sens de « sans souci ».
  assert.doesNotMatch(normaliser(DEFINITIONS['roue:serenite:tranquille']), /souci/);
  // Les 79 textes de la v8 : la section « Les 79 définitions » de docs/decisions.md, une ligne par mot sous sa famille.
  const doc = lire('docs/decisions.md');
  const debut = doc.indexOf('**Les 79 définitions**');
  assert.ok(debut > 0, 'section des définitions absente');
  const section = doc.slice(debut, doc.indexOf('**Les 8 séances nouvelles**', debut));
  for (const f of FAMILLES) {
    const titre = `#### ${f.libelle} (${NOMBRE_V8[f.cle]})`;
    assert.ok(section.includes(titre), `${titre} absent`);
    const bloc = `${section.slice(section.indexOf(titre)).split('\n\n#### ')[0]}\n`;
    for (const m of f.mots.slice(0, NOMBRE_V8[f.cle])) {
      const v8 = TEXTES_V8[m.id] ?? DEFINITIONS[m.id];
      assert.ok(bloc.includes(`- **${m.libelle}** : ${v8}\n`), `${m.libelle} : texte de la v8 absent de decisions.md`);
    }
  }
  assert.equal((section.match(/^- \*\*/gm) || []).length, 79);
  assert.equal(MOTS_V8.length, 79);
});

test('v9 : les définitions des 65 ajouts viennent de la proposition ; Insouciant a la sienne, écrite pour Carnet', () => {
  const CHANGES = { 'roue:tristesse:fatigue': 'roue:aucune:fatigue', 'roue:tristesse:epuise': 'roue:aucune:epuise' };
  const ajouts = PROPOSITION.mots.filter((m) => m.nouveau && m.id !== 'roue:serenite:ensommeille');
  assert.equal(ajouts.length, 64);
  for (const m of ajouts) assert.equal(DEFINITIONS[CHANGES[m.id] || m.id], m.definition, m.libelle);
  const ensommeille = PROPOSITION.mots.find((m) => m.id === 'roue:serenite:ensommeille');
  assert.ok(DEFINITIONS['roue:serenite:insouciant']);
  assert.notEqual(DEFINITIONS['roue:serenite:insouciant'], ensommeille.definition);
  assert.equal(new Set([...MOTS_V8.map((m) => m.id), ...ajouts.map((m) => CHANGES[m.id] || m.id), 'roue:serenite:insouciant']).size, 144);
});

test('definition : la correction de l\'utilisateur, sinon le texte de Carnet ; une correction vide ou illisible ne compte pas', () => {
  const id = 'roue:colere:irrite';
  assert.equal(definition(id, null), DEFINITIONS[id]);
  assert.equal(definition(id, {}), DEFINITIONS[id]);
  assert.equal(definition(id, { [id]: 'Agacé par un bruit qui revient.' }), 'Agacé par un bruit qui revient.');
  assert.equal(definition(id, { [id]: '  Agacé.  ' }), 'Agacé.');
  for (const illisible of ['', '   ', 12, null, ['Agacé'], { texte: 'Agacé' }]) {
    assert.equal(definition(id, { [id]: illisible }), DEFINITIONS[id], JSON.stringify(illisible));
  }
  for (const corrections of ['texte', 42, [], true]) assert.equal(definition(id, corrections), DEFINITIONS[id]);
  // Un mot sans famille : son texte, ou sa correction.
  assert.equal(definition('roue:aucune:fatigue', null), DEFINITIONS['roue:aucune:fatigue']);
  assert.equal(definition('roue:aucune:fatigue', { 'roue:aucune:fatigue': 'Lourd.' }), 'Lourd.');
  // Une famille seule, un id inconnu : pas de définition.
  assert.equal(definition('roue:colere', { 'roue:colere': 'Un texte.' }), null);
  assert.equal(definition('roue:colere:inconnu', null), null);
  assert.equal(definition('__proto__', null), null);
});

test('definition d\'un mot à soi : la sienne (méta motsPerso), mis de côté compris ; null sans définition ni méta', () => {
  const perso = {
    'roue:perso:u-0a1b2c3d': { libelle: 'Flottant', zone: 'bleu', famille: null, definition: '  Entre deux eaux.  ', archive: false },
    'roue:perso:u-11111111': { libelle: 'À part', zone: 'vert', famille: null, definition: 'Un peu en dehors.', archive: true },
    'roue:perso:u-22222222': { libelle: 'Bizarre', zone: 'rouge', famille: null, definition: null, archive: false },
    'roue:perso:u-33333333': { libelle: 'Vague', zone: 'rouge', famille: null, definition: '   ', archive: false },
  };
  assert.equal(definition('roue:perso:u-0a1b2c3d', null, perso), 'Entre deux eaux.');
  assert.equal(definition('roue:perso:u-0a1b2c3d', {}, perso), 'Entre deux eaux.');
  assert.equal(definition('roue:perso:u-11111111', null, perso), 'Un peu en dehors.');
  assert.equal(definition('roue:perso:u-22222222', null, perso), null);
  assert.equal(definition('roue:perso:u-33333333', null, perso), null);
  assert.equal(definition('roue:perso:u-0a1b2c3d', null), null);
  assert.equal(definition('roue:perso:u-99999999', null, perso), null);
  // La méta ne change pas le texte d'un mot de la roue ; la correction de l'utilisateur passe toujours devant.
  assert.equal(definition('roue:colere:irrite', null, { 'roue:colere:irrite': { libelle: 'Irrité', definition: 'Autre.' } }), DEFINITIONS['roue:colere:irrite']);
  assert.equal(definition('roue:perso:u-0a1b2c3d', { 'roue:perso:u-0a1b2c3d': 'Corrigé.' }, perso), 'Corrigé.');
});

test('corriger : ajoute, remplace, retire (texte vide ou texte de Carnet) sans toucher l\'objet reçu ; estCorrigee le suit', () => {
  const id = 'roue:serenite:calme';
  const avant = Object.freeze({ 'roue:colere:irrite': 'Agacé.' });
  const apres = corriger(avant, id, '  Rien ne presse.  ');
  assert.deepEqual(apres, { 'roue:colere:irrite': 'Agacé.', [id]: 'Rien ne presse.' });
  assert.deepEqual(avant, { 'roue:colere:irrite': 'Agacé.' });
  assert.equal(estCorrigee(id, apres), true);
  assert.equal(estCorrigee('roue:joie:curieux', apres), false);
  for (const retrait of [null, '', '   ', DEFINITIONS[id], ` ${DEFINITIONS[id]} `]) {
    const r = corriger(apres, id, retrait);
    assert.deepEqual(r, { 'roue:colere:irrite': 'Agacé.' }, JSON.stringify(retrait));
    assert.equal(estCorrigee(id, r), false);
  }
  // Rien au départ, une méta illisible : un objet neuf.
  assert.deepEqual(corriger(null, id, 'Posé.'), { [id]: 'Posé.' });
  assert.deepEqual(corriger('texte', id, 'Posé.'), { [id]: 'Posé.' });
  assert.deepEqual(corriger([], id, 'Posé.'), { [id]: 'Posé.' });
  // Un mot ajouté en v9 et un mot sans famille se corrigent comme les autres.
  assert.deepEqual(corriger({}, 'roue:aucune:epuise', 'Vidé.'), { 'roue:aucune:epuise': 'Vidé.' });
  assert.deepEqual(corriger({}, 'roue:joie:fier', 'Content de soi.'), { 'roue:joie:fier': 'Content de soi.' });
  // Un id qui n'est pas un mot de Carnet n'est jamais écrit : une famille seule, un mot à soi (sa définition est la sienne).
  assert.deepEqual(corriger({}, 'roue:colere', 'Un texte.'), {});
  assert.deepEqual(corriger({}, 'roue:perso:u-0a1b2c3d', 'Un texte.'), {});
  // Une correction égale au texte de Carnet n'en est pas une.
  assert.equal(estCorrigee(id, { [id]: DEFINITIONS[id] }), false);
});
