import { html } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { Icones } from '../icones.js';
import { HEURE_MIN, HEURE_MAX } from '../../domain/journee.js';
import { useJournee } from './ma-journee.js';

const pad = (h) => `${String(h).padStart(2, '0')}:00`;
const HEURES = Array.from({ length: HEURE_MAX - HEURE_MIN + 1 }, (_, i) => i + HEURE_MIN);

// Pas-à-pas statique : l'app n'envoie aucune notification elle-même. Les heures de l'humeur du moment
// se choisissent ici depuis la v6.1 (avant, dans Réglages › Ma journée) : même méta, même enregistrement.
export function Rappel() {
  const [j, changer] = useJournee();
  const heures = j ? j.heuresMoment : [];
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
    <p class="note-import">Les heures où tu veux un rappel.</p>
    ${j && html`<div class="pastilles souples heures-moment" role="group" aria-label="Heures des rappels">
      ${HEURES.map((h) => {
        const choisi = heures.includes(h);
        return html`<button type="button" class="pastille" aria-pressed=${choisi ? 'true' : 'false'} aria-label=${`${h} h`}
          onClick=${() => changer((x) => ({ ...x, heuresMoment: choisi ? x.heuresMoment.filter((y) => y !== h) : [...x.heuresMoment, h] }))}>
          <span class="coche" aria-hidden="true">${Icones.coche({ trait: 3 })}</span><span class="texte-pastille"><span>${h} h</span></span></button>`;
      })}
    </div>`}
    <p class="note-import">${heures.length === 0 ? 'Refais les mêmes étapes pour chaque heure choisie.' : `Refais les mêmes étapes pour chaque heure : ${heures.map(pad).join(', ')}.`} Texte de la notification : « Humeur du moment, si tu veux. » Ensuite, ouvre Carnet et touche « Humeur », en bas.</p>
    <p class="note-import">Pas d'action « Ouvrir les URL » : elle ouvrirait Safari, où Carnet est vide. Garde plutôt Carnet dans le Dock.</p>
    <p class="note-import">Pour couper un rappel : désactive son automatisation dans Raccourcis.</p>
  </main>`;
}
