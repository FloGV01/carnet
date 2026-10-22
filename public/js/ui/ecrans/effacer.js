// Tout effacer, en trois temps : proposer d'exporter, écrire EFFACER, puis le seul bouton rouge.
import { html, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { repo } from '../../donnees.js';
import { toutEffacer } from '../../db/sauvegarde.js';
import { afficherToast } from '../composants/toast.js';
import { useSauvegarde } from '../sauvegarde.js';
import { reinitialiserHistorique } from './historique.js';

// Ce que « Tout effacer » efface (toutEffacer, db/sauvegarde.js) : chaque store de données y est nommé.
export const TEXTE_EFFACER = 'Toutes les journées, épisodes, symptômes, relevés d\'émotion du moment, notes, séances de Bien-être, '
  + 'rendez-vous, fiches et mémos seront effacés de cet iPhone, copies de secours comprises, avec Mon plan et ton traitement '
  + 'actuel. Les listes et les réglages reviennent à leur état de départ. Écris EFFACER pour continuer.';

export function Effacer() {
  const [etape, setEtape] = useState(1);
  const [mot, setMot] = useState('');
  const sauvegarde = useSauvegarde();
  const pret = mot.trim().toUpperCase() === 'EFFACER';
  const effacer = async () => {
    await toutEffacer(repo);
    try { Object.keys(localStorage).filter((k) => k.startsWith('carnet:')).forEach((k) => localStorage.removeItem(k)); } catch { /* indisponible */ }
    reinitialiserHistorique();
    afficherToast('Tout est effacé.', null, 3000);
    location.hash = '#/aujourdhui';
  };
  const exporterPuisContinuer = () => {
    sauvegarde.exporterMaintenant().then((r) => { if (r === 'partage' || r === 'copie') setEtape(2); });
  };
  return html`<main class="ecran effacer">
    <${Entete} titre="Tout effacer" retour=${() => { location.hash = '#/reglages'; }} />
    ${etape === 1 ? html`
      <p class="texte-import">Avant d'effacer, tu peux garder une sauvegarde de tes données.</p>
      <div class="actions-col">
        <button type="button" class="btn btn-plein" disabled=${!sauvegarde.fichiers} onClick=${exporterPuisContinuer}>Exporter d'abord</button>
        <button type="button" class="btn" onClick=${() => setEtape(2)}>Continuer sans exporter</button>
      </div>
      ${sauvegarde.message && html`<p class="note-import" role="status">${sauvegarde.message}</p>`}`
    : html`
      <p class="texte-import">${TEXTE_EFFACER}</p>
      <input class="champ-ligne champ-effacer" aria-label="Écris EFFACER pour confirmer" placeholder="EFFACER" autocomplete="off" autocapitalize="characters"
        value=${mot} onInput=${(e) => setMot(e.target.value)} />
      <button type="button" class="btn btn-effacer" disabled=${!pret} onClick=${effacer}>Effacer définitivement</button>`}
  </main>`;
}
