// Export vers PSY : texte des 7 derniers jours, calculé à l'ouverture, copié dans le geste. S'ouvre depuis
// « Pour mes soignants », en haut de Soins (v6.1).
import { html, useEffect, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { repo } from '../../donnees.js';
import { exportPsy } from '../../export/psy.js';
import { carteLibelles } from '../../domain/libelles.js';
import { copier } from '../../plateforme/presse-papier.js';
import { useSauvegarde } from '../sauvegarde.js';
import { Icones } from '../icones.js';

export function ExportPsy() {
  const [texte, setTexte] = useState(null);
  const [message, setMessage] = useState(null);
  const sauvegarde = useSauvegarde();
  useEffect(() => {
    (async () => {
      // perso (v9) : les mots à soi (méta `motsPerso`), pour le nom et la famille d'un relevé qui en cite un.
      const [items, zeroDepuis, journal, episodes, symptomes, humeurs, perso] = await Promise.all([
        repo.listes.items(), repo.meta.lire('explosionsDepuis'), repo.journal.tous(), repo.episodes.tous(), repo.symptomes.tous(), repo.humeurs.tous(),
        repo.meta.lire('motsPerso'),
      ]);
      setTexte(exportPsy({ journal, episodes, symptomes, humeurs, perso }, { aujourdhui: repo.aujourdhui(), carte: carteLibelles(items), zeroDepuis }));
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

  // « Faire aussi une sauvegarde » : la feuille de partage s'ouvre directement (fichiers prêts).
  return html`<main class="ecran export-psy">
    <${Entete} titre="Export PSY" retour=${() => { location.hash = '#/soins'; }} />
    <pre class="apercu-export" aria-label="Aperçu du texte">${texte || 'Préparation…'}</pre>
    <button type="button" class="btn btn-plein" disabled=${!texte} onClick=${copierTexte}>${Icones.copier()}Copier les 7 derniers jours pour PSY</button>
    ${message && html`<p class="statut-centre" role="status">${message}</p>`}
    ${typeof navigator !== 'undefined' && navigator.share && html`<button type="button" class="btn" disabled=${!texte} onClick=${partager}>${Icones.partager()}Partager</button>`}
    <button type="button" class="btn-lien lien-centre" disabled=${!sauvegarde.fichiers} onClick=${sauvegarde.exporterMaintenant}>Faire aussi une sauvegarde</button>
    ${sauvegarde.message && html`<p class="statut-centre" role="status">${sauvegarde.message}</p>`}
  </main>`;
}
