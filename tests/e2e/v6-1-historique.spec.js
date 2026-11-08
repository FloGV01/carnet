import { test, expect } from '../aides/gardes.js';
import { viderBase, aller, appPrete } from '../aides/saisie.js';
import { installerPartageFactice, fichiersPartages } from '../aides/partage-stub.js';

// v6.1 · Historique (P15, A5) : segment, filtres, recherche et position gardés pour la session, après un aller-retour
// par un jour, un épisode ou un symptôme ; seul le segment survit à un redémarrage. Un jour ouvert depuis l'Historique
// garde l'onglet de l'Historique (v7 : Analyse, l'Historique a quitté la barre) et affiche « ‹ Retour » ; ‹ et › changent de
// jour. Ouvert autrement, rien ne change.
// Mots inventés pour le test (jamais de donnée réelle). Écran de 390 × 844, celui du projet.
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 20, 30) });
  await page.goto('/');
  await viderBase(page);
  await page.evaluate(async () => {
    const r = window.__carnet.repo;
    const jour = (n) => { const d = new Date(2026, 8, 1 + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    // Du 1er septembre au 14 octobre : un jour sur trois au bureau, une humeur de 3 à 8.
    for (let n = 0; n < 44; n++) {
      await r.journal.patch(jour(n), { humeur: 3 + (n % 6), lieu: n % 3 === 0 ? 'lieu:bureau' : 'lieu:teletravail' });
    }
    // Un épisode par jour du 1er septembre au 10 octobre : deux colères pour une frustration.
    for (let n = 0; n < 40; n++) {
      await r.episodes.creer({ date: jour(n), heure: '14:30', emotion: n % 3 === 2 ? 'emotion:frustration' : 'emotion:colere', intensite: 1 + (n % 9), declencheur: 'declencheur:injustice' });
    }
    // Des symptômes, dont trois au contexte « tramway ».
    for (let n = 0; n < 20; n++) {
      await r.symptomes.creer({ date: jour(2 * n), symptome: 'symptome:vide_shutdown', intensite: 4, contexte: n % 7 === 0 ? 'dans le tramway bondé' : 'à la maison' });
    }
  });
  await page.reload();
  await appPrete(page);
});

const segment = (page, nom) => page.getByRole('group', { name: 'Afficher' }).getByRole('button', { name: new RegExp(nom) });
const onglet = (page, nom) => page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: nom, exact: true });
// v7 : par la porte « Historique », en haut de l'Analyse.
const ouvrirHistorique = async (page) => {
  await onglet(page, 'Analyse').click();
  await page.getByRole('navigation', { name: 'Historique, épisodes et Comprendre' }).getByRole('link', { name: 'Historique', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Historique', level: 1 })).toBeVisible();
};
const positionY = (page) => page.evaluate(() => window.scrollY);
// Amène une ligne au milieu de l'écran et laisse passer deux images, le temps que la position soit notée.
const defilerJusqua = async (page, lien) => {
  await lien.evaluate((a) => a.scrollIntoView({ block: 'center' }));
  await page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))));
  const y = await positionY(page);
  expect(y).toBeGreaterThan(400);
  return y;
};

test('segment Épisodes, un filtre et la position gardés après un aller-retour par un épisode', async ({ page }) => {
  await ouvrirHistorique(page);
  await segment(page, 'Épisodes').click();
  await page.getByRole('button', { name: 'Filtrer' }).click();
  await page.getByRole('group', { name: 'Émotion' }).getByRole('button', { name: 'Colère', exact: true }).click();
  await expect(page.locator('.resume-filtres')).toHaveText('Colère');
  await expect(page.getByText(/^Frustration · /)).toHaveCount(0);

  // Un épisode du 8 septembre, loin dans la liste.
  const lien = page.getByRole('link', { name: /mardi 8 sept\. · 14:30/ });
  const y = await defilerJusqua(page, lien);
  await lien.click();
  const fiche = page.getByRole('dialog', { name: 'Épisode' });
  await expect(fiche.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  await fiche.getByRole('button', { name: 'Terminer' }).click();

  await expect(page).toHaveURL(/#\/historique$/);
  await expect(segment(page, 'Épisodes')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.resume-filtres')).toHaveText('Colère');
  await expect(page.getByRole('group', { name: 'Émotion' }).getByRole('button', { name: 'Colère', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(/^Frustration · /)).toHaveCount(0);
  await expect.poll(async () => Math.abs((await positionY(page)) - y)).toBeLessThanOrEqual(1);
  await expect(lien).toBeInViewport();

  // Un passage par un autre onglet garde aussi l'état (pour la session).
  await onglet(page, 'Soins').click();
  await expect(page).toHaveURL(/#\/soins$/);
  await ouvrirHistorique(page);
  await expect(segment(page, 'Épisodes')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.resume-filtres')).toHaveText('Colère');
  await expect.poll(async () => Math.abs((await positionY(page)) - y)).toBeLessThanOrEqual(1);
});

test('la recherche et le segment Symptômes gardés après un symptôme ; après un redémarrage, seul le segment reste', async ({ page }) => {
  await ouvrirHistorique(page);
  await segment(page, 'Symptômes').click();
  await page.getByRole('button', { name: 'Rechercher', exact: true }).click();
  await page.getByLabel('Rechercher dans les textes').fill('tramway');
  await expect(page.locator('mark')).toHaveText(['tramway', 'tramway', 'tramway']);
  await page.locator('.ligne-hist').first().click();
  const fiche = page.getByRole('dialog', { name: 'Symptôme' });
  await expect(fiche.getByRole('heading', { name: 'Récapitulatif' })).toBeVisible();
  await fiche.getByRole('button', { name: 'Terminer' }).click();

  await expect(page).toHaveURL(/#\/historique$/);
  await expect(segment(page, 'Symptômes')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Rechercher dans les textes')).toHaveValue('tramway');
  await expect(page.locator('mark')).toHaveCount(3);

  // Redémarrage : l'app repart d'Aujourd'hui ; l'Historique garde son segment, pas la recherche.
  await page.reload();
  await appPrete(page);
  await ouvrirHistorique(page);
  await expect(segment(page, 'Symptômes')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Rechercher dans les textes')).toHaveCount(0);
  await expect(page.locator('.resume-filtres')).toHaveCount(0);
  expect(await positionY(page)).toBe(0);
});

test('un jour ouvert depuis l\'Historique : onglet de l\'Historique (Analyse) allumé, ‹ et › changent de jour, « Retour » ramène à la même position', async ({ page }) => {
  await ouvrirHistorique(page);
  await page.getByRole('button', { name: 'Filtrer' }).click();
  await page.getByRole('group', { name: 'Lieu' }).getByRole('button', { name: 'Bureau', exact: true }).click();
  await expect(page.locator('.resume-filtres')).toHaveText('Bureau');

  const lien = page.getByRole('link', { name: /jeudi 10 sept\./ });
  const y = await defilerJusqua(page, lien);
  await lien.click();
  await expect(page).toHaveURL(/#\/historique\/jour\/2026-09-10$/);
  await expect(page.getByRole('heading', { name: 'Jeudi 10 septembre', level: 1 })).toBeVisible();
  await expect(onglet(page, 'Analyse')).toHaveAttribute('aria-current', 'page');
  await expect(onglet(page, 'Aujourd\'hui')).not.toHaveAttribute('aria-current', 'page');
  const retour = page.getByRole('button', { name: 'Retour', exact: true });
  await expect(retour).toBeVisible();
  // Retour en haut, au-dessus de ‹ jour › ; « Revenir à aujourd'hui » reste, comme sur un jour ouvert autrement.
  const [r, p] = await Promise.all([retour.boundingBox(), page.getByRole('button', { name: 'Jour précédent' }).boundingBox()]);
  expect(r.y + r.height).toBeLessThanOrEqual(p.y + 1);
  expect(r.height).toBeGreaterThanOrEqual(44);
  await expect(page.getByRole('link', { name: 'Revenir à aujourd\'hui' })).toBeVisible();

  // ‹ et › changent de jour, sans quitter l'Historique.
  await page.getByRole('button', { name: 'Jour précédent' }).click();
  await expect(page).toHaveURL(/#\/historique\/jour\/2026-09-09$/);
  await expect(page.getByRole('heading', { name: 'Mercredi 9 septembre', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Jour suivant' }).click();
  await page.getByRole('button', { name: 'Jour suivant' }).click();
  await expect(page).toHaveURL(/#\/historique\/jour\/2026-09-11$/);
  await expect(page.getByRole('heading', { name: 'Vendredi 11 septembre', level: 1 })).toBeVisible();
  await expect(onglet(page, 'Analyse')).toHaveAttribute('aria-current', 'page');
  await expect(retour).toBeVisible();

  await retour.click();
  await expect(page).toHaveURL(/#\/historique$/);
  await expect(segment(page, 'Jours')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.resume-filtres')).toHaveText('Bureau');
  await expect.poll(async () => Math.abs((await positionY(page)) - y)).toBeLessThanOrEqual(1);
  await expect(lien).toBeInViewport();
});

test('un jour ouvert depuis l\'Historique : « Revenir à aujourd\'hui » mène à Aujourd\'hui, onglet Aujourd\'hui allumé', async ({ page }) => {
  await ouvrirHistorique(page);
  await page.getByRole('link', { name: /jeudi 10 sept\./ }).click();
  await expect(page).toHaveURL(/#\/historique\/jour\/2026-09-10$/);
  await expect(page.getByRole('button', { name: 'Retour', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Revenir à aujourd\'hui' }).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect(page.getByRole('heading', { name: 'Jeudi 15 octobre', level: 1 })).toBeVisible();
  await expect(onglet(page, 'Aujourd\'hui')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('button', { name: 'Retour', exact: true })).toHaveCount(0);
});

test('un filtre sur un élément archivé ensuite reste pressé dans « Filtrer », et un toucher le retire', async ({ page }) => {
  await ouvrirHistorique(page);
  await page.getByRole('button', { name: 'Filtrer' }).click();
  const bureau = page.getByRole('group', { name: 'Lieu' }).getByRole('button', { name: 'Bureau', exact: true });
  await bureau.click();
  await expect(page.locator('.resume-filtres')).toHaveText('Bureau');

  // Bureau archivé dans Réglages › Listes, puis retour à l'Historique.
  await aller(page, '#/reglages/listes/lieu');
  await page.locator('.element-liste', { hasText: 'Bureau' }).getByRole('button', { name: 'Archiver' }).click();
  await expect(page.locator('.element-liste.archive', { hasText: 'Bureau' })).toBeVisible();
  await ouvrirHistorique(page);
  await expect(page.locator('.resume-filtres')).toHaveText('Bureau');
  await expect(page.getByRole('button', { name: 'Filtrer' })).toHaveAttribute('aria-expanded', 'true');
  // Encore proposé, pressé, en dernier ; un toucher retire le filtre, et l'élément archivé n'est plus proposé.
  await expect(bureau).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('group', { name: 'Lieu' }).getByRole('button').last()).toHaveText('Bureau');
  await bureau.click();
  await expect(page.locator('.resume-filtres')).toHaveCount(0);
  await expect(bureau).toHaveCount(0);
  await expect(page.getByRole('link', { name: /jeudi 10 sept\./ })).toBeVisible();
});

test('une sauvegarde importée : l\'Historique repart sans filtre ni recherche (un filtre pouvait viser un élément absent du fichier)', async ({ page }) => {
  await installerPartageFactice(page);
  await page.reload();
  await appPrete(page);
  await aller(page, '#/reglages');
  await page.getByRole('button', { name: 'Exporter', exact: true }).click();
  await expect(page.getByText('Sauvegarde faite.')).toBeVisible();
  const [f] = await fichiersPartages(page);

  // Un lieu créé après la sauvegarde, et un filtre dessus.
  await page.evaluate(async () => {
    const r = window.__carnet.repo;
    const atelier = await r.listes.creer('lieu', 'Atelier inventé');
    await r.journal.patch('2026-10-15', { lieu: atelier.id });
  });
  await ouvrirHistorique(page);
  await page.getByRole('button', { name: 'Filtrer' }).click();
  await page.getByRole('group', { name: 'Lieu' }).getByRole('button', { name: 'Atelier inventé', exact: true }).click();
  await expect(page.locator('.resume-filtres')).toHaveText('Atelier inventé');

  await aller(page, '#/reglages');
  await page.locator('input[type=file]').setInputFiles({ name: f.nom, mimeType: 'application/json', buffer: Buffer.from(f.octets) });
  await page.getByRole('button', { name: 'Importer', exact: true }).click();
  await expect(page.getByText('Import terminé.')).toBeVisible();
  await ouvrirHistorique(page);
  await expect(page.locator('.resume-filtres')).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Lieu' })).toHaveCount(0);
  await expect(page.getByText('Élément sans libellé')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /jeudi 10 sept\./ })).toBeVisible();
});

test('un épisode ouvert d\'un jour de l\'Historique ramène à ce jour, puis Retour à l\'Historique', async ({ page }) => {
  await ouvrirHistorique(page);
  const lien = page.getByRole('link', { name: /lundi 14 sept\./ });
  const y = await defilerJusqua(page, lien);
  await lien.click();
  await expect(page).toHaveURL(/#\/historique\/jour\/2026-09-14$/);
  await page.locator('.evenements-jour').getByRole('link', { name: /14:30/ }).click();
  const fiche = page.getByRole('dialog', { name: 'Épisode' });
  await fiche.getByRole('button', { name: 'Terminer' }).click();
  await expect(page).toHaveURL(/#\/historique\/jour\/2026-09-14$/);
  await expect(onglet(page, 'Analyse')).toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', { name: 'Retour', exact: true }).click();
  await expect(page).toHaveURL(/#\/historique$/);
  await expect.poll(async () => Math.abs((await positionY(page)) - y)).toBeLessThanOrEqual(1);
});

test('aujourd\'hui ouvert depuis l\'Historique : même page, avec Retour', async ({ page }) => {
  await page.evaluate(() => window.__carnet.repo.journal.patch('2026-10-15', { humeur: 6 }));
  await ouvrirHistorique(page);
  await page.getByRole('link', { name: /jeudi 15 oct\./ }).click();
  await expect(page).toHaveURL(/#\/historique\/jour\/2026-10-15$/);
  await expect(page.getByRole('heading', { name: 'Jeudi 15 octobre', level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Jour suivant' })).toBeDisabled();
  await expect(onglet(page, 'Analyse')).toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', { name: 'Retour', exact: true }).click();
  await expect(page).toHaveURL(/#\/historique$/);
});

test('ouvert autrement, le jour garde le comportement actuel : onglet Aujourd\'hui, pas de Retour', async ({ page }) => {
  await page.getByRole('button', { name: 'Jour précédent' }).click();
  await expect(page).toHaveURL(/#\/jour\/2026-10-14$/);
  await expect(onglet(page, 'Aujourd\'hui')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('button', { name: 'Retour', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Revenir à aujourd\'hui' })).toBeVisible();
  await page.getByRole('button', { name: 'Jour suivant' }).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);

  await aller(page, '#/jour/2026-09-10');
  await expect(page.getByRole('heading', { name: 'Jeudi 10 septembre', level: 1 })).toBeVisible();
  await expect(onglet(page, 'Aujourd\'hui')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('button', { name: 'Retour', exact: true })).toHaveCount(0);
});

test('« Tout effacer » ne laisse ni recherche ni filtre en mémoire', async ({ page }) => {
  await ouvrirHistorique(page);
  await segment(page, 'Symptômes').click();
  await page.getByRole('button', { name: 'Rechercher', exact: true }).click();
  await page.getByLabel('Rechercher dans les textes').fill('tramway');
  await aller(page, '#/reglages/effacer');
  await page.getByRole('button', { name: 'Continuer sans exporter' }).click();
  await page.getByLabel('Écris EFFACER pour confirmer').fill('EFFACER');
  await page.getByRole('button', { name: 'Effacer définitivement' }).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await ouvrirHistorique(page);
  await expect(segment(page, 'Jours')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Rechercher dans les textes')).toHaveCount(0);
  await expect(page.getByText('Aucune journée notée pour l\'instant.')).toBeVisible();
});
