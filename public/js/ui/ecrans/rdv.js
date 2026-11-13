// Fiche d'un rendez-vous : enregistrement automatique, questions à cocher (et à modifier sur place, v8), sujets à
// toucher sous le champ des questions (v8, Q22), mémo vocal.
import { html, useEffect, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { Pastilles } from '../composants/pastilles.js';
import { ChampTexte } from '../composants/texte.js';
import { MemoVocal } from '../composants/memo-vocal.js';
import { Confirmation } from '../composants/confirmation.js';
import { QuestionsACocher, AjoutQuestion, BoutonConsultation, SujetsRdv } from '../composants/questions.js';
import { Icones } from '../icones.js';
import { LibelleChamp } from '../composants/rubrique.js';
import { repo } from '../../donnees.js';
import { useFiche } from '../fiche.js';
import { versHash } from '../../routeur.js';
import { options } from './aujourdhui.js';

export { AjoutQuestion };

export function Rdv({ id: idRoute }) {
  const [items, setItems] = useState(null);
  const [sujets, setSujets] = useState(null);
  const [confirmer, setConfirmer] = useState(false);
  useEffect(() => {
    repo.listes.items('professionnel').then(setItems);
    repo.listes.items('sujetRdv').then(setSujets);
  }, []);
  const { fiche, id, ecrire, assurer, supprimer, indicateur } = useFiche({
    store: 'rdv', route: 'rdv', idRoute, retour: '#/soins', initiale: () => ({ date: null, heure: null }),
  });
  const retour = () => { location.hash = '#/soins'; };
  if (!fiche || !items || !sujets) return html`<main class="ecran fiche"><${Entete} titre="Rendez-vous" retour=${retour} /></main>`;
  const questions = fiche.questions || [];
  const majQuestions = (q) => ecrire({ questions: q.length ? q : null });
  const enConsultation = async () => { const i = await assurer(); if (i) location.hash = versHash('consultation', { id: i }); };
  return html`<main class="ecran fiche">
    <${Entete} titre="Rendez-vous" retour=${retour}
      droite=${html`<span class="indicateur-fiche" role="status">${indicateur === 'ok' ? 'Enregistré' : ''}</span>`} />
    ${id ? html`<${BoutonConsultation} href=${versHash('consultation', { id })} />`
      : html`<button type="button" class="pilule btn-consultation" onClick=${enConsultation}>${Icones.bulle({ trait: 2 })}En consultation</button>`}
    <div class="ligne-date-heure">
      <div class="champ-date">
        <${LibelleChamp} icone="soins" pour="rdv-date">Date</${LibelleChamp}>
        <div class="ligne-heure">
          <input id="rdv-date" type="date" class="champ-ligne" value=${fiche.date || ''} onChange=${(e) => ecrire({ date: e.target.value || null })} />
          ${fiche.date && html`<button type="button" class="effacer" aria-label="Effacer la date" onClick=${() => ecrire({ date: null })}>${Icones.fermer()}</button>`}
        </div>
        ${!fiche.date && html`<span class="note-champ">Date à fixer</span>`}
      </div>
      <div class="champ-date champ-heure-rdv">
        <${LibelleChamp} icone="historique" pour="rdv-heure">Heure</${LibelleChamp}>
        <div class="ligne-heure">
          <input id="rdv-heure" type="time" class="champ-ligne" value=${fiche.heure || ''} onChange=${(e) => ecrire({ heure: e.target.value || null })} />
          ${fiche.heure && html`<button type="button" class="effacer" aria-label="Effacer Heure" onClick=${() => ecrire({ heure: null })}>${Icones.fermer()}</button>`}
        </div>
      </div>
    </div>
    <div class="champ-fiche">
      <${LibelleChamp} icone="personne">Professionnel</${LibelleChamp}>
      <${Pastilles} etiquette="Professionnel" options=${options(items, 'professionnel', fiche.professionnel)} valeur=${fiche.professionnel}
        surChoix=${(v) => ecrire({ professionnel: v })} classe="souples larges"
        surAjouter=${async (t) => { const it = await repo.listes.creer('professionnel', t); setItems(await repo.listes.items('professionnel')); ecrire({ professionnel: it.id }); }} />
    </div>
    <div class="champ-fiche">
      <${LibelleChamp} icone="questions">Questions</${LibelleChamp}>
      ${questions.length > 0 && html`<div class="carte-questions"><${QuestionsACocher} questions=${questions} surChanger=${majQuestions}
        surModifier=${majQuestions} surRetirer=${(i) => majQuestions(questions.filter((_, k) => k !== i))} /></div>`}
      <${AjoutQuestion} surAjouter=${(t) => majQuestions([...(fiche.questions || []), { texte: t, abordee: false }])} />
      <${SujetsRdv} sujets=${sujets} questions=${questions} surChanger=${majQuestions} />
    </div>
    <div class="champ-fiche"><${ChampTexte} key=${`cr-${idRoute}`} id="rdv-compte-rendu" etiquette="Ce qui a été dit / décidé" icone="note" valeur=${fiche.compteRendu}
      cleBrouillon=${id ? `carnet:brouillon:${id}:compteRendu` : null} surEnregistrer=${(v) => ecrire({ compteRendu: v })} /></div>
    <div class="champ-fiche"><${ChampTexte} key=${`pe-${idRoute}`} id="rdv-prochaine-etape" etiquette="Prochaine étape" icone="etape" valeur=${fiche.prochaineEtape} lignes=${2}
      cleBrouillon=${id ? `carnet:brouillon:${id}:prochaineEtape` : null} surEnregistrer=${(v) => ecrire({ prochaineEtape: v })} /></div>
    <${MemoVocal} parentStore="rdv" parentId=${id} assurerParent=${assurer} />
    ${id && html`<button type="button" class="lien-discret supprimer" onClick=${() => setConfirmer(true)}>Supprimer ce rendez-vous</button>`}
    ${confirmer && html`<${Confirmation} titre="Supprimer ce rendez-vous ?" texte="Ses mémos vocaux sont supprimés aussi." action="Supprimer"
      surAnnuler=${() => setConfirmer(false)} surConfirmer=${() => { setConfirmer(false); supprimer('Rendez-vous'); }} />`}
  </main>`;
}
