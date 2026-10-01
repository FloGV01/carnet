import { html, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { repo } from '../../donnees.js';
import { toutEffacer } from '../../db/sauvegarde.js';
import { afficherToast } from '../composants/toast.js';

export function Effacer() {
  const [mot, setMot] = useState('');
  const effacer = async () => {
    await toutEffacer(repo);
    try { Object.keys(localStorage).filter((k) => k.startsWith('carnet:')).forEach((k) => localStorage.removeItem(k)); } catch { /* indisponible */ }
    afficherToast('Carnet est vide.', null, 3000);
    location.hash = '#/aujourdhui';
  };
  return html`<main class="ecran">
    <${Entete} titre="Tout effacer" retour=${() => { location.hash = '#/reglages'; }} />
    <section class="carte">
      <p>Toutes les données de Carnet sur cet iPhone seront effacées, copies de secours comprises. Les listes reviennent à leur état de départ.</p>
      <div class="actions-col section">
        <a class="btn lien-bouton" href="#/reglages/sauvegarde">Exporter d'abord</a>
        <label class="etiquette" for="mot-effacer">Écris EFFACER pour confirmer</label>
        <input id="mot-effacer" class="champ-ligne" autocomplete="off" autocapitalize="characters" value=${mot} onInput=${(e) => setMot(e.target.value.trim())} />
        <button type="button" class="btn btn-effacer" disabled=${mot !== 'EFFACER'} onClick=${effacer}>Effacer définitivement</button>
      </div>
    </section>
  </main>`;
}
