// Réglages › Listes : ajouter, renommer, réordonner (↑ ↓), archiver, restaurer.
// Rien n'est jamais supprimé : un élément archivé reste lisible dans l'historique.
import { html, useRef, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { repo } from '../../donnees.js';
import { useDonnees } from '../hooks.js';
import { LISTES, NOMS_LISTES } from '../../domain/listes-def.js';
import { afficherToast } from '../composants/toast.js';

const MESSAGES = { LIBELLE_EXISTANT: 'Ce libellé existe déjà dans la liste.', SENS_FIXE: 'Cette liste se renomme seulement.' };
const message = (e) => MESSAGES[e && e.code] || "Le changement n'a pas pu être enregistré.";

export function IndexListes() {
  return html`<main class="ecran">
    <${Entete} titre="Listes" retour=${() => { location.hash = '#/reglages'; }} />
    <ul class="liste carte">${NOMS_LISTES.map((nom) => html`<li><a class="ligne lien-ligne" href=${`#/reglages/listes/${nom}`}>
      <span>${LISTES[nom].libelle}</span><span class="discret">${LISTES[nom].sensFixe ? 'renommer seulement ' : ''}›</span></a></li>`)}</ul>
  </main>`;
}

function Element({ it, premier, dernier, sensFixe, surMonter, surDescendre }) {
  const [edition, setEdition] = useState(false);
  const zone = useRef(null);
  const valider = async () => {
    const v = zone.current && zone.current.value.trim();
    setEdition(false);
    if (!v || v === it.libelle) return;
    try { await repo.listes.renommer(it.id, v); } catch (e) { afficherToast(message(e), null, 3500); }
  };
  return html`<li class="element-liste">
    ${edition
      ? html`<input ref=${zone} class="champ-ligne" defaultValue=${it.libelle} aria-label=${`Nouveau libellé pour ${it.libelle}`} enterkeyhint="done"
          onKeyDown=${(e) => { if (e.key === 'Enter') valider(); if (e.key === 'Escape') setEdition(false); }} onBlur=${valider} />`
      : html`<button type="button" class="libelle-element" aria-label=${`Renommer ${it.libelle}`} onClick=${() => { setEdition(true); setTimeout(() => zone.current && zone.current.focus(), 0); }}>${it.libelle}</button>`}
    ${!sensFixe && !it.archive && html`<div class="ordre">
      <button type="button" class="fleche" aria-label=${`Monter ${it.libelle}`} disabled=${premier} onClick=${surMonter}>↑</button>
      <button type="button" class="fleche" aria-label=${`Descendre ${it.libelle}`} disabled=${dernier} onClick=${surDescendre}>↓</button>
    </div>`}
    ${!sensFixe && html`<button type="button" class="btn-lien" onClick=${() => (it.archive ? repo.listes.restaurer(it.id) : repo.listes.archiver(it.id))}>${it.archive ? 'Restaurer' : 'Archiver'}</button>`}
  </li>`;
}

export function EcranListe({ liste }) {
  const def = LISTES[liste];
  const nouveau = useRef(null);
  const { donnees: items } = useDonnees(() => repo.listes.items(liste), [liste]);
  if (!def) { location.hash = '#/reglages/listes'; return null; }
  if (!items) return html`<main class="ecran"><${Entete} titre=${def.libelle} /></main>`;
  const actifs = items.filter((i) => !i.archive);
  const archives = items.filter((i) => i.archive);
  const deplacer = (i, sens) => {
    const ids = actifs.map((x) => x.id);
    const j = i + sens;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    repo.listes.reordonner(liste, ids);
  };
  const ajouter = async () => {
    const v = nouveau.current && nouveau.current.value.trim();
    if (!v) return;
    try { await repo.listes.creer(liste, v); nouveau.current.value = ''; } catch (e) { afficherToast(message(e), null, 3500); }
  };
  return html`<main class="ecran listes">
    <${Entete} titre=${def.libelle} retour=${() => { location.hash = '#/reglages/listes'; }} />
    ${def.sensFixe && html`<p class="discret">Ces choix gardent leur sens dans l'analyse : on peut les renommer, mais pas en ajouter ni en retirer.</p>`}
    <ul class="liste carte section">${actifs.map((it, i) => html`<${Element} key=${it.id} it=${it} premier=${i === 0} dernier=${i === actifs.length - 1}
      sensFixe=${def.sensFixe} surMonter=${() => deplacer(i, -1)} surDescendre=${() => deplacer(i, 1)} />`)}</ul>
    ${!def.sensFixe && html`<div class="ajout-element section">
      <input ref=${nouveau} class="champ-ligne" aria-label="Nouvel élément" placeholder="Nouvel élément" enterkeyhint="done"
        onKeyDown=${(e) => { if (e.key === 'Enter') ajouter(); }} />
      <button type="button" class="btn" onClick=${ajouter}>Ajouter</button>
    </div>`}
    ${archives.length > 0 && html`<section class="section"><h2>Archivés</h2>
      <p class="discret">Ils ne sont plus proposés, mais restent lisibles dans l'historique.</p>
      <ul class="liste carte">${archives.map((it) => html`<${Element} key=${it.id} it=${it} sensFixe=${false} />`)}</ul></section>`}
  </main>`;
}
