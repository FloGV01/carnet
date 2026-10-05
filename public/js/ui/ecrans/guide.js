import { html } from '../lib.js';
import { Icones } from '../icones.js';

const ETAPES = [
  { icone: 'points', texte: 'Touche « ••• », puis « Partager », puis « Sur l’écran d’accueil ».' },
  { icone: 'bascule', texte: 'Vérifie que « Ouvrir comme app web » est activé.' },
  { icone: 'ajouter', texte: 'Touche « Ajouter », puis ouvre Carnet depuis son icône.' },
];

// Seul écran affiché dans Safari : la saisie n'existe que dans l'app installée.
export function Guide() {
  return html`<main class="ecran guide">
    <div class="guide-tete">
      <h1 class="titre-onglet">Installer Carnet</h1>
      <p class="guide-intro">Carnet s'ouvre depuis l'écran d'accueil, comme une app. Tes données restent sur l'iPhone.</p>
    </div>
    <ol class="guide-etapes">${ETAPES.map((e, i) => html`<li class="guide-etape">
      <span class="guide-icone" aria-hidden="true">${Icones[e.icone]()}</span>
      <span class="guide-texte"><span class="guide-numero">${i + 1}</span><span>${e.texte}</span></span>
    </li>`)}</ol>
    <p class="note-import">Ici, dans Safari, rien n'est enregistré : le stockage de Safari n'est pas celui de l'app.</p>
  </main>`;
}
