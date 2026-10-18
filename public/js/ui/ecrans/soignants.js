// Vue soignants : une page A4 à montrer telle quelle en consultation, partagée en PDF.
// La page est dessinée sur un canvas (aperçu) puis emballée dans un PDF d'une page. S'ouvre depuis « Pour mes
// soignants », en haut de Soins (v6.1) ; le prénom de la page se règle ici, enregistré à la sortie du champ.
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
import { LibelleChamp } from '../composants/rubrique.js';
import { Icones } from '../icones.js';

export function Soignants() {
  const [pro, setPro] = useState(null);
  // null tant que la base n'est pas lue : l'aperçu attend le prénom pour ne se dessiner qu'une fois.
  const [prenom, setPrenom] = useState(null);
  const [items, setItems] = useState(null);
  const [fichier, setFichier] = useState(null);
  const [message, setMessage] = useState(null);
  const toile = useRef(null);

  useEffect(() => {
    Promise.all([repo.listes.items('professionnel'), repo.meta.lire('prenomSoignants')]).then(([liste, p]) => {
      setItems(liste); setPrenom(p || ''); setPro((x) => x || 'professionnel:psychiatre');
    });
  }, []);

  useEffect(() => {
    if (!pro || prenom == null || !toile.current) return;
    let actif = true;
    setFichier(null);
    (async () => {
      const [{ resultat, carte, zeroDepuis }, journal, episodes, symptomes, traitements, rdvs, traitementActuel, humeurs] = await Promise.all([
        calculerAnalyse(), repo.journal.tous(), repo.episodes.tous(), repo.symptomes.tous(), repo.traitements.tous(), repo.rdv.tous(), repo.meta.lire('traitementActuel'),
        repo.humeurs.tous(),
      ]);
      const aujourdhui = repo.aujourdhui();
      const modele = modeleSoignants({ journal, episodes, symptomes, traitements, humeurs }, { aujourdhui, carte, analyse: resultat, professionnel: pro, prenom, rdvs, traitements, traitementActuel, zeroDepuis });
      if (!actif || !toile.current) return;
      dessinerPage(toile.current, mettreEnPage(modele));
      const blob = await new Promise((ok) => toile.current.toBlob(ok, 'image/jpeg', 0.85));
      if (!actif || !blob) return;
      const pdf = creerPdfJpeg(new Uint8Array(await blob.arrayBuffer()), { largeurPx: TAILLE_PX.largeur, hauteurPx: TAILLE_PX.hauteur });
      setFichier(new File([pdf], `carnet-consultation-${aujourdhui}.pdf`, { type: 'application/pdf' }));
    })();
    return () => { actif = false; };
  }, [pro, prenom]);

  // Même clé et même enregistrement que l'ancien champ de Réglages : à la sortie du champ, vide = aucun prénom.
  const changerPrenom = (e) => {
    const v = e.target.value.trim();
    if (v === prenom) return;
    repo.meta.ecrire('prenomSoignants', v || null);
    setPrenom(v);
  };

  // Dans le geste : le PDF est déjà prêt, navigator.share est appelé sans attente préalable.
  const partagerPdf = () => {
    if (!fichier) return;
    partager(fichier, { titre: 'Suivi quotidien' }).then((r) => {
      if (r === 'impossible') setMessage(estModeApp() ? "L'iPhone n'a pas proposé de partage cette fois." : 'Partage indisponible ici : utilise Imprimer.');
    });
  };

  return html`<main class="ecran soignants">
    <${Entete} titre="Vue soignants" retour=${() => { location.hash = '#/soins'; }} />
    ${items && html`<div class="champ-fiche"><${LibelleChamp} icone="personne">Pour qui</${LibelleChamp}>
      <${Pastilles} etiquette="Pour qui" options=${options(items, 'professionnel', pro)} valeur=${pro} surChoix=${(v) => v && setPro(v)} classe="souples larges" /></div>`}
    <canvas ref=${toile} class="apercu-page" role="img" aria-label="Aperçu de la page pour la consultation"></canvas>
    <button type="button" class="btn btn-plein" disabled=${!fichier} onClick=${partagerPdf}>${Icones.partager()}${fichier ? 'Partager en PDF' : 'Préparation…'}</button>
    ${!estModeApp() && html`<button type="button" class="btn" onClick=${() => window.print()}>Imprimer</button>`}
    ${message && html`<p class="statut-centre" role="status">${message}</p>`}
    ${prenom != null && html`<div class="champ-fiche champ-prenom"><${LibelleChamp} icone="personne" pour="prenom-soignants">Prénom sur la page</${LibelleChamp}>
      <input id="prenom-soignants" class="champ-ligne" autocomplete="off" enterkeyhint="done" defaultValue=${prenom}
        onBlur=${changerPrenom} onKeyDown=${(e) => { if (e.key === 'Enter') e.target.blur(); }} /></div>`}
  </main>`;
}
