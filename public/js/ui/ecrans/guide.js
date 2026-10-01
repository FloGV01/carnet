import { html } from '../lib.js';

export function Guide() {
  return html`<main class="ecran guide">
    <header class="entete"><h1>Installer Carnet</h1></header>
    <p>Carnet s'utilise depuis l'écran d'accueil, comme une app. Tes données restent sur l'iPhone.</p>
    <ol class="section">
      <li>Dans Safari, toucher « ••• », puis « Partager », puis « Sur l'écran d'accueil ».</li>
      <li>Vérifier que « Ouvrir comme app web » est activé.</li>
      <li>Toucher « Ajouter », puis ouvrir Carnet depuis son icône.</li>
    </ol>
    <p class="section discret">Ici, dans Safari, rien n'est enregistré : le stockage de Safari n'est pas celui de l'app.</p>
  </main>`;
}
