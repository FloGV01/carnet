// Questions d'un rendez-vous : à cocher une fois abordées (en gris, jamais barrées), et champ
// d'ajout au style Dicter. Retour ajoute la question et garde le champ prêt pour la suivante ;
// la sortie du champ l'ajoute aussi, pour ne jamais perdre une question.
import { html, useRef, useState } from '../lib.js';
import { Icones } from '../icones.js';
import { BoutonDicter, AIDE_DICTER } from './dicter.js';

export function QuestionsACocher({ questions, surChanger, grand = false, surRetirer }) {
  if (!questions || questions.length === 0) return null;
  return html`<ul class=${`questions${grand ? ' questions-grandes' : ''}`}>
    ${questions.map((q, i) => html`<li class="question-ligne">
      <button type="button" class="question-case" aria-pressed=${q.abordee ? 'true' : 'false'}
        onClick=${() => surChanger(questions.map((x, k) => (k === i ? { ...x, abordee: !x.abordee } : x)))}>
        <span class="case-question" aria-hidden="true">${q.abordee && Icones.coche({ trait: 3 })}</span>
        <span class="texte-question">${q.texte}</span>
      </button>
      ${surRetirer && html`<button type="button" class="effacer" aria-label=${`Retirer la question ${q.texte}`} onClick=${() => surRetirer(i)}>${Icones.fermer()}</button>`}
    </li>`)}
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
  return html`<a class="pilule teintee teinte-trt btn-consultation" href=${href}>${Icones.bulle()}En consultation</a>`;
}
