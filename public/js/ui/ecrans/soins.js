// Soins : rendez-vous (par défaut) et traitement.
import { html, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { Segmente } from '../composants/segmente.js';
import { QuestionsACocher, AjoutQuestion, BoutonConsultation } from '../composants/questions.js';
import { Icones } from '../icones.js';
import { repo } from '../../donnees.js';
import { useDonnees, lireLocal, ecrireLocal } from '../hooks.js';
import { carteLibelles, libelle } from '../../domain/libelles.js';
import { formaterJour, formaterJourComplet, formaterJourAbrege } from '../../domain/dates.js';
import { trierRdv } from '../../domain/soins.js';
import { versHash } from '../../routeur.js';
import { PIED_TRAITEMENT } from './traitement.js';
import { CarteTraitementActuel } from '../composants/traitement-actuel.js';

const ONGLETS = [{ valeur: 'rdv', libelle: 'Rendez-vous' }, { valeur: 'traitement', libelle: 'Traitement' }];

// « Psychiatre · mercredi 14 oct. 10:30 » (ligne d'Aujourd'hui).
export function libelleRdv(r, carte) {
  const qui = r.professionnel ? libelle(carte, r.professionnel) : 'Rendez-vous';
  const quand = r.date ? `${formaterJour(r.date)}${r.heure ? ` ${r.heure}` : ''}` : 'Date à fixer';
  return `${qui} · ${quand}`;
}
export const nomRdv = (r, carte) => (r.professionnel ? libelle(carte, r.professionnel) : 'Rendez-vous');
// « mercredi 14 octobre · 10:30 », ou « Date à fixer ».
export const quandRdv = (r) => (r.date ? `${formaterJourComplet(r.date)}${r.heure ? ` · ${r.heure}` : ''}` : 'Date à fixer');
const quandCourt = (r) => (r.date ? `${formaterJourAbrege(r.date)}${r.heure ? ` · ${r.heure}` : ''}` : 'Date à fixer');

const IconeMemo = () => html`<span class="icone-memo" role="img" aria-label="avec mémo vocal">${Icones.onde()}</span>`;

export function Soins() {
  const [onglet, setOnglet] = useState(() => lireLocal('carnet:soins:onglet', 'rdv'));
  const choisir = (v) => { if (v) { setOnglet(v); ecrireLocal('carnet:soins:onglet', v); } };
  const { donnees } = useDonnees(async () => {
    const [rdv, traitements, items, audios] = await Promise.all([repo.rdv.tous(), repo.traitements.tous(), repo.listes.items(), repo.audios.metas()]);
    const avecMemo = new Set(audios.map((a) => `${a.parentStore}:${a.parentId}`));
    return { rdv, traitements, carte: carteLibelles(items), avecMemo, aujourdhui: repo.aujourdhui() };
  }, []);
  if (!donnees) return html`<main class="ecran soins"><${Entete} titre="Soins" /></main>`;
  const { carte, aujourdhui, avecMemo } = donnees;

  let contenu;
  if (onglet === 'rdv') {
    const { aVenir, passes } = trierRdv(donnees.rdv, aujourdhui);
    // Le prochain : le premier rendez-vous à venir daté, sans limite de temps.
    const prochain = aVenir.find((r) => r.date) || null;
    const autres = aVenir.filter((r) => r !== prochain);
    const ligne = (r) => html`<li><a class="ligne-carte ligne-rdv-liste" href=${versHash('rdv', { id: r.id })}>
      <span class="ligne-libelle">${nomRdv(r, carte)}</span>
      ${avecMemo.has(`rdv:${r.id}`) && html`<${IconeMemo} />`}
      <span class="ligne-valeur">${quandCourt(r)}</span>${Icones.chevron({ trait: 2 })}</a></li>`;
    const majQuestions = (r) => (q) => repo.rdv.modifier(r.id, { questions: q.length ? q : null });
    contenu = html`
      <a class="btn-lien action ajout-lien" href="#/rdv/nouveau">${Icones.plus({ trait: 2 })}Rendez-vous</a>
      ${aVenir.length === 0 && passes.length === 0 && html`<p class="vide">Aucun rendez-vous noté pour l'instant.</p>`}
      ${aVenir.length > 0 && html`<h2 class="libelle-section">À venir</h2>`}
      ${prochain && html`<section class="carte carte-prochain" aria-label="Prochain rendez-vous">
        <a class="tete-prochain" href=${versHash('rdv', { id: prochain.id })}>
          <span class="tete-prochain-texte"><span class="nom-prochain">${nomRdv(prochain, carte)}</span><span class="quand-prochain">${quandRdv(prochain)}</span></span>
          ${Icones.chevron({ trait: 2 })}</a>
        <${BoutonConsultation} href=${versHash('consultation', { id: prochain.id })} />
        <${QuestionsACocher} questions=${prochain.questions} surChanger=${majQuestions(prochain)} />
        <${AjoutQuestion} surAjouter=${(t) => repo.rdv.modifier(prochain.id, { questions: [...(prochain.questions || []), { texte: t, abordee: false }] })} />
      </section>`}
      ${autres.length > 0 && html`<ul class="liste carte carte-groupe">${autres.map(ligne)}</ul>`}
      ${passes.length > 0 && html`<h2 class="libelle-section passes">Passés</h2><ul class="liste carte carte-groupe">${passes.map(ligne)}</ul>`}`;
  } else {
    const liste = [...donnees.traitements].sort((a, b) => `${b.date}${b.createdAt}`.localeCompare(`${a.date}${a.createdAt}`));
    contenu = html`
      <${CarteTraitementActuel} />
      <h2 class="libelle-section">Changements</h2>
      <a class="btn-lien action ajout-lien" href="#/traitement/nouveau">${Icones.plus({ trait: 2 })}Changement</a>
      ${liste.length === 0
        ? html`<p class="vide">Aucun changement noté pour l'instant.</p>`
        : html`<ul class="liste carte carte-groupe">${liste.map((t) => html`<li><a class="ligne-carte ligne-hist" href=${versHash('traitement', { id: t.id })}>
            <span class="hist-corps">
              <span class="hist-date">${formaterJourAbrege(t.date)}${avecMemo.has(`traitements:${t.id}`) && html`<${IconeMemo} />`}</span>
              <span class="hist-resume">${[t.changement || '·', t.effetRessenti ? libelle(carte, t.effetRessenti) : '·'].join(' · ')}</span>
            </span>${Icones.chevron({ trait: 2 })}</a></li>`)}</ul>`}
      <div class="entretoise"></div>
      <p class="pied-collant">${PIED_TRAITEMENT}</p>`;
  }
  return html`<main class="ecran soins">
    <${Entete} titre="Soins" />
    <${Segmente} etiquette="Soins" options=${ONGLETS} valeur=${onglet} surChoix=${choisir} classe="large" sansVide=${true} />
    ${contenu}
  </main>`;
}
