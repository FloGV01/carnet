import { createHash } from 'node:crypto';
import { test, expect } from '../aides/gardes.js';
import { viderBase, aller, appPrete } from '../aides/saisie.js';
import { installerPartageFactice, fichiersPartages } from '../aides/partage-stub.js';
import { stabiliser, contrastesFaibles, ciblesPetites, motsInterdits, ecouterMouvements, mouvements } from '../aides/controle.js';

// v11 (7/11) · La connexion à Spotify (spec §8.3), la seule exception à « zéro réseau » : au toucher sur « Choisir dans mon
// compte », dans Mes refuges, la page de Spotify ; au retour, la liste de ses playlists, en mémoire de l'écran ; trois au plus
// dans ses refuges, « Spotify » nommé à côté ; « Retirer ces playlists » ; aucun jeton gardé. Si le retour arrive dans Safari,
// la page montre un code à coller dans Mes refuges.
// Aucune requête ne part pour de bon : la constante de l'app (SPOTIFY_CLIENT_ID) est remplacée dans le fichier servi, par du
// vide ou par une valeur factice, jamais la vraie ; par défaut, la garde réseau reste active (toute requête vers un autre hôte
// fait échouer le test) ; avec `hotesPermis`, les deux hôtes de Spotify répondent par des réponses simulées (page.route), et
// la garde coupe tout ce qui n'en a pas. Aucun lien n'est suivi. Données inventées, sans prénom.
// Horloge : jeudi 15 octobre 2026, 21:00 (390 × 844).

const FACTICE = 'client-de-test';
const HOTES = ['accounts.spotify.com', 'api.spotify.com'];
const CLE = 'carnet:spotify:attente';
const VERIFIER = 'verifier-de-test-'.padEnd(64, 'x');
const PIEGE = '<img src=x onerror="window.__piege=1">';
// Une page de réponse de Spotify, avec ce qui ne doit pas passer : un élément null, un lien d'un autre hôte, un nom piégé.
const PLAYLISTS = {
  items: [
    { name: 'Pour souffler', id: 's1', external_urls: { spotify: 'https://open.spotify.com/playlist/s1' }, tracks: { total: 12 } },
    null,
    { name: 'Pour marcher', id: 's2', external_urls: { spotify: 'https://open.spotify.com/playlist/s2' } },
    { name: 'Ailleurs', id: 'x', external_urls: { spotify: 'https://autre.test/playlist/x' } },
    { name: PIEGE, id: 's3', external_urls: { spotify: 'https://open.spotify.com/playlist/s3' } },
    { name: 'Pour dormir', id: 's4', external_urls: { spotify: 'https://open.spotify.com/playlist/s4' } },
  ],
  total: 6, limit: 50, offset: 0, next: null,
};
const NOMS = ['Pour souffler', 'Pour marcher', PIEGE, 'Pour dormir'];
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };

// Le fichier servi, avec la constante remplacée ; sans elle, le module ne se charge pas, et le test échoue.
async function servirConstante(page, valeur) {
  await page.route('**/js/plateforme/spotify.js', async (route) => {
    const reponse = await route.fetch();
    const texte = await reponse.text();
    const motif = /^export const SPOTIFY_CLIENT_ID = '[^']*';$/m;
    if (!motif.test(texte)) { await route.abort(); return; }
    await route.fulfill({ response: reponse, body: texte.replace(motif, `export const SPOTIFY_CLIENT_ID = '${valeur}';`) });
  });
}

// Les deux hôtes de Spotify, simulés : la page d'autorisation (une page vide), le jeton, la liste. Chaque demande est notée.
// `jeton` et `liste` : { status, corps } ou 'coupe' (le réseau coupé).
async function simulerSpotify(page, { jeton = { status: 200, corps: { access_token: 'jeton-de-test', token_type: 'Bearer', expires_in: 3600 } }, liste = { status: 200, corps: PLAYLISTS } } = {}) {
  const demandes = { autoriser: [], jeton: [], liste: [], toutes: [] };
  const repondre = (route, r) => (r === 'coupe' ? route.abort('internetdisconnected')
    : route.fulfill({ status: r.status, headers: CORS, contentType: 'application/json', body: JSON.stringify(r.corps) }));
  await page.route((u) => HOTES.includes(u.hostname), async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    demandes.toutes.push(`${req.method()} ${u.hostname}${u.pathname}`);
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    if (u.hostname === 'accounts.spotify.com' && u.pathname === '/authorize') {
      demandes.autoriser.push(u);
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: '<!doctype html><meta charset="utf-8"><title>Spotify simulé</title><p>Spotify simulé</p>' });
    }
    if (u.hostname === 'accounts.spotify.com' && u.pathname === '/api/token') {
      demandes.jeton.push({ corps: req.postData(), entetes: await req.allHeaders() });
      return repondre(route, jeton);
    }
    if (u.hostname === 'api.spotify.com' && u.pathname === '/v1/me/playlists') {
      demandes.liste.push({ u, entetes: await req.allHeaders() });
      return repondre(route, liste);
    }
    return route.abort();
  });
  return demandes;
}

async function demarrer(page, constante = FACTICE) {
  await servirConstante(page, constante);
  await page.goto('/');
  await viderBase(page);
}

const ecran = (page) => page.locator('main.refuges');
const bouton = (page, nom) => page.getByRole('button', { name: nom, exact: true });
const choisirDansMonCompte = (page) => bouton(page, 'Choisir dans mon compte');
const champCode = (page) => page.getByLabel('Code de Spotify', { exact: true });
const groupeSpotify = (page) => page.getByRole('group', { name: 'Spotify', exact: true });
const choix = (page, nom) => groupeSpotify(page).getByRole('button', { name: nom, exact: true });
const lignes = (zone) => zone.locator('a.lien-refuge');
const hrefs = (loc) => loc.evaluateAll((l) => l.map((a) => a.getAttribute('href')));
const lireMeta = (page, cle) => page.evaluate((c) => window.__carnet.repo.meta.lire(c), cle);
const ecrireMeta = (page, cle, v) => page.evaluate(([c, x]) => window.__carnet.repo.meta.ecrire(c, x), [cle, v]);
const adresse = (page) => page.evaluate(() => `${location.pathname}${location.search}${location.hash}`);
const attente = (page) => page.evaluate((c) => localStorage.getItem(c), CLE);
const poserAttente = (page, state = 'etat-de-test') => page.evaluate(([c, v, s]) => localStorage.setItem(c, JSON.stringify({ verifier: v, state: s, creeLe: Date.now() })), [CLE, VERIFIER, state]);
const statut = (page) => ecran(page).getByRole('status');
const N_ABOUTI = 'La connexion n\'a pas abouti. Tes liens notés restent.';
const REFUS = 'Spotify refuse cette connexion. Tes liens notés restent.';
// Tout ce que Carnet garde : le localStorage et la méta entière (lue dans la base).
const toutCeQuiEstGarde = (page) => page.evaluate(async () => {
  const base = await new Promise((ok, ko) => { const r = indexedDB.open('carnet'); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
  const meta = await new Promise((ok, ko) => { const r = base.transaction('meta').objectStore('meta').getAll(); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
  base.close();
  return JSON.stringify({ local: { ...localStorage }, meta });
});

const ouvrirRefuges = async (page) => {
  await aller(page, '#/bien-etre');
  await page.getByRole('list', { name: 'Entrées' }).getByRole('link', { name: 'Mes refuges' }).click();
  await expect(page.getByLabel('Mes titres', { exact: true })).toBeVisible();
};
// Moment difficile monté de nouveau (passage par Réglages), sa carte Mon plan remplie : les refuges sont lus.
const ouvrirMoment = async (page) => {
  await aller(page, '#/reglages');
  await expect(page.getByRole('heading', { name: 'Réglages', level: 1 })).toBeVisible();
  await aller(page, '#/moment-difficile');
  const v = page.getByRole('dialog', { name: 'Moment difficile' });
  await expect(v.getByRole('heading', { name: 'Mon plan', level: 2 })).toBeVisible();
  await expect(v.locator('.plan-moment').locator('.contenu-plan, a.action')).toHaveCount(1);
  return v;
};
// Le retour de Spotify dans l'app : la page d'autorisation est quittée pour l'adresse de Carnet, avec le code.
const revenirDeSpotify = async (page, params) => {
  await page.goto(`/?${params}`);
  await appPrete(page);
};

// Deux filets, pour qu'aucune requête ne quitte jamais la machine, même si le code ou un test se trompait : un proxy local
// mort pour tout ce qui n'est pas 127.0.0.1 (une requête qui passerait les interceptions échoue là), et une interception
// posée la première, qui coupe toute requête vers un autre hôte sans réponse simulée. La requête préalable CORS (OPTIONS) d'une
// requête interceptée n'atteint pas le réseau : WebKit la règle lui-même (vérifié avec un proxy local qui note tout).
test.use({ proxy: { server: 'http://127.0.0.1:9', bypass: '127.0.0.1' } });

test.beforeEach(async ({ page }) => {
  await page.route((u) => u.hostname !== '127.0.0.1', (route) => route.abort('blockedbyclient'));
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
});

// ---------- Par défaut : la garde réseau active ----------

test('constante vide : ni bouton ni champ de code, même avec une demande en attente ; un retour de Spotify n\'est pas lu', async ({ page }) => {
  await demarrer(page, '');
  await poserAttente(page);
  await ecrireMeta(page, 'refuges', { playlists: [{ nom: 'Pour souffler', lien: 'https://open.spotify.com/playlist/s1', source: 'spotify' }] });
  await ouvrirRefuges(page);
  await expect(choisirDansMonCompte(page)).toHaveCount(0);
  await expect(champCode(page)).toHaveCount(0);
  await expect(ecran(page)).not.toContainText('Carnet ne garde pas la connexion');
  // Les liens déjà notés restent, et se retirent toujours.
  await expect(lignes(ecran(page))).toHaveCount(1);
  await expect(bouton(page, 'Retirer ces playlists')).toBeVisible();
  await revenirDeSpotify(page, 'code=faux&state=etat-de-test');
  expect(await page.evaluate(() => location.hash)).toBe('#/aujourdhui');
  await expect(page.locator('main.aujourdhui')).toBeVisible();
  // La garde (gardes.js) : aucune requête vers un autre hôte.
});

test('constante remplie : Aujourd\'hui, Moment difficile, Bien-être et Mes refuges ouverts sans toucher le bouton ne font aucune requête', async ({ page }) => {
  const demandes = [];
  page.on('request', (r) => demandes.push(r.url()));
  await demarrer(page);
  await ecrireMeta(page, 'monPlan', { quandCaMonte: 'je sors marcher' });
  await ecrireMeta(page, 'refuges', { titres: 'Pluie lente', playlists: [{ nom: 'Pour souffler', lien: 'https://open.spotify.com/playlist/s1', source: 'spotify' }] });
  await page.reload();
  await appPrete(page);
  await expect(page.locator('main.aujourdhui')).toBeVisible();
  const v = await ouvrirMoment(page);
  await expect(lignes(v)).toHaveCount(1);
  await aller(page, '#/bien-etre');
  await expect(page.getByRole('list', { name: 'Entrées' })).toBeVisible();
  await ouvrirRefuges(page);
  await expect(choisirDansMonCompte(page)).toBeVisible();
  await expect(ecran(page).locator('#note-compte-spotify')).toHaveText('Une seule lecture : Carnet ne garde pas la connexion.');
  await expect(choisirDansMonCompte(page)).toHaveAttribute('aria-describedby', 'note-compte-spotify');
  // Sans demande en attente, pas de champ de code.
  await expect(champCode(page)).toHaveCount(0);
  expect(demandes.filter((u) => !u.startsWith('http://127.0.0.1'))).toEqual([]);
});

test('la page du code : un retour dans Safari, avec ou sans demande en attente, montre le code à copier, pas le guide ; adresse propre, aucune requête', async ({ page }) => {
  await demarrer(page);
  for (const avecAttente of [false, true]) {
    if (avecAttente) await poserAttente(page, 'x');
    await page.goto('/?forcer-guide&code=code-de-safari&state=x');
    await expect(page.getByRole('heading', { name: 'Code de Spotify', level: 1 })).toBeVisible();
    await expect(page.locator('main.code-spotify')).toContainText('Copie ce code, reviens dans Carnet, puis colle-le dans Mes refuges.');
    await expect(page.locator('.valeur-code')).toHaveText('code-de-safari');
    await expect(page.getByRole('heading', { name: 'Installer Carnet' })).toHaveCount(0);
    expect(await adresse(page)).toBe('/?forcer-guide#/aujourdhui');
    // La connexion ne se finit jamais ici : la demande, s'il y en a une, reste.
    expect(Boolean(await attente(page))).toBe(avecAttente);
    await bouton(page, 'Copier le code').click();
    await expect(page.locator('main.code-spotify').getByRole('status')).toHaveText(/^(Copié\.|La copie n'a pas marché : sélectionne le code\.)$/);
  }
  // Sans code, le guide, comme avant.
  await page.goto('/?forcer-guide');
  await expect(page.getByRole('heading', { name: 'Installer Carnet' })).toBeVisible();
});

test('point de vigilance 5, sans réseau : un state qui ne correspond pas, un code sans demande, un refus de Spotify ; rien ne part, les refuges restent', async ({ page }) => {
  await demarrer(page);
  const notes = { titres: 'Pluie lente', playlists: [{ nom: 'Collée', lien: 'https://open.spotify.com/playlist/m1', source: null }] };
  await ecrireMeta(page, 'refuges', notes);
  // Un state qui ne correspond pas : ignoré, la demande en cours reste, l'adresse est propre.
  await poserAttente(page, 'etat-de-test');
  await revenirDeSpotify(page, 'code=faux&state=autre');
  expect(await adresse(page)).toBe('/#/aujourdhui');
  expect(JSON.parse(await attente(page)).state).toBe('etat-de-test');
  // Un code sans state, ou sans demande du tout (retour dans Safari sans verifier, hors du guide) : ignoré.
  await revenirDeSpotify(page, 'code=faux');
  expect(await adresse(page)).toBe('/#/aujourdhui');
  await page.evaluate((c) => localStorage.removeItem(c), CLE);
  await revenirDeSpotify(page, 'code=faux&state=etat-de-test');
  expect(await adresse(page)).toBe('/#/aujourdhui');
  // Un refus sur la page de Spotify (?error=access_denied) : Mes refuges dit l'échec, la demande est oubliée.
  await poserAttente(page, 'etat-de-test');
  await revenirDeSpotify(page, 'error=access_denied&state=etat-de-test');
  expect(await adresse(page)).toBe('/#/refuges');
  await expect(statut(page)).toHaveText(N_ABOUTI);
  expect(await attente(page)).toBeNull();
  await expect(champCode(page)).toHaveCount(0);
  // Un refus d'une autre demande : ignoré.
  await poserAttente(page, 'etat-de-test');
  await revenirDeSpotify(page, 'error=access_denied&state=autre');
  expect(await adresse(page)).toBe('/#/aujourdhui');
  expect(await attente(page)).not.toBeNull();
  // Une demande vieille de plus d'une heure : le champ du code n'est plus là, et la clé est retirée.
  await page.evaluate(([c, v]) => localStorage.setItem(c, JSON.stringify({ verifier: v, state: 's', creeLe: Date.now() - 3600001 })), [CLE, VERIFIER]);
  await ouvrirRefuges(page);
  await expect(champCode(page)).toHaveCount(0);
  expect(await attente(page)).toBeNull();
  expect(await lireMeta(page, 'refuges')).toEqual(notes);
});

test('« Annuler » ne défait que le retrait : une playlist collée pendant le toast le ferme et reste ; une liste changée entre-temps n\'est pas remplacée', async ({ page }) => {
  await demarrer(page);
  const collee = { nom: 'Collée', lien: 'https://open.spotify.com/playlist/m1', source: null };
  const s1 = { nom: 'Pour souffler', lien: 'https://open.spotify.com/playlist/s1', source: 'spotify' };
  const s2 = { nom: 'Pour marcher', lien: 'https://open.spotify.com/playlist/s2', source: 'spotify' };
  const depart = { titres: 'Pluie lente', playlists: [collee, s1, s2] };
  const annuler = page.locator('.toast').getByRole('button', { name: 'Annuler', exact: true });
  // Lu dans l'état de l'app, sans attendre : le toast se ferme seul au bout de 5 s.
  const toastOuvert = () => page.evaluate(() => Boolean(window.__carnet.etatApp.lire().toast));
  const retirer = async () => {
    await bouton(page, 'Retirer ces playlists').click();
    await expect.poll(async () => (await lireMeta(page, 'refuges'))?.playlists).toEqual([collee]);
    await expect(annuler).toBeVisible();
  };
  await ecrireMeta(page, 'refuges', depart);
  await ouvrirRefuges(page);
  // Rien d'autre entre-temps : les playlists de Spotify reviennent à leur place, les titres n'ont pas bougé.
  await retirer();
  await annuler.click();
  await expect.poll(() => lireMeta(page, 'refuges')).toEqual(depart);
  await expect(lignes(ecran(page))).toHaveCount(3);
  // Une playlist collée à la main dans la ligne vide revenue : dès la frappe, le toast se ferme ; la playlist reste.
  await retirer();
  await page.getByLabel('Lien de la playlist 2', { exact: true }).fill('https://open.spotify.com/playlist/neuve');
  expect(await toastOuvert()).toBe(false);
  await expect(annuler).toHaveCount(0);
  await page.getByLabel('Nom de la playlist 2', { exact: true }).fill('Neuve à la main');
  await page.getByLabel('Nom de la playlist 2', { exact: true }).blur();
  const neuve = { nom: 'Neuve à la main', lien: 'https://open.spotify.com/playlist/neuve', source: null };
  await expect.poll(() => lireMeta(page, 'refuges')).toEqual({ titres: 'Pluie lente', playlists: [collee, neuve] });
  // Une liste écrite entre le retrait et « Annuler » (ici, hors de l'écran) : « Annuler » ne la remplace pas.
  await ecrireMeta(page, 'refuges', depart);
  await ouvrirRefuges(page);
  await retirer();
  const ailleurs = { titres: 'Pluie lente', playlists: [collee, { nom: 'Écrite ailleurs', lien: 'https://open.spotify.com/playlist/ailleurs', source: null }] };
  await ecrireMeta(page, 'refuges', ailleurs);
  await annuler.click();
  // L'écran relit la liste à cette écriture : les deux lignes d'écoute de la base, sans Spotify.
  await expect(lignes(ecran(page))).toHaveCount(2);
  expect(await hrefs(lignes(ecran(page)))).toEqual(ailleurs.playlists.map((p) => p.lien));
  await expect(bouton(page, 'Retirer ces playlists')).toHaveCount(0);
  expect(await lireMeta(page, 'refuges')).toEqual(ailleurs);
});

// ---------- Avec les deux hôtes de Spotify, simulés ----------

test.describe('avec Spotify simulé', () => {
  test.use({ hotesPermis: HOTES });

  test('choisir dans son compte : la page de Spotify, le retour dans Mes refuges, trois choix au plus, « Spotify » nommé, « Retirer ces playlists » ; aucun jeton gardé', async ({ page }) => {
    await installerPartageFactice(page);
    await demarrer(page);
    const demandes = await simulerSpotify(page);
    await ecrireMeta(page, 'monPlan', { quandCaMonte: 'je sors marcher' });
    await ouvrirRefuges(page);
    // Le toucher : la demande notée, puis la page de Spotify, avec le seul droit de lire ses playlists.
    await choisirDansMonCompte(page).click();
    await expect.poll(() => demandes.autoriser.length).toBe(1);
    const autoriser = Object.fromEntries(demandes.autoriser[0].searchParams);
    expect(Object.keys(autoriser).sort()).toEqual(['client_id', 'code_challenge', 'code_challenge_method', 'redirect_uri', 'response_type', 'scope', 'state']);
    expect(autoriser).toMatchObject({ client_id: FACTICE, response_type: 'code', redirect_uri: 'http://127.0.0.1:5174/', scope: 'playlist-read-private', code_challenge_method: 'S256' });
    expect(autoriser.state).toMatch(/^[A-Za-z0-9_-]{32}$/);
    await expect(page).toHaveTitle('Spotify simulé');

    // Le retour : l'adresse est propre, Mes refuges s'ouvre et lit la liste.
    await revenirDeSpotify(page, `code=code-de-test&state=${autoriser.state}`);
    expect(await adresse(page)).toBe('/#/refuges');
    await expect(groupeSpotify(page).getByRole('button')).toHaveCount(4);
    expect(await groupeSpotify(page).getByRole('button').allTextContents()).toEqual(NOMS);
    await expect(groupeSpotify(page).getByRole('button', { pressed: true })).toHaveCount(0);
    // Le jeton : le formulaire exact, avec le verifier dont le défi est parti vers Spotify, sans aucun secret.
    expect(demandes.jeton).toHaveLength(1);
    const corps = Object.fromEntries(new URLSearchParams(demandes.jeton[0].corps));
    expect(Object.keys(corps).sort()).toEqual(['client_id', 'code', 'code_verifier', 'grant_type', 'redirect_uri']);
    expect(corps).toMatchObject({ grant_type: 'authorization_code', code: 'code-de-test', redirect_uri: 'http://127.0.0.1:5174/', client_id: FACTICE });
    expect(createHash('sha256').update(corps.code_verifier).digest('base64url')).toBe(autoriser.code_challenge);
    expect(demandes.jeton[0].entetes['content-type']).toMatch(/^application\/x-www-form-urlencoded/);
    expect(demandes.jeton[0].entetes.cookie).toBeUndefined();
    // La liste : une page, l'offset calculé, le jeton dans l'en-tête seulement.
    expect(demandes.liste.map((d) => d.u.search)).toEqual(['?limit=50&offset=0']);
    expect(demandes.liste[0].entetes.authorization).toBe('Bearer jeton-de-test');
    // Fini : la demande est oubliée, et la liste n'est pas en base.
    expect(await attente(page)).toBeNull();
    expect(await lireMeta(page, 'refuges')).toBeNull();
    // Le nom piégé est du texte : aucune image, rien d'exécuté.
    await expect(page.locator('img')).toHaveCount(0);
    expect(await page.evaluate(() => window.__piege)).toBeUndefined();

    // Trois choix, chacun écrit à son toucher, avec la source Spotify ; le quatrième ne se choisit plus.
    for (const nom of ['Pour souffler', 'Pour marcher', PIEGE]) await choix(page, nom).click();
    await expect.poll(async () => (await lireMeta(page, 'refuges'))?.playlists.length).toBe(3);
    for (const nom of ['Pour souffler', 'Pour marcher', PIEGE]) await expect(choix(page, nom)).toHaveAttribute('aria-pressed', 'true');
    await expect(choix(page, 'Pour dormir')).toHaveAttribute('aria-disabled', 'true');
    // Touchée quand même (Playwright ne touche pas un bouton aria-disabled de lui-même : le click est envoyé au bouton) : rien ne
    // s'écrit.
    await choix(page, 'Pour dormir').dispatchEvent('click');
    await expect(choix(page, 'Pour dormir')).toHaveAttribute('aria-pressed', 'false');
    const trois = [
      { nom: 'Pour souffler', lien: 'https://open.spotify.com/playlist/s1', source: 'spotify' },
      { nom: 'Pour marcher', lien: 'https://open.spotify.com/playlist/s2', source: 'spotify' },
      { nom: PIEGE, lien: 'https://open.spotify.com/playlist/s3', source: 'spotify' },
    ];
    expect(await lireMeta(page, 'refuges')).toEqual({ titres: null, playlists: trois });
    // Un second toucher retire ; la place libérée se remplit à la main, dans la ligne vide revenue.
    await choix(page, PIEGE).click();
    await expect.poll(async () => (await lireMeta(page, 'refuges'))?.playlists.length).toBe(2);
    await expect(choix(page, 'Pour dormir')).not.toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByLabel('Nom de la playlist 2', { exact: true })).toHaveValue('Pour marcher');
    await page.getByLabel('Lien de la playlist 3', { exact: true }).fill('https://open.spotify.com/playlist/m1');
    await page.getByLabel('Nom de la playlist 3', { exact: true }).fill('Collée à la main');
    await page.getByLabel('Nom de la playlist 3', { exact: true }).blur();
    const avecCollee = [trois[0], trois[1], { nom: 'Collée à la main', lien: 'https://open.spotify.com/playlist/m1', source: null }];
    await expect.poll(async () => (await lireMeta(page, 'refuges'))?.playlists).toEqual(avecCollee);
    // Mes refuges : les lignes d'écoute, « Spotify » sous celles qui viennent de lui.
    await expect(lignes(ecran(page))).toHaveCount(3);
    expect(await hrefs(lignes(ecran(page)))).toEqual(avecCollee.map((p) => p.lien));
    expect(await lignes(ecran(page)).evaluateAll((l) => l.map((a) => (a.querySelector('.ligne-sous') || {}).textContent || null))).toEqual(['Spotify', 'Spotify', null]);
    // Moment difficile aussi, sans requête.
    const avant = demandes.toutes.length;
    let v = await ouvrirMoment(page);
    expect(await hrefs(lignes(v))).toEqual(avecCollee.map((p) => p.lien));
    expect(await lignes(v).evaluateAll((l) => l.map((a) => (a.querySelector('.ligne-sous') || {}).textContent || null))).toEqual(['Spotify', 'Spotify', null]);

    // De retour dans Mes refuges, la liste lue n'est plus là (elle n'était qu'en mémoire de l'écran).
    await ouvrirRefuges(page);
    await expect(groupeSpotify(page)).toHaveCount(0);
    // « Retirer ces playlists » : les lignes de Spotify partent, la playlist collée reste ; « Annuler » les remet.
    await bouton(page, 'Retirer ces playlists').click();
    await expect.poll(async () => (await lireMeta(page, 'refuges'))?.playlists).toEqual([avecCollee[2]]);
    await expect(lignes(ecran(page))).toHaveCount(1);
    await expect(bouton(page, 'Retirer ces playlists')).toHaveCount(0);
    await expect(page.locator('.toast')).toContainText('Playlists de Spotify retirées');
    await page.locator('.toast').getByRole('button', { name: 'Annuler', exact: true }).click();
    await expect.poll(async () => (await lireMeta(page, 'refuges'))?.playlists).toEqual(avecCollee);
    await expect(lignes(ecran(page))).toHaveCount(3);
    await bouton(page, 'Retirer ces playlists').click();
    await expect.poll(async () => (await lireMeta(page, 'refuges'))?.playlists).toEqual([avecCollee[2]]);
    v = await ouvrirMoment(page);
    expect(await hrefs(lignes(v))).toEqual(['https://open.spotify.com/playlist/m1']);
    await expect(v).not.toContainText('Spotify');
    expect(demandes.toutes.length, 'aucune requête après le retour').toBe(avant);

    // Aucun jeton : ni dans le localStorage, ni dans la méta, ni dans la sauvegarde ; la demande est partie.
    const garde = await toutCeQuiEstGarde(page);
    expect(garde).not.toContain('jeton-de-test');
    expect(garde).not.toContain(CLE);
    expect(garde).not.toContain(corps.code_verifier);
    await aller(page, '#/reglages');
    await bouton(page, 'Exporter').click();
    await expect(page.getByText('Sauvegarde faite.')).toBeVisible();
    const [f] = await fichiersPartages(page);
    const fichier = Buffer.from(f.octets).toString('utf8');
    expect(fichier).toContain('Collée à la main');
    expect(fichier).not.toContain('jeton-de-test');
    expect(fichier).not.toContain(CLE);
  });

  test('le code collé dans Mes refuges, avec la demande restée dans l\'app, finit la connexion', async ({ page }) => {
    await demarrer(page);
    const demandes = await simulerSpotify(page);
    await poserAttente(page);
    await ouvrirRefuges(page);
    await expect(champCode(page)).toBeVisible();
    // Vide, rien ne part.
    await bouton(page, 'Finir la connexion').click();
    await champCode(page).fill('  code-colle  ');
    await bouton(page, 'Finir la connexion').click();
    await expect(groupeSpotify(page).getByRole('button')).toHaveCount(4);
    expect(demandes.jeton).toHaveLength(1);
    expect(Object.fromEntries(new URLSearchParams(demandes.jeton[0].corps))).toMatchObject({ code: 'code-colle', code_verifier: VERIFIER, client_id: FACTICE });
    // Fini : la demande et le champ partent.
    await expect(champCode(page)).toHaveCount(0);
    expect(await attente(page)).toBeNull();
    expect(await toutCeQuiEstGarde(page)).not.toContain('jeton-de-test');
    // Une playlist choisie pendant le toast de « Retirer ces playlists » le ferme : « Annuler » ne la retirerait pas.
    await choix(page, 'Pour souffler').click();
    await expect.poll(async () => (await lireMeta(page, 'refuges'))?.playlists.length).toBe(1);
    await bouton(page, 'Retirer ces playlists').click();
    await expect.poll(() => lireMeta(page, 'refuges')).toBeNull();
    await expect(page.locator('.toast').getByRole('button', { name: 'Annuler', exact: true })).toBeVisible();
    await choix(page, 'Pour marcher').click();
    expect(await page.evaluate(() => Boolean(window.__carnet.etatApp.lire().toast))).toBe(false);
    await expect.poll(() => lireMeta(page, 'refuges')).toEqual({ titres: null, playlists: [{ nom: 'Pour marcher', lien: 'https://open.spotify.com/playlist/s2', source: 'spotify' }] });
  });

  test('point de vigilance 5, avec réseau : 401 et 403, réseau coupé, réponse d\'une autre forme ; aucun plantage, aucun jeton, les refuges intacts', async ({ page }) => {
    await demarrer(page);
    const notes = { titres: 'Pluie lente', playlists: [{ nom: 'Collée', lien: 'https://open.spotify.com/playlist/m1', source: null }] };
    await ecrireMeta(page, 'refuges', notes);
    const cas = [
      [{ jeton: { status: 401, corps: { error: 'invalid_client' } } }, REFUS, false],
      [{ liste: { status: 403, corps: { error: { status: 403, message: 'Forbidden' } } } }, REFUS, false],
      [{ jeton: 'coupe' }, N_ABOUTI, true],
      [{ liste: 'coupe' }, N_ABOUTI, true],
      [{ jeton: { status: 400, corps: { error: 'invalid_grant' } } }, N_ABOUTI, false],
      [{ jeton: { status: 200, corps: { token_type: 'Bearer' } } }, N_ABOUTI, false],
      [{ liste: { status: 200, corps: { items: 'pas une liste' } } }, null, false],
    ];
    for (const [options, message, garde] of cas) {
      await page.unrouteAll({ behavior: 'wait' });
      await servirConstante(page, FACTICE);
      await page.route((u) => u.hostname !== '127.0.0.1', (route) => route.abort('blockedbyclient'));
      await simulerSpotify(page, options);
      await poserAttente(page);
      await revenirDeSpotify(page, 'code=code-de-test&state=etat-de-test');
      const ou = JSON.stringify(options);
      expect(await adresse(page), ou).toBe('/#/refuges');
      if (message) {
        await expect(statut(page), ou).toHaveText(message);
        await expect(groupeSpotify(page)).toHaveCount(0);
      } else {
        await expect(ecran(page).getByText('Aucune playlist dans ce compte.'), ou).toBeVisible();
        await expect(statut(page)).toHaveCount(0);
      }
      // Seul le réseau coupé garde la demande, et le code du retour avec elle, déjà dans le champ : il se relance d'un toucher.
      expect(Boolean(await attente(page)), ou).toBe(garde);
      await expect(champCode(page)).toHaveCount(garde ? 1 : 0);
      if (garde) await expect(champCode(page), ou).toHaveValue('code-de-test');
      expect(await lireMeta(page, 'refuges'), ou).toEqual(notes);
      expect(await toutCeQuiEstGarde(page), ou).not.toContain('jeton-de-test');
      if (options.jeton === 'coupe') {
        // Le réseau revenu : « Finir la connexion » relance le même code, avec la même demande, et la liste s'affiche.
        await page.unrouteAll({ behavior: 'wait' });
        await page.route((u) => u.hostname !== '127.0.0.1', (route) => route.abort('blockedbyclient'));
        const demandes = await simulerSpotify(page);
        await bouton(page, 'Finir la connexion').click();
        await expect(groupeSpotify(page).getByRole('button'), ou).toHaveCount(4);
        expect(demandes.jeton).toHaveLength(1);
        expect(Object.fromEntries(new URLSearchParams(demandes.jeton[0].corps))).toMatchObject({ code: 'code-de-test', code_verifier: VERIFIER });
        await expect(statut(page)).toHaveCount(0);
        await expect(champCode(page)).toHaveCount(0);
        expect(await attente(page)).toBeNull();
        expect(await lireMeta(page, 'refuges'), ou).toEqual(notes);
        expect(await toutCeQuiEstGarde(page), ou).not.toContain('jeton-de-test');
      }
      await page.evaluate((c) => localStorage.removeItem(c), CLE);
    }
  });

  // Le contrôle de ces écrans (spec §14), en clair et en sombre, avec « Réduire les animations » allumé : contraste AA, cibles de
  // 44 pt, aucun mot interdit, rien qui bouge.
  for (const schema of ['light', 'dark']) {
    test(`le contrôle ${schema === 'light' ? 'en clair' : 'en sombre'} : le bouton et son texte, le champ du code, la liste à cocher, le message d'échec, la page du code`, async ({ page }) => {
      test.setTimeout(90000);
      await page.emulateMedia({ colorScheme: schema, reducedMotion: 'reduce' });
      await ecouterMouvements(page);
      await demarrer(page);
      await simulerSpotify(page, { liste: { status: 200, corps: { ...PLAYLISTS, items: [...PLAYLISTS.items, { name: 'Un nom de playlist assez long pour passer sur deux lignes', external_urls: { spotify: 'https://open.spotify.com/playlist/s5' } }] } } });
      await ecrireMeta(page, 'refuges', { playlists: [{ nom: 'Collée', lien: 'https://open.spotify.com/playlist/m1', source: null }] });
      const fautes = {};
      const controler = async (nom, attendu) => {
        await expect(page.locator(attendu).first(), nom).toBeVisible();
        await stabiliser(page);
        await mouvements(page); // Ce qu'a lancé l'arrivée sur l'écran, avant l'état voulu.
        const f = [
          ...(await contrastesFaibles(page)).map((x) => `contraste : ${x}`),
          ...(await ciblesPetites(page)).map((x) => `cible : ${x}`),
          ...(await motsInterdits(page)).map((x) => `mot interdit : ${x}`),
        ];
        if (f.length) fautes[nom] = f;
      };
      const bouge = async (nom) => {
        await stabiliser(page);
        const m = await mouvements(page);
        if (m.length) fautes[`${nom}, mouvement`] = m;
      };
      // Le bouton et son texte, et le champ du code (une demande attend).
      await poserAttente(page);
      await ouvrirRefuges(page);
      await controler('Mes refuges, le bouton et le champ du code', '#code-spotify');
      // La liste à cocher : deux choisies, la troisième place prise, les autres hors d'atteinte.
      await champCode(page).fill('code-colle');
      await bouton(page, 'Finir la connexion').click();
      await expect(groupeSpotify(page).getByRole('button')).toHaveCount(5);
      await mouvements(page);
      await choix(page, 'Pour souffler').click();
      await choix(page, 'Pour marcher').click();
      await expect(choix(page, 'Pour dormir')).toHaveAttribute('aria-disabled', 'true');
      await bouge('La liste à cocher');
      await controler('La liste à cocher', '.liste-spotify .pastille[aria-pressed="true"]');
      // Le message d'échec.
      await page.unrouteAll({ behavior: 'wait' });
      await servirConstante(page, FACTICE);
      await page.route((u) => u.hostname !== '127.0.0.1', (route) => route.abort('blockedbyclient'));
      await simulerSpotify(page, { jeton: { status: 403, corps: {} } });
      await poserAttente(page);
      await revenirDeSpotify(page, 'code=code-de-test&state=etat-de-test');
      await controler('Le message d\'échec', '.compte-spotify [role="status"]');
      // La page du code.
      await page.goto('/?forcer-guide&code=AQBx-code-de-safari-assez-long-pour-passer-sur-plusieurs-lignes-0123456789abcdefghijklmnopqrstuvwxyz&state=x');
      await controler('La page du code', '.valeur-code');
      await bouton(page, 'Copier le code').click();
      await expect(page.locator('main.code-spotify').getByRole('status')).toBeVisible();
      await bouge('La page du code, copié');
      await controler('La page du code, copié', 'main.code-spotify [role="status"]');
      expect(fautes).toEqual({});
    });
  }
});
