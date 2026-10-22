// Questions d'un rendez-vous : à cocher une fois abordées (en gris, jamais barrées), et champ
// d'ajout au style Dicter. Retour ajoute la question et garde le champ prêt pour la suivante ;
// la sortie du champ l'ajoute aussi, pour ne jamais perdre une question. À l'affichage seulement, une question passe par
// pourAffichage : « : » ou « ? » ne commence plus une ligne. Le texte enregistré ne change pas.
import { html, useRef, useState } from '../lib.js';
import { Icones } from '../icones.js';
import { BoutonDicter, AIDE_DICTER } from './dicter.js';
import { Repli } from './repli.js';
import { formaterJourMois } from '../../domain/dates.js';
import { dejaPosee } from '../../domain/soins.js';
import { pourAffichage } from '../../domain/typographie.js';

// `voir(q)` (consultation) : la fonction qui ouvre la fiche liée à la question depuis son bouton « Voir », ou null
// (pas de lien, ou fiche supprimée : pas de « Voir »).
export function QuestionsACocher({ questions, surChanger, grand = false, surRetirer, voir }) {
  if (!questions || questions.length === 0) return null;
  return html`<ul class=${`questions${grand ? ' questions-grandes' : ''}`}>
    ${questions.map((q, i) => {
      const ouvrir = voir && voir(q);
      return html`<li class="question-ligne">
      <button type="button" class="question-case" aria-pressed=${q.abordee ? 'true' : 'false'}
        onClick=${() => surChanger(questions.map((x, k) => (k === i ? { ...x, abordee: !x.abordee } : x)))}>
        <span class="case-question" aria-hidden="true">${q.abordee && Icones.coche({ trait: 3 })}</span>
        <span class="texte-question">${pourAffichage(q.texte)}</span>
      </button>
      ${ouvrir && html`<button type="button" class="btn-lien voir-question" aria-label=${`Voir ${q.texte}`} onClick=${(e) => ouvrir(e.currentTarget)}>Voir</button>`}
      ${surRetirer && html`<button type="button" class="effacer" aria-label=${`Retirer la question ${q.texte}`} onClick=${() => surRetirer(i)}>${Icones.fermer()}</button>`}
    </li>`;
    })}
  </ul>`;
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
