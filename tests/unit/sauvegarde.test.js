import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nouveauRepo } from '../aides/repo.js';
import { concatener } from '../../public/js/db/zip.js';
import {
  exporter, construireSauvegarde, analyserFichiers, remplacer, chiffrerPerte, lireTout,
  revenirAvantImport, copieAvantImport, toutEffacer, FORMAT_VERSION,
} from '../../public/js/db/sauvegarde.js';

const octetsDe = (f) => concatener(f.morceaux);
const enc = new TextEncoder();

async function remplir(repo) {
  await repo.journal.patch('2026-09-29', { humeur: 4, lieu: 'lieu:teletravail' });
  await repo.journal.patch('2026-09-30', { humeur: 6, pointsPositifs: 'marche' });
  const ep = await repo.episodes.creer({ date: '2026-09-30', heure: '18:42', emotion: 'emotion:colere', declencheur: 'declencheur:pris_pour_un_con' });
  await repo.rdv.creer({ professionnel: 'professionnel:psychiatre', questions: [{ texte: 'Sommeil' }] });
  await repo.listes.renommer('lieu:bureau', 'Au bureau');
  return ep;
}

test('aller-retour JSON sans mémo : identique à l\'original', async () => {
  const a = nouveauRepo();
  await remplir(a.repo);
  const [f] = await exporter(a.repo, { versionApp: '1.0.0' });
  assert.match(f.nom, /^carnet-sauvegarde-2026-09-30-2100\.json$/);
  const analyse = analyserFichiers([{ nom: f.nom, octets: octetsDe(f) }]);
  assert.deepEqual(analyse.erreurs, []);
  assert.equal(analyse.resume.journees, 2);
  assert.equal(analyse.resume.du, '2026-09-29');
  const b = nouveauRepo();
  await b.repo.journal.patch('2026-01-01', { humeur: 9 });
  await remplacer(b.repo, analyse);
  const avant = await lireTout(a.repo);
  const apres = await lireTout(b.repo);
  for (const s of ['journal', 'episodes', 'rdv', 'listes']) assert.deepEqual(apres[s], avant[s], s);
  assert.equal(await b.repo.journal.lire('2026-01-01'), null);
});

test('aller-retour ZIP avec mémos, y compris en plusieurs parties', async () => {
  const a = nouveauRepo();
  const ep = await remplir(a.repo);
  const octets = (n, v) => new Uint8Array(n).fill(v).buffer;
  await a.repo.audios.creer({ parentStore: 'journal', parentId: '2026-09-30', dureeMs: 3000, mime: 'audio/mp4', data: octets(600, 1) });
  await a.repo.audios.creer({ parentStore: 'episodes', parentId: ep.id, dureeMs: 2000, mime: 'audio/mp4', data: octets(700, 2) });
  const donnees = await lireTout(a.repo);
  const fichiers = construireSauvegarde(donnees, { maintenant: new Date(2026, 8, 30, 21, 0), versionApp: '1.0.0', seuil: 1000 });
  assert.equal(fichiers.length, 2);
  assert.match(fichiers[0].nom, /-partie-1-sur-2\.zip$/);
  const seule = analyserFichiers([{ nom: fichiers[0].nom, octets: octetsDe(fichiers[0]) }]);
  assert.equal(seule.manquants, 1);
  const analyse = analyserFichiers(fichiers.map((f) => ({ nom: f.nom, octets: octetsDe(f) })));
  assert.equal(analyse.manquants, 0);
  assert.equal(analyse.resume.memos, 2);
  const b = nouveauRepo();
  await remplacer(b.repo, analyse);
  const relus = await b.repo.audios.parParent('episodes', ep.id);
  assert.deepEqual(Array.from(new Uint8Array(relus[0].data)).slice(0, 3), [2, 2, 2]);
});

test('fichiers refusés : illisible, autre format, version future, tronqué', () => {
  const json = (o) => [{ nom: 'x.json', octets: enc.encode(JSON.stringify(o)) }];
  assert.throws(() => analyserFichiers([{ nom: 'x', octets: enc.encode('{pas du json') }]), /illisible/);
  assert.throws(() => analyserFichiers(json({ format: 'autre' })), /ne ressemble pas/);
  assert.throws(() => analyserFichiers(json({ format: 'carnet-sauvegarde', formatVersion: FORMAT_VERSION + 1 })), (e) => e.code === 'BACKUP_VERSION_FUTURE');
  assert.throws(() => analyserFichiers(json({ format: 'carnet-sauvegarde', formatVersion: 1, counts: { journal: 3 }, data: { journal: [] } })), (e) => e.code === 'BACKUP_INCOMPLET');
  assert.throws(() => analyserFichiers([{ nom: 'x.zip', octets: new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0]) }]), (e) => e.code === 'BACKUP_INCOMPLET');
});

test('enregistrements invalides listés, id de liste inconnu recréé archivé', () => {
  const s = {
    format: 'carnet-sauvegarde', formatVersion: 1, exportedAt: '2026-09-30T19:00:00.000Z', counts: { journal: 2, listes: 0 },
    data: { journal: [{ date: '2026-09-30', lieu: 'lieu:u-disparu', humeur: 5 }, { date: '2026-02-31', humeur: 3 }], listes: [] },
  };
  const a = analyserFichiers([{ nom: 's.json', octets: enc.encode(JSON.stringify(s)) }]);
  assert.equal(a.erreurs.length, 1);
  assert.equal(a.valides.journal.length, 1);
  const cree = a.valides.listes.find((i) => i.id === 'lieu:u-disparu');
  assert.ok(cree.archive);
  assert.match(cree.libelle, /Élément sans libellé/);
});

test('perte chiffrée : ce qui est ici et absent du fichier', async () => {
  const a = nouveauRepo();
  await remplir(a.repo);
  const [f] = await exporter(a.repo, { versionApp: '1' });
  const analyse = analyserFichiers([{ nom: f.nom, octets: octetsDe(f) }]);
  await a.repo.journal.patch('2026-10-01', { humeur: 7 });
  await a.repo.episodes.creer({ date: '2026-10-01', emotion: 'emotion:joie' });
  const perte = chiffrerPerte(await lireTout(a.repo), analyse);
  assert.equal(perte.journal, 1);
  assert.equal(perte.episodes, 1);
});

test('une panne pendant l\'application n\'écrit rien ; 3 copies au maximum ; retour avant import', async () => {
  const a = nouveauRepo();
  await remplir(a.repo);
  const [f] = await exporter(a.repo, { versionApp: '1' });
  const analyse = analyserFichiers([{ nom: f.nom, octets: octetsDe(f) }]);
  const b = nouveauRepo();
  await b.repo.journal.patch('2026-01-01', { humeur: 9 });
  await assert.rejects(remplacer(b.repo, analyse, { panne: 'episodes' }), /panne/);
  assert.equal((await b.repo.journal.lire('2026-01-01')).humeur, 9);
  assert.equal(await copieAvantImport(b.repo), null);
  for (let i = 0; i < 4; i++) { b.horloge.t = new Date(2026, 9, 1, 10, i); await remplacer(b.repo, analyse); }
  const snaps = await b.repo.tx(['snapshots'], 'readonly', (t) => new Promise((ok) => { const r = t.objectStore('snapshots').getAll(); r.onsuccess = () => ok(r.result); }));
  assert.equal(snaps.filter((x) => x.type === 'avant-import').length, 3);
  assert.equal(await b.repo.journal.lire('2026-01-01'), null);
  await revenirAvantImport(b.repo);
  assert.equal((await b.repo.journal.lire('2026-09-30')).humeur, 6, 'état juste avant le dernier import');
});

test('tout effacer : données vidées, listes par défaut recréées', async () => {
  const a = nouveauRepo();
  await remplir(a.repo);
  await toutEffacer(a.repo);
  const tout = await lireTout(a.repo);
  assert.equal(tout.journal.length, 0);
  assert.equal(tout.episodes.length, 0);
  assert.equal(tout.listes.length, 97);
  assert.equal(tout.listes.find((i) => i.id === 'lieu:bureau').libelle, 'Bureau');
  assert.ok(await a.repo.meta.lire('installation'));
});
