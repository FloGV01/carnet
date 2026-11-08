import { html } from '../lib.js';
import { Icones } from '../icones.js';

// Des espaces insécables dans les guillemets : un « » ne commence ni ne finit jamais seul une ligne.
const ETAPES = [
  { icone: 'points', texte: 'Touche «\u00a0•••\u00a0», puis «\u00a0Partager\u00a0», puis «\u00a0Sur l’écran d’accueil\u00a0».' },
  { icone: 'bascule', texte: 'Vérifie que «\u00a0Ouvrir comme app web\u00a0» est activé.' },
  { icone: 'ajouter', texte: 'Touche «\u00a0Ajouter\u00a0», puis ouvre Emozio depuis son icône.' },
];

// Seul écran affiché dans Safari : la saisie n'existe que dans l'app installée.
export function Guide() {
  return html`<main class="ecran guide">
    <div class="guide-tete">
      <h1 class="titre-onglet">Installer Emozio</h1>
      <p class="guide-intro">Emozio s'ouvre depuis l'écran d'accueil, comme une app. Tes données restent sur l'iPhone.</p>
    </div>
    <ol class="guide-etapes">${ETAPES.map((e, i) => html`<li class="guide-etape">
      <span class="guide-icone" aria-hidden="true">${Icones[e.icone]()}</span>
      <span class="guide-texte"><span class="guide-numero">${i + 1}</span><span>${e.texte}</span></span>
    </li>`)}</ol>
    <p class="note-import">Ici, dans Safari, rien n'est enregistré : le stockage de Safari n'est pas celui de l'app.</p>
  </main>`;
}
