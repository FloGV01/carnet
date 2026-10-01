// Calcule la liste des fichiers de public/ et leur empreinte, puis l'écrit dans sw.js
// (entre les marqueurs) et dans js/version.js. Avec --check, échoue si l'un des deux
// est périmé : un sw.js à jour garantit que l'iPhone voit chaque nouvelle version.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(racine, 'public');
const EXCLUS = new Set(['sw.js', 'robots.txt']);
const HORS_EMPREINTE = new Set(['js/version.js']);

function lister(dossier) {
  const res = [];
  for (const nom of readdirSync(dossier)) {
    if (nom.startsWith('.')) continue;
    const p = join(dossier, nom);
    if (statSync(p).isDirectory()) res.push(...lister(p));
    else res.push(relative(pub, p).split(sep).join('/'));
  }
  return res;
}

export function calculer() {
  const fichiers = lister(pub).filter((f) => !EXCLUS.has(f)).sort();
  const h = createHash('sha256');
  const pkg = JSON.parse(readFileSync(join(racine, 'package.json'), 'utf8'));
  h.update(`app:${pkg.version}\n`);
  for (const f of fichiers) {
    if (HORS_EMPREINTE.has(f)) continue;
    h.update(`${f}:${createHash('sha256').update(readFileSync(join(pub, f))).digest('hex')}\n`);
  }
  const version = h.digest('hex').slice(0, 12);
  const liste = ['./', ...fichiers.map((f) => `./${f}`)];
  const blocSw = `// <precache:debut> (généré par scripts/precache.mjs, ne pas modifier à la main)\nconst VERSION = '${version}';\nconst FICHIERS = ${JSON.stringify(liste, null, 2)};\n// <precache:fin>`;
  const versionJs = `// Généré par scripts/precache.mjs, ne pas modifier à la main.\nexport const VERSION = '${version}';\nexport const VERSION_APP = '${pkg.version}';\n`;
  return { version, liste, blocSw, versionJs };
}

function remplacerBloc(sw, bloc) {
  const re = /\/\/ <precache:debut>[\s\S]*?\/\/ <precache:fin>/;
  if (!re.test(sw)) throw new Error('Marqueurs <precache> absents de public/sw.js');
  return sw.replace(re, bloc);
}

const estPrincipal = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (estPrincipal) {
  const check = process.argv.includes('--check');
  const swChemin = join(pub, 'sw.js');
  const vChemin = join(pub, 'js', 'version.js');
  // version.js doit exister avant le calcul pour figurer dans la liste.
  let versionActuelle = '';
  try { versionActuelle = readFileSync(vChemin, 'utf8'); } catch { if (!check) writeFileSync(vChemin, ''); }
  const { version, blocSw, versionJs } = calculer();
  const swActuel = readFileSync(swChemin, 'utf8');
  const swAttendu = remplacerBloc(swActuel, blocSw);
  if (check) {
    const ok = swActuel === swAttendu && versionActuelle === versionJs;
    if (!ok) { console.error('precache : sw.js ou js/version.js est périmé. Lancer « npm run precache ».'); process.exit(1); }
    console.log(`precache : à jour (${version})`);
  } else {
    writeFileSync(swChemin, swAttendu);
    writeFileSync(vChemin, versionJs);
    console.log(`precache : ${version}`);
  }
}
