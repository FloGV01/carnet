// La connexion à Spotify (v11, tâche 7, spec §8.3) : le défi PKCE, la demande notée puis lue, le retour lu et retiré de
// l'adresse, ce que l'app en fait, et la fin de la connexion avec un faux `fetch` : aucune requête réelle ici. Point de
// vigilance 5 : un retour hors du chemin prévu ne plante rien et ne garde aucun jeton.
// v12 (2/9, spec v12 §6.3 et §6.4) : le but de la demande (choisir ou mettre à jour la liste) noté avec elle, la lecture des
// morceaux d'une playlist (adresse exacte, sans `fields`, pages de 50, 4 au plus, `suite`), et `lireMorceaux`, à usage unique et
// à durée limitée. Point de vigilance 1, côté plateforme : une playlist qui n'est pas à lui, 300 morceaux, une page piégée,
// un identifiant de 21 ou de 23 signes, deux appels, un appel après 10 minutes, le réseau coupé : rien ne plante, aucun jeton
// n'est écrit. Identifiants factices de 22 signes, titres inventés.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SPOTIFY_CLIENT_ID, ErreurSpotify, connexionDisponible, defiPkce, ouvrirConnexion, lireAttente, oublierAttente, prendreRetour,
  issueRetour, finirConnexion,
} from '../../public/js/plateforme/spotify.js';

const CLE = 'carnet:spotify:attente';
const MAINTENANT = Date.UTC(2026, 10, 7, 10, 0);
const VERIFIER = 'v'.repeat(64);
// Une playlist et des morceaux factices : 22 lettres ou chiffres, jamais un identifiant réel.
const PID = 'PlaylistDeTest00000001';
const idMorceau = (n) => `Morceau${String(n).padStart(15, '0')}`;
const DIX_MINUTES = 10 * 60 * 1000;

// Une fenêtre factice : l'adresse, l'historique, un localStorage en mémoire, le vrai crypto de Node.
function fenetre({ search = '', hash = '#/aujourdhui', stockage = {} } = {}) {
  const valeurs = new Map(Object.entries(stockage));
  const win = {
    crypto: globalThis.crypto,
    location: { origin: 'https://carnet.exemple.test', pathname: '/', search, hash, assign: (u) => { win.parti = u; } },
    history: { replaceState: (_, __, u) => { win.remplacee = u; } },
    localStorage: {
      getItem: (k) => (valeurs.has(k) ? valeurs.get(k) : null),
      setItem: (k, v) => valeurs.set(k, String(v)),
      removeItem: (k) => valeurs.delete(k),
    },
    valeurs,
  };
  return win;
}
const avecAttente = (attente = { verifier: VERIFIER, state: 'etat-1', creeLe: MAINTENANT - 1000 }) => fenetre({ stockage: { [CLE]: JSON.stringify(attente) } });
const pourMaj = (playlist = PID) => avecAttente({ verifier: VERIFIER, state: 'etat-1', creeLe: MAINTENANT - 1000, but: 'maj', playlist });

// L'identifiant lui-même n'est écrit que dans plateforme/spotify.js (spec §8.3), jamais ici : vidé (le correctif 11.0.1 de
// la spec §8.5), la constante seule change, et ce test reste vrai (relecture finale de la v11).
test('connexionDisponible : la constante remplie seulement ; vide, la connexion disparaît', () => {
  assert.equal(typeof SPOTIFY_CLIENT_ID, 'string');
  assert.equal(connexionDisponible(), SPOTIFY_CLIENT_ID.trim() !== '');
  assert.equal(connexionDisponible('client-de-test'), true);
  for (const x of ['', '   ', null, 12]) assert.equal(connexionDisponible(x), false, String(x));
});

test('defiPkce : l\'exemple de la RFC 7636 (annexe B)', async () => {
  assert.equal(await defiPkce('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
});

test('ouvrirConnexion : un verifier de 64 signes et un state de 32 notés avec le but, puis la page de Spotify avec les seuls droits de lire ses playlists', async () => {
  const win = fenetre();
  await ouvrirConnexion({ win, clientId: 'client-de-test', maintenant: MAINTENANT });
  const attente = JSON.parse(win.valeurs.get(CLE));
  assert.deepEqual(Object.keys(attente).sort(), ['but', 'creeLe', 'state', 'verifier']);
  assert.equal(attente.but, 'choisir');
  assert.match(attente.verifier, /^[A-Za-z0-9_-]{64}$/);
  assert.match(attente.state, /^[A-Za-z0-9_-]{32}$/);
  assert.equal(attente.creeLe, MAINTENANT);
  const u = new URL(win.parti);
  assert.equal(`${u.origin}${u.pathname}`, 'https://accounts.spotify.com/authorize');
  assert.deepEqual(Object.fromEntries(u.searchParams), {
    client_id: 'client-de-test', response_type: 'code', redirect_uri: 'https://carnet.exemple.test/', scope: 'playlist-read-private playlist-read-collaborative',
    code_challenge_method: 'S256', code_challenge: await defiPkce(attente.verifier), state: attente.state,
  });
  // Deux demandes ne se ressemblent pas.
  const win2 = fenetre();
  await ouvrirConnexion({ win: win2, clientId: 'client-de-test', maintenant: MAINTENANT });
  assert.notEqual(JSON.parse(win2.valeurs.get(CLE)).verifier, attente.verifier);
});

test('ouvrirConnexion : « Mettre à jour la liste » note le but et la playlist ; un identifiant invalide ou un autre but, et rien ne part', async () => {
  const win = fenetre();
  await ouvrirConnexion({ win, clientId: 'client-de-test', maintenant: MAINTENANT, but: 'maj', playlist: PID });
  const attente = JSON.parse(win.valeurs.get(CLE));
  assert.deepEqual(Object.keys(attente).sort(), ['but', 'creeLe', 'playlist', 'state', 'verifier']);
  assert.equal(attente.but, 'maj');
  assert.equal(attente.playlist, PID);
  // L'identifiant ne part pas vers Spotify à cette étape : seulement les droits et le défi.
  assert.doesNotMatch(win.parti, new RegExp(PID));
  const choisir = fenetre();
  await ouvrirConnexion({ win: choisir, clientId: 'client-de-test', maintenant: MAINTENANT, but: 'choisir', playlist: PID });
  assert.deepEqual(Object.keys(JSON.parse(choisir.valeurs.get(CLE))).sort(), ['but', 'creeLe', 'state', 'verifier'], 'choisir : la playlist n\'est pas notée');
  for (const [but, playlist] of [['maj', undefined], ['maj', PID.slice(1)], ['maj', `${PID}x`], ['maj', '../me/playlists'], ['maj', `${PID.slice(2)}/.`],
    ['maj', 12], ['autre', PID], [null, PID]]) {
    const w = fenetre();
    await assert.rejects(ouvrirConnexion({ win: w, clientId: 'client-de-test', but, playlist }), (e) => e instanceof ErreurSpotify && e.raison === 'reponse', String([but, playlist]));
    assert.equal(w.parti, undefined, String([but, playlist]));
    assert.equal(w.valeurs.has(CLE), false, String([but, playlist]));
  }
});

test('ouvrirConnexion : sans identifiant, ou si la demande ne peut pas être notée, rien ne part', async () => {
  const win = fenetre();
  await assert.rejects(ouvrirConnexion({ win, clientId: '' }), ErreurSpotify);
  assert.equal(win.parti, undefined);
  const plein = fenetre();
  plein.localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
  await assert.rejects(ouvrirConnexion({ win: plein, clientId: 'client-de-test' }), (e) => e instanceof ErreurSpotify && e.raison === 'reponse');
  assert.equal(plein.parti, undefined);
});

test('lireAttente : la demande notée ; vieille de plus d\'une heure, illisible ou d\'une autre forme, elle est retirée', () => {
  const win = avecAttente();
  assert.deepEqual(lireAttente(win, MAINTENANT), { verifier: VERIFIER, state: 'etat-1', creeLe: MAINTENANT - 1000, but: 'choisir' });
  assert.deepEqual(lireAttente(avecAttente({ verifier: VERIFIER, state: 's', creeLe: MAINTENANT - 3600000 }), MAINTENANT)?.state, 's', 'une heure tout juste');
  const vieille = avecAttente({ verifier: VERIFIER, state: 's', creeLe: MAINTENANT - 3600001 });
  assert.equal(lireAttente(vieille, MAINTENANT), null);
  assert.equal(vieille.valeurs.has(CLE), false, 'la clé est retirée');
  for (const brut of ['{abîmé', '12', '[]', 'null', JSON.stringify({ verifier: 'court', state: 's', creeLe: MAINTENANT }),
    JSON.stringify({ verifier: VERIFIER, state: '', creeLe: MAINTENANT }), JSON.stringify({ verifier: VERIFIER, state: 's', creeLe: 'hier' }),
    JSON.stringify({ verifier: `${VERIFIER}<`, state: 's', creeLe: MAINTENANT })]) {
    const w = fenetre({ stockage: { [CLE]: brut } });
    assert.equal(lireAttente(w, MAINTENANT), null, brut);
    if (brut !== 'null') assert.equal(w.valeurs.has(CLE), false, brut);
  }
  assert.equal(lireAttente(fenetre(), MAINTENANT), null);
  oublierAttente(win);
  assert.equal(win.valeurs.has(CLE), false);
});

test('lireAttente : le but et la playlist validés ; sans but, « choisir » ; une playlist invalide fait repasser en « choisir »', () => {
  const base = { verifier: VERIFIER, state: 'etat-1', creeLe: MAINTENANT - 1000 };
  assert.deepEqual(lireAttente(pourMaj(), MAINTENANT), { ...base, but: 'maj', playlist: PID });
  assert.deepEqual(lireAttente(avecAttente({ ...base, but: 'choisir', playlist: PID }), MAINTENANT), { ...base, but: 'choisir' });
  for (const playlist of [undefined, null, '', PID.slice(1), `${PID}x`, '../me/playlists', 'Playlist/De/Test/000001', `${PID.slice(0, 21)}é`, 12, [PID]]) {
    const w = avecAttente({ ...base, but: 'maj', playlist });
    assert.deepEqual(lireAttente(w, MAINTENANT), { ...base, but: 'choisir' }, String(playlist));
    assert.equal(w.valeurs.has(CLE), true, 'la demande reste, en « choisir »');
  }
  for (const but of ['autre', 12, null, { but: 'maj' }]) assert.deepEqual(lireAttente(avecAttente({ ...base, but, playlist: PID }), MAINTENANT), { ...base, but: 'choisir' }, String(but));
  // Une clé inconnue n'est pas rendue.
  assert.deepEqual(lireAttente(avecAttente({ ...base, but: 'maj', playlist: PID, jeton: 'x' }), MAINTENANT), { ...base, but: 'maj', playlist: PID });
});

test('prendreRetour : code, state et error lus puis retirés de l\'adresse, les autres paramètres et le hash gardés', () => {
  let win = fenetre({ search: '?code=abc&state=etat-1' });
  assert.deepEqual(prendreRetour(win), { code: 'abc', state: 'etat-1' });
  assert.equal(win.remplacee, '/#/aujourdhui');
  win = fenetre({ search: '?forcer-guide&code=abc&state=x&sw', hash: '' });
  assert.deepEqual(prendreRetour(win), { code: 'abc', state: 'x' });
  assert.equal(win.remplacee, '/?forcer-guide&sw');
  win = fenetre({ search: '?error=access_denied&state=etat-1' });
  assert.deepEqual(prendreRetour(win), { erreur: 'access_denied', state: 'etat-1' });
  assert.equal(win.remplacee, '/#/aujourdhui');
  // Un code sans state : rendu tel quel, avec un state null.
  assert.deepEqual(prendreRetour(fenetre({ search: '?code=abc' })), { code: 'abc', state: null });
  // Sans code ni error : rien ne change.
  for (const search of ['', '?sw', '?state=x', '?forcer-guide']) {
    win = fenetre({ search });
    assert.equal(prendreRetour(win), null, search);
    assert.equal(win.remplacee, undefined, search);
  }
});

test('issueRetour : copier hors de l\'app installée, finir ou échec pour la demande en cours, ignorer le reste', () => {
  const attente = { verifier: VERIFIER, state: 'etat-1', creeLe: MAINTENANT };
  const cas = [
    [null, attente, false, null],
    [null, null, true, null],
    [{ code: 'c', state: 'etat-1' }, attente, false, 'finir'],
    [{ code: 'c', state: 'etat-1' }, attente, true, 'copier'],
    [{ code: 'c', state: 'x' }, null, true, 'copier'],
    [{ code: 'c', state: null }, null, true, 'copier'],
    [{ code: 'c', state: 'autre' }, attente, false, 'ignorer'],
    [{ code: 'c', state: null }, attente, false, 'ignorer'],
    [{ code: 'c', state: 'etat-1' }, null, false, 'ignorer'],
    [{ code: '', state: 'etat-1' }, attente, false, 'ignorer'],
    [{ erreur: 'access_denied', state: 'etat-1' }, attente, false, 'echec'],
    [{ erreur: 'access_denied', state: 'etat-1' }, attente, true, 'echec'],
    [{ erreur: 'access_denied', state: 'autre' }, attente, false, 'ignorer'],
    [{ erreur: 'access_denied', state: null }, attente, false, 'ignorer'],
    [{ erreur: 'access_denied', state: 'etat-1' }, null, false, 'ignorer'],
  ];
  for (const [retour, a, guide, attendu] of cas) assert.equal(issueRetour({ retour, attente: a, guide }), attendu, JSON.stringify([retour, Boolean(a), guide]));
});

// Un faux `fetch` : chaque appel noté, une réponse par adresse. `pages` : la liste du compte ; `morceaux` : les pages des
// morceaux de la playlist PID, par offset. Toute autre adresse est une faute du code.
const reponse = (status, corps) => ({ ok: status >= 200 && status < 300, status, json: async () => corps });
const page = (n, debut, total) => ({
  items: Array.from({ length: n }, (_, i) => ({ name: `Liste ${debut + i}`, external_urls: { spotify: `https://open.spotify.com/playlist/p${debut + i}` } })),
  total, next: 'https://api.spotify.com/v1/me/playlists?offset=999&limit=50',
});
// Une entrée de la forme de février 2026 (`item`), un morceau inventé.
const entree = (n) => ({ added_at: '2026-01-01T00:00:00Z', is_local: false,
  item: { type: 'track', id: idMorceau(n), name: `Titre ${n}`, is_local: false, artists: [{ name: 'Groupe inventé' }, { name: 'Invité' }] } });
const pageMorceaux = (n, debut, total) => ({
  items: Array.from({ length: n }, (_, i) => entree(debut + i)), total, limit: 50, offset: debut,
  next: `https://api.spotify.com/v1/playlists/${PID}/items?offset=999&limit=50`,
});
const JETON_URL = 'https://accounts.spotify.com/api/token';
// Relecture de la tâche 2 : sans `fields`, la référence de Spotify ne montrant aucun exemple de `item(…)` (le repli du plan).
const adresseMorceaux = (o, id = PID) => `https://api.spotify.com/v1/playlists/${id}/items?limit=50&offset=${o}`;
function fauxFetch({ jeton = reponse(200, { access_token: 'jeton-de-test', token_type: 'Bearer', expires_in: 3600 }), pages = [], morceaux = [] } = {}) {
  const appels = [];
  const f = async (url, options) => {
    appels.push({ url, options });
    if (url === JETON_URL) {
      if (jeton instanceof Error) throw jeton;
      return jeton;
    }
    const u = new URL(url);
    const offset = Number(u.searchParams.get('offset'));
    let r;
    if (u.pathname === '/v1/me/playlists') r = pages[offset / 50];
    else if (u.pathname === `/v1/playlists/${PID}/items`) r = typeof morceaux === 'function' ? morceaux(offset) : morceaux[offset / 50];
    else throw new Error(`adresse imprévue : ${url}`);
    if (r instanceof Error) throw r;
    return r || reponse(200, { items: [], total: 0 });
  };
  f.appels = appels;
  return f;
}
const raison = (r) => (e) => e instanceof ErreurSpotify && e.raison === r;
const versMorceaux = (appels) => appels.filter((a) => a.url.includes('/v1/playlists/'));

test('finirConnexion : le code échangé (corps exact, aucun secret), puis la liste par pages de 50, offset calculé, sans cookie', async () => {
  const win = avecAttente();
  const fetch = fauxFetch({ pages: [reponse(200, page(50, 0, 120)), reponse(200, page(50, 50, 120)), reponse(200, page(20, 100, 120))] });
  const fini = await finirConnexion({ code: ' code-de-test ', win, clientId: 'client-de-test', fetch, maintenant: MAINTENANT });
  assert.deepEqual(Object.keys(fini).sort(), ['but', 'lireMorceaux', 'liste']);
  assert.equal(fini.but, 'choisir');
  assert.equal(typeof fini.lireMorceaux, 'function');
  const { liste } = fini;
  assert.equal(liste.length, 120);
  assert.deepEqual(liste[0], { nom: 'Liste 0', lien: 'https://open.spotify.com/playlist/p0' });
  const [jeton, ...listes] = fetch.appels;
  assert.equal(jeton.url, 'https://accounts.spotify.com/api/token');
  assert.equal(jeton.options.method, 'POST');
  assert.equal(jeton.options.headers['Content-Type'], 'application/x-www-form-urlencoded');
  assert.deepEqual(Object.fromEntries(new URLSearchParams(jeton.options.body)), {
    grant_type: 'authorization_code', code: 'code-de-test', redirect_uri: 'https://carnet.exemple.test/', client_id: 'client-de-test', code_verifier: VERIFIER,
  });
  assert.doesNotMatch(jeton.options.body, /secret/);
  assert.deepEqual(listes.map((a) => a.url), [0, 50, 100].map((o) => `https://api.spotify.com/v1/me/playlists?limit=50&offset=${o}`));
  for (const a of fetch.appels) {
    assert.equal(a.options.credentials, 'omit');
    assert.equal(a.options.redirect, 'error');
  }
  for (const a of listes) {
    assert.deepEqual(a.options.headers, { Authorization: 'Bearer jeton-de-test' });
    assert.equal(a.options.method, undefined);
  }
  for (const a of fetch.appels) assert.equal(a.options.cache, 'no-store');
  // Fini : la demande est retirée, et rien ne garde le jeton, ni le stockage ni ce qui est rendu.
  assert.equal(win.valeurs.has(CLE), false);
  assert.doesNotMatch(JSON.stringify([...win.valeurs]), /jeton-de-test/);
  assert.doesNotMatch(JSON.stringify(fini), /jeton-de-test/);
  assert.equal(versMorceaux(fetch.appels).length, 0, 'aucun morceau lu avant un toucher');
});

test('finirConnexion : 4 pages au plus, même si Spotify en annonce davantage ; le `next` n\'est jamais suivi', async () => {
  const fetch = fauxFetch({ pages: Array.from({ length: 6 }, (_, i) => reponse(200, page(50, i * 50, 1000))) });
  const { liste } = await finirConnexion({ code: 'c', win: avecAttente(), clientId: 'client-de-test', fetch, maintenant: MAINTENANT });
  assert.equal(liste.length, 200);
  assert.equal(fetch.appels.length, 5);
  assert.ok(fetch.appels.every((a) => !a.url.includes('offset=999')));
  // Une page pleine, sans total : la suivante est lue, jusqu'à une page plus courte.
  const sansTotal = fauxFetch({ pages: [reponse(200, { items: page(50, 0).items }), reponse(200, { items: page(3, 50).items })] });
  assert.equal((await finirConnexion({ code: 'c', win: avecAttente(), clientId: 'client-de-test', fetch: sansTotal, maintenant: MAINTENANT })).liste.length, 53);
  assert.equal(sansTotal.appels.length, 3);
  // Une page pleine qui atteint le total : on s'arrête là.
  const juste = fauxFetch({ pages: [reponse(200, page(50, 0, 50))] });
  await finirConnexion({ code: 'c', win: avecAttente(), clientId: 'client-de-test', fetch: juste, maintenant: MAINTENANT });
  assert.equal(juste.appels.length, 2);
});

test('finirConnexion : une page piégée (élément null, autre hôte, nom en HTML) ne donne que du texte et des liens du lecteur public', async () => {
  const fetch = fauxFetch({ pages: [reponse(200, { items: [null, { name: '<b>x</b>', external_urls: { spotify: 'https://open.spotify.com/playlist/a' } },
    { name: 'Ailleurs', external_urls: { spotify: 'https://autre.test/playlist/b' } }, { name: 'Doublon', external_urls: { spotify: 'https://open.spotify.com/playlist/a' } }], total: 4 })] });
  assert.deepEqual((await finirConnexion({ code: 'c', win: avecAttente(), clientId: 'client-de-test', fetch, maintenant: MAINTENANT })).liste,
    [{ nom: '<b>x</b>', lien: 'https://open.spotify.com/playlist/a' }]);
});

// Relecture finale de la v12 : la demande n'est gardée qu'en réseau sur l'échange du code lui-même. Après l'échange (une page
// de la liste du compte), le code a servi : un code ne sert qu'une fois (RFC 6749, §4.1.2). La demande est retirée, même en
// réseau, et l'erreur porte `codeUtilise`, pour que l'écran ne garde pas ce code dans le champ.
const echoue = async (promesse, attendue, quoi) => {
  let erreur = null;
  await assert.rejects(promesse.catch((e) => { erreur = e; throw e; }), raison(attendue), quoi);
  return erreur;
};
test('finirConnexion : 401 et 403 → refus, rejet → réseau, le reste → réponse ; la demande n\'est gardée qu\'en réseau sur l\'échange du code ; après lui, `codeUtilise`', async () => {
  const cas = [
    [{ jeton: reponse(401, {}) }, 'refus', false],
    [{ jeton: reponse(403, { error: 'access_denied' }) }, 'refus', false],
    [{ pages: [reponse(401, {})] }, 'refus', true],
    [{ pages: [reponse(403, {})] }, 'refus', true],
    [{ jeton: new TypeError('Load failed') }, 'reseau', false],
    [{ pages: [new TypeError('Load failed')] }, 'reseau', true],
    [{ jeton: reponse(400, { error: 'invalid_grant' }) }, 'reponse', false],
    [{ jeton: reponse(500, {}) }, 'reponse', false],
    [{ jeton: reponse(200, { token_type: 'Bearer' }) }, 'reponse', false],
    [{ jeton: reponse(200, null) }, 'reponse', false],
    [{ jeton: { ok: true, status: 200, json: async () => { throw new SyntaxError('JSON'); } } }, 'reponse', false],
    [{ pages: [reponse(500, {})] }, 'reponse', true],
  ];
  for (const [options, attendue, apresEchange] of cas) {
    const win = avecAttente();
    const quoi = `${JSON.stringify(options)} → ${attendue}`;
    const e = await echoue(finirConnexion({ code: 'c', win, clientId: 'client-de-test', fetch: fauxFetch(options), maintenant: MAINTENANT }), attendue, quoi);
    const gardee = attendue === 'reseau' && !apresEchange;
    assert.equal(win.valeurs.has(CLE), gardee, `${quoi} : demande ${gardee ? 'gardée' : 'retirée'}`);
    assert.equal(e.codeUtilise === true, apresEchange, `${quoi} : codeUtilise`);
  }
});

test('finirConnexion : un jeton reçu, puis la 2e page coupée (réseau), en choisir et en mise à jour : la demande est retirée et l\'erreur porte `codeUtilise` ; le même code redonné ne relance rien, sans demande en attente', async () => {
  for (const [nom, win, options] of [
    ['choisir', avecAttente(), { pages: [reponse(200, page(50, 0, 80)), new TypeError('Load failed')] }],
    ['maj', pourMaj(), { morceaux: [reponse(200, pageMorceaux(50, 0, 120)), new TypeError('Load failed')] }],
  ]) {
    const fetch = fauxFetch(options);
    const e = await echoue(finirConnexion({ code: 'code-un', win, clientId: 'client-de-test', fetch, maintenant: MAINTENANT }), 'reseau', nom);
    assert.equal(e.codeUtilise, true, `${nom} : codeUtilise`);
    assert.equal(win.valeurs.has(CLE), false, `${nom} : demande retirée`);
    assert.equal(fetch.appels.filter((a) => a.url === JETON_URL).length, 1, `${nom} : un seul échange`);
    assert.doesNotMatch(JSON.stringify([...win.valeurs]), /jeton-de-test/);
    // « Finir la connexion » de nouveau, avec le même code : sans demande en attente, rien ne part.
    const encore = fauxFetch(options);
    await assert.rejects(finirConnexion({ code: 'code-un', win, clientId: 'client-de-test', fetch: encore, maintenant: MAINTENANT }), raison('reponse'));
    assert.equal(encore.appels.length, 0, `${nom} : aucune seconde demande de jeton`);
  }
  // Coupé sur l'échange du code lui-même : la demande reste, sans `codeUtilise` (le code peut se recoller).
  for (const win of [avecAttente(), pourMaj()]) {
    const e = await echoue(finirConnexion({ code: 'code-un', win, clientId: 'client-de-test', fetch: fauxFetch({ jeton: new TypeError('Load failed') }), maintenant: MAINTENANT }), 'reseau', 'jeton');
    assert.equal(e.codeUtilise, undefined);
    assert.equal(win.valeurs.has(CLE), true);
  }
});

test('finirConnexion : sans demande en attente, sans code ou sans identifiant, rien ne part', async () => {
  for (const [win, code, clientId] of [[fenetre(), 'c', 'client-de-test'], [avecAttente(), '  ', 'client-de-test'], [avecAttente(), null, 'client-de-test'],
    [avecAttente(), 'c', ''], [avecAttente({ verifier: VERIFIER, state: 's', creeLe: MAINTENANT - 3600001 }), 'c', 'client-de-test']]) {
    const fetch = fauxFetch();
    await assert.rejects(finirConnexion({ code, win, clientId, fetch, maintenant: MAINTENANT }), raison('reponse'));
    assert.equal(fetch.appels.length, 0);
  }
});

// ---------- v12 : les morceaux (spec v12 §6.3 et §6.4) ----------

test('finirConnexion, « Mettre à jour la liste » : le jeton, puis les pages des morceaux (adresse exacte, sans fields), sans relire la liste du compte', async () => {
  const win = pourMaj();
  const fetch = fauxFetch({ morceaux: [reponse(200, pageMorceaux(50, 0, 62)), reponse(200, pageMorceaux(12, 50, 62))] });
  const fini = await finirConnexion({ code: 'code-de-test', win, clientId: 'client-de-test', fetch, maintenant: MAINTENANT });
  assert.deepEqual(Object.keys(fini).sort(), ['but', 'morceaux', 'playlist', 'suite']);
  assert.equal(fini.but, 'maj');
  assert.equal(fini.playlist, PID);
  assert.equal(fini.suite, false);
  assert.equal(fini.morceaux.length, 62);
  assert.deepEqual(fini.morceaux[0], { id: idMorceau(0), titre: 'Titre 0', artiste: 'Groupe inventé, Invité' });
  assert.deepEqual(fini.morceaux[61], { id: idMorceau(61), titre: 'Titre 61', artiste: 'Groupe inventé, Invité' });
  // Le jeton puis deux pages : 3 appels, jamais /v1/me/playlists, jamais le `next` de la réponse.
  assert.deepEqual(fetch.appels.map((a) => a.url), [JETON_URL, adresseMorceaux(0), adresseMorceaux(50)]);
  for (const a of versMorceaux(fetch.appels)) assert.deepEqual([...new URL(a.url).searchParams.keys()], ['limit', 'offset']);
  for (const a of fetch.appels) {
    assert.equal(a.options.credentials, 'omit');
    assert.equal(a.options.cache, 'no-store');
    assert.equal(a.options.redirect, 'error');
  }
  for (const a of versMorceaux(fetch.appels)) {
    assert.deepEqual(a.options.headers, { Authorization: 'Bearer jeton-de-test' });
    assert.equal(a.options.method, undefined);
  }
  // Fini : la demande est retirée ; aucun jeton dans le stockage ni dans ce qui est rendu.
  assert.equal(win.valeurs.has(CLE), false);
  assert.doesNotMatch(JSON.stringify([...win.valeurs]), /jeton-de-test/);
  assert.doesNotMatch(JSON.stringify(fini), /jeton-de-test/);
});

test('finirConnexion, mise à jour : 300 morceaux donnent 4 pages, 200 morceaux et la suite ; une page courte ou le total atteint arrêtent', async () => {
  const grand = fauxFetch({ morceaux: (o) => reponse(200, pageMorceaux(50, o, 300)) });
  const fini = await finirConnexion({ code: 'c', win: pourMaj(), clientId: 'client-de-test', fetch: grand, maintenant: MAINTENANT });
  assert.equal(fini.morceaux.length, 200);
  assert.equal(fini.suite, true);
  assert.deepEqual(versMorceaux(grand.appels).map((a) => a.url), [0, 50, 100, 150].map((o) => adresseMorceaux(o)));
  // Exactement 200 : 4 pages, pas de suite.
  const juste = fauxFetch({ morceaux: (o) => reponse(200, pageMorceaux(50, o, 200)) });
  assert.equal((await finirConnexion({ code: 'c', win: pourMaj(), clientId: 'client-de-test', fetch: juste, maintenant: MAINTENANT })).suite, false);
  assert.equal(versMorceaux(juste.appels).length, 4);
  // Une page pleine qui atteint le total : on s'arrête là.
  const cinquante = fauxFetch({ morceaux: [reponse(200, pageMorceaux(50, 0, 50))] });
  assert.equal((await finirConnexion({ code: 'c', win: pourMaj(), clientId: 'client-de-test', fetch: cinquante, maintenant: MAINTENANT })).morceaux.length, 50);
  assert.equal(versMorceaux(cinquante.appels).length, 1);
  // Sans total : la page suivante est lue jusqu'à une page courte ; 4 pages pleines sans total laissent une suite possible.
  const sansTotal = fauxFetch({ morceaux: [reponse(200, { items: pageMorceaux(50, 0).items }), reponse(200, { items: pageMorceaux(3, 50).items })] });
  const r = await finirConnexion({ code: 'c', win: pourMaj(), clientId: 'client-de-test', fetch: sansTotal, maintenant: MAINTENANT });
  assert.deepEqual([r.morceaux.length, r.suite, versMorceaux(sansTotal.appels).length], [53, false, 2]);
  const pleinSansTotal = fauxFetch({ morceaux: (o) => reponse(200, { items: pageMorceaux(50, o).items }) });
  const p = await finirConnexion({ code: 'c', win: pourMaj(), clientId: 'client-de-test', fetch: pleinSansTotal, maintenant: MAINTENANT });
  assert.deepEqual([p.morceaux.length, p.suite, versMorceaux(pleinSansTotal.appels).length], [200, true, 4]);
  // Une réponse qui ignore la limite (100 par page) : 200 morceaux au plus, et la suite.
  const large = fauxFetch({ morceaux: (o) => reponse(200, pageMorceaux(100, o, 300)) });
  const l = await finirConnexion({ code: 'c', win: pourMaj(), clientId: 'client-de-test', fetch: large, maintenant: MAINTENANT });
  assert.deepEqual([l.morceaux.length, l.suite], [200, true]);
  // Une playlist vide : aucun morceau, sans erreur.
  const vide = fauxFetch({ morceaux: [reponse(200, { items: [], total: 0 })] });
  assert.deepEqual((await finirConnexion({ code: 'c', win: pourMaj(), clientId: 'client-de-test', fetch: vide, maintenant: MAINTENANT })).morceaux, []);
});

test('finirConnexion, mise à jour : une page piégée (entrée null, fichier local, épisode, ancienne forme, titre en HTML, identifiants de 21 et 23 signes) ne donne que des morceaux en texte', async () => {
  const items = [
    null,
    { is_local: false, item: null },
    { is_local: true, item: { type: 'track', id: null, name: 'Fichier local', is_local: true, artists: [] } },
    { is_local: false, item: { type: 'episode', id: idMorceau(1), name: 'Un épisode', artists: [] } },
    { is_local: false, item: { type: 'track', id: idMorceau(2).slice(1), name: 'Court', artists: [] } },
    { is_local: false, item: { type: 'track', id: `${idMorceau(3)}x`, name: 'Long', artists: [] } },
    { is_local: false, item: { type: 'track', id: idMorceau(4), name: '<img src=x onerror="window.__piege=1">', is_local: false, artists: [{ name: '<b>Groupe</b>' }] } },
    { is_local: false, track: { type: 'track', id: idMorceau(5), name: 'Ancienne forme', artists: [] } },
    { is_local: false, item: { type: 'track', id: idMorceau(6), name: '   ', artists: [{ name: 'Sans titre' }] } },
    'pas une entrée',
  ];
  const fetch = fauxFetch({ morceaux: [reponse(200, { items, total: items.length })] });
  const fini = await finirConnexion({ code: 'c', win: pourMaj(), clientId: 'client-de-test', fetch, maintenant: MAINTENANT });
  assert.deepEqual(fini.morceaux, [
    { id: idMorceau(4), titre: '<img src=x onerror="window.__piege=1">', artiste: '<b>Groupe</b>' },
    { id: idMorceau(5), titre: 'Ancienne forme', artiste: null },
  ]);
  assert.equal(fini.suite, false);
});

test('finirConnexion, mise à jour : 403 ou 200 sans items → morceaux, 401 → refus, coupure → réseau ; après l\'échange du code, la demande est retirée, même en réseau ; jamais un jeton écrit', async () => {
  const cas = [
    [{ morceaux: [reponse(403, { error: { status: 403, message: 'Forbidden' } })] }, 'morceaux'],
    [{ morceaux: [reponse(200, { name: 'Pas à lui', total: 12 })] }, 'morceaux'],
    [{ morceaux: [reponse(200, { items: 'pas une liste', total: 12 })] }, 'morceaux'],
    [{ morceaux: [reponse(200, null)] }, 'morceaux'],
    [{ morceaux: [reponse(200, pageMorceaux(50, 0, 120)), reponse(403, {})] }, 'morceaux'],
    [{ morceaux: [reponse(401, {})] }, 'refus'],
    [{ jeton: reponse(403, {}) }, 'refus'],
    [{ morceaux: [new TypeError('Load failed')] }, 'reseau'],
    [{ morceaux: [reponse(200, pageMorceaux(50, 0, 120)), new TypeError('Load failed')] }, 'reseau'],
    [{ morceaux: [reponse(404, {})] }, 'reponse'],
    [{ morceaux: [reponse(429, {})] }, 'reponse'],
    [{ morceaux: [{ ok: true, status: 200, json: async () => { throw new SyntaxError('JSON'); } }] }, 'reponse'],
  ];
  for (const [options, attendue] of cas) {
    const win = pourMaj();
    const fetch = fauxFetch(options);
    const quoi = `${JSON.stringify(options)} → ${attendue}`;
    const e = await echoue(finirConnexion({ code: 'c', win, clientId: 'client-de-test', fetch, maintenant: MAINTENANT }), attendue, quoi);
    // Le code a servi dans tous ces cas, sauf un refus de l'échange lui-même : la demande est retirée, coupure comprise.
    assert.equal(win.valeurs.has(CLE), false, `${quoi} : demande retirée`);
    assert.equal(e.codeUtilise === true, !options.jeton, `${quoi} : codeUtilise`);
    assert.ok(fetch.appels.every((a) => !a.url.includes('/me/playlists')));
    assert.doesNotMatch(JSON.stringify([...win.valeurs]), /jeton-de-test/);
  }
});

// Relecture de la tâche 2 : une page dont aucune entrée ne porte `item` ou `track` (un filtre mal compris, une forme qui
// change encore) donnerait une liste vide sans un mot, et « Mettre à jour la liste » effacerait les morceaux notés.
const sansCle = (n, debut) => ({ items: Array.from({ length: n }, () => ({ added_at: '2026-01-01T00:00:00Z', is_local: false })), total: debut + n });
const autreCle = (n, debut) => ({ items: Array.from({ length: n }, (_, i) => ({ is_local: false, element: { type: 'track', id: idMorceau(debut + i), name: `Titre ${debut + i}`, artists: [] } })), total: 62 });
test('finirConnexion, mise à jour : une page dont aucune entrée ne porte `item` ni `track` → réponse (la demande est retirée), jamais une liste vide', async () => {
  const cas = [
    ['sans item ni track', [reponse(200, sansCle(50, 0)), reponse(200, sansCle(12, 50))]],
    ['le morceau sous une autre clé', [reponse(200, autreCle(50, 0)), reponse(200, autreCle(12, 50))]],
    ['une première page lisible, la seconde non', [reponse(200, pageMorceaux(50, 0, 62)), reponse(200, sansCle(12, 50))]],
    ['des entrées qui ne sont pas des objets', [reponse(200, { items: [null, 'x', 3, [], ['item']], total: 5 })]],
  ];
  for (const [nom, morceaux] of cas) {
    const win = pourMaj();
    const fetch = fauxFetch({ morceaux });
    await assert.rejects(finirConnexion({ code: 'c', win, clientId: 'client-de-test', fetch, maintenant: MAINTENANT }), raison('reponse'), nom);
    assert.equal(win.valeurs.has(CLE), false, `${nom} : demande retirée`);
    assert.doesNotMatch(JSON.stringify([...win.valeurs]), /jeton-de-test/);
  }
  // Un fichier local, un `item: null` ou un épisode gardent leur clé : écartés sans erreur, même seuls sur la page. Une
  // playlist vide n'a aucune entrée : aucun morceau, sans erreur.
  const ecartes = { items: [{ is_local: true, item: { type: 'track', id: null, name: 'Fichier local', is_local: true } }, { is_local: false, item: null },
    { is_local: false, track: null }, { is_local: false, item: { type: 'episode', id: idMorceau(1), name: 'Un épisode' } }], total: 4 };
  for (const corps of [ecartes, { items: [], total: 0 }]) {
    const fini = await finirConnexion({ code: 'c', win: pourMaj(), clientId: 'client-de-test', fetch: fauxFetch({ morceaux: [reponse(200, corps)] }), maintenant: MAINTENANT });
    assert.deepEqual([fini.morceaux, fini.suite], [[], false], JSON.stringify(corps));
  }
});

test('finirConnexion, choisir : lireMorceaux lit les morceaux d\'une playlist touchée avec le même jeton, puis ne sert plus', async () => {
  const win = avecAttente();
  const fetch = fauxFetch({ pages: [reponse(200, page(3, 0, 3))], morceaux: [reponse(200, pageMorceaux(50, 0, 62)), reponse(200, pageMorceaux(12, 50, 62))] });
  const { lireMorceaux } = await finirConnexion({ code: 'c', win, clientId: 'client-de-test', fetch, maintenant: MAINTENANT });
  const lu = await lireMorceaux(PID, MAINTENANT + 1000);
  assert.deepEqual(Object.keys(lu).sort(), ['morceaux', 'suite']);
  assert.equal(lu.morceaux.length, 62);
  assert.equal(lu.suite, false);
  assert.deepEqual(versMorceaux(fetch.appels).map((a) => a.url), [adresseMorceaux(0), adresseMorceaux(50)]);
  for (const a of versMorceaux(fetch.appels)) {
    assert.deepEqual(a.options.headers, { Authorization: 'Bearer jeton-de-test' });
    assert.deepEqual([a.options.credentials, a.options.cache, a.options.redirect], ['omit', 'no-store', 'error']);
  }
  // Consommée : un second appel est refusé sans aucune demande.
  const avant = fetch.appels.length;
  await assert.rejects(lireMorceaux(PID, MAINTENANT + 2000), raison('expiree'));
  assert.equal(fetch.appels.length, avant);
  assert.doesNotMatch(JSON.stringify([...win.valeurs]), /jeton-de-test/);
  assert.equal(win.valeurs.has(CLE), false);
});

test('lireMorceaux : 10 minutes au plus ; après, « expiree » sans demande, et elle ne sert plus', async () => {
  const pages = [reponse(200, page(1, 0, 1))];
  const juste = fauxFetch({ pages, morceaux: [reponse(200, pageMorceaux(3, 0, 3))] });
  const a = await finirConnexion({ code: 'c', win: avecAttente(), clientId: 'client-de-test', fetch: juste, maintenant: MAINTENANT });
  assert.equal((await a.lireMorceaux(PID, MAINTENANT + DIX_MINUTES)).morceaux.length, 3, '10 minutes tout juste');
  const tard = fauxFetch({ pages, morceaux: [reponse(200, pageMorceaux(3, 0, 3))] });
  const b = await finirConnexion({ code: 'c', win: avecAttente(), clientId: 'client-de-test', fetch: tard, maintenant: MAINTENANT });
  const avant = tard.appels.length;
  await assert.rejects(b.lireMorceaux(PID, MAINTENANT + DIX_MINUTES + 1), raison('expiree'));
  // Même avec l'horloge revenue en arrière : expirée une fois, elle le reste.
  await assert.rejects(b.lireMorceaux(PID, MAINTENANT + 1000), raison('expiree'));
  assert.equal(tard.appels.length, avant);
  // Une horloge reculée de plus de 10 minutes : expirée aussi.
  const recule = fauxFetch({ pages });
  const c = await finirConnexion({ code: 'c', win: avecAttente(), clientId: 'client-de-test', fetch: recule, maintenant: MAINTENANT });
  await assert.rejects(c.lireMorceaux(PID, MAINTENANT - DIX_MINUTES - 1), raison('expiree'));
  assert.equal(versMorceaux(recule.appels).length, 0);
});

test('lireMorceaux : un identifiant invalide est refusé sans demande, et elle sert encore ; deux appels à la fois, le second attend la fin du premier', async () => {
  const fetch = fauxFetch({ pages: [reponse(200, page(1, 0, 1))], morceaux: [reponse(200, pageMorceaux(2, 0, 2))] });
  const { lireMorceaux } = await finirConnexion({ code: 'c', win: avecAttente(), clientId: 'client-de-test', fetch, maintenant: MAINTENANT });
  for (const id of [PID.slice(1), `${PID}x`, '../../me/playlists', `${PID.slice(0, 21)}/`, `${PID.slice(0, 21)}é`, '', null, undefined, 12, [PID], { id: PID }]) {
    await assert.rejects(lireMorceaux(id, MAINTENANT), raison('reponse'), String(id));
  }
  assert.equal(versMorceaux(fetch.appels).length, 0);
  // Deux touchers rapprochés : le premier lit ; le second attend sa fin, et la trouve consommée, sans demande.
  const [premier, second] = await Promise.allSettled([lireMorceaux(PID, MAINTENANT), lireMorceaux(PID, MAINTENANT)]);
  assert.equal(premier.status, 'fulfilled');
  assert.equal(premier.value.morceaux.length, 2);
  assert.equal(second.status, 'rejected');
  assert.equal(second.reason.raison, 'expiree');
  assert.equal(versMorceaux(fetch.appels).length, 1);
});

// Relecture de la tâche 2 : un second toucher pendant une lecture ne reçoit jamais « expiree » tant que la fermeture vaut
// encore (l'écran dirait à tort que la connexion a expiré).
test('lireMorceaux : deux touchers rapprochés, le premier coupé (réseau) ou passager (429) : le second relit, avec sa playlist', async () => {
  const AUTRE = 'AutrePlaylistDeTest001';
  for (const premiere of [new TypeError('Load failed'), reponse(429, {}), reponse(503, {})]) {
    const appels = [];
    let lus = 0;
    const fetch = async (url, options) => {
      appels.push({ url, options });
      if (url === JETON_URL) return reponse(200, { access_token: 'jeton-de-test' });
      if (url.includes('/me/playlists')) return reponse(200, page(1, 0, 1));
      lus += 1;
      // Le premier toucher reste en route un moment, puis échoue ; le second lit 3 morceaux de sa playlist.
      if (lus === 1) { await new Promise((r) => { setTimeout(r, 20); }); if (premiere instanceof Error) throw premiere; return premiere; }
      return reponse(200, { items: [entree(1), entree(2), entree(3)], total: 3 });
    };
    const { lireMorceaux } = await finirConnexion({ code: 'c', win: avecAttente(), clientId: 'client-de-test', fetch, maintenant: MAINTENANT });
    const [a, b] = await Promise.allSettled([lireMorceaux(PID, MAINTENANT), lireMorceaux(AUTRE, MAINTENANT)]);
    const attendue = premiere instanceof Error ? 'reseau' : 'reponse';
    assert.deepEqual([a.status, a.reason && a.reason.raison], ['rejected', attendue]);
    assert.equal(b.status, 'fulfilled', `${attendue} : le second toucher relit`);
    assert.equal(b.value.morceaux.length, 3);
    const lectures = appels.filter((x) => x.url.includes('/v1/playlists/'));
    assert.deepEqual(lectures.map((x) => x.url), [adresseMorceaux(0), adresseMorceaux(0, AUTRE)]);
    assert.ok(lectures.every((x) => x.options.headers.Authorization === 'Bearer jeton-de-test'));
    // Le second a lu des morceaux : consommée.
    await assert.rejects(lireMorceaux(PID, MAINTENANT + 1000), raison('expiree'));
    assert.equal(appels.filter((x) => x.url.includes('/v1/playlists/')).length, 2);
  }
});

test('lireMorceaux : coupure → réseau, et un nouveau toucher marche ; « morceaux » ou un refus la consomment, une autre réponse non', async () => {
  // Coupée sur la deuxième page : réseau ; le toucher suivant relit tout, avec le même jeton.
  let coupe = true;
  const fetch = fauxFetch({ pages: [reponse(200, page(1, 0, 1))], morceaux: (o) => {
    if (o === 50 && coupe) { coupe = false; return new TypeError('Load failed'); }
    return reponse(200, pageMorceaux(o === 0 ? 50 : 10, o, 60));
  } });
  const { lireMorceaux } = await finirConnexion({ code: 'c', win: avecAttente(), clientId: 'client-de-test', fetch, maintenant: MAINTENANT });
  await assert.rejects(lireMorceaux(PID, MAINTENANT), raison('reseau'));
  const lu = await lireMorceaux(PID, MAINTENANT + 1000);
  assert.equal(lu.morceaux.length, 60);
  assert.deepEqual(versMorceaux(fetch.appels).map((a) => a.url), [adresseMorceaux(0), adresseMorceaux(50), adresseMorceaux(0), adresseMorceaux(50)]);
  assert.ok(versMorceaux(fetch.appels).every((a) => a.options.headers.Authorization === 'Bearer jeton-de-test'));
  // Réseau, puis plus de 10 minutes : expirée.
  const tard = fauxFetch({ pages: [reponse(200, page(1, 0, 1))], morceaux: [new TypeError('Load failed')] });
  const t = await finirConnexion({ code: 'c', win: avecAttente(), clientId: 'client-de-test', fetch: tard, maintenant: MAINTENANT });
  await assert.rejects(t.lireMorceaux(PID, MAINTENANT), raison('reseau'));
  await assert.rejects(t.lireMorceaux(PID, MAINTENANT + DIX_MINUTES + 1), raison('expiree'));
  assert.equal(versMorceaux(tard.appels).length, 1);
  // La playlist n'est pas à lui (403, ou 200 sans items) ou un refus : consommée, le toucher suivant ne demande plus rien.
  for (const [r, attendue] of [[reponse(403, {}), 'morceaux'], [reponse(200, { name: 'Pas à lui' }), 'morceaux'], [reponse(401, {}), 'refus']]) {
    const f = fauxFetch({ pages: [reponse(200, page(1, 0, 1))], morceaux: [r] });
    const fini = await finirConnexion({ code: 'c', win: avecAttente(), clientId: 'client-de-test', fetch: f, maintenant: MAINTENANT });
    await assert.rejects(fini.lireMorceaux(PID, MAINTENANT), raison(attendue), attendue);
    await assert.rejects(fini.lireMorceaux(PID, MAINTENANT), raison('expiree'), `${attendue} puis un second toucher`);
    assert.equal(versMorceaux(f.appels).length, 1, attendue);
  }
  // Relecture de la tâche 2 : une réponse passagère (429, 5xx), illisible ou d'une forme inconnue (aucune entrée avec `item`
  // ni `track`) ne la consomme pas : rien n'est écrit, et un nouveau toucher relit avec le même jeton, jusqu'à l'expiration.
  const passageres = [reponse(429, {}), reponse(500, {}), reponse(503, {}), reponse(404, {}),
    { ok: true, status: 200, json: async () => { throw new SyntaxError('JSON'); } }, reponse(200, sansCle(50, 0)), reponse(200, autreCle(50, 0))];
  for (const [i, r] of passageres.entries()) {
    const nom = `cas ${i} (${r.status})`;
    const f = fauxFetch({ pages: [reponse(200, page(1, 0, 1))], morceaux: (o) => (versMorceaux(f.appels).length === 1 ? r : reponse(200, pageMorceaux(3, o, 3))) });
    const fini = await finirConnexion({ code: 'c', win: avecAttente(), clientId: 'client-de-test', fetch: f, maintenant: MAINTENANT });
    await assert.rejects(fini.lireMorceaux(PID, MAINTENANT), raison('reponse'), nom);
    assert.equal((await fini.lireMorceaux(PID, MAINTENANT + 1000)).morceaux.length, 3, `${nom} puis un second toucher`);
    assert.equal(versMorceaux(f.appels).length, 2, nom);
    assert.ok(versMorceaux(f.appels).every((a) => a.options.headers.Authorization === 'Bearer jeton-de-test'), nom);
    await assert.rejects(fini.lireMorceaux(PID, MAINTENANT + 2000), raison('expiree'), `${nom} : consommée après des morceaux`);
  }
  // Une réponse passagère, puis plus de 10 minutes : expirée, sans demande.
  const tardive = fauxFetch({ pages: [reponse(200, page(1, 0, 1))], morceaux: [reponse(429, {})] });
  const t2 = await finirConnexion({ code: 'c', win: avecAttente(), clientId: 'client-de-test', fetch: tardive, maintenant: MAINTENANT });
  await assert.rejects(t2.lireMorceaux(PID, MAINTENANT), raison('reponse'));
  await assert.rejects(t2.lireMorceaux(PID, MAINTENANT + DIX_MINUTES + 1), raison('expiree'));
  assert.equal(versMorceaux(tardive.appels).length, 1);
});

test('lireMorceaux : 300 morceaux donnent 200 morceaux et la suite, en 4 pages', async () => {
  const fetch = fauxFetch({ pages: [reponse(200, page(1, 0, 1))], morceaux: (o) => reponse(200, pageMorceaux(50, o, 300)) });
  const { lireMorceaux } = await finirConnexion({ code: 'c', win: avecAttente(), clientId: 'client-de-test', fetch, maintenant: MAINTENANT });
  const lu = await lireMorceaux(PID, MAINTENANT);
  assert.deepEqual([lu.morceaux.length, lu.suite, versMorceaux(fetch.appels).length], [200, true, 4]);
});
