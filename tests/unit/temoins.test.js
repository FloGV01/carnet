// Sauvegardes témoins écrites par les versions publiées (formats 1, 2 et 3, scripts/temoins.mjs) :
// elles s'importent toujours, sans perte, et un export suivi d'un import reste stable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { RACINE } from '../aides/fichiers.js';
import { nouveauRepo } from '../aides/repo.js';
import { EMPREINTES_PRIVEES } from '../aides/empreintes-privees.js';
import { normaliser as normaliserTexte } from '../aides/mots-interdits.js';
import { concatener, lireZip } from '../../public/js/db/zip.js';
import { analyserFichiers, remplacer, lireTout, exporter, listesManquantes } from '../../public/js/db/sauvegarde.js';
import { normaliser, SCHEMAS } from '../../public/js/domain/champs.js';
import { addDays } from '../../public/js/domain/dates.js';
import { controlerTemoin } from '../../scripts/temoins.mjs';

const DOSSIER = join(RACINE, 'tests', 'fixtures', 'temoins');
const TEMOINS = [
  { fichier: 'format-1.json', format: 1, app: '3.0.0', memos: 0 },
  { fichier: 'format-2.json', format: 2, app: '4.0.0', memos: 0 },
  { fichier: 'format-3.json', format: 3, app: '5.0.0', memos: 0 },
  { fichier: 'format-3-memo.zip', format: 3, app: '5.0.0', memos: 2 },
];
const enc = new TextEncoder();
const dec = new TextDecoder();
const STORES_COMPTES = ['journal', 'episodes', 'symptomes', 'traitements', 'rdv', 'humeurs', 'audios'];

function charger(t) {
  const octets = new Uint8Array(readFileSync(join(DOSSIER, t.fichier)));
  const json = t.fichier.endsWith('.zip') ? lireZip(octets).find((e) => e.nom === 'sauvegarde.json').donnees : octets;
  return { octets, brut: JSON.parse(dec.decode(json)) };
}

async function importer(t) {
  const { octets, brut } = charger(t);
  const analyse = analyserFichiers([{ nom: t.fichier, octets }]);
  const { repo } = nouveauRepo();
  await remplacer(repo, analyse);
  return { brut, analyse, repo };
}

const octetsDe = (fichiers) => fichiers.map((f) => ({ nom: f.nom, octets: concatener(f.morceaux) }));

test('chaque témoin vient de sa version et s\'importe sans erreur ni avertissement', async () => {
  for (const t of TEMOINS) {
    const { brut, analyse } = await importer(t);
    assert.equal(brut.formatVersion, t.format, t.fichier);
    assert.equal(brut.app.version, t.app, t.fichier);
    assert.deepEqual(analyse.erreurs, [], t.fichier);
    assert.equal(analyse.manquants, 0, t.fichier);
    for (const store of Object.keys(SCHEMAS)) {
      for (const e of analyse.sauvegarde.data[store] || []) {
        assert.deepEqual(normaliser(store, e, { origine: 'sauvegarde' }).avertissements, [], `${t.fichier} ${store}`);
      }
    }
  }
});

test('les comptes sont justes : rien n\'est perdu, rien n\'est doublé', async () => {
  for (const t of TEMOINS) {
    const { brut, analyse, repo } = await importer(t);
    const tout = await lireTout(repo);
    for (const s of STORES_COMPTES) assert.equal(tout[s].length, brut.counts[s] ?? 0, `${t.fichier} ${s}`);
    assert.equal(analyse.resume.journees, brut.counts.journal, t.fichier);
    assert.equal(analyse.resume.memos, t.memos, t.fichier);
    // Listes : celles du fichier, telles quelles, plus les listes par défaut absentes et l'id inconnu.
    const lues = new Map(tout.listes.map((i) => [i.id, i]));
    for (const it of brut.data.listes) assert.deepEqual(lues.get(it.id), it, `${t.fichier} ${it.id}`);
    const inconnus = tout.listes.filter((i) => i.origine === 'import').length;
    assert.equal(tout.listes.length, brut.counts.listes + listesManquantes(brut.data.listes).length + inconnus, t.fichier);
  }
});

test('l\'id inconnu est recréé comme élément archivé, et la fiche le garde', async () => {
  for (const t of TEMOINS) {
    const { brut, repo } = await importer(t);
    const crees = (await repo.listes.items()).filter((i) => i.origine === 'import');
    assert.equal(crees.length, 1, t.fichier);
    const [cree] = crees;
    assert.match(cree.id, /^symptome:u-/, t.fichier);
    assert.ok(!brut.data.listes.some((i) => i.id === cree.id), `${t.fichier} : absent du fichier`);
    assert.equal(cree.archive, true);
    assert.match(cree.libelle, /sans libellé/);
    assert.ok((await repo.symptomes.tous()).some((s) => s.symptome === cree.id), t.fichier);
  }
});

test('les contacts v4 passent en une ligne, tels quels', async () => {
  const { brut, repo } = await importer(TEMOINS[1]);
  const avecContact = brut.data.journal.filter((j) => j.contactAvec || j.contactEffet);
  assert.ok(avecContact.length >= 2);
  for (const j of avecContact) {
    const lu = await repo.journal.lire(j.date);
    assert.deepEqual(lu.contacts, [{ avec: j.contactAvec, effet: j.contactEffet }], j.date);
    assert.ok(!('contactAvec' in lu) && !('contactEffet' in lu), j.date);
  }
});

test('la bascule de 4 h est respectée : un épisode à 02:30 et une humeur à 01:30 comptent pour la veille', async () => {
  for (const t of TEMOINS) {
    const { brut, repo } = await importer(t);
    const cas = [['episodes', '02:30'], ...(t.format >= 2 ? [['humeurs', '01:30']] : [])];
    for (const [store, heure] of cas) {
      const e = brut.data[store].find((x) => x.heure === heure);
      const veille = addDays(e.date, -1);
      assert.ok((await repo[store].parJour(veille, veille)).some((x) => x.id === e.id), `${t.fichier} ${store}`);
      assert.ok(!(await repo[store].parJour(e.date, e.date)).some((x) => x.id === e.id), `${t.fichier} ${store}`);
    }
  }
});

test('un export suivi d\'un import redonne les mêmes octets', async () => {
  for (const t of TEMOINS) {
    const { repo } = await importer(t);
    const premier = octetsDe(await exporter(repo, { versionApp: 'test' }));
    const b = nouveauRepo();
    await remplacer(b.repo, analyserFichiers(premier));
    const second = octetsDe(await exporter(b.repo, { versionApp: 'test' }));
    assert.deepEqual(second.map((f) => f.nom), premier.map((f) => f.nom), t.fichier);
    second.forEach((f, i) => assert.ok(Buffer.from(f.octets).equals(Buffer.from(premier[i].octets)), `${t.fichier} : ${f.nom}`));
  }
});

test('aucune empreinte privée dans les témoins, mémos compris', () => {
  const empreinte = (m) => createHash('sha256').update(m).digest('hex');
  for (const t of TEMOINS) {
    const mots = new Set(normaliserTexte(dec.decode(charger(t).octets)).split(/[^a-z0-9]+/).filter((m) => m.length > 2));
    for (const m of mots) assert.ok(!EMPREINTES_PRIVEES.has(empreinte(m)), `${t.fichier} (empreinte ${empreinte(m).slice(0, 8)})`);
  }
});

test('le script refuse un témoin incomplet', () => {
  for (const t of TEMOINS) assert.doesNotThrow(() => controlerTemoin(charger(t).octets), t.fichier);
  const { brut } = charger(TEMOINS[2]);
  const sans = (modifier) => { const s = structuredClone(brut); modifier(s); return enc.encode(JSON.stringify(s)); };
  assert.throws(() => controlerTemoin(sans((s) => { s.data.episodes = s.data.episodes.filter((e) => e.heure !== '02:30'); })), /02:30/);
  assert.throws(() => controlerTemoin(sans((s) => { s.data.humeurs = s.data.humeurs.filter((e) => e.heure !== '01:30'); })), /01:30/);
  assert.throws(() => controlerTemoin(sans((s) => { for (const j of s.data.journal) j.notes = null; })), /journal\.notes/);
  assert.throws(() => controlerTemoin(sans((s) => { for (const e of s.data.episodes) if (e.apresCoup) e.apresCoup.siJe = null; })), /episodes\.apresCoup\.siJe/);
  assert.throws(() => controlerTemoin(sans((s) => { s.data.traitements = []; })), /traitements/);
  assert.throws(() => controlerTemoin(sans((s) => { s.data.rdv = s.data.rdv.filter((r) => r.date); })), /sans date/);
  assert.throws(() => controlerTemoin(sans((s) => { s.data.meta.find((m) => m.cle === 'journee').valeur.masques.push('humeur'); })), /journee/);
  assert.throws(() => controlerTemoin(sans((s) => { s.data.listes = s.data.listes.filter((i) => i.origine !== 'utilisateur'); })), /utilisateur/);
});
