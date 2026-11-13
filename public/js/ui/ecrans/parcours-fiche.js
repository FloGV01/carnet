// Parcours « une question par écran » commun à l'épisode et au symptôme.
// La fiche est créée au premier choix, puis mise à jour à chaque toucher.
import { html, useEffect, useRef, useState } from '../lib.js';
import { repo } from '../../donnees.js';
import { etatApp } from '../../store.js';
import { useIndicateur, ecrireAvecEssais } from '../hooks.js';
import { cleLocale, heureLocale, addDays, formaterJour } from '../../domain/dates.js';
import { carteLibelles, libelle } from '../../domain/libelles.js';
import { phraseResume } from '../../domain/phrase.js';
import { versHash } from '../../routeur.js';
import { nouvelId } from '../../domain/ids.js';
import { CadreParcours } from '../composants/parcours.js';
import { Pastilles } from '../composants/pastilles.js';
import { ChampTexte } from '../composants/texte.js';
import { afficherToast } from '../composants/toast.js';
import { Confirmation } from '../composants/confirmation.js';
import { Icones } from '../icones.js';
import { FeuillePlan } from '../composants/mon-plan.js';
import { EnParler } from '../composants/en-parler.js';
import { options } from './aujourdhui.js';

const INTENSITES = Array.from({ length: 10 }, (_, i) => ({ valeur: i + 1, libelle: String(i + 1) }));
const DELAI_SUIVANT_MS = 250;

export function libelleDate(date, maintenant) {
  const auj = cleLocale(maintenant);
  if (date === auj) return "Aujourd'hui";
  if (date === addDays(auj, -1)) return 'Hier';
  return formaterJour(date);
}

// Résumé d'un Après coup sur la ligne du récapitulatif (le contenu, jamais un état « fait »).
export function resumeApresCoup(a, carte) {
  if (!a) return null;
  return [(a.types || []).map((id) => libelle(carte, id)).join(', '), a.repereA != null && `remarqué à ${a.repereA}/10`,
    (a.siJe || a.alorsJe) && `si ${a.siJe || '…'}, alors ${a.alorsJe || '…'}`].filter(Boolean).join(' · ') || null;
}

// origine : écran d'où l'épisode a été ouvert, gardé pendant un passage par Après coup.
function revenir(origine) {
  const precedente = origine || etatApp.lire().routePrecedente;
  location.hash = precedente && !/#\/(episode|symptome|apres-coup)\//.test(precedente) && !/#\/mon-plan/.test(precedente) ? precedente : '#/aujourdhui';
}

// sortieDirecte (épisode, v6.1) : sur une fiche nouvelle, la dernière étape choisie ou passée ferme la fiche,
// comme « Fermer » ; le récapitulatif s'ouvre quand on la rouvre.
// « Ce que j'en retiens » (v11, spec §7) : sur l'épisode rouvert, sous la carte Après coup, même ancien et même sans Après
// coup. Rangé à part d'apresCoup, il n'en touche pas le jour : un vieil épisode ne repart pas vers PSY. Vide, il ne dit rien
// (ni consigne, ni « facultatif »). Hors de TEXTES_EPISODE : la feuille « Voir » d'En consultation ne le montre pas.
export function ParcoursFiche({ store, route, titre, nomFiche, etapes, textes, avecHeure, id: idRoute, memo, avecPlan = false, sortieDirecte = false }) {
  const [items, setItems] = useState(null);
  const [fiche, setFiche] = useState(null);
  const [etape, setEtape] = useState(0);
  const [versRecap, setVersRecap] = useState(false);
  const [editionDate, setEditionDate] = useState(false);
  const [confirmer, setConfirmer] = useState(false);
  const [voirPlan, setVoirPlan] = useState(false);
  const boutonPlan = useRef(null);
  const [, signaler] = useIndicateur();
  const idRef = useRef(null);
  const instantane = useRef(null);
  const origine = useRef(null);
  const file = useRef(Promise.resolve());
  const suivant = useRef(null);
  const sortie = useRef(false);
  const glisse = useRef({ etape: null, classe: '' });
  const maintenant = repo.maintenant();
  // Fiche rouverte (et non nouvelle fiche saisie à chaud) : elle seule montre « Après coup » et « En parler » en
  // haut ; un épisode nouveau n'a pas de récapitulatif (sortieDirecte).
  const rouvert = Boolean(idRoute) && idRoute !== 'nouveau';

  useEffect(() => {
    let actif = true;
    sortie.current = false;
    (async () => {
      const liste = await repo.listes.items();
      if (!actif) return;
      setItems(liste);
      if (idRoute && idRoute !== 'nouveau') {
        const lue = await repo[store].lire(idRoute);
        if (!actif) return;
        if (!lue) { location.hash = '#/aujourdhui'; return; }
        idRef.current = lue.id;
        // Retour d'Après coup : même origine et même état de départ (Annuler reste juste).
        const retour = etatApp.lire().retourEpisode;
        if (retour && retour.id === lue.id) {
          origine.current = retour.origine;
          instantane.current = retour.instantane;
          etatApp.maj({ retourEpisode: null });
        } else instantane.current = lue;
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

  // Écritures en file : jamais deux créations pour une même fiche. ecrireTexte rejette si
  // l'écriture échoue (ChampTexte garde alors son brouillon) ; ecrire ignore l'échec, déjà signalé.
  const ecrireTexte = (changements) => {
    const travail = file.current.then(async () => {
      if (!idRef.current) {
        const base = { date: fiche.date, ...(avecHeure ? { heure: fiche.heure ?? null } : {}) };
        const id = nouvelId(store === 'episodes' ? 'ep' : 'sy');
        const cree = await ecrireAvecEssais(() => repo[store].creer({ ...base, ...changements }, { id }), signaler);
        if (cree) { idRef.current = cree.id; history.replaceState(null, '', versHash(route, { id: cree.id })); }
        return;
      }
      const res = await ecrireAvecEssais(() => repo[store].modifier(idRef.current, changements), signaler);
      if (res === null) { idRef.current = null; history.replaceState(null, '', versHash(route, { id: 'nouveau' })); }
    });
    file.current = travail.catch(() => {});
    return travail;
  };
  const ecrire = (changements) => ecrireTexte(changements).catch(() => {});

  // Une seule sortie : la dernière étape qui ferme la fiche et un toucher sur « Passer » ou « Fermer » au même
  // instant ne donnent qu'un toast.
  const fermer = async () => {
    clearTimeout(suivant.current);
    if (sortie.current) return;
    sortie.current = true;
    await file.current;
    const id = idRef.current;
    const avant = instantane.current;
    revenir(origine.current);
    if (!id) return;
    afficherToast(`${nomFiche} enregistré`, {
      libelle: 'Annuler',
      faire: async () => {
        if (avant) await repo[store].restaurer({ entree: avant });
        else await repo[store].supprimer(id);
      },
    });
  };

  const avancer = (depuis) => {
    if (versRecap) { setVersRecap(false); setEtape('recap'); return; }
    if (depuis + 1 < etapes.length) setEtape(depuis + 1);
    else if (sortieDirecte && !rouvert) fermer();
    else setEtape('recap');
  };

  // Le délai laisse voir le choix fait avant l'étape suivante (ou, à la dernière, la sortie). « Retour », « Mon plan »
  // ou la ligne de date touchés pendant ce délai l'annulent : la fiche reste où on l'a menée.
  const annulerSuivant = () => clearTimeout(suivant.current);
  const choisir = (i, champ) => (valeur) => {
    setFiche((f) => ({ ...f, [champ]: valeur }));
    ecrire({ [champ]: valeur });
    clearTimeout(suivant.current);
    if (valeur != null) suivant.current = setTimeout(() => avancer(i), DELAI_SUIVANT_MS);
  };

  const supprimer = async () => {
    await file.current;
    const id = idRef.current;
    revenir(origine.current);
    if (!id) return;
    const sauve = await repo[store].supprimer(id);
    afficherToast(`${nomFiche} supprimé`, { libelle: 'Annuler', faire: () => repo[store].restaurer(sauve) });
  };

  if (!items || !fiche) return html`<div class="parcours"></div>`;
  const carte = carteLibelles(items);

  // Phrase des choix déjà faits, dans une carte au-dessus de chaque étape (2b). Le récapitulatif ne la répète pas
  // (v6.1) : son tableau suffit.
  const phrase = phraseResume(store === 'episodes' ? 'episode' : 'symptome', fiche, carte);
  const phraseEtape = phrase.length > 0 && html`<p class="phrase-resume">${phrase.map((s) => (s.valeur ? html`<span class="valeur">${s.texte}</span>` : s.texte))}</p>`;

  // Vers l'Après coup : l'épisode est créé d'abord s'il ne l'est pas encore. La fiche garde son
  // origine et son état de départ pour le retour (Annuler reste juste).
  const hrefApresCoup = idRef.current ? versHash('apres-coup', { id: idRef.current }) : '#/aujourdhui';
  const ouvrirApresCoup = async (e) => {
    const garder = () => etatApp.maj({ retourEpisode: { id: idRef.current, origine: origine.current || etatApp.lire().routePrecedente, instantane: instantane.current } });
    if (idRef.current) { garder(); return; }
    e.preventDefault(); await ecrire({}); await file.current;
    if (idRef.current) { garder(); location.hash = versHash('apres-coup', { id: idRef.current }); }
  };

  // « Mon plan » (icône de carte) : à droite de la ligne de date (2b), à chaque étape et au récapitulatif (épisodes).
  // Sur une fiche rouverte, « Après coup » et « En parler » (v6.1) le suivent, sur une ligne à eux sous la date :
  // visibles sans défiler. À chaud, rien n'y est ajouté. « En parler » ouvre la même feuille que le lien du bas.
  const lignePlan = avecPlan && html`<div class="ligne-plan">
    <button type="button" class="btn-lien" ref=${boutonPlan} onClick=${() => { annulerSuivant(); setVoirPlan(true); }}>${Icones.monPlan()}Mon plan</button>
    ${rouvert && html`<span class="separateur-plan" aria-hidden="true">·</span>
      <a class="btn-lien" href=${hrefApresCoup} onClick=${ouvrirApresCoup}>Après coup</a>
      <span class="separateur-plan" aria-hidden="true">·</span>
      <${EnParler} store=${store} element=${{ ...fiche, id: idRef.current }} carte=${carte} court=${true} />`}
  </div>`;
  const feuillePlan = voirPlan && html`<${FeuillePlan} surFermer=${() => setVoirPlan(false)} retourFocus=${boutonPlan} />`;
  // La ligne de date se touche sur toute la place que lui laisse « Mon plan » ; elle ouvre, dessous, la date et l'heure.
  const ligneDatePlan = html`<div class=${`ligne-date-plan${avecPlan && rouvert ? ' avec-liens' : ''}`}>
    <div class="ligne-date">
      <button type="button" class="btn-lien" aria-expanded=${editionDate ? 'true' : 'false'} onClick=${() => { annulerSuivant(); setEditionDate(!editionDate); }}>
        ${libelleDate(fiche.date, maintenant)}${avecHeure ? ` · ${fiche.heure || 'heure'}` : ''}${Icones.chevronBas({ trait: 2 })}</button>
    </div>
    ${lignePlan}
  </div>
  ${editionDate && html`<div class="edition-date">
    <input type="date" class="champ-ligne" aria-label="Date" value=${fiche.date} max=${cleLocale(maintenant)}
      onChange=${(e) => { const v = e.target.value; if (v && v <= cleLocale(maintenant)) { setFiche((f) => ({ ...f, date: v })); ecrire({ date: v }); } }} />
    ${avecHeure && html`<input type="time" class="champ-ligne" aria-label="Heure" value=${fiche.heure || ''}
      onChange=${(e) => { const v = e.target.value || null; setFiche((f) => ({ ...f, heure: v })); ecrire({ heure: v }); }} />`}
  </div>`}`;

  if (etape === 'recap') {
    const lignes = etapes.map((et, i) => {
      const v = fiche[et.champ];
      const texte = v == null ? '·' : et.type === 'intensite' ? String(v) : libelle(carte, v);
      return html`<li><button type="button" class="ligne-recap" onClick=${() => { setVersRecap(true); setEtape(i); }}>
        <span class="recap-nom">${et.recap}</span><span class=${v == null ? 'recap-val discret' : 'recap-val'}>${texte}</span>${Icones.chevron({ trait: 2 })}
      </button></li>`;
    });
    // Le récapitulatif d'une fiche rouverte se relit (v11, spec §11) : le doigt vers la droite y fait comme « Fermer ». Celui
    // d'une fiche neuve, menée jusque-là, finit une saisie : aucun geste, comme à ses étapes.
    return html`<${CadreParcours} titre=${titre} etape="recap" nbEtapes=${etapes.length} surFermer=${fermer} sousTitre=${ligneDatePlan}
      relecture=${rouvert} pied=${html`<button type="button" class="btn btn-plein terminer" onClick=${fermer}>Terminer</button>`}>
      <div class="etape-recap">
      <h2 class="titre-question">Récapitulatif</h2>
      <ul class="liste recap">${lignes}</ul>
      ${textes.map((t) => html`<div class="champ-recap"><${ChampTexte} key=${t.champ} id=${`${store}-${t.champ}`}
        etiquette=${t.etiquette} icone=${t.icone} facultatif=${true} valeur=${fiche[t.champ]} placeholder=${t.placeholder || ''} lignes=${2}
        cleBrouillon=${idRef.current ? `carnet:brouillon:${idRef.current}:${t.champ}` : null}
        surEnregistrer=${(v) => { setFiche((f) => ({ ...f, [t.champ]: v })); return ecrireTexte({ [t.champ]: v }); }} /></div>`)}
      ${memo && memo({ id: idRef.current, date: fiche.date, assurerFiche: async () => { if (!idRef.current) await ecrire({}); await file.current; return idRef.current; } })}
      ${avecPlan && html`<a class="ligne-carte carte lien-apres-coup bouton-apres-coup" href=${hrefApresCoup} onClick=${ouvrirApresCoup}>
        <span class="ligne-libelle"><span class="titre-apres-coup">Après coup · TCC</span>
          <span class="note-carte-interne">${resumeApresCoup(fiche.apresCoup, carte) || 'Retour à froid, quand tu veux : le soir, un autre jour, ou avant une séance.'}</span></span>
        ${Icones.chevron({ trait: 2 })}</a>`}
      ${avecPlan && html`<div class="champ-recap"><${ChampTexte} id=${`${store}-ceQueJeRetiens`} etiquette="Ce que j'en retiens"
        valeur=${fiche.ceQueJeRetiens} lignes=${2} cleBrouillon=${idRef.current ? `carnet:brouillon:${idRef.current}:ceQueJeRetiens` : null}
        surEnregistrer=${(v) => { setFiche((f) => ({ ...f, ceQueJeRetiens: v })); return ecrireTexte({ ceQueJeRetiens: v }); }} /></div>`}
      <${EnParler} store=${store} element=${{ ...fiche, id: idRef.current }} carte=${carte} />
      ${idRef.current && html`<button type="button" class="lien-discret supprimer" onClick=${() => setConfirmer(true)}>Supprimer ${nomFiche === 'Épisode' ? 'cet épisode' : 'ce symptôme'}</button>`}
      ${confirmer && html`<${Confirmation} titre=${`Supprimer ${nomFiche === 'Épisode' ? 'cet épisode' : 'ce symptôme'} ?`}
        texte="Ses mémos vocaux sont supprimés aussi." action="Supprimer"
        surAnnuler=${() => setConfirmer(false)} surConfirmer=${() => { setConfirmer(false); supprimer(); }} />`}
      </div>
      ${feuillePlan}
    </${CadreParcours}>`;
  }

  const et = etapes[etape];
  // Une étape à réponses courtes (`courte` : Intensité, En dessous, Réaction, Durée) pose sa question et sa grille en
  // bas de l'écran, près du pouce (2b, P6) ; une liste longue remplit l'écran depuis le haut.
  // Glissement à l'arrivée d'une étape : depuis la droite quand on avance, depuis la gauche quand
  // on recule. Rien à l'ouverture. La classe reste la même tant que l'étape ne change pas.
  if (glisse.current.etape !== etape) {
    const avant = glisse.current.etape;
    glisse.current = { etape, classe: avant === null ? '' : typeof avant === 'number' && etape < avant ? 'entree-arriere' : 'entree-avant' };
  }
  const opts = et.type === 'intensite' ? INTENSITES : options(items, et.liste, fiche[et.champ]);
  return html`<${CadreParcours} titre=${titre} etape=${etape} nbEtapes=${etapes.length} surFermer=${fermer} sousTitre=${ligneDatePlan}
    pied=${html`<button type="button" class="btn-lien" disabled=${etape === 0} onClick=${() => { annulerSuivant(); setEtape(etape - 1); }}>${Icones.retour({ trait: 2 })}Retour</button>
      <button type="button" class="btn-lien" onClick=${() => avancer(etape)}>Passer${Icones.chevron({ trait: 2 })}</button>`}>
    <div class=${`etape${et.courte ? ' courte' : ''} ${glisse.current.classe}`} key=${etape}>
    ${phraseEtape}
    <div class="reponses-etape">
      <div><h2 class="titre-question">${et.question}</h2>${et.sousQuestion && html`<p class="sous-question">${et.sousQuestion}</p>`}</div>
      <${Pastilles} etiquette=${et.recap} options=${opts} valeur=${fiche[et.champ] ?? null} surChoix=${choisir(etape, et.champ)}
        colonnes=${et.type === 'intensite' ? 5 : 2} classe=${et.type === 'intensite' ? 'chiffres grille-choix' : 'grille-choix'}
        ariaPrefixe=${et.type === 'intensite' ? 'Intensité' : null}
        surAjouter=${et.type === 'intensite' ? null : async (texte) => {
          const item = await repo.listes.creer(et.liste, texte);
          setItems(await repo.listes.items());
          choisir(etape, et.champ)(item.id);
        }} />
    </div>
    </div>
    ${feuillePlan}
  </${CadreParcours}>`;
}
