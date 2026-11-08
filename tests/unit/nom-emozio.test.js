import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { RACINE, lister, rel, lire, sansCommentaires, chainesJs } from '../aides/fichiers.js';
import { creerRepository } from '../../public/js/db/repository.js';
import { FORMAT, nomFichier, exporter, analyserFichiers } from '../../public/js/db/sauvegarde.js';
import { concatener } from '../../public/js/db/zip.js';

// v11 · Le nom Emozio (docs/decisions.md, « 2026-11-07 : le nom Emozio ») : tout ce que l'utilisateur voit dit « Emozio »,
// sans article ; le nom interne reste `carnet` (la base, le format de sauvegarde, le cache, les clés locales), sans quoi
// l'app croirait repartir de zéro et les anciennes sauvegardes ne s'importeraient plus.
const pub = (...p) => join(RACINE, 'public', ...p);
const sourcesApp = () => lister(pub('js'), (p) => p.endsWith('.js') && !p.includes(`${'/'}vendor${'/'}`));

test('le manifest et index.html disent « Emozio » : name, short_name, <title>, apple-mobile-web-app-title, application-name, chargement', () => {
  const manifest = JSON.parse(lire(pub('manifest.webmanifest')));
  assert.equal(manifest.name, 'Emozio');
  assert.equal(manifest.short_name, 'Emozio');
  const page = lire(pub('index.html'));
  assert.match(page, /<title>Emozio<\/title>/);
  assert.match(page, /<meta name="apple-mobile-web-app-title" content="Emozio">/);
  assert.match(page, /<meta name="application-name" content="Emozio">/);
  assert.match(page, /<div id="app"><p class="chargement">Emozio<\/p><\/div>/);
  assert.match(page, /<noscript><p class="chargement">Emozio a besoin de JavaScript\.<\/p><\/noscript>/);
});

test('aucun « Carnet » dans index.html, le manifest et public/js/ui/, commentaires compris ; ni dans un texte de l\'app ailleurs', () => {
  const ui = lister(pub('js', 'ui'), (p) => p.endsWith('.js'));
  assert.ok(ui.length > 50);
  const fichiers = [pub('index.html'), pub('manifest.webmanifest'), ...ui];
  assert.deepEqual(fichiers.filter((f) => /Carnet/.test(lire(f))).map(rel), []);
  // Hors de ui/, un message d'erreur de la base ou de l'import s'affiche aussi : aucune chaîne ne dit « Carnet ».
  const app = [...sourcesApp(), pub('sw.js')];
  assert.deepEqual(app.filter((f) => /Carnet/.test(chainesJs(lire(f)))).map(rel), []);
});

test('le nom interne reste `carnet` : la base IndexedDB, FORMAT, le préfixe du cache, les clés locales', async () => {
  const fabrique = new IDBFactory();
  const repo = creerRepository({ fabrique, cles: IDBKeyRange, now: () => new Date(2026, 10, 7, 21, 0) });
  await repo.journal.patch('2026-11-07', { humeur: 5 });
  assert.deepEqual((await fabrique.databases()).map((d) => d.name), ['carnet']);
  assert.equal(FORMAT, 'carnet-sauvegarde');
  const sw = sansCommentaires(lire(pub('sw.js')));
  assert.ok(sw.includes('const CACHE = `carnet-${VERSION}`;'), 'préfixe du cache');
  assert.ok(sw.includes('nom.startsWith(\'carnet-\')'), 'nettoyage des anciens caches');
  // Les clés du stockage local gardent leur préfixe : aucune ne passe à `emozio:`.
  const sources = sourcesApp().map((f) => sansCommentaires(lire(f))).join('\n');
  assert.ok(sources.includes('\'carnet:spotify:attente\''));
  assert.ok(sources.includes('\'carnet:exercice:voix\''));
  assert.doesNotMatch(sources, /emozio:/);
  assert.doesNotMatch(sources, /['"`]emozio['"`]/, 'aucune base ni format nommé « emozio »');
});

test('un fichier exporté commence par `emozio-` ; l\'import accepte un fichier quel que soit son nom, ancien compris', async () => {
  const date = new Date(2026, 10, 7, 21, 5);
  assert.equal(nomFichier(date, { total: 1 }), 'emozio-sauvegarde-2026-11-07-2105.json');
  assert.equal(nomFichier(date, { partie: 2, total: 3, zip: true }), 'emozio-sauvegarde-2026-11-07-2105-partie-2-sur-3.zip');
  const repo = creerRepository({ fabrique: new IDBFactory(), cles: IDBKeyRange, now: () => date });
  await repo.journal.patch('2026-11-07', { humeur: 5 });
  const [f] = await exporter(repo, { versionApp: '11.0.0' });
  assert.equal(f.nom, 'emozio-sauvegarde-2026-11-07-2105.json');
  const octets = concatener(f.morceaux);
  for (const nom of [f.nom, 'carnet-sauvegarde-2026-10-19-2130.json', 'sans nom']) {
    assert.equal(analyserFichiers([{ nom, octets }]).resume.journees, 1, nom);
  }
  // Aucun autre nom de fichier en `carnet-…` : restent l'identifiant FORMAT, le marqueur du fichier de test du Diagnostic
  // (jamais importé) et le préfixe du cache.
  const restes = new Set();
  for (const f2 of [...sourcesApp(), pub('sw.js')]) for (const m of sansCommentaires(lire(f2)).matchAll(/carnet-[\w.-]*/g)) restes.add(m[0]);
  assert.deepEqual([...restes].sort(), ['carnet-', 'carnet-sauvegarde', 'carnet-test']);
  const sources = sourcesApp().map((x) => lire(x)).join('\n');
  for (const x of ['`emozio-consultation-${aujourdhui}.pdf`', '\'emozio-test.pdf\'', '\'emozio-test.json\'', '\'emozio-test.zip\'']) assert.ok(sources.includes(x), x);
});

test('.gitignore garde les motifs `carnet-*` des anciens fichiers et ajoute ceux d\'`emozio-*`', () => {
  const lignes = lire(join(RACINE, '.gitignore')).split('\n');
  for (const ext of ['json', 'zip', 'pdf', 'txt']) {
    assert.ok(lignes.includes(`carnet-*.${ext}`), `carnet-*.${ext}`);
    assert.ok(lignes.includes(`emozio-*.${ext}`), `emozio-*.${ext}`);
  }
});

test('CLAUDE.md et package.json : le nom Emozio, la règle des données privées cite `emozio-*.zip`, le nom interne reste `carnet`', () => {
  const claude = lire(join(RACINE, 'CLAUDE.md'));
  assert.equal(claude.split('\n', 1)[0], '# CLAUDE.md : Emozio (suivi-audhd)');
  const prive = claude.split('\n').find((l) => l.startsWith('- Ne jamais lire `donnees-privees/`'));
  assert.ok(prive && prive.includes('`carnet-*.zip`') && prive.includes('`emozio-*.zip`'), prive);
  assert.match(claude, /nom interne reste `carnet`/);
  const paquet = JSON.parse(lire(join(RACINE, 'package.json')));
  assert.equal(paquet.name, 'suivi-audhd');
  assert.match(paquet.description, /^Emozio/);
});

test('docs : l\'entrée « 2026-11-07 : le nom Emozio », la recette vérifie le nom sous l\'icône, le format dit ce qui change et ce qui reste', () => {
  const decisions = lire(join(RACINE, 'docs', 'decisions.md'));
  const entrees = decisions.split(/^(?=## )/m);
  const nom = entrees.find((e) => e.startsWith('## 2026-11-07 : le nom Emozio\n'));
  assert.ok(nom, 'entrée du nom absente');
  for (const x of ['« Carnet » était banal', '« Feels »', '« Emozione »', 'mot basque pour « émotion »', 'agence web néerlandaise', '**Un nom propre, sans article**',
    '**La base IndexedDB `carnet`**', '**`FORMAT = \'carnet-sauvegarde\'`**', '**Le préfixe de cache `carnet-` de `sw.js`**', '**Les clés `localStorage` `carnet:…`**',
    '`emozio-sauvegarde-AAAA-MM-JJ-HHMM.json`', '`emozio-consultation-AAAA-MM-JJ.pdf`', '« Le soir dans Emozio, si tu veux. »']) {
    assert.ok(nom.includes(x), `entrée du nom : ${x}`);
  }
  // L'entrée vient avant celle de la v11, dans l'ordre des dates, et n'est pas une entrée de version.
  const titres = entrees.map((e) => e.split('\n', 1)[0]);
  assert.equal(titres.indexOf('## 2026-11-07 : le nom Emozio') + 1, titres.indexOf('## 2026-11-08 : v11.0.0, six retours après la v10'));
  assert.ok(!nom.includes('**Version 11.0.0**'));
  const recette = lire(join(RACINE, 'docs', 'recette-iphone.md'));
  assert.ok(recette.includes('Sous la nouvelle icône, le nom est « Emozio »'));
  const format = lire(join(RACINE, 'docs', 'format-sauvegarde.md'));
  assert.ok(format.includes('`emozio-sauvegarde-AAAA-MM-JJ-HHMM.json`') && format.includes('l\'identifiant `format` reste `carnet-sauvegarde`'));
  assert.ok(format.includes('L\'import ne lit jamais le nom d\'un fichier'));
});

// Relecture du nom : docs/rappel-du-soir.md, que le renommage met à jour, dit ce que disent les écrans. Depuis la v7,
// l'écran Rappels dit « Émotion du moment » et le bouton du bas d'Aujourd'hui « Émotion » ; la doc disait encore « Humeur ».
test('docs/rappel-du-soir.md reprend l\'écran Rappels : les textes des notifications, son titre et le bouton du bas d\'Aujourd\'hui, sans « Humeur »', () => {
  const rappel = sansCommentaires(lire(pub('js', 'ui', 'ecrans', 'rappel.js')));
  const textes = [...rappel.matchAll(/« ([^«»]*, si tu veux\.) »/g)].map((m) => m[1]);
  assert.deepEqual(textes, ['Le soir dans Emozio, si tu veux.', 'Émotion du moment, si tu veux.']);
  const titres = [...rappel.matchAll(/<h2 class="libelle-section">([^<]+)<\/h2>/g)].map((m) => m[1]);
  assert.deepEqual(titres, ['Le soir', 'Émotion du moment']);
  const titre = titres[1];
  const bouton = rappel.match(/touche « ([^«»]+) », en bas\./)[1];
  // Le bouton que l'écran nomme est bien celui de la bande du bas d'Aujourd'hui, qui ouvre l'Émotion du moment.
  const aujourdhui = sansCommentaires(lire(pub('js', 'ui', 'ecrans', 'aujourdhui.js')));
  assert.equal(aujourdhui.match(/href="#\/moment"[^]*?<span class="libelle-action">([^<]+)<\/span>/)[1], bouton);
  const docRappel = lire(join(RACINE, 'docs', 'rappel-du-soir.md'));
  for (const t of textes) assert.ok(docRappel.includes(`« ${t} »`), t);
  assert.ok(docRappel.includes(`\n## ${titre} (si tu veux)\n`), 'titre de section');
  assert.ok(docRappel.includes(`ouvrir Emozio et toucher « ${bouton} », en bas.`), 'bouton');
  assert.doesNotMatch(docRappel, /Humeur/);
});
