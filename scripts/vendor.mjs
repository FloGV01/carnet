// Copie Preact, ses hooks et htm dans public/vendor/ (modules ES, aucun CDN).
// Les imports nus ("preact") sont réécrits en chemins relatifs. Les empreintes
// SHA-256 des sources sont vérifiées pour qu'une mise à jour soit toujours volontaire.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const nm = (p) => join(racine, 'node_modules', p);
const dest = join(racine, 'public', 'vendor');
mkdirSync(dest, { recursive: true });

const SOURCES = {
  'preact.module.js': { src: 'preact/dist/preact.module.js' },
  'hooks.module.js': { src: 'preact/hooks/dist/hooks.module.js', reecrire: [['from"preact"', 'from"./preact.module.js"']] },
  'htm.module.js': { src: 'htm/dist/htm.module.js' },
};
const ATTENDU = JSON.parse(readFileSync(join(racine, 'scripts', 'vendor.lock.json'), 'utf8'));
const maj = process.argv.includes('--maj');
const sha = (b) => createHash('sha256').update(b).digest('hex');

const nouveau = {};
for (const [nom, { src, reecrire = [] }] of Object.entries(SOURCES)) {
  let code = readFileSync(nm(src), 'utf8');
  const h = sha(code);
  nouveau[nom] = h;
  if (!maj && ATTENDU[nom] !== h) {
    console.error(`Empreinte inattendue pour ${src} : ${h}\nRelancer avec --maj si la mise à jour est voulue.`);
    process.exit(1);
  }
  for (const [a, b] of reecrire) {
    if (!code.includes(a)) { console.error(`Motif absent dans ${src} : ${a}`); process.exit(1); }
    code = code.split(a).join(b);
  }
  code = code.replace(/\n\/\/# sourceMappingURL=.*$/m, '\n');
  writeFileSync(join(dest, nom), code);
}
writeFileSync(join(dest, 'preact-htm.js'),
`// Point d'entrée unique de la vue. Seul ui/ importe ce fichier.
import { h, render, Fragment, createContext, createRef } from './preact.module.js';
import htm from './htm.module.js';
export { h, render, Fragment, createContext, createRef };
export { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, useReducer, useContext } from './hooks.module.js';
export const html = htm.bind(h);
`);
const pkg = (p) => JSON.parse(readFileSync(nm(p), 'utf8')).version;
writeFileSync(join(dest, 'LICENCES.txt'),
`preact ${pkg('preact/package.json')} : licence MIT, (c) Jason Miller. https://github.com/preactjs/preact
htm ${pkg('htm/package.json')} : licence Apache-2.0, (c) Google LLC. https://github.com/developit/htm
`);
if (maj) writeFileSync(join(racine, 'scripts', 'vendor.lock.json'), JSON.stringify(nouveau, null, 2) + '\n');
console.log('vendor : ok', Object.keys(SOURCES).join(', '));
