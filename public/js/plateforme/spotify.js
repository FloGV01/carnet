// La connexion à Spotify (v11, spec §8.3) : la seule exception à « zéro réseau », et ce fichier le seul, hors de sw.js, qui
// appelle le réseau. Elle ne part qu'au toucher sur « Choisir dans mon compte », dans Mes refuges : jamais à l'ouverture de
// l'app, ni dans Moment difficile, où l'heure d'une demande dirait à Spotify l'heure d'un moment difficile.
// La connexion PKCE de Spotify, sans secret, avec le seul droit de lire ses playlists. Aucun jeton gardé : il vit dans une
// variable locale de finirConnexion, le temps de lire la liste, puis il est jeté. Ce qui attend le retour de Spotify
// (`carnet:spotify:attente` : le verifier PKCE, le state et l'heure de la demande) n'est jamais un jeton.
// Le retour : `?code=` (ou `?error=`) et `?state=` sont lus et retirés de l'adresse au démarrage (main.js). Si le retour
// arrive hors de l'app installée (dans Safari, point incertain sur l'iPhone, spec §8.5), la page montre le code, à coller
// dans Mes refuges : le verifier PKCE, resté dans l'app, lie déjà ce code à cette demande.
import { listePlaylists } from '../domain/refuges.js';

// L'identifiant de l'app créée chez Spotify (donné par l'utilisateur le 05/11) : ce n'est pas un secret. Vide, la connexion
// disparaît (ni bouton ni champ de code) : le correctif 11.0.1 de la spec §8.5 tient en ce seul changement.
export const SPOTIFY_CLIENT_ID = 'c7b1b16a8d264b159baf378296be5402';

const AUTORISER = 'https://accounts.spotify.com/authorize';
const JETON = 'https://accounts.spotify.com/api/token';
const PLAYLISTS = 'https://api.spotify.com/v1/me/playlists';
const DROIT = 'playlist-read-private';
const CLE_ATTENTE = 'carnet:spotify:attente';
// Une demande restée sans retour plus d'une heure est oubliée.
const ATTENTE_MAX_MS = 60 * 60 * 1000;
// 4 pages de 50 au plus : 200 playlists.
const PAR_PAGE = 50;
const PAGES_MAX = 4;
// Ni cookie, ni cache, ni redirection suivie : une redirection fait échouer la demande.
const COMMUNS = { credentials: 'omit', cache: 'no-store', redirect: 'error' };
// Les signes d'un verifier PKCE (RFC 7636, §4.1) ; 64 signes, soit 6 bits par octet tiré : le tirage reste uniforme.
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const VERIFIER = /^[A-Za-z0-9._~-]{43,128}$/;

// `raison` : 'refus' (Spotify répond 401 ou 403), 'reseau' (la demande n'est pas partie ou n'a pas abouti), 'reponse' (le
// reste : réponse d'une autre forme, code refusé, demande oubliée).
export class ErreurSpotify extends Error {
  constructor(raison) {
    super(`Spotify : ${raison}`);
    this.name = 'ErreurSpotify';
    this.raison = raison;
  }
}

export const connexionDisponible = (id = SPOTIFY_CLIENT_ID) => typeof id === 'string' && id.trim() !== '';

const tirer = (n, cr) => Array.from(cr.getRandomValues(new Uint8Array(n)), (o) => ALPHABET[o & 63]).join('');
const base64url = (octets) => btoa(String.fromCharCode(...octets)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
// L'adresse de retour : celle de l'app, sans paramètres ni hash. Elle doit être inscrite telle quelle chez Spotify.
const adresseRetour = (win) => `${win.location.origin}${win.location.pathname}`;

// Le défi PKCE (S256) : l'empreinte SHA-256 du verifier, en base64url sans « = ».
export async function defiPkce(verifier, subtil = globalThis.crypto.subtle) {
  return base64url(new Uint8Array(await subtil.digest('SHA-256', new TextEncoder().encode(verifier))));
}

// Au toucher sur « Choisir dans mon compte » : la demande est notée, puis l'app part vers la page de Spotify. Si elle ne peut
// pas être notée, rien ne part.
export async function ouvrirConnexion({ win = globalThis, clientId = SPOTIFY_CLIENT_ID, maintenant = Date.now() } = {}) {
  if (!connexionDisponible(clientId)) throw new ErreurSpotify('reponse');
  const verifier = tirer(64, win.crypto);
  const state = tirer(32, win.crypto);
  const defi = await defiPkce(verifier, win.crypto.subtle);
  try {
    win.localStorage.setItem(CLE_ATTENTE, JSON.stringify({ verifier, state, creeLe: maintenant }));
  } catch {
    throw new ErreurSpotify('reponse');
  }
  const params = new URLSearchParams({
    client_id: clientId, response_type: 'code', redirect_uri: adresseRetour(win), scope: DROIT,
    code_challenge_method: 'S256', code_challenge: defi, state,
  });
  win.location.assign(`${AUTORISER}?${params}`);
}

export function oublierAttente(win = globalThis) {
  try { win.localStorage.removeItem(CLE_ATTENTE); } catch { /* stockage indisponible */ }
}

// La demande en attente du retour de Spotify, ou null. Illisible, d'une autre forme ou vieille de plus d'une heure : elle
// est retirée.
export function lireAttente(win = globalThis, maintenant = Date.now()) {
  let a = null;
  try { a = JSON.parse(win.localStorage.getItem(CLE_ATTENTE)); } catch { a = undefined; }
  if (a === null) return null;
  const valide = a !== null && typeof a === 'object' && typeof a.verifier === 'string' && VERIFIER.test(a.verifier)
    && typeof a.state === 'string' && a.state !== '' && Number.isFinite(a.creeLe) && Math.abs(maintenant - a.creeLe) <= ATTENTE_MAX_MS;
  if (!valide) { oublierAttente(win); return null; }
  return { verifier: a.verifier, state: a.state, creeLe: a.creeLe };
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

async function lireJson(demander, url, options) {
  let reponse;
  try { reponse = await demander(url, { ...options, ...COMMUNS }); } catch { throw new ErreurSpotify('reseau'); }
  if (reponse.status === 401 || reponse.status === 403) throw new ErreurSpotify('refus');
  if (!reponse.ok) throw new ErreurSpotify('reponse');
  try { return await reponse.json(); } catch { throw new ErreurSpotify('reponse'); }
}

// Finit la connexion : le code échangé contre un jeton (avec le verifier de la demande en attente), puis la liste de ses
// playlists, page par page (l'offset est calculé ; le `next` de la réponse n'est jamais suivi). Rend [{ nom, lien }]. La
// demande en attente est retirée à la fin, sauf en 'reseau', où le code peut se recoller.
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
    return liste;
  } catch (e) {
    const erreur = e instanceof ErreurSpotify ? e : new ErreurSpotify('reponse');
    if (erreur.raison !== 'reseau') oublierAttente(win);
    throw erreur;
  }
}
