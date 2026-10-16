import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { trierNotes, nouvelleNote, dateNote } from '../../public/js/domain/notes.js';
import { formaterJourMois } from '../../public/js/domain/dates.js';
import { exportPsy } from '../../public/js/export/psy.js';
import { modeleSoignants } from '../../public/js/export/soignants.js';
import { analyze } from '../../public/js/analyse/index.js';
import { SEED_V1, seedItems } from '../../public/js/domain/vocabulaire.js';
import { carteLibelles } from '../../public/js/domain/libelles.js';
import { generer } from '../fixtures/generateur.js';
import { nouveauRepo } from '../aides/repo.js';
import { RACINE, lister, rel, lire, sansCommentaires } from '../aides/fichiers.js';

const N = (id, date, heure, createdAt = `${date}T${heure}:00.000Z`) => ({ id, date, heure, texte: id, createdAt, updatedAt: createdAt });

test('tri : date puis heure, de la plus récente à la plus ancienne, sans toucher la liste reçue', () => {
  const notes = [N('a', '2026-10-12', '09:00'), N('b', '2026-10-13', '01:30'), N('c', '2026-10-12', '21:15'), N('d', '2026-10-11', '23:59')];
  const avant = notes.map((n) => n.id);
  assert.deepEqual(trierNotes(notes).map((n) => n.id), ['b', 'c', 'a', 'd']);
  assert.deepEqual(notes.map((n) => n.id), avant, 'la liste reçue reste telle quelle');
  assert.deepEqual(trierNotes([]), []);
});

test('tri : deux notes de la même minute, la dernière écrite passe en premier', () => {
  const notes = [N('premiere', '2026-10-12', '09:00', '2026-10-12T07:00:05.000Z'), N('seconde', '2026-10-12', '09:00', '2026-10-12T07:00:40.000Z')];
  assert.deepEqual(trierNotes(notes).map((n) => n.id), ['seconde', 'premiere']);
});

test('date affichée : « 12/10 », jour logique de la note', () => {
  assert.equal(formaterJourMois('2026-10-02'), '02/10');
  assert.equal(dateNote(N('a', '2026-10-12', '09:00')), '12/10');
  assert.equal(dateNote(N('b', '2026-10-12', '03:59')), '11/10', 'avant 04:00, c\'est la veille');
  assert.equal(dateNote(N('c', '2026-10-12', '04:00')), '12/10');
  assert.equal(dateNote(N('d', '2026-03-01', '00:10')), '28/02', 'passage de mois');
});

test('une note écrite à 01:30 est rangée au jour logique précédent', async () => {
  const { repo } = nouveauRepo({ date: new Date(2026, 9, 13, 1, 30) });
  assert.equal(repo.aujourdhui(), '2026-10-12');
  const cree = await repo.notes.creer(nouvelleNote(repo.maintenant(), '  Parler du sommeil  '));
  // La date et l'heure posées sont celles de l'horloge, calendaires.
  assert.deepEqual([cree.date, cree.heure, cree.texte], ['2026-10-13', '01:30', 'Parler du sommeil']);
  assert.equal(dateNote(cree), '12/10');
  assert.deepEqual((await repo.notes.parJour('2026-10-12', '2026-10-12')).map((n) => n.id), [cree.id]);
  assert.deepEqual(await repo.notes.parJour('2026-10-13', '2026-10-13'), []);
  assert.equal(dateNote(await repo.notes.lire(cree.id)), '12/10');
});

test('texte vide ou fait d\'espaces : aucune note à ajouter', () => {
  const maintenant = new Date(2026, 9, 12, 21, 0);
  for (const brut of ['', ' ', '   ', '\n', ' \t\n ', null, undefined]) assert.equal(nouvelleNote(maintenant, brut), null, JSON.stringify(brut));
  assert.deepEqual(nouvelleNote(maintenant, ' Une idée\navec un retour '), { date: '2026-10-12', heure: '21:00', texte: 'Une idée\navec un retour' });
});

test('effacer le texte d\'une note la supprime, une note qui garde un caractère reste', async () => {
  const { repo } = nouveauRepo({ date: new Date(2026, 9, 12, 21, 0) });
  const a = await repo.notes.creer(nouvelleNote(repo.maintenant(), 'Une idée'));
  const b = await repo.notes.creer(nouvelleNote(repo.maintenant(), 'Une autre'));
  assert.equal((await repo.notes.modifier(a.id, { texte: 'U' })).texte, 'U');
  assert.equal(await repo.notes.modifier(b.id, { texte: '  ' }), null);
  assert.deepEqual((await repo.notes.tous()).map((n) => n.id), [a.id]);
});

// ---------- diffusion : jamais dans le PDF, l'export PSY ni l'Analyse ----------

const MOT = 'idée en vrac à ne jamais diffuser';

test('export PSY : une note n\'en sort jamais, même passée avec les données', () => {
  const carte = carteLibelles(seedItems(SEED_V1, 'x'));
  const journal = [{ date: '2026-09-29', humeur: 6, explosions: 0 }];
  const notes = [{ ...N('n1', '2026-09-29', '20:00'), texte: MOT }];
  const base = exportPsy({ journal, episodes: [], symptomes: [] }, { aujourdhui: '2026-09-30', carte });
  const avec = exportPsy({ journal, episodes: [], symptomes: [], notes }, { aujourdhui: '2026-09-30', carte });
  assert.equal(avec, base);
  assert.ok(!avec.includes(MOT));
});

test('page soignants : une note n\'y figure jamais, même passée avec les données', () => {
  const items = seedItems(SEED_V1, 'x');
  const carte = carteLibelles(items);
  const journal = generer({ jours: 60, seed: 7, scenario: 'bureau', debut: '2026-08-01' });
  const aujourdhui = journal[journal.length - 1].date;
  const data = { journal, episodes: [], symptomes: [], traitements: [], humeurs: [] };
  const analyse = analyze(data, { aujourdhui, items });
  const options = { aujourdhui, carte, analyse, professionnel: 'professionnel:psychiatre', prenom: '' };
  const notes = [{ ...N('n1', aujourdhui, '20:00'), texte: MOT }];
  const avec = JSON.stringify(modeleSoignants({ ...data, notes }, options));
  assert.equal(avec, JSON.stringify(modeleSoignants(data, options)));
  assert.ok(!avec.includes(MOT));
});

test('seul l\'écran des notes lit le store notes : ni l\'Analyse, ni le PDF, ni l\'export PSY', () => {
  const lecteurs = lister(join(RACINE, 'public', 'js'), (p) => p.endsWith('.js'))
    .filter((f) => !rel(f).startsWith('public/js/db/'))
    .filter((f) => /\brepo\s*\.\s*notes\b|\bnotes\s*:\s*repo\b|\.notes\.tous\(/.test(sansCommentaires(lire(f))))
    .map(rel);
  assert.deepEqual(lecteurs, ['public/js/ui/composants/notes.js']);
});
