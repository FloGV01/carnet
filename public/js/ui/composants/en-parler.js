// « En parler au rendez-vous » (v6) : depuis un épisode, un symptôme, un Après coup ou une fiche Traitement.
// La feuille propose une question déjà écrite (les choix seulement, domain/soins.js), modifiable avant l'ajout.
// Un toucher sur un rendez-vous à venir l'y ajoute, avec un lien vers la fiche ; « Nouveau rendez-vous » en crée
// un « Date à fixer » avec le soignant choisi. Rien ne s'ajoute deux fois (même texte).
import { html, useRef, useState } from '../lib.js';
import { repo } from '../../donnees.js';
import { useDonnees } from '../hooks.js';
import { libelle } from '../../domain/libelles.js';
import { formaterJourAbrege } from '../../domain/dates.js';
import { trierRdv, dejaPosee, reprendreQuestion, questionPreecrite } from '../../domain/soins.js';
import { Feuille } from './feuille.js';
import { Pastilles } from './pastilles.js';
import { afficherToast } from './toast.js';
import { Icones } from '../icones.js';
import { ajusterLignes } from './texte.js';

// « Psychiatre · mer. 14 oct. · 10:30 », ou « … · Date à fixer ».
const nomRdv = (r, carte) => (r.professionnel ? libelle(carte, r.professionnel) : 'Rendez-vous');
const quandRdv = (r) => (r.date ? `${formaterJourAbrege(r.date)}${r.heure ? ` · ${r.heure}` : ''}` : 'Date à fixer');

// Annuler : retire la question ajoutée (aucun doublon de texte n'existe, c'est donc la seule).
async function retirerQuestion(id, texte) {
  const r = await repo.rdv.lire(id);
  if (!r) return;
  const reste = (r.questions || []).filter((q) => q.texte !== texte);
  await repo.rdv.modifier(id, { questions: reste.length ? reste : null });
}

function FeuilleEnParler({ store, element, carte, surFermer, retourFocus }) {
  const zone = useRef(null);
  const [nouveau, setNouveau] = useState(null);
  const { donnees } = useDonnees(async () => {
    const [rdvs, professionnels] = await Promise.all([repo.rdv.tous(), repo.listes.items('professionnel')]);
    return { aVenir: trierRdv(rdvs, repo.aujourdhui()).aVenir, professionnels: professionnels.filter((p) => !p.archive) };
  }, [], { suivre: false });
  // Le texte tel que modifié : une seule ligne, sans espaces autour.
  const lireQuestion = () => {
    const texte = zone.current ? zone.current.value.replace(/\s+/g, ' ').trim() : '';
    return texte ? { texte, abordee: false, lien: { store, id: element.id } } : null;
  };

  const ajouter = async (rdv) => {
    const question = lireQuestion();
    if (!question) return;
    const actuel = await repo.rdv.lire(rdv.id);
    surFermer();
    if (!actuel) return;
    if (dejaPosee(actuel.questions, question.texte)) { afficherToast('Déjà dans ce rendez-vous', null, 2500); return; }
    await repo.rdv.modifier(rdv.id, { questions: reprendreQuestion(actuel, question) });
    afficherToast('Question ajoutée au rendez-vous', { libelle: 'Annuler', faire: () => retirerQuestion(rdv.id, question.texte) });
  };
  const creer = async (professionnel) => {
    const question = lireQuestion();
    if (!question || !professionnel) return;
    surFermer();
    const cree = await repo.rdv.creer({ date: null, heure: null, professionnel, questions: [question] });
    afficherToast('Question ajoutée à un nouveau rendez-vous', { libelle: 'Annuler', faire: () => repo.rdv.supprimer(cree.id) });
  };

  // Sans rendez-vous à venir, le choix du soignant est ouvert d'emblée.
  const ouvert = nouveau ?? (donnees ? donnees.aVenir.length === 0 : false);
  return html`<${Feuille} titre="En parler au rendez-vous" idTitre="titre-feuille-en-parler" surFermer=${surFermer} retourFocus=${retourFocus}>
    <div class="champ-zone">
      <label class="etiquette" for="question-en-parler">Question</label>
      <textarea id="question-en-parler" ref=${zone} class="champ-texte" rows="3" data-lignes="3" defaultValue=${questionPreecrite(element, { store, carte })}
        onInput=${(e) => ajusterLignes(e.target, 3)}></textarea>
    </div>
    ${donnees && html`<div class="choix-rdv">
      ${donnees.aVenir.length > 0 && html`<h3 class="libelle-section">Ajouter à</h3>
        <ul class="liste carte carte-groupe" aria-label="Rendez-vous à venir">${donnees.aVenir.map((r) => html`<li>
          <button type="button" class="ligne-carte ligne-rdv-liste" onClick=${() => ajouter(r)}>
            <span class="ligne-libelle">${nomRdv(r, carte)}</span><span class="ligne-valeur">${quandRdv(r)}</span></button></li>`)}</ul>`}
      <button type="button" class="btn-lien action" aria-expanded=${ouvert ? 'true' : 'false'} onClick=${() => setNouveau(!ouvert)}>
        ${Icones.plus({ trait: 2 })}Nouveau rendez-vous</button>
      ${ouvert && html`<${Pastilles} etiquette="Soignant" classe="souples larges" valeur=${null} surChoix=${creer}
        options=${donnees.professionnels.map((p) => ({ valeur: p.id, libelle: p.libelle }))} />`}
    </div>`}
  </${Feuille}>`;
}

// Le lien « En parler au rendez-vous » et sa feuille. Rien tant que la fiche n'est pas enregistrée (pas d'id).
export function EnParler({ store, element, carte }) {
  const [ouvert, setOuvert] = useState(false);
  const bouton = useRef(null);
  if (!element || !element.id) return null;
  return html`<button type="button" class="btn-lien action en-parler" ref=${bouton} onClick=${() => setOuvert(true)}>${Icones.bulle()}En parler au rendez-vous</button>
    ${ouvert && html`<${FeuilleEnParler} store=${store} element=${element} carte=${carte} surFermer=${() => setOuvert(false)} retourFocus=${bouton} />`}`;
}
