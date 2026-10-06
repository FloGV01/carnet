import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normaliser, valider, estVide, referencesDe, basculerMultiple, ErreurValidation } from '../../public/js/domain/champs.js';

test('vide devient null, 0 et false sont conservés', () => {
  const { valeur, erreurs } = normaliser('journal', { date: '2026-09-30', notes: '   ', explosions: 0, contactHumain: false, pointsPositifs: undefined });
  assert.deepEqual(erreurs, []);
  assert.equal(valeur.notes, null);
  assert.equal(valeur.explosions, 0);
  assert.equal(valeur.contactHumain, false);
  assert.equal(valeur.pointsPositifs, null);
  assert.equal(valeur.humeur, null);
  assert.ok('lieu' in valeur);
});

test('bornes et types', () => {
  assert.throws(() => valider('journal', { date: '2026-09-30', humeur: 11 }), ErreurValidation);
  assert.throws(() => valider('journal', { date: '2026-09-30', humeur: 6.5 }), ErreurValidation);
  assert.throws(() => valider('journal', { date: '2026-09-30', explosions: -1 }), ErreurValidation);
  assert.throws(() => valider('journal', { date: '2026-09-30', contactHumain: 'oui' }), ErreurValidation);
  assert.throws(() => valider('journal', { date: '2026-02-31' }), ErreurValidation);
  assert.throws(() => valider('journal', {}), ErreurValidation);
  assert.throws(() => valider('journal', { date: '2026-09-30', lieu: 'sommeil:bien' }), /référence invalide/);
  assert.throws(() => valider('journal', { date: '2026-09-30', heureLever: '7h' }), ErreurValidation);
});

test('aucune limite de longueur pour une saisie, mais une à l\'import', () => {
  const long = 'x'.repeat(50000);
  assert.equal(valider('journal', { date: '2026-09-30', notes: long }).notes.length, 50000);
  assert.throws(() => valider('journal', { date: '2026-09-30', notes: long }, { origine: 'import' }), ErreurValidation);
  assert.equal(valider('journal', { date: '2026-09-30', notes: long }, { origine: 'sauvegarde' }).notes.length, 50000);
});

test('texte en NFC, retours à la ligne gardés, extrémités nettoyées', () => {
  const v = valider('journal', { date: '2026-09-30', pointsPositifs: '  été\nmarche  ' });
  assert.equal(v.pointsPositifs, 'été\nmarche');
});

test('questions de rendez-vous et effets secondaires', () => {
  const v = valider('rdv', { id: 'rdv_1', questions: [{ texte: ' Sommeil ? ' }, { texte: '  ' }, { texte: 'Dose', abordee: true }] });
  assert.deepEqual(v.questions, [{ texte: 'Sommeil ?', abordee: false }, { texte: 'Dose', abordee: true }]);
  assert.equal(v.date, null);
  const tr = valider('traitements', { id: 'tr_1', date: '2026-09-30', effetsSecondaires: ['effetSecondaire:somnolence', 'effetSecondaire:somnolence'] });
  assert.deepEqual(tr.effetsSecondaires, ['effetSecondaire:somnolence']);
  assert.deepEqual(referencesDe('traitements', tr), ['effetSecondaire:somnolence']);
});

test('champs inconnus ignorés avec avertissement', () => {
  const r = normaliser('journal', { date: '2026-09-30', bizarre: 1 });
  assert.equal('bizarre' in r.valeur, false);
  assert.equal(r.avertissements.length, 1);
});

test('estVide et « Aucun » exclusif', () => {
  assert.ok(estVide('journal', valider('journal', { date: '2026-09-30' })));
  assert.ok(!estVide('journal', valider('journal', { date: '2026-09-30', explosions: 0 })));
  const ex = new Set(['effetSecondaire:aucun']);
  assert.deepEqual(basculerMultiple(['effetSecondaire:fatigue'], 'effetSecondaire:aucun', ex), ['effetSecondaire:aucun']);
  assert.deepEqual(basculerMultiple(['effetSecondaire:aucun'], 'effetSecondaire:fatigue', ex), ['effetSecondaire:fatigue']);
  assert.equal(basculerMultiple(['effetSecondaire:fatigue'], 'effetSecondaire:fatigue', ex), null);
});

test('v4-v5 : activités et contacts du jour, lignes vides retirées, références imbriquées', () => {
  const { valeur, erreurs } = normaliser('journal', { date: '2026-10-05', activites: [{ type: 'typeSport:marche', duree: 'dureeSport:de_30_a_60' }, { type: null, duree: '' }, { type: 'typeSport:velo' }],
    contacts: [{ avec: ['contactAvec:famille', 'contactAvec:famille'], effet: 'contactEffet:ressourcant' }, { avec: [], effet: null }] });
  assert.deepEqual(erreurs, []);
  assert.deepEqual(valeur.activites, [{ type: 'typeSport:marche', duree: 'dureeSport:de_30_a_60' }, { type: 'typeSport:velo', duree: null }]);
  assert.deepEqual(valeur.contacts, [{ avec: ['contactAvec:famille'], effet: 'contactEffet:ressourcant' }], 'doublon retiré, ligne vide retirée');
  assert.deepEqual(referencesDe('journal', valeur).sort(), ['contactAvec:famille', 'contactEffet:ressourcant', 'dureeSport:de_30_a_60', 'typeSport:marche', 'typeSport:velo']);
  assert.equal(normaliser('journal', { date: '2026-10-05', activites: [{}] }).valeur.activites, null);
  assert.ok(normaliser('journal', { date: '2026-10-05', activites: [{ type: 'lieu:bureau' }] }).erreurs.length > 0);
});

test('v4 : après coup facultatif champ par champ, vide → null, bornes vérifiées', () => {
  const ok = normaliser('episodes', { id: 'e1', date: '2026-10-05', reaction: 'reaction:explosion', apresCoup: { types: ['typeExplosion:colere'], repereA: 6, siJe: ' je sens la chaleur ', alorsJe: 'je sors 5 min' } });
  assert.deepEqual(ok.erreurs, []);
  assert.equal(ok.valeur.apresCoup.siJe, 'je sens la chaleur');
  assert.equal(ok.valeur.apresCoup.pensees, null);
  assert.ok(referencesDe('episodes', ok.valeur).includes('typeExplosion:colere'));
  assert.equal(normaliser('episodes', { id: 'e1', date: '2026-10-05', apresCoup: { pensees: '  ' } }).valeur.apresCoup, null);
  assert.equal(normaliser('episodes', { id: 'e1', date: '2026-10-05', apresCoup: { jour: '2026-10-06' } }).valeur.apresCoup, null, 'le jour seul ne garde pas l\'après coup');
  assert.equal(normaliser('episodes', { id: 'e1', date: '2026-10-05', apresCoup: { jour: '2026-10-06', siJe: 'x' } }).valeur.apresCoup.jour, '2026-10-06');
  assert.ok(normaliser('episodes', { id: 'e1', date: '2026-10-05', apresCoup: { repereA: 11 } }).erreurs.length > 0);
});

test('v4 : humeur du moment, l\'heure seule ne suffit pas à garder un relevé', () => {
  const { valeur, erreurs } = normaliser('humeurs', { id: 'h1', date: '2026-10-05', heure: '10:05', humeur: 6, energie: 'energie:basse' });
  assert.deepEqual(erreurs, []);
  assert.equal(valeur.energie, 'energie:basse');
  assert.equal(estVide('humeurs', normaliser('humeurs', { id: 'h1', date: '2026-10-05', heure: '10:05' }).valeur), true);
});

test('v5 : versContacts transforme le détail v4 en une ligne, sans rien inventer', async () => {
  const { versContacts, resumeContacts } = await import('../../public/js/domain/contacts.js');
  assert.deepEqual(versContacts({ date: 'd', contactAvec: ['contactAvec:famille', 'contactAvec:amis'], contactEffet: 'contactEffet:couteux' }),
    { date: 'd', contacts: [{ avec: ['contactAvec:famille', 'contactAvec:amis'], effet: 'contactEffet:couteux' }] });
  assert.deepEqual(versContacts({ date: 'd', contactAvec: null, contactEffet: null }), { date: 'd' });
  const deja = { date: 'd', contacts: [{ avec: ['contactAvec:amis'], effet: null }] };
  assert.equal(versContacts(deja), deja, 'déjà au format v5 : inchangé');
  const lib = (id) => ({ 'contactAvec:famille': 'Famille', 'contactAvec:amis': 'Amis', 'contactEffet:couteux': 'Coûteux' })[id];
  assert.equal(resumeContacts([{ avec: ['contactAvec:famille', 'contactAvec:amis'], effet: 'contactEffet:couteux' }, { avec: ['contactAvec:amis'], effet: null }], lib),
    'Famille, Amis (Coûteux) · Amis');
});
