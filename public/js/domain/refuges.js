// Mes refuges (v11, spec §8) : la méta `refuges`, une liste de titres écrite par l'utilisateur et jusqu'à 3 playlists.
// Forme : { titres: string|null, playlists: [{ nom: string|null, lien: string|null, source: 'spotify'|null,
//   morceaux?: [{ id, titre, artiste: string|null }], suite?: true }] }.
// v12 (spec v12 §6.5) : `morceaux` et `suite` ne sont présents que s'ils ne sont pas vides, et sur une seule ligne, celle
// d'une playlist Spotify. Un morceau ne garde que son identifiant, son titre et son artiste : le lien direct se fabrique à
// l'affichage (lienAOuvrir, formesDuMorceau), et aucun jeton n'est jamais écrit ici.
// Emozio ne propose aucune chanson. Pur : aucun réseau ici, un lien n'est jamais suivi, seulement relu.
// La méta vient aussi d'une sauvegarde, peut-être abîmée ou écrite à la main (point de vigilance 4) : à la lecture, un
// mauvais type, un lien d'un autre schéma, une ligne en trop ou une source inconnue sont ignorés ou remis en forme, sans
// erreur. Un nom reste du texte, jamais du HTML : c'est l'écran qui l'affiche comme tel.

// Trois playlists au plus (appel du concepteur, spec §8.1).
export const MAX_PLAYLISTS = 3;
// Le nom d'une playlist, coupé à ce nombre de signes (points de code : un emoji compte pour un, et n'est jamais coupé en deux).
// v12 : de même le titre et l'artiste d'un morceau.
export const NOM_MAX = 200;
// v12 (spec v12 §6.3) : 200 morceaux au plus, lus en 4 pages de 50 ; au-delà, `suite: true` dit que la suite est dans Spotify.
export const MAX_MORCEAUX = 200;
export const PAGES_MORCEAUX_MAX = 4;
// Un identifiant Spotify (playlist, morceau…) : 22 lettres ou chiffres. Vérifié avant d'écrire une adresse ou un lien.
export const ID_SPOTIFY = /^[A-Za-z0-9]{22}$/;

// Les seuls schémas acceptés, à la saisie comme à la lecture d'une sauvegarde (spec §8.2) : le web chiffré, l'app Spotify
// et l'app Musique.
const SCHEMAS_ACCEPTES = new Set(['https:', 'spotify:', 'music:']);
// Le lecteur public de Spotify, seul hôte gardé pour une playlist reçue de son compte.
const HOTE_SPOTIFY = 'open.spotify.com';

const estObjet = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
// Un texte propre (NFC, sans espaces autour), ou null : vide ou pas un texte.
const textePropre = (x) => (typeof x === 'string' ? x.normalize('NFC').trim() || null : null);
// Un texte propre coupé à NOM_MAX signes (points de code), ou null.
const texteCoupe = (x) => {
  const t = textePropre(x);
  return t && (Array.from(t).slice(0, NOM_MAX).join('').trim() || null);
};

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
// remis en forme (lienAccepte), ou null. v12 : aussi `spotify:playlist:<ID>`, tel quel, le repli quand Spotify ne donne pas
// `external_urls` (listePlaylists) ; un lien https vers open.spotify.com ne s'écrit jamais dans public/ (architecture.test.js).
const PLAYLIST_APP = /^spotify:playlist:[A-Za-z0-9]{22}$/;
export function lienDeSpotify(texte) {
  const url = lireUrl(texte);
  if (url && url.protocol === 'spotify:') {
    const propre = lienAccepte(url.href);
    return propre && PLAYLIST_APP.test(propre) ? propre : null;
  }
  if (!url || url.protocol !== 'https:' || url.hostname !== HOTE_SPOTIFY || url.port || url.username || url.password) return null;
  return lienAccepte(url.href);
}

// v12 (spec v12 §6.2) : le chemin d'un lien du lecteur public de Spotify, avec ou sans « intl-fr », et son type.
const TYPES_SPOTIFY = 'playlist|track|album|artist|episode|show';
const CHEMIN_SPOTIFY = new RegExp(`^/(?:intl-[a-z]{2}(?:-[a-z]{2})?/)?(${TYPES_SPOTIFY})/([A-Za-z0-9]{22})/?$`);
const HOTE_MUSIQUE = 'music.apple.com';
// Un lien https sans compte ni port vers cet hôte.
const nuVers = (url, hote) => url.protocol === 'https:' && url.hostname === hote && !url.port && !url.username && !url.password;

// L'identifiant d'une playlist Spotify, lu dans son lien web (open.spotify.com/playlist/<ID>) ou `spotify:playlist:<ID>` ;
// null pour tout autre lien. Seule une telle ligne peut porter des morceaux.
export function idPlaylistSpotify(lien) {
  const propre = lienAccepte(lien);
  if (!propre) return null;
  const url = new URL(propre);
  if (url.protocol === 'spotify:') return (/^playlist:([A-Za-z0-9]{22})$/.exec(url.pathname) || [])[1] || null;
  const m = nuVers(url, HOTE_SPOTIFY) && CHEMIN_SPOTIFY.exec(url.pathname);
  return m && m[1] === 'playlist' ? m[2] : null;
}

// Le lien qu'un toucher ouvre, fabriqué à l'affichage seulement : les données ne changent pas. Un lien web de Spotify
// devient le lien direct vers l'app (spotify:<type>:<ID>, sans « ?si= » ni autre paramètre), un lien de Musique devient
// music://… ; `spotify:` et `music:` restent tels quels, un autre lien https aussi. Un lien refusé ne donne rien.
export function lienAOuvrir(lien) {
  const propre = lienAccepte(lien);
  if (!propre) return null;
  const url = new URL(propre);
  if (url.protocol !== 'https:') return propre;
  const m = nuVers(url, HOTE_SPOTIFY) && CHEMIN_SPOTIFY.exec(url.pathname);
  if (m) return `spotify:${m[1]}:${m[2]}`;
  if (nuVers(url, HOTE_MUSIQUE)) return lienAccepte(`music://${url.hostname}${url.pathname}${url.search}`) || propre;
  return propre;
}

// Un morceau relu : un identifiant Spotify, un titre en texte (obligatoire), un artiste en texte ou null, coupés à NOM_MAX
// signes ; null sinon. Une clé inconnue est perdue. Le titre reste du texte, jamais du HTML.
function normaliserMorceau(m) {
  if (!estObjet(m) || typeof m.id !== 'string' || !ID_SPOTIFY.test(m.id)) return null;
  const titre = texteCoupe(m.titre);
  return titre ? { id: m.id, titre, artiste: texteCoupe(m.artiste) } : null;
}
const normaliserMorceaux = (liste) => (Array.isArray(liste) ? liste : []).map(normaliserMorceau).filter(Boolean).slice(0, MAX_MORCEAUX);

// Une playlist relue : nom en texte (coupé à NOM_MAX signes), lien vérifié selon sa source ; null si elle n'a ni nom ni
// lien. Avec la source Spotify, un lien refusé fait aussi perdre la source : l'app n'écrit jamais une ligne Spotify sans
// lien, et « Spotify » n'est nommé qu'à côté de ce qui vient de lui (spec §8.3). Le nom reste.
// v12 : des morceaux seulement si le lien est une playlist Spotify, MAX_MORCEAUX au plus, et `suite` seulement avec eux
// (true, rien d'autre). Vides, les deux champs sont absents : la ligne garde la forme de la v11.
function normaliserPlaylist(p) {
  if (!estObjet(p)) return null;
  const nom = texteCoupe(p.nom);
  const lien = p.source === 'spotify' ? lienDeSpotify(p.lien) : lienAccepte(p.lien);
  const source = p.source === 'spotify' && lien ? 'spotify' : null;
  if (!nom && !lien) return null;
  const morceaux = idPlaylistSpotify(lien) ? normaliserMorceaux(p.morceaux) : [];
  if (!morceaux.length) return { nom, lien, source };
  return { nom, lien, source, morceaux, ...(p.suite === true ? { suite: true } : {}) };
}

// La méta telle que l'app l'écrit et la lit. Un mauvais type rend des refuges vides ; les lignes sans nom ni lien
// disparaissent avant de compter les trois. v12 : une seule ligne garde ses morceaux, la première qui en a ; les autres
// les perdent, sans erreur.
export function normaliserRefuges(brut) {
  const r = estObjet(brut) ? brut : {};
  let porteuse = false;
  const playlists = (Array.isArray(r.playlists) ? r.playlists : []).map(normaliserPlaylist).filter(Boolean).slice(0, MAX_PLAYLISTS)
    .map((p) => {
      if (!p.morceaux) return p;
      if (!porteuse) { porteuse = true; return p; }
      return { nom: p.nom, lien: p.lien, source: p.source };
    });
  return { titres: textePropre(r.titres), playlists };
}

// Rien de noté : ni titre, ni playlist.
export function refugesVides(r) {
  const n = normaliserRefuges(r);
  return !n.titres && n.playlists.length === 0;
}

// Le nom affiché d'une playlist : le sien, sinon « Playlist 1 » (i : sa place dans la liste, à partir de 0).
export const nomPlaylist = (p, i) => (p && textePropre(p.nom)) || `Playlist ${i + 1}`;

// Une playlist écrite à la main dans Mes refuges (v11, tâche 6) : la ligne i change, ou s'ajoute à la fin quand i est au-delà
// des lignes notées (la ligne vide de l'écran), s'il en reste moins de trois. `changement` donne `nom`, `lien` ou les deux ;
// la source ne se donne pas ici. Un lien changé à la main fait perdre la source (ce qui est collé ne vient plus de Spotify) ;
// le même lien recollé, ou un nom changé, la garde. Tout repasse par la lecture : un lien refusé n'est pas gardé, sans erreur,
// et une ligne vidée de son nom et de son lien disparaît. Un indice qui n'en est pas un ne change rien.
// v12 : un lien changé vers une autre playlist fait perdre les morceaux, qui étaient ceux de l'ancienne ; la même playlist,
// même écrite autrement (spotify:playlist:<ID>), les garde.
export function avecPlaylist(r, i, changement) {
  const n = normaliserRefuges(r);
  if (!Number.isInteger(i) || i < 0) return n;
  const ch = estObjet(changement) ? changement : {};
  const ancienne = n.playlists[i];
  if (!ancienne && n.playlists.length >= MAX_PLAYLISTS) return n;
  const ligne = { ...(ancienne || { nom: null, lien: null, source: null }) };
  if ('nom' in ch) ligne.nom = ch.nom;
  if ('lien' in ch) {
    if (lienAccepte(ch.lien) !== ligne.lien) ligne.source = null;
    if (idPlaylistSpotify(ch.lien) !== idPlaylistSpotify(ligne.lien)) { delete ligne.morceaux; delete ligne.suite; }
    ligne.lien = ch.lien;
  }
  const playlists = ancienne ? n.playlists.map((p, k) => (k === i ? ligne : p)) : [...n.playlists, ligne];
  return normaliserRefuges({ ...n, playlists });
}

// v12 (spec v12 §6.2) : les deux formes d'un morceau que le Diagnostic essaie sur l'iPhone, le morceau seul et le morceau
// dans sa playlist (le contexte est un essai). La seconde seulement si `playlist` est la ligne d'une playlist Spotify. Un
// morceau sans identifiant valable n'en a aucune. Rien n'est suivi ici.
export function formesDuMorceau(morceau, playlist) {
  const id = estObjet(morceau) && typeof morceau.id === 'string' && ID_SPOTIFY.test(morceau.id) ? morceau.id : null;
  if (!id) return [];
  const formes = [{ nom: 'Morceau seul', href: `spotify:track:${id}` }];
  const pid = idPlaylistSpotify(estObjet(playlist) ? playlist.lien : null);
  if (pid) formes.push({ nom: 'Morceau dans sa playlist', href: `spotify:track:${id}?context=${encodeURIComponent(`spotify:playlist:${pid}`)}` });
  return formes;
}

// ---------- Choisir dans son compte Spotify (v11, tâche 7, spec §8.3) ----------
// Une page de la réponse de Spotify (GET /v1/me/playlists) : le nom et le lien de chaque playlist, pas ses chansons. Un
// élément `null` ou d'une autre forme, et un lien hors du lecteur public (lienDeSpotify), sont écartés. Le nom est lu comme
// texte seulement (coupé à NOM_MAX signes), jamais comme du HTML ; sans nom, l'écran dit « Playlist 2 ». Une réponse d'une
// autre forme ne donne rien. v12 : sans lien du lecteur public, l'identifiant valable donne spotify:playlist:<ID>.
export function listePlaylists(json) {
  const items = estObjet(json) && Array.isArray(json.items) ? json.items : [];
  return items.map((item) => {
    if (!estObjet(item)) return null;
    const lien = lienDeSpotify(estObjet(item.external_urls) ? item.external_urls.spotify : null)
      || (typeof item.id === 'string' && ID_SPOTIFY.test(item.id) ? `spotify:playlist:${item.id}` : null);
    if (!lien) return null;
    return { nom: texteCoupe(item.name), lien };
  }).filter(Boolean);
}

// v12 (spec v12 §6.3) : une page de GET /v1/playlists/{id}/items. Chaque entrée porte `item` depuis février 2026 (`track`
// avant). Sont écartés une entrée ou un morceau null, un fichier local, ce qui n'est pas un morceau (un épisode), un
// identifiant invalide et un morceau sans titre. L'artiste : les noms joints par « , », ou null. Les doublons restent ;
// ni pochette, ni lien, ni date ne sont lus. Une réponse d'une autre forme ne donne rien.
export function listeMorceaux(json) {
  const entrees = estObjet(json) && Array.isArray(json.items) ? json.items : [];
  return entrees.map((entree) => {
    if (!estObjet(entree) || entree.is_local === true) return null;
    const m = entree.item ?? entree.track;
    if (!estObjet(m) || m.is_local === true || m.type !== 'track') return null;
    const noms = Array.isArray(m.artists) ? m.artists.map((a) => (estObjet(a) ? textePropre(a.name) : null)).filter(Boolean) : [];
    return normaliserMorceau({ id: m.id, titre: m.name, artiste: noms.join(', ') });
  }).filter(Boolean);
}

// v12 : la playlist suivie, celle dont Mes refuges montre les morceaux : la première ligne qui en a, sinon la première dont
// le lien est une playlist Spotify ; null sinon. i : sa place dans les refuges relus.
export function playlistSuivie(r) {
  const { playlists } = normaliserRefuges(r);
  let i = playlists.findIndex((p) => p.morceaux);
  if (i < 0) i = playlists.findIndex((p) => idPlaylistSpotify(p.lien));
  return i < 0 ? null : { p: playlists[i], i };
}

// v12 (spec v12 §6.4 et §6.5) : une playlist choisie dans le compte, avec ses morceaux (aucun si Spotify ne les donne pas).
// Le choix est unique : elle remplace la ligne suivie, même collée à la main, ou s'ajoute à la fin s'il y a moins de trois
// lignes ; sinon rien ne change. Les autres lignes restent telles quelles. Un lien hors du lecteur public ne change rien.
export function choisirSpotify(r, choix) {
  const n = normaliserRefuges(r);
  const c = estObjet(choix) ? choix : {};
  const lien = lienDeSpotify(c.lien);
  if (!lien) return n;
  const ligne = { nom: c.nom, lien, source: 'spotify', morceaux: c.morceaux, suite: c.suite };
  const suivie = playlistSuivie(n);
  if (suivie) return normaliserRefuges({ ...n, playlists: n.playlists.map((p, k) => (k === suivie.i ? ligne : p)) });
  if (n.playlists.length >= MAX_PLAYLISTS) return n;
  return normaliserRefuges({ ...n, playlists: [...n.playlists, ligne] });
}

// v12 (6/9, spec v12 §6.3) : « Mettre à jour la liste » ne choisit rien. Les morceaux relus chez Spotify remplacent ceux de
// la playlist suivie, si c'est toujours la playlist `id` (son lien a pu changer pendant la connexion) ; son nom, son lien et
// sa source restent, qu'elle ait été collée ou choisie. Une autre playlist, ou plus de playlist suivie : rien ne change.
// Aucun morceau (une playlist vidée chez Spotify) : le champ part, et `suite` avec lui.
export function avecMorceaux(r, id, lecture) {
  const n = normaliserRefuges(r);
  const suivie = playlistSuivie(n);
  if (!suivie || typeof id !== 'string' || !ID_SPOTIFY.test(id) || idPlaylistSpotify(suivie.p.lien) !== id) return n;
  const l = estObjet(lecture) ? lecture : {};
  const ligne = { nom: suivie.p.nom, lien: suivie.p.lien, source: suivie.p.source, morceaux: l.morceaux, suite: l.suite };
  return normaliserRefuges({ ...n, playlists: n.playlists.map((p, k) => (k === suivie.i ? ligne : p)) });
}

// « Retirer ces playlists » : les lignes venues de Spotify partent ; les lignes collées à la main et les titres restent.
export function sansSpotify(r) {
  const n = normaliserRefuges(r);
  return { ...n, playlists: n.playlists.filter((p) => p.source !== 'spotify') };
}
