// Mes refuges (v11, spec §8) : les liens acceptés, ceux de Spotify, et la méta `refuges` remise en forme (point de
// vigilance 4 : une sauvegarde abîmée ou écrite à la main). Aucun lien n'est suivi : ils sont seulement relus.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_PLAYLISTS, NOM_MAX, lienAccepte, lienDeSpotify, normaliserRefuges, refugesVides, playlistsAOuvrir, nomPlaylist,
} from '../../public/js/domain/refuges.js';

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
  assert.deepEqual(r, {
    titres: null,
    playlists: [
      { nom: '<b onclick="x()">Gras</b>', lien: null, source: null },
      { nom: 'Spotify ailleurs', lien: null, source: 'spotify' },
      { nom: 'Compte', lien: null, source: 'spotify' },
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

test('refugesVides, playlistsAOuvrir et nomPlaylist', () => {
  for (const x of [null, {}, { titres: '  ', playlists: [] }, { playlists: [{ nom: '', lien: 'ftp://x' }] }, 'texte']) assert.equal(refugesVides(x), true, JSON.stringify(x));
  assert.equal(refugesVides({ titres: 'Une chanson' }), false);
  assert.equal(refugesVides({ playlists: [{ nom: 'Sans lien' }] }), false);
  assert.equal(refugesVides({ playlists: [{ lien: 'spotify:playlist:abc' }] }), false);

  const r = { playlists: [{ nom: 'Sans lien' }, { lien: 'spotify:playlist:abc' }, { nom: 'Pour souffler', lien: 'https://open.spotify.com/playlist/abc?si=1', source: 'spotify' }] };
  assert.deepEqual(playlistsAOuvrir(r), [
    { nom: null, lien: 'spotify:playlist:abc', source: null },
    { nom: 'Pour souffler', lien: 'https://open.spotify.com/playlist/abc', source: 'spotify' },
  ]);
  assert.deepEqual(playlistsAOuvrir({ playlists: [{ lien: 'javascript:alert(1)' }] }), []);
  assert.deepEqual(playlistsAOuvrir(null), []);

  assert.equal(nomPlaylist({ nom: 'Pour souffler' }, 0), 'Pour souffler');
  assert.equal(nomPlaylist({ nom: null, lien: 'spotify:playlist:abc' }, 0), 'Playlist 1');
  assert.equal(nomPlaylist({ nom: '   ' }, 2), 'Playlist 3');
  assert.equal(nomPlaylist(null, 1), 'Playlist 2');
});
