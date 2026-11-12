// La page du code (v11, spec §8.3) : le retour de Spotify est arrivé hors de l'app installée (dans Safari, point incertain sur
// l'iPhone). La connexion ne se finit jamais ici : le stockage de Safari n'est pas celui de l'app, où attend la demande. La
// page montre le code, à copier puis à coller dans Mes refuges, où Emozio finit la connexion (v12 : tant que la demande attend,
// « Coller le code de Spotify » y mène au champ du code, dans ses réglages). Aucun réseau sur cette page.
import { html, useState } from '../lib.js';
import { Icones } from '../icones.js';
import { copier } from '../../plateforme/presse-papier.js';

export function CodeSpotify({ code }) {
  const [message, setMessage] = useState(null);
  const copierCode = () => copier(code).then((ok) => setMessage(ok ? 'Copié.' : 'La copie n\'a pas marché : sélectionne le code.'));
  return html`<main class="ecran guide code-spotify">
    <div class="guide-tete">
      <h1 class="titre-onglet">Code de Spotify</h1>
      <p class="guide-intro">Copie ce code, reviens dans Emozio, puis colle-le dans Mes refuges.</p>
    </div>
    <p class="carte valeur-code">${code}</p>
    <button type="button" class="btn btn-plein" onClick=${copierCode}>${Icones.copier()}Copier le code</button>
    ${message && html`<p class="note-import" role="status">${message}</p>`}
  </main>`;
}
