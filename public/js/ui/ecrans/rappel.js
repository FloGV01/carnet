import { html } from '../lib.js';
import { Entete } from '../composants/entete.js';

// Pas-à-pas statique : l'app n'envoie aucune notification elle-même.
export function Rappel() {
  return html`<main class="ecran">
    <${Entete} titre="Rappel du soir" retour=${() => { location.hash = '#/reglages'; }} />
    <section class="carte">
      <p>Le rappel vient de l'app Raccourcis de l'iPhone. Tu peux le couper quand tu veux.</p>
      <ol class="etapes">
        <li>Ouvrir Raccourcis, onglet Automatisation, puis toucher « + ».</li>
        <li>Choisir « Heure de la journée » : 21:00, tous les jours.</li>
        <li>Choisir « Exécuter immédiatement » et désactiver la notification d'exécution.</li>
        <li>« Nouvelle automatisation vierge », puis l'action « Afficher une notification » avec le texte : « Carnet du soir, si tu veux. »</li>
      </ol>
      <p class="discret">Pas d'action « Ouvrir les URL » : elle ouvrirait Safari, où Carnet est vide. Garde plutôt Carnet dans le Dock.</p>
      <p class="discret">Pour couper le rappel : désactiver l'automatisation dans Raccourcis.</p>
    </section>
  </main>`;
}
