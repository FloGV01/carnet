// v8 (1/9) : données. Sujets d'un rendez-vous dans Réglages › Listes, sauvegarde au format 6 (durée de la nuit,
// séance du Programme, définitions corrigées), et import d'une sauvegarde de la v7 dans WebKit (point de vigilance 1).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';
import { installerPartageFactice, fichiersPartages } from '../aides/partage-stub.js';
import { RACINE } from '../aides/fichiers.js';
import { FORMAT_VERSION } from '../../public/js/db/sauvegarde.js';

test.beforeEach(async ({ page }) => {
  await installerPartageFactice(page);
  await page.clock.install({ time: new Date(2026, 9, 25, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

async function exporterVers(page) {
  await aller(page, '#/reglages');
  await page.getByRole('button', { name: 'Exporter', exact: true }).click();
  await expect(page.getByText('Sauvegarde faite.')).toBeVisible();
  return (await fichiersPartages(page))[0];
}

test('Réglages › Listes : les sept sujets d\'un rendez-vous, en tête de Soins, se règlent comme une liste', async ({ page }) => {
  await aller(page, '#/reglages/listes');
  const soins = page.getByRole('list', { name: 'Soins', exact: true });
  await expect(soins.getByRole('link')).toHaveText(["Sujets d'un rendez-vous", 'Effet secondaire', 'Effet ressenti']);
  await soins.getByRole('link', { name: "Sujets d'un rendez-vous" }).click();
  await expect(page).toHaveURL(/#\/reglages\/listes\/sujetRdv$/);
  await expect(page.getByRole('heading', { name: "Sujets d'un rendez-vous", level: 1 })).toBeVisible();
  const sujets = ['Sommeil', 'Traitement', 'Explosions', 'Fatigue', 'Travail', 'Émotions', 'Autre chose'];
  for (const s of sujets) await expect(page.getByRole('button', { name: `Renommer ${s}`, exact: true })).toBeVisible();
  // Modifiable : ajouter, renommer, archiver.
  await page.getByLabel('Nouvel élément').fill('Démarches');
  await page.getByRole('button', { name: 'Ajouter' }).click();
  await expect(page.getByRole('button', { name: 'Renommer Démarches' })).toBeVisible();
  await page.getByRole('button', { name: 'Renommer Travail', exact: true }).click();
  const champ = page.getByLabel('Nouveau libellé pour Travail');
  await champ.fill('Travail et trajets');
  await champ.press('Enter');
  await expect(page.getByRole('button', { name: 'Renommer Travail et trajets' })).toBeVisible();
  await page.getByRole('listitem').filter({ hasText: 'Explosions' }).getByRole('button', { name: 'Archiver' }).click();
  await expect(page.getByRole('heading', { name: 'Archivés' })).toBeVisible();
  const items = await page.evaluate(() => window.__carnet.repo.listes.items('sujetRdv'));
  expect(items.filter((i) => !i.archive).map((i) => i.libelle)).toEqual(['Sommeil', 'Traitement', 'Fatigue', 'Travail et trajets', 'Émotions', 'Autre chose', 'Démarches']);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('sauvegarde (format 6 en v8, 7 depuis la v9, 8 depuis la v11, 9 depuis la v12) : durée de la nuit, séance « Faite » et définitions corrigées vont dans le fichier, et l\'aperçu annonce les définitions remplacées', async ({ page }) => {
  const definitions = { 'roue:colere:irrite': 'Agacé par un bruit qui revient.' };
  await page.evaluate(async (d) => {
    const r = window.__carnet.repo;
    await r.journal.patch('2026-10-25', { sommeilRessenti: 'sommeil:moyen', heuresSommeil: 6 });
    await r.seances.creer({ date: '2026-10-25', heure: '18:00', exercice: 'respiration-abdominale', dureeS: 300, origine: 'bien-etre', fin: true, programme: 'respiration-abdominale' });
    await r.meta.ecrire('definitionsRoue', d);
  }, definitions);
  const f = await exporterVers(page);
  const contenu = JSON.parse(Buffer.from(f.octets).toString('utf8'));
  expect(contenu).toMatchObject({ formatVersion: FORMAT_VERSION, schemaVersion: 6, counts: { journal: 1, seances: 1 } });
  expect(contenu.data.journal[0]).toMatchObject({ date: '2026-10-25', sommeilRessenti: 'sommeil:moyen', heuresSommeil: 6 });
  expect(contenu.data.seances[0]).toMatchObject({ fin: true, programme: 'respiration-abdominale' });
  expect(contenu.data.meta.find((m) => m.cle === 'definitionsRoue')).toEqual({ cle: 'definitionsRoue', valeur: definitions });
  expect(contenu.data.listes.filter((i) => i.liste === 'sujetRdv')).toHaveLength(7);

  // Ici, d'autres définitions : l'aperçu dit qu'elles seront remplacées, l'import remet celles du fichier.
  await page.evaluate(() => window.__carnet.repo.meta.ecrire('definitionsRoue', { 'roue:joie:curieux': 'Écrite ici.' }));
  await page.locator('input[type=file]').setInputFiles({ name: f.nom, mimeType: 'application/json', buffer: Buffer.from(f.octets) });
  await expect(page.getByText('Les définitions des émotions seront remplacées par ce que contient le fichier.')).toBeVisible();
  await page.getByRole('button', { name: 'Importer', exact: true }).click();
  await expect(page.getByText('Import terminé.')).toBeVisible();
  expect(await page.evaluate(() => window.__carnet.repo.meta.lire('definitionsRoue'))).toEqual(definitions);
  expect(await page.evaluate(() => window.__carnet.repo.journal.lire('2026-10-25'))).toMatchObject({ heuresSommeil: 6 });
});

test('point de vigilance 1 : la sauvegarde témoin de la v7 s\'importe sans perte, séances sans fin, nuits sans heures', async ({ page }) => {
  const octets = readFileSync(join(RACINE, 'tests', 'fixtures', 'temoins', 'format-5.json'));
  const brut = JSON.parse(octets.toString('utf8'));
  await aller(page, '#/reglages');
  await page.locator('input[type=file]').setInputFiles({ name: 'format-5.json', mimeType: 'application/json', buffer: octets });
  await expect(page.getByText(/Ce fichier contient 4 journées, 2 épisodes, .*3 séances de Bien-être/)).toBeVisible();
  await expect(page.getByText(/illisible/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Importer', exact: true }).click();
  await expect(page.getByText('Import terminé.')).toBeVisible();
  const lu = await page.evaluate(async () => {
    const r = window.__carnet.repo;
    return { journal: await r.journal.tous(), seances: await r.seances.tous(), humeurs: await r.humeurs.tous(), sujets: (await r.listes.items('sujetRdv')).length, schema: await r.meta.lire('schema') };
  });
  expect(lu.schema).toBe(6);
  expect(lu.sujets).toBe(7);
  expect(lu.seances).toHaveLength(brut.data.seances.length);
  for (const x of lu.seances) expect([x.fin, x.programme]).toEqual([null, null]);
  expect(lu.journal).toHaveLength(brut.data.journal.length);
  for (const j of brut.data.journal) {
    const l = lu.journal.find((x) => x.date === j.date);
    expect(l).toMatchObject({ heureCoucher: j.heureCoucher, heureLever: j.heureLever, reveilsNocturnes: j.reveilsNocturnes, heuresSommeil: null });
  }
  expect(lu.humeurs.map((h) => h.emotion).sort()).toEqual(brut.data.humeurs.map((h) => h.emotion).sort());
});
