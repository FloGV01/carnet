import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../../public/js/analyse/index.js';
import { indicateurs, dureeNuit } from '../../public/js/analyse/fenetres.js';
import { classer } from '../../public/js/analyse/classements.js';
import { profilJournee } from '../../public/js/analyse/moments.js';
import { humeursDuJour } from '../../public/js/analyse/humeur-jour.js';
import { phraseClassement, duree } from '../../public/js/analyse/textes.js';
import { SEED_V1, seedItems } from '../../public/js/domain/vocabulaire.js';
import { carteLibelles } from '../../public/js/domain/libelles.js';
import { addDays } from '../../public/js/domain/dates.js';
import { generer } from '../fixtures/generateur.js';

const items = seedItems(SEED_V1, 'x');
const carte = carteLibelles(items);
const vide = { episodes: [], symptomes: [], traitements: [] };

test('indicateurs : champ vide = inconnu, aucun indicateur « jours notés »', () => {
  const journal = [
    { date: '2026-09-28', humeur: 3, explosions: 0, contactHumain: false, sommeilRessenti: 'sommeil:mal' },
    { date: '2026-09-29', humeur: null, explosions: null, contactHumain: null },
    { date: '2026-09-30', humeur: 8, explosions: 2, contactHumain: true, heureCoucher: '23:30', heureLever: '07:00' },
  ];
  const r = indicateurs({ journal, ...vide }, '2026-09-24', '2026-09-30');
  assert.equal(r.humeur.n, 2);
  assert.equal(r.humeur.moyenne, 5.5);
  assert.equal(r.humeur.fragile, true);
  assert.deepEqual([r.humeur.minReleve, r.humeur.maxReleve], [3, 8], 'journal sans humeur du jour : plus bas et plus haut du soir');
  assert.equal(r.explosions.total, 2);
  assert.equal(r.explosions.jours, 1);
  assert.deepEqual(r.contact, { n: 2, oui: 1 });
  assert.equal(r.nuits.coucher, null, 'médiane seulement si n ≥ 3');
  assert.equal(JSON.stringify(r).includes('joursNotes'), false);
});

test('horaires : coucher avant midi = après minuit, durée bornée', () => {
  assert.equal(dureeNuit('23:30', '07:00'), 450);
  assert.equal(dureeNuit('00:30', '07:00'), 390);
  assert.equal(dureeNuit('12:30', '07:00'), null);
  assert.equal(dureeNuit('05:30', '06:00'), null);
});

test('classements : hors classement, égalité, seuils', () => {
  const hc = new Set(['declencheur:rien_identifie']);
  const c = classer(['declencheur:pris_pour_un_con', 'declencheur:pris_pour_un_con', 'declencheur:conflit', 'declencheur:rien_identifie'], hc);
  assert.equal(c.statut, 'ok');
  assert.deepEqual(c.top, ['declencheur:pris_pour_un_con']);
  assert.equal(phraseClassement('declencheur', c, carte), 'Me sentir pris pour un con · 2 épisodes sur 4 (hors « Rien d\'identifié » : 1)');
  const eg = classer(['a', 'a', 'b', 'b'], new Set());
  assert.equal(phraseClassement('emotion', { ...eg, top: eg.top }, new Map([['a', 'A'], ['b', 'B']])), 'à égalité : A et B · 2 épisodes sur 4');
  assert.equal(classer(['a', 'b'], new Set()).statut, 'insuffisant');
  assert.equal(phraseClassement('effetSecondaire', classer([], new Set()), carte), 'Aucun effet noté sur la période');
});

test('classements : les mots de la roue à égalité, trois au plus puis « … » ; les autres listes inchangées', () => {
  const mots = { a: 'Irrité', b: 'Calme', c: 'Vide', d: 'Inquiet', e: 'Surpris' };
  const lib = (id) => mots[id] || id;
  const cinq = classer(['a', 'a', 'b', 'b', 'c', 'c', 'd', 'd', 'e', 'e', 'f'], new Set());
  assert.equal(cinq.top.length, 5);
  assert.equal(phraseClassement('emotionMoment', cinq, new Map(), lib), 'à égalité : Irrité, Calme, Vide… · 2 relevés sur 11');
  // Trois ex aequo ou moins : tous, avec « et », comme avant.
  const trois = classer(['a', 'a', 'b', 'b', 'c', 'c', 'f'], new Set());
  assert.equal(phraseClassement('emotionMoment', trois, new Map(), lib), 'à égalité : Irrité et Calme et Vide · 2 relevés sur 7');
  // La règle de classement ne change pas, ni les autres listes : leurs ex aequo restent tous dits.
  assert.equal(phraseClassement('emotion', cinq, new Map(Object.entries(mots))), 'à égalité : Irrité et Calme et Vide et Inquiet et Surpris · 2 épisodes sur 11');
});

test('invariants : entrée vide, ordre des entrées ; v7, plus aucun constat calculé sur la note', () => {
  const journal = generer({ jours: 120, seed: 21, scenario: 'bureau' });
  const fin = journal[journal.length - 1].date;
  const ctx = { aujourdhui: fin, items };
  const base = analyze({ journal, ...vide }, ctx);
  const avecVide = analyze({ journal: [...journal, { date: addDays(fin, -200) }], ...vide }, ctx);
  assert.deepEqual(avecVide.fenetres['30'], base.fenetres['30']);
  const melange = analyze({ journal: [...journal].reverse(), ...vide }, ctx);
  assert.deepEqual(melange.fenetres, base.fenetres);
  for (const cle of ['bonnesJournees', 'sommeil', 'tendances', 'signal', 'constatsAffiches']) assert.equal(cle in base, false, cle);
});

test('garde-fou : 1 100 jours analysés en moins de 5 s (budget strict dans test:calibration)', () => {
  const journal = generer({ jours: 1100, seed: 31, scenario: 'nul' });
  const t0 = performance.now();
  analyze({ journal, ...vide }, { aujourdhui: journal[journal.length - 1].date, items });
  assert.ok(performance.now() - t0 < 5000);
});

test('« Depuis le début » part de la première date connue, toutes sources', () => {
  const r = analyze({ journal: [], episodes: [{ date: '2026-09-01', heure: '10:00', emotion: 'emotion:colere' }], symptomes: [], traitements: [] }, { aujourdhui: '2026-09-30', items });
  assert.equal(r.premier, '2026-09-01');
  assert.equal(r.fenetres.tout.episodes.nombre, 1);
});

test('effet secondaire « Aucun » seul : « Aucun effet noté sur la période » ; durée sans « 60 »', () => {
  const hc = new Set(['effetSecondaire:aucun']);
  assert.match(phraseClassement('effetSecondaire', classer(Array(4).fill('effetSecondaire:aucun'), hc), carte), /^Aucun effet noté sur la période/);
  assert.equal(duree(479.5), '8 h 00');
});

test('une date aberrante très ancienne ne fait ni exploser le calcul ni changer les verdicts', () => {
  const journal = generer({ jours: 400, seed: 31, scenario: 'bureau' });
  const fin = journal[journal.length - 1].date;
  const base = analyze({ journal, ...vide }, { aujourdhui: fin, items });
  const t0 = performance.now();
  const avec = analyze({ journal: [{ date: '1926-03-01', humeur: 5 }, ...journal], ...vide }, { aujourdhui: fin, items });
  assert.ok(performance.now() - t0 < 5000);
  assert.deepEqual(avec.fenetres['90'], base.fenetres['90']);
});

test('réveils « 5 ou plus » : la moyenne s\'affiche comme une borne basse', async () => {
  const { moyenneReveils } = await import('../../public/js/analyse/textes.js');
  const f = indicateurs({ journal: [5, 5, 0].map((r, i) => ({ date: addDays('2026-09-01', i), reveilsNocturnes: r })), ...vide }, '2026-09-01', '2026-09-03');
  assert.equal(f.nuits.reveils.plafonne, 2);
  assert.equal(moyenneReveils(f.nuits.reveils), 'au moins 3,3');
});

// ---------- v6 : humeur du jour ----------

test('humeur du jour : toutes les fenêtres la lisent, un jour de relevés seuls compris', () => {
  const r = (date, heure, humeur) => ({ id: `${date}${heure}`, date, heure, humeur, energie: null });
  const journal = [{ date: '2026-09-25', humeur: 8 }, { date: '2026-09-26', humeur: 2 }, { date: '2026-09-27', humeur: 7 }];
  const humeurs = [
    r('2026-09-20', '15:00', 6),
    r('2026-09-26', '10:00', 6), r('2026-09-26', '18:00', 10),
    r('2026-09-28', '09:00', 3), r('2026-09-28', '20:00', 5),
    r('2026-09-29', '12:00', 4), r('2026-09-29', '22:00', 5), r('2026-09-30', '01:00', 4),
  ];
  const a = analyze({ journal, humeurs, ...vide }, { aujourdhui: '2026-09-30', items });
  assert.equal(a.premier, '2026-09-20', 'un jour de relevés seuls compte pour « Depuis le début »');
  const h = a.fenetres['7'].humeur;
  // 25 : soir 8 · 26 : relevés 6 et 10 (le soir 2 n'est pas mélangé) · 27 : soir 7 · 28 : 3 et 5 · 29 : 4, 5 et 4 (01:00 le 30).
  assert.equal(h.n, 5);
  assert.ok(Math.abs(h.moyenne - (8 + 8 + 7 + 4 + 13 / 3) / 5) < 1e-9);
  assert.deepEqual([h.min, h.max, h.minReleve, h.maxReleve], [4, 8, 3, 10]);
  assert.ok(!('haut' in h) && !('bas' in h), 'v7 : plus de journées à 7 ou plus, ni à 4 ou moins');
});

test('v6 : « Ta journée heure par heure » laisse de côté les relevés « vers » ; v7, elle ne lit plus que l\'énergie', () => {
  const rel = (date, heure, humeur, plus = {}) => ({ id: `${date}-${heure}`, date, heure, humeur, energie: null, vers: null, faisais: null, ...plus });
  const jours = ['2026-10-01', '2026-10-02', '2026-10-03'];
  const maintenant = jours.map((d) => rel(d, '10:00', 5, { energie: 'energie:basse' }));
  const vers = [...jours.map((d) => rel(d, '14:00', 9, { vers: true, energie: 'energie:haute' })), rel('2026-10-04', '00:00', 9, { vers: true })];
  const p = profilJournee([...maintenant, ...vers], '2026-10-01', '2026-10-03');
  assert.equal(p.n, 3, 'les relevés « vers » ne comptent pas');
  assert.deepEqual(p.creneaux.map((c) => [c.debut, c.n, c.jours, c.energie['energie:basse'], c.energie['energie:haute']]), [[10, 3, 3, 3, 0]],
    'ni créneau de 14 h, ni de minuit, ni énergie haute');
  assert.equal('moyenne' in p.creneaux[0], false, 'plus de note par créneau');
  // Un jour qui n'a que des relevés « vers » : hors du profil, mais il a une humeur du jour.
  const seuls = profilJournee(vers, '2026-10-01', '2026-10-04');
  assert.deepEqual([seuls.n, seuls.creneaux.length, seuls.statut], [0, 0, 'insuffisant']);
  assert.equal(humeursDuJour({ journal: [], humeurs: vers }).get('2026-10-01').valeur, 9);
  assert.equal(humeursDuJour({ journal: [], humeurs: vers }).get('2026-10-03').n, 2, 'le « vers 0 h » du 04 compte pour le 03');
  // Le même relevé sans « vers » compte, lui (avec une énergie).
  const sansVers = vers.map((h) => ({ ...h, vers: null }));
  assert.deepEqual(profilJournee(sansVers, '2026-10-01', '2026-10-03').creneaux.map((c) => c.debut), [14], 'le créneau de 14 h apparaît (3 jours)');
  // Un relevé qui n'a qu'une émotion n'entre pas dans le profil d'énergie.
  assert.equal(profilJournee(jours.map((d) => rel(d, '10:00', null, { emotion: 'roue:colere' })), '2026-10-01', '2026-10-03').statut, 'insuffisant');
});

test('v7 · « Pourquoi ? » de Ta journée : la règle couvre ses deux rangées (émotions et énergie), ses nombres tirés de SEUILS', async () => {
  const { REGLES } = await import('../../public/js/analyse/textes.js');
  const { SEUILS } = await import('../../public/js/analyse/seuils.js');
  const { RACINE, lire, sansCommentaires } = await import('../aides/fichiers.js');
  const r = REGLES.emotionsJournee;
  assert.match(r, /^La règle : .+\.$/);
  assert.doesNotMatch(r, /undefined|NaN|null|\[object/);
  // Les émotions : le seuil de relevés ; l'énergie : la largeur du créneau et le nombre de jours de moments.js.
  assert.match(r, new RegExp(`au moins ${SEUILS.emotions.minReleves} émotions du moment`));
  assert.match(r, new RegExp(`pour l'énergie, un créneau de ${SEUILS.moments.largeurCreneau} h .*au moins ${SEUILS.moments.minJours} jours différents`));
  // Les deux rangées laissent de côté les relevés « vers » (emotions.js, moments.js).
  assert.match(r, /sans « C'était vers… »/);
  // Aucun chiffre écrit à la main dans cette règle : le gabarit n'a que des ${…}.
  const code = sansCommentaires(lire(`${RACINE}/public/js/analyse/textes.js`));
  const ligne = code.split('\n').find((l) => l.trim().startsWith('emotionsJournee:'));
  assert.ok(ligne, 'règle emotionsJournee introuvable');
  assert.doesNotMatch(ligne.replace(/\$\{[^}]*\}/g, ''), /\d/);
});
