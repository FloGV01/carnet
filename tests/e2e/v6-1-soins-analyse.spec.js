import { test, expect } from '../aides/gardes.js';
import { viderBase, aller } from '../aides/saisie.js';
import { generer } from '../fixtures/generateur.js';
import { addDays } from '../../public/js/domain/dates.js';

// v6.1 · Soins et Analyse (P12, P13) : « Pour mes soignants : Export PSY · Vue soignants » en haut de Soins, quel
// que soit le segment, et le prénom de la page sur l'écran Vue soignants ; dans l'Analyse, Comprendre en trois
// portes, le sélecteur de période collé sur ses seules sections, puis « Sur tout ton historique ».
// Données inventées. Horloge : jeudi 15 octobre 2026, 21:00 (écran de 390 × 844, celui du projet).
const AUJ = '2026-10-15';
const PRENOM = 'Essai';
const nav = (page, nom) => page.getByRole('navigation').getByRole('link', { name: nom, exact: true });
const segment = (page, nom) => page.getByRole('group', { name: 'Soins', exact: true }).getByRole('button', { name: `Soins : ${nom}` });
const ligneSoignants = (page) => page.locator('.pour-soignants');
const porte = (page, nom) => page.getByRole('region', { name: 'Comprendre' }).getByRole('link', { name: nom, exact: true });
const lireMeta = (page, cle) => page.evaluate((c) => window.__carnet.repo.meta.lire(c), cle);
const image = (page) => page.locator('canvas.apercu-page').evaluate((c) => c.toDataURL('image/png'));

// Une cible : 44 pt au moins dans les deux sens.
async function cible(loc) {
  const b = await loc.boundingBox();
  expect(b.height).toBeGreaterThanOrEqual(44);
  expect(b.width).toBeGreaterThanOrEqual(44);
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

test('Soins : « Pour mes soignants » sous le titre et au-dessus des segments, dans les trois segments ; deux liens de 44 pt', async ({ page }) => {
  await nav(page, 'Soins').click();
  for (const nom of ['Rendez-vous', 'Notes', 'Traitement']) {
    await segment(page, nom).click();
    await expect(segment(page, nom)).toHaveAttribute('aria-pressed', 'true');
    await expect(ligneSoignants(page)).toHaveText(/^Pour mes soignants :\s*Export PSY\s*·\s*Vue soignants$/);
    const [titre, ligne, segments] = await Promise.all([
      page.getByRole('heading', { name: 'Soins', level: 1 }), ligneSoignants(page), page.getByRole('group', { name: 'Soins', exact: true }),
    ].map((l) => l.boundingBox()));
    expect(titre.y + titre.height).toBeLessThanOrEqual(ligne.y);
    expect(ligne.y + ligne.height).toBeLessThanOrEqual(segments.y);
    await expect(ligneSoignants(page).getByRole('link', { name: 'Export PSY' })).toHaveAttribute('href', '#/export-psy');
    await expect(ligneSoignants(page).getByRole('link', { name: 'Vue soignants' })).toHaveAttribute('href', '#/soignants');
    for (const lien of await ligneSoignants(page).getByRole('link').all()) await cible(lien);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('Export PSY depuis Soins : deux touchers, l\'onglet Soins reste allumé, « Retour » ramène à Soins sur le même segment', async ({ page }) => {
  await page.evaluate(() => window.__carnet.repo.journal.patch('2026-10-14', { humeur: 6, explosions: 0 }));
  await nav(page, 'Soins').click();
  await segment(page, 'Notes').click();
  await page.getByRole('link', { name: 'Export PSY' }).click();
  await expect(page).toHaveURL(/#\/export-psy$/);
  await expect(page.getByRole('heading', { name: 'Export PSY', level: 1 })).toBeVisible();
  await expect(nav(page, 'Soins')).toHaveAttribute('aria-current', 'page');
  await expect(nav(page, 'Analyse')).not.toHaveAttribute('aria-current', 'page');
  await expect(page.getByLabel('Aperçu du texte')).toContainText('mer 14/10 · humeur du soir 6 · explosions 0');
  await page.getByRole('button', { name: 'Retour', exact: true }).click();
  await expect(page).toHaveURL(/#\/soins$/);
  await expect(segment(page, 'Notes')).toHaveAttribute('aria-pressed', 'true');
});

test('Vue soignants depuis Soins : onglet Soins, le prénom réglé sur l\'écran (même clé, enregistré à la sortie du champ, aperçu redessiné), plus dans Réglages', async ({ page }) => {
  test.setTimeout(60000);
  await nav(page, 'Soins').click();
  await page.getByRole('link', { name: 'Vue soignants' }).click();
  await expect(page).toHaveURL(/#\/soignants$/);
  await expect(page.getByRole('heading', { name: 'Vue soignants', level: 1 })).toBeVisible();
  await expect(nav(page, 'Soins')).toHaveAttribute('aria-current', 'page');
  const partager = page.getByRole('button', { name: 'Partager en PDF' });
  await expect(partager).toBeEnabled({ timeout: 15000 });

  // Vide au départ ; à la sortie du champ (Entrée), la clé prenomSoignants est écrite et l'aperçu se redessine.
  const champ = page.getByLabel('Prénom sur la page');
  await expect(champ).toHaveValue('');
  await cible(champ);
  const avant = await image(page);
  await champ.fill(PRENOM);
  expect(await lireMeta(page, 'prenomSoignants')).toBeNull();
  await champ.press('Enter');
  await expect(champ).not.toBeFocused();
  await expect.poll(() => lireMeta(page, 'prenomSoignants')).toBe(PRENOM);
  await expect.poll(() => image(page), { timeout: 15000 }).not.toBe(avant);
  await expect(partager).toBeEnabled({ timeout: 15000 });

  // « Retour » ramène à Soins ; rouvert, l'écran relit le prénom gardé.
  await page.getByRole('button', { name: 'Retour', exact: true }).click();
  await expect(page).toHaveURL(/#\/soins$/);
  await page.getByRole('link', { name: 'Vue soignants' }).click();
  await expect(page.getByLabel('Prénom sur la page')).toHaveValue(PRENOM);

  // Vidé : plus de prénom (null, comme avant dans Réglages).
  await page.getByLabel('Prénom sur la page').fill('  ');
  await page.getByLabel('Prénom sur la page').blur();
  await expect.poll(() => lireMeta(page, 'prenomSoignants')).toBeNull();

  // Réglages › Analyse n'a plus de champ de prénom ; ses deux interrupteurs restent.
  await aller(page, '#/reglages');
  const analyse = page.getByRole('region', { name: 'Analyse' });
  await expect(analyse.getByRole('switch')).toHaveCount(2);
  await expect(page.getByRole('textbox', { name: /Prénom/ })).toHaveCount(0);
});

// 120 jours inventés qui finissent aujourd'hui, avec un contact et une activité un jour sur trois : toutes les
// sections de l'Analyse ont de quoi s'afficher.
async function charger120(page) {
  const journal = generer({ jours: 120, seed: 7, scenario: 'bureau', debut: addDays(AUJ, -119) }).map((j, i) => (i % 3 ? j : {
    ...j, contactHumain: true, contacts: [{ avec: ['contactAvec:amis'], effet: 'contactEffet:ressourcant' }],
    sportMouvement: true, activites: [{ type: 'typeSport:marche', duree: 'dureeSport:de_30_a_60' }],
  }));
  await page.evaluate(async (j) => {
    const r = window.__carnet.repo;
    for (const { date, ...x } of j) await r.journal.patch(date, x);
  }, journal);
}

test('Analyse : trois portes vers Comprendre, plus d\'Export PSY ni de Vue soignants ; la semaine, la période, puis « Sur tout ton historique »', async ({ page }) => {
  test.setTimeout(60000);
  await charger120(page);
  await nav(page, 'Analyse').click();
  await expect(page.getByRole('heading', { name: 'Sommeil et humeur' })).toBeVisible({ timeout: 15000 });

  // Les portes, en tête, de 44 pt.
  await expect(page.getByRole('region', { name: 'Comprendre' }).getByRole('link')).toHaveText(['Explosions', 'Énergie', 'Rythmes']);
  for (const [nom, onglet] of [['Explosions', 'explosions'], ['Énergie', 'energie'], ['Rythmes', 'rythmes']]) {
    await expect(porte(page, nom)).toHaveAttribute('href', `#/comprendre/${onglet}`);
    await cible(porte(page, nom));
  }
  await expect(page.getByRole('link', { name: 'Export PSY' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Vue soignants' })).toHaveCount(0);

  // L'ordre : rien d'autre ne bouge, les deux constats sur tout l'historique passent à la fin, sous un intertitre.
  const titres = await page.locator('main').locator('h2, h3, .repli-titre, .selecteur-periode').evaluateAll((els) => els.map((e) => (e.classList.contains('selecteur-periode') ? '[période]' : e.textContent.trim())));
  const reperes = ['Comprendre', 'Ma semaine', 'Tendances', '[période]', 'Avec qui, comment c\'était · Mouvement', 'Tes moments, étape par étape', 'Les plus fréquents',
    'Tous les chiffres', 'Sur tout ton historique', 'Ce que tes journées à 7 ou plus ont en commun', 'Sommeil et humeur'];
  expect(titres.filter((t) => reperes.includes(t))).toEqual(reperes);
  await expect(page.getByRole('heading', { name: 'Sur tout ton historique', level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ce que tes journées à 7 ou plus ont en commun', level: 3 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sommeil et humeur', level: 3 })).toBeVisible();
  await expect(page.locator('.note-carte-interne', { hasText: 'historique' })).toHaveCount(0);

  // Le sélecteur colle sur les sections qu'il règle…
  const selecteur = page.locator('.selecteur-periode');
  await page.getByRole('heading', { name: 'Les plus fréquents' }).evaluate((e) => e.scrollIntoView({ block: 'center' }));
  await expect.poll(async () => Math.round((await selecteur.boundingBox()).y)).toBe(0);
  // … et part avec elles : « Sur tout ton historique » en haut de l'écran, il n'est plus au-dessus.
  await page.setViewportSize({ width: 390, height: 480 });
  const intertitre = page.getByRole('heading', { name: 'Sur tout ton historique' });
  await intertitre.evaluate((e) => e.scrollIntoView({ block: 'start' }));
  await expect.poll(async () => Math.round((await intertitre.boundingBox()).y)).toBeLessThanOrEqual(1);
  const [s, i] = await Promise.all([selecteur.boundingBox(), intertitre.boundingBox()]);
  expect(s.y + s.height).toBeLessThanOrEqual(i.y);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.locator('main')).not.toContainText(/NaN|undefined|Infinity|%/);
});

test('Analyse : chaque onglet de Comprendre en deux touchers depuis Aujourd\'hui ; « Retour » ramène à l\'Analyse', async ({ page }) => {
  for (const [nom, onglet] of [['Explosions', 'explosions'], ['Énergie', 'energie'], ['Rythmes', 'rythmes']]) {
    await nav(page, 'Aujourd\'hui').click();
    await nav(page, 'Analyse').click();
    await porte(page, nom).click();
    await expect(page).toHaveURL(new RegExp(`#/comprendre/${onglet}$`));
    await expect(page.getByRole('group', { name: 'Comprendre', exact: true }).getByRole('button', { name: `Comprendre : ${nom}`, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(nav(page, 'Analyse')).toHaveAttribute('aria-current', 'page');
  }
  await page.getByRole('button', { name: 'Retour', exact: true }).click();
  await expect(page).toHaveURL(/#\/analyse$/);
});
