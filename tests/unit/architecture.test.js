import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { RACINE, lister, rel, lire, sansCommentaires } from '../aides/fichiers.js';
import { lireEnTetes, enTetesPour } from '../../scripts/en-tetes.mjs';

const PUBLIC = join(RACINE, 'public');
const js = lister(join(PUBLIC, 'js'), (p) => p.endsWith('.js'));
const PURS = ['public/js/domain/', 'public/js/analyse/', 'public/js/db/', 'public/js/export/', 'public/js/plateforme/'];

test('seul ui/ (et les points d\'entrée) importe ui/ ou vendor/', () => {
  for (const f of js) {
    const r = rel(f);
    if (r.startsWith('public/js/ui/') || r === 'public/js/app.js' || r === 'public/js/main.js') continue;
    const imports = [...lire(f).matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
    for (const i of imports) assert.ok(!/\/ui\/|vendor\//.test(i), `${r} importe ${i}`);
  }
});

test('les modules purs n\'utilisent ni document ni window', () => {
  for (const f of js) {
    const r = rel(f);
    if (!PURS.some((p) => r.startsWith(p)) || r.startsWith('public/js/plateforme/')) continue;
    const code = sansCommentaires(lire(f));
    assert.ok(!/\b(document|window|localStorage)\b/.test(code), `${r} touche au DOM`);
  }
});

// v11 (7/11) : une exception étroite, la connexion à Spotify (spec §8.3) : ce seul fichier, et seulement ses deux hôtes, en https.
const SPOTIFY = 'public/js/plateforme/spotify.js';
const HOTES_SPOTIFY = new Set(['accounts.spotify.com', 'api.spotify.com']);
const deSpotify = (u) => { try { const x = new URL(u); return x.protocol === 'https:' && HOTES_SPOTIFY.has(x.hostname) && !x.port && !x.username; } catch { return false; } };
test('aucune URL http(s) dans public/ (hors espace de noms SVG), sauf les deux hôtes de Spotify dans plateforme/spotify.js', () => {
  let vues = 0;
  for (const f of lister(PUBLIC, (p) => /\.(js|css|html|webmanifest|svg)$/.test(p))) {
    let urls = (lire(f).match(/https?:\/\/[^\s'"`)]+/g) || []).filter((u) => !u.startsWith('http://www.w3.org/'));
    if (rel(f) === SPOTIFY) { vues = urls.length; urls = urls.filter((u) => !deSpotify(u)); }
    assert.deepEqual(urls, [], rel(f));
  }
  assert.equal(vues, 3, 'les trois adresses de Spotify : authorize, api/token, v1/me/playlists');
  assert.equal(deSpotify('https://accounts.spotify.com.autre.test/x'), false);
  assert.equal(deSpotify('http://api.spotify.com/v1'), false);
  assert.equal(deSpotify('https://open.spotify.com/playlist/x'), false);
});

// v11 (7/11) : le réseau ne part que de deux fichiers, le service worker (même origine) et la connexion à Spotify ; aucune autre
// façon d'appeler le réseau nulle part.
test('fetch( n\'existe que dans sw.js et plateforme/spotify.js ; ni XMLHttpRequest, ni sendBeacon, ni WebSocket, ni EventSource', () => {
  const avecFetch = [];
  for (const f of lister(PUBLIC, (p) => /\.(js|html)$/.test(p))) {
    const code = sansCommentaires(lire(f));
    if (/\bfetch\(/.test(code)) avecFetch.push(rel(f));
    assert.ok(!/\b(XMLHttpRequest|sendBeacon|WebSocket|EventSource)\b/.test(code), rel(f));
  }
  assert.deepEqual(avecFetch.sort(), [SPOTIFY, 'public/sw.js']);
});

// v11 (7/11) : la CSP de netlify.toml, seule source des en-têtes (lue comme le fait scripts/serve.mjs) : connect-src gagne
// exactement les deux hôtes de Spotify ; ni script, ni image d'ailleurs.
test('netlify.toml : connect-src exact, script-src et img-src toujours \'self\'', () => {
  const csp = enTetesPour(lireEnTetes(join(RACINE, 'netlify.toml')), '/index.html')['Content-Security-Policy'];
  const directives = Object.fromEntries(csp.split(';').map((d) => d.trim().split(/\s+/)).map(([nom, ...valeurs]) => [nom, valeurs.join(' ')]));
  assert.equal(directives['connect-src'], "'self' https://accounts.spotify.com https://api.spotify.com");
  assert.equal(directives['script-src'], "'self'");
  assert.equal(directives['img-src'], "'self'");
  assert.equal(directives['default-src'], "'none'");
  assert.equal(directives['form-action'], "'none'");
});

test('aucun script ni style en ligne dans index.html', () => {
  const html = lire(join(PUBLIC, 'index.html'));
  assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/.test(html), 'script en ligne');
  assert.ok(!/<style\b/.test(html) && !/\sstyle=/.test(html), 'style en ligne');
  assert.ok(!/\son[a-z]+=/.test(html), 'gestionnaire en ligne');
});

// Les tests et les scripts aussi (relecture v8 : CLAUDE.md fait tout passer par domain/dates.js). Ce fichier, qui écrit la
// règle, est le seul à part.
const AUSSI = [...lister(join(RACINE, 'tests'), (p) => p.endsWith('.js') && !p.endsWith('architecture.test.js')),
  ...lister(join(RACINE, 'scripts'), (p) => /\.m?js$/.test(p))];
test('pas de toISOString().slice(0, 10) pour fabriquer une date du jour, ni dans l\'app, ni dans les tests et les scripts', () => {
  for (const f of [...js, ...AUSSI]) assert.ok(!/toISOString\(\)\s*\.\s*(slice|substring|substr)\(\s*0\s*,\s*10\s*\)/.test(lire(f)), rel(f));
});

test('pas d\'eval ni de new Function dans le code de l\'app', () => {
  for (const f of js) assert.ok(!/\beval\(|new Function\(/.test(sansCommentaires(lire(f))), rel(f));
});

// ---------- v6 : humeur du jour ----------

const ANALYSE = js.filter((f) => rel(f).startsWith('public/js/analyse/'));
const nomDe = (f) => rel(f).slice('public/js/analyse/'.length);

test('humeur du jour : index.js enrichit le journal avant tout appel', () => {
  const code = sansCommentaires(lire(join(PUBLIC, 'js', 'analyse', 'index.js')));
  const corps = code.slice(code.indexOf('export function analyze'));
  const enrichi = corps.indexOf('avecHumeurDuJour(');
  assert.ok(enrichi > 0, 'analyze() ne construit pas l\'humeur du jour');
  const appels = ['journalAvecExplosions', 'premiereDate', 'indicateurs', 'classements', 'profilJournee', 'tesMoments', 'frise'];
  for (const f of appels) {
    const i = corps.indexOf(`${f}(`);
    assert.ok(i > enrichi, `${f} appelé avant l'humeur du jour`);
  }
});

test('humeur du jour : aucun module d\'analyse ne lit l\'humeur brute', () => {
  for (const f of ANALYSE) {
    const nom = nomDe(f);
    if (nom === 'humeur-jour.js') continue;
    const code = sansCommentaires(lire(f));
    // L'humeur du jour est décimale : plus aucun test « entier de 1 à 10 » (estHumeur).
    assert.ok(!/Number\.isInteger\([^)]*humeur/.test(code), `${nom} n'accepte que des humeurs entières`);
    // Seuls les points d'entrée calculent l'humeur du jour : index.js (l'Analyse) et comprendre.js (l'écran
    // Comprendre, qui lit aussi l'énergie et les émotions des relevés, spec §2.2). Ailleurs, seul moments.js (« Ta journée
    // heure par heure ») lit les relevés. Exceptions, pour Mes jours (spec §3, v7 §5) : energie-jour.js lit les relevés pour
    // leur seule énergie et emotions.js pour leur seule émotion (jamais leur humeur), et frise.js ne fait que les leur passer.
    if (nom === 'index.js' || nom === 'comprendre.js') continue;
    assert.ok(!/\b(avecHumeurDuJour|humeursDuJour)\b/.test(code), `${nom} recalcule l'humeur du jour`);
    if (nom === 'energie-jour.js' || nom === 'emotions.js') {
      assert.ok(!/\.humeur\b/.test(code), `${nom} lit l'humeur des relevés`);
      continue;
    }
    if (nom === 'frise.js') {
      // Les relevés n'ont que trois emplois : le paramètre, energieBasseParJour(humeurs) et emotionsParJour(humeurs, …) (v9 :
      // avec les mots à soi, `perso`). Le reste de `humeurs` dans ce fichier, ce sont les humeurs du jour d'une semaine ou
      // d'un mois (g.humeurs, humeurs: []).
      const emplois = code.match(/(?<![.\w])humeurs\b(?!\s*:)/g) || [];
      assert.ok(emplois.length === 3 && code.includes('energieBasseParJour(humeurs)') && /\bemotionsParJour\(humeurs, du, au(, perso)?\)/.test(code),
        `${nom} lit autre chose que l'énergie et les émotions des relevés`);
      continue;
    }
    if (nom === 'moments.js') continue;
    assert.ok(!/\bdata\.humeurs\b|export function \w+\s*\(\s*(\{[^)]*\bhumeurs\b|humeurs\b)/.test(code), `${nom} lit les relevés`);
  }
});
