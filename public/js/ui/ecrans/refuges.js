// « Mes refuges » (v11, spec §8.1) : ses titres, un par ligne, et jusqu'à trois playlists, chacune un nom et un lien. Ouvert
// depuis Bien-être et depuis Réglages › Mon plan. Tout est facultatif et Carnet ne propose rien. Tout s'écrit seul au fil de la
// frappe, en file comme Mon plan, et part dans la sauvegarde avec lui. En tête des playlists, les lignes qui ont un lien : c'est
// d'ici qu'on écoute depuis Bien-être (spec §8.4), sans réseau venant de Carnet. Un lien refusé (ni https, ni spotify, ni
// music) n'est pas gardé, sans message ; « ?si=… » est retiré (domain/refuges.js).
// v11 (7/11) · Choisir dans son compte Spotify (spec §8.3), la seule exception à « zéro réseau », et seulement d'ici, au toucher
// sur « Choisir dans mon compte » (plateforme/spotify.js). Au retour, la liste de ses playlists s'affiche en mémoire de l'écran,
// jamais en base ; chaque toucher sur une playlist l'ajoute ou la retire de ses refuges, trois au plus. Le code, si le retour
// est arrivé dans Safari, se colle ici. Sans identifiant de l'app Spotify, ni bouton ni champ de code.
import { html, useEffect, useRef, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { ChampTexte } from '../composants/texte.js';
import { LignesPlaylists, lireRefuges } from '../composants/refuges.js';
import { coche, libelleChoix } from '../composants/coche.js';
import { afficherToast } from '../composants/toast.js';
import { repo } from '../../donnees.js';
import { useIndicateur, ecrireAvecEssais } from '../hooks.js';
import { etatApp } from '../../store.js';
import {
  MAX_PLAYLISTS, avecPlaylist, normaliserRefuges, refugesVides, nomPlaylist, choisieDeSpotify, basculerSpotify, sansSpotify,
} from '../../domain/refuges.js';
import { connexionDisponible, ouvrirConnexion, lireAttente, finirConnexion } from '../../plateforme/spotify.js';

// L'écran d'où il a été ouvert (Bien-être, Mon plan), sinon Bien-être.
function revenir() {
  const precedente = etatApp.lire().routePrecedente;
  location.hash = precedente && !/^#\/refuges(\/|$)/.test(precedente) ? precedente : '#/bien-etre';
}

// Rien de noté : la méta vaut null, pour que l'aperçu d'un import n'annonce rien à perdre.
const aEcrire = (r) => (refugesVides(r) ? null : r);

// Les lignes de saisie : une par playlist notée, puis une ligne vide s'il en reste moins de trois. Chacune a une clé à elle,
// le temps de l'écran : une ligne vidée disparaît (domain/refuges.js), et les champs, non contrôlés, doivent suivre leur
// playlist. Vidée en dernière position, elle devient la ligne vide sur place, sans perdre le clavier ; vidée au milieu, toutes
// les lignes repartent de zéro, pour qu'aucun champ ni brouillon ne parle d'une autre ligne que la sienne.
function lignesApres(cles, cle, i, avant, apres, neuve) {
  const notees = cles.slice(0, avant);
  if (apres === avant + 1) return [...notees, cle, ...(apres < MAX_PLAYLISTS ? [neuve()] : [])];
  if (apres === avant - 1) {
    if (i === apres) return [...notees.slice(0, i), cle];
    return Array.from({ length: Math.min(apres + 1, MAX_PLAYLISTS) }, neuve);
  }
  return cles;
}

// Le message d'un échec de la connexion : les liens déjà notés ne bougent pas.
const ECHECS = {
  refus: 'Spotify refuse cette connexion. Tes liens notés restent.',
  autre: 'La connexion n\'a pas abouti. Tes liens notés restent.',
};

export function MesRefuges() {
  const [refuges, setRefuges] = useState(null);
  const [cles, setCles] = useState([]);
  const lignes = useRef([]);
  const compte = useRef(0);
  const file = useRef(Promise.resolve());
  const [, signaler] = useIndicateur();
  const neuve = () => { compte.current += 1; return compte.current; };
  const poserCles = (c) => { lignes.current = c; setCles(c); };
  // Toutes les lignes de saisie repartent de zéro : une par playlist notée, puis la ligne vide s'il en reste moins de trois.
  const recompter = (r) => poserCles(Array.from({ length: Math.min(r.playlists.length + 1, MAX_PLAYLISTS) }, neuve));
  // La connexion à Spotify : la demande en attente d'un code, la liste lue (en mémoire de l'écran), l'échec, l'attente d'une
  // réponse.
  const spotify = connexionDisponible();
  const [attente, setAttente] = useState(() => spotify && Boolean(lireAttente(window)));
  const [liste, setListe] = useState(null);
  const [echec, setEchec] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const finir = (code) => {
    setEchec(null);
    setEnCours(true);
    finirConnexion({ code, win: window })
      .then((l) => setListe(l), (e) => setEchec(e && e.raison === 'refus' ? 'refus' : 'autre'))
      .finally(() => { setEnCours(false); setAttente(Boolean(lireAttente(window))); });
  };
  // La page de Spotify s'ouvre ; si elle s'ouvre par-dessus l'app, le bouton reste utilisable, et le champ du code est là.
  const choisir = () => {
    setEchec(null);
    setEnCours(true);
    ouvrirConnexion({ win: window })
      .then(() => setAttente(true), () => setEchec('autre'))
      .finally(() => setEnCours(false));
  };

  useEffect(() => {
    lireRefuges().then((r) => {
      recompter(r);
      setRefuges(r);
    });
    // Le retour de Spotify, posé au démarrage (main.js) : pris une seule fois.
    const retour = etatApp.lire().retourSpotify;
    if (retour) {
      etatApp.maj({ retourSpotify: null });
      if (retour.issue === 'finir' && spotify) finir(retour.code);
      else setEchec('autre');
    }
  }, []);

  // Écritures en file, chacune relue et réécrite dans sa transaction : rien ne s'écrase. La promesse rejette si l'écriture
  // échoue : le champ garde alors son brouillon local.
  const ecrire = (transformer) => {
    const travail = file.current.then(() => ecrireAvecEssais(() => repo.meta.modifier('refuges', transformer), signaler));
    file.current = travail.catch(() => {});
    return travail;
  };
  const changerTitres = (titres) => ecrire((brut) => aEcrire(normaliserRefuges({ ...normaliserRefuges(brut), titres })))
    .then((v) => setRefuges(normaliserRefuges(v)));
  // La ligne est retrouvée par sa clé au moment d'écrire : la ligne vide, au bout, vaut le nombre de playlists (un ajout).
  // Une ligne qui n'est plus affichée n'écrit rien.
  const changerPlaylist = (cle, changement) => {
    if (!lignes.current.includes(cle)) return Promise.resolve();
    let avant = 0;
    let i = -1;
    return ecrire((brut) => {
      const r = normaliserRefuges(brut);
      avant = r.playlists.length;
      i = lignes.current.indexOf(cle);
      return i < 0 ? brut : aEcrire(avecPlaylist(r, i, changement));
    }).then((v) => {
      const r = normaliserRefuges(v);
      if (i >= 0) poserCles(lignesApres(lignes.current, cle, i, avant, r.playlists.length, neuve));
      setRefuges(r);
    });
  };

  // Une écriture qui peut ajouter ou retirer des lignes ailleurs qu'au bout (les playlists de Spotify) : si la liste a changé,
  // les lignes de saisie repartent de zéro. Une écriture qui échoue ne change rien à l'écran.
  const remplacer = (transformer) => {
    let avant = null;
    return ecrire((brut) => {
      const r = normaliserRefuges(brut);
      avant = JSON.stringify(r.playlists);
      return aEcrire(transformer(r));
    }).then((v) => {
      const r = normaliserRefuges(v);
      if (JSON.stringify(r.playlists) !== avant) recompter(r);
      setRefuges(r);
      return true;
    }, () => false);
  };
  const basculer = (p) => remplacer((r) => basculerSpotify(r, p));
  // « Retirer ces playlists », avec « Annuler » : les playlists d'avant reviennent, à leur place ; les titres ne bougent pas.
  const retirer = () => {
    const avant = refuges.playlists;
    remplacer(sansSpotify).then((ok) => ok && afficherToast('Playlists de Spotify retirées', {
      libelle: 'Annuler', faire: () => remplacer((r) => ({ ...r, playlists: avant })),
    }));
  };

  if (!refuges) return html`<main class="ecran fiche refuges"><${Entete} titre="Mes refuges" retour=${revenir} /></main>`;
  const plein = refuges.playlists.length >= MAX_PLAYLISTS;
  const deSpotify = refuges.playlists.some((p) => p.source === 'spotify');
  return html`<main class="ecran fiche refuges">
    <${Entete} titre="Mes refuges" retour=${revenir} />
    <div class="champ-fiche">
      <${ChampTexte} id="refuges-titres" etiquette="Mes titres" valeur=${refuges.titres} lignes=${4} placeholder="Un titre par ligne."
        cleBrouillon="carnet:brouillon:refuges:titres" surEnregistrer=${changerTitres} />
    </div>
    <section class="champ-fiche playlists-refuges teinte-bien-etre" aria-labelledby="titre-mes-playlists">
      <h2 class="etiquette" id="titre-mes-playlists">Mes playlists</h2>
      <${LignesPlaylists} playlists=${refuges.playlists} />
      ${(spotify || deSpotify) && html`<div class="carte compte-spotify">
        ${spotify && html`<button type="button" class="btn btn-plein" disabled=${enCours} aria-describedby="note-compte-spotify" onClick=${choisir}>Choisir dans mon compte</button>
          <p class="note-import" id="note-compte-spotify">Une seule lecture : Carnet ne garde pas la connexion.</p>`}
        ${spotify && attente && html`<${ChampCode} enCours=${enCours} surFinir=${finir} />`}
        ${echec && html`<p class="texte-import" role="status">${ECHECS[echec]}</p>`}
        ${liste && html`<${ListeSpotify} liste=${liste} refuges=${refuges} plein=${plein} surBasculer=${basculer} />`}
        ${deSpotify && html`<button type="button" class="btn" onClick=${retirer}>Retirer ces playlists</button>`}
      </div>`}
      ${cles.map((cle, i) => {
        const p = refuges.playlists[i] || null;
        const n = i + 1;
        return html`<div class="carte saisie-playlist" key=${cle}>
          <${ChampTexte} id=${`refuges-nom-${i}`} etiquette=${html`Nom<span class="visuellement-cache"> de la playlist ${n}</span>`}
            valeur=${p && p.nom} lignes=${1} dicter=${false} cleBrouillon=${`carnet:brouillon:refuges:nom-${i}`}
            surEnregistrer=${(nom) => changerPlaylist(cle, { nom })} />
          <${ChampTexte} id=${`refuges-lien-${i}`} etiquette=${html`Lien<span class="visuellement-cache"> de la playlist ${n}</span>`}
            valeur=${p && p.lien} lignes=${1} dicter=${false} cleBrouillon=${`carnet:brouillon:refuges:lien-${i}`}
            surEnregistrer=${(lien) => changerPlaylist(cle, { lien })} />
        </div>`;
      })}
    </section>
  </main>`;
}

// Le code, quand le retour de Spotify est arrivé dans Safari (la page du code, ui/ecrans/code-spotify.js) : collé ici, il finit
// la connexion avec la demande restée dans l'app.
function ChampCode({ enCours, surFinir }) {
  const zone = useRef(null);
  const valider = () => {
    const code = zone.current && zone.current.value.trim();
    if (code && !enCours) surFinir(code);
  };
  return html`<div class="code-compte">
    <label class="etiquette" for="code-spotify">Code de Spotify</label>
    <input id="code-spotify" ref=${zone} class="champ-ligne" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"
      enterkeyhint="done" onKeyDown=${(e) => { if (e.key === 'Enter') valider(); }} />
    <button type="button" class="btn" disabled=${enCours} onClick=${valider}>Finir la connexion</button>
  </div>`;
}

// Les playlists lues dans son compte, nommées sous « Spotify » : un toucher en ajoute une à ses refuges (choisie, elle a sa
// coche), un autre la retire. Avec trois playlists notées, les autres ne se choisissent plus (aria-disabled). Les noms sont du
// texte, jamais du HTML.
function ListeSpotify({ liste, refuges, plein, surBasculer }) {
  if (!liste.length) return html`<p class="note-import">Aucune playlist dans ce compte.</p>`;
  return html`<div class="liste-compte">
    <h3 class="etiquette" id="titre-liste-spotify">Spotify</h3>
    <div class="pastilles grille-choix liste-spotify" role="group" aria-labelledby="titre-liste-spotify">
      ${liste.map((p, i) => {
        const choisie = choisieDeSpotify(refuges, p.lien);
        const bloquee = !choisie && plein;
        return html`<button type="button" class="pastille" key=${p.lien} aria-pressed=${choisie ? 'true' : 'false'} aria-disabled=${bloquee ? 'true' : null}
          onClick=${() => { if (!bloquee) surBasculer(p); }}>${coche()}<span class="texte-pastille">${libelleChoix(nomPlaylist(p, i))}</span></button>`;
      })}
    </div>
  </div>`;
}
