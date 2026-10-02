import { html } from '../lib.js';
import { Entete } from '../composants/entete.js';

// Pas-à-pas statique : l'app n'envoie aucune notification elle-même.
export function Rappel() {
  return html`<main class="ecran rappel">
    <${Entete} titre="Rappel du soir" retour=${() => { location.hash = '#/reglages'; }} />
    <p class="note-import">Avec l'app Raccourcis de l'iPhone. Tu peux le couper quand tu veux.</p>
    <ol class="etapes">
      <li>Ouvre Raccourcis, onglet Automatisation, puis touche « + ».</li>
      <li>Choisis « Heure de la journée » : 21:00, chaque jour.</li>
      <li>Choisis « Exécuter immédiatement » et désactive la notification d'exécution.</li>
      <li>Touche « Nouvelle automatisation vierge », puis ajoute l'action « Afficher une notification » avec le texte « Carnet du soir, si tu veux. »</li>
    </ol>
    <p class="note-import">Pas d'action « Ouvrir les URL » : elle ouvrirait Safari, où Carnet est vide. Garde plutôt Carnet dans le Dock.</p>
    <p class="note-import">Pour couper le rappel : désactive l'automatisation dans Raccourcis.</p>
  </main>`;
}
