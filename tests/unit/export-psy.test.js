import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportPsy, reperesPsy } from '../../public/js/export/psy.js';
import { SEED_V1, SEED_V2_AJOUTS, SEED_V4_AJOUTS, seedItems } from '../../public/js/domain/vocabulaire.js';
import { carteLibelles } from '../../public/js/domain/libelles.js';

const carte = carteLibelles(seedItems(SEED_V1, 'x'));
const J = (date, o) => ({ date, lieu: null, sommeilRessenti: null, humeur: null, contactHumain: null, sportMouvement: null, explosions: null,
  traitementPris: null, pointsPositifs: null, heureCoucher: null, heureLever: null, reveilsNocturnes: null, notes: null, ...o });

// Données fictives de l'exemple du plan (§7.8).
const journal = [
  J('2026-09-14', { humeur: 5, explosions: 1, lieu: 'lieu:bureau' }), J('2026-09-15', { humeur: 5, explosions: 1 }),
  J('2026-09-16', { humeur: 6, explosions: 1 }), J('2026-09-17', { humeur: 5, explosions: 0 }), J('2026-09-18', { humeur: 6, explosions: 0, lieu: 'lieu:teletravail' }),
  J('2026-09-21', { lieu: 'lieu:bureau', sommeilRessenti: 'sommeil:mal', reveilsNocturnes: 2, humeur: 5, contactHumain: true, sportMouvement: false, explosions: 1,
    pointsPositifs: "café avec Léo, point projet qui s'est bien passé", notes: "open space très bruyant l'après-midi", traitementPris: 'traitementPris:oui' }),
  J('2026-09-22', { lieu: 'lieu:teletravail', sommeilRessenti: 'sommeil:moyen', humeur: 6, contactHumain: false, sportMouvement: true, explosions: 0, pointsPositifs: 'marche de 40 min au soleil' }),
  J('2026-09-23', { lieu: 'lieu:bureau', sommeilRessenti: 'sommeil:bien', heureCoucher: '23:10', heureLever: '06:40', humeur: 7, contactHumain: true, sportMouvement: false, explosions: 0,
    pointsPositifs: "bloc 7h-9h tenu, déjeuner avec l'équipe" }),
  J('2026-09-25', { lieu: 'lieu:teletravail', sommeilRessenti: 'sommeil:mal', reveilsNocturnes: 3, humeur: 4, contactHumain: false, sportMouvement: false, explosions: 1, pointsPositifs: "j'ai tenu aujourd'hui" }),
  J('2026-09-26', { lieu: 'lieu:conge_repos', sommeilRessenti: 'sommeil:moyen', humeur: 7, contactHumain: true, sportMouvement: true, explosions: 0, pointsPositifs: 'repas en famille' }),
  J('2026-09-27', { lieu: 'lieu:conge_repos', sommeilRessenti: 'sommeil:bien', humeur: 8, contactHumain: true, sportMouvement: true, explosions: 0, pointsPositifs: 'vélo, bonne soirée' }),
];
const episodes = [
  { id: 'e1', date: '2026-09-21', heure: '14:30', emotion: 'emotion:colere', intensite: 8, declencheur: 'declencheur:pris_pour_un_con', dessous: 'dessous:injustice',
    reaction: 'reaction:explosion', situation: "remarque sur mon retard devant toute l'équipe", ceQuiAAide: 'sortir marcher 10 min' },
  { id: 'e2', date: '2026-09-25', heure: '18:10', emotion: 'emotion:surcharge', intensite: 6, declencheur: 'declencheur:trop_sollicitations', dessous: 'dessous:fatigue_debordement',
    reaction: 'reaction:retrait_isolement', situation: null, ceQuiAAide: null },
];
const symptomes = [{ id: 's1', date: '2026-09-25', symptome: 'symptome:ruminations', intensite: 6, duree: 'duree:quelques_heures', contexte: "après les échanges de l'après-midi", note: null }];
const reperes = [
  'Plus présent dans mes journées à 7 ou plus : une journée au bureau (15 sur 22, contre 1 sur 11 journées à 4 ou moins).',
  "Sommeil et humeur : une nuit notée Mal va avec une humeur plus basse le jour même (4,9 contre 6,8 après une nuit Bien). Le lendemain, pas d'écart net.",
];

const ATTENDU = `SUIVI APP · 7 jours du lun 21/09 au dim 27/09/2026

JOURS
lun 21/09 · Bureau · nuit Mal (2 réveils) · humeur du soir 5 · contact oui · sport non · explosions 1
  + café avec Léo, point projet qui s'est bien passé
  note : open space très bruyant l'après-midi
mar 22/09 · Télétravail · nuit Moyen · humeur du soir 6 · contact non · sport oui · explosions 0
  + marche de 40 min au soleil
mer 23/09 · Bureau · nuit Bien · coucher 23:10 lever 06:40 · humeur du soir 7 · contact oui · sport non · explosions 0
  + bloc 7h-9h tenu, déjeuner avec l'équipe
ven 25/09 · Télétravail · nuit Mal (3 réveils) · humeur du soir 4 · contact non · sport non · explosions 1
  + j'ai tenu aujourd'hui
sam 26/09 · Congé / repos · nuit Moyen · humeur du soir 7 · contact oui · sport oui · explosions 0
  + repas en famille
dim 27/09 · Congé / repos · nuit Bien · humeur du soir 8 · contact oui · sport oui · explosions 0
  + vélo, bonne soirée

ÉPISODES (2)
lun 21/09 14:30 · Colère 8/10 · déclencheur : Me sentir pris pour un con · dessous : Injustice · réaction : Explosion
  situation : remarque sur mon retard devant toute l'équipe
  a aidé : sortir marcher 10 min
ven 25/09 18:10 · Surcharge 6/10 · déclencheur : Trop de sollicitations · dessous : Fatigue / débordement · réaction : Retrait / isolement

SYMPTÔMES (1)
ven 25/09 · Ruminations 6/10 · durée : Quelques heures · contexte : après les échanges de l'après-midi

COMPTEURS
cette semaine : humeur moyenne 6,2 (de 4 à 8) · explosions 2 · jours au bureau 2 · contact humain 4 jours · sport 3 jours · nuits Mal 2
semaine d'avant : humeur moyenne 5,4 · explosions 3 · jours au bureau 1

REPÈRES DE L'APP (tout l'historique)
- Plus présent dans mes journées à 7 ou plus : une journée au bureau (15 sur 22, contre 1 sur 11 journées à 4 ou moins).
- Sommeil et humeur : une nuit notée Mal va avec une humeur plus basse le jour même (4,9 contre 6,8 après une nuit Bien). Le lendemain, pas d'écart net.

PSY : fais-moi le récap de la semaine, format habituel.`;

test('instantané exact de l\'exemple du plan', () => {
  assert.equal(exportPsy({ journal, episodes, symptomes }, { aujourdhui: '2026-09-27', carte, reperes }), ATTENDU);
});

test('exclusions : ni traitement, ni rendez-vous, ni jour manquant mentionné', () => {
  const t = exportPsy({ journal, episodes, symptomes }, { aujourdhui: '2026-09-27', carte, reperes: [] });
  assert.ok(!/traitement|rendez-vous|RDV|jeu 24\/09|jours? (notés|remplis)|\/7\b/i.test(t), t);
});

test('textes coupés à 280 caractères, rubriques vides omises', () => {
  const long = 'a'.repeat(400);
  const t = exportPsy({ journal: [J('2026-09-27', { pointsPositifs: long })], episodes: [], symptomes: [] }, { aujourdhui: '2026-09-27', carte });
  assert.ok(t.includes(`  + ${'a'.repeat(279)}…`));
  assert.ok(!t.includes('ÉPISODES') && !t.includes('SYMPTÔMES'));
});

test('repères : insuffisant et phrases en voix « je »', () => {
  const analyse = { bonnesJournees: { statut: 'insuffisant', constats: [] }, sommeil: { meme: { statut: 'insuffisant' }, lendemain: { statut: 'insuffisant' } } };
  assert.deepEqual(reperesPsy(analyse, carte), ['Bonnes journées : pas encore assez de données.', 'Sommeil et humeur : pas encore assez de données pour le dire.']);
  const avecTendance = { ...analyse, tendances: { statut: 'ok', constat: { sens: 'bas', moyR: 4.6, moyB: 6.1 } } };
  assert.equal(reperesPsy(avecTendance, carte)[2], "Tendances (4 dernières semaines contre les 8 d'avant) : mon humeur est plus basse : 4,6 en moyenne, contre 6,1.");
});

// ---------- v6 : humeur du jour ----------

const releve = (date, heure, humeur, o = {}) => ({ id: `${date}-${heure}`, date, heure, humeur, energie: null, ...o });

test('v6 : un jour avec relevés dit « humeur 5,6 (de 3 à 8) », jamais son humeur du soir', () => {
  const j = [J('2026-09-26', { humeur: 9, lieu: 'lieu:bureau' }), J('2026-09-27', { humeur: 6 })];
  const humeurs = [releve('2026-09-26', '09:00', 3), releve('2026-09-26', '12:00', 5), releve('2026-09-26', '15:00', 6, { vers: true }),
    releve('2026-09-26', '19:00', 6), releve('2026-09-27', '01:00', 8)];
  const t = exportPsy({ journal: j, episodes: [], symptomes: [], humeurs }, { aujourdhui: '2026-09-27', carte });
  assert.ok(t.includes('sam 26/09 · Bureau · humeur 5,6 (de 3 à 8)\n'), t);
  assert.ok(t.includes('dim 27/09 · humeur du soir 6\n'), t);
  assert.ok(!t.includes('humeur 9') && !t.includes('soir 9'), 'le soir n\'est jamais mêlé aux relevés');
  // La liste des relevés ne change pas.
  assert.ok(t.includes('  humeur du moment : 09:00 3 · 12:00 5 · '), t);
  assert.ok(t.includes('cette semaine : humeur moyenne 5,8 (de 3 à 8)'), t);
});

test('v6 : un seul relevé, ou des relevés égaux, sans « de … à … » ; un jour qui n\'a que des relevés a sa ligne', () => {
  const humeurs = [releve('2026-09-25', '10:00', 7), releve('2026-09-26', '10:00', 4), releve('2026-09-26', '18:00', 4)];
  const t = exportPsy({ journal: [], episodes: [], symptomes: [], humeurs }, { aujourdhui: '2026-09-27', carte });
  assert.ok(t.includes('ven 25/09 · humeur 7\n'), t);
  assert.ok(t.includes('sam 26/09 · humeur 4\n'), t);
});

test('v6 : un jour qui n\'a que des relevés ne compte jamais « 0 explosion »', () => {
  const humeurs = [releve('2026-09-26', '10:00', 4), releve('2026-09-26', '18:00', 6)];
  const t = exportPsy({ journal: [], episodes: [], symptomes: [], humeurs }, { aujourdhui: '2026-09-27', carte, zeroDepuis: '2026-01-01' });
  assert.ok(!/explosion/.test(t), t);
  assert.ok(t.includes('cette semaine : humeur moyenne 5 (de 4 à 6)'), t);
  // Un jour noté le soir garde son 0, lui.
  const avecSoir = exportPsy({ journal: [J('2026-09-27', { lieu: 'lieu:bureau' })], episodes: [], symptomes: [], humeurs }, { aujourdhui: '2026-09-27', carte, zeroDepuis: '2026-01-01' });
  assert.ok(avecSoir.includes('humeur moyenne 5 (de 4 à 6) · explosions 0 ·'), avecSoir);
});

// ---------- v6 : ce qui a pesé, ce qui a rechargé ----------

const carteV6 = carteLibelles(seedItems({ ...SEED_V1, ...SEED_V4_AJOUTS }, 'x'));
const exportJour = (o) => exportPsy({ journal: [J('2026-09-27', o)], episodes: [], symptomes: [] }, { aujourdhui: '2026-09-27', carte: carteV6 });

test('v6 : la ligne du jour ajoute « a pesé : … · a rechargé : … », après les explosions', () => {
  const t = exportJour({ lieu: 'lieu:bureau', explosions: 1, pese: ['pese:bruit', 'pese:trajets'], recharge: ['recharge:calme'] });
  assert.ok(t.includes('dim 27/09 · Bureau · explosions 1 · a pesé : bruit, trajets · a rechargé : calme\n'), t);
});

test('v6 : une seule des deux listes, ou un jour qui n\'a que cela, garde une ligne juste', () => {
  assert.ok(exportJour({ pese: ['pese:demarches'] }).includes('dim 27/09 · a pesé : démarches\n'));
  const recharge = exportJour({ recharge: ['recharge:seul', 'recharge:dehors'] });
  assert.ok(recharge.includes('dim 27/09 · a rechargé : être seul, dehors / nature\n'), recharge);
  assert.ok(!recharge.includes('a pesé'));
});

test('v6 : rien de noté, rien dans la ligne (listes absentes, nulles ou vides)', () => {
  for (const o of [{}, { pese: null, recharge: null }, { pese: [], recharge: [] }]) {
    const t = exportJour({ lieu: 'lieu:bureau', ...o });
    assert.ok(t.includes('dim 27/09 · Bureau\n'), t);
    assert.ok(!/a pesé|a rechargé/.test(t), t);
  }
});

// ---------- v6 : « vers » et ce que je faisais ----------

const carteMoments = carteLibelles(seedItems({ ...SEED_V1, ...SEED_V2_AJOUTS, ...SEED_V4_AJOUTS }, 'x'));
const exportMoments = (humeurs) => exportPsy({ journal: [], episodes: [], symptomes: [], humeurs }, { aujourdhui: '2026-09-27', carte: carteMoments });
const ligneMoments = (t) => t.split('\n').find((l) => l.startsWith('  humeur du moment : '));

test('v6 : un relevé « vers » s\'écrit « vers 14 h 5 (énergie basse ; travail, trajet) »', () => {
  const t = exportMoments([releve('2026-09-26', '14:00', 5, { vers: true, energie: 'energie:basse', faisais: ['activiteMoment:travail', 'activiteMoment:trajet'] })]);
  assert.equal(ligneMoments(t), '  humeur du moment : vers 14 h 5 (énergie basse ; travail, trajet)');
});

test('v6 : « vers » sans énergie, sans humeur ou sans activité, et les activités d\'un relevé « maintenant »', () => {
  const t = exportMoments([
    releve('2026-09-26', '08:00', 4, { vers: true }),
    releve('2026-09-26', '10:00', null, { vers: true, energie: 'energie:haute' }),
    releve('2026-09-26', '12:00', 6, { vers: true, faisais: ['activiteMoment:courses', 'activiteMoment:maison'] }),
    releve('2026-09-26', '18:42', 7, { energie: 'energie:moyenne', faisais: ['activiteMoment:monde'] }),
    releve('2026-09-26', '20:15', 6, { energie: 'energie:moyenne', faisais: [] }),
  ]);
  assert.equal(ligneMoments(t), '  humeur du moment : vers 8 h 4 · vers 10 h (énergie haute) · vers 12 h 6 (courses / démarches, chez moi)'
    + ' · 18:42 7 (énergie moyenne ; avec du monde) · 20:15 6 (énergie moyenne)');
});

test('v6 : le « vers 0 h » de la nuit vient après le relevé de 22 h, au jour logique de la veille', () => {
  const t = exportMoments([
    releve('2026-09-27', '00:00', 3, { vers: true }),
    releve('2026-09-26', '22:00', 6, { vers: true }),
    releve('2026-09-26', '23:10', 5),
  ]);
  assert.equal(ligneMoments(t), '  humeur du moment : vers 22 h 6 · 23:10 5 · vers 0 h 3');
  assert.ok(t.includes('sam 26/09 · humeur 4,7 (de 3 à 6)\n'), t);
});
