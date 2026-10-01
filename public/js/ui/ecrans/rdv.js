// Fiche d'un rendez-vous : enregistrement automatique, questions à cocher, mémo vocal.
import { html, useEffect, useRef, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { Pastilles } from '../composants/pastilles.js';
import { ChampTexte } from '../composants/texte.js';
import { ChampHeure } from '../composants/heure.js';
import { BoutonDicter } from '../composants/dicter.js';
import { MemoVocal } from '../composants/memo-vocal.js';
import { repo } from '../../donnees.js';
import { useFiche } from '../fiche.js';
import { options } from './aujourdhui.js';

export function AjoutQuestion({ surAjouter }) {
  const zone = useRef(null);
  const ajouter = () => {
    const t = zone.current && zone.current.value.trim();
    if (!t) return;
    surAjouter(t);
    zone.current.value = '';
    zone.current.focus();
  };
  return html`<div class="champ-avec-dicter ajout-question">
    <input ref=${zone} class="champ-ligne" enterkeyhint="done" aria-label="Une question pour ce rendez-vous" placeholder="Une question pour ce rendez-vous…"
      onKeyDown=${(e) => { if (e.key === 'Enter') { e.preventDefault(); ajouter(); } }} onBlur=${ajouter} />
    <${BoutonDicter} cible=${zone} />
  </div>`;
}

export function Rdv({ id: idRoute }) {
  const [items, setItems] = useState(null);
  const [confirmer, setConfirmer] = useState(false);
  useEffect(() => { repo.listes.items('professionnel').then(setItems); }, []);
  const { fiche, id, ecrire, assurer, supprimer, indicateur } = useFiche({
    store: 'rdv', route: 'rdv', idRoute, retour: '#/soins', initiale: () => ({ date: null, heure: null }),
  });
  if (!fiche || !items) return html`<main class="ecran"><${Entete} titre="Rendez-vous" retour=${() => { location.hash = '#/soins'; }} /></main>`;
  const questions = fiche.questions || [];
  const majQuestions = (q) => ecrire({ questions: q.length ? q : null });
  return html`<main class="ecran fiche">
    <${Entete} titre="Rendez-vous" retour=${() => { location.hash = '#/soins'; }}
      droite=${html`<span class="indicateur-fiche discret" role="status">${indicateur === 'ok' ? 'Enregistré' : ''}</span>`} />
    <div class="deux-colonnes">
      <div class="champ-heure">
        <label class="etiquette" for="rdv-date">Date</label>
        <div class="ligne-heure">
          <input id="rdv-date" type="date" class="champ-ligne" value=${fiche.date || ''} onChange=${(e) => ecrire({ date: e.target.value || null })} />
          ${fiche.date && html`<button type="button" class="effacer" aria-label="Effacer la date" onClick=${() => ecrire({ date: null })}>✕</button>`}
        </div>
        ${!fiche.date && html`<span class="discret">Date à fixer</span>`}
      </div>
      <${ChampHeure} id="rdv-heure" etiquette="Heure" valeur=${fiche.heure} surChoix=${(v) => ecrire({ heure: v })} />
    </div>
    <div class="champ">
      <span class="etiquette">Professionnel</span>
      <${Pastilles} etiquette="Professionnel" options=${options(items, 'professionnel', fiche.professionnel)} valeur=${fiche.professionnel}
        surChoix=${(v) => ecrire({ professionnel: v })} colonnes=${2} classe="grille-choix" />
    </div>
    <div class="champ">
      <span class="etiquette">Questions à poser</span>
      <ul class="liste questions">${questions.map((q, i) => html`<li class="ligne">
        <label class="case"><input type="checkbox" checked=${q.abordee}
          onChange=${(e) => majQuestions(questions.map((x, k) => (k === i ? { ...x, abordee: e.target.checked } : x)))} />
          <span class=${q.abordee ? 'abordee' : ''}>${q.texte}</span></label>
        <button type="button" class="effacer" aria-label=${`Retirer la question ${q.texte}`} onClick=${() => majQuestions(questions.filter((_, k) => k !== i))}>✕</button>
      </li>`)}</ul>
      <${AjoutQuestion} surAjouter=${(t) => majQuestions([...questions, { texte: t, abordee: false }])} />
    </div>
    <div class="champ"><${ChampTexte} key=${`cr-${idRoute}`} id="rdv-compte-rendu" etiquette="Ce qui a été dit / décidé" valeur=${fiche.compteRendu}
      cleBrouillon=${id ? `carnet:brouillon:${id}:compteRendu` : null} surEnregistrer=${(v) => ecrire({ compteRendu: v })} /></div>
    <div class="champ"><${ChampTexte} key=${`pe-${idRoute}`} id="rdv-prochaine-etape" etiquette="Prochaine étape" valeur=${fiche.prochaineEtape} lignes=${2}
      cleBrouillon=${id ? `carnet:brouillon:${id}:prochaineEtape` : null} surEnregistrer=${(v) => ecrire({ prochaineEtape: v })} /></div>
    <${MemoVocal} parentStore="rdv" parentId=${id} assurerParent=${assurer} />
    ${id && (confirmer
      ? html`<div class="confirmation" role="alert"><p>Supprimer ce rendez-vous ?</p>
          <div class="ligne"><button type="button" class="btn" onClick=${() => setConfirmer(false)}>Garder</button>
          <button type="button" class="btn btn-effacer" onClick=${() => supprimer('Rendez-vous')}>Supprimer</button></div></div>`
      : html`<button type="button" class="btn-lien supprimer" onClick=${() => setConfirmer(true)}>Supprimer ce rendez-vous</button>`)}
  </main>`;
}
