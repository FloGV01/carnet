import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../../public/js/analyse/index.js';
import { indicateurs, dureeNuit } from '../../public/js/analyse/fenetres.js';
import { classer } from '../../public/js/analyse/classements.js';
import { bonnesJournees, facteursPossibles } from '../../public/js/analyse/bonnes-journees.js';
import { sommeilHumeur } from '../../public/js/analyse/sommeil.js';
import { serieHebdo } from '../../public/js/analyse/semaines.js';
import { phraseConstat, phrasesSommeil, phraseClassement, PAS_ASSEZ } from '../../public/js/analyse/textes.js';
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
  assert.ok(ph.some((p) => /^Le lendemain, une nuit notée Mal va encore avec une humeur plus basse/.test(p)), ph.join(' | '));
  assert.ok(ph.every((p) => !/provoqu|cause/i.test(p)));
});

test('sommeil : effet le jour même → constat du jour même', () => {
  const journal = generer({ jours: 150, seed: 3, scenario: 'sommeilJourMeme' });
  const r = sommeilHumeur(journal, journal[journal.length - 1].date);
  assert.equal(r.meme.constat, true);
  assert.match(phrasesSommeil(r, carte)[0], /^Une nuit notée Mal va avec une humeur plus basse le jour même \(\d+(,\d)? contre \d+(,\d)? après une nuit Bien\)\.$/);
});

test('sommeil : 13 paires = pas encore assez ; nuits Mal groupées = phrase « à la suite »', () => {
  const peu = generer({ jours: 13, seed: 4, scenario: 'sommeilJourMeme' });
  const r = sommeilHumeur(peu, peu[peu.length - 1].date);
  assert.equal(r.meme.statut, 'insuffisant');
  assert.deepEqual(phrasesSommeil(r, carte), [PAS_ASSEZ]);
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
