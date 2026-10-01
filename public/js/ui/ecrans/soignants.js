// Vue soignants : une page A4 à montrer telle quelle en consultation, partagée en PDF.
// La page est dessinée sur un canvas (aperçu) puis emballée dans un PDF d'une page.
import { html, useEffect, useRef, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { Pastilles } from '../composants/pastilles.js';
import { repo } from '../../donnees.js';
import { calculerAnalyse } from './analyse.js';
import { modeleSoignants } from '../../export/soignants.js';
import { mettreEnPage } from '../../export/page-a4.js';
import { creerPdfJpeg } from '../../export/pdf.js';
import { dessinerPage, TAILLE_PX } from '../graphes/dessin-canvas.js';
import { partager } from '../../plateforme/partage.js';
import { estModeApp } from '../../plateforme/mode.js';
import { options } from './aujourdhui.js';

export function Soignants() {
  const [pro, setPro] = useState(null);
  const [items, setItems] = useState(null);
  const [fichier, setFichier] = useState(null);
  const [message, setMessage] = useState(null);
  const toile = useRef(null);

  useEffect(() => {
    repo.listes.items('professionnel').then((liste) => { setItems(liste); setPro((p) => p || 'professionnel:psychiatre'); });
  }, []);

  useEffect(() => {
    if (!pro || !toile.current) return;
    let actif = true;
    setFichier(null);
    (async () => {
      const [{ resultat, carte }, journal, episodes, symptomes, traitements, rdvs, prenom] = await Promise.all([
        calculerAnalyse(), repo.journal.tous(), repo.episodes.tous(), repo.symptomes.tous(), repo.traitements.tous(), repo.rdv.tous(), repo.meta.lire('prenomSoignants'),
      ]);
      const aujourdhui = repo.aujourdhui();
      const modele = modeleSoignants({ journal, episodes, symptomes, traitements }, { aujourdhui, carte, analyse: resultat, professionnel: pro, prenom: prenom || '', rdvs, traitements });
      if (!actif || !toile.current) return;
      dessinerPage(toile.current, mettreEnPage(modele));
      const blob = await new Promise((ok) => toile.current.toBlob(ok, 'image/jpeg', 0.85));
      if (!actif || !blob) return;
      const pdf = creerPdfJpeg(new Uint8Array(await blob.arrayBuffer()), { largeurPx: TAILLE_PX.largeur, hauteurPx: TAILLE_PX.hauteur });
      setFichier(new File([pdf], `carnet-consultation-${aujourdhui}.pdf`, { type: 'application/pdf' }));
    })();
    return () => { actif = false; };
  }, [pro]);

  // Dans le geste : le PDF est déjà prêt, navigator.share est appelé sans attente préalable.
  const partagerPdf = () => {
    if (!fichier) return;
    partager(fichier, { titre: 'Suivi quotidien' }).then((r) => {
      if (r === 'impossible') setMessage(estModeApp() ? "L'iPhone n'a pas proposé de partage cette fois." : 'Partage indisponible ici : utilise Imprimer.');
    });
  };

  return html`<main class="ecran soignants">
    <${Entete} titre="Vue soignants" retour=${() => { location.hash = '#/analyse'; }} />
    ${items && html`<${Pastilles} etiquette="Pour qui" options=${options(items, 'professionnel', pro)} valeur=${pro} surChoix=${(v) => v && setPro(v)} colonnes=${2} classe="grille-choix" />`}
    <div class="actions-col section">
      <button type="button" class="btn btn-plein" disabled=${!fichier} onClick=${partagerPdf}>${fichier ? 'Partager en PDF' : 'Préparation…'}</button>
      ${!estModeApp() && html`<button type="button" class="btn" onClick=${() => window.print()}>Imprimer</button>`}
      ${message && html`<p class="discret" role="status">${message}</p>`}
    </div>
    <canvas ref=${toile} class="apercu-page section" role="img" aria-label="Aperçu de la page pour la consultation"></canvas>
  </main>`;
}
