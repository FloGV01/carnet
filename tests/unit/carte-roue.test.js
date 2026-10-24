// v8 (2/9) · L'écran Émotion en carte (spec §4, §12.5) : la place des 79 mots (domain/carte-roue.js) et leurs
// définitions (domain/definitions-roue.js). Deux données pures et figées, qui ne touchent jamais aux relevés.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FAMILLES } from '../../public/js/domain/roue.js';
import { PLACEMENT, ENERGIES, COTES, EXEMPLES, cleZone, zoneDe, motsDeZone } from '../../public/js/domain/carte-roue.js';
import { DEFINITIONS, definition, estCorrigee, corriger } from '../../public/js/domain/definitions-roue.js';
import { trouverInterdits, normaliser } from '../aides/mots-interdits.js';

const MOTS = FAMILLES.flatMap((f) => f.mots.map((m) => ({ ...m, famille: f.cle })));
const IDS = MOTS.map((m) => m.id);

test('79 placements, un par mot de la roue, ni plus ni moins ; colonne et rang de 1 à 6', () => {
  assert.equal(IDS.length, 79);
  assert.deepEqual(Object.keys(PLACEMENT).sort(), [...IDS].sort());
  for (const id of IDS) {
    const { col, rang } = PLACEMENT[id];
    assert.ok(Number.isInteger(col) && col >= 1 && col <= 6, `${id} : colonne ${col}`);
    assert.ok(Number.isInteger(rang) && rang >= 1 && rang <= 6, `${id} : rang ${rang}`);
  }
  assert.ok(Object.isFrozen(PLACEMENT) && Object.isFrozen(PLACEMENT['roue:colere:irrite']), 'figé');
});

test('zoneDe : le côté (colonnes 1-3 à gauche, 4-6 à droite) et la bande (5-6 haute, 3-4 moyenne, 1-2 basse)', () => {
  assert.deepEqual(zoneDe('roue:colere:enrage'), { cote: 'gauche', energie: 'haute' });
  assert.deepEqual(zoneDe('roue:joie:extasie'), { cote: 'droite', energie: 'haute' });
  assert.deepEqual(zoneDe('roue:colere:mecontent'), { cote: 'gauche', energie: 'moyenne' });
  assert.deepEqual(zoneDe('roue:serenite:calme'), { cote: 'droite', energie: 'moyenne' });
  assert.deepEqual(zoneDe('roue:tristesse:vide'), { cote: 'gauche', energie: 'basse' });
  assert.deepEqual(zoneDe('roue:serenite:serein'), { cote: 'droite', energie: 'basse' });
  // Une famille seule (relevé de la v7), un id inconnu ou mal formé : aucune zone.
  for (const id of ['roue:colere', 'roue:colere:inconnu', 'emotion:colere', '', null, undefined, 'constructor', '__proto__']) {
    assert.equal(zoneDe(id), null, String(id));
  }
  for (const id of IDS) {
    const { col, rang } = PLACEMENT[id];
    const z = zoneDe(id);
    assert.equal(z.cote, col <= 3 ? 'gauche' : 'droite', id);
    assert.equal(z.energie, rang >= 5 ? 'haute' : rang >= 3 ? 'moyenne' : 'basse', id);
  }
});

test('« comme How We Feel » : les équivalents clairs prennent leur zone (spec §12.5), les autres le tableau de l\'annexe', () => {
  // Quelques équivalents de la liste How We Feel : enraged, furious, ecstatic, calm, serene, tranquil, guilty, curious.
  assert.deepEqual(PLACEMENT['roue:colere:enrage'], { col: 1, rang: 6 });
  assert.deepEqual(PLACEMENT['roue:colere:furieux'], { col: 1, rang: 5 });
  assert.deepEqual(PLACEMENT['roue:joie:extasie'], { col: 6, rang: 6 });
  assert.deepEqual(PLACEMENT['roue:serenite:calme'], { col: 4, rang: 3 });
  assert.deepEqual(PLACEMENT['roue:serenite:serein'], { col: 6, rang: 1 });
  assert.deepEqual(PLACEMENT['roue:serenite:tranquille'], { col: 4, rang: 1 });
  assert.deepEqual(PLACEMENT['roue:tristesse:fautif'], { col: 1, rang: 2 });
  assert.deepEqual(PLACEMENT['roue:joie:curieux'], { col: 4, rang: 5 });
  // Sans équivalent clair : le tableau §9 de l'annexe (Accablé, le plus ambigu ; Dévasté ; Défiant ; Provocant).
  assert.deepEqual(PLACEMENT['roue:peur:accable'], { col: 1, rang: 3 });
  assert.deepEqual(PLACEMENT['roue:colere:devaste'], { col: 1, rang: 2 });
  assert.deepEqual(PLACEMENT['roue:colere:defiant'], { col: 3, rang: 4 });
  assert.deepEqual(PLACEMENT['roue:joie:provocant'], { col: 4, rang: 5 });
});

test('les six zones de la carte : chaque mot une fois, les mots d\'une famille côte à côte, du plus haut au plus bas', () => {
  const vus = [];
  const comptes = {};
  for (const energie of ENERGIES) {
    for (const cote of COTES) {
      const mots = motsDeZone({ energie, cote });
      comptes[cleZone({ energie, cote })] = mots.length;
      vus.push(...mots);
      for (const id of mots) assert.deepEqual(zoneDe(id), { cote, energie }, id);
      // Les familles forment des taches d'un seul tenant.
      const familles = mots.map((id) => id.split(':')[1]);
      const suites = familles.filter((f, i) => i === 0 || familles[i - 1] !== f);
      assert.equal(new Set(suites).size, suites.length, `${energie} ${cote} : ${familles.join(' ')}`);
      // Dans une famille, le plus haut d'abord.
      for (const f of new Set(familles)) {
        const rangs = mots.filter((id) => id.split(':')[1] === f).map((id) => PLACEMENT[id].rang);
        assert.deepEqual(rangs, [...rangs].sort((a, b) => b - a), `${energie} ${cote} ${f}`);
      }
      // Toujours la même carte.
      assert.deepEqual(motsDeZone({ energie, cote }), mots);
    }
  }
  assert.deepEqual([...vus].sort(), [...IDS].sort());
  assert.deepEqual(comptes, {
    'haute-gauche': 12, 'haute-droite': 9, 'moyenne-gauche': 21, 'moyenne-droite': 12, 'basse-gauche': 20, 'basse-droite': 5,
  });
});

test('les mots d\'exemple des tuiles : deux ou trois, de leur zone, de familles différentes quand la zone en a plusieurs', () => {
  assert.deepEqual(Object.keys(EXEMPLES).sort(), ENERGIES.flatMap((energie) => COTES.map((cote) => cleZone({ energie, cote }))).sort());
  for (const [cle, ids] of Object.entries(EXEMPLES)) {
    assert.ok(ids.length >= 2 && ids.length <= 3, cle);
    for (const id of ids) assert.equal(cleZone(zoneDe(id)), cle, `${id} hors de ${cle}`);
    const familles = new Set(motsDeZone(Object.fromEntries([['energie', cle.split('-')[0]], ['cote', cle.split('-')[1]]])).map((id) => id.split(':')[1]));
    if (familles.size >= ids.length) assert.equal(new Set(ids.map((id) => id.split(':')[1])).size, ids.length, cle);
  }
});

test('79 définitions, une par mot, courtes, sans texte vide ni mot interdit', () => {
  assert.deepEqual(Object.keys(DEFINITIONS).sort(), [...IDS].sort());
  assert.ok(Object.isFrozen(DEFINITIONS));
  for (const m of MOTS) {
    const t = DEFINITIONS[m.id];
    assert.equal(typeof t, 'string', m.id);
    assert.ok(t.trim().length >= 10 && t.length <= 100, `${m.libelle} : ${t.length} signes`);
    assert.match(t, /^\p{Lu}.*\.$/u, `${m.libelle} : une phrase, majuscule et point`);
    assert.equal(t, t.trim());
    assert.deepEqual(trouverInterdits(t), [], `${m.libelle} : ${t}`);
    // Spec §2 : jamais « positif », « négatif », « bon » ni « mauvais » ; aucun conseil, aucun avis clinique.
    assert.doesNotMatch(normaliser(t), /\b(positi|negati|bons?\b|bonnes?\b|mauvais|tu devrais|il faut|essaie|symptome|trouble|diagnostic)/, `${m.libelle} : ${t}`);
    // La définition ne répète pas le mot qu'elle définit.
    assert.ok(!normaliser(t).includes(normaliser(m.libelle)), `${m.libelle} : le mot dans sa définition`);
  }
  // Toutes différentes.
  assert.equal(new Set(Object.values(DEFINITIONS)).size, 79);
  // L'exemple de la spec §4, mot pour mot.
  assert.equal(DEFINITIONS['roue:colere:irrite'], 'Agacé par quelque chose qui gêne ou qui se répète.');
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
  // Une famille seule, un id inconnu : pas de définition.
  assert.equal(definition('roue:colere', { 'roue:colere': 'Un texte.' }), null);
  assert.equal(definition('roue:colere:inconnu', null), null);
  assert.equal(definition('__proto__', null), null);
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
  // Un id qui n'est pas un mot n'est jamais écrit.
  assert.deepEqual(corriger({}, 'roue:colere', 'Un texte.'), {});
  // Une correction égale au texte de Carnet n'en est pas une.
  assert.equal(estCorrigee(id, { [id]: DEFINITIONS[id] }), false);
});
