// Les réglages de Mes refuges (v12, spec v12 §6.1), derrière « Modifier » (#/refuges/reglages, onglet Bien-être) : la saisie de
// la v11. Le retour et le geste de retour mènent à Mes refuges. De haut en bas :
// - la connexion à Spotify (plateforme/spotify.js), la seule exception à « zéro réseau », au seul toucher sur l'un de ses
//   boutons : « Mettre à jour la liste » et « Changer de playlist » quand une playlist est suivie, sinon « Choisir dans mon
//   compte » ; la note « Une seule lecture… » ; le champ du code ; le message d'un échec ; la liste du compte pendant un choix ;
//   « Retirer ces playlists », avec « Annuler » ;
// - les trois lignes nom et lien, qui s'écrivent seules, en file comme Mon plan ; un lien refusé (ni https, ni spotify, ni
//   music) n'est pas gardé, sans message ; « ?si=… » est retiré (domain/refuges.js) ; un lien https qui ne deviendra pas un
//   lien direct vers une app a une note discrète ;
// - « Mes titres », un par ligne.
// Le retour de Spotify arrive dans Mes refuges (main.js), qui le passe ici : il est pris une seule fois.
// - Un choix (spec v12 §6.4) : la liste de ses playlists s'affiche, en mémoire de l'écran, jamais en base. Un toucher sur l'une
//   lit d'abord ses morceaux (`lireMorceaux`, la fermeture qui détient le jeton : un seul usage, 10 minutes au plus, oubliée
//   quand l'écran se démonte) ; rien n'est écrit avant la réponse. Avec des morceaux, la playlist est notée avec eux
//   (choisirSpotify) ; si Spotify ne les donne pas (`morceaux`), elle est notée sans eux, avec le message. La liste disparaît
//   alors, et « Annuler » rend les refuges d'avant. Une coupure du réseau n'écrit rien : on peut retoucher. Une connexion
//   expirée n'écrit rien et le dit.
// - Une mise à jour : les morceaux de la playlist suivie, relus sans la liste du compte (avecMorceaux), puis l'écran revient
//   à Mes refuges, où ils s'affichent. Si Spotify ne les donne pas, la playlist et ses anciens morceaux restent.
// Le code, si le retour est arrivé dans Safari, se colle ici. Sans identifiant de l'app Spotify, ni bouton ni champ de code.
import { html, useEffect, useRef, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { ChampTexte } from '../composants/texte.js';
import { lireRefuges, ECHECS_SPOTIFY, expiree } from '../composants/refuges.js';
import { coche, libelleChoix } from '../composants/coche.js';
import { afficherToast, fermerToast } from '../composants/toast.js';
import { repo } from '../../donnees.js';
import { useIndicateur, ecrireAvecEssais } from '../hooks.js';
import { etatApp } from '../../store.js';
import { versHash } from '../../routeur.js';
import {
  MAX_PLAYLISTS, avecPlaylist, avecMorceaux, normaliserRefuges, refugesVides, nomPlaylist, choisirSpotify, sansSpotify, playlistSuivie,
  idPlaylistSpotify, lienAOuvrir,
} from '../../domain/refuges.js';
import { connexionDisponible, ouvrirConnexion, lireAttente, finirConnexion } from '../../plateforme/spotify.js';

const LISTE = versHash('refuges');
const revenir = () => { location.hash = LISTE; };

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

// Un lien https qui ne deviendra pas un lien direct vers une app (ni Spotify, ni Musique) : un toucher peut ne rien ouvrir. Sa
// note ne dit pas « risque » (spec v12 §6.2), un mot interdit (tests/aides/mots-interdits.js).
const lienIncertain = (lien) => /^https:/.test(lienAOuvrir(lien) || '');

export function ReglagesRefuges() {
  const [refuges, setRefuges] = useState(null);
  const [cles, setCles] = useState([]);
  const lignes = useRef([]);
  const compte = useRef(0);
  const file = useRef(Promise.resolve());
  const [, signaler] = useIndicateur();
  // Le toast « Annuler » encore ouvert (un retrait ou un choix), que toute autre écriture des playlists ferme.
  const annulable = useRef(null);
  const oublierAnnuler = () => {
    if (annulable.current) fermerToast(annulable.current);
    annulable.current = null;
  };
  const neuve = () => { compte.current += 1; return compte.current; };
  const poserCles = (c) => { lignes.current = c; setCles(c); };
  // Toutes les lignes de saisie repartent de zéro : une par playlist notée, puis la ligne vide s'il en reste moins de trois.
  const recompter = (r) => poserCles(Array.from({ length: Math.min(r.playlists.length + 1, MAX_PLAYLISTS) }, neuve));
  // La connexion à Spotify : la demande en attente d'un code, la liste lue (en mémoire de l'écran) et la fermeture qui lit les
  // morceaux d'un choix (jamais dans l'état : elle détient le jeton), l'échec, l'attente d'une réponse, le code gardé après
  // une coupure du réseau.
  const spotify = connexionDisponible();
  const [attente, setAttente] = useState(() => spotify && Boolean(lireAttente(window)));
  const [liste, setListe] = useState(null);
  const lecture = useRef(null);
  const [echec, setEchec] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [codeGarde, setCodeGarde] = useState(null);
  const monte = useRef(true);

  // Écritures en file, chacune relue et réécrite dans sa transaction : rien ne s'écrase. La promesse rejette si l'écriture
  // échoue : le champ garde alors son brouillon local.
  const ecrire = (transformer) => {
    const travail = file.current.then(() => ecrireAvecEssais(() => repo.meta.modifier('refuges', transformer), signaler));
    file.current = travail.catch(() => {});
    return travail;
  };
  // Une écriture qui peut ajouter, retirer ou changer des lignes ailleurs qu'au bout (Spotify) : si la liste a changé, les
  // lignes de saisie repartent de zéro. Une écriture qui échoue ne change rien à l'écran ; la promesse dit si elle a abouti.
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
  // « Annuler » après un retrait ou un choix : les playlists d'avant (lues dans sa transaction) reviennent, à leur place ; les
  // titres ne bougent pas. Une autre écriture des playlists ferme le toast, et une liste qui n'est plus celle laissée par
  // l'écriture annulée n'est pas remplacée (un « Annuler » touché après une écriture venue d'ailleurs) : rien ne se perd.
  const ecrireAnnulable = (texte, transformer) => {
    oublierAnnuler();
    let avant = null;
    let apres = null;
    return remplacer((r) => {
      const n = transformer(r);
      avant = r.playlists;
      apres = JSON.stringify(normaliserRefuges(n).playlists);
      return n;
    }).then((ok) => {
      if (!ok) return false;
      annulable.current = afficherToast(texte, {
        libelle: 'Annuler',
        faire: () => {
          annulable.current = null;
          remplacer((r) => (JSON.stringify(r.playlists) === apres ? { ...r, playlists: avant } : r));
        },
      });
      return true;
    });
  };

  // « Mettre à jour la liste », fini : les morceaux notés sur la playlist suivie, puis Mes refuges, où ils s'affichent.
  const mettreAJour = ({ playlist, morceaux, suite }) => {
    oublierAnnuler();
    return remplacer((r) => avecMorceaux(r, playlist, { morceaux, suite })).then((ok) => {
      if (!ok) setEchec('autre');
      else if (monte.current) location.replace(LISTE);
    });
  };
  // Réseau coupé : la demande reste (plateforme/spotify.js), et le code avec elle, déjà dans le champ, pour relancer d'un
  // toucher. Sans cela, le code d'un retour dans l'app, retiré de l'adresse et jamais montré, ne pourrait pas se recoller.
  const finir = (code) => {
    setEchec(null);
    setEnCours(true);
    finirConnexion({ code, win: window })
      .then((r) => {
        setCodeGarde(null);
        if (r.but === 'maj') return mettreAJour(r);
        lecture.current = r.lireMorceaux;
        setListe(r.liste);
        return undefined;
      }, (e) => {
        const raison = e && e.raison;
        setEchec(raison === 'refus' || raison === 'morceaux' ? raison : 'autre');
        setCodeGarde(raison === 'reseau' ? code : null);
      })
      .finally(() => { setEnCours(false); setAttente(Boolean(lireAttente(window))); });
  };
  // La page de Spotify s'ouvre (un choix, ou la mise à jour de la playlist suivie) ; si elle s'ouvre par-dessus l'app, les
  // boutons restent utilisables, et le champ du code est là, vide : un code gardé appartenait à la demande d'avant.
  const connecter = (options) => {
    setEchec(null);
    setCodeGarde(null);
    setEnCours(true);
    ouvrirConnexion({ win: window, ...options })
      .then(() => setAttente(true), () => setEchec('autre'))
      .finally(() => setEnCours(false));
  };

  // Un toucher sur une playlist du compte : ses morceaux d'abord, puis le choix écrit, avec « Annuler ». La fermeture est prise
  // au toucher : un second toucher pendant la lecture ne fait rien (même avant que l'écran ne se redessine).
  const noterChoix = (p, lu) => ecrireAnnulable('Playlist choisie', (r) => choisirSpotify(r, { nom: p.nom, lien: p.lien, ...lu }))
    .then((ok) => {
      setListe(null);
      if (!ok) setEchec('autre');
      return ok;
    });
  const toucher = (p) => {
    const lire = lecture.current;
    if (!lire) return;
    lecture.current = null;
    setEchec(null);
    setEnCours(true);
    lire(idPlaylistSpotify(p.lien))
      .then(({ morceaux, suite }) => noterChoix(p, { morceaux, suite }), (e) => {
        const raison = e && e.raison;
        if (raison === 'morceaux') return noterChoix(p, {}).then((ok) => { if (ok) setEchec('morceaux'); });
        // Le jeton ne sert plus : la liste part, et le message invite à refaire un choix.
        if (raison === 'expiree' || raison === 'refus') {
          setListe(null);
          setEchec('expiree');
          return undefined;
        }
        // Une coupure, ou une réponse passagère : rien n'est écrit, la liste reste, et la fermeture revient (tant que l'écran
        // est là) : on peut retoucher.
        if (monte.current) lecture.current = lire;
        setEchec('autre');
        return undefined;
      })
      .finally(() => setEnCours(false));
  };

  // « Retirer ces playlists », avec « Annuler » : les lignes venues de Spotify partent, et leurs morceaux avec elles.
  const retirer = () => { ecrireAnnulable('Playlists de Spotify retirées', sansSpotify); };

  useEffect(() => {
    lireRefuges().then((r) => {
      recompter(r);
      setRefuges(r);
    });
    // Le retour de Spotify, posé au démarrage (main.js) et passé par Mes refuges : pris une seule fois.
    const retour = etatApp.lire().retourSpotify;
    if (retour) {
      etatApp.maj({ retourSpotify: null });
      if (retour.issue === 'finir' && spotify) finir(retour.code);
      else setEchec('autre');
    }
    // En quittant l'écran, la fermeture qui détient le jeton est oubliée.
    return () => {
      monte.current = false;
      lecture.current = null;
    };
  }, []);

  // La ligne est retrouvée par sa clé au moment d'écrire : la ligne vide, au bout, vaut le nombre de playlists (un ajout).
  // Une ligne qui n'est plus affichée n'écrit rien.
  const changerTitres = (titres) => ecrire((brut) => aEcrire(normaliserRefuges({ ...normaliserRefuges(brut), titres })))
    .then((v) => setRefuges(normaliserRefuges(v)));
  const changerPlaylist = (cle, changement) => {
    if (!lignes.current.includes(cle)) return Promise.resolve();
    oublierAnnuler();
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

  const entete = html`<${Entete} titre="Réglages de Mes refuges" retour=${revenir} />`;
  if (!refuges) return html`<main class="ecran fiche refuges-reglages">${entete}</main>`;
  const suivie = playlistSuivie(refuges);
  const deSpotify = refuges.playlists.some((p) => p.source === 'spotify');
  const boutonChoix = suivie ? 'Changer de playlist' : 'Choisir dans mon compte';
  // Un choix ne s'écrit pas quand trois lignes sont notées et qu'aucune n'est une playlist Spotify à remplacer.
  const bloquee = !suivie && refuges.playlists.length >= MAX_PLAYLISTS;
  return html`<main class="ecran fiche refuges-reglages">
    ${entete}
    ${(spotify || deSpotify) && html`<div class="carte compte-spotify">
      ${spotify && suivie && html`<button type="button" class="btn btn-plein" disabled=${enCours} aria-describedby="note-compte-spotify"
        onClick=${() => connecter({ but: 'maj', playlist: idPlaylistSpotify(suivie.p.lien) })}>Mettre à jour la liste</button>`}
      ${spotify && html`<button type="button" class=${suivie ? 'btn' : 'btn btn-plein'} disabled=${enCours} aria-describedby="note-compte-spotify"
        onClick=${() => connecter({ but: 'choisir' })}>${boutonChoix}</button>
        <p class="note-import" id="note-compte-spotify">Une seule lecture : Emozio ne garde pas la connexion.</p>`}
      ${spotify && attente && html`<${ChampCode} key=${codeGarde || ''} code=${codeGarde} enCours=${enCours} surFinir=${finir} />`}
      ${echec && html`<p class="texte-import" role="status">${echec === 'expiree' ? expiree(boutonChoix) : ECHECS_SPOTIFY[echec]}</p>`}
      ${liste && html`<${ListeSpotify} liste=${liste} suivie=${suivie} bloquee=${bloquee} surToucher=${toucher} />`}
      ${deSpotify && html`<button type="button" class="btn" onClick=${retirer}>Retirer ces playlists</button>`}
    </div>`}
    <section class="champ-fiche playlists-refuges" aria-labelledby="titre-mes-playlists">
      <h2 class="etiquette" id="titre-mes-playlists">Mes playlists</h2>
      ${cles.map((cle, i) => {
        const p = refuges.playlists[i] || null;
        const n = i + 1;
        // Dès la frappe, avant l'écriture (500 ms plus tard) : « Annuler » ne remplacerait plus ce qui s'écrit.
        return html`<div class="carte saisie-playlist" key=${cle} onInput=${oublierAnnuler}>
          <${ChampTexte} id=${`refuges-nom-${i}`} etiquette=${html`Nom<span class="visuellement-cache"> de la playlist ${n}</span>`}
            valeur=${p && p.nom} lignes=${1} dicter=${false} cleBrouillon=${`carnet:brouillon:refuges:nom-${i}`}
            surEnregistrer=${(nom) => changerPlaylist(cle, { nom })} />
          <${ChampTexte} id=${`refuges-lien-${i}`} etiquette=${html`Lien<span class="visuellement-cache"> de la playlist ${n}</span>`}
            valeur=${p && p.lien} lignes=${1} dicter=${false} cleBrouillon=${`carnet:brouillon:refuges:lien-${i}`}
            surEnregistrer=${(lien) => changerPlaylist(cle, { lien })} />
          ${p && lienIncertain(p.lien) && html`<p class="note-import">Ce lien peut ne rien ouvrir depuis Emozio.</p>`}
        </div>`;
      })}
    </section>
    <div class="champ-fiche">
      <${ChampTexte} id="refuges-titres" etiquette="Mes titres" valeur=${refuges.titres} lignes=${4} placeholder="Un titre par ligne."
        cleBrouillon="carnet:brouillon:refuges:titres" surEnregistrer=${changerTitres} />
    </div>
  </main>`;
}

// Le code, quand le retour de Spotify est arrivé dans Safari (la page du code, ui/ecrans/code-spotify.js) : collé ici, il finit
// la connexion avec la demande restée dans l'app. `code` : celui d'un essai coupé par le réseau, déjà écrit dans le champ (le
// champ est remonté à chaque nouveau code gardé, par sa clé).
function ChampCode({ code, enCours, surFinir }) {
  const zone = useRef(null);
  const valider = () => {
    const saisi = zone.current && zone.current.value.trim();
    if (saisi && !enCours) surFinir(saisi);
  };
  return html`<div class="code-compte">
    <label class="etiquette" for="code-spotify">Code de Spotify</label>
    <input id="code-spotify" ref=${zone} class="champ-ligne" defaultValue=${code || ''} autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"
      enterkeyhint="done" onKeyDown=${(e) => { if (e.key === 'Enter') valider(); }} />
    <button type="button" class="btn" disabled=${enCours} onClick=${valider}>Finir la connexion</button>
  </div>`;
}

// Les playlists lues dans son compte, nommées sous « Spotify » : un toucher choisit l'une d'elles, une seule (spec v12 §6.4).
// Celle qui est suivie a sa coche. Quand trois lignes sont notées sans playlist Spotify à remplacer, aucune ne se choisit
// (aria-disabled). Les noms sont du texte, jamais du HTML.
function ListeSpotify({ liste, suivie, bloquee, surToucher }) {
  if (!liste.length) return html`<p class="note-import">Aucune playlist dans ce compte.</p>`;
  const idSuivie = suivie && idPlaylistSpotify(suivie.p.lien);
  return html`<div class="liste-compte">
    <h3 class="etiquette" id="titre-liste-spotify">Spotify</h3>
    <div class="pastilles grille-choix liste-spotify" role="group" aria-labelledby="titre-liste-spotify">
      ${liste.map((p, i) => {
        const choisie = Boolean(idSuivie) && idPlaylistSpotify(p.lien) === idSuivie;
        return html`<button type="button" class="pastille" key=${p.lien} aria-pressed=${choisie ? 'true' : 'false'} aria-disabled=${bloquee ? 'true' : null}
          onClick=${() => { if (!bloquee) surToucher(p); }}>${coche()}<span class="texte-pastille">${libelleChoix(nomPlaylist(p, i))}</span></button>`;
      })}
    </div>
  </div>`;
}
