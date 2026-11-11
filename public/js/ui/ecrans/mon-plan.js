// « Mon plan » (v4) : écrit par l'utilisateur, avec ses mots. Enregistré au fil de la saisie. v11 (spec §8.1) : une ligne
// « Mes refuges » après les si… alors…, vers l'écran de ses titres et de ses playlists.
import { html, useEffect, useRef, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { ChampTexte } from '../composants/texte.js';
import { IconeLigne } from '../composants/rubrique.js';
import { repo } from '../../donnees.js';
import { useIndicateur, ecrireAvecEssais } from '../hooks.js';
import { etatApp } from '../../store.js';
import { normaliserPlan, RUBRIQUES_PLAN } from '../../domain/mon-plan.js';
import { lirePlan } from '../composants/mon-plan.js';
import { Icones } from '../icones.js';

// L'écran d'où Mon plan a été ouvert (Réglages, Moment difficile…), retenu tant que l'app reste ouverte. Mes refuges s'ouvre
// d'ici et y revient : sans cela, les deux écrans se renverraient l'un à l'autre. Une origine inconnue ramène sur Aujourd'hui.
let origine = null;
const AUTOUR = /^#\/(mon-plan|refuges)(\/|$)/;
function retenirOrigine() {
  const precedente = etatApp.lire().routePrecedente;
  if (precedente && !AUTOUR.test(precedente)) origine = precedente;
}
function revenir() {
  location.hash = origine || '#/aujourdhui';
}

export function MonPlan() {
  useState(retenirOrigine); // une fois, à l'ouverture
  const [plan, setPlan] = useState(null);
  const file = useRef(Promise.resolve());
  const [, signaler] = useIndicateur();
  useEffect(() => { lirePlan().then(setPlan); }, []);
  // Écritures en file, chacune relue et réécrite dans sa transaction : rien ne s'écrase. La
  // promesse rejette si l'écriture échoue : un champ texte garde alors son brouillon local.
  const changer = (modifier) => {
    const travail = file.current.then(async () => {
      setPlan(await ecrireAvecEssais(() => repo.meta.modifier('monPlan', (p) => normaliserPlan(modifier(normaliserPlan(p)))), signaler));
    });
    file.current = travail.catch(() => {});
    return travail;
  };
  if (!plan) return html`<main class="ecran fiche"><${Entete} titre="Mon plan" retour=${revenir} /></main>`;
  return html`<main class="ecran fiche mon-plan">
    <${Entete} titre="Mon plan" retour=${revenir} />
    <p class="texte-secondaire">Avec tes mots. Si tu veux, montre-le à ton soignant. Il s'ouvre depuis chaque épisode.</p>
    ${RUBRIQUES_PLAN.map(([cle, titre]) => html`<div class="champ-fiche"><${ChampTexte} id=${`plan-${cle}`} etiquette=${titre} valeur=${plan[cle]} lignes=${2}
      cleBrouillon=${`carnet:brouillon:plan:${cle}`} surEnregistrer=${(v) => changer((p) => ({ ...p, [cle]: v }))} /></div>`)}
    <section class="champ-fiche" aria-label="Si… alors…">
      <h2 class="libelle-section">Si… alors…</h2>
      ${plan.siAlors.length === 0
        ? html`<p class="texte-secondaire">Ceux que tu ajoutes depuis un Après coup apparaissent ici.</p>`
        : html`<ul class="liste carte carte-groupe">${plan.siAlors.map((x, i) => html`<li class="ligne-info">
            <span>Si ${x.si || '…'}, alors ${x.alors || '…'}</span>
            <button type="button" class="effacer" aria-label=${`Retirer « si ${x.si || '…'} »`} onClick=${() => changer((p) => ({ ...p, siAlors: p.siAlors.filter((_, k) => k !== i) })).catch(() => {})}>${Icones.fermer()}</button>
          </li>`)}</ul>`}
    </section>
    <div class="carte carte-groupe avec-carres">
      <a class="ligne-carte" href="#/refuges"><${IconeLigne} icone="musique" /><span class="ligne-libelle">Mes refuges</span>${Icones.chevron({ trait: 2 })}</a>
    </div>
  </main>`;
}
