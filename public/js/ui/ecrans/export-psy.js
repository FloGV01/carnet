// Export vers PSY : texte des 7 derniers jours, calculé à l'ouverture, copié dans le geste.
import { html, useEffect, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { repo } from '../../donnees.js';
import { calculerAnalyse } from './analyse.js';
import { exportPsy, reperesPsy } from '../../export/psy.js';
import { copier } from '../../plateforme/presse-papier.js';

export function ExportPsy() {
  const [texte, setTexte] = useState(null);
  const [message, setMessage] = useState(null);
  useEffect(() => {
    (async () => {
      const [{ resultat, carte }, journal, episodes, symptomes] = await Promise.all([
        calculerAnalyse(), repo.journal.tous(), repo.episodes.tous(), repo.symptomes.tous(),
      ]);
      const signal = resultat.signal && resultat.signal.ressemble ? resultat.signal.phraseExport : null;
      setTexte(exportPsy({ journal, episodes, symptomes }, { aujourdhui: repo.aujourdhui(), carte, reperes: reperesPsy(resultat, carte), signal }));
    })();
  }, []);

  // writeText est appelé directement dans le toucher (geste utilisateur exigé par iOS).
  const copierTexte = () => {
    if (!texte) return;
    copier(texte).then((ok) => setMessage(ok ? 'Copié. Prêt à coller dans PSY.' : 'La copie n\'a pas marché : sélectionne le texte ou utilise Partager.'));
  };
  const partager = () => {
    if (!texte || !navigator.share) return;
    navigator.share({ text: texte }).catch(() => {});
  };

  return html`<main class="ecran export-psy">
    <${Entete} titre="Export PSY" retour=${() => { location.hash = '#/analyse'; }} />
    <p class="discret">Les 7 derniers jours, prêts à coller dans le projet PSY.</p>
    <div class="actions-col section">
      <button type="button" class="btn btn-plein" disabled=${!texte} onClick=${copierTexte}>Copier les 7 derniers jours pour PSY</button>
      ${message && html`<p class="discret" role="status">${message}</p>`}
      ${typeof navigator !== 'undefined' && navigator.share && html`<button type="button" class="btn" disabled=${!texte} onClick=${partager}>Partager</button>`}
      <a class="btn lien-bouton" href="#/reglages/sauvegarde">Faire aussi une sauvegarde</a>
    </div>
    <pre class="apercu-export section" aria-label="Aperçu du texte">${texte || 'Préparation…'}</pre>
  </main>`;
}
