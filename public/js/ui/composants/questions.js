// Questions d'un rendez-vous : à cocher une fois abordées (en gris, jamais barrées), et champ
// d'ajout au style Dicter. Retour ajoute la question et garde le champ prêt pour la suivante ;
// la sortie du champ l'ajoute aussi, pour ne jamais perdre une question. À l'affichage seulement, une question passe par
// pourAffichage : « : » ou « ? » ne commence plus une ligne. Le texte enregistré ne change pas. Dans la fiche d'un
// rendez-vous (v8), une question se modifie sur place, et des sujets à toucher posent « Parler de : sommeil ».
import { html, useRef, useState } from '../lib.js';
import { Icones } from '../icones.js';
import { BoutonDicter, AIDE_DICTER } from './dicter.js';
import { Repli } from './repli.js';
import { PastillesMultiples } from './multiples.js';
import { ajusterLignes } from './texte.js';
import { afficherToast } from './toast.js';
import { formaterJourMois } from '../../domain/dates.js';
import { dejaPosee, sujetsPoses, basculerSujet, modifierQuestion } from '../../domain/soins.js';
import { pourAffichage } from '../../domain/typographie.js';

// `voir(q)` (consultation) : la fonction qui ouvre la fiche liée à la question depuis son bouton « Voir », ou null
// (pas de lien, ou fiche supprimée : pas de « Voir »). `surModifier(questions)` (fiche d'un rendez-vous, v8) : la case
// seule coche, et un toucher sur le texte le modifie sur place (TexteQuestion).
export function QuestionsACocher({ questions, surChanger, grand = false, surRetirer, voir, surModifier }) {
  if (!questions || questions.length === 0) return null;
  return html`<ul class=${`questions${grand ? ' questions-grandes' : ''}`}>
    ${questions.map((q, i) => {
      const ouvrir = voir && voir(q);
      const cocher = () => surChanger(questions.map((x, k) => (k === i ? { ...x, abordee: !x.abordee } : x)));
      const caseQ = html`<span class="case-question" aria-hidden="true">${q.abordee && Icones.coche({ trait: 3 })}</span>`;
      return html`<li class=${`question-ligne${surModifier ? ` question-modifiable${q.abordee ? ' abordee' : ''}` : ''}`}>
      ${surModifier
        ? html`<button type="button" class="question-case case-seule" aria-pressed=${q.abordee ? 'true' : 'false'} aria-label=${q.texte} onClick=${cocher}>${caseQ}</button>
          <${TexteQuestion} questions=${questions} i=${i} surModifier=${surModifier} />`
        : html`<button type="button" class="question-case" aria-pressed=${q.abordee ? 'true' : 'false'} onClick=${cocher}>
          ${caseQ}<span class="texte-question">${pourAffichage(q.texte)}</span></button>`}
      ${ouvrir && html`<button type="button" class="btn-lien voir-question" aria-label=${`Voir ${q.texte}`} onClick=${(e) => ouvrir(e.currentTarget)}>Voir</button>`}
      ${surRetirer && html`<button type="button" class="effacer" aria-label=${`Retirer la question ${q.texte}`} onClick=${() => surRetirer(i)}>${Icones.fermer()}</button>`}
    </li>`;
    })}
  </ul>`;
}

// Le texte d'une question de la fiche, modifiable sur place (v8, Q22 : « Parler de : sommeil » se complète ensuite).
// Un toucher l'ouvre dans une zone à la taille du texte, curseur à la fin ; Retour ou la sortie du champ enregistre,
// Échap annule. Vide, identique ou déjà posé ailleurs : rien ne change (domain/soins.js) ; ✕ retire une question.
function TexteQuestion({ questions, i, surModifier }) {
  const q = questions[i];
  const [edition, setEdition] = useState(false);
  const zone = useRef(null);
  const bouton = useRef(null);
  const ouverte = useRef(false);
  const enCours = useRef(false);
  const ouvrir = () => {
    ouverte.current = true;
    setEdition(true);
    setTimeout(() => {
      const z = zone.current;
      if (!z) return;
      ajusterLignes(z, 1);
      z.focus();
      z.setSelectionRange(z.value.length, z.value.length);
    }, 0);
  };
  const fermer = (garder, auClavier) => {
    if (!ouverte.current) return;
    ouverte.current = false;
    const texte = zone.current ? zone.current.value : q.texte;
    setEdition(false);
    if (auClavier) setTimeout(() => bouton.current && bouton.current.focus(), 0);
    if (!garder) return;
    const apres = modifierQuestion(questions, i, texte);
    if (apres) surModifier(apres);
    else if (dejaPosee(questions.filter((_, k) => k !== i), texte.replace(/\s+/g, ' '))) afficherToast('Déjà dans ce rendez-vous', null, 2500);
  };
  if (edition) {
    return html`<textarea ref=${zone} class="champ-texte zone-question" rows="1" enterkeyhint="done" aria-label=${`Question : ${q.texte}`} defaultValue=${q.texte}
      onInput=${(e) => ajusterLignes(e.target, 1)} onBlur=${() => fermer(true, false)}
      onCompositionStart=${() => { enCours.current = true; }} onCompositionEnd=${() => { enCours.current = false; }}
      onKeyDown=${(e) => {
        if (e.key === 'Enter' && !e.isComposing && !enCours.current) { e.preventDefault(); fermer(true, true); }
        if (e.key === 'Escape') fermer(false, true);
      }}></textarea>`;
  }
  return html`<button type="button" ref=${bouton} class="texte-question-bouton" aria-label=${`Modifier la question ${q.texte}`} onClick=${ouvrir}>
    <span class="texte-question">${pourAffichage(q.texte)}</span></button>`;
}

// Sujets d'un rendez-vous (v8, Q22), sous le champ des questions : un toucher pose « Parler de : sommeil », choisi
// tant que la question est là telle quelle ; un second toucher la retire (domain/soins.js). Ni compte ni avis.
// `sujets` : les éléments de la liste `sujetRdv` (Réglages › Listes) ; un sujet archivé ne paraît que s'il est posé.
export function SujetsRdv({ sujets, questions, surChanger }) {
  const poses = sujetsPoses(questions, sujets);
  const visibles = sujets.filter((s) => !s.archive || poses.includes(s.id))
    .sort((a, b) => Number(a.archive) - Number(b.archive) || a.ordre - b.ordre);
  if (visibles.length === 0) return null;
  const choisir = (nouveaux) => {
    const apres = nouveaux || [];
    const touche = apres.find((id) => !poses.includes(id)) || poses.find((id) => !apres.includes(id));
    const sujet = sujets.find((s) => s.id === touche);
    if (sujet) surChanger(basculerSujet(questions, sujet.libelle));
  };
  return html`<div class="sujets-rdv">
    <p class="libelle-sujets" aria-hidden="true">Parler de…</p>
    <${PastillesMultiples} etiquette="Parler de" options=${visibles.map((s) => ({ valeur: s.id, libelle: s.libelle }))} valeurs=${poses} surChoix=${choisir} />
  </div>`;
}

export function AjoutQuestion({ surAjouter }) {
  const zone = useRef(null);
  const enCours = useRef(false);
  const [aide, setAide] = useState(false);
  const ajouter = () => {
    const t = zone.current && zone.current.value.trim();
    if (!t) return;
    surAjouter(t);
    zone.current.value = '';
  };
  return html`<div class="champ-zone">
    <div class="champ-avec-dicter ajout-question">
      <input ref=${zone} class="champ-texte champ-une-ligne" enterkeyhint="done" aria-label="Une question pour ce rendez-vous" placeholder="Une question pour ce rendez-vous…"
        onInput=${() => setAide(false)}
        onCompositionStart=${() => { enCours.current = true; }} onCompositionEnd=${() => { enCours.current = false; }}
        onKeyDown=${(e) => { if (e.key === 'Enter' && !e.isComposing && !enCours.current) { e.preventDefault(); ajouter(); zone.current.focus(); } }}
        onBlur=${() => { setAide(false); ajouter(); }} />
      <${BoutonDicter} cible=${zone} surActive=${() => setAide(true)} />
    </div>
    ${aide && html`<p class="aide-dicter discret" role="status">${AIDE_DICTER}</p>`}
  </div>`;
}

export function BoutonConsultation({ href }) {
  return html`<a class="pilule teintee teinte-trt btn-consultation" href=${href}><span class="carre-pilule" aria-hidden="true">${Icones.bulle({ trait: 2 })}</span>En consultation</a>`;
}

// « La dernière fois » (v6) : un repli fermé qui reprend, tels qu'écrits, le compte rendu et la prochaine étape du
// rendez-vous de référence (domain/soins.js, derniereFois), et ses questions non abordées. « Reprendre » copie
// une question sur ce rendez-vous ; le bouton dit ensuite « Reprise ». Ni compte, ni jugement.
export function DerniereFois({ derniere, questions, surReprendre }) {
  if (!derniere) return null;
  const { rdv, questions: aReprendre } = derniere;
  const bloc = (titre, texte) => texte && html`<div class="bloc-lecture"><h3 class="libelle-section">${titre}</h3><p class="texte-lecture">${texte}</p></div>`;
  return html`<${Repli} cle="derniere-fois" titre=${`La dernière fois · ${formaterJourMois(rdv.date)}`} memoriser=${false}>
    ${bloc('Ce qui a été dit / décidé', rdv.compteRendu)}
    ${bloc('Prochaine étape', rdv.prochaineEtape)}
    ${aReprendre.length > 0 && html`<div class="bloc-lecture"><h3 class="libelle-section">Questions non abordées</h3>
      <ul class="questions">${aReprendre.map((q) => {
        const reprise = dejaPosee(questions, q.texte);
        return html`<li class="question-ligne question-reprendre"><span class="texte-question">${pourAffichage(q.texte)}</span>
          <button type="button" class="btn-lien" disabled=${reprise} aria-label=${`${reprise ? 'Reprise' : 'Reprendre'} : ${q.texte}`}
            onClick=${() => surReprendre(q)}>${reprise ? 'Reprise' : 'Reprendre'}</button></li>`;
      })}</ul></div>`}
  </${Repli}>`;
}
