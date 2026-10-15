import { test, expect } from '../aides/gardes.js';
import { viderBase } from '../aides/saisie.js';
import { installerMicroFactice } from '../aides/micro-stub.js';

// Micro factice (voir tests/aides/micro-stub.js) : la logique de l'app, pas la capture réelle.
const audios = (page) => page.evaluate(() => window.__carnet.repo.audios.metas());

test.beforeEach(async ({ page }) => { await installerMicroFactice(page); await page.goto('/'); await viderBase(page); });

test('mémo du jour : enregistrer, puce, relecture après rechargement, supprimer puis Annuler', async ({ page }) => {
  await page.getByRole('button', { name: 'Mémo vocal' }).click();
  await expect(page.getByRole('button', { name: /Arrêter/ })).toBeVisible();
  await page.waitForTimeout(1600);
  await page.getByRole('button', { name: /Arrêter/ }).click();
  await expect(page.getByText(/Mémo vocal · 0:0[12]/)).toBeVisible();
  const [a] = await audios(page);
  expect(a.taille).toBeGreaterThan(0);
  expect(a.parentStore).toBe('journal');
  expect(await page.evaluate((d) => window.__carnet.repo.journal.lire(d), a.parentId)).not.toBeNull();
  await page.reload();
  await expect(page.getByText(/Mémo vocal · 0:0[12]/)).toBeVisible();
  await page.getByRole('button', { name: 'Écouter le mémo' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await page.getByRole('button', { name: 'Supprimer le mémo' }).click();
  await expect(page.getByText('Mémo supprimé')).toBeVisible();
  expect((await audios(page)).length).toBe(0);
  expect(await page.evaluate((d) => window.__carnet.repo.journal.lire(d), a.parentId)).toBeNull();
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect(page.getByText(/Mémo vocal · 0:0[12]/)).toBeVisible();
});

test('passage en arrière-plan : l\'enregistrement s\'arrête et le mémo est gardé', async ({ page }) => {
  await page.getByRole('button', { name: 'Mémo vocal' }).click();
  await page.waitForTimeout(1200);
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect.poll(async () => (await audios(page)).length).toBe(1);
});

test('mémo dans un épisode : la fiche est créée si besoin', async ({ page }) => {
  await page.getByRole('link', { name: 'Épisode' }).click();
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Passer', exact: true }).click();
  await page.getByRole('button', { name: 'Mémo vocal' }).click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /Arrêter/ }).click();
  await expect(page.getByText(/Mémo vocal · 0:0/)).toBeVisible();
  const [a] = await audios(page);
  expect(a.parentStore).toBe('episodes');
  expect(await page.evaluate((id) => window.__carnet.repo.episodes.lire(id), a.parentId)).not.toBeNull();
  // Le toast passe au-dessus du parcours (toBeVisible ne voit pas un recouvrement).
  await page.getByRole('button', { name: 'Supprimer le mémo' }).click();
  const toast = page.getByRole('status').filter({ hasText: 'Mémo supprimé' });
  await expect(toast).toBeVisible();
  const auPremierPlan = await toast.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
  });
  expect(auPremierPlan).toBe(true);
});

test('la puce « avec mémo vocal » se lit sur Aujourd\'hui, l\'Historique et Soins',async ({ page }) => {
  // Un mémo sur chaque sorte de fiche : le jour, un épisode, un rendez-vous, un changement de traitement.
  await page.evaluate(async () => {
    const r = window.__carnet.repo;
    const jour = r.aujourdhui();
    await r.journal.patch(jour, { humeur: 6 });
    const ep = await r.episodes.creer({ date: jour, heure: '14:30', emotion: 'emotion:colere' });
    // Un rendez-vous passé : le prochain rendez-vous a sa propre carte, sans puce.
    const rdv = await r.rdv.creer({ date: '2020-01-06', heure: '10:30', professionnel: 'professionnel:psychiatre' });
    const tr = await r.traitements.creer({ date: jour, changement: 'ajustement du soir' });
    for (const [parentStore, parentId] of [['journal', jour], ['episodes', ep.id], ['rdv', rdv.id], ['traitements', tr.id]]) {
      await r.audios.creer({ parentStore, parentId, dureeMs: 1500, mime: 'audio/wav', data: new ArrayBuffer(64) });
    }
  });
  const puce = (zone) => zone.getByRole('img', { name: 'avec mémo vocal' });

  await page.reload();
  await expect(puce(page.locator('.evenements-jour'))).toHaveCount(1);

  await page.getByRole('link', { name: 'Historique' }).click();
  await expect(puce(page.locator('.ligne-hist'))).toHaveCount(1); // le jour
  await page.getByRole('group', { name: 'Afficher' }).getByRole('button', { name: /Épisodes/ }).click();
  await expect(puce(page.locator('.ligne-hist'))).toHaveCount(1); // l'épisode

  await page.getByRole('link', { name: 'Soins' }).click();
  await expect(puce(page.locator('.ligne-rdv-liste'))).toHaveCount(1); // le rendez-vous
  await page.getByRole('group', { name: 'Soins' }).getByRole('button', { name: /Traitement/ }).click();
  await expect(puce(page.locator('.ligne-hist'))).toHaveCount(1); // le changement
});
