// « Mes refuges » (v11, spec §8 ; v12, spec v12 §6.1) : une simple liste, ouverte depuis Bien-être et depuis Réglages › Mon
// plan. De haut en bas :
// - l'en-tête, avec « Modifier » à droite, vers ses réglages (#/refuges/reglages, ecrans/refuges-reglages.js) ;
// - « Coller le code de Spotify », vers ses réglages, seulement tant qu'une demande de connexion attend son retour ;
// - la carte de la playlist suivie (« Détente »), qui ouvre Spotify d'un toucher, puis les autres playlists qui ont un lien ;
// - « Un toucher ouvre Spotify. », une fois ;
// - ses morceaux, chacun ouvre Spotify sur lui ; « La suite est dans Spotify. » au-delà du plafond, sans aucun nombre ;
// - « Mes titres », en lecture seule.
// Sans playlist qui a un lien : une phrase, « Choisir dans mon compte », « Coller le code de Spotify » si une demande attend,
// et « Coller un lien » (tous deux vers les réglages).
// Rien n'est lu que la base, relue à chacune de ses écritures (une mise à jour finie après « Retour ») : aucune requête à
// l'ouverture. La connexion à Spotify ne part qu'au toucher sur « Choisir dans mon compte » ; son retour arrive ici (main.js),
// et l'écran le passe aux réglages, où la connexion se finit (la liste du compte, le champ du code, les messages). Tant qu'une
// demande attend son retour, « Coller le code de Spotify » mène à ce champ : la page du code (arrivée dans Safari) dit de le
// coller dans Mes refuges. Tout est facultatif et l'app ne propose rien.
import { html, useEffect, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { LignesPlaylists, ListeMorceaux, lireRefuges, ECHECS_SPOTIFY } from '../composants/refuges.js';
import { useEtatApp } from '../hooks.js';
import { etatApp } from '../../store.js';
import { versHash } from '../../routeur.js';
import { normaliserRefuges, playlistSuivie, lienAOuvrir } from '../../domain/refuges.js';
import { connexionDisponible, ouvrirConnexion, lireAttente } from '../../plateforme/spotify.js';

const REGLAGES = versHash('refuges-reglages');

// L'écran d'où Mes refuges a été ouvert (Bien-être, Mon plan), retenu tant que l'app reste ouverte : ses réglages s'ouvrent
// d'ici et y reviennent. Sinon Bien-être.
let origine = null;
function retenirOrigine() {
  const precedente = etatApp.lire().routePrecedente;
  if (precedente && !/^#\/refuges(\/|$)/.test(precedente)) origine = precedente;
}
function revenir() {
  location.hash = origine || versHash('bien-etre');
}

export function MesRefuges() {
  useState(retenirOrigine); // une fois, à l'ouverture
  const [refuges, setRefuges] = useState(null);
  const [echec, setEchec] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const spotify = connexionDisponible();
  // Une demande de connexion qui attend le retour de Spotify (le code, s'il est arrivé dans Safari, se colle dans les réglages).
  const attendue = () => spotify && Boolean(lireAttente(window));
  const [attente, setAttente] = useState(attendue);
  const version = useEtatApp((e) => e.versionDonnees || 0);

  // Le retour de Spotify, posé au démarrage (main.js) : il est laissé aux réglages, qui le prennent une seule fois.
  useEffect(() => {
    if (etatApp.lire().retourSpotify) location.replace(REGLAGES);
  }, []);
  // La base, relue à chaque écriture : l'écran montre toujours ce qui est noté. Des refuges illisibles se lisent vides ; une
  // lecture dépassée par une autre ne s'affiche pas.
  useEffect(() => {
    if (etatApp.lire().retourSpotify) return undefined;
    let actif = true;
    lireRefuges().then((r) => { if (actif) setRefuges(r); }, () => { if (actif) setRefuges(normaliserRefuges(null)); });
    return () => { actif = false; };
  }, [version]);

  // L'état vide : la page de Spotify s'ouvre ; si la demande ne peut pas être notée, rien ne part, et le message le dit.
  const choisir = () => {
    setEchec(false);
    setEnCours(true);
    ouvrirConnexion({ win: window }).catch(() => setEchec(true)).finally(() => {
      setEnCours(false);
      setAttente(attendue());
    });
  };

  const entete = html`<${Entete} titre="Mes refuges" retour=${revenir}
    droite=${html`<a class="btn-lien modifier-refuges" href=${REGLAGES}>Modifier</a>`} />`;
  if (!refuges) return html`<main class="ecran fiche refuges">${entete}</main>`;
  const suivie = playlistSuivie(refuges);
  const aOuvrir = refuges.playlists.some((p) => p.lien);
  const versSpotify = refuges.playlists.some((p) => /^spotify:/.test(lienAOuvrir(p.lien) || ''));
  const versCode = attente && html`<a class="btn-lien coller-code" href=${REGLAGES}>Coller le code de Spotify</a>`;
  return html`<main class="ecran fiche refuges">
    ${entete}
    ${aOuvrir ? html`${versCode}
      <${LignesPlaylists} playlists=${refuges.playlists} />
      ${versSpotify && html`<p class="discret note-refuges">Un toucher ouvre Spotify.</p>`}
      ${suivie && html`<${ListeMorceaux} playlist=${suivie.p} rang=${suivie.i} />`}
      ${suivie && suivie.p.morceaux && suivie.p.suite && html`<p class="discret note-refuges">La suite est dans Spotify.</p>`}`
    : html`<div class="carte refuges-vide">
      <p class="texte-import">Choisis ta playlist dans ton compte Spotify, ou colle son lien.</p>
      ${spotify && html`<button type="button" class="btn btn-plein" disabled=${enCours} onClick=${choisir}>Choisir dans mon compte</button>`}
      ${echec && html`<p class="note-import" role="status">${ECHECS_SPOTIFY.autre}</p>`}
      ${versCode}
      <a class="btn-lien" href=${REGLAGES}>Coller un lien</a>
    </div>`}
    ${refuges.titres && html`<section class="titres-refuges" aria-labelledby="titre-mes-titres">
      <h2 class="libelle-section" id="titre-mes-titres">Mes titres</h2>
      <p class="carte texte-lecture">${refuges.titres}</p>
    </section>`}
  </main>`;
}
