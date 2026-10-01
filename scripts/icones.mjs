// Rend public/icons/icone.svg en PNG (180, 192, 512 et maskable 512) avec Playwright.
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dossier = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
const svg = readFileSync(join(dossier, 'icone.svg'), 'utf8');
const SORTIES = [
  ['apple-touch-icon.png', 180, 1],
  ['icone-192.png', 192, 1],
  ['icone-512.png', 512, 1],
  ['icone-maskable-512.png', 512, 0.8],
];
const navigateur = await chromium.launch();
const page = await navigateur.newPage();
for (const [nom, taille, echelle] of SORTIES) {
  await page.setViewportSize({ width: taille, height: taille });
  const interne = Math.round(taille * echelle);
  await page.setContent(`<html><body style="margin:0;background:#3B4A6B;display:grid;place-items:center;width:${taille}px;height:${taille}px">
    <div style="width:${interne}px;height:${interne}px">${svg.replace('<svg ', `<svg width="${interne}" height="${interne}" `)}</div></body></html>`);
  await page.screenshot({ path: join(dossier, nom), omitBackground: false });
  console.log('icône', nom);
}
await navigateur.close();
