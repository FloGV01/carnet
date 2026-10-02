// Fiche traitement : changement, effets secondaires (« Aucun » exclusif), effet ressenti.
// L'app n'interprète rien : ce journal sert à préparer les échanges avec le psychiatre.
import { html, useEffect, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { Segmente } from '../composants/segmente.js';
import { PastillesMultiples } from '../composants/multiples.js';
import { ChampTexte } from '../composants/texte.js';
import { MemoVocal } from '../composants/memo-vocal.js';
import { Confirmation } from '../composants/confirmation.js';
import { Rubrique, LibelleChamp } from '../composants/rubrique.js';
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
  const retour = () => { location.hash = '#/soins'; };
  if (!fiche || !items) return html`<main class="ecran fiche"><${Entete} titre="Traitement" retour=${retour} /></main>`;
  const exclusifs = new Set(items.filter((i) => i.exclusif).map((i) => i.id));
  return html`<main class="ecran fiche">
    <${Entete} titre="Traitement" retour=${retour}
      droite=${html`<span class="indicateur-fiche" role="status">${indicateur === 'ok' ? 'Enregistré' : ''}</span>`} />
    <div class="ligne-champ-fiche">
      <${LibelleChamp} icone="soins" pour="tr-date">Date</${LibelleChamp}>
      <input id="tr-date" type="date" class="champ-ligne champ-date-seule" value=${fiche.date} max=${aujourdhui}
        onChange=${(e) => { const v = e.target.value; if (v && v <= aujourdhui) ecrire({ date: v }); }} />
    </div>
    <div class="champ-fiche">
      <${ChampTexte} key=${`ch-${idRoute}`} id="tr-changement" etiquette="Changement / ajustement" facultatif=${true} icone="traitement" valeur=${fiche.changement} lignes=${2}
        cleBrouillon=${id ? `carnet:brouillon:${id}:changement` : null} surEnregistrer=${(v) => ecrire({ changement: v })} /></div>
    <div class="champ-fiche">
      <${LibelleChamp} icone="effets">Effets secondaires</${LibelleChamp}>
      <${PastillesMultiples} etiquette="Effets secondaires" options=${options(items, 'effetSecondaire', null)} valeurs=${fiche.effetsSecondaires}
        exclusifs=${exclusifs} surChoix=${(v) => ecrire({ effetsSecondaires: v })} />
    </div>
    <div class="champ-fiche">
      <${Rubrique} teinte="humeur" icone="humeur" libelle="Effet ressenti" />
      <${Segmente} etiquette="Effet ressenti" options=${options(items, 'effetRessenti', fiche.effetRessenti)} valeur=${fiche.effetRessenti}
        surChoix=${(v) => ecrire({ effetRessenti: v })} classe="large" />
    </div>
    <div class="champ-fiche"><${ChampTexte} key=${`no-${idRoute}`} id="tr-notes" etiquette="Notes" icone="note" valeur=${fiche.notes} lignes=${2}
      cleBrouillon=${id ? `carnet:brouillon:${id}:notes` : null} surEnregistrer=${(v) => ecrire({ notes: v })} /></div>
    <${MemoVocal} parentStore="traitements" parentId=${id} assurerParent=${assurer} />
    ${id && html`<button type="button" class="lien-discret supprimer" onClick=${() => setConfirmer(true)}>Supprimer cette fiche</button>`}
    ${confirmer && html`<${Confirmation} titre="Supprimer cette fiche ?" texte="Ses mémos vocaux sont supprimés aussi." action="Supprimer"
      surAnnuler=${() => setConfirmer(false)} surConfirmer=${() => { setConfirmer(false); supprimer('Fiche'); }} />`}
    <p class="pied-fiche">${PIED_TRAITEMENT}</p>
  </main>`;
}
