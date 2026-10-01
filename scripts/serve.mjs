// Serveur de développement sans dépendance : 127.0.0.1:5173, sert public/ avec les
// en-têtes de netlify.toml (dont la CSP) et sans cache. Avec E2E=1, la route
// /__test/bump-sw change le contenu servi de sw.js pour simuler une nouvelle version.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lireEnTetes, enTetesPour } from './en-tetes.mjs';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(racine, 'public');
const PORT = Number(process.env.PORT || 5173);
const E2E = process.env.E2E === '1';
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon',
};
let bump = 0;

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let chemin = decodeURIComponent(url.pathname);
  if (E2E && chemin === '/__test/bump-sw') { bump += 1; res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end(String(bump)); return; }
  if (chemin.endsWith('/')) chemin += 'index.html';
  const fichier = normalize(join(pub, chemin));
  if (!fichier.startsWith(pub)) { res.writeHead(403); res.end(); return; }
  try {
    const info = await stat(fichier);
    if (!info.isFile()) throw new Error('pas un fichier');
    let corps = await readFile(fichier);
    if (chemin === '/sw.js' && bump > 0) corps = Buffer.concat([corps, Buffer.from(`\n// bump ${bump}\n`)]);
    const blocs = lireEnTetes(join(racine, 'netlify.toml'));
    res.writeHead(200, {
      ...enTetesPour(blocs, chemin),
      'Content-Type': TYPES[extname(fichier)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(corps);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Introuvable');
  }
}).listen(PORT, '127.0.0.1', () => console.log(`Carnet : http://127.0.0.1:${PORT}/  (E2E=${E2E ? 1 : 0})`));
