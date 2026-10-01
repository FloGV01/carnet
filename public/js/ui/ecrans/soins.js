// Soins : rendez-vous (par défaut) et traitement.
import { html, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { Segmente } from '../composants/segmente.js';
import { Icones } from '../icones.js';
import { repo } from '../../donnees.js';
import { useDonnees, lireLocal, ecrireLocal } from '../hooks.js';
import { carteLibelles, libelle } from '../../domain/libelles.js';
import { formaterJour } from '../../domain/dates.js';
import { trierRdv } from '../../domain/soins.js';
import { versHash } from '../../routeur.js';
import { AjoutQuestion } from './rdv.js';
import { PIED_TRAITEMENT } from './traitement.js';

const ONGLETS = [{ valeur: 'rdv', libelle: 'Rendez-vous' }, { valeur: 'traitement', libelle: 'Traitement' }];

export function libelleRdv(r, carte) {
  const qui = r.professionnel ? libelle(carte, r.professionnel) : 'Rendez-vous';
  const quand = r.date ? `${formaterJour(r.date)}${r.heure ? ` ${r.heure}` : ''}` : 'Date à fixer';
  return `${qui} · ${quand}`;
}

export function Soins() {
  const [onglet, setOnglet] = useState(() => lireLocal('carnet:soins:onglet', 'rdv'));
  const choisir = (v) => { if (v) { setOnglet(v); ecrireLocal('carnet:soins:onglet', v); } };
  const { donnees } = useDonnees(async () => {
    const [rdv, traitements, items] = await Promise.all([repo.rdv.tous(), repo.traitements.tous(), repo.listes.items()]);
    return { rdv, traitements, carte: carteLibelles(items), aujourdhui: repo.aujourdhui() };
  }, []);
  if (!donnees) return html`<main class="ecran"><${Entete} titre="Soins" /></main>`;
  const { carte, aujourdhui } = donnees;

  let contenu;
  if (onglet === 'rdv') {
    const { aVenir, passes } = trierRdv(donnees.rdv, aujourdhui);
    const prochain = aVenir[0];
    const ligne = (r) => html`<li><a class="ligne lien-ligne" href=${versHash('rdv', { id: r.id })}>
      <span>${libelleRdv(r, carte)}</span><span class="discret">${(r.questions || []).filter((q) => !q.abordee).length || ''} ›</span></a></li>`;
    contenu = html`
      <a class="btn btn-plein lien-bouton section" href="#/rdv/nouveau">${Icones.plus()} Rendez-vous</a>
      ${prochain && html`<section class="carte section prochain">
        <a class="lien-ligne" href=${versHash('rdv', { id: prochain.id })}><strong>${libelleRdv(prochain, carte)}</strong></a>
        <ul class="liste">${(prochain.questions || []).filter((q) => !q.abordee).map((q) => html`<li class="discret">${q.texte}</li>`)}</ul>
        <${AjoutQuestion} surAjouter=${(t) => repo.rdv.modifier(prochain.id, { questions: [...(prochain.questions || []), { texte: t, abordee: false }] })} />
      </section>`}
      ${aVenir.length === 0 && passes.length === 0 && html`<p class="discret vide">Aucun rendez-vous noté pour l'instant.</p>`}
      ${aVenir.length > 0 && html`<section class="section"><h2>À venir</h2><ul class="liste carte">${aVenir.map(ligne)}</ul></section>`}
      ${passes.length > 0 && html`<section class="section"><h2>Passés</h2><ul class="liste carte">${passes.map(ligne)}</ul></section>`}`;
  } else {
    const liste = [...donnees.traitements].sort((a, b) => `${b.date}${b.createdAt}`.localeCompare(`${a.date}${a.createdAt}`));
    contenu = html`
      <a class="btn btn-plein lien-bouton section" href="#/traitement/nouveau">${Icones.plus()} Traitement</a>
      ${liste.length === 0
        ? html`<p class="discret vide">Aucune fiche de traitement pour l'instant.</p>`
        : html`<ul class="liste carte section">${liste.map((t) => html`<li><a class="ligne lien-ligne" href=${versHash('traitement', { id: t.id })}>
            <span>${[formaterJour(t.date), t.changement, t.effetRessenti && libelle(carte, t.effetRessenti)].filter(Boolean).join(' · ')}</span><span aria-hidden="true">›</span></a></li>`)}</ul>`}
      <p class="pied discret">${PIED_TRAITEMENT}</p>`;
  }
  return html`<main class="ecran soins">
    <${Entete} titre="Soins" />
    <${Segmente} etiquette="Soins" options=${ONGLETS} valeur=${onglet} surChoix=${choisir} />
    ${contenu}
  </main>`;
}
