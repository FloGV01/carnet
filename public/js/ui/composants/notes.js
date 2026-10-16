// Notes en vrac : des idées à garder pour un rendez-vous. Un champ toujours prêt (Retour ajoute la note), puis
// la liste, la plus récente en haut. Chaque note se modifie sur place, enregistrée 500 ms après la frappe.
// Effacer le texte ne supprime rien pendant la frappe : la note vide est supprimée quand on quitte le champ.
import { html, useEffect, useRef, useState } from '../lib.js';
import { Icones } from '../icones.js';
import { BoutonDicter, AIDE_DICTER } from './dicter.js';
import { ChampTexte } from './texte.js';
import { Repli } from './repli.js';
import { afficherToast } from './toast.js';
import { repo } from '../../donnees.js';
import { useDonnees, ecrireAvecEssais, lireLocal, ecrireLocal } from '../hooks.js';
import { nouvelId } from '../../domain/ids.js';
import { trierNotes, nouvelleNote, dateNote } from '../../domain/notes.js';

const BROUILLON_NOUVELLE = 'carnet:brouillon:notes:nouvelle';
const SANS_NOTE = 'Aucune note pour l\'instant.';
const rien = () => {};

// Supprime la note et propose de la rendre. Sans effet (et sans message) si elle n'existe déjà plus.
async function retirer(id) {
  ecrireLocal(`carnet:brouillon:${id}:texte`, null);
  const sauve = await repo.notes.supprimer(id);
  if (sauve.entree) afficherToast('Note supprimée', { libelle: 'Annuler', faire: () => repo.notes.restaurer(sauve) });
}

// Le champ du haut : Retour ajoute la note et vide le champ, qui reste prêt pour la suivante. Retour sur un
// champ vide, ou fait d'espaces, ne fait rien. Le texte tapé et pas encore ajouté est gardé (brouillon).
function AjoutNote() {
  const zone = useRef(null);
  const enCours = useRef(false);
  const [aide, setAide] = useState(false);
  useEffect(() => {
    const brouillon = lireLocal(BROUILLON_NOUVELLE);
    if (zone.current && typeof brouillon === 'string') zone.current.value = brouillon;
  }, []);
  const ajouter = async () => {
    const z = zone.current;
    const note = nouvelleNote(repo.maintenant(), z.value);
    if (!note) return;
    z.value = '';
    ecrireLocal(BROUILLON_NOUVELLE, null);
    // L'id est tiré une seule fois par note : un nouvel essai réécrit la même note, sans doublon.
    const id = nouvelId('no');
    try {
      await ecrireAvecEssais(() => repo.notes.creer(note, { id }), rien);
    } catch {
      // Écriture impossible : le texte revient dans le champ, rien n'est perdu.
      if (!z.value) { z.value = note.texte; ecrireLocal(BROUILLON_NOUVELLE, note.texte); }
    }
  };
  return html`<div class="champ-zone">
    <div class="champ-avec-dicter ajout-question">
      <input ref=${zone} class="champ-texte champ-une-ligne" enterkeyhint="done" aria-label="Une idée, en vrac" placeholder="Une idée, en vrac…"
        onInput=${(e) => { setAide(false); ecrireLocal(BROUILLON_NOUVELLE, e.target.value || null); }}
        onCompositionStart=${() => { enCours.current = true; }} onCompositionEnd=${() => { enCours.current = false; }}
        onKeyDown=${(e) => { if (e.key === 'Enter' && !e.isComposing && !enCours.current) { e.preventDefault(); ajouter(); } }} />
      <${BoutonDicter} cible=${zone} surActive=${() => setAide(true)} />
    </div>
    ${aide && html`<p class="aide-dicter discret" role="status">${AIDE_DICTER}</p>`}
  </div>`;
}

// Une note : la date du jour logique, le texte entier (zone de deux lignes qui s'agrandit avec lui jusqu'à sept), ✕.
function LigneNote({ note }) {
  const date = dateNote(note);
  const vide = useRef(false);
  const retiree = useRef(false);
  // Une seule suppression à la fois par note : en sortant du champ, en changeant d'écran, ou par ✕. Si elle
  // échoue, la note reste affichée et ✕ (ou la sortie du champ) la supprime au toucher suivant.
  const supprimer = async () => {
    if (retiree.current) return;
    retiree.current = true;
    try { await retirer(note.id); } catch { retiree.current = false; }
  };
  const supprimerSiVide = () => { if (vide.current) supprimer(); };
  useEffect(() => supprimerSiVide, []);
  const enregistrer = async (texte) => {
    // Texte effacé : on attend la sortie du champ pour supprimer la note.
    if (texte == null) return;
    await ecrireAvecEssais(() => repo.notes.modifier(note.id, { texte }), rien);
  };
  return html`<li class="ligne-note">
    <span class="note-date">${date}</span>
    <div class="note-corps" onInput=${(e) => { vide.current = e.target.value.trim() === ''; }} onFocusOut=${supprimerSiVide}>
      <${ChampTexte} id=${`note-${note.id}`} ariaLabel=${`Note du ${date}`} valeur=${note.texte} lignes=${2} dicter=${false}
        cleBrouillon=${`carnet:brouillon:${note.id}:texte`} surEnregistrer=${enregistrer} />
    </div>
    <button type="button" class="effacer" aria-label=${`Supprimer la note du ${date}`} onClick=${supprimer}>${Icones.fermer()}</button>
  </li>`;
}

// L'onglet Notes de Soins.
export function NotesEnVrac() {
  const { donnees } = useDonnees(() => repo.notes.tous(), []);
  const notes = donnees ? trierNotes(donnees) : null;
  return html`<div class="notes-en-vrac">
    <${AjoutNote} />
    ${notes && notes.length === 0 && html`<p class="vide">${SANS_NOTE}</p>`}
    ${notes && notes.length > 0 && html`<ul class="liste carte carte-groupe" aria-label="Notes">
      ${notes.map((n) => html`<${LigneNote} key=${n.id} note=${n} />`)}</ul>`}
  </div>`;
}

// En consultation : « Mes notes », à lire telles qu'écrites. On ne les modifie pas ici.
export function ReplisNotes() {
  const { donnees } = useDonnees(() => repo.notes.tous(), []);
  const notes = donnees ? trierNotes(donnees) : [];
  return html`<${Repli} cle="mes-notes" titre="Mes notes">
    ${donnees && notes.length === 0 && html`<p class="discret">${SANS_NOTE}</p>`}
    ${notes.length > 0 && html`<ul class="notes-lecture" aria-label="Notes">
      ${notes.map((n) => html`<li><span class="note-date">${dateNote(n)}</span><span class="note-texte">${n.texte}</span></li>`)}</ul>`}
  </${Repli}>`;
}
