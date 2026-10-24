// Sauvegardes témoins écrites par les versions publiées (formats 1 à 5, scripts/temoins.mjs) :
// elles s'importent toujours au format courant, sans perte, et un export suivi d'un import reste stable.
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
import { analyserFichiers, remplacer, lireTout, exporter, listesManquantes, FORMAT_VERSION } from '../../public/js/db/sauvegarde.js';
import { normaliser, SCHEMAS } from '../../public/js/domain/champs.js';
import { addDays } from '../../public/js/domain/dates.js';
import { versContacts } from '../../public/js/domain/contacts.js';
import { SEED_V4_AJOUTS, SEED_V6_AJOUTS, seedItems } from '../../public/js/domain/vocabulaire.js';
import { controlerTemoin } from '../../scripts/temoins.mjs';

const DOSSIER = join(RACINE, 'tests', 'fixtures', 'temoins');
const TEMOINS = [
  { fichier: 'format-1.json', format: 1, app: '3.0.0', memos: 0 },
  { fichier: 'format-2.json', format: 2, app: '4.0.0', memos: 0 },
  { fichier: 'format-3.json', format: 3, app: '5.0.0', memos: 0 },
  { fichier: 'format-3-memo.zip', format: 3, app: '5.0.0', memos: 2 },
  { fichier: 'format-4.json', format: 4, app: '6.1.0', memos: 0 },
  { fichier: 'format-5.json', format: 5, app: '7.0.0', memos: 0 },
];
// Le témoin JSON d'un format (le zip du format 3 vient après le JSON).
const temoin = (format) => TEMOINS.find((t) => t.format === format);
const enc = new TextEncoder();
const dec = new TextDecoder();
const STORES_COMPTES = ['journal', 'episodes', 'symptomes', 'traitements', 'rdv', 'humeurs', 'notes', 'seances', 'audios'];
const STORES_FICHES = ['journal', 'episodes', 'symptomes', 'traitements', 'rdv', 'humeurs', 'notes', 'seances'];
// Méta techniques, jamais reprises d'un fichier (db/sauvegarde.js).
const META_TECHNIQUES = new Set(['schema', 'installation', 'derniereEcriture', 'derniereSauvegarde']);

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
    // Mis à niveau au format courant : les comptes annoncés suivent ce qui est ajouté.
    assert.equal(analyse.sauvegarde.formatVersion, FORMAT_VERSION, t.fichier);
    assert.equal(analyse.sauvegarde.counts.notes, brut.counts.notes ?? 0, t.fichier);
    assert.equal(analyse.sauvegarde.counts.seances, brut.counts.seances ?? 0, t.fichier);
    assert.equal(analyse.sauvegarde.counts.listes, analyse.sauvegarde.data.listes.length, t.fichier);
    assert.equal(analyse.resume.notes, brut.counts.notes ?? 0, t.fichier);
    assert.equal(analyse.resume.seances, brut.counts.seances ?? 0, t.fichier);
    for (const s of STORES_COMPTES) assert.equal(tout[s].length, brut.counts[s] ?? 0, `${t.fichier} ${s}`);
    assert.equal(analyse.resume.journees, brut.counts.journal, t.fichier);
    assert.equal(analyse.resume.memos, t.memos, t.fichier);
    // Listes : celles du fichier, telles quelles, plus les listes par défaut absentes et l'id inconnu.
    const lues = new Map(tout.listes.map((i) => [i.id, i]));
    for (const it of brut.data.listes) assert.deepEqual(lues.get(it.id), it, `${t.fichier} ${it.id}`);
    // Listes de la v6 : ajoutées à l'import d'un format 3 ou d'avant, déjà dans le fichier au format 4.
    for (const it of seedItems(SEED_V4_AJOUTS, brut.exportedAt)) {
      if (t.format <= 3) assert.deepEqual(lues.get(it.id), it, `${t.fichier} ${it.id} (v6)`);
      else assert.ok(brut.data.listes.some((x) => x.id === it.id), `${t.fichier} ${it.id} (v6) dans le fichier`);
    }
    // Les sujets d'un rendez-vous (v8) : aucun témoin ne les a, l'import les ajoute, datés du fichier.
    for (const it of seedItems(SEED_V6_AJOUTS, brut.exportedAt)) {
      assert.ok(!brut.data.listes.some((x) => x.id === it.id), `${t.fichier} ${it.id} (v8) absent du fichier`);
      assert.deepEqual(lues.get(it.id), it, `${t.fichier} ${it.id} (v8)`);
    }
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

// Chaque champ du fichier se retrouve à l'identique. Seuls écarts admis, ceux qui sont documentés
// (docs/format-sauvegarde.md) : les contacts du format 2 passent en une ligne, les champs apparus
// depuis sont ajoutés vides, la méta technique `schema` n'est pas reprise, et le champ Humeur
// rejoint les champs masqués de Ma journée.
test('le contenu de chaque fiche survit à l\'import', async () => {
  for (const t of TEMOINS) {
    const { brut, repo } = await importer(t);
    const tout = await lireTout(repo);
    for (const store of STORES_FICHES) {
      const cle = store === 'journal' ? 'date' : 'id';
      const lues = new Map(tout[store].map((x) => [x[cle], x]));
      for (const fiche of brut.data[store] || []) {
        const voulue = store === 'journal' && t.format <= 2 ? versContacts(fiche) : fiche;
        const lue = lues.get(fiche[cle]);
        const ici = `${t.fichier} ${store} ${fiche[cle]}`;
        assert.ok(lue, ici);
        for (const [champ, v] of Object.entries(voulue)) assert.deepEqual(lue[champ], v, `${ici} ${champ}`);
        for (const champ of Object.keys(lue)) if (!(champ in voulue)) assert.equal(lue[champ], null, `${ici} ${champ} ajouté vide`);
      }
    }

    const metaVoulue = brut.data.meta.filter((m) => !META_TECHNIQUES.has(m.cle)).map((m) => {
      const masques = m.cle === 'journee' && m.valeur.masques;
      return masques && !masques.includes('humeur') ? { ...m, valeur: { ...m.valeur, masques: [...masques, 'humeur'] } } : m;
    });
    const metaLue = tout.meta.filter((m) => !META_TECHNIQUES.has(m.cle));
    const parCle = (l) => [...l].sort((a, b) => a.cle.localeCompare(b.cle));
    assert.deepEqual(parCle(metaLue), parCle(metaVoulue), `${t.fichier} meta`);
    if (t.format >= 2) assert.deepEqual(metaLue.find((m) => m.cle === 'journee').valeur.masques, ['explosions', 'traitement', 'humeur'], t.fichier);

    // Mémos : chaque champ de la fiche du mémo, et le son tel qu'il est dans le zip.
    const entrees = t.fichier.endsWith('.zip') ? new Map(lireZip(charger(t).octets).map((e) => [e.nom, e.donnees])) : new Map();
    const audios = new Map(tout.audios.map((a) => [a.id, a]));
    for (const { fichier, ...meta } of brut.data.audios) {
      const { data, ...lu } = audios.get(meta.id);
      assert.deepEqual(lu, meta, `${t.fichier} ${meta.id}`);
      assert.ok(Buffer.from(data).equals(Buffer.from(entrees.get(fichier))), `${t.fichier} ${fichier}`);
    }
  }
});

test('les contacts v4 passent en une ligne, tels quels', async () => {
  const { brut, repo } = await importer(temoin(2));
  const avecContact = brut.data.journal.filter((j) => j.contactAvec || j.contactEffet);
  assert.ok(avecContact.length >= 2);
  for (const j of avecContact) {
    const lu = await repo.journal.lire(j.date);
    assert.deepEqual(lu.contacts, [{ avec: j.contactAvec, effet: j.contactEffet }], j.date);
    assert.ok(!('contactAvec' in lu) && !('contactEffet' in lu), j.date);
  }
});

test('la bascule de 4 h est respectée : un épisode à 02:30, une humeur, une note et une séance à 01:30 comptent pour la veille', async () => {
  for (const t of TEMOINS) {
    const { brut, repo } = await importer(t);
    const cas = [['episodes', '02:30'], ...(t.format >= 2 ? [['humeurs', '01:30']] : []), ...(t.format >= 4 ? [['notes', '01:30']] : []),
      ...(t.format >= 5 ? [['seances', '01:30']] : [])];
    for (const [store, heure] of cas) {
      const e = brut.data[store].find((x) => x.heure === heure);
      const veille = addDays(e.date, -1);
      assert.ok((await repo[store].parJour(veille, veille)).some((x) => x.id === e.id), `${t.fichier} ${store}`);
      assert.ok(!(await repo[store].parJour(e.date, e.date)).some((x) => x.id === e.id), `${t.fichier} ${store}`);
    }
  }
});

// v7, point de vigilance 1 : les notes de 1 à 10 d'une sauvegarde v6.1 sont gardées, sans émotion.
test('v7 : le témoin au format 4 garde ses notes de 1 à 10, ses relevés n\'ont pas d\'émotion', async () => {
  const { brut, analyse, repo } = await importer(temoin(4));
  assert.ok(brut.data.humeurs.length >= 3);
  assert.ok(brut.data.humeurs.every((h) => !('emotion' in h)), 'la v6.1 ne connaissait pas l\'émotion');
  assert.ok(analyse.sauvegarde.data.humeurs.every((h) => h.emotion === null), 'emotion: null ajouté par la mise à niveau');
  for (const h of brut.data.humeurs) {
    const lu = await repo.humeurs.lire(h.id);
    assert.equal(lu.humeur, h.humeur, h.id);
    assert.equal(lu.emotion, null, h.id);
    assert.equal(lu.energie, h.energie, h.id);
  }
  for (const j of brut.data.journal) assert.equal((await repo.journal.lire(j.date)).humeur, j.humeur, j.date);
  assert.deepEqual(await repo.seances.tous(), []);
  assert.deepEqual((await repo.notes.tous()).map((n) => n.texte), brut.data.notes.map((n) => n.texte));
});

// v8, point de vigilance 1 : une sauvegarde de la v7 passe au format 6 sans perte. Ses séances n'ont pas de fin
// (le Programme n'en date aucune), ses nuits ont coucher et lever sans nombre d'heures (Mes nuits les calcule).
test('v8 : le témoin au format 5 garde ses séances sans fin, ses nuits sans heures, ses émotions et ses notes', async () => {
  const { brut, analyse, repo } = await importer(temoin(5));
  assert.equal(analyse.sauvegarde.formatVersion, 6);
  assert.deepEqual(analyse.erreurs, []);
  assert.ok(brut.data.seances.length >= 3);
  assert.ok(brut.data.seances.every((x) => !('fin' in x) && !('programme' in x)), 'la v7 ne connaissait ni fin ni programme');
  for (const x of brut.data.seances) {
    const lue = await repo.seances.lire(x.id);
    for (const [champ, v] of Object.entries(x)) assert.deepEqual(lue[champ], v, `${x.id} ${champ}`);
    assert.equal(lue.fin, null, `${x.id} : aucune séance v7 n'est « Faite »`);
    assert.equal(lue.programme, null, x.id);
  }
  const nuits = brut.data.journal.filter((j) => j.heureCoucher && j.heureLever);
  assert.ok(nuits.length >= 1);
  for (const j of brut.data.journal) {
    const lu = await repo.journal.lire(j.date);
    assert.ok(!('heuresSommeil' in j), j.date);
    assert.equal(lu.heuresSommeil, null, `${j.date} : aucun nombre d'heures inventé`);
    assert.equal(lu.heureCoucher, j.heureCoucher, j.date);
    assert.equal(lu.heureLever, j.heureLever, j.date);
    assert.equal(lu.reveilsNocturnes, j.reveilsNocturnes, j.date);
    assert.equal(lu.sommeilRessenti, j.sommeilRessenti, j.date);
  }
  for (const h of brut.data.humeurs) {
    const lu = await repo.humeurs.lire(h.id);
    assert.equal(lu.emotion, h.emotion, h.id);
    assert.equal(lu.humeur, h.humeur, h.id);
  }
  assert.ok(brut.data.humeurs.some((h) => h.emotion && h.emotion.split(':').length === 2), 'une famille seule de la v7 reste valable');
  assert.equal(await repo.meta.lire('definitionsRoue'), null, 'aucune définition corrigée dans une sauvegarde de la v7');
  assert.equal(await repo.meta.lire('schema'), 6);
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
  const { brut } = charger(temoin(3));
  const sans = (modifier) => { const s = structuredClone(brut); modifier(s); return enc.encode(JSON.stringify(s)); };
  assert.throws(() => controlerTemoin(sans((s) => { s.data.episodes = s.data.episodes.filter((e) => e.heure !== '02:30'); })), /02:30/);
  assert.throws(() => controlerTemoin(sans((s) => { s.data.humeurs = s.data.humeurs.filter((e) => e.heure !== '01:30'); })), /01:30/);
  assert.throws(() => controlerTemoin(sans((s) => { for (const j of s.data.journal) j.notes = null; })), /journal\.notes/);
  assert.throws(() => controlerTemoin(sans((s) => { for (const e of s.data.episodes) if (e.apresCoup) e.apresCoup.siJe = null; })), /episodes\.apresCoup\.siJe/);
  assert.throws(() => controlerTemoin(sans((s) => { s.data.traitements = []; })), /traitements/);
  assert.throws(() => controlerTemoin(sans((s) => { s.data.rdv = s.data.rdv.filter((r) => r.date); })), /sans date/);
  assert.throws(() => controlerTemoin(sans((s) => { s.data.meta.find((m) => m.cle === 'journee').valeur.masques.push('humeur'); })), /journee/);
  assert.throws(() => controlerTemoin(sans((s) => { s.data.listes = s.data.listes.filter((i) => i.origine !== 'utilisateur'); })), /utilisateur/);

  const quatre = charger(temoin(4)).brut;
  const sans4 = (modifier) => { const s = structuredClone(quatre); modifier(s); return enc.encode(JSON.stringify(s)); };
  assert.throws(() => controlerTemoin(sans4((s) => { s.data.notes = []; s.counts.notes = 0; })), /notes : aucun enregistrement/);
  assert.throws(() => controlerTemoin(sans4((s) => { for (const j of s.data.journal) j.pese = null; })), /journal\.pese/);
  assert.throws(() => controlerTemoin(sans4((s) => { for (const h of s.data.humeurs) h.vers = null; })), /humeurs\.vers/);
  assert.throws(() => controlerTemoin(sans4((s) => { for (const r of s.data.rdv) for (const q of r.questions || []) delete q.lien; })), /liée/);
  assert.throws(() => controlerTemoin(sans4((s) => { const j = s.data.meta.find((m) => m.cle === 'journee'); j.valeur.masques = ['explosions']; })), /journee/);
  assert.throws(() => controlerTemoin(sans4((s) => { s.data.meta = s.data.meta.filter((m) => m.cle !== 'ressourcer'); })), /réglages de la v6/);

  const cinq = charger(temoin(5)).brut;
  const sans5 = (modifier) => { const s = structuredClone(cinq); modifier(s); return enc.encode(JSON.stringify(s)); };
  assert.throws(() => controlerTemoin(sans5((s) => { s.data.seances = []; s.counts.seances = 0; })), /seances : aucun enregistrement/);
  assert.throws(() => controlerTemoin(sans5((s) => { s.data.seances = s.data.seances.filter((x) => x.heure !== '01:30'); })), /séance à 01:30/);
  assert.throws(() => controlerTemoin(sans5((s) => { s.data.seances = s.data.seances.filter((x) => x.origine !== 'ressourcer'); })), /chaque origine/);
  assert.throws(() => controlerTemoin(sans5((s) => { for (const h of s.data.humeurs) if (h.emotion && h.emotion.split(':').length === 2) h.emotion = 'roue:serenite:calme'; })), /famille seule/);
  assert.throws(() => controlerTemoin(sans5((s) => { for (const h of s.data.humeurs) h.emotion = null; })), /humeurs\.emotion/);
  assert.throws(() => controlerTemoin(sans5((s) => { for (const h of s.data.humeurs) if (!h.emotion) h.humeur = null; })), /1 à 10/);
});
