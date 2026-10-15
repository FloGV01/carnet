import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statutRdv, trierRdv, prochainRdv, rdvReference, derniereFois, reprendreQuestion, questionPreecrite } from '../../public/js/domain/soins.js';
import { modeleSoignants } from '../../public/js/export/soignants.js';
import { mettreEnPage } from '../../public/js/export/page-a4.js';
import { analyze } from '../../public/js/analyse/index.js';
import { SEED_V1, seedItems } from '../../public/js/domain/vocabulaire.js';
import { carteLibelles } from '../../public/js/domain/libelles.js';

const rdvs = [
  { id: 'a', date: '2026-09-20' }, { id: 'b', date: '2026-10-14', heure: '10:30' }, { id: 'c', date: null },
  { id: 'd', date: '2026-09-30', heure: '08:00' }, { id: 'e', date: '2026-11-30' },
];

test('statut calculé, jamais stocké : un RDV du jour reste à venir', () => {
  assert.equal(statutRdv(rdvs[0], '2026-09-30'), 'passe');
  assert.equal(statutRdv(rdvs[3], '2026-09-30'), 'a-venir');
  assert.equal(statutRdv(rdvs[2], '2026-09-30'), 'a-venir');
});

test('tri : à venir par date (sans date en dernier), passés du plus récent au plus ancien', () => {
  const t = trierRdv(rdvs, '2026-09-30');
  assert.deepEqual(t.aVenir.map((r) => r.id), ['d', 'b', 'e', 'c']);
  assert.deepEqual(t.passes.map((r) => r.id), ['a']);
});

test('prochain RDV seulement dans les 14 jours', () => {
  assert.equal(prochainRdv(rdvs, '2026-10-01').id, 'b');
  assert.equal(prochainRdv(rdvs.filter((r) => r.id !== 'b'), '2026-10-01'), null);
});

// ---------- v6 · « La dernière fois » et « En parler au rendez-vous » (spec §7.2, §7.3) ----------

const PSY = 'professionnel:psychiatre';
const NEURO = 'professionnel:neuropsychologue';
const suivi = [
  { id: 'r-aout', date: '2026-08-01', professionnel: PSY, compteRendu: 'premier échange' },
  { id: 'r-sept', date: '2026-09-10', heure: '09:00', professionnel: PSY, compteRendu: 'on garde la dose', prochaineEtape: 'revoir dans un mois',
    questions: [{ texte: 'Parler du sommeil', abordee: true }, { texte: 'Les réveils de 4 h', abordee: false, lien: { store: 'episodes', id: 'ep-1' } }] },
  { id: 'r-neuro', date: '2026-09-20', professionnel: NEURO, compteRendu: 'bilan' },
  { id: 'r-oct', date: '2026-10-09', professionnel: PSY, compteRendu: 'point sur le travail' },
  { id: 'r-nov', date: '2026-11-04', professionnel: PSY },
  { id: 'r-fixer', date: null, professionnel: PSY },
];

test('rdvReference : le dernier rendez-vous du même soignant daté avant la date donnée', () => {
  assert.equal(rdvReference(suivi, { professionnel: PSY, avant: '2026-11-04', exclure: 'r-nov' }).id, 'r-oct');
  assert.equal(rdvReference(suivi, { professionnel: NEURO, avant: '2026-11-04' }).id, 'r-neuro');
  // Strictement avant : un rendez-vous du jour donné n'est pas une référence.
  assert.equal(rdvReference(suivi, { professionnel: PSY, avant: '2026-10-09' }).id, 'r-sept');
  assert.equal(rdvReference(suivi, { professionnel: PSY, avant: '2026-08-01' }), null);
  // Le même jour, l'heure départage (comme le tri des passés).
  const deux = [{ id: 'matin', date: '2026-09-01', heure: '09:00', professionnel: PSY }, { id: 'soir', date: '2026-09-01', heure: '17:00', professionnel: PSY }];
  assert.equal(rdvReference(deux, { professionnel: PSY, avant: '2026-09-02' }).id, 'soir');
});

test('rdvReference : un rendez-vous passé qu\'on rouvre ne se cite jamais lui-même', () => {
  // Rouvert, il compte depuis sa propre date : la référence est celui d'avant.
  assert.equal(rdvReference(suivi, { professionnel: PSY, avant: '2026-10-09', exclure: 'r-oct' }).id, 'r-sept');
  // Même compté depuis aujourd'hui, l'identifiant exclu n'est jamais rendu.
  assert.equal(rdvReference(suivi, { professionnel: PSY, avant: '2026-10-15', exclure: 'r-oct' }).id, 'r-sept');
  assert.equal(rdvReference(suivi, { professionnel: PSY, avant: '2026-10-15' }).id, 'r-oct');
});

test('derniereFois : avant sa date, ou avant aujourd\'hui s\'il est « Date à fixer » ; rien sans soignant ni sans rien à montrer', () => {
  const fixer = suivi.find((r) => r.id === 'r-fixer');
  assert.equal(derniereFois(fixer, suivi, '2026-10-15').rdv.id, 'r-oct');
  assert.equal(derniereFois(fixer, suivi, '2026-10-01').rdv.id, 'r-sept');
  const rouvert = derniereFois(suivi.find((r) => r.id === 'r-oct'), suivi, '2026-10-15');
  assert.equal(rouvert.rdv.id, 'r-sept');
  // Seules les questions non abordées, lien compris.
  assert.deepEqual(rouvert.questions, [{ texte: 'Les réveils de 4 h', abordee: false, lien: { store: 'episodes', id: 'ep-1' } }]);
  assert.equal(derniereFois({ id: 'x', date: '2026-11-04', professionnel: null }, suivi, '2026-10-15'), null, 'sans soignant');
  assert.equal(derniereFois({ id: 'x', date: '2026-11-04' }, suivi, '2026-10-15'), null, 'sans soignant');
  const vide = [{ id: 'a', date: '2026-09-01', professionnel: PSY, questions: [{ texte: 'déjà vue', abordee: true }] }, { id: 'b', date: '2026-10-20', professionnel: PSY }];
  assert.equal(derniereFois(vide[1], vide, '2026-10-15'), null, 'rien à montrer');
  assert.equal(derniereFois(vide[1], [vide[1]], '2026-10-15'), null, 'aucune référence');
});

test('vue soignants : « Depuis le RDV » et la prochaine étape viennent de la même référence', () => {
  const items = seedItems(SEED_V1, 'x');
  const data = { journal: [{ date: '2026-10-01', humeur: 6 }], episodes: [], symptomes: [], traitements: [] };
  const aujourdhui = '2026-10-15';
  const m = modeleSoignants(data, { aujourdhui, carte: carteLibelles(items), analyse: analyze(data, { aujourdhui, items }), professionnel: PSY, prenom: '', rdvs: suivi });
  assert.ok(m.colonnes.includes('Depuis le RDV du 09/10'));
  assert.equal(m.rdv.prochaineEtape, null, 'la référence (09/10) n\'a pas de prochaine étape');
  const m2 = modeleSoignants(data, { aujourdhui: '2026-10-01', carte: carteLibelles(items), analyse: analyze(data, { aujourdhui: '2026-10-01', items }), professionnel: PSY, prenom: '', rdvs: suivi });
  assert.equal(m2.rdv.prochaineEtape, 'revoir dans un mois');
  assert.ok(m2.colonnes.includes('Depuis le RDV du 10/09'));
});

test('PDF : une question liée ne montre que son texte', () => {
  const items = seedItems(SEED_V1, 'x');
  const data = { journal: [{ date: '2026-10-01', humeur: 6 }], episodes: [], symptomes: [], traitements: [] };
  const aujourdhui = '2026-10-15';
  const rdvs = [{ id: 'r-nov', date: '2026-11-04', professionnel: PSY,
    questions: [{ texte: 'Épisode du sam 3/10, 18 h · Colère 8/10', abordee: false, lien: { store: 'episodes', id: 'ep-lie-42' } }] }];
  const m = modeleSoignants(data, { aujourdhui, carte: carteLibelles(items), analyse: analyze(data, { aujourdhui, items }), professionnel: PSY, prenom: '', rdvs });
  assert.deepEqual(m.rdv.questions, ['Épisode du sam 3/10, 18 h · Colère 8/10']);
  const textes = mettreEnPage(m).ops.filter((o) => o.type === 'texte').map((o) => o.texte).join('\n');
  assert.ok(textes.includes('· Épisode du sam 3/10, 18 h · Colère 8/10'));
  assert.ok(!/ep-lie-42|episodes|lien/.test(textes) && !JSON.stringify(m).includes('ep-lie-42'));
});

test('reprendreQuestion : copiée une fois, lien compris, sans toucher l\'original', () => {
  const origine = suivi.find((r) => r.id === 'r-sept');
  const avant = JSON.stringify(origine);
  const q = origine.questions[1];
  const cible = { id: 'r-nov', questions: [{ texte: 'Parler du travail', abordee: true }] };
  const apres = reprendreQuestion(cible, q);
  assert.deepEqual(apres, [{ texte: 'Parler du travail', abordee: true }, { texte: 'Les réveils de 4 h', abordee: false, lien: { store: 'episodes', id: 'ep-1' } }]);
  assert.notEqual(apres[1].lien, q.lien, 'le lien est une copie');
  // Une seconde fois : aucun doublon, même avec des espaces autour du texte.
  assert.deepEqual(reprendreQuestion({ questions: apres }, q), apres);
  assert.deepEqual(reprendreQuestion({ questions: apres }, { texte: '  Les réveils de 4 h ', abordee: false }), apres);
  // Sans question sur la cible ; sans lien, aucune clé lien.
  assert.deepEqual(reprendreQuestion({}, { texte: 'Effets du matin', abordee: false }), [{ texte: 'Effets du matin', abordee: false }]);
  assert.equal(JSON.stringify(origine), avant);
});

const carte = carteLibelles(seedItems(SEED_V1, 'x'));
const PRIVE = ['situation privée', 'aide privée', 'contexte privé', 'note privée', 'notes privées'];
const sansPrive = (t) => PRIVE.every((p) => !t.includes(p));

test('questionPreecrite : épisode, les choix seulement (jamais la situation ni ce qui a aidé)', () => {
  const ep = { id: 'ep-1', date: '2026-10-03', heure: '18:00', emotion: 'emotion:colere', intensite: 8, reaction: 'reaction:explosion',
    situation: 'situation privée', ceQuiAAide: 'aide privée', apresCoup: { pensees: 'note privée', types: ['typeExplosion:colere'] } };
  const q = questionPreecrite(ep, { store: 'episodes', carte });
  assert.equal(q, 'Épisode du sam 3/10, 18 h · Colère 8/10 · Explosion');
  assert.ok(sansPrive(q));
  // Une heure avant 4 h : le jour logique (la veille) ; les minutes sont gardées.
  assert.equal(questionPreecrite({ date: '2026-10-04', heure: '01:30', intensite: 6 }, { store: 'episodes', carte }), 'Épisode du sam 3/10, 1 h 30 · 6/10');
  assert.equal(questionPreecrite({ date: '2026-10-03', emotion: 'emotion:honte' }, { store: 'episodes', carte }), 'Épisode du sam 3/10 · Honte');
});

test('questionPreecrite : symptôme, les choix seulement', () => {
  const sy = { id: 'sy-1', date: '2026-10-12', symptome: 'symptome:ruminations', intensite: 6, duree: 'duree:quelques_heures', contexte: 'contexte privé', note: 'note privée' };
  const q = questionPreecrite(sy, { store: 'symptomes', carte });
  assert.equal(q, 'Symptôme du lun 12/10 · Ruminations 6/10 · Quelques heures');
  assert.ok(sansPrive(q));
});

test('questionPreecrite : traitement, le changement coupé à 60 caractères, jamais les notes', () => {
  const changement = 'Dose du soir augmentée, à prendre au coucher, pendant trois semaines puis point';
  assert.ok(changement.length > 60);
  const tr = { id: 'tr-1', date: '2026-10-12', changement, effetRessenti: 'effetRessenti:moins_bien', effetsSecondaires: ['effetSecondaire:somnolence', 'effetSecondaire:vertiges'], notes: 'notes privées' };
  const q = questionPreecrite(tr, { store: 'traitements', carte });
  const [debut, coupe, ...reste] = q.split(' · ');
  assert.equal(debut, 'Traitement du 12/10');
  assert.equal(coupe.length, 60);
  assert.ok(coupe.endsWith('…') && changement.startsWith(coupe.slice(0, -1)));
  assert.deepEqual(reste, ['Moins bien', 'Somnolence, Vertiges']);
  assert.ok(sansPrive(q));
  // Un changement court reste entier ; ses retours à la ligne deviennent des espaces.
  assert.equal(questionPreecrite({ date: '2026-10-02', changement: 'Arrêt du\nmatin', effetRessenti: 'effetRessenti:mieux' }, { store: 'traitements', carte }), 'Traitement du 2/10 · Arrêt du matin · Mieux');
  assert.equal(questionPreecrite({ date: '2026-10-02' }, { store: 'traitements', carte }), 'Traitement du 2/10');
});
