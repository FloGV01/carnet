import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profilJournee } from '../../public/js/analyse/moments.js';
import { avantExplosions } from '../../public/js/analyse/avant-explosions.js';
import { analyze } from '../../public/js/analyse/index.js';
import { exportPsy } from '../../public/js/export/psy.js';
import { SEED_V1, SEED_V2_AJOUTS, seedItems } from '../../public/js/domain/vocabulaire.js';
import { carteLibelles } from '../../public/js/domain/libelles.js';

const items = [...seedItems(SEED_V1, 'x'), ...seedItems(SEED_V2_AJOUTS, 'x')];
const carte = carteLibelles(items);

test('profil de journée : créneaux de 2 h, au moins 3 relevés, rattachement au jour logique', () => {
  const h = (date, heure, humeur, energie = null) => ({ id: `${date}${heure}`, date, heure, humeur, energie });
  const humeurs = [h('2026-10-01', '10:05', 6, 'energie:basse'), h('2026-10-02', '11:40', 4, 'energie:basse'), h('2026-10-03', '10:30', 5),
    h('2026-10-03', '11:30', 9), h('2026-10-01', '14:00', 7), h('2026-10-02', '15:00', 7), h('2026-10-04', '01:30', 3),
    h('2026-10-02', '01:00', 2), h('2026-10-03', '00:10', 2), h('2026-10-04', '00:20', 4), h('2026-10-01', '22:30', 6), h('2026-10-02', '23:00', 6), h('2026-10-03', '22:00', 6)];
  const p = profilJournee(humeurs, '2026-10-01', '2026-10-03');
  assert.equal(p.n, 13, 'les relevés d\'avant 4 h comptent pour la veille');
  assert.deepEqual(p.creneaux.map((c) => [c.debut, c.n, c.jours, c.moyenne]), [[10, 4, 3, 5.666666666666667], [22, 3, 3, 6], [0, 4, 3, 2.5]],
    'moyenne des moyennes par jour ; créneaux de 4 h à 4 h ; 14 h avec 2 jours seulement : absent');
  assert.equal(p.creneaux[0].energie['energie:basse'], 2);
  // Relevés avec seulement l'énergie : comptés pour le créneau et pour l'énergie, pas pour l'humeur.
  const energieSeule = ['2026-10-01', '2026-10-02', '2026-10-03'].map((d) => h(d, '16:30', null, 'energie:haute'));
  const q = profilJournee(energieSeule, '2026-10-01', '2026-10-03');
  assert.deepEqual(q.creneaux.map((c) => [c.debut, c.jours, c.moyenne, c.energie['energie:haute']]), [[16, 3, null, 3]]);
  assert.equal(profilJournee([], '2026-10-01', '2026-10-03').statut, 'insuffisant');
});

test('avant tes explosions : 3 au moins, notes réunies, ce qui a aidé les autres fois', () => {
  const ex = (date, ac, extra = {}) => ({ id: date, date, heure: '18:00', reaction: 'reaction:explosion', declencheur: 'declencheur:conflit', apresCoup: ac, ...extra });
  const eps = [
    ex('2026-10-01', { types: ['typeExplosion:colere'], fragilites: ['fragilite:fatigue'], signes: ['signe:chaleur'], repereA: 6, siJe: 'je sens la chaleur', alorsJe: 'je sors' }),
    ex('2026-10-02', { types: ['typeExplosion:surcharge'], fragilites: ['fragilite:fatigue', 'fragilite:imprevu'], repereA: 8 }),
    { id: 'x', date: '2026-10-02', heure: '12:00', reaction: 'reaction:en_parler', ceQuiAAide: 'marcher dix minutes' },
  ];
  assert.equal(avantExplosions(eps, '2026-10-01', '2026-10-05').statut, 'insuffisant');
  const r = avantExplosions([...eps, ex('2026-10-03', { fragilites: ['fragilite:fatigue', 'fragilite:ne_sais_pas'], repereA: 7 })], '2026-10-01', '2026-10-05', items);
  assert.equal(r.statut, 'ok');
  assert.equal(r.n, 3);
  assert.deepEqual(r.fragilites, { n: 3, elements: [{ id: 'fragilite:fatigue', n: 3 }] }, 'notés une seule fois ou hors classement : absents');
  assert.deepEqual(r.types, { n: 2, elements: [] });
  assert.equal(r.repere, 7);
  assert.deepEqual(r.declencheurs, { n: 3, elements: [{ id: 'declencheur:conflit', n: 3 }] });
  assert.deepEqual(r.siAlors, [{ si: 'je sens la chaleur', alors: 'je sors' }]);
  assert.deepEqual(r.aide, [{ texte: 'marcher dix minutes', date: '02/10' }]);
});

test('analyse : les épisodes « Explosion » font foi quand le compteur du soir est masqué', () => {
  const journal = [{ date: '2026-09-29', humeur: 5 }, { date: '2026-09-30', humeur: 6 }];
  const episodes = [{ id: 'e1', date: '2026-09-30', heure: '18:00', reaction: 'reaction:explosion' }];
  const data = { journal, episodes, symptomes: [], traitements: [], humeurs: [] };
  const r = analyze(data, { aujourdhui: '2026-09-30', items, zeroDepuis: '2026-09-01' });
  assert.deepEqual([r.fenetres['7'].explosions.n, r.fenetres['7'].explosions.total, r.fenetres['7'].explosions.jours], [2, 1, 1]);
  assert.ok(r.moments['7'] && r.tesMoments['7'] && r.frise['7'] && r.tendances);
  // Avant la mise à jour v4, un compteur vide reste inconnu : seul le jour de l'épisode compte.
  const avant = analyze(data, { aujourdhui: '2026-09-30', items, zeroDepuis: '2026-09-30' });
  assert.deepEqual([avant.fenetres['7'].explosions.n, avant.fenetres['7'].explosions.total], [1, 1]);
  // Un jour qui n'a qu'un épisode d'explosion compte pour les explosions.
  const seul = analyze({ ...data, episodes: [{ id: 'e0', date: '2026-09-20', heure: '18:00', reaction: 'reaction:explosion' }, ...episodes] },
    { aujourdhui: '2026-09-30', items, zeroDepuis: '2026-09-01' });
  assert.equal(seul.fenetres['30'].explosions.total, 2);
  // v6 : un jour qui n'a que des humeurs du moment a une humeur du jour, mais pas de saisie du soir :
  // son compte d'explosions reste inconnu (jamais 0), dans les fenêtres, la frise et le signal.
  const releves = analyze({ ...data, humeurs: [{ id: 'h1', date: '2026-09-28', heure: '10:00', humeur: 4, energie: null }] },
    { aujourdhui: '2026-09-30', items, zeroDepuis: '2026-09-01' });
  const f7 = releves.fenetres['7'];
  assert.deepEqual([f7.humeur.n, f7.explosions.n, f7.explosions.total], [3, 2, 1]);
  const jour = releves.frise['7'].colonnes.find((c) => c.cle === '2026-09-28');
  assert.deepEqual([jour.humeur, jour.explosions, jour.aDonnee], [4, null, true]);
});

test('export PSY v4 : détails sport et contact, humeurs du moment, après coup sous l\'épisode', () => {
  const journal = [{ date: '2026-09-30', humeur: 6, sportMouvement: true, contactHumain: true,
    activites: [{ type: 'typeSport:marche', duree: 'dureeSport:de_30_a_60' }, { type: 'typeSport:velo', duree: null }],
    contacts: [{ avec: ['contactAvec:famille', 'contactAvec:collegues'], effet: 'contactEffet:couteux' }, { avec: ['contactAvec:amis'], effet: 'contactEffet:ressourcant' }] }];
  const episodes = [{ id: 'e1', date: '2026-09-30', heure: '18:00', emotion: 'emotion:colere', intensite: 8, reaction: 'reaction:explosion',
    apresCoup: { types: ['typeExplosion:colere'], fragilites: ['fragilite:fatigue'], signes: ['signe:chaleur'], repereA: 6, pensees: 'il le fait exprès', siJe: 'je sens la chaleur', alorsJe: 'je sors cinq minutes', tensionApres: 3 } }];
  const humeurs = [{ id: 'h1', date: '2026-09-30', heure: '10:05', humeur: 5, energie: 'energie:basse' }, { id: 'h2', date: '2026-09-30', heure: '14:00', humeur: 7, energie: null }];
  const t = exportPsy({ journal, episodes, symptomes: [], humeurs }, { aujourdhui: '2026-09-30', carte });
  // v6 : la ligne du jour dit l'humeur du jour (relevés 5 et 7), le soir (6) n'y est pas mêlé.
  assert.match(t, /mer 30\/09 · humeur 6 \(de 5 à 7\) · contact oui \(famille, collègues : coûteux ; amis : ressourçant\) · sport oui \(Marche 30 à 60 min, Vélo\) · explosions 1/);
  assert.match(t, /\n {2}humeur du moment : 10:05 5 \(énergie basse\) · 14:00 7/);
  assert.match(t, /\n {2}après coup :\n {4}c'était plutôt : colère · ce qui me fragilisait déjà : fatigue\n {4}premiers signes : chaleur · remarqué à 6\/10/);
  assert.match(t, /pour la prochaine fois : si je sens la chaleur, alors je sors cinq minutes/);
  assert.match(t, /en y repensant : 3\/10/);
  assert.doesNotMatch(t, /undefined|null|NaN/);
});

test('export PSY v4 : après coup tardif sur un épisode ancien, jour avec seulement des relevés', () => {
  const episodes = [{ id: 'e0', date: '2026-09-05', heure: '18:00', emotion: 'emotion:colere', reaction: 'reaction:explosion',
    apresCoup: { jour: '2026-09-07', siJe: 'je serre les poings', alorsJe: 'je sors' } }];
  const humeurs = [{ id: 'h1', date: '2026-09-11', heure: '00:30', humeur: 4, energie: null }];
  const t = exportPsy({ journal: [], episodes, symptomes: [], humeurs }, { aujourdhui: '2026-09-12', carte });
  assert.match(t, /APRÈS COUP \(épisodes plus anciens\)\nsam 05\/09 18:00 · Colère · réaction : Explosion\n {2}après coup :\n {4}pour la prochaine fois : si je serre les poings, alors je sors/);
  assert.match(t, /JOURS\njeu 10\/09 · humeur 4\n {2}humeur du moment : 00:30 4/, 'relevé de 00:30 rattaché à la veille, humeur du jour comprise');
  assert.doesNotMatch(t, /ÉPISODES/);
  const tard = exportPsy({ journal: [], episodes, symptomes: [], humeurs: [] }, { aujourdhui: '2026-09-20', carte });
  assert.doesNotMatch(tard, /APRÈS COUP/);
  // Un jour noté sans compteur ni épisode : pas de « explosions 0 » sur sa ligne (rien n'a été saisi),
  // mais la semaine compte bien 0 explosion depuis la v4.
  const sansRien = exportPsy({ journal: [{ date: '2026-09-11', humeur: 6 }], episodes: [], symptomes: [], humeurs: [] }, { aujourdhui: '2026-09-12', carte, zeroDepuis: '2026-09-01' });
  assert.match(sansRien, /\nven 11\/09 · humeur du soir 6\n/);
  assert.match(sansRien, /cette semaine : humeur moyenne 6 \(de 6 à 6\) · explosions 0/);
});

test('mon plan : textes propres, si… alors… sans doublon, plan vide reconnu', async () => {
  const { normaliserPlan, planVide, ajouterSiAlors } = await import('../../public/js/domain/mon-plan.js');
  const vide = normaliserPlan(null);
  assert.equal(planVide(vide), true);
  const p = ajouterSiAlors(ajouterSiAlors(normaliserPlan({ quandCaMonte: '  je sors  ' }), 'chaleur', 'je respire'), 'chaleur', 'je respire');
  assert.equal(p.quandCaMonte, 'je sors');
  assert.deepEqual(p.siAlors, [{ si: 'chaleur', alors: 'je respire' }]);
  assert.equal(planVide(p), false);
});

test('fenêtres v4 : détails sport et contact comptés en jours', async () => {
  const { indicateurs } = await import('../../public/js/analyse/fenetres.js');
  const journal = [
    { date: '2026-10-01', activites: [{ type: 'typeSport:marche', duree: 'dureeSport:moins_15' }, { type: 'typeSport:marche', duree: 'dureeSport:de_30_a_60' }], contacts: [{ avec: ['contactAvec:famille'], effet: 'contactEffet:ressourcant' }] },
    { date: '2026-10-02', activites: [{ type: 'typeSport:velo', duree: null }], contacts: [{ avec: ['contactAvec:famille', 'contactAvec:amis'], effet: null }] },
    { date: '2026-10-03', humeur: 5 },
  ];
  const f = indicateurs({ journal, episodes: [], symptomes: [] }, '2026-10-01', '2026-10-03');
  assert.deepEqual(f.sportDetail.types, { jours: 2, par: [{ id: 'typeSport:marche', n: 1 }, { id: 'typeSport:velo', n: 1 }] });
  assert.equal(f.sportDetail.durees.jours, 1);
  assert.deepEqual(f.contactDetail.avec, { jours: 2, par: [{ id: 'contactAvec:famille', n: 2 }, { id: 'contactAvec:amis', n: 1 }] });
  assert.deepEqual(f.contactDetail.effet, { jours: 1, par: [{ id: 'contactEffet:ressourcant', n: 1 }] });
});
