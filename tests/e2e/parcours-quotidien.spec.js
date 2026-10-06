import { test, expect } from '../aides/gardes.js';
import { toucher, groupe, entreeDuJour, viderBase } from '../aides/saisie.js';

test.beforeEach(async ({ page }) => { await page.goto('/'); await viderBase(page); });

// Les champs tiennent au-dessus de la bande flottante, la bande au-dessus des onglets, sur une ligne.
async function sansDefilement(page, dernier = '#points-positifs') {
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  const zone = await page.locator(dernier).boundingBox();
  const flottants = await page.locator('.actions-flottantes').boundingBox();
  const onglets = await page.getByRole('navigation', { name: 'Navigation principale' }).boundingBox();
  expect(flottants.y + flottants.height).toBeLessThanOrEqual(onglets.y + 1);
  expect(zone.y + zone.height).toBeLessThanOrEqual(flottants.y);
  expect(await page.locator('.actions-flottantes').evaluate((b) => b.scrollWidth <= b.clientWidth)).toBe(true);
  // Chaque action reste dans la marge de droite (la bande ne déborde pas sous le bord de l'écran).
  const droite = await page.locator('.actions-flottantes').evaluate((b) => {
    const marge = parseFloat(getComputedStyle(b).paddingRight);
    return [...b.children].every((k) => k.getBoundingClientRect().right <= b.getBoundingClientRect().right - marge + 0.5);
  });
  expect(droite).toBe(true);
  for (const h of await page.locator('.actions-flottantes > *').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) {
    expect(h).toBeGreaterThanOrEqual(44);
    expect(h).toBeLessThan(60);
  }
}

test('les 6 champs du soir en 6 touchers, sans frappe, sans défilement, sans bouton Enregistrer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 797 });
  await toucher(page, 'Lieu', 'Bureau');
  await toucher(page, 'Sommeil', 'Moyen');
  await toucher(page, 'Humeur', '6');
  await toucher(page, 'Contact humain', 'Oui');
  await toucher(page, 'Sport / mouvement', 'Non');
  await toucher(page, 'Traitement pris', 'Oui');
  // Le compteur d'explosions est masqué par défaut : les épisodes « Explosion » font foi.
  await expect(groupe(page, 'Explosions')).toHaveCount(0);
  await sansDefilement(page);
  // À 390 px : « Moment difficile » en toutes lettres, « Humeur » en texte (sans son icône).
  await expect(page.locator('.actions-flottantes .moment-difficile .libelle-action')).toBeVisible();
  await expect(page.locator('.actions-flottantes .moment .libelle-action')).toBeVisible();
  await expect(page.getByRole('button', { name: /enregistrer/i })).toHaveCount(0);
  await expect(page.getByText('Enregistré')).toBeVisible();
  const entree = await entreeDuJour(page);
  expect(entree).toMatchObject({
    lieu: 'lieu:bureau', sommeilRessenti: 'sommeil:moyen', humeur: 6, contactHumain: true,
    sportMouvement: false, explosions: null, traitementPris: 'traitementPris:oui',
  });
  await page.reload();
  await expect(groupe(page, 'Lieu').getByRole('button', { name: 'Bureau' })).toHaveAttribute('aria-pressed', 'true');
});

test('pire cas : 8 champs, Contact et Sport séparés, toujours sans défilement (390 et 375)', async ({ page }) => {
  await page.evaluate(() => window.__carnet.repo.meta.ecrire('journee', {
    ordre: ['lieu', 'contact', 'sommeil', 'humeur', 'sport', 'explosions', 'traitement', 'positifs'], masques: [],
  }));
  for (const largeur of [390, 375]) {
    await page.setViewportSize({ width: largeur, height: 797 });
    await page.reload();
    await expect(groupe(page, 'Explosions')).toHaveCount(1);
    await expect(page.locator('.deux-colonnes')).toHaveCount(0);
    await sansDefilement(page);
  }
  await toucher(page, 'Explosions', '0');
  await expect.poll(async () => (await entreeDuJour(page))?.explosions).toBe(0);
});

test('grand texte iOS : la bande garde ses trois actions sur une ligne, icônes seules', async ({ page }) => {
  for (const largeur of [390, 375]) {
    await page.setViewportSize({ width: largeur, height: 797 });
    await page.evaluate(() => { document.documentElement.style.fontSize = '21px'; document.body.style.fontSize = '21px'; });
    const bande = page.locator('.actions-flottantes');
    await expect(bande.locator('.libelle-action').first()).toBeHidden();
    await expect(page.getByRole('link', { name: 'Humeur du moment' })).toBeVisible();
    expect(await bande.evaluate((b) => {
      const marge = parseFloat(getComputedStyle(b).paddingRight);
      return [...b.children].every((k) => k.getBoundingClientRect().right <= b.getBoundingClientRect().right - marge + 0.5);
    })).toBe(true);
  }
});

test('un champ masqué qui porte une valeur reste affiché, et un second toucher l\'efface', async ({ page }) => {
  const hier = await page.evaluate(async () => {
    const { addDays } = await import('/js/domain/dates.js');
    const d = addDays(window.__carnet.repo.aujourdhui(), -1);
    await window.__carnet.repo.journal.patch(d, { explosions: 1, humeur: 5 });
    return d;
  });
  await page.evaluate((d) => { location.hash = `#/jour/${d}`; }, hier);
  await expect(groupe(page, 'Explosions').getByRole('button', { name: 'Explosions 1' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('link', { name: 'Humeur du moment' })).toHaveCount(0);
  await toucher(page, 'Explosions', '1');
  await expect.poll(async () => (await entreeDuJour(page, hier))?.explosions).toBeNull();
});

test('un second toucher efface le choix', async ({ page }) => {
  await toucher(page, 'Humeur', '7');
  await expect.poll(async () => (await entreeDuJour(page))?.humeur).toBe(7);
  await toucher(page, 'Humeur', '7');
  await expect(groupe(page, 'Humeur').getByRole('button', { name: 'Humeur 7' })).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => entreeDuJour(page)).toBeNull();
});

test('les points positifs sont enregistrés à la frappe et survivent au rechargement', async ({ page }) => {
  await page.locator('#points-positifs').fill('marche de 20 min');
  await expect.poll(async () => (await entreeDuJour(page))?.pointsPositifs).toBe('marche de 20 min');
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes('brouillon')))).toEqual([]);
  await page.reload();
  await expect(page.locator('#points-positifs')).toHaveValue('marche de 20 min');
});

test('un brouillon non enregistré est repris au retour', async ({ page }) => {
  const date = await page.evaluate(() => window.__carnet.repo.aujourdhui());
  await page.evaluate((d) => localStorage.setItem(`carnet:brouillon:${d}:pointsPositifs`, JSON.stringify('texte rattrapé')), date);
  await page.reload();
  await expect(page.locator('#points-positifs')).toHaveValue('texte rattrapé');
  await expect.poll(async () => (await entreeDuJour(page))?.pointsPositifs).toBe('texte rattrapé');
});

test('Dicter place le curseur dans le champ et affiche l\'aide', async ({ page }) => {
  await page.getByRole('button', { name: 'Dicter' }).first().click();
  await expect(page.locator('#points-positifs')).toBeFocused();
  await expect(page.getByText('Touche le micro du clavier pour parler.')).toBeVisible();
  await page.keyboard.insertText('dicté au clavier');
  await expect(page.getByText('Touche le micro du clavier pour parler.')).toHaveCount(0);
  await expect.poll(async () => (await entreeDuJour(page))?.pointsPositifs).toBe('dicté au clavier');
});

test('nuit en détail : heures effaçables, réveils, résumé du repli', async ({ page }) => {
  await page.getByRole('button', { name: /Nuit en détail/ }).click();
  await page.locator('#coucher').fill('23:40');
  await page.locator('#lever').fill('07:10');
  await toucher(page, 'Réveils', '1');
  await expect.poll(async () => (await entreeDuJour(page))?.heureLever).toBe('07:10');
  await page.getByRole('button', { name: 'Effacer Lever' }).click();
  await expect.poll(async () => (await entreeDuJour(page))?.heureLever).toBeNull();
  await page.getByRole('button', { name: /Nuit en détail/ }).click();
  await expect(page.getByText('23:40 → · · 1 réveil')).toBeVisible();
});

