// La connexion à Spotify (v11, spec §8.3) : la seule exception à « zéro réseau », et ce fichier le seul, hors de sw.js, qui
// appelle le réseau. Elle ne part qu'au toucher sur « Choisir dans mon compte » (ou « Changer de playlist »), ou, en v12, sur
// « Mettre à jour la liste », dans Mes refuges : jamais à l'ouverture de l'app, ni dans Moment difficile, où l'heure d'une
// demande dirait à Spotify l'heure d'un moment difficile.
// La connexion PKCE de Spotify, sans secret, avec les seuls droits de lire ses playlists, les siennes et celles où il
// collabore (v12). Ce qui attend le retour de Spotify (`carnet:spotify:attente` : le verifier PKCE, le state, l'heure de la
// demande, son but et, pour une mise à jour, l'identifiant de la playlist) n'est jamais un jeton.
// v12 (spec v12 §6.3 et §6.4) : les morceaux d'une playlist (GET v1/playlists/{id}/items), 4 pages de 50 au plus. Aucun jeton
// n'est gardé : il n'est jamais écrit (ni stockage, ni base, ni état de l'app, ni sauvegarde). Il vit dans finirConnexion, puis,
// pour « Choisir dans mon compte », dans une fermeture, `lireMorceaux`, le temps de toucher une playlist de la liste : un seul
// usage, 10 minutes au plus ; l'écran l'oublie en se démontant.
// Le retour : `?code=` (ou `?error=`) et `?state=` sont lus et retirés de l'adresse au démarrage (main.js). Si le retour
// arrive hors de l'app installée (dans Safari, point incertain sur l'iPhone, spec §8.5), la page montre le code, à coller
// dans Mes refuges : le verifier PKCE, resté dans l'app, lie déjà ce code à cette demande.
import { listePlaylists, listeMorceaux, ID_SPOTIFY, MAX_MORCEAUX, PAGES_MORCEAUX_MAX } from '../domain/refuges.js';

// L'identifiant de l'app créée chez Spotify (donné par l'utilisateur le 05/11) : ce n'est pas un secret. Vide, la connexion
// disparaît (ni bouton ni champ de code) : le correctif 11.0.1 de la spec §8.5 tient en ce seul changement.
export const SPOTIFY_CLIENT_ID = 'c7b1b16a8d264b159baf378296be5402';

const AUTORISER = 'https://accounts.spotify.com/authorize';
const JETON = 'https://accounts.spotify.com/api/token';
const PLAYLISTS = 'https://api.spotify.com/v1/me/playlists';
// v12 : la base des morceaux d'une playlist, suivie de /{id}/items.
const MORCEAUX = 'https://api.spotify.com/v1/playlists';
// v12 : lire ses playlists, les siennes et celles où il collabore (une playlist collaborative donne aussi ses morceaux).
const DROITS = 'playlist-read-private playlist-read-collaborative';
const CLE_ATTENTE = 'carnet:spotify:attente';
// Une demande restée sans retour plus d'une heure est oubliée.
const ATTENTE_MAX_MS = 60 * 60 * 1000;
// v12 : le jeton d'un choix dans le compte sert 10 minutes au plus.
const JETON_MAX_MS = 10 * 60 * 1000;
// 4 pages de 50 au plus : 200 playlists.
const PAR_PAGE = 50;
const PAGES_MAX = 4;
// v12 : les seuls champs lus d'une page de morceaux (référence Spotify « Get Playlist Items », vérifiée le 09/11/2026 : les
// parenthèses choisissent les champs d'un objet ; chaque entrée porte `item`, `track` est déprécié). La lecture reste
// tolérante (listeMorceaux lit `item`, sinon `track`).
const CHAMPS_MORCEAUX = 'total,items(is_local,item(type,id,name,is_local,artists(name)))';
// Le but d'une connexion : choisir une playlist dans la liste du compte, ou mettre à jour les morceaux de la playlist suivie.
const BUTS = new Set(['choisir', 'maj']);
// Ni cookie, ni cache, ni redirection suivie : une redirection fait échouer la demande.
const COMMUNS = { credentials: 'omit', cache: 'no-store', redirect: 'error' };
// Les signes d'un verifier PKCE (RFC 7636, §4.1) ; 64 signes, soit 6 bits par octet tiré : le tirage reste uniforme.
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const VERIFIER = /^[A-Za-z0-9._~-]{43,128}$/;

// `raison` : 'refus' (Spotify répond 401, ou 403 hors des morceaux), 'reseau' (la demande n'est pas partie ou n'a pas abouti), 'reponse' (le
// reste : réponse d'une autre forme, code refusé, demande oubliée, identifiant de playlist invalide).
// v12 : 'morceaux' (Spotify ne donne pas les morceaux d'une playlist qui n'est pas à lui : 403, ou 200 sans tableau `items`),
// 'expiree' (`lireMorceaux` a déjà servi, ou plus de 10 minutes ont passé).
export class ErreurSpotify extends Error {
  constructor(raison) {
    super(`Spotify : ${raison}`);
    this.name = 'ErreurSpotify';
    this.raison = raison;
  }
}

export const connexionDisponible = (id = SPOTIFY_CLIENT_ID) => typeof id === 'string' && id.trim() !== '';

const idValide = (id) => typeof id === 'string' && ID_SPOTIFY.test(id);
const tirer = (n, cr) => Array.from(cr.getRandomValues(new Uint8Array(n)), (o) => ALPHABET[o & 63]).join('');
const base64url = (octets) => btoa(String.fromCharCode(...octets)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
// L'adresse de retour : celle de l'app, sans paramètres ni hash. Elle doit être inscrite telle quelle chez Spotify.
const adresseRetour = (win) => `${win.location.origin}${win.location.pathname}`;

// Le défi PKCE (S256) : l'empreinte SHA-256 du verifier, en base64url sans « = ».
export async function defiPkce(verifier, subtil = globalThis.crypto.subtle) {
  return base64url(new Uint8Array(await subtil.digest('SHA-256', new TextEncoder().encode(verifier))));
}

// Au toucher sur « Choisir dans mon compte » : la demande est notée, puis l'app part vers la page de Spotify. Si elle ne peut
// pas être notée, rien ne part. v12 : `but` vaut 'choisir' (par défaut) ou 'maj' (« Mettre à jour la liste »), qui exige
// l'identifiant de la playlist suivie (`playlist`) ; il est noté avec la demande, jamais envoyé à cette étape. Un autre but ou
// un identifiant invalide : rien ne part.
export async function ouvrirConnexion({ win = globalThis, clientId = SPOTIFY_CLIENT_ID, maintenant = Date.now(), but = 'choisir', playlist } = {}) {
  if (!connexionDisponible(clientId) || !BUTS.has(but)) throw new ErreurSpotify('reponse');
  if (but === 'maj' && !idValide(playlist)) throw new ErreurSpotify('reponse');
  const verifier = tirer(64, win.crypto);
  const state = tirer(32, win.crypto);
  const defi = await defiPkce(verifier, win.crypto.subtle);
  try {
    win.localStorage.setItem(CLE_ATTENTE, JSON.stringify({ verifier, state, creeLe: maintenant, but, ...(but === 'maj' ? { playlist } : {}) }));
  } catch {
    throw new ErreurSpotify('reponse');
  }
  const params = new URLSearchParams({
    client_id: clientId, response_type: 'code', redirect_uri: adresseRetour(win), scope: DROITS,
    code_challenge_method: 'S256', code_challenge: defi, state,
  });
  win.location.assign(`${AUTORISER}?${params}`);
}

export function oublierAttente(win = globalThis) {
  try { win.localStorage.removeItem(CLE_ATTENTE); } catch { /* stockage indisponible */ }
}

// La demande en attente du retour de Spotify, ou null. Illisible, d'une autre forme ou vieille de plus d'une heure : elle
// est retirée. v12 : rend aussi son but ; une demande sans but (de la v11), d'un autre but, ou une mise à jour dont la
// playlist n'est pas un identifiant valable, vaut « choisir », sans playlist. Une clé inconnue n'est jamais rendue.
export function lireAttente(win = globalThis, maintenant = Date.now()) {
  let a = null;
  try { a = JSON.parse(win.localStorage.getItem(CLE_ATTENTE)); } catch { a = undefined; }
  if (a === null) return null;
  const valide = a !== null && typeof a === 'object' && typeof a.verifier === 'string' && VERIFIER.test(a.verifier)
    && typeof a.state === 'string' && a.state !== '' && Number.isFinite(a.creeLe) && Math.abs(maintenant - a.creeLe) <= ATTENTE_MAX_MS;
  if (!valide) { oublierAttente(win); return null; }
  const lue = { verifier: a.verifier, state: a.state, creeLe: a.creeLe };
  return a.but === 'maj' && idValide(a.playlist) ? { ...lue, but: 'maj', playlist: a.playlist } : { ...lue, but: 'choisir' };
}

// Au démarrage : le retour de Spotify, lu puis retiré de l'adresse (code, state, error), sans toucher aux autres paramètres
// (`?sw`, `?forcer-guide`) ni au hash. Sans `code` ni `error`, rien ne change et rien n'est rendu.
const PARAMS_RETOUR = new Set(['code', 'state', 'error']);
const cleDe = (morceau) => {
  try { return decodeURIComponent(morceau.split('=')[0].replace(/\+/g, ' ')); } catch { return morceau; }
};
export function prendreRetour(win = globalThis) {
  const params = new URLSearchParams(win.location.search);
  const code = params.get('code');
  const erreur = params.get('error');
  if (code === null && erreur === null) return null;
  const state = params.get('state');
  const reste = win.location.search.replace(/^\?/, '').split('&').filter((m) => m && !PARAMS_RETOUR.has(cleDe(m)));
  win.history.replaceState(null, '', `${win.location.pathname}${reste.length ? `?${reste.join('&')}` : ''}${win.location.hash}`);
  return erreur !== null ? { erreur, state } : { code, state };
}

// Ce que fait l'app d'un retour : null sans retour ; 'copier' pour un code arrivé hors de l'app installée (la page du code :
// on n'y finit jamais la connexion, même si une demande y attendait) ; 'echec' pour un refus de la demande en cours ; 'finir'
// pour un code de la demande en cours ; 'ignorer' pour le reste (un state qui ne correspond pas, aucune demande).
export function issueRetour({ retour, attente, guide }) {
  if (!retour) return null;
  if (retour.code && guide) return 'copier';
  const correspond = Boolean(attente) && typeof retour.state === 'string' && retour.state === attente.state;
  if (retour.erreur) return correspond ? 'echec' : 'ignorer';
  return retour.code && correspond ? 'finir' : 'ignorer';
}

// `interdit` : la raison d'un 403 ; 'refus' pour la connexion et la liste du compte, 'morceaux' pour les morceaux d'une
// playlist (Spotify les refuse pour une playlist qui n'est pas à lui). Un 401 est toujours un refus.
async function lireJson(demander, url, options, interdit = 'refus') {
  let reponse;
  try { reponse = await demander(url, { ...options, ...COMMUNS }); } catch { throw new ErreurSpotify('reseau'); }
  if (reponse.status === 401) throw new ErreurSpotify('refus');
  if (reponse.status === 403) throw new ErreurSpotify(interdit);
  if (!reponse.ok) throw new ErreurSpotify('reponse');
  try { return await reponse.json(); } catch { throw new ErreurSpotify('reponse'); }
}

// v12 : les morceaux d'une playlist, page par page, comme la liste du compte (pages de 50, offset calculé, `next` jamais
// suivi), PAGES_MORCEAUX_MAX pages au plus. L'identifiant est vérifié avant d'écrire l'adresse. Arrêt sur une page courte ou
// le total atteint. `suite` : il reste des morceaux au-delà de MAX_MORCEAUX (le total le dit ; sans total, la dernière page
// lue était pleine). Une page sans tableau `items` : la playlist n'est pas à lui ('morceaux').
async function lirePagesMorceaux(demander, jeton, id) {
  if (!idValide(id)) throw new ErreurSpotify('reponse');
  const morceaux = [];
  let suite = false;
  for (let page = 0; page < PAGES_MORCEAUX_MAX; page += 1) {
    const adresse = `${MORCEAUX}/${encodeURIComponent(id)}/items?limit=${PAR_PAGE}&offset=${page * PAR_PAGE}&fields=${encodeURIComponent(CHAMPS_MORCEAUX)}`;
    const json = await lireJson(demander, adresse, { headers: { Authorization: `Bearer ${jeton}` } }, 'morceaux');
    if (!json || typeof json !== 'object' || !Array.isArray(json.items)) throw new ErreurSpotify('morceaux');
    morceaux.push(...listeMorceaux(json));
    const nombre = json.items.length;
    const total = Number.isFinite(json.total) ? json.total : null;
    if (nombre < PAR_PAGE || (total !== null && (page + 1) * PAR_PAGE >= total)) break;
    if (page === PAGES_MORCEAUX_MAX - 1) suite = total !== null ? total > (page + 1) * PAR_PAGE : true;
  }
  return { morceaux: morceaux.slice(0, MAX_MORCEAUX), suite: suite || morceaux.length > MAX_MORCEAUX };
}

// v12 (spec v12 §6.4) : la fermeture qui détient le jeton d'un choix dans le compte, le temps de toucher une playlist de la
// liste. Elle ne sert qu'une fois : une réponse avec des morceaux, ou l'erreur 'morceaux', un refus ou une autre réponse la
// consomment ; une coupure du réseau ('reseau') non, et un nouveau toucher peut relire. Pendant une lecture, un second appel
// est refusé. Après 10 minutes (`maintenant`, injectable), elle est 'expiree'. Un appel refusé ne demande rien. Un
// identifiant invalide est refusé ('reponse') sans demande, et sans la consommer.
function fermetureMorceaux(demander, jeton, debut) {
  let garde = jeton;
  return async function lireMorceaux(id, maintenant = Date.now()) {
    if (garde === null) throw new ErreurSpotify('expiree');
    if (!(Math.abs(maintenant - debut) <= JETON_MAX_MS)) { garde = null; throw new ErreurSpotify('expiree'); }
    if (!idValide(id)) throw new ErreurSpotify('reponse');
    const pris = garde;
    garde = null;
    try {
      return await lirePagesMorceaux(demander, pris, id);
    } catch (e) {
      const erreur = e instanceof ErreurSpotify ? e : new ErreurSpotify('reponse');
      if (erreur.raison === 'reseau') garde = pris;
      throw erreur;
    }
  };
}

// Finit la connexion : le code échangé contre un jeton (avec le verifier de la demande en attente). La demande en attente est
// retirée à la fin, sauf en 'reseau', où le code peut se recoller.
// - « choisir » : la liste de ses playlists, page par page (l'offset est calculé ; le `next` de la réponse n'est jamais
//   suivi). Rend { but: 'choisir', liste: [{ nom, lien }], lireMorceaux(id) → Promise<{ morceaux, suite }> }.
// - « maj » (v12) : les morceaux de la playlist notée avec la demande, sans relire la liste du compte. Rend
//   { but: 'maj', playlist, morceaux, suite }.
export async function finirConnexion({ code, win = globalThis, clientId = SPOTIFY_CLIENT_ID, fetch = (...a) => win.fetch(...a), maintenant = Date.now() } = {}) {
  try {
    const attente = lireAttente(win, maintenant);
    const propre = typeof code === 'string' ? code.trim() : '';
    if (!attente || !propre || !connexionDisponible(clientId)) throw new ErreurSpotify('reponse');
    const corps = new URLSearchParams({
      grant_type: 'authorization_code', code: propre, redirect_uri: adresseRetour(win), client_id: clientId, code_verifier: attente.verifier,
    });
    const jeton = (await lireJson(fetch, JETON, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: corps.toString(),
    }) || {}).access_token;
    if (typeof jeton !== 'string' || !jeton) throw new ErreurSpotify('reponse');
    if (attente.but === 'maj') {
      const { morceaux, suite } = await lirePagesMorceaux(fetch, jeton, attente.playlist);
      oublierAttente(win);
      return { but: 'maj', playlist: attente.playlist, morceaux, suite };
    }
    const liste = [];
    const vus = new Set();
    for (let page = 0; page < PAGES_MAX; page += 1) {
      const json = await lireJson(fetch, `${PLAYLISTS}?limit=${PAR_PAGE}&offset=${page * PAR_PAGE}`, { headers: { Authorization: `Bearer ${jeton}` } });
      for (const p of listePlaylists(json)) if (!vus.has(p.lien)) { vus.add(p.lien); liste.push(p); }
      const nombre = json && Array.isArray(json.items) ? json.items.length : 0;
      const total = json && Number.isFinite(json.total) ? json.total : null;
      if (nombre < PAR_PAGE || (total !== null && (page + 1) * PAR_PAGE >= total)) break;
    }
    oublierAttente(win);
    return { but: 'choisir', liste, lireMorceaux: fermetureMorceaux(fetch, jeton, maintenant) };
  } catch (e) {
    const erreur = e instanceof ErreurSpotify ? e : new ErreurSpotify('reponse');
    if (erreur.raison !== 'reseau') oublierAttente(win);
    throw erreur;
  }
}
