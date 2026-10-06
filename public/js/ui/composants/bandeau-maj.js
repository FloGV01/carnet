import { html } from '../lib.js';
import { useSauvegarde } from '../sauvegarde.js';

// Nouvelle version : « Sauvegarder d'abord » (fichiers préparés à l'affichage, partage dans le
// geste), puis « Recharger ». La mise à jour garde les données ; la sauvegarde reste une assurance.
export function BandeauMaj({ surRecharger }) {
  const sauvegarde = useSauvegarde();
  return html`<div class="bandeau" role="status">
    <span>Nouvelle version prête</span>
    <button type="button" disabled=${!sauvegarde.fichiers} onClick=${sauvegarde.exporterMaintenant}>Sauvegarder d'abord</button>
    <button type="button" onClick=${surRecharger}>Recharger</button>
  </div>`;
}
