import { test, expect } from '../aides/gardes.js';

// Une nouvelle version : le serveur de test change le contenu de sw.js (/__test/bump-sw), puis la page cherche la mise à jour.
// v12 (8/9, spec v12 §7, point de vigilance 5) : dans Safari, hors de l'app installée, le guide d'installation applique seul
// une version qui attend : une fois, puis un seul rechargement, jamais en boucle. Jamais en mode app (le bandeau reste),
// jamais sur la page du code de Spotify, jamais sur un écran de saisie (en local, hors mode app, l'app s'affiche sans guide).
// Le mode app est simulé par `navigator.standalone`, comme sur l'iPhone. Les SKIP_WAITING envoyés et les chargements de
// la page sont comptés dans le sessionStorage de l'onglet, qui survit au rechargement.

const modeApp = (page) => page.addInitScript(() => {
  Object.defineProperty(Navigator.prototype, 'standalone', { configurable: true, get: () => true });
});

const compter = (page) => page.addInitScript(() => {
  const plus = (cle) => sessionStorage.setItem(cle, String(Number(sessionStorage.getItem(cle) || 0) + 1));
  plus('__chargements');
  const envoyer = ServiceWorker.prototype.postMessage;
  ServiceWorker.prototype.postMessage = function postMessage(message, ...reste) {
    if (message && message.type === 'SKIP_WAITING') plus('__skip');
    return envoyer.call(this, message, ...reste);
  };
});
const comptes = (page) => page.evaluate(() => ({
  chargements: Number(sessionStorage.getItem('__chargements') || 0),
  skip: Number(sessionStorage.getItem('__skip') || 0),
}));

// La page est servie par le service worker, puis marquée : le marqueur disparaît si elle recharge.
async function prete(page, adresse) {
  await compter(page);
  await page.goto(adresse);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await page.evaluate(() => { window.__marqueur = 1; });
}
async function nouvelleVersion(page, request) {
  await request.get('/__test/bump-sw');
  await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
}
const enAttente = (page) => page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration()).waiting));
// Une version installée qui attend, puis le temps qu'une application seule aurait pris : la page n'a pas bougé.
async function resteEnAttente(page) {
  await expect.poll(() => enAttente(page)).toBe(true);
  await page.waitForTimeout(1500);
  expect(await enAttente(page)).toBe(true);
  expect(await page.evaluate(() => window.__marqueur)).toBe(1);
  expect(await comptes(page)).toEqual({ chargements: 1, skip: 0 });
}

test('en mode app : bandeau, puis rechargement au toucher seulement', async ({ page, request }) => {
  await modeApp(page);
  await prete(page, '/?sw');
  await nouvelleVersion(page, request);
  const bandeau = page.getByText('Nouvelle version prête');
  await expect(bandeau).toBeVisible();
  await resteEnAttente(page);
  await page.getByRole('button', { name: 'Recharger' }).click();
  await page.waitForFunction(() => window.__marqueur === undefined);
  await expect(page.getByRole('heading', { name: "Aujourd'hui" })).toBeVisible();
  await expect(bandeau).toHaveCount(0);
  expect(await comptes(page)).toEqual({ chargements: 2, skip: 1 });
});

test('hors mode app, sur le guide : la nouvelle version s\'applique seule, une fois, puis un seul rechargement, sans boucle', async ({ page, request }) => {
  await prete(page, '/?sw&forcer-guide');
  const guide = page.getByRole('heading', { name: 'Installer Emozio' });
  await expect(guide).toBeVisible();
  await nouvelleVersion(page, request);
  await page.waitForFunction(() => window.__marqueur === undefined);
  await expect(guide).toBeVisible();
  await expect(page.getByText('Nouvelle version prête')).toHaveCount(0);
  expect(await comptes(page)).toEqual({ chargements: 2, skip: 1 });
  // Jamais en boucle : la page rechargée n'a plus de version en attente, et une nouvelle recherche ne relance rien.
  await page.evaluate(() => { window.__marqueur = 2; });
  await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
  await page.waitForTimeout(1500);
  expect(await enAttente(page)).toBe(false);
  expect(await page.evaluate(() => window.__marqueur)).toBe(2);
  expect(await comptes(page)).toEqual({ chargements: 2, skip: 1 });
});

// Le chemin de l'Aide iPhone (« ferme l'onglet, puis rouvre l'adresse ») : la nouvelle version attend déjà quand la page
// s'ouvre. L'app en local, avec son bandeau, laisse une version en attente ; le même onglet ouvre ensuite la page du code
// de Spotify (rien n'est appliqué), puis le guide (appliquée seule, une fois, un seul rechargement).
test('hors mode app, une version qui attend déjà à l\'ouverture : la page du code la laisse, le guide l\'applique seul, une fois', async ({ page, request }) => {
  await prete(page, '/?sw');
  await nouvelleVersion(page, request);
  await expect.poll(() => enAttente(page)).toBe(true);
  await page.evaluate(() => sessionStorage.clear());
  await page.goto('/?sw&forcer-guide&code=code-de-safari&state=x');
  await expect(page.getByRole('heading', { name: 'Code de Spotify', level: 1 })).toBeVisible();
  await page.evaluate(() => { window.__marqueur = 1; });
  await resteEnAttente(page);
  await expect(page.locator('.valeur-code')).toHaveText('code-de-safari');

  await page.evaluate(() => sessionStorage.clear());
  await page.goto('/?sw&forcer-guide');
  // Le rechargement peut couper une lecture des comptes : elle est alors refaite.
  await expect.poll(() => comptes(page).catch(() => null)).toEqual({ chargements: 2, skip: 1 });
  await expect(page.getByRole('heading', { name: 'Installer Emozio' })).toBeVisible();
  await expect(page.getByText('Nouvelle version prête')).toHaveCount(0);
  await page.waitForTimeout(1500);
  expect(await enAttente(page)).toBe(false);
  expect(await comptes(page)).toEqual({ chargements: 2, skip: 1 });
});

test('hors mode app, sur la page du code de Spotify : jamais appliquée seule, le code reste affiché', async ({ page, request }) => {
  await prete(page, '/?sw&forcer-guide&code=code-de-safari&state=x');
  await expect(page.getByRole('heading', { name: 'Code de Spotify', level: 1 })).toBeVisible();
  await nouvelleVersion(page, request);
  await resteEnAttente(page);
  await expect(page.getByRole('heading', { name: 'Code de Spotify', level: 1 })).toBeVisible();
  await expect(page.locator('.valeur-code')).toHaveText('code-de-safari');
  await expect(page.getByText('Nouvelle version prête')).toHaveCount(0);
});

test('en mode app, même sur le guide forcé en local : jamais appliquée seule', async ({ page, request }) => {
  await modeApp(page);
  await prete(page, '/?sw&forcer-guide');
  await expect(page.getByRole('heading', { name: 'Installer Emozio' })).toBeVisible();
  await nouvelleVersion(page, request);
  await resteEnAttente(page);
});

test('hors mode app, pendant une saisie (en local, l\'app sans guide) : le bandeau, jamais appliquée seule, le texte reste', async ({ page, request }) => {
  await prete(page, '/?sw');
  const champ = page.getByRole('textbox', { name: 'Mes points positifs', exact: true });
  await champ.fill('Une phrase en cours');
  await nouvelleVersion(page, request);
  await expect(page.getByText('Nouvelle version prête')).toBeVisible();
  await resteEnAttente(page);
  await expect(champ).toHaveValue('Une phrase en cours');
  await expect(champ).toBeFocused();
});
