// « Pas à pas » : la saisie du soir, une question par écran (même mécanique que l'épisode).
// Chaque toucher enregistre aussitôt dans l'entrée du jour ; Fermer garde tout, sans message.
import { html, useEffect, useRef, useState } from '../lib.js';
import { repo } from '../../donnees.js';
import { useIndicateur, ecrireAvecEssais } from '../hooks.js';
import { formaterJour } from '../../domain/dates.js';
import { carteLibelles, libelle } from '../../domain/libelles.js';
import { phraseResume } from '../../domain/phrase.js';
import { versHash } from '../../routeur.js';
import { CadreParcours } from '../composants/parcours.js';
import { Pastilles } from '../composants/pastilles.js';
import { ChampTexte } from '../composants/texte.js';
import { MemoVocal } from '../composants/memo-vocal.js';
import { Icones } from '../icones.js';
import { options } from './aujourdhui.js';

const DELAI_SUIVANT_MS = 250;
const NOMBRES = (n, debut) => Array.from({ length: n }, (_, i) => ({ valeur: i + debut, libelle: String(i + debut) }));
const OUI_NON = [{ valeur: true, libelle: 'Oui' }, { valeur: false, libelle: 'Non' }];

export const ETAPES_JOUR = [
  { champ: 'lieu', liste: 'lieu', question: 'Lieu', teinte: 'lieu' },
  { champ: 'sommeilRessenti', liste: 'sommeil', question: 'Sommeil', sousQuestion: 'nuit dernière', teinte: 'sommeil' },
  { champ: 'humeur', choix: NOMBRES(10, 1), echelle: true, question: 'Humeur', teinte: 'humeur' },
  { champ: 'contactHumain', choix: OUI_NON, question: 'Contact humain', teinte: 'contact' },
  { champ: 'sportMouvement', choix: OUI_NON, question: 'Sport / mouvement', teinte: 'sport' },
  { champ: 'explosions', choix: NOMBRES(6, 0), echelle: true, question: 'Explosions', teinte: 'expl' },
  { champ: 'traitementPris', liste: 'traitementPris', question: 'Traitement pris', teinte: 'trt' },
];

function texteValeur(et, v, carte) {
  if (v == null) return '·';
  if (et.liste) return libelle(carte, v);
  if (typeof v === 'boolean') return v ? 'Oui' : 'Non';
  return String(v);
}

export function ParcoursJour({ date }) {
  const [items, setItems] = useState(null);
  const [entree, setEntree] = useState(null);
  const [etape, setEtape] = useState(0);
  const [versRecap, setVersRecap] = useState(false);
  const [, signaler] = useIndicateur();
  const suivant = useRef(null);
  const glisse = useRef({ etape: null, classe: '' });
  const aujourdhui = repo.aujourdhui();
  const jour = date && date <= aujourdhui ? date : aujourdhui;

  useEffect(() => {
    let actif = true;
    (async () => {
      const [liste, lue] = await Promise.all([repo.listes.items(), repo.journal.lire(jour)]);
      if (!actif) return;
      setItems(liste);
      setEntree(lue || { date: jour });
    })();
    return () => { actif = false; clearTimeout(suivant.current); };
  }, [jour]);

  const fermer = () => {
    clearTimeout(suivant.current);
    location.hash = jour === aujourdhui ? '#/aujourdhui' : versHash('jour', { date: jour });
  };
  const ecrire = (changements) => ecrireAvecEssais(() => repo.journal.patch(jour, changements), signaler);
  const avancer = (depuis) => {
    if (versRecap) { setVersRecap(false); setEtape('recap'); return; }
    setEtape(depuis + 1 < ETAPES_JOUR.length ? depuis + 1 : 'recap');
  };
  const choisir = (i, champ) => (valeur) => {
    setEntree((e) => ({ ...e, [champ]: valeur }));
    ecrire({ [champ]: valeur });
    clearTimeout(suivant.current);
    if (valeur != null) suivant.current = setTimeout(() => avancer(i), DELAI_SUIVANT_MS);
  };

  if (!items || !entree) return html`<div class="parcours"></div>`;
  const carte = carteLibelles(items);
  const phrase = phraseResume('jour', entree, carte);
  const rendrePhrase = (classe) => phrase.length > 0 && html`<p class=${classe}>${phrase.map((s) => (s.valeur
    ? html`<span class=${`valeur teinte-${s.rubrique}`}>${s.texte}</span>` : s.texte))}</p>`;
  const ligneDate = html`<p class="ligne-date ligne-date-fixe">${jour === aujourdhui ? `Aujourd'hui · ${formaterJour(jour)}` : formaterJour(jour)}</p>`;

  if (etape === 'recap') {
    return html`<${CadreParcours} titre="Ma journée" teinte="jour" etape="recap" nbEtapes=${ETAPES_JOUR.length} surFermer=${fermer} sousTitre=${ligneDate}
      pied=${html`<button type="button" class="btn btn-plein terminer" onClick=${fermer}>Terminer</button>`}>
      <div class="etape-recap">
        <h2 class="titre-question">Récapitulatif</h2>
        ${rendrePhrase('phrase-recap')}
        <ul class="liste recap">${ETAPES_JOUR.map((et, i) => {
          const v = entree[et.champ];
          return html`<li><button type="button" class="ligne-recap" onClick=${() => { setVersRecap(true); setEtape(i); }}>
            <span class="recap-nom">${et.question}</span><span class=${v == null ? 'recap-val discret' : 'recap-val'}>${texteValeur(et, v, carte)}</span>${Icones.chevron({ trait: 2 })}
          </button></li>`;
        })}</ul>
        <div class="champ-recap"><${ChampTexte} id="pas-a-pas-positifs" etiquette="Mes points positifs" icone="positifs" valeur=${entree.pointsPositifs}
          placeholder="Même petit. « J'ai tenu » compte aussi." lignes=${2} cleBrouillon=${`carnet:brouillon:${jour}:pointsPositifs`}
          surEnregistrer=${(v) => ecrire({ pointsPositifs: v }).then((r) => { setEntree((e) => ({ ...e, pointsPositifs: v })); return r; })} /></div>
        <${MemoVocal} parentStore="journal" parentId=${jour} date=${jour} />
      </div>
    </${CadreParcours}>`;
  }

  const et = ETAPES_JOUR[etape];
  if (glisse.current.etape !== etape) {
    const avant = glisse.current.etape;
    glisse.current = { etape, classe: avant === null ? '' : typeof avant === 'number' && etape < avant ? 'entree-arriere' : 'entree-avant' };
  }
  const opts = et.liste ? options(items, et.liste, entree[et.champ]) : et.choix;
  const nombres = et.choix && et.champ !== 'contactHumain' && et.champ !== 'sportMouvement';
  return html`<${CadreParcours} titre="Ma journée" teinte="jour" etape=${etape} nbEtapes=${ETAPES_JOUR.length} surFermer=${fermer} sousTitre=${ligneDate}
    pied=${html`<button type="button" class="btn-lien" disabled=${etape === 0} onClick=${() => setEtape(etape - 1)}>${Icones.retour({ trait: 2 })}Retour</button>
      <button type="button" class="btn-lien" onClick=${() => avancer(etape)}>Passer${Icones.chevron({ trait: 2 })}</button>`}>
    <div class=${`etape ${glisse.current.classe}`} key=${etape}>
      ${rendrePhrase('phrase-resume')}
      <div><h2 class="titre-question">${et.question}</h2>${et.sousQuestion && html`<p class="sous-question">${et.sousQuestion}</p>`}</div>
      <${Pastilles} etiquette=${et.question} options=${opts} valeur=${entree[et.champ] ?? null} surChoix=${choisir(etape, et.champ)}
        colonnes=${et.echelle ? (et.choix.length === 6 ? 6 : 5) : 2} classe=${et.echelle ? 'chiffres grille-choix' : 'grille-choix'}
        ariaPrefixe=${nombres ? et.question : null} teinte=${et.teinte} />
    </div>
  </${CadreParcours}>`;
}
