// Mes refuges (v11, spec §8) : la lecture de la méta, et les lignes d'écoute de ses playlists, dans Mes refuges et dans Moment
// difficile. Écouter, c'est toucher un lien qui fait sortir d'Emozio vers l'app de musique : aucune requête n'en part, ni
// aperçu, ni image (spec §8.2). Le nom d'une playlist est du texte, jamais du HTML.
import { html } from '../lib.js';
import { repo } from '../../donnees.js';
import { nomPlaylist, normaliserRefuges } from '../../domain/refuges.js';
import { CarreIcone } from './rubrique.js';
import { Icones } from '../icones.js';

// Seulement la base : jamais le réseau, ni à l'ouverture d'un écran, ni dans Moment difficile.
export const lireRefuges = async () => normaliserRefuges(await repo.meta.lire('refuges'));

// Une carte par playlist qui a un lien, dans l'ordre de la liste ; son nom, ou « Playlist 2 » à sa place dans la liste.
// « Spotify » est nommé, en discret sous le nom, à côté de ce qui vient de lui. Pas de `target` : la v11 sort avec le lien
// web, et le Diagnostic essaie les autres formes (spec §8.5). Ce qui arrive est relu comme la méta : aucun lien d'un autre
// schéma.
export function LignesPlaylists({ playlists }) {
  const lignes = normaliserRefuges({ playlists }).playlists.map((p, i) => ({ p, i })).filter(({ p }) => p.lien);
  if (!lignes.length) return null;
  return html`<div class="lignes-playlists">${lignes.map(({ p, i }) => html`<a class="carte ligne-carte lien-refuge" href=${p.lien} rel="noreferrer">
    <${CarreIcone} icone="musique" /><span class="ligne-libelle">${nomPlaylist(p, i)}${p.source === 'spotify' && html`<span class="ligne-sous discret">Spotify</span>`}</span>
    ${Icones.sortie({ trait: 2 })}</a>`)}</div>`;
}
