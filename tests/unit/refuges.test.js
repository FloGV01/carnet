// Mes refuges (v11, spec §8) : les liens acceptés, ceux de Spotify, et la méta `refuges` remise en forme (point de
// vigilance 4 : une sauvegarde abîmée ou écrite à la main). Aucun lien n'est suivi : ils sont seulement relus.
// v12 (spec §6) : le lien direct fabriqué à l'affichage, les morceaux de la playlist suivie, le choix unique dans le compte.
// Le dépôt est public : morceaux, titres, artistes et identifiants sont inventés (identifiants factices de 22 signes).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_PLAYLISTS, NOM_MAX, lienAccepte, lienDeSpotify, normaliserRefuges, refugesVides, nomPlaylist,
  avecPlaylist, listePlaylists, sansSpotify,
  MAX_MORCEAUX, PAGES_MORCEAUX_MAX, ID_SPOTIFY, lienAOuvrir, idPlaylistSpotify, listeMorceaux, choisirSpotify, playlistSuivie,
  formesDuMorceau, avecMorceaux,
} from '../../public/js/domain/refuges.js';

// Un identifiant factice de 22 signes, lisible : « pl1 » donne « pl10000000000000000000 ».
const idFactice = (debut) => debut.padEnd(22, '0');

test('lienAccepte : https, spotify et music seulement, sans espaces autour, sans le paramètre de partage « si »', () => {
  assert.equal(lienAccepte('  https://open.spotify.com/playlist/abc?si=xyz '), 'https://open.spotify.com/playlist/abc');
  assert.equal(lienAccepte('https://open.spotify.com/playlist/abc?a=1&si=x'), 'https://open.spotify.com/playlist/abc?a=1');
  assert.equal(lienAccepte('https://open.spotify.com/playlist/abc?si=x&a=1'), 'https://open.spotify.com/playlist/abc?a=1');
  assert.equal(lienAccepte('https://open.spotify.com/playlist/abc?sid=1'), 'https://open.spotify.com/playlist/abc?sid=1', 'seul « si » part');
  assert.equal(lienAccepte('https://music.apple.com/fr/playlist/x'), 'https://music.apple.com/fr/playlist/x');
  assert.equal(lienAccepte('spotify:playlist:abc'), 'spotify:playlist:abc');
  assert.equal(lienAccepte('music://music.apple.com/fr/playlist/x'), 'music://music.apple.com/fr/playlist/x');
  for (const x of ['javascript:alert(1)', 'JavaScript:alert(1)', 'data:text/html,x', 'http://open.spotify.com/x', 'ftp://x', 'file:///etc/passwd',
    'open.spotify.com/playlist/abc', '', '   ', null, undefined, 12, true, {}, ['https://open.spotify.com/x']]) {
    assert.equal(lienAccepte(x), null, JSON.stringify(x));
  }
});

test('lienDeSpotify : le lecteur public seul, en https, à l\'hôte exact, sans compte ni port', () => {
  assert.equal(lienDeSpotify('https://open.spotify.com/playlist/abc'), 'https://open.spotify.com/playlist/abc');
  assert.equal(lienDeSpotify(' https://open.spotify.com/playlist/abc?si=1 '), 'https://open.spotify.com/playlist/abc');
  for (const x of ['https://open.spotify.com.autre.test/p', 'https://x@open.spotify.com/p', 'https://x:y@open.spotify.com/p',
    'https://open.spotify.com:8443/p', 'spotify:playlist:abc', 'http://open.spotify.com/p', 'https://spotify.com/p', 'https://autre.test/open.spotify.com',
    'javascript:alert(1)', '', null, 12]) {
    assert.equal(lienDeSpotify(x), null, JSON.stringify(x));
  }
});

// v12 (spec §6.5) : le repli quand Spotify ne donne pas `external_urls`. Seulement une playlist, d'un identifiant de 22 signes.
test('lienDeSpotify : accepte aussi spotify:playlist:ID, avec un identifiant de 22 signes, et rien d\'autre en spotify:', () => {
  const id = idFactice('pl1');
  assert.equal(lienDeSpotify(`spotify:playlist:${id}`), `spotify:playlist:${id}`);
  assert.equal(lienDeSpotify(`  spotify:playlist:${id}?si=abc `), `spotify:playlist:${id}`, '« ?si= » part, comme pour un lien collé');
  for (const x of [`spotify:playlist:${id.slice(1)}`, `spotify:playlist:${id}x`, `spotify:track:${id}`, `spotify:album:${id}`, `spotify:playlist:${id}?a=1`,
    `spotify:playlist:${id.slice(2)}-_`, 'spotify:playlist:../x', `spotify:user:x:playlist:${id}`, `music://music.apple.com/fr/playlist/${id}`]) {
    assert.equal(lienDeSpotify(x), null, x);
  }
});

test('normaliserRefuges : la forme que l\'app écrit ; titres en texte propre, trois playlists au plus, un lien vérifié selon sa source', () => {
  assert.equal(MAX_PLAYLISTS, 3);
  const brut = {
    titres: '  Une chanson calme\nUne autre  ',
    playlists: [
      { nom: '  Pour souffler ', lien: ' https://open.spotify.com/playlist/abc?si=1 ', source: 'spotify' },
      { nom: 'Sans lien' },
      { lien: 'spotify:playlist:abc', source: 'deezer' },
      { nom: 'De trop', lien: 'https://open.spotify.com/playlist/d' },
    ],
  };
  const avant = structuredClone(brut);
  assert.deepEqual(normaliserRefuges(brut), {
    titres: 'Une chanson calme\nUne autre',
    playlists: [
      { nom: 'Pour souffler', lien: 'https://open.spotify.com/playlist/abc', source: 'spotify' },
      { nom: 'Sans lien', lien: null, source: null },
      { nom: null, lien: 'spotify:playlist:abc', source: null },
    ],
  });
  assert.deepEqual(brut, avant, 'l\'objet reçu n\'est pas modifié');
  // Une forme déjà propre ne change pas.
  const propre = normaliserRefuges(brut);
  assert.deepEqual(normaliserRefuges(propre), propre);
});

// Point de vigilance 4.
test('normaliserRefuges : mauvais type, lien piégé, playlist en trop, nom en HTML, Spotify sur un autre hôte ; ignoré ou remis en forme, sans erreur', () => {
  const vides = { titres: null, playlists: [] };
  for (const x of [undefined, null, 'du texte', 12, true, [], [{ titres: 'x' }], { titres: 12, playlists: 'x' }, { playlists: { 0: { nom: 'x' } } }]) {
    assert.deepEqual(normaliserRefuges(x), vides, JSON.stringify(x));
  }
  const r = normaliserRefuges({
    titres: ['pas un texte'],
    playlists: [
      null, 'texte', 12, [],
      { nom: '', lien: '' }, { nom: '   ', lien: 'javascript:alert(1)' }, { nom: 12, lien: 'data:text/html,x' },
      { nom: '<b onclick="x()">Gras</b>', lien: 'javascript:alert(1)' },
      { nom: 'Spotify ailleurs', lien: 'https://open.spotify.com.autre.test/p', source: 'spotify' },
      { nom: 'Compte', lien: 'https://x@open.spotify.com/p', source: 'spotify' },
      { nom: 'Quatrième', lien: 'https://open.spotify.com/playlist/q' },
      { nom: 'Cinquième', lien: 'https://open.spotify.com/playlist/c' },
    ],
  });
  // Un lien refusé fait aussi perdre la source : « Spotify » ne va qu'à ce qui vient de lui (spec §8.3). Le nom reste.
  assert.deepEqual(r, {
    titres: null,
    playlists: [
      { nom: '<b onclick="x()">Gras</b>', lien: null, source: null },
      { nom: 'Spotify ailleurs', lien: null, source: null },
      { nom: 'Compte', lien: null, source: null },
    ],
  });
  // Un lien de son lecteur public, mais sans source Spotify : accepté comme un lien collé.
  assert.deepEqual(normaliserRefuges({ playlists: [{ lien: 'https://open.spotify.com/playlist/p', source: 'autre' }] }).playlists,
    [{ nom: null, lien: 'https://open.spotify.com/playlist/p', source: null }]);
  // Un nom très long est coupé ; les clés inconnues (un jeton glissé à la main) ne sont jamais reprises.
  const long = normaliserRefuges({ jeton: 'secret', playlists: [{ nom: 'x'.repeat(5000), lien: null, jeton: 'secret' }] });
  assert.equal(long.playlists[0].nom.length, NOM_MAX);
  assert.ok(!JSON.stringify(long).includes('secret'));
});

// Relecture de la tâche 1 : la coupe compte en signes, jamais en demi-emoji.
test('normaliserRefuges : un nom coupé à NOM_MAX signes, un emoji compté pour un, sans en garder la moitié', () => {
  const [p] = normaliserRefuges({ playlists: [{ nom: `${'x'.repeat(199)}😀yy` }] }).playlists;
  assert.equal(p.nom, `${'x'.repeat(199)}😀`);
  assert.equal([...p.nom].length, NOM_MAX);
  assert.equal(p.nom.isWellFormed(), true, 'aucune paire de substitution coupée en deux');
  // Rien que des emoji : 200 entiers, pas 100.
  const [q] = normaliserRefuges({ playlists: [{ nom: '🎵'.repeat(300) }] }).playlists;
  assert.equal(q.nom, '🎵'.repeat(NOM_MAX));
  assert.equal(q.nom.isWellFormed(), true);
  // Déjà coupé, il ne change plus.
  const une = normaliserRefuges({ playlists: [p, q] });
  assert.deepEqual(normaliserRefuges(une), une);
});

// Relecture de la tâche 1 : l'app n'écrit jamais une ligne Spotify sans lien, la relecture non plus.
test('normaliserRefuges : avec la source Spotify, un lien refusé fait perdre la source ; jamais de ligne Spotify sans lien', () => {
  assert.deepEqual(normaliserRefuges({ playlists: [
    { nom: 'Lien collé', lien: 'spotify:playlist:abc', source: 'spotify' },
    { nom: 'Sans lien', source: 'spotify' },
    { lien: 'https://open.spotify.com.autre.test/p', source: 'spotify' },
    { nom: 'Bonne', lien: 'https://open.spotify.com/playlist/b', source: 'spotify' },
  ] }).playlists, [
    { nom: 'Lien collé', lien: null, source: null },
    { nom: 'Sans lien', lien: null, source: null },
    { nom: 'Bonne', lien: 'https://open.spotify.com/playlist/b', source: 'spotify' },
  ], 'le nom reste, une ligne sans nom ni lien disparaît');
  // L'invariant, sur toutes les lignes possibles : source Spotify ⇒ un lien de son lecteur public.
  const liens = [undefined, null, '', 'javascript:alert(1)', 'spotify:playlist:abc', 'https://autre.test/p', 'https://open.spotify.com/playlist/b?si=1'];
  for (const lien of liens) {
    for (const source of [undefined, null, 'spotify', 'deezer']) {
      for (const p of normaliserRefuges({ playlists: [{ nom: 'N', lien, source }] }).playlists) {
        if (p.source === 'spotify') assert.equal(p.lien, lienDeSpotify(p.lien), JSON.stringify({ lien, source }));
        assert.ok(p.source !== 'spotify' || p.lien, JSON.stringify({ lien, source }));
      }
    }
  }
});

test('refugesVides et nomPlaylist', () => {
  for (const x of [null, {}, { titres: '  ', playlists: [] }, { playlists: [{ nom: '', lien: 'ftp://x' }] }, 'texte']) assert.equal(refugesVides(x), true, JSON.stringify(x));
  assert.equal(refugesVides({ titres: 'Une chanson' }), false);
  assert.equal(refugesVides({ playlists: [{ nom: 'Sans lien' }] }), false);
  assert.equal(refugesVides({ playlists: [{ lien: 'spotify:playlist:abc' }] }), false);

  assert.equal(nomPlaylist({ nom: 'Pour souffler' }, 0), 'Pour souffler');
  assert.equal(nomPlaylist({ nom: null, lien: 'spotify:playlist:abc' }, 0), 'Playlist 1');
  assert.equal(nomPlaylist({ nom: '   ' }, 2), 'Playlist 3');
  assert.equal(nomPlaylist(null, 1), 'Playlist 2');
});

// v11 (6/11) · L'écran Mes refuges écrit une playlist à la main : la ligne i change, ou s'ajoute à la fin.
const SPOTIFY = { nom: 'Pour souffler', lien: 'https://open.spotify.com/playlist/abc', source: 'spotify' };
test('avecPlaylist : change la ligne i (nom, lien), ou l\'ajoute à la fin ; le lien vérifié comme à la lecture ; l\'objet reçu intact', () => {
  const r = { titres: 'Une chanson', playlists: [SPOTIFY, { nom: 'Pour dormir', lien: null, source: null }] };
  const avant = structuredClone(r);
  assert.deepEqual(avecPlaylist(r, 1, { lien: ' https://music.apple.com/fr/playlist/x?si=1 ' }), {
    titres: 'Une chanson',
    playlists: [SPOTIFY, { nom: 'Pour dormir', lien: 'https://music.apple.com/fr/playlist/x', source: null }],
  });
  assert.deepEqual(avecPlaylist(r, 1, { nom: '  Pour la nuit ' }).playlists[1], { nom: 'Pour la nuit', lien: null, source: null });
  // La ligne vide de l'écran, au bout : elle s'ajoute, à la fin, quel que soit son indice.
  assert.deepEqual(avecPlaylist(r, 2, { nom: 'Pour marcher' }).playlists, [...r.playlists, { nom: 'Pour marcher', lien: null, source: null }]);
  assert.deepEqual(avecPlaylist(r, 7, { lien: 'spotify:playlist:m' }).playlists[2], { nom: null, lien: 'spotify:playlist:m', source: null });
  assert.deepEqual(r, avant, 'l\'objet reçu n\'est pas modifié');
  // Des refuges abîmés ou absents se lisent d'abord, comme à la lecture.
  assert.deepEqual(avecPlaylist(null, 0, { nom: 'Seule' }), { titres: null, playlists: [{ nom: 'Seule', lien: null, source: null }] });
  assert.deepEqual(avecPlaylist('abîmé', 0, { lien: 'javascript:alert(1)' }), { titres: null, playlists: [] });
  // Un indice qui n'en est pas un : rien ne change.
  for (const i of [-1, 1.5, '0', null, undefined, NaN]) assert.deepEqual(avecPlaylist(r, i, { nom: 'x' }), normaliserRefuges(r), String(i));
  // La source ne se donne pas ici : seul « Choisir dans mon compte » l'écrit (tâche 7).
  assert.deepEqual(avecPlaylist(r, 2, { nom: 'x', lien: 'https://open.spotify.com/playlist/q', source: 'spotify' }).playlists[2],
    { nom: 'x', lien: 'https://open.spotify.com/playlist/q', source: null });
});

test('avecPlaylist : trois playlists au plus ; une quatrième ne s\'ajoute pas', () => {
  const pleines = { playlists: [{ nom: 'Une' }, { nom: 'Deux' }, { nom: 'Trois' }] };
  const n = normaliserRefuges(pleines);
  assert.equal(n.playlists.length, MAX_PLAYLISTS);
  assert.deepEqual(avecPlaylist(pleines, 3, { nom: 'Quatre' }), n);
  assert.deepEqual(avecPlaylist(pleines, 9, { lien: 'https://open.spotify.com/playlist/q' }), n);
  // La troisième se change encore.
  assert.equal(avecPlaylist(pleines, 2, { nom: 'Autre' }).playlists[2].nom, 'Autre');
});

test('avecPlaylist : un lien changé à la main remet la source à null ; le nom changé, ou le même lien recollé, la garde', () => {
  const r = { playlists: [SPOTIFY] };
  assert.deepEqual(avecPlaylist(r, 0, { lien: 'https://open.spotify.com/playlist/autre' }).playlists[0],
    { nom: 'Pour souffler', lien: 'https://open.spotify.com/playlist/autre', source: null });
  assert.deepEqual(avecPlaylist(r, 0, { lien: 'spotify:playlist:abc' }).playlists[0], { nom: 'Pour souffler', lien: 'spotify:playlist:abc', source: null });
  assert.deepEqual(avecPlaylist(r, 0, { nom: 'Pour respirer' }).playlists[0], { ...SPOTIFY, nom: 'Pour respirer' });
  assert.deepEqual(avecPlaylist(r, 0, { lien: ' https://open.spotify.com/playlist/abc?si=2 ' }).playlists[0], SPOTIFY);
  // Un lien refusé n'est pas gardé : la ligne garde son nom, sans lien ni source.
  assert.deepEqual(avecPlaylist(r, 0, { lien: 'javascript:alert(1)' }).playlists[0], { nom: 'Pour souffler', lien: null, source: null });
  assert.deepEqual(avecPlaylist(r, 0, { lien: null }).playlists[0], { nom: 'Pour souffler', lien: null, source: null });
});

test('avecPlaylist : une ligne vidée de son nom et de son lien disparaît, et les suivantes remontent', () => {
  const r = { playlists: [{ nom: 'Une', lien: null }, { nom: 'Deux', lien: 'spotify:playlist:d' }, { nom: 'Trois' }] };
  assert.deepEqual(avecPlaylist(r, 0, { nom: '   ' }).playlists.map((p) => p.nom), ['Deux', 'Trois']);
  assert.deepEqual(avecPlaylist(avecPlaylist(r, 1, { nom: null }), 1, { lien: '' }).playlists.map((p) => p.nom), ['Une', 'Trois']);
  assert.deepEqual(avecPlaylist({ playlists: [{ lien: 'spotify:playlist:d' }] }, 0, { lien: 'ftp://x' }), { titres: null, playlists: [] });
});

// ---------- Choisir dans son compte Spotify (v11, tâche 7, spec §8.3) ----------

// Une page de réponse de Spotify, abîmée exprès : élément null, lien d'un autre hôte, nom piégé (point de vigilance 5).
test('listePlaylists : le nom (en texte) et le lien du lecteur public ; un élément null, sans lien ou d\'un autre hôte est écarté', () => {
  const json = {
    items: [
      { name: '  Pour souffler ', external_urls: { spotify: 'https://open.spotify.com/playlist/a1?si=x' }, id: 'a1', tracks: { total: 12 } },
      null,
      { name: 'Ailleurs', external_urls: { spotify: 'https://autre.test/playlist/b' } },
      { name: 'Piège', external_urls: { spotify: 'javascript:alert(1)' } },
      { name: 'Sans lien' },
      { name: 'Lien qui n\'est pas un texte', external_urls: { spotify: 12 } },
      { name: '<img src=x onerror=alert(1)>', external_urls: { spotify: 'https://open.spotify.com/playlist/c3' } },
      { name: 42, external_urls: { spotify: 'https://open.spotify.com/playlist/d4' } },
      { name: 'x'.repeat(NOM_MAX + 20), external_urls: { spotify: 'https://open.spotify.com/playlist/e5' } },
      'texte', 12, ['https://open.spotify.com/playlist/f6'],
    ],
  };
  assert.deepEqual(listePlaylists(json), [
    { nom: 'Pour souffler', lien: 'https://open.spotify.com/playlist/a1' },
    { nom: '<img src=x onerror=alert(1)>', lien: 'https://open.spotify.com/playlist/c3' },
    { nom: null, lien: 'https://open.spotify.com/playlist/d4' },
    { nom: 'x'.repeat(NOM_MAX), lien: 'https://open.spotify.com/playlist/e5' },
  ]);
  for (const x of [null, undefined, 12, 'texte', [], {}, { items: null }, { items: 'x' }, { items: {} }]) assert.deepEqual(listePlaylists(x), [], JSON.stringify(x));
});

const DE_SPOTIFY = (n) => ({ nom: `Compte ${n}`, lien: `https://open.spotify.com/playlist/s${n}` });

test('sansSpotify : les lignes venues de Spotify partent ; les lignes collées à la main et les titres restent', () => {
  const r = {
    titres: 'Pluie lente',
    playlists: [{ ...DE_SPOTIFY(1), source: 'spotify' }, { nom: 'Collée', lien: 'https://open.spotify.com/playlist/m', source: null }, { ...DE_SPOTIFY(2), source: 'spotify' }],
  };
  assert.deepEqual(sansSpotify(r), { titres: 'Pluie lente', playlists: [{ nom: 'Collée', lien: 'https://open.spotify.com/playlist/m', source: null }] });
  assert.deepEqual(sansSpotify({ playlists: [{ ...DE_SPOTIFY(1), source: 'spotify' }] }), { titres: null, playlists: [] });
  assert.equal(refugesVides(sansSpotify({ playlists: [{ ...DE_SPOTIFY(1), source: 'spotify' }] })), true);
  assert.deepEqual(sansSpotify(null), { titres: null, playlists: [] });
});

// ---------- v12 : le lien direct, les morceaux de la playlist suivie (spec §6) ----------

const PL = idFactice('pl1');
const PL2 = idFactice('pl2');
const LIEN_PL = `https://open.spotify.com/playlist/${PL}`;
const LIEN_PL2 = `https://open.spotify.com/playlist/${PL2}`;
// Des morceaux inventés, dans la forme que l'app écrit.
const morceau = (n, artiste = 'Les Vagues Douces') => ({ id: idFactice(`mo${n}`), titre: `Pluie lente ${n}`, artiste });
const morceaux = (k) => Array.from({ length: k }, (_, i) => morceau(i + 1));

test('v12 : les constantes des morceaux ; l\'identifiant Spotify a 22 signes, lettres et chiffres', () => {
  assert.equal(MAX_MORCEAUX, 200);
  assert.equal(PAGES_MORCEAUX_MAX, 4);
  assert.equal(MAX_MORCEAUX, PAGES_MORCEAUX_MAX * 50, '4 pages de 50');
  assert.equal(ID_SPOTIFY.test(PL), true);
  for (const x of [PL.slice(1), `${PL}x`, `${PL.slice(1)}-`, `${PL.slice(1)}_`, `${PL.slice(1)}é`, '../../../../../../me/x', '', ` ${PL.slice(1)}`]) {
    assert.equal(ID_SPOTIFY.test(x), false, x);
  }
});

test('v12 : lienAOuvrir, le lien direct vers l\'app, fabriqué à l\'affichage ; un lien refusé ne donne rien', () => {
  for (const type of ['playlist', 'track', 'album', 'artist', 'episode', 'show']) {
    assert.equal(lienAOuvrir(`https://open.spotify.com/${type}/${PL}`), `spotify:${type}:${PL}`, type);
  }
  assert.equal(lienAOuvrir(` https://open.spotify.com/playlist/${PL}?si=abc `), `spotify:playlist:${PL}`, 'sans « ?si= »');
  assert.equal(lienAOuvrir(`https://open.spotify.com/intl-fr/playlist/${PL}?si=abc&pt=x`), `spotify:playlist:${PL}`, 'intl-fr et tout paramètre retirés');
  assert.equal(lienAOuvrir(`https://open.spotify.com/intl-pt-br/track/${PL}/`), `spotify:track:${PL}`);
  // Déjà vers l'app : tel quel.
  assert.equal(lienAOuvrir(`spotify:playlist:${PL}`), `spotify:playlist:${PL}`);
  assert.equal(lienAOuvrir('spotify:playlist:abc'), 'spotify:playlist:abc');
  assert.equal(lienAOuvrir('music://music.apple.com/fr/playlist/x'), 'music://music.apple.com/fr/playlist/x');
  // Musique : vers l'app aussi (non vérifié sur l'iPhone, même raisonnement).
  assert.equal(lienAOuvrir('https://music.apple.com/fr/playlist/calme/pl.u-abc?si=1'), 'music://music.apple.com/fr/playlist/calme/pl.u-abc');
  // Un autre lien https, ou Spotify sans un chemin reconnu : tel quel.
  for (const lien of ['https://autre.test/playlist/x', 'https://spotify.link/abc', `https://open.spotify.com/playlist/${PL.slice(1)}`,
    `https://open.spotify.com/user/x/playlist/${PL}`, `https://open.spotify.com/playlist/${PL}/autre`, 'https://open.spotify.com/',
    `https://open.spotify.com:8443/playlist/${PL}`, `https://x@open.spotify.com/playlist/${PL}`, `https://open.spotify.com.autre.test/playlist/${PL}`,
    'https://music.apple.com.autre.test/fr/playlist/x']) {
    assert.equal(lienAOuvrir(lien), lienAccepte(lien), lien);
  }
  for (const x of ['javascript:alert(1)', `http://open.spotify.com/playlist/${PL}`, 'data:text/html,x', 'ftp://x', '', '  ', null, undefined, 12, {}]) {
    assert.equal(lienAOuvrir(x), null, JSON.stringify(x));
  }
  // Chaque lien rendu est un lien que l'app accepte, et ne change plus.
  for (const lien of [LIEN_PL, `https://open.spotify.com/track/${PL}?si=1`, 'https://music.apple.com/fr/playlist/x', 'https://autre.test/p']) {
    const ouvert = lienAOuvrir(lien);
    assert.equal(lienAccepte(ouvert), ouvert, lien);
    assert.equal(lienAOuvrir(ouvert), ouvert, lien);
  }
});

test('v12 : idPlaylistSpotify lit le lien web et spotify:playlist: ; rien d\'autre', () => {
  assert.equal(idPlaylistSpotify(LIEN_PL), PL);
  assert.equal(idPlaylistSpotify(` ${LIEN_PL}?si=abc `), PL);
  assert.equal(idPlaylistSpotify(`https://open.spotify.com/intl-fr/playlist/${PL}/`), PL);
  assert.equal(idPlaylistSpotify(`spotify:playlist:${PL}`), PL);
  for (const x of [`https://open.spotify.com/track/${PL}`, `https://open.spotify.com/album/${PL}`, `https://open.spotify.com/playlist/${PL.slice(1)}`,
    `https://open.spotify.com/playlist/${PL}0`, 'https://open.spotify.com/playlist/abc', `https://open.spotify.com:8443/playlist/${PL}`,
    `https://x@open.spotify.com/playlist/${PL}`, `https://autre.test/playlist/${PL}`, `http://open.spotify.com/playlist/${PL}`, `spotify:track:${PL}`,
    `spotify:playlist:${PL.slice(1)}`, `music://music.apple.com/fr/playlist/${PL}`, 'javascript:alert(1)', '', null, undefined, 12, {}]) {
    assert.equal(idPlaylistSpotify(x), null, JSON.stringify(x));
  }
});

test('v12 : normaliserRefuges garde les morceaux sur la ligne d\'une playlist Spotify ; une forme déjà propre ne change pas', () => {
  const r = {
    titres: 'Une chanson calme',
    playlists: [
      { nom: 'Collée', lien: 'https://music.apple.com/fr/playlist/x', source: null },
      { nom: 'Pour souffler', lien: LIEN_PL, source: 'spotify', morceaux: [morceau(1), morceau(2, null)], suite: true },
    ],
  };
  const avant = structuredClone(r);
  assert.deepEqual(normaliserRefuges(r), r);
  assert.deepEqual(r, avant, 'l\'objet reçu n\'est pas modifié');
  assert.deepEqual(Object.keys(normaliserRefuges(r).playlists[1]), ['nom', 'lien', 'source', 'morceaux', 'suite'], 'toujours dans le même ordre');
  // Sur une ligne collée, avec spotify:playlist:, ils restent aussi.
  const collee = { playlists: [{ nom: null, lien: `spotify:playlist:${PL}`, source: null, morceaux: [morceau(1)] }] };
  assert.deepEqual(normaliserRefuges(collee), { titres: null, ...collee });
  // Sans morceaux, la ligne garde la forme de la v11, sans champ vide.
  assert.deepEqual(Object.keys(normaliserRefuges({ playlists: [{ nom: 'x', lien: LIEN_PL, morceaux: [], suite: true }] }).playlists[0]), ['nom', 'lien', 'source']);
});

// Point de vigilance 2 : une sauvegarde abîmée ou modifiée à la main.
test('v12 : normaliserRefuges, des morceaux abîmés ou en trop sont remis en forme, sans erreur', () => {
  const ligne = (morceauxBruts, extra = {}) => normaliserRefuges({ playlists: [{ nom: 'P', lien: LIEN_PL, source: 'spotify', morceaux: morceauxBruts, ...extra }] }).playlists[0];
  // Une ligne qui n'est pas une playlist Spotify ne garde pas de morceaux.
  for (const lien of ['https://music.apple.com/fr/playlist/x', 'https://open.spotify.com/playlist/abc', `https://open.spotify.com/album/${PL}`,
    `spotify:track:${PL}`, 'https://autre.test/p', null]) {
    const [p] = normaliserRefuges({ playlists: [{ nom: 'P', lien, morceaux: [morceau(1)], suite: true }] }).playlists;
    assert.ok(!('morceaux' in p) && !('suite' in p), String(lien));
  }
  // Sur deux lignes : la première qui en a les garde, seule.
  const deux = normaliserRefuges({ playlists: [
    { nom: 'Sans', lien: 'https://autre.test/p', morceaux: [morceau(9)] },
    { nom: 'Une', lien: LIEN_PL, morceaux: [{ id: 'abîmé' }], suite: true },
    { nom: 'Deux', lien: LIEN_PL2, source: 'spotify', morceaux: [morceau(1)], suite: true },
    { nom: 'Trois', lien: `spotify:playlist:${PL}`, morceaux: [morceau(2)] },
  ] }).playlists;
  assert.deepEqual(deux, [
    { nom: 'Sans', lien: 'https://autre.test/p', source: null },
    { nom: 'Une', lien: LIEN_PL, source: null },
    { nom: 'Deux', lien: LIEN_PL2, source: 'spotify', morceaux: [morceau(1)], suite: true },
  ], 'des morceaux tous abîmés ne comptent pas ; la quatrième ligne part avec les siens');
  assert.equal(normaliserRefuges({ playlists: [
    { nom: 'Une', lien: LIEN_PL, morceaux: [morceau(1)] }, { nom: 'Deux', lien: LIEN_PL2, morceaux: [morceau(2)], suite: true },
  ] }).playlists.filter((p) => p.morceaux || p.suite).length, 1);
  // 201 morceaux : 200 ; les doublons restent.
  assert.deepEqual(ligne([...morceaux(201)]).morceaux, morceaux(200));
  assert.deepEqual(ligne([morceau(1), morceau(1)]).morceaux, [morceau(1), morceau(1)]);
  // Identifiants : 22 signes, lettres et chiffres seulement.
  const ids = [idFactice('mo1').slice(1), `${idFactice('mo1')}0`, '../x', `${idFactice('mo1').slice(2)}-_`, 12, null, undefined, { id: 'x' }];
  assert.deepEqual(ligne(ids.map((id) => ({ id, titre: 'T' }))), { nom: 'P', lien: LIEN_PL, source: 'spotify' });
  // Titre : du texte obligatoire, coupé à 200 signes (un emoji pour un), le HTML gardé comme texte.
  const piege = '<img src=x onerror=alert(1)>';
  assert.deepEqual(ligne([
    { id: idFactice('a'), titre: piege, artiste: '  <b>Gras</b> ' },
    { id: idFactice('b'), titre: `${'x'.repeat(199)}🎵yy`, artiste: '🎵'.repeat(300) },
    { id: idFactice('c') }, { id: idFactice('d'), titre: '   ' }, { id: idFactice('e'), titre: 12 }, { id: idFactice('f'), titre: ['T'] },
    { id: idFactice('g'), titre: ' Calme ', artiste: 42 }, { id: idFactice('h'), titre: 'Calme', artiste: '  ' },
  ]).morceaux, [
    { id: idFactice('a'), titre: piege, artiste: '<b>Gras</b>' },
    { id: idFactice('b'), titre: `${'x'.repeat(199)}🎵`, artiste: '🎵'.repeat(NOM_MAX) },
    { id: idFactice('g'), titre: 'Calme', artiste: null },
    { id: idFactice('h'), titre: 'Calme', artiste: null },
  ]);
  // Une clé inconnue est perdue, sur le morceau comme sur la ligne ; `suite` ne vaut que true, et seulement avec des morceaux.
  const p = ligne([{ ...morceau(1), jeton: 'secret', lien: 'spotify:track:x' }], { jeton: 'secret', suite: 'oui' });
  assert.deepEqual(p, { nom: 'P', lien: LIEN_PL, source: 'spotify', morceaux: [morceau(1)] });
  assert.ok(!JSON.stringify(p).includes('secret'));
  for (const suite of [1, 'true', false, null, {}]) assert.ok(!('suite' in ligne([morceau(1)], { suite })), String(suite));
  assert.ok(!('suite' in ligne([], { suite: true })), 'sans morceaux, pas de suite');
  // Des morceaux qui ne sont pas un tableau, ou des entrées qui ne sont pas des objets.
  for (const x of [null, 'texte', 12, { 0: morceau(1) }, [null, 'texte', 12, [morceau(1)]]]) {
    assert.ok(!('morceaux' in ligne(x)), JSON.stringify(x));
  }
  // Une forme remise en forme ne change plus.
  const une = normaliserRefuges({ playlists: [{ nom: 'P', lien: LIEN_PL, morceaux: [...morceaux(201), { id: 'x' }], suite: true }] });
  assert.deepEqual(normaliserRefuges(une), une);
});

test('v12 : avecPlaylist, un lien changé vers une autre playlist perd les morceaux ; un nom changé ou le même lien les garde', () => {
  const r = { playlists: [{ nom: 'Pour souffler', lien: LIEN_PL, source: 'spotify', morceaux: morceaux(3), suite: true }] };
  const garde = { morceaux: morceaux(3), suite: true };
  assert.deepEqual(avecPlaylist(r, 0, { nom: 'Pour respirer' }).playlists[0], { ...r.playlists[0], nom: 'Pour respirer' });
  assert.deepEqual(avecPlaylist(r, 0, { lien: ` ${LIEN_PL}?si=1 ` }).playlists[0], r.playlists[0]);
  // La même playlist sous une autre forme : les morceaux restent, la source part (le lien est collé à la main).
  assert.deepEqual(avecPlaylist(r, 0, { lien: `spotify:playlist:${PL}` }).playlists[0], { nom: 'Pour souffler', lien: `spotify:playlist:${PL}`, source: null, ...garde });
  assert.deepEqual(avecPlaylist(r, 0, { lien: `https://open.spotify.com/intl-fr/playlist/${PL}` }).playlists[0],
    { nom: 'Pour souffler', lien: `https://open.spotify.com/intl-fr/playlist/${PL}`, source: null, ...garde });
  // Une autre playlist, un autre lien, ou plus de lien : les morceaux partent.
  for (const lien of [LIEN_PL2, `spotify:playlist:${PL2}`, 'https://music.apple.com/fr/playlist/x', `https://open.spotify.com/track/${PL}`, null, '', 'javascript:alert(1)']) {
    const p = avecPlaylist(r, 0, { lien }).playlists[0];
    assert.ok(!('morceaux' in p) && !('suite' in p), String(lien));
    assert.equal(p.nom, 'Pour souffler');
  }
  // Une autre ligne qu'on écrit ne touche pas aux morceaux.
  assert.deepEqual(avecPlaylist(r, 1, { nom: 'Pour marcher', lien: LIEN_PL2 }).playlists, [r.playlists[0], { nom: 'Pour marcher', lien: LIEN_PL2, source: null }]);
});

test('v12 : playlistSuivie, la première ligne qui a des morceaux, sinon la première playlist Spotify, sinon rien', () => {
  const collee = { nom: 'Collée', lien: 'https://music.apple.com/fr/playlist/x', source: null };
  const sp = { nom: 'Pour souffler', lien: LIEN_PL, source: 'spotify' };
  const avec = { nom: 'Pour dormir', lien: `spotify:playlist:${PL2}`, source: null, morceaux: morceaux(2) };
  assert.deepEqual(playlistSuivie({ playlists: [collee, sp, avec] }), { p: avec, i: 2 });
  assert.deepEqual(playlistSuivie({ playlists: [collee, sp] }), { p: sp, i: 1 });
  assert.deepEqual(playlistSuivie({ playlists: [{ nom: 'Courte', lien: 'https://open.spotify.com/playlist/abc' }, collee] }), null, 'un identifiant qui n\'en est pas un');
  for (const x of [null, undefined, 'texte', {}, { playlists: [] }, { playlists: [collee, { nom: 'Sans lien' }] }]) assert.equal(playlistSuivie(x), null, JSON.stringify(x));
  // Lue comme à la lecture : une ligne vide ne compte pas dans l'indice.
  assert.deepEqual(playlistSuivie({ playlists: [{ nom: '' }, null, sp] }), { p: sp, i: 0 });
});

test('v12 : choisirSpotify, le choix unique ; la playlist touchée remplace la ligne suivie, ou s\'ajoute ; les autres lignes restent', () => {
  const collee = { nom: 'Collée', lien: 'https://music.apple.com/fr/playlist/x', source: null };
  const suivie = { nom: 'Pour souffler', lien: LIEN_PL, source: 'spotify', morceaux: morceaux(3), suite: true };
  const choix = { nom: 'Pour dormir', lien: LIEN_PL2, morceaux: morceaux(2) };
  const r = { titres: 'Un titre', playlists: [collee, suivie] };
  const avant = structuredClone(r);
  assert.deepEqual(choisirSpotify(r, choix), { titres: 'Un titre', playlists: [collee, { nom: 'Pour dormir', lien: LIEN_PL2, source: 'spotify', morceaux: morceaux(2) }] });
  assert.deepEqual(r, avant, 'l\'objet reçu n\'est pas modifié');
  // Avec la suite, ou sans morceaux (la playlist n'est pas à lui : notée sans morceaux, spec §6.4).
  assert.deepEqual(choisirSpotify(r, { ...choix, suite: true }).playlists[1], { nom: 'Pour dormir', lien: LIEN_PL2, source: 'spotify', morceaux: morceaux(2), suite: true });
  assert.deepEqual(choisirSpotify(r, { nom: 'Pas à moi', lien: LIEN_PL2 }).playlists, [collee, { nom: 'Pas à moi', lien: LIEN_PL2, source: 'spotify' }]);
  // La même playlist, rechoisie : ses morceaux sont remplacés.
  assert.deepEqual(choisirSpotify(r, { nom: 'Pour souffler', lien: LIEN_PL, morceaux: [morceau(7)] }).playlists[1],
    { nom: 'Pour souffler', lien: LIEN_PL, source: 'spotify', morceaux: [morceau(7)] });
  // La ligne suivie peut être une ligne collée, mise à jour depuis le compte : c'est elle qui est remplacée.
  const majCollee = { nom: 'Collée Spotify', lien: `spotify:playlist:${PL}`, source: null, morceaux: [morceau(1)] };
  assert.deepEqual(choisirSpotify({ playlists: [majCollee, collee] }, choix).playlists, [{ nom: 'Pour dormir', lien: LIEN_PL2, source: 'spotify', morceaux: morceaux(2) }, collee]);
  // Aucune ligne suivie : la playlist s'ajoute à la fin, s'il y a moins de trois lignes ; sinon rien ne change.
  assert.deepEqual(choisirSpotify({ playlists: [collee] }, choix).playlists, [collee, { nom: 'Pour dormir', lien: LIEN_PL2, source: 'spotify', morceaux: morceaux(2) }]);
  assert.deepEqual(choisirSpotify(null, choix), { titres: null, playlists: [{ nom: 'Pour dormir', lien: LIEN_PL2, source: 'spotify', morceaux: morceaux(2) }] });
  const pleines = { playlists: [collee, { nom: 'Deux' }, { nom: 'Trois', lien: 'https://autre.test/p' }] };
  assert.deepEqual(choisirSpotify(pleines, choix), normaliserRefuges(pleines));
  // Le repli spotify:playlist: est accepté ; un lien hors du lecteur public ou un choix abîmé ne change rien.
  assert.deepEqual(choisirSpotify({}, { nom: null, lien: `spotify:playlist:${PL2}`, morceaux: [morceau(1)] }).playlists,
    [{ nom: null, lien: `spotify:playlist:${PL2}`, source: 'spotify', morceaux: [morceau(1)] }]);
  for (const x of [null, undefined, 'texte', 12, {}, { nom: 'X', lien: 'https://autre.test/p' }, { nom: 'X', lien: 'spotify:playlist:abc' }, { nom: 'X', lien: 'javascript:alert(1)' }]) {
    assert.deepEqual(choisirSpotify(r, x), normaliserRefuges(r), JSON.stringify(x));
  }
  // Des morceaux abîmés dans le choix sont remis en forme, comme à la lecture.
  assert.deepEqual(choisirSpotify({}, { nom: 'P', lien: LIEN_PL, morceaux: [{ id: 'x', titre: 'T' }, { ...morceau(1), jeton: 'secret' }], suite: 'oui' }).playlists,
    [{ nom: 'P', lien: LIEN_PL, source: 'spotify', morceaux: [morceau(1)] }]);
});

// v12 (6/9) : « Mettre à jour la liste » ne choisit rien : la ligne suivie garde son nom, son lien et sa source (collée ou
// choisie), seuls ses morceaux changent ; une ligne qui n'est plus celle de la demande ne change pas.
test('v12 : avecMorceaux, les morceaux relus remplacent ceux de la playlist suivie ; son nom, son lien et sa source restent', () => {
  const collee = { nom: 'Collée', lien: 'https://music.apple.com/fr/playlist/x', source: null };
  const suivie = { nom: 'Pour souffler', lien: `spotify:playlist:${PL}`, source: null, morceaux: morceaux(3), suite: true };
  const r = { titres: 'Un titre', playlists: [collee, suivie] };
  const avant = structuredClone(r);
  // Sans `suite` dans la réponse, la suite d'avant part aussi.
  assert.deepEqual(avecMorceaux(r, PL, { morceaux: morceaux(2) }),
    { titres: 'Un titre', playlists: [collee, { nom: 'Pour souffler', lien: `spotify:playlist:${PL}`, source: null, morceaux: morceaux(2) }] });
  assert.deepEqual(r, avant, 'l\'objet reçu n\'est pas modifié');
  assert.deepEqual(avecMorceaux(r, PL, { morceaux: morceaux(2), suite: true }).playlists[1], { nom: 'Pour souffler', lien: `spotify:playlist:${PL}`, source: null, morceaux: morceaux(2), suite: true });
  // Une ligne collée sans morceaux encore, en lien web : la première mise à jour les lui donne ; la source reste.
  const choisie = { nom: 'Pour dormir', lien: LIEN_PL2, source: 'spotify' };
  assert.deepEqual(avecMorceaux({ playlists: [collee, choisie] }, PL2, { morceaux: [morceau(1)] }).playlists, [collee, { ...choisie, morceaux: [morceau(1)] }]);
  // Une playlist vidée chez Spotify : les morceaux partent, la ligne reste.
  assert.deepEqual(avecMorceaux(r, PL, { morceaux: [] }).playlists, [collee, { nom: 'Pour souffler', lien: `spotify:playlist:${PL}`, source: null }]);
  // Le lien changé pendant la connexion (une autre playlist, ou plus de playlist suivie) : rien ne change.
  for (const id of [PL2, idFactice('autre'), null, undefined, 'abc', 12]) assert.deepEqual(avecMorceaux(r, id, { morceaux: [morceau(9)] }), normaliserRefuges(r), String(id));
  assert.deepEqual(avecMorceaux({ playlists: [collee] }, PL, { morceaux: [morceau(1)] }), normaliserRefuges({ playlists: [collee] }));
  // Des morceaux abîmés sont remis en forme, comme à la lecture ; une réponse abîmée vaut une liste vide.
  assert.deepEqual(avecMorceaux(r, PL, { morceaux: [{ id: 'x', titre: 'T' }, { ...morceau(4), jeton: 'secret' }], suite: 'oui' }).playlists[1],
    { nom: 'Pour souffler', lien: `spotify:playlist:${PL}`, source: null, morceaux: [morceau(4)] });
  for (const x of [null, undefined, 'texte', 12]) assert.deepEqual(avecMorceaux(r, PL, x).playlists[1], { nom: 'Pour souffler', lien: `spotify:playlist:${PL}`, source: null }, String(x));
});

test('v12 : listeMorceaux lit une page de GET /playlists/{id}/items ; écarte null, fichiers locaux, épisodes, identifiants invalides et morceaux sans titre', () => {
  const piste = (n, extra = {}) => ({ type: 'track', id: idFactice(`mo${n}`), name: `Pluie lente ${n}`, is_local: false,
    artists: [{ name: 'Les Vagues Douces' }, { name: ' Orchestre du Soir ' }], album: { images: [{ url: 'https://autre.test/x.jpg' }] }, ...extra });
  const json = {
    total: 12, limit: 50, offset: 0, next: 'https://autre.test/suite',
    items: [
      { item: piste(1), added_at: '2026-11-01T10:00:00Z' },
      { track: piste(2) },
      { item: piste(3), track: piste(9) },
      null, 'texte', 12, [], {},
      { item: null },
      { item: piste(4, { is_local: true, id: null }), is_local: true },
      { item: piste(5), is_local: true },
      { item: piste(6, { is_local: true }) },
      { item: piste(7, { type: 'episode' }) },
      { item: piste(8, { id: idFactice('mo8').slice(1) }) },
      { item: piste(17, { id: `${idFactice('mo17')}0` }) },
      { item: piste(10, { id: '../../me' }) },
      { item: piste(11, { name: '   ' }) },
      { item: piste(12, { name: null }) },
      { item: piste(13, { name: '<img src=x onerror=alert(1)>', artists: [] }) },
      { item: piste(14, { artists: [null, { name: 12 }, { name: '  ' }, 'texte'] }) },
      { item: piste(15, { artists: 'Les Vagues Douces' }) },
      { item: piste(16, { name: 'x'.repeat(250), artists: [{ name: 'y'.repeat(150) }, { name: 'z'.repeat(150) }] }) },
      { item: piste(1) },
    ],
  };
  const voulu = (n, titre = `Pluie lente ${n}`, artiste = 'Les Vagues Douces, Orchestre du Soir') => ({ id: idFactice(`mo${n}`), titre, artiste });
  assert.deepEqual(listeMorceaux(json), [
    voulu(1), voulu(2), voulu(3),
    voulu(13, '<img src=x onerror=alert(1)>', null),
    voulu(14, 'Pluie lente 14', null),
    voulu(15, 'Pluie lente 15', null),
    voulu(16, 'x'.repeat(NOM_MAX), `${'y'.repeat(150)}, ${'z'.repeat(150)}`.slice(0, NOM_MAX)),
    voulu(1),
  ], 'les doublons restent ; ni pochette, ni lien, ni date');
  for (const x of [null, undefined, 12, 'texte', [], {}, { items: null }, { items: 'x' }, { items: {} }, { tracks: { items: [{ track: piste(1) }] } }]) {
    assert.deepEqual(listeMorceaux(x), [], JSON.stringify(x));
  }
  // Ce que listeMorceaux rend se garde tel quel.
  const lus = listeMorceaux(json);
  assert.deepEqual(normaliserRefuges({ playlists: [{ nom: 'P', lien: LIEN_PL, morceaux: lus }] }).playlists[0].morceaux, lus);
});

test('v12 : formesDuMorceau, le morceau seul et le morceau dans sa playlist ; seulement le premier sans playlist Spotify', () => {
  const m = morceau(1);
  const seul = { nom: 'Morceau seul', href: `spotify:track:${m.id}` };
  const dans = { nom: 'Morceau dans sa playlist', href: `spotify:track:${m.id}?context=spotify%3Aplaylist%3A${PL}` };
  assert.deepEqual(formesDuMorceau(m, { nom: 'Pour souffler', lien: LIEN_PL, source: 'spotify' }), [seul, dans]);
  assert.deepEqual(formesDuMorceau(m, { nom: null, lien: `spotify:playlist:${PL}` }), [seul, dans]);
  for (const p of [null, undefined, {}, { lien: 'https://music.apple.com/fr/playlist/x' }, { lien: 'https://open.spotify.com/playlist/abc' }, { lien: `spotify:track:${PL}` }]) {
    assert.deepEqual(formesDuMorceau(m, p), [seul], JSON.stringify(p));
  }
  for (const x of [null, undefined, 'texte', {}, { id: 'abc' }, { id: `${m.id}0` }, { id: '../x' }, { titre: 'Sans id' }]) {
    assert.deepEqual(formesDuMorceau(x, { lien: LIEN_PL }), [], JSON.stringify(x));
  }
  // Chaque forme est un lien que l'app accepte, et que lienAOuvrir laisse tel quel.
  for (const f of formesDuMorceau(m, { lien: LIEN_PL })) {
    assert.equal(lienAccepte(f.href), f.href);
    assert.equal(lienAOuvrir(f.href), f.href);
  }
});

// v12 (spec §6.5) : si Spotify ne donnait plus `external_urls`, la playlist reste choisissable par son identifiant.
test('v12 : listePlaylists se replie sur l\'identifiant, en spotify:playlist:ID, quand le lien du lecteur public manque', () => {
  assert.deepEqual(listePlaylists({ items: [
    { name: 'Sans lien web', id: PL, items: { href: 'https://api.spotify.com/v1/playlists/x/items', total: 12 } },
    { name: 'Lien web refusé', id: PL2, external_urls: { spotify: 'https://autre.test/p' } },
    { name: 'Les deux', id: idFactice('pl3'), external_urls: { spotify: `https://open.spotify.com/playlist/${idFactice('pl3')}?si=x` } },
    { name: 'Identifiant court', id: 'abc' },
    { name: 'Identifiant piégé', id: '../../me/playlists00' },
    { name: 'Identifiant qui n\'est pas un texte', id: 12 },
  ] }), [
    { nom: 'Sans lien web', lien: `spotify:playlist:${PL}` },
    { nom: 'Lien web refusé', lien: `spotify:playlist:${PL2}` },
    { nom: 'Les deux', lien: `https://open.spotify.com/playlist/${idFactice('pl3')}` },
  ]);
});
