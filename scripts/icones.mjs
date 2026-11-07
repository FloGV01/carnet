// Rend public/icons/icone.svg en PNG (180, 192, 512 et maskable 512) avec Playwright.
// v11 : nouveaux noms (préfixe v11-), pour qu'aucun cache ne serve l'ancienne icône sous le même nom (spec §10), et fond
// noir, celui de l'icône : la marge de l'icône masquable n'a plus de cadre bleu.
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dossier = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
const svg = readFileSync(join(dossier, 'icone.svg'), 'utf8');
const FOND = '#000000';
const SORTIES = [
  ['v11-apple-touch-icon.png', 180, 1],
  ['v11-icone-192.png', 192, 1],
  ['v11-icone-512.png', 512, 1],
  ['v11-icone-maskable-512.png', 512, 0.8],
];
const navigateur = await chromium.launch();
const page = await navigateur.newPage();
for (const [nom, taille, echelle] of SORTIES) {
  await page.setViewportSize({ width: taille, height: taille });
  const interne = Math.round(taille * echelle);
  await page.setContent(`<html><body style="margin:0;background:${FOND};display:grid;place-items:center;width:${taille}px;height:${taille}px">
    <div style="width:${interne}px;height:${interne}px">${svg.replace('<svg ', `<svg width="${interne}" height="${interne}" `)}</div></body></html>`);
  await page.screenshot({ path: join(dossier, nom), omitBackground: false });
  console.log('icône', nom);
}
await navigateur.close();
