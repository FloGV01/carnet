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

// ---- v6 ----

test('v6 : journal ce qui a pesé et rechargé, références de leur liste, doublons retirés', () => {
  const { valeur, erreurs } = normaliser('journal', { date: '2026-10-15', pese: ['pese:bruit', 'pese:bruit', 'pese:trajets'], recharge: ['recharge:calme'] });
  assert.deepEqual(erreurs, []);
  assert.deepEqual(valeur.pese, ['pese:bruit', 'pese:trajets']);
  assert.deepEqual(valeur.recharge, ['recharge:calme']);
  assert.deepEqual(referencesDe('journal', valeur).sort(), ['pese:bruit', 'pese:trajets', 'recharge:calme']);
  const vide = normaliser('journal', { date: '2026-10-15', pese: [], recharge: null }).valeur;
  assert.equal(vide.pese, null);
  assert.equal(vide.recharge, null);
  assert.ok(normaliser('journal', { date: '2026-10-15', pese: ['recharge:calme'] }).erreurs.length > 0, 'une référence d\'une autre liste est refusée');
  assert.equal(estVide('journal', valeur), false);
});

test('v6 : vers vaut true ou null, false devient null', () => {
  const base = { id: 'h1', date: '2026-10-15', heure: '14:00', humeur: 5 };
  assert.equal(normaliser('humeurs', { ...base, vers: true }).valeur.vers, true);
  const faux = normaliser('humeurs', { ...base, vers: false });
  assert.deepEqual(faux.erreurs, []);
  assert.equal(faux.valeur.vers, null);
  assert.equal(normaliser('humeurs', { ...base, vers: null }).valeur.vers, null);
  assert.equal(normaliser('humeurs', base).valeur.vers, null);
  assert.ok(normaliser('humeurs', { ...base, vers: 'oui' }).erreurs.length > 0);
  assert.ok(normaliser('humeurs', { ...base, vers: 1 }).erreurs.length > 0);
});

test('v6 : ce que je faisais, références activiteMoment', () => {
  const { valeur, erreurs } = normaliser('humeurs', { id: 'h1', date: '2026-10-15', heure: '14:00', humeur: 5, faisais: ['activiteMoment:travail', 'activiteMoment:trajet', 'activiteMoment:travail'] });
  assert.deepEqual(erreurs, []);
  assert.deepEqual(valeur.faisais, ['activiteMoment:travail', 'activiteMoment:trajet']);
  assert.deepEqual(referencesDe('humeurs', valeur), ['activiteMoment:travail', 'activiteMoment:trajet']);
  assert.equal(normaliser('humeurs', { id: 'h1', date: '2026-10-15', heure: '14:00', faisais: [] }).valeur.faisais, null);
  assert.ok(normaliser('humeurs', { id: 'h1', date: '2026-10-15', heure: '14:00', faisais: ['pese:bruit'] }).erreurs.length > 0);
});

test('v6 : vers et faisais sont du contexte, seuls ils ne gardent pas un relevé', () => {
  const rel = (extra) => normaliser('humeurs', { id: 'h1', date: '2026-10-15', heure: '14:00', ...extra }).valeur;
  assert.equal(rel({ vers: true }).vers, true, 'le champ existe');
  assert.equal(estVide('humeurs', rel({ vers: true })), true, 'un relevé « vers » seul est vide');
  assert.equal(estVide('humeurs', rel({ faisais: ['activiteMoment:repos'] })), true, 'des activités seules ne gardent pas le relevé');
  assert.equal(estVide('humeurs', rel({ vers: true, faisais: ['activiteMoment:repos'] })), true);
  assert.equal(estVide('humeurs', rel({ vers: true, humeur: 4 })), false);
  assert.equal(estVide('humeurs', rel({ vers: true, energie: 'energie:basse' })), false);
  assert.equal(estVide('humeurs', rel({ faisais: ['activiteMoment:repos'], humeur: 7 })), false);
});

test('v6 : une note a pour clés id, date et heure, et pour seul champ saisi le texte', () => {
  const { valeur, erreurs, avertissements } = normaliser('notes', { id: 'no1', date: '2026-10-15', heure: '21:05', texte: '  rappeler la pharmacie\nmardi  ' });
  assert.deepEqual(erreurs, []);
  assert.deepEqual(avertissements, []);
  assert.deepEqual(valeur, { id: 'no1', date: '2026-10-15', heure: '21:05', texte: 'rappeler la pharmacie\nmardi' });
  assert.equal(estVide('notes', valeur), false);
  assert.equal(normaliser('notes', { id: 'no1', date: '2026-10-15', heure: '21:05', texte: '   ' }).valeur.texte, null);
  assert.equal(estVide('notes', normaliser('notes', { id: 'no1', date: '2026-10-15', heure: '21:05' }).valeur), true);
  for (const cle of ['id', 'date', 'heure']) {
    const brut = { id: 'no1', date: '2026-10-15', heure: '21:05', texte: 'x' };
    delete brut[cle];
    assert.ok(normaliser('notes', brut).erreurs.length > 0, `${cle} manquant`);
  }
  assert.ok(normaliser('notes', { id: 'no1', date: '2026-10-15', heure: '25:00', texte: 'x' }).erreurs.length > 0);
  assert.equal(normaliser('notes', { id: 'no1', date: '2026-10-15', heure: '21:05', texte: 'x', bizarre: 1 }).avertissements.length, 1);
  assert.deepEqual(referencesDe('notes', valeur), []);
});

test('v6 : le lien d\'une question est gardé pour episodes, symptomes et traitements', () => {
  for (const store of ['episodes', 'symptomes', 'traitements']) {
    const { valeur, erreurs, avertissements } = normaliser('rdv', { id: 'r1', questions: [{ texte: 'Parler de ça', abordee: true, lien: { store, id: 'ep_1' } }] });
    assert.deepEqual(erreurs, []);
    assert.deepEqual(avertissements, []);
    assert.deepEqual(valeur.questions, [{ texte: 'Parler de ça', abordee: true, lien: { store, id: 'ep_1' } }]);
  }
  // Sans lien, la question garde sa forme d'avant : pas de clé « lien ».
  const sans = normaliser('rdv', { id: 'r1', questions: [{ texte: 'Dose ?' }, { texte: 'Sommeil ?', lien: null }] });
  assert.deepEqual(sans.valeur.questions, [{ texte: 'Dose ?', abordee: false }, { texte: 'Sommeil ?', abordee: false }]);
  assert.deepEqual(sans.avertissements, []);
  // Le lien est reconstruit : une clé en trop n'est pas conservée.
  const extra = normaliser('rdv', { id: 'r1', questions: [{ texte: 'Q', lien: { store: 'episodes', id: 'ep_1', autre: 1 } }] });
  assert.deepEqual(extra.valeur.questions, [{ texte: 'Q', abordee: false, lien: { store: 'episodes', id: 'ep_1' } }]);
});

test('v6 : un lien invalide est retiré avec un avertissement, la question et le rendez-vous sont gardés', () => {
  const invalides = [
    { store: 'journal', id: 'x' }, { store: 'rdv', id: 'x' }, { store: 'humeurs', id: 'x' }, { store: 'notes', id: 'x' },
    { store: 'episodes', id: '' }, { store: 'episodes', id: '   ' }, { store: 'episodes', id: 12 }, { store: 'episodes' },
    { id: 'ep_1' }, 'ep_1', 7, true, [], {},
  ];
  for (const lien of invalides) {
    const r = normaliser('rdv', { id: 'r1', date: '2026-10-20', questions: [{ texte: 'Dose ?', abordee: true, lien }, { texte: 'Autre' }] });
    assert.deepEqual(r.erreurs, [], JSON.stringify(lien));
    assert.deepEqual(r.valeur.questions, [{ texte: 'Dose ?', abordee: true }, { texte: 'Autre', abordee: false }], JSON.stringify(lien));
    assert.equal(r.avertissements.length, 1, JSON.stringify(lien));
    assert.match(r.avertissements[0], /questions\[0\]\.lien/);
  }
});

test('v6 : le lien d\'une question passe aussi par valider, sans jamais rejeter le rendez-vous', () => {
  const v = valider('rdv', { id: 'r1', questions: [{ texte: 'Q', lien: { store: 'journal', id: 'x' } }] });
  assert.deepEqual(v.questions, [{ texte: 'Q', abordee: false }]);
});

// ---- v7 ----

test('v7 : emotion, un id de la roue (famille ou mot), validé par estEmotion', () => {
  const base = { id: 'h1', date: '2026-10-20', heure: '14:00' };
  for (const id of ['roue:colere', 'roue:colere:irrite', 'roue:peur:sans-valeur', 'roue:serenite:en-securite']) {
    const { valeur, erreurs } = normaliser('humeurs', { ...base, emotion: id });
    assert.deepEqual(erreurs, [], id);
    assert.equal(valeur.emotion, id);
  }
  for (const id of ['roue:colere:inconnu', 'roue:inconnue', 'roue', 'emotion:colere', 'Irrité', 'ROUE:COLERE', 42, true, ['roue:colere'], { id: 'roue:colere' }]) {
    assert.ok(normaliser('humeurs', { ...base, emotion: id }).erreurs.some((e) => /^emotion : /.test(e)), JSON.stringify(id));
  }
  assert.throws(() => valider('humeurs', { ...base, emotion: 'roue:joie:inconnu' }), ErreurValidation);
  assert.equal(normaliser('humeurs', { ...base, emotion: '  ' }).valeur.emotion, null);
  assert.equal(normaliser('humeurs', base).valeur.emotion, null, 'un ancien relevé, sans le champ, se lit vide');
  assert.deepEqual(referencesDe('humeurs', valider('humeurs', { ...base, emotion: 'roue:colere:irrite' })), [], 'la roue n\'est pas une liste');
});

test('v7 : un relevé avec seulement une émotion est valide et n\'est pas vide ; vide quand émotion, humeur, énergie et activités le sont', () => {
  const rel = (extra) => valider('humeurs', { id: 'h1', date: '2026-10-20', heure: '14:00', ...extra });
  assert.equal(estVide('humeurs', rel({ emotion: 'roue:colere' })), false, 'une famille seule');
  assert.equal(estVide('humeurs', rel({ emotion: 'roue:colere:irrite' })), false);
  assert.equal(estVide('humeurs', rel({ emotion: 'roue:colere', vers: true })), false);
  assert.equal(estVide('humeurs', rel({})), true);
  assert.equal(estVide('humeurs', rel({ emotion: null, humeur: null, energie: null, faisais: null, vers: true })), true);
  assert.equal(estVide('humeurs', rel({ humeur: 6 })), false, 'un ancien relevé chiffré reste un relevé');
  assert.equal(estVide('humeurs', { id: 'h1', date: '2026-10-20', heure: '14:00', humeur: null, energie: null }), true, 'champ absent d\'un ancien relevé');
});

test('v7 : une séance a pour clés id, date et heure ; exercice, durée en secondes et origine', () => {
  const brut = { id: 'se_1', date: '2026-10-20', heure: '09:05', exercice: ' coherence ', dureeS: 300, origine: 'bien-etre' };
  const { valeur, erreurs, avertissements } = normaliser('seances', brut);
  assert.deepEqual(erreurs, []);
  assert.deepEqual(avertissements, []);
  assert.deepEqual(valeur, { id: 'se_1', date: '2026-10-20', heure: '09:05', exercice: 'coherence', dureeS: 300, origine: 'bien-etre' });
  assert.equal(estVide('seances', valeur), false);
  assert.deepEqual(referencesDe('seances', valeur), []);
  for (const origine of ['bien-etre', 'moment-difficile', 'ressourcer']) assert.equal(valider('seances', { ...brut, origine }).origine, origine);
  for (const origine of ['Bien-être', 'crise', 1, true, ['bien-etre']]) assert.ok(normaliser('seances', { ...brut, origine }).erreurs.some((e) => /^origine : /.test(e)), JSON.stringify(origine));
  assert.equal(valider('seances', { ...brut, dureeS: 0 }).dureeS, 0);
  assert.equal(valider('seances', { ...brut, dureeS: 86400 }).dureeS, 86400);
  for (const dureeS of [-1, 86401, 12.5, '300']) assert.ok(normaliser('seances', { ...brut, dureeS }).erreurs.length > 0, String(dureeS));
  assert.ok(normaliser('seances', { ...brut, exercice: 7 }).erreurs.length > 0);
  assert.equal(normaliser('seances', { ...brut, exercice: '   ' }).valeur.exercice, null);
  for (const cle of ['id', 'date', 'heure']) {
    const sans = { ...brut };
    delete sans[cle];
    assert.ok(normaliser('seances', sans).erreurs.length > 0, `${cle} manquant`);
  }
  assert.equal(normaliser('seances', { ...brut, compteur: 3 }).avertissements.length, 1, 'champ inconnu ignoré');
  assert.equal(estVide('seances', valider('seances', { id: 'se_1', date: '2026-10-20', heure: '09:05' })), true);
});
