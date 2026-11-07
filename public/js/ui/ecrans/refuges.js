// « Mes refuges » (v11, spec §8.1) : ses titres, un par ligne, et jusqu'à trois playlists, chacune un nom et un lien. Ouvert
// depuis Bien-être et depuis Réglages › Mon plan. Tout est facultatif et Carnet ne propose rien. Tout s'écrit seul au fil de la
// frappe, en file comme Mon plan, et part dans la sauvegarde avec lui. En tête des playlists, les lignes qui ont un lien : c'est
// d'ici qu'on écoute depuis Bien-être (spec §8.4), sans réseau venant de Carnet. Un lien refusé (ni https, ni spotify, ni
// music) n'est pas gardé, sans message ; « ?si=… » est retiré (domain/refuges.js).
import { html, useEffect, useRef, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { ChampTexte } from '../composants/texte.js';
import { LignesPlaylists, lireRefuges } from '../composants/refuges.js';
import { repo } from '../../donnees.js';
import { useIndicateur, ecrireAvecEssais } from '../hooks.js';
import { etatApp } from '../../store.js';
import { MAX_PLAYLISTS, avecPlaylist, normaliserRefuges, refugesVides } from '../../domain/refuges.js';

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

export function MesRefuges() {
  const [refuges, setRefuges] = useState(null);
  const [cles, setCles] = useState([]);
  const lignes = useRef([]);
  const compte = useRef(0);
  const file = useRef(Promise.resolve());
  const [, signaler] = useIndicateur();
  const neuve = () => { compte.current += 1; return compte.current; };
  const poserCles = (c) => { lignes.current = c; setCles(c); };

  useEffect(() => {
    lireRefuges().then((r) => {
      poserCles(Array.from({ length: Math.min(r.playlists.length + 1, MAX_PLAYLISTS) }, neuve));
      setRefuges(r);
    });
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

  if (!refuges) return html`<main class="ecran fiche refuges"><${Entete} titre="Mes refuges" retour=${revenir} /></main>`;
  return html`<main class="ecran fiche refuges">
    <${Entete} titre="Mes refuges" retour=${revenir} />
    <div class="champ-fiche">
      <${ChampTexte} id="refuges-titres" etiquette="Mes titres" valeur=${refuges.titres} lignes=${4} placeholder="Un titre par ligne."
        cleBrouillon="carnet:brouillon:refuges:titres" surEnregistrer=${changerTitres} />
    </div>
    <section class="champ-fiche playlists-refuges teinte-bien-etre" aria-labelledby="titre-mes-playlists">
      <h2 class="etiquette" id="titre-mes-playlists">Mes playlists</h2>
      <${LignesPlaylists} playlists=${refuges.playlists} />
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
