import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normaliser, valider, estVide, referencesDe, basculerMultiple, ErreurValidation, VALEURS_HEURES_SOMMEIL, estHeuresSommeil, APRES_COUP,
  sansGratitudesSeules,
} from '../../public/js/domain/champs.js';

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

test('v6 : vers ; v7 : des activités gardent le relevé (spec §4.3) ; v9 : « vers » seul aussi (spec v9 §13.5)', () => {
  const rel = (extra) => normaliser('humeurs', { id: 'h1', date: '2026-10-15', heure: '14:00', ...extra }).valeur;
  assert.equal(rel({ vers: true }).vers, true, 'le champ existe');
  assert.equal(estVide('humeurs', rel({ vers: true })), false, 'v9 : un relevé « vers » seul reste (v6 à v8 : il était vide)');
  assert.equal(estVide('humeurs', rel({ vers: null })), true);
  assert.equal(estVide('humeurs', rel({ faisais: ['activiteMoment:repos'] })), false, 'v7 : des activités seules gardent le relevé');
  assert.equal(estVide('humeurs', rel({ vers: true, faisais: ['activiteMoment:repos'] })), false);
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
  assert.equal(estVide('humeurs', rel({ faisais: ['activiteMoment:repos'] })), false, 'des activités seules gardent le relevé');
  assert.equal(estVide('humeurs', rel({ vers: true, faisais: ['activiteMoment:travail'] })), false);
  assert.equal(estVide('humeurs', rel({ vers: true })), false, 'v9 : « vers » seul garde le relevé (spec v9 §13.5)');
  assert.equal(estVide('humeurs', rel({})), true);
  assert.equal(estVide('humeurs', rel({ emotion: null, humeur: null, energie: null, faisais: null, vers: true })), false);
  assert.equal(estVide('humeurs', rel({ emotion: null, humeur: null, energie: null, faisais: null, vers: null })), true);
  assert.equal(estVide('humeurs', rel({ humeur: 6 })), false, 'un ancien relevé chiffré reste un relevé');
  assert.equal(estVide('humeurs', { id: 'h1', date: '2026-10-20', heure: '14:00', humeur: null, energie: null }), true, 'champ absent d\'un ancien relevé');
});

test('v7 : une séance a pour clés id, date, heure et exercice ; durée en secondes et origine', () => {
  const brut = { id: 'se_1', date: '2026-10-20', heure: '09:05', exercice: ' coherence ', dureeS: 300, origine: 'bien-etre' };
  const { valeur, erreurs, avertissements } = normaliser('seances', brut);
  assert.deepEqual(erreurs, []);
  assert.deepEqual(avertissements, []);
  assert.deepEqual(valeur, { id: 'se_1', date: '2026-10-20', heure: '09:05', exercice: 'coherence', dureeS: 300, origine: 'bien-etre', fin: null, programme: null });
  assert.equal(estVide('seances', valeur), false);
  assert.deepEqual(referencesDe('seances', valeur), []);
  for (const origine of ['bien-etre', 'moment-difficile', 'ressourcer']) assert.equal(valider('seances', { ...brut, origine }).origine, origine);
  for (const origine of ['Bien-être', 'crise', 1, true, ['bien-etre']]) assert.ok(normaliser('seances', { ...brut, origine }).erreurs.some((e) => /^origine : /.test(e)), JSON.stringify(origine));
  assert.equal(valider('seances', { ...brut, dureeS: 0 }).dureeS, 0);
  assert.equal(valider('seances', { ...brut, dureeS: 86400 }).dureeS, 86400);
  for (const dureeS of [-1, 86401, 12.5, '300']) assert.ok(normaliser('seances', { ...brut, dureeS }).erreurs.length > 0, String(dureeS));
  assert.ok(normaliser('seances', { ...brut, exercice: 7 }).erreurs.some((e) => /^exercice : /.test(e)));
  // L'exercice est posé par l'app : obligatoire, comme les clés (spec §6.3).
  for (const exercice of ['   ', '', null, undefined]) {
    assert.deepEqual(normaliser('seances', { ...brut, exercice }).erreurs, ['exercice : absente'], JSON.stringify(exercice));
    assert.throws(() => valider('seances', { ...brut, exercice }), ErreurValidation);
  }
  for (const cle of ['id', 'date', 'heure', 'exercice']) {
    const sans = { ...brut };
    delete sans[cle];
    assert.ok(normaliser('seances', sans).erreurs.length > 0, `${cle} manquant`);
  }
  assert.equal(normaliser('seances', { ...brut, compteur: 3 }).avertissements.length, 1, 'champ inconnu ignoré');
  assert.equal(estVide('seances', valider('seances', { id: 'se_1', date: '2026-10-20', heure: '09:05', exercice: 'coherence' })), true);
});

// ---- v8 ----

test('v8 : heuresSommeil, de 4 (« 4 h ou moins ») à 10 (« 10 h ou plus »), facultatif', () => {
  const nuit = (heuresSommeil) => normaliser('journal', { date: '2026-10-24', heuresSommeil });
  for (const h of [4, 5, 6, 7, 8, 9, 10]) {
    assert.deepEqual(nuit(h).erreurs, [], String(h));
    assert.equal(nuit(h).valeur.heuresSommeil, h);
  }
  for (const h of [3, 11, 0, -1, 6.25, '6', true, [6], { h: 6 }]) {
    assert.ok(nuit(h).erreurs.some((e) => /^heuresSommeil : de 4 à 10 par demi-heure attendu$/.test(e)), JSON.stringify(h));
  }
  assert.throws(() => valider('journal', { date: '2026-10-24', heuresSommeil: 12 }), ErreurValidation);
  assert.equal(nuit(null).valeur.heuresSommeil, null, 'un second toucher l\'efface');
  assert.equal(nuit(undefined).valeur.heuresSommeil, null);
  assert.equal(normaliser('journal', { date: '2026-10-24' }).valeur.heuresSommeil, null, 'une nuit ancienne, sans le champ, se lit vide');
  // Seul, il garde le jour ; à côté, coucher, lever et réveils d'une nuit ancienne restent tels quels.
  assert.equal(estVide('journal', valider('journal', { date: '2026-10-24', heuresSommeil: 7 })), false);
  const ancienne = valider('journal', { date: '2026-10-24', sommeilRessenti: 'sommeil:mal', heureCoucher: '23:30', heureLever: '06:10', reveilsNocturnes: 2 });
  assert.deepEqual([ancienne.heuresSommeil, ancienne.heureCoucher, ancienne.heureLever, ancienne.reveilsNocturnes], [null, '23:30', '06:10', 2]);
  assert.deepEqual(referencesDe('journal', valider('journal', { date: '2026-10-24', heuresSommeil: 6 })), [], 'un nombre, pas une liste');
});

test('v8 : une séance gagne fin (vrai ou rien) et programme (l\'id d\'une séance du Programme, ou rien)', () => {
  const brut = { id: 'se_1', date: '2026-10-24', heure: '09:05', exercice: 'respiration-abdominale', dureeS: 300, origine: 'bien-etre' };
  const seance = (extra) => normaliser('seances', { ...brut, ...extra });
  const faite = seance({ fin: true, programme: ' respiration-abdominale ' });
  assert.deepEqual(faite.erreurs, []);
  assert.deepEqual(faite.avertissements, []);
  assert.equal(faite.valeur.fin, true);
  assert.equal(faite.valeur.programme, 'respiration-abdominale');
  // false veut dire « pas menée au bout », comme l'absence : rien.
  assert.equal(seance({ fin: false }).valeur.fin, null);
  assert.deepEqual(seance({ fin: false }).erreurs, []);
  assert.equal(seance({}).valeur.fin, null, 'une séance v7, sans le champ, n\'est pas « Faite »');
  assert.equal(seance({}).valeur.programme, null, 'une séance v7 n\'est pas du Programme');
  for (const fin of ['oui', 1, 0, [true], { fin: true }]) assert.ok(seance({ fin }).erreurs.some((e) => /^fin : vrai ou vide attendu$/.test(e)), JSON.stringify(fin));
  for (const programme of [7, true, ['respiration-abdominale'], { id: 'x' }]) assert.ok(seance({ programme }).erreurs.some((e) => /^programme : texte attendu$/.test(e)), JSON.stringify(programme));
  assert.equal(seance({ programme: '   ' }).valeur.programme, null);
  assert.throws(() => valider('seances', { ...brut, fin: 'oui' }), ErreurValidation);
  assert.deepEqual(referencesDe('seances', faite.valeur), []);
  // Une cohérence lancée ailleurs que dans le Programme garde sa forme : fin sans programme est valide.
  assert.deepEqual(seance({ exercice: 'coherence', origine: 'moment-difficile', fin: true }).erreurs, []);
});

// ---- v9 ----

// Un mot à soi (spec §9) : accepté seulement s'il est dans la méta `motsPerso`, passée en contexte (perso), mis de côté
// compris. Les mots sans famille (`roue:aucune:…`) sont des mots de la roue.
test('v9 : emotion accepte un mot à soi connu de perso, et seulement lui ; Fatigué et Épuisé sans perso', () => {
  const base = { id: 'h1', date: '2026-11-02', heure: '14:00' };
  const perso = {
    'roue:perso:u-0a1b2c3d': { libelle: 'Flottant', zone: 'bleu', famille: null, definition: null, archive: false, createdAt: 'x' },
    'roue:perso:u-11111111': { libelle: 'De côté', zone: 'rouge', famille: 'peur', definition: null, archive: true, createdAt: 'x' },
    'roue:perso:u-22222222': { libelle: '  ', zone: 'rouge' },
  };
  for (const emotion of ['roue:perso:u-0a1b2c3d', 'roue:perso:u-11111111']) {
    const { valeur, erreurs } = normaliser('humeurs', { ...base, emotion }, { perso });
    assert.deepEqual(erreurs, [], emotion);
    assert.equal(valeur.emotion, emotion);
    assert.equal(estVide('humeurs', valeur), false);
    assert.deepEqual(normaliser('humeurs', { ...base, emotion }, { origine: 'sauvegarde', perso }).erreurs, [], `${emotion} à l'import`);
    // Sans la méta, ou avec une méta illisible : refusé.
    for (const sans of [undefined, null, {}, 'texte', []]) {
      assert.deepEqual(normaliser('humeurs', { ...base, emotion }, { perso: sans }).erreurs, ['emotion : émotion inconnue'], `${emotion} sans méta`);
    }
    assert.deepEqual(normaliser('humeurs', { ...base, emotion }).erreurs, ['emotion : émotion inconnue']);
  }
  for (const emotion of ['roue:perso:u-22222222', 'roue:perso:u-99999999', 'roue:perso:zzz', 'roue:perso']) {
    assert.deepEqual(normaliser('humeurs', { ...base, emotion }, { perso }).erreurs, ['emotion : émotion inconnue'], emotion);
  }
  for (const emotion of ['roue:aucune:fatigue', 'roue:aucune:epuise', 'roue:serenite:insouciant', 'roue:joie:euphorique']) {
    assert.deepEqual(normaliser('humeurs', { ...base, emotion }).erreurs, [], emotion);
  }
  assert.deepEqual(normaliser('humeurs', { ...base, emotion: 'roue:serenite:ensommeille' }).erreurs, ['emotion : émotion inconnue'], 'jamais publié');
  assert.deepEqual(valider('humeurs', { ...base, emotion: 'roue:perso:u-0a1b2c3d' }, { perso }).emotion, 'roue:perso:u-0a1b2c3d');
  assert.throws(() => valider('humeurs', { ...base, emotion: 'roue:perso:u-0a1b2c3d' }), ErreurValidation);
  // Le contexte ne change rien aux autres champs : la limite des textes importés reste celle de l'origine.
  const long = 'x'.repeat(30000);
  assert.ok(normaliser('journal', { date: '2026-11-02', notes: long }, { origine: 'import', perso }).erreurs.length > 0);
  assert.deepEqual(normaliser('journal', { date: '2026-11-02', notes: long }, { origine: 'sauvegarde', perso }).erreurs, []);
});

// ---- v11 ----

test('v11 : heuresSommeil à la demi-heure, 13 valeurs de 4 à 10 ; un autre nombre, un texte ou un booléen sont refusés', () => {
  assert.deepEqual(VALEURS_HEURES_SOMMEIL, [4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10]);
  assert.ok(Object.isFrozen(VALEURS_HEURES_SOMMEIL));
  const nuit = (heuresSommeil) => normaliser('journal', { date: '2026-11-05', heuresSommeil });
  for (const h of [4, 4.5, 7.5, 9.5, 10, ...VALEURS_HEURES_SOMMEIL]) {
    assert.equal(estHeuresSommeil(h), true, String(h));
    assert.deepEqual(nuit(h).erreurs, [], String(h));
    assert.equal(nuit(h).valeur.heuresSommeil, h);
  }
  for (const h of [3.5, 10.5, 7.25, '7', true, NaN, Infinity, -Infinity, 3, 11]) {
    assert.equal(estHeuresSommeil(h), false, String(h));
    assert.deepEqual(nuit(h).erreurs, ['heuresSommeil : de 4 à 10 par demi-heure attendu'], String(h));
    assert.equal(nuit(h).valeur.heuresSommeil, null);
    assert.throws(() => valider('journal', { date: '2026-11-05', heuresSommeil: h }), ErreurValidation, String(h));
  }
  assert.equal(estHeuresSommeil(null), false);
  assert.equal(estHeuresSommeil(undefined), false);
  assert.equal(nuit(null).valeur.heuresSommeil, null, 'vide : rien de noté');
});

test('v11 : gratitudes (journal) et ceQueJeRetiens (épisode), deux textes facultatifs ; seuls, ils gardent leur fiche', () => {
  const soir = normaliser('journal', { date: '2026-11-05', gratitudes: '  Le café partagé avec la voisine.\nMerci au collègue.  ' });
  assert.deepEqual(soir.erreurs, []);
  assert.deepEqual(soir.avertissements, []);
  assert.equal(soir.valeur.gratitudes, 'Le café partagé avec la voisine.\nMerci au collègue.');
  assert.equal(estVide('journal', soir.valeur), false, 'une journée qui n\'a que des gratitudes existe');
  assert.equal(normaliser('journal', { date: '2026-11-05', gratitudes: '   ' }).valeur.gratitudes, null, 'un champ vide est valide');
  assert.equal(normaliser('journal', { date: '2026-11-05' }).valeur.gratitudes, null, 'une journée d\'avant la v11 se lit vide');
  assert.deepEqual(normaliser('journal', { date: '2026-11-05', gratitudes: 12 }).erreurs, ['gratitudes : texte attendu']);

  const ep = { id: 'ep_1', date: '2026-11-05', heure: '18:00' };
  const retenu = normaliser('episodes', { ...ep, ceQueJeRetiens: ' Partir avant que ça monte. ' });
  assert.deepEqual(retenu.erreurs, []);
  assert.deepEqual(retenu.avertissements, []);
  assert.equal(retenu.valeur.ceQueJeRetiens, 'Partir avant que ça monte.');
  assert.equal(retenu.valeur.apresCoup, null, 'à part de l\'Après coup');
  assert.equal(estVide('episodes', retenu.valeur), false);
  assert.equal(normaliser('episodes', ep).valeur.ceQueJeRetiens, null);
  assert.deepEqual(normaliser('episodes', { ...ep, ceQueJeRetiens: ['x'] }).erreurs, ['ceQueJeRetiens : texte attendu']);
  // Il ne fait pas partie des étapes de l'Après coup : écrit dans apresCoup, il est un champ inconnu.
  assert.ok(!('ceQueJeRetiens' in APRES_COUP));
  const dedans = normaliser('episodes', { ...ep, apresCoup: { pensees: 'x', ceQueJeRetiens: 'y' } });
  assert.deepEqual(dedans.avertissements, ['apresCoup.ceQueJeRetiens : champ inconnu ignoré']);
  assert.equal(dedans.valeur.ceQueJeRetiens, null);
});

// v11, vigilance 3 : pour l'Export PSY et la vue soignants, une journée qui n'a que des gratitudes n'existe pas.
test('v11 : sansGratitudesSeules retire une journée qui n\'a que des gratitudes, et elle seule', () => {
  const seule = { date: '2026-09-26', gratitudes: 'merci à la voisine' };
  const avecLieu = { date: '2026-09-27', gratitudes: 'merci à la voisine', lieu: 'lieu:bureau' };
  const traitementSeul = { date: '2026-09-28', traitementPris: 'traitementPris:oui' };
  const traitementEtGratitudes = { ...traitementSeul, date: '2026-09-29', gratitudes: 'merci au collègue' };
  const sansRien = { date: '2026-09-30', lieu: null };
  // Telle qu'en base : tous les champs du schéma, nuls sauf les gratitudes, et ses champs techniques.
  const enBase = { ...valider('journal', { date: '2026-10-01', gratitudes: 'merci au collègue' }), createdAt: '2026-10-01T20:00:00.000Z', updatedAt: '2026-10-01T20:00:00.000Z' };
  const entree = [seule, avecLieu, traitementSeul, traitementEtGratitudes, sansRien, enBase];
  const res = sansGratitudesSeules(entree);
  assert.deepEqual(res, [avecLieu, traitementSeul, traitementEtGratitudes, sansRien]);
  assert.equal(res[0], avecLieu, 'une journée gardée l\'est telle quelle');
  assert.equal(entree.length, 6, 'pur : le journal reçu ne change pas');
  // Une autre saisie, quelle qu'elle soit, garde la journée : 0 et false comptent.
  for (const autre of [{ explosions: 0 }, { contactHumain: false }, { pointsPositifs: 'une marche' }, { notes: 'une note' }, { heuresSommeil: 7.5 }, { pese: ['pese:bruit'] }]) {
    assert.equal(sansGratitudesSeules([{ ...seule, ...autre }]).length, 1, JSON.stringify(autre));
  }
  assert.deepEqual(sansGratitudesSeules([]), []);
});
