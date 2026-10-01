// Parcours « une question par écran » commun à l'épisode et au symptôme.
// La fiche est créée au premier choix, puis mise à jour à chaque toucher.
import { html, useEffect, useRef, useState } from '../lib.js';
import { repo } from '../../donnees.js';
import { etatApp } from '../../store.js';
import { useIndicateur, ecrireAvecEssais } from '../hooks.js';
import { cleLocale, heureLocale, addDays, formaterJour } from '../../domain/dates.js';
import { carteLibelles, libelle } from '../../domain/libelles.js';
import { versHash } from '../../routeur.js';
import { nouvelId } from '../../domain/ids.js';
import { CadreParcours } from '../composants/parcours.js';
import { Pastilles } from '../composants/pastilles.js';
import { ChampTexte } from '../composants/texte.js';
import { afficherToast } from '../composants/toast.js';
import { options } from './aujourdhui.js';

const INTENSITES = Array.from({ length: 10 }, (_, i) => ({ valeur: i + 1, libelle: String(i + 1) }));
const DELAI_SUIVANT_MS = 250;

export function libelleDate(date, maintenant) {
  const auj = cleLocale(maintenant);
  if (date === auj) return "Aujourd'hui";
  if (date === addDays(auj, -1)) return 'Hier';
  return formaterJour(date);
}

function revenir() {
  const precedente = etatApp.lire().routePrecedente;
  location.hash = precedente && !/#\/(episode|symptome)\//.test(precedente) ? precedente : '#/aujourdhui';
}

export function ParcoursFiche({ store, route, titre, nomFiche, etapes, textes, avecHeure, id: idRoute, memo }) {
  const [items, setItems] = useState(null);
  const [fiche, setFiche] = useState(null);
  const [etape, setEtape] = useState(0);
  const [versRecap, setVersRecap] = useState(false);
  const [editionDate, setEditionDate] = useState(false);
  const [confirmer, setConfirmer] = useState(false);
  const [, signaler] = useIndicateur();
  const idRef = useRef(null);
  const instantane = useRef(null);
  const file = useRef(Promise.resolve());
  const suivant = useRef(null);
  const maintenant = repo.maintenant();

  useEffect(() => {
    let actif = true;
    (async () => {
      const liste = await repo.listes.items();
      if (!actif) return;
      setItems(liste);
      if (idRoute && idRoute !== 'nouveau') {
        const lue = await repo[store].lire(idRoute);
        if (!actif) return;
        if (!lue) { location.hash = '#/aujourdhui'; return; }
        idRef.current = lue.id;
        instantane.current = lue;
        setFiche(lue);
        setEtape('recap');
        return;
      }
      const contexte = etatApp.lire().jourContexte;
      const aujourdhui = repo.aujourdhui();
      const passe = contexte && contexte < aujourdhui;
      setFiche({ date: passe ? contexte : (avecHeure ? cleLocale(maintenant) : aujourdhui), ...(avecHeure ? { heure: passe ? null : heureLocale(maintenant) } : {}) });
    })();
    return () => { actif = false; clearTimeout(suivant.current); };
  }, [idRoute]);

  // Écritures en file : jamais deux créations pour une même fiche.
  const ecrire = (changements) => {
    file.current = file.current.then(async () => {
      if (!idRef.current) {
        const base = { date: fiche.date, ...(avecHeure ? { heure: fiche.heure ?? null } : {}) };
        const id = nouvelId(store === 'episodes' ? 'ep' : 'sy');
        const cree = await ecrireAvecEssais(() => repo[store].creer({ ...base, ...changements }, { id }), signaler);
        if (cree) { idRef.current = cree.id; history.replaceState(null, '', versHash(route, { id: cree.id })); }
        return;
      }
      const res = await ecrireAvecEssais(() => repo[store].modifier(idRef.current, changements), signaler);
      if (res === null) { idRef.current = null; history.replaceState(null, '', versHash(route, { id: 'nouveau' })); }
    }).catch(() => {});
    return file.current;
  };

  const avancer = (depuis) => {
    if (versRecap) { setVersRecap(false); setEtape('recap'); return; }
    setEtape(depuis + 1 < etapes.length ? depuis + 1 : 'recap');
  };

  const choisir = (i, champ) => (valeur) => {
    setFiche((f) => ({ ...f, [champ]: valeur }));
    ecrire({ [champ]: valeur });
    clearTimeout(suivant.current);
    if (valeur != null) suivant.current = setTimeout(() => avancer(i), DELAI_SUIVANT_MS);
  };

  const fermer = async () => {
    clearTimeout(suivant.current);
    await file.current;
    const id = idRef.current;
    const avant = instantane.current;
    revenir();
    if (!id) return;
    afficherToast(`${nomFiche} enregistré`, {
      libelle: 'Annuler',
      faire: async () => {
        if (avant) await repo[store].restaurer({ entree: avant });
        else await repo[store].supprimer(id);
      },
    });
  };

  const supprimer = async () => {
    await file.current;
    const id = idRef.current;
    revenir();
    if (!id) return;
    const sauve = await repo[store].supprimer(id);
    afficherToast(`${nomFiche} supprimé`, { libelle: 'Annuler', faire: () => repo[store].restaurer(sauve) });
  };

  if (!items || !fiche) return html`<div class="parcours"></div>`;
  const carte = carteLibelles(items);

  const ligneDate = html`<div class="ligne-date">
    <button type="button" class="btn-lien" aria-expanded=${editionDate ? 'true' : 'false'} onClick=${() => setEditionDate(!editionDate)}>
      ${libelleDate(fiche.date, maintenant)}${avecHeure && fiche.heure ? ` · ${fiche.heure}` : ''} ▾</button>
    ${editionDate && html`<div class="edition-date">
      <input type="date" class="champ-ligne" aria-label="Date" value=${fiche.date} max=${cleLocale(maintenant)}
        onChange=${(e) => { const v = e.target.value; if (v && v <= cleLocale(maintenant)) { setFiche((f) => ({ ...f, date: v })); ecrire({ date: v }); } }} />
      ${avecHeure && html`<input type="time" class="champ-ligne" aria-label="Heure" value=${fiche.heure || ''}
        onChange=${(e) => { const v = e.target.value || null; setFiche((f) => ({ ...f, heure: v })); ecrire({ heure: v }); }} />`}
    </div>`}
  </div>`;

  if (etape === 'recap') {
    const lignes = etapes.map((et, i) => {
      const v = fiche[et.champ];
      const texte = v == null ? '·' : et.type === 'intensite' ? String(v) : libelle(carte, v);
      return html`<li><button type="button" class="ligne-recap" onClick=${() => { setVersRecap(true); setEtape(i); }}>
        <span class="recap-nom">${et.recap}</span><span class=${v == null ? 'recap-val discret' : 'recap-val'}>${texte}</span><span aria-hidden="true">›</span>
      </button></li>`;
    });
    return html`<${CadreParcours} titre=${titre} etape="recap" nbEtapes=${etapes.length} surFermer=${fermer} sousTitre=${ligneDate}
      pied=${html`<button type="button" class="btn-lien" onClick=${() => { setVersRecap(false); setEtape(etapes.length - 1); }}>‹ Retour</button>
        <button type="button" class="btn btn-plein terminer" onClick=${fermer}>Terminer</button>`}>
      <ul class="liste recap">${lignes}</ul>
      ${textes.map((t) => html`<div class="champ"><${ChampTexte} key=${t.champ} id=${`${store}-${t.champ}`}
        etiquette=${`${t.etiquette} (facultatif)`} valeur=${fiche[t.champ]} placeholder=${t.placeholder || ''} lignes=${2}
        cleBrouillon=${idRef.current ? `carnet:brouillon:${idRef.current}:${t.champ}` : null}
        surEnregistrer=${(v) => { setFiche((f) => ({ ...f, [t.champ]: v })); return ecrire({ [t.champ]: v }); }} /></div>`)}
      ${memo && memo({ id: idRef.current, date: fiche.date, assurerFiche: async () => { if (!idRef.current) await ecrire({}); await file.current; return idRef.current; } })}
      ${idRef.current && (confirmer
        ? html`<div class="confirmation" role="alert"><p>Supprimer ${nomFiche === 'Épisode' ? 'cet épisode' : 'ce symptôme'} ?</p>
            <div class="ligne"><button type="button" class="btn" onClick=${() => setConfirmer(false)}>Garder</button>
            <button type="button" class="btn btn-effacer" onClick=${supprimer}>Supprimer</button></div></div>`
        : html`<button type="button" class="btn-lien supprimer" onClick=${() => setConfirmer(true)}>Supprimer ${nomFiche === 'Épisode' ? 'cet épisode' : 'ce symptôme'}</button>`)}
    </${CadreParcours}>`;
  }

  const et = etapes[etape];
  const opts = et.type === 'intensite' ? INTENSITES : options(items, et.liste, fiche[et.champ]);
  return html`<${CadreParcours} titre=${titre} etape=${etape} nbEtapes=${etapes.length} surFermer=${fermer} sousTitre=${etape === 0 ? ligneDate : null}
    pied=${html`${etape > 0 ? html`<button type="button" class="btn-lien" onClick=${() => setEtape(etape - 1)}>‹ Retour</button>` : html`<span></span>`}
      <button type="button" class="btn-lien" onClick=${() => avancer(etape)}>Passer ›</button>`}>
    <h2 class="question">${et.question}</h2>
    <${Pastilles} etiquette=${et.recap} options=${opts} valeur=${fiche[et.champ] ?? null} surChoix=${choisir(etape, et.champ)}
      colonnes=${et.type === 'intensite' ? 5 : 2} classe=${et.type === 'intensite' ? 'chiffres grille-choix' : 'grille-choix'}
      ariaPrefixe=${et.type === 'intensite' ? 'Intensité' : null}
      surAjouter=${et.type === 'intensite' ? null : async (texte) => {
        const item = await repo.listes.creer(et.liste, texte);
        setItems(await repo.listes.items());
        choisir(etape, et.champ)(item.id);
      }} />
  </${CadreParcours}>`;
}
