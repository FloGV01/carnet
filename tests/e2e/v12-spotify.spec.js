import { createHash } from 'node:crypto';
import { test, expect } from '../aides/gardes.js';
import { viderBase, aller, appPrete } from '../aides/saisie.js';
import { installerPartageFactice, fichiersPartages } from '../aides/partage-stub.js';
import { stabiliser, contrastesFaibles, ciblesPetites, motsInterdits, ecouterMouvements, mouvements } from '../aides/controle.js';

// v12 (6/9) · La connexion à Spotify (spec v12 §6.3 et §6.4 ; v11 : spec §8.3), la seule exception à « zéro réseau », au seul
// toucher sur « Choisir dans mon compte » (l'état vide de Mes refuges, ou ses réglages), « Changer de playlist » ou « Mettre à
// jour la liste » (les réglages). Le retour arrive dans Mes refuges, qui le passe aux réglages :
// - un choix : la liste de ses playlists, en mémoire de l'écran ; un toucher lit d'abord les morceaux de la playlist touchée,
//   avec le même jeton, gardé en mémoire le temps du choix (un seul usage, 10 minutes au plus), puis la note avec eux
//   (`morceaux` : sans eux) ; la liste disparaît, et « Annuler » rend les refuges d'avant ; une coupure n'écrit rien ;
// - une mise à jour : les morceaux de la playlist suivie, sans la liste du compte, puis Mes refuges, où ils s'affichent.
// Aucun jeton gardé. Si le retour arrive dans Safari, la page montre un code à coller dans les réglages.
// Aucune requête ne part pour de bon : la constante de l'app (SPOTIFY_CLIENT_ID) est remplacée dans le fichier servi, par du
// vide ou par une valeur factice, jamais la vraie ; par défaut, la garde réseau reste active (toute requête vers un autre hôte
// fait échouer le test) ; avec `hotesPermis`, les deux hôtes de Spotify répondent par des réponses simulées (page.route), et
// la garde coupe tout ce qui n'en a pas. Aucun lien n'est suivi : les tests lisent `href`, jamais un clic sur un lien spotify:.
// Le dépôt est public : données inventées, sans prénom, identifiants factices de 22 signes.
// Horloge : jeudi 15 octobre 2026, 21:00 (390 × 844).

const FACTICE = 'client-de-test';
const HOTES = ['accounts.spotify.com', 'api.spotify.com'];
const CLE = 'carnet:spotify:attente';
const VERIFIER = 'verifier-de-test-'.padEnd(64, 'x');
const PIEGE = '<img src=x onerror="window.__piege=1">';
// Un identifiant factice de 22 signes, lisible : « sp1 » donne « sp10000000000000000000 ».
const id = (debut) => debut.padEnd(22, '0');
const lienS = (n) => `https://open.spotify.com/playlist/${id(`sp${n}`)}`;
// Une page de réponse de Spotify (forme de 2026 : `items` au lieu de `tracks`), avec ce qui ne doit pas passer : un élément null,
// un lien d'un autre hôte sans identifiant valable, un nom piégé.
const PLAYLISTS = {
  items: [
    { name: 'Pour souffler', id: id('sp1'), external_urls: { spotify: lienS(1) }, items: { href: 'https://api.spotify.com/v1/playlists/x/items', total: 12 } },
    null,
    { name: 'Pour marcher', id: id('sp2'), external_urls: { spotify: lienS(2) } },
    { name: 'Ailleurs', id: 'x', external_urls: { spotify: 'https://autre.test/playlist/x' } },
    { name: PIEGE, id: id('sp3'), external_urls: { spotify: lienS(3) } },
    { name: 'Pour dormir', id: id('sp4'), external_urls: { spotify: lienS(4) } },
  ],
  total: 6, limit: 50, offset: 0, next: null,
};
const NOMS = ['Pour souffler', 'Pour marcher', PIEGE, 'Pour dormir'];
// Une entrée d'une page de morceaux (forme de 2026 : `item`), avec sa pochette, jamais lue ni chargée.
const entree = (n, item = {}) => ({
  added_at: '2026-10-01T10:00:00Z', is_local: false,
  item: { type: 'track', id: id(`mo${n}`), name: `Pluie lente ${n}`, is_local: false, artists: [{ name: 'Les Vagues Douces' }, { name: 'Trio Nuage' }],
    album: { images: [{ url: 'https://i.scdn.co/image/pochette-de-test' }] }, ...item },
});
// Le morceau tel qu'Emozio le garde.
const garde = (n) => ({ id: id(`mo${n}`), titre: `Pluie lente ${n}`, artiste: 'Les Vagues Douces, Trio Nuage' });
const gardes = (debut, fin) => Array.from({ length: fin - debut + 1 }, (_, i) => garde(debut + i));
// La page demandée d'une playlist de `total` morceaux.
const pageMorceaux = (total, offset) => ({
  items: Array.from({ length: Math.max(0, Math.min(50, total - offset)) }, (_, i) => entree(offset + i + 1)), total, limit: 50, offset, next: null,
});
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

// Les deux hôtes de Spotify, simulés : la page d'autorisation (une page vide), le jeton, la liste, les morceaux d'une playlist.
// Chaque demande est notée. `jeton` et `liste` : { status, corps } ou 'coupe' (le réseau coupé) ; `morceaux` : de même, ou une
// fonction (identifiant, offset) qui les rend. `regler` change les réponses en cours de test (le réseau qui revient).
async function simulerSpotify(page, options = {}) {
  const o = {
    jeton: { status: 200, corps: { access_token: 'jeton-de-test', token_type: 'Bearer', expires_in: 3600 } },
    liste: { status: 200, corps: PLAYLISTS },
    morceaux: (_, offset) => ({ status: 200, corps: pageMorceaux(62, offset) }),
    ...options,
  };
  const demandes = { autoriser: [], jeton: [], liste: [], morceaux: [], toutes: [], regler: (x) => Object.assign(o, x) };
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
      return repondre(route, o.jeton);
    }
    if (u.hostname === 'api.spotify.com' && u.pathname === '/v1/me/playlists') {
      demandes.liste.push({ u, entetes: await req.allHeaders() });
      return repondre(route, o.liste);
    }
    const m = u.hostname === 'api.spotify.com' && /^\/v1\/playlists\/([A-Za-z0-9]{22})\/items$/.exec(u.pathname);
    if (m) {
      demandes.morceaux.push({ u, playlist: m[1], entetes: await req.allHeaders() });
      return repondre(route, typeof o.morceaux === 'function' ? o.morceaux(m[1], Number(u.searchParams.get('offset'))) : o.morceaux);
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
const reglages = (page) => page.locator('main.refuges-reglages');
const bouton = (page, nom) => page.getByRole('button', { name: nom, exact: true });
const choisirDansMonCompte = (page) => bouton(page, 'Choisir dans mon compte');
const champCode = (page) => page.getByLabel('Code de Spotify', { exact: true });
const groupeSpotify = (page) => page.getByRole('group', { name: 'Spotify', exact: true });
const choix = (page, nom) => groupeSpotify(page).getByRole('button', { name: nom, exact: true });
const lignes = (zone) => zone.locator('a.lien-refuge');
const liensMorceaux = (page) => ecran(page).locator('ul.liste-morceaux a');
const hrefs = (loc) => loc.evaluateAll((l) => l.map((a) => a.getAttribute('href')));
const lireMeta = (page, cle) => page.evaluate((c) => window.__carnet.repo.meta.lire(c), cle);
const ecrireMeta = (page, cle, v) => page.evaluate(([c, x]) => window.__carnet.repo.meta.ecrire(c, x), [cle, v]);
const adresse = (page) => page.evaluate(() => `${location.pathname}${location.search}${location.hash}`);
const attente = (page) => page.evaluate((c) => localStorage.getItem(c), CLE);
// Une demande en attente, comme ouvrirConnexion la note : un choix, ou la mise à jour d'une playlist (`playlist`).
const poserAttente = (page, state = 'etat-de-test', plus = {}) => page.evaluate(([c, v, s, p]) => localStorage.setItem(c, JSON.stringify({ verifier: v, state: s, creeLe: Date.now(), ...p })), [CLE, VERIFIER, state, plus]);
const statut = (page) => reglages(page).getByRole('status');
const toast = (page) => page.locator('.toast');
const annuler = (page) => toast(page).getByRole('button', { name: 'Annuler', exact: true });
const N_ABOUTI = 'La connexion n\'a pas abouti. Ta liste reste.';
const REFUS = 'Spotify refuse cette connexion. Ta liste reste.';
const PAS_A_TOI = 'Spotify ne donne pas les morceaux de cette playlist : seule une playlist à toi les donne. Elle reste notée. Dans Spotify, tu peux la copier dans une playlist à toi.';
const EXPIREE = (b) => `La connexion a expiré : touche « ${b} » de nouveau.`;
// Tout ce qu'Emozio garde : le localStorage et la méta entière (lue dans la base).
const toutCeQuiEstGarde = (page) => page.evaluate(async () => {
  const base = await new Promise((ok, ko) => { const r = indexedDB.open('carnet'); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
  const meta = await new Promise((ok, ko) => { const r = base.transaction('meta').objectStore('meta').getAll(); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
  base.close();
  return JSON.stringify({ local: { ...localStorage }, meta });
});

// Mes refuges par son entrée de Bien-être, lu (la liste, ou l'état vide) ; puis ses réglages, par « Modifier ».
const ouvrirRefuges = async (page) => {
  await aller(page, '#/bien-etre');
  await page.getByRole('list', { name: 'Entrées' }).getByRole('link', { name: 'Mes refuges' }).click();
  await expect(ecran(page).locator('.lignes-playlists, .refuges-vide')).toHaveCount(1);
};
const ouvrirReglages = async (page) => {
  await ouvrirRefuges(page);
  await ecran(page).getByRole('link', { name: 'Modifier', exact: true }).click();
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
// Le retour de Spotify dans l'app : la page d'autorisation est quittée pour l'adresse d'Emozio, avec le code.
const revenirDeSpotify = async (page, params) => {
  await page.goto(`/?${params}`);
  await appPrete(page);
};
// Une connexion « choisir » finie par le code collé (la demande posée à la main) : la liste du compte s'affiche.
const listeDuCompte = async (page, n = 4) => {
  await poserAttente(page);
  await ouvrirReglages(page);
  await champCode(page).fill('code-colle');
  await bouton(page, 'Finir la connexion').click();
  await expect(groupeSpotify(page).getByRole('button')).toHaveCount(n);
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

test('constante vide : ni bouton ni champ de code, ni dans Mes refuges vide ni dans ses réglages, même avec une demande en attente ; un retour de Spotify n\'est pas lu', async ({ page }) => {
  await demarrer(page, '');
  await poserAttente(page);
  await ouvrirRefuges(page);
  await expect(ecran(page).locator('.refuges-vide')).toBeVisible();
  await expect(choisirDansMonCompte(page)).toHaveCount(0);
  await expect(ecran(page).getByRole('link', { name: 'Coller un lien', exact: true })).toBeVisible();
  await ecrireMeta(page, 'refuges', { playlists: [{ nom: 'Pour souffler', lien: lienS(1), source: 'spotify' }] });
  await ouvrirReglages(page);
  for (const nom of ['Choisir dans mon compte', 'Changer de playlist', 'Mettre à jour la liste']) await expect(bouton(page, nom)).toHaveCount(0);
  await expect(champCode(page)).toHaveCount(0);
  await expect(reglages(page)).not.toContainText('Emozio ne garde pas la connexion');
  // Les liens déjà notés restent, et se retirent toujours.
  await expect(bouton(page, 'Retirer ces playlists')).toBeVisible();
  await revenirDeSpotify(page, 'code=faux&state=etat-de-test');
  expect(await page.evaluate(() => location.hash)).toBe('#/aujourdhui');
  await expect(page.locator('main.aujourdhui')).toBeVisible();
  // La garde (gardes.js) : aucune requête vers un autre hôte.
});

test('constante remplie : Aujourd\'hui, Moment difficile, Bien-être, Mes refuges et ses réglages ouverts sans toucher un bouton ne font aucune requête', async ({ page }) => {
  const demandes = [];
  page.on('request', (r) => demandes.push(r.url()));
  await demarrer(page);
  await ecrireMeta(page, 'monPlan', { quandCaMonte: 'je sors marcher' });
  await ouvrirRefuges(page);
  await expect(choisirDansMonCompte(page)).toBeVisible();
  await ouvrirReglages(page);
  await expect(choisirDansMonCompte(page)).toBeVisible();
  await expect(choisirDansMonCompte(page)).toHaveClass(/btn-plein/);
  await expect(bouton(page, 'Mettre à jour la liste')).toHaveCount(0);
  await ecrireMeta(page, 'refuges', { titres: 'Pluie lente', playlists: [{ nom: 'Pour souffler', lien: lienS(1), source: 'spotify', morceaux: gardes(1, 3) }] });
  await page.reload();
  await appPrete(page);
  await expect(page.locator('main.aujourdhui')).toBeVisible();
  const v = await ouvrirMoment(page);
  await expect(lignes(v)).toHaveCount(1);
  await aller(page, '#/bien-etre');
  await expect(page.getByRole('list', { name: 'Entrées' })).toBeVisible();
  await ouvrirRefuges(page);
  await expect(liensMorceaux(page)).toHaveCount(3);
  await ouvrirReglages(page);
  // Une playlist suivie : « Mettre à jour la liste », en aplat, et « Changer de playlist », neutre ; la note, pour les deux.
  await expect(reglages(page).locator('.compte-spotify > button')).toHaveText(['Mettre à jour la liste', 'Changer de playlist', 'Retirer ces playlists']);
  await expect(bouton(page, 'Mettre à jour la liste')).toHaveClass(/btn-plein/);
  await expect(bouton(page, 'Changer de playlist')).not.toHaveClass(/btn-plein/);
  await expect(reglages(page).locator('#note-compte-spotify')).toHaveText('Une seule lecture : Emozio ne garde pas la connexion.');
  for (const nom of ['Mettre à jour la liste', 'Changer de playlist']) await expect(bouton(page, nom)).toHaveAttribute('aria-describedby', 'note-compte-spotify');
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
    await expect(page.locator('main.code-spotify')).toContainText('Copie ce code, reviens dans Emozio, puis colle-le dans Mes refuges.');
    await expect(page.locator('.valeur-code')).toHaveText('code-de-safari');
    await expect(page.getByRole('heading', { name: 'Installer Emozio' })).toHaveCount(0);
    expect(await adresse(page)).toBe('/?forcer-guide#/aujourdhui');
    // La connexion ne se finit jamais ici : la demande, s'il y en a une, reste.
    expect(Boolean(await attente(page))).toBe(avecAttente);
    await bouton(page, 'Copier le code').click();
    await expect(page.locator('main.code-spotify').getByRole('status')).toHaveText(/^(Copié\.|La copie n'a pas marché : sélectionne le code\.)$/);
  }
  // Sans code, le guide, comme avant.
  await page.goto('/?forcer-guide');
  await expect(page.getByRole('heading', { name: 'Installer Emozio' })).toBeVisible();
});

test('point de vigilance 5, sans réseau : un state qui ne correspond pas, un code sans demande, un refus de Spotify ; rien ne part, les refuges restent', async ({ page }) => {
  await demarrer(page);
  const notes = { titres: 'Pluie lente', playlists: [{ nom: 'Collée', lien: `https://open.spotify.com/playlist/${id('m1')}`, source: null, morceaux: gardes(1, 2) }] };
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
  // Un refus sur la page de Spotify (?error=access_denied), pour un choix ou une mise à jour : Mes refuges passe le retour à ses
  // réglages, qui disent l'échec ; la demande est oubliée.
  for (const plus of [{}, { but: 'maj', playlist: id('m1') }]) {
    await poserAttente(page, 'etat-de-test', plus);
    await revenirDeSpotify(page, 'error=access_denied&state=etat-de-test');
    await expect(statut(page)).toHaveText(N_ABOUTI);
    expect(await adresse(page)).toBe('/#/refuges/reglages');
    expect(await attente(page)).toBeNull();
    await expect(champCode(page)).toHaveCount(0);
    // Le retour n'est pris qu'une fois : Mes refuges, rouvert, reste sur sa liste.
    await page.getByRole('button', { name: 'Retour', exact: true }).click();
    await expect(liensMorceaux(page)).toHaveCount(2);
    expect(await adresse(page)).toBe('/#/refuges');
  }
  // Un refus d'une autre demande : ignoré.
  await poserAttente(page, 'etat-de-test');
  await revenirDeSpotify(page, 'error=access_denied&state=autre');
  expect(await adresse(page)).toBe('/#/aujourdhui');
  expect(await attente(page)).not.toBeNull();
  // Une demande vieille de plus d'une heure : le champ du code n'est plus là, et la clé est retirée.
  await page.evaluate(([c, v]) => localStorage.setItem(c, JSON.stringify({ verifier: v, state: 's', creeLe: Date.now() - 3600001 })), [CLE, VERIFIER]);
  await ouvrirReglages(page);
  await expect(champCode(page)).toHaveCount(0);
  expect(await attente(page)).toBeNull();
  expect(await lireMeta(page, 'refuges')).toEqual(notes);
});

test('« Retirer ces playlists » et son « Annuler » : une playlist collée pendant le toast le ferme et reste ; une liste changée entre-temps n\'est pas remplacée', async ({ page }) => {
  await demarrer(page);
  const collee = { nom: 'Collée', lien: 'https://music.apple.com/fr/playlist/calme/pl.u-abc', source: null };
  const s1 = { nom: 'Pour souffler', lien: lienS(1), source: 'spotify', morceaux: gardes(1, 2) };
  const s2 = { nom: 'Pour marcher', lien: lienS(2), source: 'spotify' };
  const depart = { titres: 'Pluie lente', playlists: [collee, s1, s2] };
  // Lu dans l'état de l'app, sans attendre : le toast se ferme seul au bout de 5 s.
  const toastOuvert = () => page.evaluate(() => Boolean(window.__carnet.etatApp.lire().toast));
  const retirer = async () => {
    await bouton(page, 'Retirer ces playlists').click();
    await expect.poll(async () => (await lireMeta(page, 'refuges'))?.playlists).toEqual([collee]);
    await expect(toast(page)).toContainText('Playlists de Spotify retirées');
    await expect(annuler(page)).toBeVisible();
  };
  await ecrireMeta(page, 'refuges', depart);
  await ouvrirReglages(page);
  // Rien d'autre entre-temps : les playlists de Spotify reviennent à leur place, morceaux compris, les titres n'ont pas bougé.
  await retirer();
  await expect(bouton(page, 'Retirer ces playlists')).toHaveCount(0);
  await annuler(page).click();
  await expect.poll(() => lireMeta(page, 'refuges')).toEqual(depart);
  await expect(page.getByLabel('Nom de la playlist 3', { exact: true })).toHaveValue('Pour marcher');
  // Une playlist collée à la main dans la ligne vide revenue : dès la frappe, le toast se ferme ; la playlist reste.
  await retirer();
  await page.getByLabel('Lien de la playlist 2', { exact: true }).fill(`https://open.spotify.com/playlist/${id('neuve')}`);
  expect(await toastOuvert()).toBe(false);
  await expect(annuler(page)).toHaveCount(0);
  await page.getByLabel('Nom de la playlist 2', { exact: true }).fill('Neuve à la main');
  await page.getByLabel('Nom de la playlist 2', { exact: true }).blur();
  const neuve = { nom: 'Neuve à la main', lien: `https://open.spotify.com/playlist/${id('neuve')}`, source: null };
  await expect.poll(() => lireMeta(page, 'refuges')).toEqual({ titres: 'Pluie lente', playlists: [collee, neuve] });
  // Une liste écrite entre le retrait et « Annuler » (ici, hors de l'écran) : « Annuler » ne la remplace pas.
  await ecrireMeta(page, 'refuges', depart);
  await ouvrirReglages(page);
  await retirer();
  const ailleurs = { titres: 'Pluie lente', playlists: [collee, { nom: 'Écrite ailleurs', lien: lienS(5), source: null }] };
  await ecrireMeta(page, 'refuges', ailleurs);
  await annuler(page).click();
  // L'écran relit la liste à cette écriture : rien de Spotify à retirer.
  await expect(bouton(page, 'Retirer ces playlists')).toHaveCount(0);
  expect(await lireMeta(page, 'refuges')).toEqual(ailleurs);
  await page.getByRole('button', { name: 'Retour', exact: true }).click();
  await expect.poll(() => hrefs(lignes(ecran(page)))).toEqual([`spotify:playlist:${id('sp5')}`, 'music://music.apple.com/fr/playlist/calme/pl.u-abc']);
});

// ---------- Avec les deux hôtes de Spotify, simulés ----------

test.describe('avec Spotify simulé', () => {
  test.use({ hotesPermis: HOTES });

  test('choisir dans son compte depuis Mes refuges vide : la page de Spotify, le retour dans les réglages, la liste ; un toucher lit les morceaux avec le même jeton, puis note la playlist avec eux ; la liste disparaît ; aucun jeton gardé', async ({ page }) => {
    await installerPartageFactice(page);
    await demarrer(page);
    const demandes = await simulerSpotify(page);
    await ecrireMeta(page, 'monPlan', { quandCaMonte: 'je sors marcher' });
    await ouvrirRefuges(page);
    // Le toucher, dans l'état vide : la demande notée, puis la page de Spotify, avec les seuls droits de lire ses playlists, les
    // siennes et celles où il collabore.
    await choisirDansMonCompte(page).click();
    await expect.poll(() => demandes.autoriser.length).toBe(1);
    const autoriser = Object.fromEntries(demandes.autoriser[0].searchParams);
    expect(Object.keys(autoriser).sort()).toEqual(['client_id', 'code_challenge', 'code_challenge_method', 'redirect_uri', 'response_type', 'scope', 'state']);
    expect(autoriser).toMatchObject({ client_id: FACTICE, response_type: 'code', redirect_uri: 'http://127.0.0.1:5174/', scope: 'playlist-read-private playlist-read-collaborative', code_challenge_method: 'S256' });
    expect(autoriser.state).toMatch(/^[A-Za-z0-9_-]{32}$/);
    await expect(page).toHaveTitle('Spotify simulé');

    // Le retour : l'adresse est propre ; Mes refuges passe aux réglages, qui lisent la liste.
    await revenirDeSpotify(page, `code=code-de-test&state=${autoriser.state}`);
    await expect(groupeSpotify(page).getByRole('button')).toHaveCount(4);
    expect(await adresse(page)).toBe('/#/refuges/reglages');
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
    // La liste : une page, l'offset calculé, le jeton dans l'en-tête seulement ; aucun morceau lu avant un toucher.
    expect(demandes.liste.map((d) => d.u.search)).toEqual(['?limit=50&offset=0']);
    expect(demandes.liste[0].entetes.authorization).toBe('Bearer jeton-de-test');
    expect(demandes.morceaux).toHaveLength(0);
    // Fini : la demande est oubliée, et ni la liste ni le jeton ne sont gardés.
    expect(await attente(page)).toBeNull();
    expect(await lireMeta(page, 'refuges')).toBeNull();
    expect(await toutCeQuiEstGarde(page)).not.toContain('jeton-de-test');
    // Le nom piégé est du texte : aucune image, rien d'exécuté.
    await expect(page.locator('img')).toHaveCount(0);
    expect(await page.evaluate(() => window.__piege)).toBeUndefined();

    // Un toucher : les morceaux d'abord (deux pages, 50 puis 12, avec le même jeton), puis la playlist notée avec eux.
    await choix(page, 'Pour marcher').click();
    await expect(groupeSpotify(page)).toHaveCount(0);
    expect(demandes.morceaux.map((d) => `${d.playlist} ${d.u.search}`)).toEqual([`${id('sp2')} ?limit=50&offset=0`, `${id('sp2')} ?limit=50&offset=50`]);
    for (const d of demandes.morceaux) expect(d.entetes.authorization).toBe('Bearer jeton-de-test');
    expect(demandes.jeton).toHaveLength(1);
    const choisie = { nom: 'Pour marcher', lien: lienS(2), source: 'spotify', morceaux: gardes(1, 62) };
    await expect.poll(() => lireMeta(page, 'refuges')).toEqual({ titres: null, playlists: [choisie] });
    await expect(toast(page)).toContainText('Playlist choisie');
    await expect(annuler(page)).toBeVisible();
    await expect(statut(page)).toHaveCount(0);
    // Une playlist est suivie : les boutons changent ; la ligne notée est dans les champs.
    await expect(bouton(page, 'Changer de playlist')).toBeVisible();
    await expect(bouton(page, 'Mettre à jour la liste')).toBeVisible();
    await expect(page.getByLabel('Nom de la playlist 1', { exact: true })).toHaveValue('Pour marcher');
    // Mes refuges : la carte en lien direct, « Spotify » nommé, les 62 morceaux, chacun spotify:track:<ID> ; aucune pochette.
    const avant = demandes.toutes.length;
    await page.getByRole('button', { name: 'Retour', exact: true }).click();
    await expect(liensMorceaux(page)).toHaveCount(62);
    expect(await hrefs(lignes(ecran(page)))).toEqual([`spotify:playlist:${id('sp2')}`]);
    await expect(lignes(ecran(page))).toHaveAccessibleName('Pour marcher Spotify');
    expect(await hrefs(liensMorceaux(page))).toEqual(gardes(1, 62).map((m) => `spotify:track:${m.id}`));
    await expect(page.locator('img')).toHaveCount(0);
    // Moment difficile aussi, sans requête.
    const v = await ouvrirMoment(page);
    expect(await hrefs(lignes(v))).toEqual([`spotify:playlist:${id('sp2')}`]);
    expect(demandes.toutes.length, 'aucune requête après le choix').toBe(avant);

    // Aucun jeton : ni dans le localStorage, ni dans la méta, ni dans la sauvegarde ; la demande est partie. Les morceaux, eux,
    // vont dans la sauvegarde.
    const tout = await toutCeQuiEstGarde(page);
    expect(tout).not.toContain('jeton-de-test');
    expect(tout).not.toContain(CLE);
    expect(tout).not.toContain(corps.code_verifier);
    await aller(page, '#/reglages');
    await bouton(page, 'Exporter').click();
    await expect(page.getByText('Sauvegarde faite.')).toBeVisible();
    const [f] = await fichiersPartages(page);
    const fichier = Buffer.from(f.octets).toString('utf8');
    expect(JSON.parse(fichier).data.meta.find((m) => m.cle === 'refuges').valeur).toEqual({ titres: null, playlists: [choisie] });
    expect(fichier).not.toContain('jeton-de-test');
    expect(fichier).not.toContain(CLE);
    expect(fichier).not.toContain('scdn');
  });

  test('« Mettre à jour la liste » depuis une ligne collée : une seule autorisation, le jeton puis 2 pages, aucun appel à /me/playlists ; puis Mes refuges, ses morceaux en spotify:track: ; la ligne garde son nom, son lien et sa source', async ({ page }) => {
    await demarrer(page);
    const demandes = await simulerSpotify(page);
    const LIEN = `https://open.spotify.com/playlist/${id('pl1')}?si=partage`;
    const collee = { nom: 'Détente', lien: `https://open.spotify.com/playlist/${id('pl1')}`, source: null };
    const musique = { nom: 'Pour marcher', lien: 'https://music.apple.com/fr/playlist/marcher/pl.u-abc', source: null };
    await ecrireMeta(page, 'refuges', { titres: 'Pluie lente', playlists: [musique, { ...collee, lien: LIEN }] });
    await ouvrirRefuges(page);
    // Sans morceaux encore : la carte, en lien direct, en tête ; pas de liste.
    expect(await hrefs(lignes(ecran(page)))).toEqual([`spotify:playlist:${id('pl1')}`, 'music://music.apple.com/fr/playlist/marcher/pl.u-abc']);
    await expect(liensMorceaux(page)).toHaveCount(0);
    await ecran(page).getByRole('link', { name: 'Modifier', exact: true }).click();
    await bouton(page, 'Mettre à jour la liste').click();
    await expect.poll(() => demandes.autoriser.length).toBe(1);
    const autoriser = Object.fromEntries(demandes.autoriser[0].searchParams);
    expect(autoriser.scope).toBe('playlist-read-private playlist-read-collaborative');
    await expect(page).toHaveTitle('Spotify simulé');

    // Le retour : les réglages finissent la connexion, notent les morceaux, puis Mes refuges les montre.
    await revenirDeSpotify(page, `code=code-de-test&state=${autoriser.state}`);
    await expect(liensMorceaux(page)).toHaveCount(62);
    expect(await adresse(page)).toBe('/#/refuges');
    expect(demandes.autoriser).toHaveLength(1);
    expect(demandes.jeton).toHaveLength(1);
    expect(demandes.liste, 'aucun appel à /me/playlists').toHaveLength(0);
    expect(demandes.morceaux.map((d) => `${d.playlist} ${d.u.search}`)).toEqual([`${id('pl1')} ?limit=50&offset=0`, `${id('pl1')} ?limit=50&offset=50`]);
    for (const d of demandes.morceaux) expect(d.entetes.authorization).toBe('Bearer jeton-de-test');
    expect(demandes.toutes.filter((x) => !x.startsWith('OPTIONS'))).toEqual(['GET accounts.spotify.com/authorize', 'POST accounts.spotify.com/api/token',
      `GET api.spotify.com/v1/playlists/${id('pl1')}/items`, `GET api.spotify.com/v1/playlists/${id('pl1')}/items`]);
    expect(await hrefs(liensMorceaux(page))).toEqual(gardes(1, 62).map((m) => `spotify:track:${m.id}`));
    await expect(ecran(page).getByRole('list', { name: 'Morceaux de Détente', exact: true })).toBeVisible();
    await expect(ecran(page)).not.toContainText('La suite est dans Spotify.');
    // La ligne collée garde son nom, son lien (le « ?si= » était déjà parti) et sa source ; rien d'autre ne change ; aucun toast.
    expect(await lireMeta(page, 'refuges')).toEqual({ titres: 'Pluie lente', playlists: [musique, { ...collee, morceaux: gardes(1, 62) }] });
    expect(await page.evaluate(() => window.__carnet.etatApp.lire().toast)).toBeNull();
    expect(await attente(page)).toBeNull();
    const tout = await toutCeQuiEstGarde(page);
    expect(tout).not.toContain('jeton-de-test');
    expect(tout).not.toContain(CLE);
    // « Retour » ramène à Bien-être (l'app a redémarré au retour de Spotify).
    await page.getByRole('button', { name: 'Retour', exact: true }).click();
    await expect.poll(() => adresse(page)).toBe('/#/bien-etre');
  });

  test('un choix dont Spotify refuse les morceaux (403, puis 200 sans `items`) : la playlist est notée sans morceaux, avec le message ; « Annuler » rend les refuges d\'avant', async ({ page }) => {
    await demarrer(page);
    const demandes = await simulerSpotify(page);
    const avant = { titres: 'Pluie lente', playlists: [{ nom: 'Ancienne', lien: lienS(9), source: 'spotify', morceaux: gardes(1, 3), suite: true }] };
    for (const morceaux of [{ status: 403, corps: { error: { status: 403, message: 'Forbidden' } } }, { status: 200, corps: { name: 'Pas à moi', total: 30 } }]) {
      await ecrireMeta(page, 'refuges', avant);
      demandes.regler({ morceaux });
      await listeDuCompte(page);
      // La playlist suivie a sa coche dans la liste ; une autre se touche.
      await expect(groupeSpotify(page).getByRole('button', { pressed: true })).toHaveCount(0);
      await choix(page, 'Pour souffler').click();
      await expect(statut(page)).toHaveText(PAS_A_TOI);
      await expect(groupeSpotify(page)).toHaveCount(0);
      // Le choix est unique : la playlist touchée remplace la suivie, sans morceaux (les anciens étaient ceux de l'autre).
      await expect.poll(() => lireMeta(page, 'refuges')).toEqual({ titres: 'Pluie lente', playlists: [{ nom: 'Pour souffler', lien: lienS(1), source: 'spotify' }] });
      await annuler(page).click();
      await expect.poll(() => lireMeta(page, 'refuges')).toEqual(avant);
      await expect(page.getByLabel('Nom de la playlist 1', { exact: true })).toHaveValue('Ancienne');
      expect(await toutCeQuiEstGarde(page)).not.toContain('jeton-de-test');
    }
  });

  test('un choix coupé par le réseau n\'écrit rien et garde la liste ; retouché, réseau revenu, il lit les morceaux avec le même jeton ; « Annuler » rend les refuges d\'avant', async ({ page }) => {
    await demarrer(page);
    const demandes = await simulerSpotify(page, { morceaux: 'coupe' });
    const avant = { titres: 'Pluie lente', playlists: [{ nom: 'Collée', lien: `spotify:playlist:${id('sp1')}`, source: null, morceaux: gardes(1, 2) }] };
    await ecrireMeta(page, 'refuges', avant);
    await listeDuCompte(page);
    // La ligne collée est la playlist suivie : la même, dans la liste, a sa coche.
    await expect(groupeSpotify(page).getByRole('button', { pressed: true })).toHaveText(['Pour souffler']);
    await choix(page, 'Pour dormir').click();
    await expect(statut(page)).toHaveText(N_ABOUTI);
    await expect(groupeSpotify(page).getByRole('button')).toHaveCount(4);
    expect(await lireMeta(page, 'refuges')).toEqual(avant);
    await expect(toast(page)).toHaveCount(0);
    expect(demandes.morceaux).toHaveLength(1);
    // Le réseau revenu : le même toucher lit les morceaux (la fermeture n'était pas consommée), sans nouvelle connexion. Doublé
    // d'un second toucher avant que l'écran ne se redessine, il ne lit qu'une fois, et rien ne dit « expiré ».
    demandes.regler({ morceaux: (_, offset) => ({ status: 200, corps: pageMorceaux(12, offset) }) });
    await choix(page, 'Pour dormir').evaluate((b) => { b.click(); b.click(); });
    await expect(groupeSpotify(page)).toHaveCount(0);
    const apres = { titres: 'Pluie lente', playlists: [{ nom: 'Pour dormir', lien: lienS(4), source: 'spotify', morceaux: gardes(1, 12) }] };
    await expect.poll(() => lireMeta(page, 'refuges')).toEqual(apres);
    await expect(toast(page)).toContainText('Playlist choisie');
    await expect(statut(page)).toHaveCount(0);
    expect(demandes.jeton).toHaveLength(1);
    expect(demandes.morceaux.map((d) => `${d.playlist} ${d.entetes.authorization}`)).toEqual([`${id('sp4')} Bearer jeton-de-test`, `${id('sp4')} Bearer jeton-de-test`]);
    await annuler(page).click();
    await expect.poll(() => lireMeta(page, 'refuges')).toEqual(avant);
    // Annulé, rien ne se relit : la liste est partie, et aucune demande ne suit.
    await expect(groupeSpotify(page)).toHaveCount(0);
    expect(demandes.morceaux).toHaveLength(2);
  });

  test('une connexion expirée (plus de 10 minutes) : un toucher ne demande rien et n\'écrit rien ; la liste part et le message nomme le bouton à toucher', async ({ page }) => {
    await demarrer(page);
    const demandes = await simulerSpotify(page);
    // Sans playlist suivie : « Choisir dans mon compte », le texte de la spec ; avec, le bouton s'appelle « Changer de playlist ».
    for (const [refuges, bouton] of [[null, 'Choisir dans mon compte'], [{ playlists: [{ nom: 'Collée', lien: lienS(1), source: null }] }, 'Changer de playlist']]) {
      await ecrireMeta(page, 'refuges', refuges);
      await listeDuCompte(page);
      const n = demandes.morceaux.length;
      await page.clock.fastForward('10:01');
      await choix(page, 'Pour marcher').click();
      await expect(statut(page)).toHaveText(EXPIREE(bouton));
      await expect(groupeSpotify(page)).toHaveCount(0);
      await expect(page.getByRole('button', { name: bouton, exact: true })).toBeVisible();
      expect(demandes.morceaux).toHaveLength(n);
      expect(await lireMeta(page, 'refuges')).toEqual(refuges);
    }
  });

  test('« Mettre à jour la liste » refusé (403, puis 200 sans `items`) : le message ; la playlist et ses anciens morceaux restent', async ({ page }) => {
    await demarrer(page);
    const demandes = await simulerSpotify(page);
    const notes = { titres: 'Pluie lente', playlists: [{ nom: 'Détente', lien: lienS(1), source: 'spotify', morceaux: gardes(1, 3), suite: true }] };
    await ecrireMeta(page, 'refuges', notes);
    for (const morceaux of [{ status: 403, corps: { error: { status: 403, message: 'Forbidden' } } }, { status: 200, corps: { name: 'Pas à moi' } }]) {
      demandes.regler({ morceaux });
      await poserAttente(page, 'etat-de-test', { but: 'maj', playlist: id('sp1') });
      await revenirDeSpotify(page, 'code=code-de-test&state=etat-de-test');
      await expect(statut(page)).toHaveText(PAS_A_TOI);
      expect(await adresse(page)).toBe('/#/refuges/reglages');
      expect(await lireMeta(page, 'refuges')).toEqual(notes);
      expect(await attente(page)).toBeNull();
      await expect(champCode(page)).toHaveCount(0);
      expect(demandes.liste).toHaveLength(0);
    }
    await page.getByRole('button', { name: 'Retour', exact: true }).click();
    await expect(liensMorceaux(page)).toHaveCount(3);
    await expect(ecran(page)).toContainText('La suite est dans Spotify.');
  });

  test('« Mettre à jour la liste » d\'une playlist de 300 morceaux : 4 pages, 200 gardés, « La suite est dans Spotify. » ; une page piégée : un titre en HTML reste du texte, fichier local, épisode et entrées vides écartés', async ({ page }) => {
    await demarrer(page);
    const demandes = await simulerSpotify(page, { morceaux: (_, offset) => ({ status: 200, corps: pageMorceaux(300, offset) }) });
    await ecrireMeta(page, 'refuges', { playlists: [{ nom: 'Détente', lien: lienS(1), source: 'spotify' }] });
    await poserAttente(page, 'etat-de-test', { but: 'maj', playlist: id('sp1') });
    await revenirDeSpotify(page, 'code=code-de-test&state=etat-de-test');
    await expect(liensMorceaux(page)).toHaveCount(200);
    expect(demandes.morceaux.map((d) => d.u.search)).toEqual([0, 50, 100, 150].map((o) => `?limit=50&offset=${o}`));
    expect(await hrefs(liensMorceaux(page))).toEqual(gardes(1, 200).map((m) => `spotify:track:${m.id}`));
    await expect(ecran(page).locator('.note-refuges').last()).toHaveText('La suite est dans Spotify.');
    expect(await lireMeta(page, 'refuges')).toEqual({ titres: null, playlists: [{ nom: 'Détente', lien: lienS(1), source: 'spotify', morceaux: gardes(1, 200), suite: true }] });

    // Une page piégée : un titre et un artiste en HTML, un fichier local, un épisode, un morceau retiré (null), une entrée vide.
    demandes.regler({ morceaux: { status: 200, corps: { total: 6, items: [
      entree(1, { name: PIEGE, artists: [{ name: PIEGE }] }),
      { is_local: true, item: { type: 'track', id: null, name: 'Fichier local', is_local: true } },
      entree(3, { type: 'episode', name: 'Un épisode' }),
      { item: null },
      null,
      entree(6),
    ] } } });
    await poserAttente(page, 'etat-de-test', { but: 'maj', playlist: id('sp1') });
    await revenirDeSpotify(page, 'code=code-de-test&state=etat-de-test');
    await expect(liensMorceaux(page)).toHaveCount(2);
    await expect(ecran(page).locator('.titre-morceau')).toHaveText([PIEGE, 'Pluie lente 6']);
    await expect(ecran(page).locator('.artiste-morceau').first()).toHaveText(PIEGE);
    await expect(ecran(page)).not.toContainText('La suite est dans Spotify.');
    await expect(page.locator('img')).toHaveCount(0);
    expect(await page.evaluate(() => window.__piege)).toBeUndefined();
  });

  test('« Mettre à jour la liste » coupé par le réseau : le message, la demande gardée, le code déjà dans le champ ; relancé, la liste arrive', async ({ page }) => {
    await demarrer(page);
    const notes = { playlists: [{ nom: 'Détente', lien: lienS(1), source: null, morceaux: gardes(1, 2) }] };
    await ecrireMeta(page, 'refuges', notes);
    for (const coupe of [{ jeton: 'coupe' }, { morceaux: 'coupe' }]) {
      await page.unrouteAll({ behavior: 'wait' });
      await servirConstante(page, FACTICE);
      await page.route((u) => u.hostname !== '127.0.0.1', (route) => route.abort('blockedbyclient'));
      const demandes = await simulerSpotify(page, coupe);
      await poserAttente(page, 'etat-de-test', { but: 'maj', playlist: id('sp1') });
      await revenirDeSpotify(page, 'code=code-de-test&state=etat-de-test');
      const ou = JSON.stringify(coupe);
      await expect(statut(page), ou).toHaveText(N_ABOUTI);
      expect(JSON.parse(await attente(page)), ou).toMatchObject({ but: 'maj', playlist: id('sp1') });
      await expect(champCode(page), ou).toHaveValue('code-de-test');
      expect(await lireMeta(page, 'refuges'), ou).toEqual(notes);
      expect(await toutCeQuiEstGarde(page), ou).not.toContain('jeton-de-test');
      // Le réseau revenu : « Finir la connexion » relance le même code, avec la même demande ; Mes refuges montre la liste.
      demandes.regler({ jeton: { status: 200, corps: { access_token: 'jeton-de-test' } }, morceaux: (_, offset) => ({ status: 200, corps: pageMorceaux(5, offset) }) });
      await bouton(page, 'Finir la connexion').click();
      await expect(liensMorceaux(page), ou).toHaveCount(5);
      expect(await adresse(page)).toBe('/#/refuges');
      expect(await attente(page)).toBeNull();
      expect(demandes.liste).toHaveLength(0);
      expect(await lireMeta(page, 'refuges'), ou).toEqual({ playlists: [{ ...notes.playlists[0], morceaux: gardes(1, 5) }], titres: null });
      await ecrireMeta(page, 'refuges', notes);
    }
  });

  test('point de vigilance 5, avec réseau : 401 et 403, réseau coupé, réponse d\'une autre forme, pour la liste du compte ; aucun plantage, aucun jeton, les refuges intacts', async ({ page }) => {
    await demarrer(page);
    const notes = { titres: 'Pluie lente', playlists: [{ nom: 'Collée', lien: lienS(1), source: null }] };
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
    for (const [options, message, gardee] of cas) {
      await page.unrouteAll({ behavior: 'wait' });
      await servirConstante(page, FACTICE);
      await page.route((u) => u.hostname !== '127.0.0.1', (route) => route.abort('blockedbyclient'));
      await simulerSpotify(page, options);
      await poserAttente(page);
      await revenirDeSpotify(page, 'code=code-de-test&state=etat-de-test');
      const ou = JSON.stringify(options);
      if (message) {
        await expect(statut(page), ou).toHaveText(message);
        await expect(groupeSpotify(page)).toHaveCount(0);
      } else {
        await expect(reglages(page).getByText('Aucune playlist dans ce compte.'), ou).toBeVisible();
        await expect(statut(page)).toHaveCount(0);
      }
      expect(await adresse(page), ou).toBe('/#/refuges/reglages');
      // Seul le réseau coupé garde la demande, et le code du retour avec elle, déjà dans le champ : il se relance d'un toucher.
      expect(Boolean(await attente(page)), ou).toBe(gardee);
      await expect(champCode(page)).toHaveCount(gardee ? 1 : 0);
      if (gardee) await expect(champCode(page), ou).toHaveValue('code-de-test');
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

  test('le code collé dans les réglages finit la connexion ; un choix pendant le toast de « Retirer ces playlists » le ferme, et son « Annuler » ne défait que le choix', async ({ page }) => {
    await demarrer(page);
    const demandes = await simulerSpotify(page);
    const depart = { titres: null, playlists: [{ nom: 'Pour souffler', lien: lienS(1), source: 'spotify', morceaux: gardes(1, 2) }] };
    await ecrireMeta(page, 'refuges', depart);
    await poserAttente(page);
    await ouvrirReglages(page);
    await expect(champCode(page)).toBeVisible();
    // Vide, rien ne part.
    await bouton(page, 'Finir la connexion').click();
    await champCode(page).fill('  code-colle  ');
    await bouton(page, 'Finir la connexion').click();
    await expect(groupeSpotify(page).getByRole('button')).toHaveCount(4);
    expect(demandes.jeton).toHaveLength(1);
    expect(Object.fromEntries(new URLSearchParams(demandes.jeton[0].corps))).toMatchObject({ code: 'code-colle', code_verifier: VERIFIER, client_id: FACTICE });
    // Fini : la demande et le champ partent ; la playlist suivie a sa coche.
    await expect(champCode(page)).toHaveCount(0);
    expect(await attente(page)).toBeNull();
    expect(await toutCeQuiEstGarde(page)).not.toContain('jeton-de-test');
    await expect(groupeSpotify(page).getByRole('button', { pressed: true })).toHaveText(['Pour souffler']);
    // Retirer, puis choisir pendant son toast : le toast du retrait se ferme, celui du choix le remplace ; son « Annuler » rend
    // les refuges d'après le retrait, pas ceux d'avant.
    await bouton(page, 'Retirer ces playlists').click();
    await expect.poll(() => lireMeta(page, 'refuges')).toBeNull();
    await expect(toast(page)).toContainText('Playlists de Spotify retirées');
    await choix(page, 'Pour marcher').click();
    await expect(toast(page)).toContainText('Playlist choisie');
    await expect.poll(() => lireMeta(page, 'refuges')).toEqual({ titres: null, playlists: [{ nom: 'Pour marcher', lien: lienS(2), source: 'spotify', morceaux: gardes(1, 62) }] });
    await annuler(page).click();
    await expect.poll(() => lireMeta(page, 'refuges')).toBeNull();
    await expect(page.getByLabel('Nom de la playlist 1', { exact: true })).toHaveValue('');
  });

  // Le contrôle de ces écrans (spec §14), en clair et en sombre, avec « Réduire les animations » allumé : contraste AA, cibles de
  // 44 pt, aucun mot interdit, rien qui bouge.
  for (const schema of ['light', 'dark']) {
    test(`le contrôle ${schema === 'light' ? 'en clair' : 'en sombre'} : les boutons et leur note, le champ du code, la liste du compte, le message d'échec, Mes refuges et ses morceaux, la page du code`, async ({ page }) => {
      test.setTimeout(90000);
      await page.emulateMedia({ colorScheme: schema, reducedMotion: 'reduce' });
      await ecouterMouvements(page);
      await demarrer(page);
      await simulerSpotify(page, {
        liste: { status: 200, corps: { ...PLAYLISTS, items: [...PLAYLISTS.items, { name: 'Un nom de playlist assez long pour passer sur deux lignes', external_urls: { spotify: lienS(5) } }] } },
        morceaux: { status: 403, corps: {} },
      });
      // Une ligne au lien qui ne s'ouvrira pas dans une app : sa note est contrôlée avec le reste.
      await ecrireMeta(page, 'refuges', { playlists: [{ nom: 'Collée', lien: lienS(1), source: null, morceaux: gardes(1, 12), suite: true },
        { nom: 'Ailleurs', lien: 'https://exemple.test/ma-liste', source: null }] });
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
      // Mes refuges et ses morceaux, puis les réglages : les boutons et leur note, et le champ du code (une demande attend).
      await ouvrirRefuges(page);
      await controler('Mes refuges, la carte et les morceaux', 'main.refuges .ligne-morceau');
      await poserAttente(page);
      await ouvrirReglages(page);
      await expect(reglages(page).locator('.saisie-playlist .note-import')).toHaveText('Ce lien peut ne rien ouvrir depuis Emozio.');
      await controler('Les réglages, les boutons et le champ du code', '#code-spotify');
      // La liste du compte, la playlist suivie cochée.
      await champCode(page).fill('code-colle');
      await bouton(page, 'Finir la connexion').click();
      await expect(groupeSpotify(page).getByRole('button')).toHaveCount(5);
      await bouge('La liste du compte');
      await controler('La liste du compte', '.liste-spotify .pastille[aria-pressed="true"]');
      // Le message d'un choix refusé, la playlist notée sans morceaux ; le toast « Annuler » fermé de lui-même (5 s), qui couvre
      // le temps de sa vie le bas de l'écran.
      await choix(page, 'Pour marcher').click();
      await expect(annuler(page)).toBeVisible();
      await page.clock.runFor(5100);
      await expect(toast(page)).toHaveCount(0);
      await controler('Le message, les morceaux refusés', '.compte-spotify [role="status"]');
      // Le message d'échec de la connexion.
      await page.unrouteAll({ behavior: 'wait' });
      await servirConstante(page, FACTICE);
      await page.route((u) => u.hostname !== '127.0.0.1', (route) => route.abort('blockedbyclient'));
      await simulerSpotify(page, { jeton: { status: 403, corps: {} } });
      await poserAttente(page);
      await revenirDeSpotify(page, 'code=code-de-test&state=etat-de-test');
      await controler('Le message d\'échec', '.compte-spotify [role="status"]');
      // Mes refuges vide, son bouton.
      await ecrireMeta(page, 'refuges', null);
      await ouvrirRefuges(page);
      await controler('Mes refuges vide', '.refuges-vide .btn-plein');
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
