import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reperesTraitement, numeroCercle } from '../../public/js/analyse/reperes.js';
import { frise } from '../../public/js/analyse/frise.js';
import { addDays } from '../../public/js/domain/dates.js';

// v6 · Repères de traitement (spec §3). Textes inventés : jamais un vrai médicament.
const fiche = (id, date, changement, extra = {}) => ({ id, date, changement, effetsSecondaires: [], effetRessenti: null, notes: null, ...extra });
const jours = (du, n) => frise({}, du, addDays(du, n - 1)).colonnes;
// Trois semaines, du lundi 28/09 au dimanche 18/10.
const semaines = [
  { cle: '2026-09-28', du: '2026-09-28', au: '2026-10-04' },
  { cle: '2026-10-05', du: '2026-10-05', au: '2026-10-11' },
  { cle: '2026-10-12', du: '2026-10-12', au: '2026-10-18' },
];

test('seules les fiches dont le changement est rempli ont un repère', () => {
  const r = reperesTraitement([
    fiche('a', '2026-10-06', null, { effetRessenti: 'effetRessenti:moins_bien' }),
    fiche('b', '2026-10-07', ''),
    fiche('c', '2026-10-08', '   '),
    fiche('d', '2026-10-09', 'passage à la dose du soir'),
  ], semaines);
  assert.deepEqual(r.legende.map((l) => l.id), ['d']);
  assert.deepEqual(r.traits.map((t) => t.etiquette), ['①']);
});

test('numérotation dans l\'ordre chronologique des repères visibles', () => {
  const r = reperesTraitement([
    fiche('tard', '2026-10-14', 'retour à la dose initiale'),
    fiche('avant', '2026-09-20', 'hors de la période'), // avant la première colonne : ni trait, ni numéro
    fiche('tot', '2026-09-29', 'ajout d\'une prise le matin'),
    fiche('apres', '2026-10-19', 'après la dernière colonne'),
    fiche('milieu', '2026-10-07', 'passage à la dose du soir'),
  ], semaines);
  assert.deepEqual(r.legende.map((l) => [l.id, l.numero, l.symbole]), [['tot', 1, '①'], ['milieu', 2, '②'], ['tard', 3, '③']]);
  assert.deepEqual(r.traits.map((t) => [t.i, t.cle, t.etiquette]), [[0, '2026-09-28', '①'], [1, '2026-10-05', '②'], [2, '2026-10-12', '③']]);
});

test('le même jour : l\'ordre de création départage', () => {
  const r = reperesTraitement([
    fiche('deux', '2026-10-07', 'second ajustement', { createdAt: '2026-10-07T20:00:00.000Z' }),
    fiche('un', '2026-10-07', 'premier ajustement', { createdAt: '2026-10-07T08:00:00.000Z' }),
  ], semaines);
  assert.deepEqual(r.legende.map((l) => l.id), ['un', 'deux']);
});

test('deux changements dans la même colonne : un seul trait « ①–② » ; trois : « ①–③ »', () => {
  const r = reperesTraitement([
    fiche('a', '2026-10-05', 'passage à la dose du soir'),
    fiche('b', '2026-10-09', 'ajout d\'une prise le matin'),
    fiche('c', '2026-10-13', 'retour à la dose initiale'),
  ], semaines);
  assert.deepEqual(r.traits, [{ i: 1, cle: '2026-10-05', numeros: [1, 2], etiquette: '①–②' }, { i: 2, cle: '2026-10-12', numeros: [3], etiquette: '③' }]);
  assert.equal(r.legende.length, 3, 'la légende garde une ligne par changement');
  const trois = reperesTraitement([fiche('a', '2026-10-12', 'un'), fiche('b', '2026-10-14', 'deux'), fiche('c', '2026-10-18', 'trois')], semaines);
  assert.deepEqual(trois.traits.map((t) => t.etiquette), ['①–③']);
  // Par jour : deux changements le même jour se fondent aussi.
  const parJour = reperesTraitement([fiche('a', '2026-10-13', 'un'), fiche('b', '2026-10-13', 'deux'), fiche('c', '2026-10-14', 'trois')], jours('2026-10-08', 7));
  assert.deepEqual(parJour.traits.map((t) => [t.cle, t.etiquette]), [['2026-10-13', '①–②'], ['2026-10-14', '③']]);
});

test('légende « ① 12/10 · changement : … », le texte coupé à 80 caractères', () => {
  const long = 'passage à la dose du soir puis retour progressif à la dose du matin, en deux semaines, selon ce qui a été convenu';
  const r = reperesTraitement([fiche('a', '2026-10-12', 'passage à la dose du soir'), fiche('b', '2026-10-13', `${long}\n\nsuite`)], semaines);
  assert.equal(r.legende[0].texte, '① 12/10 · changement : passage à la dose du soir');
  const texte = r.legende[1].texte.slice('② 13/10 · changement : '.length);
  assert.ok(r.legende[1].texte.startsWith('② 13/10 · changement : passage'));
  assert.equal(texte.length, 80);
  assert.ok(texte.endsWith('…'));
  assert.equal(texte.slice(0, 79), long.slice(0, 79));
  // Exactement 80 caractères : rien n'est coupé.
  const juste = 'a'.repeat(80);
  assert.equal(reperesTraitement([fiche('c', '2026-10-12', juste)], semaines).legende[0].texte, `① 12/10 · changement : ${juste}`);
});

test('PDF : seuls les changements qui ont une ligne sont numérotés et tracés', () => {
  const fiches = [
    fiche('a', '2026-09-29', 'ajout d\'une prise le matin'),
    fiche('b', '2026-10-06', 'passage à la dose du soir'),
    fiche('c', '2026-10-08', 'retour à la dose initiale'),
    fiche('d', '2026-10-13', 'essai d\'un horaire décalé'),
  ];
  const r = reperesTraitement(fiches, semaines, { lignes: ['c', 'd', 'x'] });
  assert.deepEqual(r.legende.map((l) => [l.id, l.symbole]), [['c', '①'], ['d', '②']], 'numérotés entre eux, dans l\'ordre chronologique');
  assert.deepEqual(r.traits.map((t) => t.etiquette), ['①', '②'], 'b, dans la même semaine que c, n\'est pas tracé');
  assert.deepEqual(reperesTraitement(fiches, semaines, { lignes: [] }), { traits: [], legende: [] });
});

test('chaque numéro d\'un trait a sa ligne de légende, et réciproquement', () => {
  const fiches = Array.from({ length: 9 }, (_, k) => fiche(`f${k}`, `2026-10-${String(5 + k).padStart(2, '0')}`, `ajustement ${k}`));
  const r = reperesTraitement(fiches, semaines);
  assert.deepEqual(r.traits.flatMap((t) => t.numeros), r.legende.map((l) => l.numero));
  assert.deepEqual(r.traits.map((t) => t.etiquette), ['①–⑦', '⑧–⑨']);
});

test('numéros cerclés : ① à ㊿, puis entre parenthèses', () => {
  assert.equal(numeroCercle(1), '①');
  assert.equal(numeroCercle(20), '⑳');
  assert.equal(numeroCercle(21), '㉑');
  assert.equal(numeroCercle(35), '㉟');
  assert.equal(numeroCercle(36), '㊱');
  assert.equal(numeroCercle(50), '㊿');
  assert.equal(numeroCercle(51), '(51)');
});

test('sans fiche, sans colonne ou sans date : aucun repère', () => {
  assert.deepEqual(reperesTraitement([], semaines), { traits: [], legende: [] });
  assert.deepEqual(reperesTraitement(undefined, semaines), { traits: [], legende: [] });
  assert.deepEqual(reperesTraitement([fiche('a', '2026-10-06', 'un')], []), { traits: [], legende: [] });
  assert.deepEqual(reperesTraitement([fiche('a', undefined, 'un'), null], semaines), { traits: [], legende: [] });
});

test('l\'Analyse donne les repères de chaque période, sur les colonnes de sa frise', async () => {
  const { analyze } = await import('../../public/js/analyse/index.js');
  const { SEED_V1, seedItems } = await import('../../public/js/domain/vocabulaire.js');
  const traitements = [fiche('a', '2026-10-13', 'passage à la dose du soir'), fiche('b', '2026-08-03', 'ajout d\'une prise le matin'), fiche('c', '2026-10-16', 'demain')];
  const r = analyze({ journal: [{ date: '2026-06-01', humeur: 5 }], episodes: [], symptomes: [], traitements, humeurs: [] }, { aujourdhui: '2026-10-15', items: seedItems(SEED_V1, 'x') });
  assert.deepEqual(r.reperesTraitement['7'].legende.map((l) => l.texte), ['① 13/10 · changement : passage à la dose du soir']);
  assert.deepEqual(r.reperesTraitement['90'].legende.map((l) => l.id), ['b', 'a']);
  for (const f of ['7', '30', '90', 'tout']) {
    for (const t of r.reperesTraitement[f].traits) assert.equal(r.frise[f].colonnes[t.i].cle, t.cle, f);
  }
});
