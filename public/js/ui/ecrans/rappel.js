import { html, useEffect, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { repo } from '../../donnees.js';
import { normaliserJournee } from '../../domain/journee.js';

const pad = (h) => `${String(h).padStart(2, '0')}:00`;

// Pas-à-pas statique : l'app n'envoie aucune notification elle-même. Les heures de l'humeur du
// moment viennent de Réglages › Ma journée.
export function Rappel() {
  const [heures, setHeures] = useState([]);
  useEffect(() => { repo.meta.lire('journee').then((v) => setHeures(normaliserJournee(v).heuresMoment)); }, []);
  return html`<main class="ecran rappel">
    <${Entete} titre="Rappels" retour=${() => { location.hash = '#/reglages'; }} />
    <p class="note-import">Avec l'app Raccourcis de l'iPhone. Tu peux les couper quand tu veux.</p>
    <h2 class="libelle-section">Le soir</h2>
    <ol class="etapes">
      <li>Ouvre Raccourcis, onglet Automatisation, puis touche « + ».</li>
      <li>Choisis « Heure de la journée » : 21:00, chaque jour.</li>
      <li>Choisis « Exécuter immédiatement » et désactive la notification d'exécution.</li>
      <li>Touche « Nouvelle automatisation vierge », puis ajoute l'action « Afficher une notification » avec le texte « Carnet du soir, si tu veux. »</li>
    </ol>
    <h2 class="libelle-section">Humeur du moment</h2>
    ${heures.length === 0
      ? html`<p class="note-import">Choisis d'abord tes heures dans Réglages › Ma journée.</p>`
      : html`<p class="note-import">Refais les mêmes étapes pour chaque heure : ${heures.map(pad).join(', ')}. Texte de la notification : « Humeur du moment, si tu veux. » Ensuite, ouvre Carnet et touche « Moment ».</p>`}
    <p class="note-import">Pas d'action « Ouvrir les URL » : elle ouvrirait Safari, où Carnet est vide. Garde plutôt Carnet dans le Dock.</p>
    <p class="note-import">Pour couper un rappel : désactive son automatisation dans Raccourcis.</p>
  </main>`;
}
