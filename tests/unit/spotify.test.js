// La connexion à Spotify (v11, tâche 7, spec §8.3) : le défi PKCE, la demande notée puis lue, le retour lu et retiré de
// l'adresse, ce que l'app en fait, et la fin de la connexion avec un faux `fetch` : aucune requête réelle ici. Point de
// vigilance 5 : un retour hors du chemin prévu ne plante rien et ne garde aucun jeton.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SPOTIFY_CLIENT_ID, ErreurSpotify, connexionDisponible, defiPkce, ouvrirConnexion, lireAttente, oublierAttente, prendreRetour,
  issueRetour, finirConnexion,
} from '../../public/js/plateforme/spotify.js';

const CLE = 'carnet:spotify:attente';
const MAINTENANT = Date.UTC(2026, 10, 7, 10, 0);
const VERIFIER = 'v'.repeat(64);

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

test('connexionDisponible : la constante remplie seulement ; vide, la connexion disparaît', () => {
  assert.equal(SPOTIFY_CLIENT_ID, 'c7b1b16a8d264b159baf378296be5402');
  assert.equal(connexionDisponible(), true);
  assert.equal(connexionDisponible('client-de-test'), true);
  for (const x of ['', '   ', null, undefined, 12]) assert.equal(connexionDisponible(x), x === undefined, String(x));
});

test('defiPkce : l\'exemple de la RFC 7636 (annexe B)', async () => {
  assert.equal(await defiPkce('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
});

test('ouvrirConnexion : un verifier de 64 signes et un state de 32 notés, puis la page de Spotify avec le seul droit de lire ses playlists', async () => {
  const win = fenetre();
  await ouvrirConnexion({ win, clientId: 'client-de-test', maintenant: MAINTENANT });
  const attente = JSON.parse(win.valeurs.get(CLE));
  assert.deepEqual(Object.keys(attente).sort(), ['creeLe', 'state', 'verifier']);
  assert.match(attente.verifier, /^[A-Za-z0-9_-]{64}$/);
  assert.match(attente.state, /^[A-Za-z0-9_-]{32}$/);
  assert.equal(attente.creeLe, MAINTENANT);
  const u = new URL(win.parti);
  assert.equal(`${u.origin}${u.pathname}`, 'https://accounts.spotify.com/authorize');
  assert.deepEqual(Object.fromEntries(u.searchParams), {
    client_id: 'client-de-test', response_type: 'code', redirect_uri: 'https://carnet.exemple.test/', scope: 'playlist-read-private',
    code_challenge_method: 'S256', code_challenge: await defiPkce(attente.verifier), state: attente.state,
  });
  // Deux demandes ne se ressemblent pas.
  const win2 = fenetre();
  await ouvrirConnexion({ win: win2, clientId: 'client-de-test', maintenant: MAINTENANT });
  assert.notEqual(JSON.parse(win2.valeurs.get(CLE)).verifier, attente.verifier);
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
  assert.deepEqual(lireAttente(win, MAINTENANT), { verifier: VERIFIER, state: 'etat-1', creeLe: MAINTENANT - 1000 });
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

// Un faux `fetch` : chaque appel noté, une réponse par adresse.
const reponse = (status, corps) => ({ ok: status >= 200 && status < 300, status, json: async () => corps });
const page = (n, debut, total) => ({
  items: Array.from({ length: n }, (_, i) => ({ name: `Liste ${debut + i}`, external_urls: { spotify: `https://open.spotify.com/playlist/p${debut + i}` } })),
  total, next: 'https://api.spotify.com/v1/me/playlists?offset=999&limit=50',
});
function fauxFetch({ jeton = reponse(200, { access_token: 'jeton-de-test', token_type: 'Bearer', expires_in: 3600 }), pages = [] } = {}) {
  const appels = [];
  const f = async (url, options) => {
    appels.push({ url, options });
    if (url === 'https://accounts.spotify.com/api/token') {
      if (jeton instanceof Error) throw jeton;
      return jeton;
    }
    const offset = Number(new URL(url).searchParams.get('offset'));
    const r = pages[offset / 50];
    if (r instanceof Error) throw r;
    return r || reponse(200, { items: [], total: 0 });
  };
  f.appels = appels;
  return f;
}
const raison = (r) => (e) => e instanceof ErreurSpotify && e.raison === r;

test('finirConnexion : le code échangé (corps exact, aucun secret), puis la liste par pages de 50, offset calculé, sans cookie', async () => {
  const win = avecAttente();
  const fetch = fauxFetch({ pages: [reponse(200, page(50, 0, 120)), reponse(200, page(50, 50, 120)), reponse(200, page(20, 100, 120))] });
  const liste = await finirConnexion({ code: ' code-de-test ', win, clientId: 'client-de-test', fetch, maintenant: MAINTENANT });
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
  // Fini : la demande est retirée, et rien ne garde le jeton.
  assert.equal(win.valeurs.has(CLE), false);
  assert.doesNotMatch(JSON.stringify([...win.valeurs]), /jeton-de-test/);
});

test('finirConnexion : 4 pages au plus, même si Spotify en annonce davantage ; le `next` n\'est jamais suivi', async () => {
  const fetch = fauxFetch({ pages: Array.from({ length: 6 }, (_, i) => reponse(200, page(50, i * 50, 1000))) });
  const liste = await finirConnexion({ code: 'c', win: avecAttente(), clientId: 'client-de-test', fetch, maintenant: MAINTENANT });
  assert.equal(liste.length, 200);
  assert.equal(fetch.appels.length, 5);
  assert.ok(fetch.appels.every((a) => !a.url.includes('offset=999')));
  // Une page pleine, sans total : la suivante est lue, jusqu'à une page plus courte.
  const sansTotal = fauxFetch({ pages: [reponse(200, { items: page(50, 0).items }), reponse(200, { items: page(3, 50).items })] });
  assert.equal((await finirConnexion({ code: 'c', win: avecAttente(), clientId: 'client-de-test', fetch: sansTotal, maintenant: MAINTENANT })).length, 53);
  assert.equal(sansTotal.appels.length, 3);
  // Une page pleine qui atteint le total : on s'arrête là.
  const juste = fauxFetch({ pages: [reponse(200, page(50, 0, 50))] });
  await finirConnexion({ code: 'c', win: avecAttente(), clientId: 'client-de-test', fetch: juste, maintenant: MAINTENANT });
  assert.equal(juste.appels.length, 2);
});

test('finirConnexion : une page piégée (élément null, autre hôte, nom en HTML) ne donne que du texte et des liens du lecteur public', async () => {
  const fetch = fauxFetch({ pages: [reponse(200, { items: [null, { name: '<b>x</b>', external_urls: { spotify: 'https://open.spotify.com/playlist/a' } },
    { name: 'Ailleurs', external_urls: { spotify: 'https://autre.test/playlist/b' } }, { name: 'Doublon', external_urls: { spotify: 'https://open.spotify.com/playlist/a' } }], total: 4 })] });
  assert.deepEqual(await finirConnexion({ code: 'c', win: avecAttente(), clientId: 'client-de-test', fetch, maintenant: MAINTENANT }),
    [{ nom: '<b>x</b>', lien: 'https://open.spotify.com/playlist/a' }]);
});

test('finirConnexion : 401 et 403 → refus, rejet → réseau, le reste → réponse ; la demande n\'est gardée qu\'en réseau', async () => {
  const cas = [
    [{ jeton: reponse(401, {}) }, 'refus'],
    [{ jeton: reponse(403, { error: 'access_denied' }) }, 'refus'],
    [{ pages: [reponse(401, {})] }, 'refus'],
    [{ pages: [reponse(403, {})] }, 'refus'],
    [{ jeton: new TypeError('Load failed') }, 'reseau'],
    [{ pages: [new TypeError('Load failed')] }, 'reseau'],
    [{ jeton: reponse(400, { error: 'invalid_grant' }) }, 'reponse'],
    [{ jeton: reponse(500, {}) }, 'reponse'],
    [{ jeton: reponse(200, { token_type: 'Bearer' }) }, 'reponse'],
    [{ jeton: reponse(200, null) }, 'reponse'],
    [{ jeton: { ok: true, status: 200, json: async () => { throw new SyntaxError('JSON'); } } }, 'reponse'],
    [{ pages: [reponse(500, {})] }, 'reponse'],
  ];
  for (const [options, attendue] of cas) {
    const win = avecAttente();
    await assert.rejects(finirConnexion({ code: 'c', win, clientId: 'client-de-test', fetch: fauxFetch(options), maintenant: MAINTENANT }), raison(attendue), JSON.stringify(options));
    assert.equal(win.valeurs.has(CLE), attendue === 'reseau', `${attendue} : demande ${attendue === 'reseau' ? 'gardée' : 'retirée'}`);
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
