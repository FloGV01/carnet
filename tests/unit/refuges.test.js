// Mes refuges (v11, spec §8) : les liens acceptés, ceux de Spotify, et la méta `refuges` remise en forme (point de
// vigilance 4 : une sauvegarde abîmée ou écrite à la main). Aucun lien n'est suivi : ils sont seulement relus.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_PLAYLISTS, NOM_MAX, lienAccepte, lienDeSpotify, normaliserRefuges, refugesVides, playlistsAOuvrir, nomPlaylist,
  avecPlaylist, formesDuLien,
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

// Le Diagnostic essaie trois formes d'un même lien (spec §8.5). Aucune n'est suivie ici.
test('formesDuLien : lien web, lien web dans une nouvelle fenêtre, et lien direct vers l\'app pour une playlist de Spotify ou de Musique', () => {
  const WEB = (href) => [{ nom: 'Lien web', href, nouvelle: false }, { nom: 'Lien web, nouvelle fenêtre', href, nouvelle: true }];
  const APP = (href) => ({ nom: 'Lien direct vers l\'app', href, nouvelle: false });
  assert.deepEqual(formesDuLien('https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO?si=abc'), [
    ...WEB('https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO'), APP('spotify:playlist:37i9dQZF1DX4sWSpwq3LiO')]);
  assert.deepEqual(formesDuLien('https://open.spotify.com/intl-fr/playlist/abc'), [...WEB('https://open.spotify.com/intl-fr/playlist/abc'), APP('spotify:playlist:abc')]);
  assert.deepEqual(formesDuLien('https://music.apple.com/fr/playlist/calme/pl.u-abc'), [
    ...WEB('https://music.apple.com/fr/playlist/calme/pl.u-abc'), APP('music://music.apple.com/fr/playlist/calme/pl.u-abc')]);
  // Ni une playlist de Spotify, ni Musique : le lien web seul.
  for (const lien of ['https://open.spotify.com/album/abc', 'https://open.spotify.com/playlist/', 'https://open.spotify.com/playlist/abc/autre',
    'https://open.spotify.com:8443/playlist/abc', 'https://x@open.spotify.com/playlist/abc', 'https://open.spotify.com.autre.test/playlist/abc',
    'https://autre.test/playlist/abc', 'https://music.apple.com.autre.test/fr/playlist/x']) {
    assert.deepEqual(formesDuLien(lien), WEB(lienAccepte(lien)), lien);
  }
  // Déjà un lien vers l'app : lui seul.
  assert.deepEqual(formesDuLien('spotify:playlist:abc'), [APP('spotify:playlist:abc')]);
  assert.deepEqual(formesDuLien('music://music.apple.com/fr/playlist/x'), [APP('music://music.apple.com/fr/playlist/x')]);
  // Un lien refusé : aucune forme.
  for (const x of ['javascript:alert(1)', 'http://open.spotify.com/playlist/abc', 'data:text/html,x', '', null, 12]) assert.deepEqual(formesDuLien(x), [], String(x));
  // Chaque forme rendue est un lien que l'app accepte.
  for (const f of formesDuLien('https://open.spotify.com/playlist/abc')) assert.equal(lienAccepte(f.href), f.href);
});
