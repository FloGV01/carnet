// Mes refuges (v11, spec §8) : la méta `refuges`, une liste de titres écrite par l'utilisateur et jusqu'à 3 playlists.
// Forme : { titres: string|null, playlists: [{ nom: string|null, lien: string|null, source: 'spotify'|null }] }.
// Carnet ne propose aucune chanson. Pur : aucun réseau ici, un lien n'est jamais suivi, seulement relu.
// La méta vient aussi d'une sauvegarde, peut-être abîmée ou écrite à la main (point de vigilance 4) : à la lecture, un
// mauvais type, un lien d'un autre schéma, une ligne en trop ou une source inconnue sont ignorés ou remis en forme, sans
// erreur. Un nom reste du texte, jamais du HTML : c'est l'écran qui l'affiche comme tel.

// Trois playlists au plus (appel du concepteur, spec §8.1).
export const MAX_PLAYLISTS = 3;
// Le nom d'une playlist, coupé à ce nombre de signes (points de code : un emoji compte pour un, et n'est jamais coupé en deux).
export const NOM_MAX = 200;

// Les seuls schémas acceptés, à la saisie comme à la lecture d'une sauvegarde (spec §8.2) : le web chiffré, l'app Spotify
// et l'app Musique.
const SCHEMAS_ACCEPTES = new Set(['https:', 'spotify:', 'music:']);
// Le lecteur public de Spotify, seul hôte gardé pour une playlist reçue de son compte.
const HOTE_SPOTIFY = 'open.spotify.com';

const estObjet = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
// Un texte propre (NFC, sans espaces autour), ou null : vide ou pas un texte.
const textePropre = (x) => (typeof x === 'string' ? x.normalize('NFC').trim() || null : null);

function lireUrl(texte) {
  if (typeof texte !== 'string') return null;
  const propre = texte.trim();
  if (!propre) return null;
  try { return new URL(propre); } catch { return null; }
}

// Un lien collé ou lu : sans espaces autour, d'un schéma accepté, sans le seul paramètre de partage `si` (« ?si=… »).
// Rend le lien remis en forme, ou null.
export function lienAccepte(texte) {
  const url = lireUrl(texte);
  if (!url || !SCHEMAS_ACCEPTES.has(url.protocol)) return null;
  if (url.searchParams.has('si')) {
    url.searchParams.delete('si');
    // Sans autre paramètre, le « ? » resté seul part aussi.
    if (!url.searchParams.toString()) url.search = '';
  }
  return url.href;
}

// Un lien reçu de Spotify : seulement son lecteur public, en https, à l'hôte exact, sans compte ni port. Rend le lien
// remis en forme (lienAccepte), ou null.
export function lienDeSpotify(texte) {
  const url = lireUrl(texte);
  if (!url || url.protocol !== 'https:' || url.hostname !== HOTE_SPOTIFY || url.port || url.username || url.password) return null;
  return lienAccepte(url.href);
}

// Une playlist relue : nom en texte (coupé à NOM_MAX signes), lien vérifié selon sa source ; null si elle n'a ni nom ni
// lien. Avec la source Spotify, un lien refusé fait aussi perdre la source : l'app n'écrit jamais une ligne Spotify sans
// lien, et « Spotify » n'est nommé qu'à côté de ce qui vient de lui (spec §8.3). Le nom reste.
function normaliserPlaylist(p) {
  if (!estObjet(p)) return null;
  const nom = textePropre(p.nom);
  const coupe = nom && (Array.from(nom).slice(0, NOM_MAX).join('').trim() || null);
  const lien = p.source === 'spotify' ? lienDeSpotify(p.lien) : lienAccepte(p.lien);
  const source = p.source === 'spotify' && lien ? 'spotify' : null;
  if (!coupe && !lien) return null;
  return { nom: coupe, lien, source };
}

// La méta telle que l'app l'écrit et la lit. Un mauvais type rend des refuges vides ; les lignes sans nom ni lien
// disparaissent avant de compter les trois.
export function normaliserRefuges(brut) {
  const r = estObjet(brut) ? brut : {};
  const playlists = (Array.isArray(r.playlists) ? r.playlists : []).map(normaliserPlaylist).filter(Boolean).slice(0, MAX_PLAYLISTS);
  return { titres: textePropre(r.titres), playlists };
}

// Rien de noté : ni titre, ni playlist.
export function refugesVides(r) {
  const n = normaliserRefuges(r);
  return !n.titres && n.playlists.length === 0;
}

// Les playlists qu'un toucher peut ouvrir : celles qui ont un lien.
export const playlistsAOuvrir = (r) => normaliserRefuges(r).playlists.filter((p) => p.lien);

// Le nom affiché d'une playlist : le sien, sinon « Playlist 1 » (i : sa place dans la liste, à partir de 0).
export const nomPlaylist = (p, i) => (p && textePropre(p.nom)) || `Playlist ${i + 1}`;
