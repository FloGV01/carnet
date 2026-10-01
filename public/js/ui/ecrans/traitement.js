// Fiche traitement : changement, effets secondaires (« Aucun » exclusif), effet ressenti.
// L'app n'interprète rien : ce journal sert à préparer les échanges avec le psychiatre.
import { html, useEffect, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { Segmente } from '../composants/segmente.js';
import { PastillesMultiples } from '../composants/multiples.js';
import { ChampTexte } from '../composants/texte.js';
import { MemoVocal } from '../composants/memo-vocal.js';
import { repo } from '../../donnees.js';
import { useFiche } from '../fiche.js';
import { options } from './aujourdhui.js';

export const PIED_TRAITEMENT = 'Ce journal sert à préparer tes échanges avec ton psychiatre.';

export function Traitement({ id: idRoute }) {
  const [items, setItems] = useState(null);
  const [confirmer, setConfirmer] = useState(false);
  useEffect(() => { repo.listes.items().then(setItems); }, []);
  const aujourdhui = repo.aujourdhui();
  const { fiche, id, ecrire, assurer, supprimer, indicateur } = useFiche({
    store: 'traitements', route: 'traitement', idRoute, retour: '#/soins', initiale: () => ({ date: aujourdhui }),
  });
  if (!fiche || !items) return html`<main class="ecran"><${Entete} titre="Traitement" retour=${() => { location.hash = '#/soins'; }} /></main>`;
  const exclusifs = new Set(items.filter((i) => i.exclusif).map((i) => i.id));
  return html`<main class="ecran fiche">
    <${Entete} titre="Traitement" retour=${() => { location.hash = '#/soins'; }}
      droite=${html`<span class="indicateur-fiche discret" role="status">${indicateur === 'ok' ? 'Enregistré' : ''}</span>`} />
    <div class="champ-heure">
      <label class="etiquette" for="tr-date">Date</label>
      <input id="tr-date" type="date" class="champ-ligne" value=${fiche.date} max=${aujourdhui}
        onChange=${(e) => { const v = e.target.value; if (v && v <= aujourdhui) ecrire({ date: v }); }} />
    </div>
    <div class="champ"><${ChampTexte} key=${`ch-${idRoute}`} id="tr-changement" etiquette="Changement / ajustement (facultatif)" valeur=${fiche.changement} lignes=${2}
      cleBrouillon=${id ? `carnet:brouillon:${id}:changement` : null} surEnregistrer=${(v) => ecrire({ changement: v })} /></div>
    <div class="champ">
      <span class="etiquette">Effets secondaires</span>
      <${PastillesMultiples} etiquette="Effets secondaires" options=${options(items, 'effetSecondaire', null)} valeurs=${fiche.effetsSecondaires}
        exclusifs=${exclusifs} surChoix=${(v) => ecrire({ effetsSecondaires: v })} />
    </div>
    <div class="champ ligne-champ">
      <span class="etiquette">Effet ressenti</span>
      <${Segmente} etiquette="Effet ressenti" options=${options(items, 'effetRessenti', fiche.effetRessenti)} valeur=${fiche.effetRessenti}
        surChoix=${(v) => ecrire({ effetRessenti: v })} />
    </div>
    <div class="champ"><${ChampTexte} key=${`no-${idRoute}`} id="tr-notes" etiquette="Notes" valeur=${fiche.notes} lignes=${2}
      cleBrouillon=${id ? `carnet:brouillon:${id}:notes` : null} surEnregistrer=${(v) => ecrire({ notes: v })} /></div>
    <${MemoVocal} parentStore="traitements" parentId=${id} assurerParent=${assurer} />
    ${id && (confirmer
      ? html`<div class="confirmation" role="alert"><p>Supprimer cette fiche ?</p>
          <div class="ligne"><button type="button" class="btn" onClick=${() => setConfirmer(false)}>Garder</button>
          <button type="button" class="btn btn-effacer" onClick=${() => supprimer('Fiche')}>Supprimer</button></div></div>`
      : html`<button type="button" class="btn-lien supprimer" onClick=${() => setConfirmer(true)}>Supprimer cette fiche</button>`)}
    <p class="pied discret">${PIED_TRAITEMENT}</p>
  </main>`;
}
