import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../../public/js/analyse/index.js';
import { indicateurs, dureeNuit } from '../../public/js/analyse/fenetres.js';
import { classer } from '../../public/js/analyse/classements.js';
import { bonnesJournees, facteursPossibles, evaluer as evaluerBonnesJournees } from '../../public/js/analyse/bonnes-journees.js';
import { sommeilHumeur, evaluer as evaluerSommeil } from '../../public/js/analyse/sommeil.js';
import { serieHebdo } from '../../public/js/analyse/semaines.js';
import { profilJournee } from '../../public/js/analyse/moments.js';
import { humeursDuJour } from '../../public/js/analyse/humeur-jour.js';
import { phraseConstat, phrasesSommeil, phraseSommeilSemaine, phraseClassement, PAS_ASSEZ, duree } from '../../public/js/analyse/textes.js';
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

test('bonnes journées : 4 journées parfaitement séparées = pas encore assez de données', () => {
  const journal = [
    { date: '2026-09-01', humeur: 9, lieu: 'lieu:bureau' }, { date: '2026-09-02', humeur: 9, lieu: 'lieu:bureau' },
    { date: '2026-09-03', humeur: 2, lieu: 'lieu:teletravail' }, { date: '2026-09-04', humeur: 2, lieu: 'lieu:teletravail' },
  ];
  const r = bonnesJournees(journal, '2026-09-04');
  assert.equal(r.statut, 'insuffisant');
  assert.deepEqual(r.constats, []);
});

test('bonnes journées : le traitement n\'est jamais un facteur', () => {
  const f = facteursPossibles(generer({ jours: 30, seed: 2 }));
  assert.ok(f.every((x) => !x.cle.includes('traitement')));
  assert.ok(f.every((x) => !x.cle.includes('explosion')));
});

test('bonnes journées : « bureau +3 » sur 180 jours donne un constat net et stable', () => {
  const journal = generer({ jours: 180, seed: 7, scenario: 'bureau' });
  const fin = journal[journal.length - 1].date;
  const r = bonnesJournees(journal, fin);
  assert.equal(r.statut, 'ok');
  const c = r.constats.find((x) => x.variable === 'lieu');
  assert.ok(c, 'constat sur le lieu');
  const phrase = phraseConstat(c, carte, 'tu');
  assert.match(phrase, /^(Plus|Moins) présent dans tes journées à 7 ou plus : une journée (au bureau|en télétravail) \(\d+ sur \d+, contre \d+ sur \d+ journées à 4 ou moins\)\.$/);
  assert.match(phraseConstat(c, carte, 'je'), /dans mes journées/);
});

test('bonnes journées : scénario nul, au plus 3 graines sur 30 avec un constat', () => {
  let faux = 0;
  for (let seed = 100; seed < 130; seed++) {
    const journal = generer({ jours: 120, seed, scenario: 'nul' });
    if (bonnesJournees(journal, journal[journal.length - 1].date).constats.length) faux++;
  }
  assert.ok(faux <= 3, `${faux} faux constats`);
});

test('sommeil : effet le lendemain seulement → net en décalage 1, pas en décalage 0', () => {
  const journal = generer({ jours: 200, seed: 11, scenario: 'sommeilLendemain' });
  const r = sommeilHumeur(journal, journal[journal.length - 1].date);
  assert.equal(r.lendemain.constat, true);
  assert.equal(r.meme.constat, false);
  const ph = phrasesSommeil(r, carte);
  assert.ok(ph.some((p) => /^Le lendemain, une nuit notée Mal va avec une humeur plus basse/.test(p)), ph.join(' | '));
  assert.ok(ph.every((p) => !/provoqu|cause/i.test(p)));
  assert.match(phraseSommeilSemaine(r, carte), /^Le lendemain, une nuit notée Mal va avec une humeur plus basse/);
});

test('sommeil : effet le jour même → constat du jour même', () => {
  const journal = generer({ jours: 150, seed: 3, scenario: 'sommeilJourMeme' });
  const r = sommeilHumeur(journal, journal[journal.length - 1].date);
  assert.equal(r.meme.constat, true);
  assert.match(phrasesSommeil(r, carte)[0], /^Une nuit notée Mal va avec une humeur plus basse le jour même \(\d+(,\d)? contre \d+(,\d)? après une nuit Bien\)\.$/);
  assert.equal(phraseSommeilSemaine(r, carte), phrasesSommeil(r, carte)[0]);
});

test('sommeil : 13 paires = pas encore assez ; nuits Mal groupées = phrase « à la suite »', () => {
  const peu = generer({ jours: 13, seed: 4, scenario: 'sommeilJourMeme' });
  const r = sommeilHumeur(peu, peu[peu.length - 1].date);
  assert.equal(r.meme.statut, 'insuffisant');
  assert.deepEqual(phrasesSommeil(r, carte), [PAS_ASSEZ]);
  assert.equal(phraseSommeilSemaine(r, carte), null, 'Ma semaine : rien sans constat');
  const suite = generer({ jours: 200, seed: 9, scenario: 'malEnSuite' });
  const r2 = sommeilHumeur(suite, suite[suite.length - 1].date);
  assert.equal(r2.suite, true);
  assert.ok(phrasesSommeil(r2, carte).some((p) => /arrivent souvent à la suite/.test(p)));
});

test('série hebdomadaire : semaine vide sans valeur, moyenne fragile sous 3 valeurs', () => {
  const journal = [{ date: '2026-09-28', humeur: 6, explosions: 0 }, { date: '2026-09-29', humeur: 4, explosions: 1 }];
  const s = serieHebdo({ journal, ...vide }, '2026-09-30', items, 3);
  assert.equal(s.length, 3);
  assert.equal(s[0].humeur, null);
  assert.equal(s[2].humeur, 5);
  assert.equal(s[2].fragile, true);
  assert.equal(s[2].explosions, 1);
});

test('invariants : entrée vide, ordre des entrées, constats affichés', () => {
  const journal = generer({ jours: 120, seed: 21, scenario: 'bureau' });
  const fin = journal[journal.length - 1].date;
  const ctx = { aujourdhui: fin, items };
  const base = analyze({ journal, ...vide }, ctx);
  const avecVide = analyze({ journal: [...journal, { date: addDays(fin, -200) }], ...vide }, ctx);
  assert.deepEqual(avecVide.bonnesJournees.constats.map((c) => c.cle), base.bonnesJournees.constats.map((c) => c.cle));
  const melange = analyze({ journal: [...journal].reverse(), ...vide }, ctx);
  assert.deepEqual(melange.fenetres, base.fenetres);
  assert.deepEqual(melange.bonnesJournees.constats, base.bonnesJournees.constats);
  assert.ok(Array.isArray(base.constatsAffiches));
});

test('garde-fou : 1 100 jours analysés en moins de 5 s (budget strict dans test:calibration)', () => {
  const journal = generer({ jours: 1100, seed: 31, scenario: 'nul' });
  const t0 = performance.now();
  analyze({ journal, ...vide }, { aujourdhui: journal[journal.length - 1].date, items });
  assert.ok(performance.now() - t0 < 5000);
});

test('sommeil : une qualité de nuit vue une seule fois n\'est jamais affichée, et la phrase ne contredit pas ses chiffres', () => {
  const journal = [];
  for (let i = 0; i < 60; i++) {
    const date = addDays('2026-07-01', i);
    if (i === 0) journal.push({ date, sommeilRessenti: 'sommeil:mal', humeur: 9 });
    else if (i % 2) journal.push({ date, sommeilRessenti: 'sommeil:moyen', humeur: 3 + (i % 3 === 0 ? 1 : 0) });
    else journal.push({ date, sommeilRessenti: 'sommeil:bien', humeur: 6 + (i % 4 === 0 ? 1 : 0) });
  }
  const r = sommeilHumeur(journal, addDays('2026-07-01', 59));
  const ph = phrasesSommeil(r, carte).join(' ');
  assert.ok(!/nuit notée Mal/.test(ph), ph);
  for (const m of ph.matchAll(/humeur (plus basse|plus haute)[^(]*\((\d+(?:,\d)?) contre (\d+(?:,\d)?)/g)) {
    const a = Number(m[2].replace(',', '.')); const b = Number(m[3].replace(',', '.'));
    assert.ok(m[1] === 'plus basse' ? a < b : a > b, ph);
  }
});

test('« encore » seulement si le constat du jour même est affiché', () => {
  const journal = generer({ jours: 200, seed: 11, scenario: 'sommeilLendemain' });
  const ph = phrasesSommeil(sommeilHumeur(journal, journal[journal.length - 1].date), carte);
  assert.ok(ph.some((p) => /^Le lendemain, une nuit notée .+ va avec/.test(p)), ph.join(' | '));
  assert.ok(ph.every((p) => !/va encore/.test(p)));
});

test('« Depuis le début » part de la première date connue, toutes sources', () => {
  const r = analyze({ journal: [], episodes: [{ date: '2026-09-01', heure: '10:00', emotion: 'emotion:colere' }], symptomes: [], traitements: [] }, { aujourdhui: '2026-09-30', items });
  assert.equal(r.premier, '2026-09-01');
  assert.equal(r.fenetres.tout.episodes.nombre, 1);
});

test('n°1 de la semaine avec 2 occurrences ; semaine en cours bornée à aujourd\'hui', () => {
  const eps = [{ date: '2026-09-28', heure: '10:00', emotion: 'emotion:colere' }, { date: '2026-09-29', heure: '10:00', emotion: 'emotion:colere' },
    { date: '2026-10-02', heure: '10:00', emotion: 'emotion:joie' }, { date: '2026-10-02', heure: '11:00', emotion: 'emotion:joie' }, { date: '2026-10-03', heure: '11:00', emotion: 'emotion:joie' }];
  const s = serieHebdo({ journal: [], episodes: eps, symptomes: [], traitements: [] }, '2026-09-30', items, 1);
  assert.equal(s[0].emotion, 'emotion:colere');
});

test('effet secondaire « Aucun » seul : « Aucun effet noté sur la période » ; durée sans « 60 » ; lieu renommé', () => {
  const hc = new Set(['effetSecondaire:aucun']);
  assert.match(phraseClassement('effetSecondaire', classer(Array(4).fill('effetSecondaire:aucun'), hc), carte), /^Aucun effet noté sur la période/);
  assert.equal(duree(479.5), '8 h 00');
  const renomme = new Map(carte); renomme.set('lieu:bureau', 'Au labo');
  assert.match(phraseConstat({ variable: 'lieu', valeur: 'lieu:bureau', cle: 'x', d: 0.5, a: 1, n1: 2, b: 0, n2: 2 }, renomme), /le lieu « Au labo »/);
});

test('bonnes journées : aucun facteur testable = pas encore assez de données', () => {
  const journal = Array.from({ length: 20 }, (_, i) => ({ date: addDays('2026-09-01', i), humeur: i % 2 ? 8 : 3 }));
  assert.equal(bonnesJournees(journal, '2026-09-20').statut, 'insuffisant');
});

test('lendemain : un effet du jour même avec une humeur autocorrélée ne crée pas de faux effet le lendemain', () => {
  let faux = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const journal = generer({ jours: 200, seed, scenario: 'jourMemeAR' });
    const r = sommeilHumeur(journal, journal[journal.length - 1].date);
    assert.equal(r.meme.constat, true, `graine ${seed}`);
    if (r.lendemain.constat) faux++;
  }
  assert.ok(faux <= 1, `${faux}/10`);
});

test('humeur hors bornes traitée comme inconnue (jamais de p = 0,001 par NaN)', () => {
  const journal = generer({ jours: 150, seed: 2001, scenario: 'nul' });
  journal[50] = { ...journal[50], humeur: 11 };
  const r = sommeilHumeur(journal, journal[journal.length - 1].date);
  for (const cle of ['meme', 'lendemain']) assert.ok(r[cle].p == null || r[cle].p > 0.002, `${cle} p=${r[cle].p}`);
});

test('invariance : une entrée sans humeur avant la première humeur ne change aucun p', async () => {
  const { evaluer } = await import('../../public/js/analyse/bonnes-journees.js');
  for (const seed of [1, 21, 33, 45]) {
    const j = generer({ jours: 150, seed, scenario: 'bureau', effet: 1.2 });
    const fin = j[j.length - 1].date;
    const ps = (x) => evaluer(x, fin).facteurs.map((f) => [f.cle, f.p]);
    assert.deepEqual(ps([{ date: addDays(j[0].date, -3), notes: 'note seule' }, ...j]), ps(j));
  }
});

test('une date aberrante très ancienne ne fait ni exploser le calcul ni changer les verdicts', () => {
  const journal = generer({ jours: 400, seed: 31, scenario: 'bureau' });
  const fin = journal[journal.length - 1].date;
  const base = analyze({ journal, ...vide }, { aujourdhui: fin, items });
  const t0 = performance.now();
  const avec = analyze({ journal: [{ date: '1926-03-01', humeur: 5 }, ...journal], ...vide }, { aujourdhui: fin, items });
  assert.ok(performance.now() - t0 < 5000);
  assert.deepEqual(avec.bonnesJournees.constats.map((c) => c.cle), base.bonnesJournees.constats.map((c) => c.cle));
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
  assert.deepEqual([h.haut, h.bas], [3, 1], '4,33 n\'est pas une journée à 4 ou moins');
});

test('humeur du jour décimale : groupes à 7,0 ou plus et à 4,0 ou moins', () => {
  const valeurs = [7, 7.5, 8.25, 10, 7.2, 6.9, 6.99, 4.01, 5.5, 4, 3.5, 1.25, 2.75, 3.99];
  const journal = valeurs.map((humeur, i) => ({ date: addDays('2026-09-01', i), humeur }));
  const r = evaluerBonnesJournees(journal, addDays('2026-09-01', valeurs.length - 1));
  assert.deepEqual([r.nH, r.nB], [5, 5]);
});

test('sommeil : la Spearman reste juste avec des ex aequo et des décimales', () => {
  const journal = generer({ jours: 150, seed: 3, scenario: 'sommeilJourMeme' });
  const fin = journal[journal.length - 1].date;
  // Même ordre et mêmes ex aequo, mais des humeurs décimales toutes entre 5 et 6.
  const decimales = journal.map((j) => ({ ...j, humeur: 5 + (j.humeur - 1) / 10 }));
  const a = evaluerSommeil(journal, fin);
  const b = evaluerSommeil(decimales, fin);
  for (const cle of ['meme', 'lendemain']) {
    assert.equal(b[cle].statut, 'ok', cle);
    assert.equal(b[cle].rho, a[cle].rho, cle);
    assert.equal(b[cle].p, a[cle].p, cle);
    assert.equal(b[cle].net, a[cle].net, cle);
  }
  assert.equal(b.meme.net, true);
});

test('v6 : « Ta journée heure par heure » laisse de côté les relevés « vers », l\'humeur du jour les compte', () => {
  const rel = (date, heure, humeur, plus = {}) => ({ id: `${date}-${heure}`, date, heure, humeur, energie: null, vers: null, faisais: null, ...plus });
  const jours = ['2026-10-01', '2026-10-02', '2026-10-03'];
  const maintenant = jours.map((d) => rel(d, '10:00', 5, { energie: 'energie:basse' }));
  const vers = [...jours.map((d) => rel(d, '14:00', 9, { vers: true, energie: 'energie:haute' })), rel('2026-10-04', '00:00', 9, { vers: true })];
  const p = profilJournee([...maintenant, ...vers], '2026-10-01', '2026-10-03');
  assert.equal(p.n, 3, 'les relevés « vers » ne comptent pas');
  assert.deepEqual(p.creneaux.map((c) => [c.debut, c.n, c.jours, c.moyenne, c.energie['energie:haute']]), [[10, 3, 3, 5, 0]],
    'ni créneau de 14 h, ni de minuit, ni énergie haute');
  // Un jour qui n'a que des relevés « vers » : hors du profil, mais il a une humeur du jour.
  const seuls = profilJournee(vers, '2026-10-01', '2026-10-04');
  assert.deepEqual([seuls.n, seuls.creneaux.length, seuls.statut], [0, 0, 'insuffisant']);
  assert.equal(humeursDuJour({ journal: [], humeurs: vers }).get('2026-10-01').valeur, 9);
  assert.equal(humeursDuJour({ journal: [], humeurs: vers }).get('2026-10-03').n, 2, 'le « vers 0 h » du 04 compte pour le 03');
  // Le même relevé sans « vers » compte, lui.
  const sansVers = vers.map((h) => ({ ...h, vers: null }));
  assert.deepEqual(profilJournee(sansVers, '2026-10-01', '2026-10-03').creneaux.map((c) => c.debut), [14], 'le créneau de 14 h apparaît (3 jours)');
});
