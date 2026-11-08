import { test, expect } from '../aides/gardes.js';
import { viderBase, toucher, aller } from '../aides/saisie.js';
import { installerPartageFactice, fichiersPartages } from '../aides/partage-stub.js';

test.beforeEach(async ({ page }) => {
  await installerPartageFactice(page);
  await page.clock.install({ time: new Date(2026, 8, 30, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

async function exporterVers(page) {
  await aller(page, '#/reglages');
  await page.getByRole('button', { name: 'Exporter', exact: true }).click();
  await expect(page.getByText('Sauvegarde faite.')).toBeVisible();
  return (await fichiersPartages(page))[0];
}

test('exporter puis restaurer sur une base vidée redonne les mêmes données', async ({ page }) => {
  await toucher(page, 'Sommeil', 'Moyen');
  await toucher(page, 'Lieu', 'Bureau');
  await page.evaluate(() => window.__carnet.repo.episodes.creer({ date: '2026-09-30', heure: '18:42', emotion: 'emotion:colere' }));
  await expect.poll(() => page.evaluate(() => window.__carnet.repo.journal.lire('2026-09-30'))).toMatchObject({ sommeilRessenti: 'sommeil:moyen', lieu: 'lieu:bureau' });
  const f = await exporterVers(page);
  expect(f.nom).toBe('carnet-sauvegarde-2026-09-30-2100.json');
  await expect(page.getByText(/Dernière sauvegarde : 30 septembre 2026/)).toBeVisible();
  await viderBase(page);
  await aller(page, '#/reglages');
  await page.locator('input[type=file]').setInputFiles({ name: f.nom, mimeType: 'application/json', buffer: Buffer.from(f.octets) });
  await expect(page.getByRole('heading', { name: 'Importer une sauvegarde' })).toBeVisible();
  await expect(page.getByText(/Ce fichier contient 1 journée, 1 épisode/)).toBeVisible();
  await page.getByRole('button', { name: 'Importer', exact: true }).click();
  await expect(page.getByText('Import terminé.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Réglages' })).toBeVisible();
  expect(await page.evaluate(() => window.__carnet.repo.journal.lire('2026-09-30'))).toMatchObject({ sommeilRessenti: 'sommeil:moyen', lieu: 'lieu:bureau' });
  expect((await page.evaluate(() => window.__carnet.repo.episodes.tous())).length).toBe(1);
  // v11 (10/11) : un import sur un Carnet vide ne prend pas de copie (spec §10) : la ligne « Revenir » n'apparaît pas, une
  // fois la carte Sauvegarde chargée (sa taille affichée).
  await expect(page.getByText(/^Taille :/)).toBeVisible();
  await expect(page.getByRole('button', { name: "Revenir à l'état d'avant l'import" })).toHaveCount(0);
});

test('perte chiffrée, refus d\'un fichier illisible, revenir à l\'état d\'avant l\'import', async ({ page }) => {
  await toucher(page, 'Lieu', 'Bureau');
  const f = await exporterVers(page);
  await page.evaluate(() => window.__carnet.repo.journal.patch('2026-09-29', { humeur: 3 }));
  await page.locator('input[type=file]').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{oups') });
  await expect(page.getByText('Ce fichier est illisible.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choisir un autre fichier' })).toBeVisible();
  await page.locator('input[type=file]').setInputFiles({ name: f.nom, mimeType: 'application/json', buffer: Buffer.from(f.octets) });
  await expect(page.getByText('1 journée présente ici et absente du fichier sera effacée.')).toBeVisible();
  await expect(page.getByRole('button', { name: "Exporter d'abord" })).toBeVisible();
  await page.getByRole('button', { name: 'Importer', exact: true }).click();
  await expect(page.getByText('Import terminé.')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__carnet.repo.journal.lire('2026-09-29'))).toBeNull();
  // v11 (10/11) : « Revenir » remplace tout, juste sous « Importer » : il demande confirmation et dit ce qui sera remplacé.
  // Un toucher ouvre la boîte sans rien changer, « Annuler » ne change rien, « Revenir » restaure.
  const ligne = page.getByRole('button', { name: "Revenir à l'état d'avant l'import" });
  const boite = page.getByRole('alertdialog', { name: "Revenir à l'état d'avant l'import ?" });
  await ligne.click();
  await expect(boite).toBeVisible();
  await expect(boite.locator('.boite-texte')).toHaveText("Ce qui est noté ici sera remplacé par ce qu'il y avait avant l'import du 30 septembre 2026. Les mémos vocaux d'avant l'import ne reviennent pas.");
  // Le texte décrit la boîte : le focus va droit sur « Annuler », et VoiceOver doit lire ce qui sera remplacé.
  await expect(boite).toHaveAccessibleDescription(/sera remplacé par ce qu'il y avait avant l'import du 30 septembre 2026/);
  await expect(boite.getByRole('button')).toHaveText(['Annuler', 'Revenir']);
  await expect(boite.getByRole('button', { name: 'Annuler' })).toBeFocused();
  expect(await page.evaluate(() => window.__carnet.repo.journal.lire('2026-09-29'))).toBeNull();
  await boite.getByRole('button', { name: 'Annuler' }).click();
  await expect(boite).toHaveCount(0);
  await expect(ligne).toBeVisible();
  expect(await page.evaluate(() => window.__carnet.repo.journal.lire('2026-09-29'))).toBeNull();
  expect(await page.evaluate(() => window.__carnet.repo.journal.lire('2026-09-30'))).toMatchObject({ lieu: 'lieu:bureau' });
  await ligne.click();
  await boite.getByRole('button', { name: 'Revenir', exact: true }).click();
  await expect(boite).toHaveCount(0);
  await expect(page.getByText("État d'avant l'import rétabli.")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__carnet.repo.journal.lire('2026-09-29'))).toMatchObject({ humeur: 3 });
});

test('v6 : les notes sont dans le fichier, et une note absente du fichier est annoncée avant d\'être effacée', async ({ page }) => {
  // Rien d'autre que des notes ici : la perte n'est chiffrée que si les notes comptent.
  const gardee = await page.evaluate(() => window.__carnet.repo.notes.creer({ date: '2026-09-30', heure: '20:00', texte: 'Dans le fichier' }));
  const f = await exporterVers(page);
  await page.evaluate(() => window.__carnet.repo.notes.creer({ date: '2026-09-30', heure: '20:30', texte: 'Écrite après' }));
  await page.locator('input[type=file]').setInputFiles({ name: f.nom, mimeType: 'application/json', buffer: Buffer.from(f.octets) });
  await expect(page.getByText(/Ce fichier contient 0 journée, 0 épisode, 1 note\./)).toBeVisible();
  await expect(page.getByText('1 note présente ici et absente du fichier sera effacée.')).toBeVisible();
  await page.getByRole('button', { name: 'Importer', exact: true }).click();
  await expect(page.getByText('Import terminé.')).toBeVisible();
  expect(await page.evaluate(() => window.__carnet.repo.notes.tous())).toEqual([gardee]);
});

test('v7 : les séances sont dans le fichier, et une séance absente du fichier est annoncée avant d\'être effacée', async ({ page }) => {
  const gardee = await page.evaluate(() => window.__carnet.repo.seances.creer({ date: '2026-09-30', heure: '18:00', exercice: 'coherence', dureeS: 300, origine: 'bien-etre' }));
  const f = await exporterVers(page);
  expect(JSON.parse(Buffer.from(f.octets).toString('utf8'))).toMatchObject({ formatVersion: 8, schemaVersion: 6, counts: { seances: 1 } });
  await page.evaluate(() => window.__carnet.repo.seances.creer({ date: '2026-09-30', heure: '20:30', exercice: 'coherence', dureeS: 120, origine: 'moment-difficile' }));
  await page.locator('input[type=file]').setInputFiles({ name: f.nom, mimeType: 'application/json', buffer: Buffer.from(f.octets) });
  await expect(page.getByText(/Ce fichier contient 0 journée, 0 épisode, 1 séance de Bien-être\./)).toBeVisible();
  await expect(page.getByText('1 séance de Bien-être présente ici et absente du fichier sera effacée.')).toBeVisible();
  await page.getByRole('button', { name: 'Importer', exact: true }).click();
  await expect(page.getByText('Import terminé.')).toBeVisible();
  expect(await page.evaluate(() => window.__carnet.repo.seances.tous())).toEqual([gardee]);
});

test('avec un mémo, la sauvegarde est un ZIP qui se restaure avec le son', async ({ page }) => {
  await page.evaluate(() => window.__carnet.repo.audios.creer({ parentStore: 'journal', parentId: '2026-09-30', dureeMs: 1000, mime: 'audio/mp4', data: new Uint8Array([9, 8, 7]).buffer }));
  const f = await exporterVers(page);
  expect(f.nom).toMatch(/\.zip$/);
  await viderBase(page);
  await aller(page, '#/reglages');
  await page.locator('input[type=file]').setInputFiles({ name: f.nom, mimeType: 'application/zip', buffer: Buffer.from(f.octets) });
  await expect(page.getByText(/1 mémo vocal/)).toBeVisible();
  await page.getByRole('button', { name: 'Importer', exact: true }).click();
  await expect(page.getByText('Import terminé.')).toBeVisible();
  const octets = await page.evaluate(async () => { const [m] = await window.__carnet.repo.audios.parParent('journal', '2026-09-30'); return Array.from(new Uint8Array(m.data)); });
  expect(octets).toEqual([9, 8, 7]);
});

test('tout effacer : exige le mot EFFACER', async ({ page }) => {
  await toucher(page, 'Lieu', 'Bureau');
  await aller(page, '#/reglages/effacer');
  await page.getByRole('button', { name: 'Continuer sans exporter' }).click();
  const bouton = page.getByRole('button', { name: 'Effacer définitivement' });
  await expect(bouton).toBeDisabled();
  await page.getByLabel('Écris EFFACER pour confirmer').fill('EFFACER');
  await bouton.click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  expect(await page.evaluate(() => window.__carnet.repo.journal.tous())).toEqual([]);
});
