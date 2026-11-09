// v9 (2/8) : données. Sauvegarde au format 7 avec les mots à soi (méta `motsPerso`), import dans WebKit, relevé qui cite
// un mot à soi absent du fichier (point de vigilance 4), et import de la sauvegarde témoin de la v8 (format 6).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';
import { installerPartageFactice, fichiersPartages } from '../aides/partage-stub.js';
import { RACINE } from '../aides/fichiers.js';
import { FORMAT_VERSION } from '../../public/js/db/sauvegarde.js';

test.beforeEach(async ({ page }) => {
  await installerPartageFactice(page);
  await page.clock.install({ time: new Date(2026, 9, 28, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

async function exporterVers(page) {
  await aller(page, '#/reglages');
  await page.getByRole('button', { name: 'Exporter', exact: true }).click();
  await expect(page.getByText('Sauvegarde faite.')).toBeVisible();
  return (await fichiersPartages(page))[0];
}

async function importer(page, nom, octets) {
  await aller(page, '#/reglages');
  await page.locator('input[type=file]').setInputFiles({ name: nom, mimeType: 'application/json', buffer: Buffer.from(octets) });
}

const FLOTTANT = 'roue:perso:u-0a1b2c3d';
const MOTS = { [FLOTTANT]: { libelle: 'Flottant', zone: 'bleu', famille: 'tristesse', definition: 'Un peu ailleurs.', archive: false, createdAt: '2026-10-27T08:00:00.000Z' } };
const ICI = { 'roue:perso:u-11111111': { libelle: 'Écrit ici', zone: 'vert', famille: null, definition: null, archive: false, createdAt: '2026-10-28T08:00:00.000Z' } };

test('depuis le format 7 : les mots à soi vont dans la sauvegarde, l\'aperçu dit qu\'ils seront remplacés, l\'import les remet avec leurs relevés', async ({ page }) => {
  const releve = await page.evaluate(async ({ mots, id }) => {
    const r = window.__carnet.repo;
    await r.meta.ecrire('motsPerso', mots);
    return r.humeurs.creer({ date: '2026-10-28', heure: '15:00', emotion: id, energie: 'energie:basse' });
  }, { mots: MOTS, id: FLOTTANT });
  const f = await exporterVers(page);
  const contenu = JSON.parse(Buffer.from(f.octets).toString('utf8'));
  expect(contenu).toMatchObject({ formatVersion: FORMAT_VERSION, schemaVersion: 6, counts: { humeurs: 1 } });
  expect(contenu.data.meta.find((m) => m.cle === 'motsPerso')).toEqual({ cle: 'motsPerso', valeur: MOTS });
  expect(contenu.data.humeurs[0]).toMatchObject({ emotion: FLOTTANT, energie: 'energie:basse' });

  // Ici, d'autres mots : l'aperçu dit qu'ils seront remplacés, l'import remet ceux du fichier.
  await page.evaluate((ici) => window.__carnet.repo.meta.ecrire('motsPerso', ici), ICI);
  await importer(page, f.nom, f.octets);
  await expect(page.getByText('Les mots ajoutés à la carte des émotions seront remplacés par ce que contient le fichier.')).toBeVisible();
  await expect(page.getByText(/illisible/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Importer', exact: true }).click();
  await expect(page.getByText('Import terminé.')).toBeVisible();
  const lu = await page.evaluate(async (id) => ({ mots: await window.__carnet.repo.meta.lire('motsPerso'), releve: await window.__carnet.repo.humeurs.lire(id) }), releve.id);
  expect(lu.mots).toEqual(MOTS);
  expect(lu.releve).toEqual(releve);
});

test('point de vigilance 4 : un relevé qui cite un mot à soi absent du fichier est importé, son mot recréé mis de côté', async ({ page }) => {
  const absent = 'roue:perso:u-99999999';
  const fichier = {
    format: 'carnet-sauvegarde', formatVersion: 7, schemaVersion: 6, exportedAt: '2026-10-27T19:00:00.000Z', app: { version: '9.0.0' },
    counts: { humeurs: 1 },
    data: { humeurs: [{ id: 'hu_1', date: '2026-10-27', heure: '18:00', emotion: absent, energie: 'energie:haute' }] },
  };
  await importer(page, 'v9.json', new TextEncoder().encode(JSON.stringify(fichier)));
  await expect(page.getByText(/Ce fichier contient 0 journée, 0 épisode, 1 relevé d'émotion du moment/)).toBeVisible();
  await expect(page.getByText(/illisible/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Importer', exact: true }).click();
  await expect(page.getByText('Import terminé.')).toBeVisible();
  const lu = await page.evaluate(async () => ({ mots: await window.__carnet.repo.meta.lire('motsPerso'), releve: await window.__carnet.repo.humeurs.lire('hu_1') }));
  expect(lu.releve).toMatchObject({ emotion: absent, energie: 'energie:haute' });
  expect(lu.mots).toEqual({ [absent]: { libelle: 'Mot sans libellé', zone: null, famille: null, definition: null, archive: true, createdAt: fichier.exportedAt } });
});

test('la sauvegarde témoin de la v8 (format 6) s\'importe sans perte : énergie seule, Accablé, définitions corrigées', async ({ page }) => {
  const octets = readFileSync(join(RACINE, 'tests', 'fixtures', 'temoins', 'format-6.json'));
  const brut = JSON.parse(octets.toString('utf8'));
  await importer(page, 'format-6.json', octets);
  await expect(page.getByText(/Ce fichier contient 4 journées, 2 épisodes, .*7 relevés d'émotion du moment.*4 séances de Bien-être/)).toBeVisible();
  await expect(page.getByText(/illisible/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Importer', exact: true }).click();
  await expect(page.getByText('Import terminé.')).toBeVisible();
  const lu = await page.evaluate(async () => {
    const r = window.__carnet.repo;
    return { humeurs: await r.humeurs.tous(), definitions: await r.meta.lire('definitionsRoue'), mots: await r.meta.lire('motsPerso'), schema: await r.meta.lire('schema') };
  });
  expect(lu.schema).toBe(6);
  expect(lu.mots).toBeNull();
  expect(lu.definitions).toEqual(brut.data.meta.find((m) => m.cle === 'definitionsRoue').valeur);
  const parId = (l) => [...l].sort((a, b) => a.id.localeCompare(b.id));
  expect(parId(lu.humeurs)).toEqual(parId(brut.data.humeurs));
});
