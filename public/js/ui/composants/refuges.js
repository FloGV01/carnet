// Mes refuges (v11, spec §8) : la lecture de la méta, et les lignes d'écoute de ses playlists, dans Mes refuges et dans Moment
// difficile. Écouter, c'est toucher un lien qui fait sortir d'Emozio vers l'app de musique : aucune requête n'en part, ni
// aperçu, ni image (spec §8.2). Le nom d'une playlist est du texte, jamais du HTML.
// v12 (spec v12 §6.1 et §6.2) : le lien direct vers l'app, fabriqué à l'affichage (lienAOuvrir) : la carte de la playlist
// suivie ouvre Spotify d'un toucher. Les morceaux de la playlist suivie (ListeMorceaux), chacun un lien spotify:track:<ID>,
// dans Mes refuges et dans Moment difficile, après Mon plan. Les messages de la connexion à Spotify, partagés par Mes refuges et
// ses réglages.
import { html } from '../lib.js';
import { repo } from '../../donnees.js';
import { nomPlaylist, normaliserRefuges, playlistSuivie, lienAOuvrir, formesDuMorceau } from '../../domain/refuges.js';
import { IconeLigne } from './rubrique.js';
import { Icones } from '../icones.js';

// Seulement la base : jamais le réseau, ni à l'ouverture d'un écran, ni dans Moment difficile.
export const lireRefuges = async () => normaliserRefuges(await repo.meta.lire('refuges'));

// Le message d'un échec de la connexion à Spotify (spec v12 §6.3) : la liste notée ne bouge pas. `expiree` nomme le bouton qui
// relance un choix (« Choisir dans mon compte », ou « Changer de playlist » quand une playlist est suivie).
export const ECHECS_SPOTIFY = {
  refus: 'Spotify refuse cette connexion. Ta liste reste.',
  autre: 'La connexion n\'a pas abouti. Ta liste reste.',
  morceaux: 'Spotify ne donne pas les morceaux de cette playlist : seule une playlist à toi les donne. Elle reste notée. Dans Spotify, tu peux la copier dans une playlist à toi.',
};
export const expiree = (bouton = 'Choisir dans mon compte') => `La connexion a expiré : touche « ${bouton} » de nouveau.`;

// Une carte par playlist qui a un lien ; son nom, ou « Playlist 2 » à sa place dans la liste. La playlist suivie (celle des
// morceaux) vient d'abord, les autres suivent dans leur ordre (spec v12 §6.1). « Spotify » est nommé, en discret sous le nom, à
// côté de ce qui vient de lui. Le lien posé est le lien direct vers l'app (spotify:playlist:<ID>, music://…), fabriqué ici :
// les données gardent le lien noté. Pas de `target`. Ce qui arrive est relu comme la méta : aucun lien d'un autre schéma.
export function LignesPlaylists({ playlists }) {
  const r = normaliserRefuges({ playlists });
  const suivie = playlistSuivie(r);
  const enTete = (x) => Number(Boolean(suivie) && x.i === suivie.i);
  const lignes = r.playlists.map((p, i) => ({ p, i, href: lienAOuvrir(p.lien) })).filter((x) => x.href)
    .sort((a, b) => enTete(b) - enTete(a));
  if (!lignes.length) return null;
  return html`<div class="lignes-playlists">${lignes.map(({ p, i, href }) => html`<a class="carte ligne-carte lien-refuge" href=${href} rel="noreferrer">
    <${IconeLigne} icone="musique" /><span class="ligne-libelle">${nomPlaylist(p, i)}${p.source === 'spotify' && html`<span class="ligne-sous discret">Spotify</span>`}</span>
    ${Icones.sortie({ trait: 2 })}</a>`)}</div>`;
}

// Les morceaux d'une playlist (spec v12 §6.1), façon liste d'une app Apple : une rangée par morceau, son titre puis, dessous,
// son artiste, en discret ; un toucher ouvre Spotify sur lui (spotify:track:<ID> : les morceaux ne gardent que leur
// identifiant). Ni pochette, ni icône, ni nombre. Les titres sont du texte, jamais du HTML ; la clé est la place, car une
// playlist peut avoir deux fois le même morceau. La playlist est relue comme la méta : des morceaux sur une ligne qui n'est
// pas une playlist Spotify, ou abîmés, ne s'affichent pas. `rang` : sa place dans les refuges, pour son nom par défaut.
export function ListeMorceaux({ playlist, rang = 0 }) {
  const p = normaliserRefuges({ playlists: [playlist] }).playlists[0];
  const lignes = ((p && p.morceaux) || []).map((m) => ({ m, href: (formesDuMorceau(m)[0] || {}).href })).filter((x) => x.href);
  if (!lignes.length) return null;
  return html`<ul class="liste carte carte-groupe liste-morceaux" aria-label=${`Morceaux de ${nomPlaylist(p, rang)}`}>
    ${lignes.map(({ m, href }, i) => html`<li key=${i}><a class="ligne-morceau" href=${href} rel="noreferrer"><span class="titre-morceau">${m.titre}</span> ${m.artiste && html`<span class="artiste-morceau">${m.artiste}</span>`}</a></li>`)}
  </ul>`;
}
