import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportPsy } from '../../public/js/export/psy.js';
import { SEED_V1, SEED_V2_AJOUTS, SEED_V4_AJOUTS, seedItems } from '../../public/js/domain/vocabulaire.js';
import { carteLibelles } from '../../public/js/domain/libelles.js';
import { trouverInterdits } from '../aides/mots-interdits.js';

const carte = carteLibelles(seedItems({ ...SEED_V1, ...SEED_V2_AJOUTS }, 'x'));
const J = (date, o) => ({ date, lieu: null, sommeilRessenti: null, humeur: null, contactHumain: null, sportMouvement: null, explosions: null,
  traitementPris: null, pointsPositifs: null, heureCoucher: null, heureLever: null, reveilsNocturnes: null, heuresSommeil: null, notes: null, ...o });

// Données fictives de l'exemple du plan (§7.8).
const journal = [
  J('2026-09-14', { humeur: 5, explosions: 1, lieu: 'lieu:bureau' }), J('2026-09-15', { humeur: 5, explosions: 1 }),
  J('2026-09-16', { humeur: 6, explosions: 1 }), J('2026-09-17', { humeur: 5, explosions: 0 }), J('2026-09-18', { humeur: 6, explosions: 0, lieu: 'lieu:teletravail' }),
  J('2026-09-21', { lieu: 'lieu:bureau', sommeilRessenti: 'sommeil:mal', reveilsNocturnes: 2, humeur: 5, contactHumain: true, sportMouvement: false, explosions: 1,
    pointsPositifs: "café avec Léo, point projet qui s'est bien passé", notes: "open space très bruyant l'après-midi", traitementPris: 'traitementPris:oui' }),
  J('2026-09-22', { lieu: 'lieu:teletravail', sommeilRessenti: 'sommeil:moyen', heuresSommeil: 6, humeur: 6, contactHumain: false, sportMouvement: true, explosions: 0, pointsPositifs: 'marche de 40 min au soleil' }),
  J('2026-09-23', { lieu: 'lieu:bureau', sommeilRessenti: 'sommeil:bien', heureCoucher: '23:10', heureLever: '06:40', humeur: 7, contactHumain: true, sportMouvement: false, explosions: 0,
    pointsPositifs: "bloc 7h-9h tenu, déjeuner avec l'équipe" }),
  J('2026-09-25', { lieu: 'lieu:teletravail', sommeilRessenti: 'sommeil:mal', reveilsNocturnes: 3, humeur: 4, contactHumain: false, sportMouvement: false, explosions: 1, pointsPositifs: "j'ai tenu aujourd'hui" }),
  J('2026-09-26', { lieu: 'lieu:conge_repos', sommeilRessenti: 'sommeil:moyen', heuresSommeil: 4, humeur: 7, contactHumain: true, sportMouvement: true, explosions: 0, pointsPositifs: 'repas en famille' }),
  J('2026-09-27', { lieu: 'lieu:conge_repos', sommeilRessenti: 'sommeil:bien', heuresSommeil: 10, humeur: 8, contactHumain: true, sportMouvement: true, explosions: 0, pointsPositifs: 'vélo, bonne soirée' }),
];
const episodes = [
  { id: 'e1', date: '2026-09-21', heure: '14:30', emotion: 'emotion:colere', intensite: 8, declencheur: 'declencheur:pris_pour_un_con', dessous: 'dessous:injustice',
    reaction: 'reaction:explosion', situation: "remarque sur mon retard devant toute l'équipe", ceQuiAAide: 'sortir marcher 10 min' },
  { id: 'e2', date: '2026-09-25', heure: '18:10', emotion: 'emotion:surcharge', intensite: 6, declencheur: 'declencheur:trop_sollicitations', dessous: 'dessous:fatigue_debordement',
    reaction: 'reaction:retrait_isolement', situation: null, ceQuiAAide: null },
];
const symptomes = [{ id: 's1', date: '2026-09-25', symptome: 'symptome:ruminations', intensite: 6, duree: 'duree:quelques_heures', contexte: "après les échanges de l'après-midi", note: null }];
// v7 : des émotions du moment (roue), dont une famille seule, un relevé « vers », un relevé de 02:15 rattaché à la veille, et
// un jour qui mêle une ancienne note de 1 à 10 et une émotion (point de vigilance 5) ; un relevé la semaine d'avant.
const humeurs = [
  { id: 'h1', date: '2026-09-17', heure: '11:00', emotion: 'roue:peur:preoccupe', energie: null, humeur: null },
  { id: 'h2', date: '2026-09-22', heure: '18:30', emotion: 'roue:serenite:calme', energie: null, humeur: null },
  { id: 'h3', date: '2026-09-22', heure: '09:10', emotion: 'roue:colere:irrite', energie: 'energie:basse', humeur: null },
  { id: 'h4', date: '2026-09-23', heure: '02:15', emotion: 'roue:colere:irrite', energie: null, humeur: null },
  { id: 'h5', date: '2026-09-25', heure: '20:00', emotion: 'roue:tristesse', energie: 'energie:basse', humeur: null, vers: true },
  { id: 'h6', date: '2026-09-26', heure: '10:00', humeur: 6, energie: null },
  { id: 'h7', date: '2026-09-26', heure: '15:20', emotion: 'roue:joie:amuse', energie: 'energie:haute', humeur: null },
  { id: 'h8', date: '2026-09-27', heure: '12:00', emotion: 'roue:serenite:en-securite', energie: null, humeur: null },
];

const ATTENDU = `SUIVI APP · 7 jours du lun 21/09 au dim 27/09/2026

JOURS
lun 21/09 · Bureau · nuit Mal (2 réveils) · humeur du soir 5 · contact oui · sport non · explosions 1
  + café avec Léo, point projet qui s'est bien passé
  note : open space très bruyant l'après-midi
mar 22/09 · Télétravail · nuit Moyen · 6 h · humeur du soir 6 · émotions : irrité, calme · contact non · sport oui · explosions 0
  humeur du moment : 09:10 irrité (énergie basse) · 18:30 calme · 02:15 irrité
  + marche de 40 min au soleil
mer 23/09 · Bureau · nuit Bien · coucher 23:10 lever 06:40 · humeur du soir 7 · contact oui · sport non · explosions 0
  + bloc 7h-9h tenu, déjeuner avec l'équipe
ven 25/09 · Télétravail · nuit Mal (3 réveils) · humeur du soir 4 · émotions : tristesse · contact non · sport non · explosions 1
  humeur du moment : vers 20 h tristesse (énergie basse)
  + j'ai tenu aujourd'hui
sam 26/09 · Congé / repos · nuit Moyen · 4 h ou moins · humeur 6 · émotions : amusé · contact oui · sport oui · explosions 0
  humeur du moment : 10:00 6 · 15:20 amusé (énergie haute)
  + repas en famille
dim 27/09 · Congé / repos · nuit Bien · 10 h ou plus · humeur du soir 8 · émotions : en sécurité · contact oui · sport oui · explosions 0
  humeur du moment : 12:00 en sécurité
  + vélo, bonne soirée

ÉPISODES (2)
lun 21/09 14:30 · Colère 8/10 · déclencheur : Me sentir pris pour un con · dessous : Injustice · réaction : Explosion
  situation : remarque sur mon retard devant toute l'équipe
  a aidé : sortir marcher 10 min
ven 25/09 18:10 · Surcharge 6/10 · déclencheur : Trop de sollicitations · dessous : Fatigue / débordement · réaction : Retrait / isolement

SYMPTÔMES (1)
ven 25/09 · Ruminations 6/10 · durée : Quelques heures · contexte : après les échanges de l'après-midi

COMPTEURS
cette semaine : humeur moyenne 6 (de 4 à 8) · explosions 2 · jours au bureau 2 · contact humain 4 jours · sport 3 jours · nuits Mal 2 · émotions : colère 2 · tristesse 1 · joie 1 · sérénité 2
  zones : rouge 2 · jaune 1 · vert 2
semaine d'avant : humeur moyenne 5,4 · explosions 3 · jours au bureau 1 · émotions : peur 1
  zones : rouge 1

PSY : fais-moi le récap de la semaine, format habituel.`;

// v8 : la nuit en heures (« nuit Moyen · 6 h ») ; les nuits anciennes gardent leurs réveils, leur coucher et leur lever.
// v9 : sous chaque semaine des COMPTEURS, sa ligne de zones (la famille seule « tristesse » n'a pas de zone).
test('instantané exact de l\'exemple du plan ; v7 : les émotions du jour et par famille, sans « REPÈRES DE L\'APP » ; v8 : les heures de la nuit ; v9 : les zones', () => {
  assert.equal(exportPsy({ journal, episodes, symptomes, humeurs }, { aujourdhui: '2026-09-27', carte }), ATTENDU);
});

// Les phrases calculées retirées en v7 (spec §5) : aucune ne revient, ni aucun mot interdit ; jamais « positive » ni
// « négative » à propos d'une émotion.
const RETIREES = /REPÈRES|journées à 7|à 4 ou moins|Sommeil et humeur|Tendances|Signal|ressembl|bonnes journées|Pas d'écart net|positi|négati/i;
test('v7 : aucune phrase retirée, aucun mot interdit', () => {
  const t = exportPsy({ journal, episodes, symptomes, humeurs }, { aujourdhui: '2026-09-27', carte });
  assert.doesNotMatch(t, RETIREES);
  assert.deepEqual(trouverInterdits(t.replace(/\+ .*\n/g, '')), []);
});

test('exclusions : ni traitement, ni rendez-vous, ni jour manquant mentionné', () => {
  const t = exportPsy({ journal, episodes, symptomes, humeurs }, { aujourdhui: '2026-09-27', carte });
  assert.ok(!/traitement|rendez-vous|RDV|jeu 24\/09|jours? (notés|remplis)|\/7\b/i.test(t), t);
});

test('textes coupés à 280 caractères, rubriques vides omises', () => {
  const long = 'a'.repeat(400);
  const t = exportPsy({ journal: [J('2026-09-27', { pointsPositifs: long })], episodes: [], symptomes: [] }, { aujourdhui: '2026-09-27', carte });
  assert.ok(t.includes(`  + ${'a'.repeat(279)}…`));
  assert.ok(!t.includes('ÉPISODES') && !t.includes('SYMPTÔMES'));
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

// ---------- v7 : les émotions du moment (spec §5) ----------

const rel = (date, heure, emotion, o = {}) => ({ id: `${date}-${heure}`, date, heure, emotion, humeur: null, energie: null, ...o });
const exportEmotions = (h, j = []) => exportPsy({ journal: j, episodes: [], symptomes: [], humeurs: h }, { aujourdhui: '2026-09-27', carte: carteMoments });
const ligneDu = (t, debut) => t.split('\n').find((l) => l.startsWith(debut));

test('v7 : la ligne d\'un jour dit « émotions : irrité, calme », en minuscules, chacune une fois, dans l\'ordre des heures', () => {
  const t = exportEmotions([
    rel('2026-09-26', '18:00', 'roue:serenite:calme'), rel('2026-09-26', '09:00', 'roue:colere:irrite'),
    rel('2026-09-26', '21:00', 'roue:colere:irrite'), rel('2026-09-27', '00:30', 'roue:peur'), rel('2026-09-26', '12:00', null, { energie: 'energie:basse' }),
  ]);
  assert.equal(ligneDu(t, 'sam 26/09'), 'sam 26/09 · émotions : irrité, calme, peur', 'la famille seule, en minuscules ; 00:30 est encore le 26');
  assert.equal(ligneMoments(t), '  humeur du moment : 09:00 irrité · 12:00 (énergie basse) · 18:00 calme · 21:00 irrité · 00:30 peur');
  assert.ok(!t.includes('\ndim 27/09'), 'aucun jour sans relevé');
});

test('v7 · vigilance 5 : un jour qui mêle une ancienne note et une émotion donne « humeur 6 » et les émotions', () => {
  const t = exportEmotions([rel('2026-09-26', '09:00', null, { humeur: 6 }), rel('2026-09-26', '14:00', 'roue:serenite:calme', { energie: 'energie:moyenne' })],
    [J('2026-09-26', { lieu: 'lieu:bureau' })]);
  assert.equal(ligneDu(t, 'sam 26/09'), 'sam 26/09 · Bureau · humeur 6 · émotions : calme');
  assert.equal(ligneMoments(t), '  humeur du moment : 09:00 6 · 14:00 calme (énergie moyenne)');
  assert.match(t, /cette semaine : humeur moyenne 6 \(de 6 à 6\) · jours au bureau 1 · émotions : sérénité 1\n/);
});

test('v7 : COMPTEURS « émotions : colère 3 · sérénité 2 », dans l\'ordre des familles, sans les familles à zéro', () => {
  const t = exportEmotions([
    rel('2026-09-21', '09:00', 'roue:serenite:calme'), rel('2026-09-22', '09:00', 'roue:colere:irrite'), rel('2026-09-23', '09:00', 'roue:colere'),
    rel('2026-09-24', '09:00', 'roue:serenite:apaise'), rel('2026-09-25', '09:00', 'roue:colere:furieux'),
    // La semaine d'avant, et un relevé de 01:00 le lundi 21 qui appartient encore au dimanche 20.
    rel('2026-09-15', '09:00', 'roue:joie:amuse'), rel('2026-09-21', '01:00', 'roue:peur:craintif'),
  ]);
  const compteurs = t.split('COMPTEURS\n')[1].split('\n\n')[0];
  assert.equal(compteurs, 'cette semaine : émotions : colère 3 · sérénité 2\n  zones : rouge 2 · vert 2\nsemaine d\'avant : émotions : joie 1 · peur 1\n  zones : rouge 1 · jaune 1');
  assert.ok(!/humeur moyenne|dégoût 0|0 ·/.test(compteurs), 'sans note, pas d\'humeur moyenne ; aucune famille à zéro');
});

test('v7 : sans aucune émotion, ni la ligne du jour ni les COMPTEURS ne parlent d\'émotions', () => {
  const t = exportEmotions([rel('2026-09-26', '09:00', null, { humeur: 5, energie: 'energie:basse' })]);
  assert.doesNotMatch(t, /émotion/);
  assert.equal(ligneDu(t, 'sam 26/09'), 'sam 26/09 · humeur 5');
});

// v9 · relecture de la tâche 3 : un relevé de mot à soi (méta motsPerso) garde son nom dans la ligne du jour et dans
// « humeur du moment », compte dans sa famille s'il en a une, et le texte ne montre jamais un identifiant « roue: ».
// Un jour qui n'a que ce relevé a sa ligne « émotions ». Mots inventés.
test('v9 : un mot à soi garde son nom dans la ligne du jour et ses relevés, compte dans sa famille ; jamais « roue: » dans le texte', () => {
  const FLOTTANT = 'roue:perso:u-0a1b2c3d';
  const BRUMEUX = 'roue:perso:u-4e5f6a7b';
  const perso = {
    [FLOTTANT]: { libelle: 'Flottant', zone: 'vert', famille: 'joie', definition: null, archive: false, createdAt: '2026-09-01T08:00:00.000Z' },
    [BRUMEUX]: { libelle: 'Brumeux', zone: 'bleu', famille: null, definition: null, archive: true, createdAt: '2026-09-02T08:00:00.000Z' },
  };
  const humeurs = [
    rel('2026-09-25', '17:00', FLOTTANT, { energie: 'energie:basse' }),
    rel('2026-09-26', '09:00', 'roue:colere:irrite'), rel('2026-09-26', '14:00', BRUMEUX, { energie: 'energie:basse' }),
    rel('2026-09-26', '18:00', FLOTTANT),
  ];
  const t = exportPsy({ journal: [], episodes: [], symptomes: [], humeurs, perso }, { aujourdhui: '2026-09-27', carte: carteMoments });
  assert.equal(ligneDu(t, 'ven 25/09'), 'ven 25/09 · émotions : flottant', 'un jour qui n\'a que le mot à soi');
  assert.equal(ligneDu(t, 'sam 26/09'), 'sam 26/09 · émotions : irrité, brumeux, flottant');
  assert.equal(t.split('\n').filter((l) => l.startsWith('  humeur du moment : ')).join('\n'),
    '  humeur du moment : 17:00 flottant (énergie basse)\n  humeur du moment : 09:00 irrité · 14:00 brumeux (énergie basse) · 18:00 flottant');
  // Flottant compte dans la joie ; Brumeux, sans famille, dans aucune.
  assert.match(t, /cette semaine : émotions : colère 1 · joie 2\n/);
  assert.doesNotMatch(t, /roue:|null|undefined/);
  // Sans la méta, rien n'est inventé : ni nom, ni famille, ni identifiant.
  const sans = exportPsy({ journal: [], episodes: [], symptomes: [], humeurs }, { aujourdhui: '2026-09-27', carte: carteMoments });
  assert.equal(ligneDu(sans, 'sam 26/09'), 'sam 26/09 · émotions : irrité');
  assert.doesNotMatch(sans, /roue:|flottant|brumeux|joie/);
});

// v9 (spec §8) : sous chaque semaine des COMPTEURS, « zones : rouge 2 · bleu 1 · vert 1 », dans l'ordre des zones, sans
// zone à zéro. Seuls comptent les relevés qui ont une zone : Fatigué (sans famille) compte en bleu, un mot à soi dans sa
// zone, une famille seule (v7) et une ancienne note nulle part. La ligne est absente sans relevé qui ait une zone ; une
// semaine qui n'a que des mots sans famille garde son nom seul, comme un jour qui n'a que des relevés. Mots inventés.
test('v9 : COMPTEURS, une ligne « zones : … » sous chaque semaine, dans l\'ordre des zones, sans zéro ; absente sans zone', () => {
  const FLOTTANT = 'roue:perso:u-0a1b2c3d';
  const perso = { [FLOTTANT]: { libelle: 'Flottant', zone: 'vert', famille: null, definition: null, archive: false, createdAt: '2026-09-01T08:00:00.000Z' } };
  const compteursDe = (t) => t.split('COMPTEURS\n')[1].split('\n\n')[0];
  const humeurs = [
    rel('2026-09-21', '09:00', 'roue:colere:irrite'), rel('2026-09-22', '09:00', 'roue:aucune:fatigue', { energie: 'energie:basse' }),
    rel('2026-09-23', '09:00', FLOTTANT), rel('2026-09-24', '09:00', 'roue:peur:craintif'), rel('2026-09-25', '09:00', 'roue:colere'),
    rel('2026-09-26', '09:00', null, { humeur: 6 }),
    // La semaine d'avant : Épuisé seul, sans famille.
    rel('2026-09-16', '09:00', 'roue:aucune:epuise'),
  ];
  const t = exportPsy({ journal: [], episodes: [], symptomes: [], humeurs, perso }, { aujourdhui: '2026-09-27', carte: carteMoments });
  assert.equal(compteursDe(t), [
    'cette semaine : humeur moyenne 6 (de 6 à 6) · émotions : colère 2 · peur 1',
    '  zones : rouge 2 · bleu 1 · vert 1',
    'semaine d\'avant',
    '  zones : bleu 1',
  ].join('\n'));
  // Sans la méta : le mot à soi n'a pas de zone connue.
  const sans = exportPsy({ journal: [], episodes: [], symptomes: [], humeurs }, { aujourdhui: '2026-09-27', carte: carteMoments });
  assert.match(compteursDe(sans), /\n  zones : rouge 2 · bleu 1\n/);
  // Aucun relevé qui ait une zone (une famille seule, une note) : ni ligne de zones, ni « zones » nulle part.
  const vide = exportEmotions([rel('2026-09-25', '09:00', 'roue:colere'), rel('2026-09-26', '09:00', null, { humeur: 5 })]);
  assert.equal(compteursDe(vide), 'cette semaine : humeur moyenne 5 (de 5 à 5) · émotions : colère 1');
  assert.doesNotMatch(vide, /zone/);
  assert.doesNotMatch(t, /null|undefined|NaN|roue:|%| 0\b/);
  assert.deepEqual(trouverInterdits(t), []);
});

// v8 (spec §7 bis) : « nuit Mal · 6 h » ; la qualité ou les heures seules ; les réveils et le coucher ne restent que pour une
// nuit ancienne qui en a, jamais inventés.
test('v8 : la nuit dit sa qualité et ses heures, « nuit Mal · 6 h » ; une nuit ancienne garde ses réveils et ses heures de coucher', () => {
  const ligne = (o) => exportPsy({ journal: [J('2026-09-27', o)], episodes: [], symptomes: [] }, { aujourdhui: '2026-09-27', carte }).split('\n')[3];
  assert.equal(ligne({ sommeilRessenti: 'sommeil:mal', heuresSommeil: 6 }), 'dim 27/09 · nuit Mal · 6 h');
  assert.equal(ligne({ heuresSommeil: 7 }), 'dim 27/09 · nuit 7 h');
  assert.equal(ligne({ heuresSommeil: 4 }), 'dim 27/09 · nuit 4 h ou moins');
  assert.equal(ligne({ sommeilRessenti: 'sommeil:bien', heuresSommeil: 10 }), 'dim 27/09 · nuit Bien · 10 h ou plus');
  assert.equal(ligne({ sommeilRessenti: 'sommeil:moyen' }), 'dim 27/09 · nuit Moyen');
  assert.equal(ligne({ sommeilRessenti: 'sommeil:mal', reveilsNocturnes: 1, heureCoucher: '23:40', heureLever: '06:50' }), 'dim 27/09 · nuit Mal (1 réveil) · coucher 23:40 lever 06:50');
  assert.equal(ligne({ reveilsNocturnes: 5 }), 'dim 27/09 · nuit · (5 réveils ou plus)');
  // Une valeur hors bornes (fichier abîmé) ne s'écrit pas.
  assert.equal(ligne({ sommeilRessenti: 'sommeil:mal', heuresSommeil: 12 }), 'dim 27/09 · nuit Mal');
  assert.equal(ligne({ sommeilRessenti: 'sommeil:mal', heuresSommeil: 7.25 }), 'dim 27/09 · nuit Mal');
});

// v11 (spec §5.5 et §12) : la nuit à la demi-heure s'écrit « 7 h 30 », jamais « 7,5 » ; le reste de l'Export PSY ne change pas.
test('v11 : la demi-heure dit « nuit 7 h 30 » dans l\'Export PSY', () => {
  const ligne = (o) => exportPsy({ journal: [J('2026-09-27', o)], episodes: [], symptomes: [] }, { aujourdhui: '2026-09-27', carte }).split('\n')[3];
  assert.equal(ligne({ heuresSommeil: 7.5 }), 'dim 27/09 · nuit 7 h 30');
  assert.equal(ligne({ sommeilRessenti: 'sommeil:mal', heuresSommeil: 4.5 }), 'dim 27/09 · nuit Mal · 4 h 30');
  assert.equal(ligne({ sommeilRessenti: 'sommeil:bien', heuresSommeil: 9.5 }), 'dim 27/09 · nuit Bien · 9 h 30');
  const t = exportPsy({ journal: [J('2026-09-27', { heuresSommeil: 7.5 })], episodes: [], symptomes: [] }, { aujourdhui: '2026-09-27', carte });
  assert.doesNotMatch(t, /7,5|7\.5/);
});
