// « Mon plan » (v4) : écrit par l'utilisateur, avec ses mots. Enregistré au fil de la saisie.
import { html, useEffect, useRef, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { ChampTexte } from '../composants/texte.js';
import { repo } from '../../donnees.js';
import { etatApp } from '../../store.js';
import { normaliserPlan, RUBRIQUES_PLAN } from '../../domain/mon-plan.js';
import { lirePlan } from '../composants/mon-plan.js';
import { Icones } from '../icones.js';

function revenir() {
  const precedente = etatApp.lire().routePrecedente;
  location.hash = precedente && !/#\/mon-plan/.test(precedente) ? precedente : '#/aujourdhui';
}

export function MonPlan() {
  const [plan, setPlan] = useState(null);
  const file = useRef(Promise.resolve());
  useEffect(() => { lirePlan().then(setPlan); }, []);
  // Écritures en file, chacune relue et réécrite dans sa transaction : rien ne s'écrase.
  const changer = (modifier) => {
    file.current = file.current.then(async () => {
      setPlan(await repo.meta.modifier('monPlan', (p) => normaliserPlan(modifier(normaliserPlan(p)))));
    }).catch(() => {});
    return file.current;
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
            <button type="button" class="effacer" aria-label=${`Retirer « si ${x.si || '…'} »`} onClick=${() => changer((p) => ({ ...p, siAlors: p.siAlors.filter((_, k) => k !== i) }))}>${Icones.fermer()}</button>
          </li>`)}</ul>`}
    </section>
  </main>`;
}
