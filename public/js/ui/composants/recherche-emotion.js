// La loupe de l'émotion du moment (v9, spec §4.4) : plein écran noir, ← en verre et le champ à sa droite, actif tout de
// suite, puis les mots de la carte qui contiennent le texte, dans leur nom ou dans leur définition, sans accents ni casse
// (domain/mots-perso.js, chercher). Chaque mot est à la couleur de sa zone, avec le début de sa définition ; le toucher
// fait comme sur la carte (`surMot`). En bas des résultats, ou seul sans résultat : « Ajouter mon mot « … » »
// (`surAjouter`), sauf si un mot de la carte porte déjà ce nom (nomPropose). Le texte cherché reste d'une ouverture à
// l'autre du même relevé (l'écran le garde). Pendant la garde (`enGarde`), la liste ignore les touchers.
import { html, useLayoutEffect, useRef } from '../lib.js';

// Les icônes au trait fin des boutons en verre (visuel §1.2) : la loupe, 21 × 21,5 ; le « + » d'« Ajouter mon mot ».
export const LOUPE = html`<svg width="21" height="21" viewBox="0 0 21 21" fill="none" stroke="currentColor" stroke-width="1.6"
  stroke-linecap="round" aria-hidden="true"><circle cx="8.8" cy="8.8" r="6.8" /><path d="M13.7 13.7l5.3 5.3" /></svg>`;
const PLUS = html`<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"
  stroke-linecap="round" aria-hidden="true"><path d="M10 3.5v13M3.5 10h13" /></svg>`;

// iOS n'ouvre le clavier que pour un champ qui prend le focus pendant le toucher lui-même : la loupe, peinte juste après,
// viendrait trop tard. Un champ d'amorce, invisible, le prend donc tout de suite (à appeler dans le toucher sur la loupe) ;
// le champ de la loupe le reprend, clavier ouvert, et l'amorce s'en va.
export function amorcerClavier() {
  const amorce = document.createElement('input');
  amorce.className = 'amorce-clavier';
  amorce.setAttribute('aria-hidden', 'true');
  amorce.tabIndex = -1;
  document.body.appendChild(amorce);
  amorce.focus({ preventScroll: true });
  setTimeout(() => amorce.remove(), 1000);
}

// resultats : [{ id, libelle, zone, extrait }] ; propose : le nom à ajouter, ou null.
export function RechercheEmotion({ texte, resultats, propose, enGarde = false, etiquetteRetour, retour, surTexte, surMot, surAjouter, surRetour }) {
  const champ = useRef(null);
  useLayoutEffect(() => {
    if (champ.current) champ.current.focus({ preventScroll: true });
    document.querySelectorAll('.amorce-clavier').forEach((a) => a.remove());
  }, []);
  const garde = (action) => () => { if (!enGarde) action(); };
  const cherche = texte.trim() !== '';
  return html`<div class="ecran-loupe" key="loupe">
    <button type="button" class="verre gauche" aria-label=${etiquetteRetour} aria-disabled=${enGarde ? 'true' : null} onClick=${garde(surRetour)}>${retour}</button>
    <label class="champ-loupe">${LOUPE}
      <input ref=${champ} type="search" defaultValue=${texte} placeholder="Chercher un mot" aria-label="Chercher un mot" enterkeyhint="search"
        autocomplete="off" autocorrect="off" spellcheck=${false} onInput=${(e) => surTexte(e.target.value)}
        onKeyDown=${(e) => { if (e.key === 'Enter') e.target.blur(); }} />
    </label>
    <div class="corps-loupe" aria-disabled=${enGarde ? 'true' : null}>
      ${resultats.length > 0 && html`<ul class="resultats-loupe" role="list" aria-label="Mots trouvés">
        ${resultats.map((r) => html`<li key=${r.id}>
          <button type="button" class=${`resultat-loupe zone-${r.zone}`} onClick=${garde(() => surMot(r.id))}>
            <span class="mot-resultat">${r.libelle}</span>${r.extrait && html`${' '}<span class="extrait-resultat">${r.extrait}</span>`}
          </button>
        </li>`)}
      </ul>`}
      <p class="sans-resultat" role="status">${cherche && resultats.length === 0 ? 'Aucun mot de la carte ne contient ce texte.' : ''}</p>
      ${propose && html`<button type="button" class="ajouter-mot" onClick=${garde(() => surAjouter(propose))}>
        <span class="rond-ajouter" aria-hidden="true">${PLUS}</span><span>Ajouter mon mot « ${propose} »</span>
      </button>`}
    </div>
  </div>`;
}
