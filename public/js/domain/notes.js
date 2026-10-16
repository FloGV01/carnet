// Notes en vrac (v6) : idées à garder pour un rendez-vous. Pur : l'heure est passée en paramètre.
import { cleLocale, heureLocale, jourEvenement, formaterJourMois } from './dates.js';

// La plus récente d'abord : date puis heure calendaires, puis ordre d'écriture pour deux notes de la même minute.
export function trierNotes(notes) {
  const cle = (n) => `${n.date} ${n.heure || ''}`;
  return [...notes].sort((a, b) => cle(b).localeCompare(cle(a)) || (b.createdAt || '').localeCompare(a.createdAt || ''));
}

// La note à écrire pour ce texte, à cette heure : date et heure réelles, calendaires. Null s'il ne reste rien
// à garder (texte vide ou fait d'espaces).
export function nouvelleNote(maintenant, brut) {
  const texte = typeof brut === 'string' ? brut.trim() : '';
  return texte ? { date: cleLocale(maintenant), heure: heureLocale(maintenant), texte } : null;
}

// « 12/10 » : le jour logique de la note, donc la veille d'une note écrite avant 04:00.
export const dateNote = (note) => formaterJourMois(jourEvenement(note.date, note.heure));
