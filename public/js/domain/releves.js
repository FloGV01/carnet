// Un relevé du moment en mots (v7), pour « Ma journée » et l'écran Émotion du moment. Pur.
import { libelle } from './libelles.js';
import { FAMILLES, familleDe, libelleEmotion } from './roue.js';
import { minusculeInitiale } from './phrase.js';

// Libellés d'une liste en minuscules, séparés par des virgules : « travail, trajet ».
const enMinuscules = (ids, carte) => (ids || []).map((id) => minusculeInitiale(libelle(carte, id))).join(', ');

// « Irrité · énergie moyenne » ; une famille seule, « Colère » ; un ancien relevé garde sa note, « humeur 6 · énergie
// basse ». Sans émotion, note ni énergie : « ce que je faisais : travail, trajet ». Un relevé vide : '' (pas de ligne).
export function texteReleve(h, carte) {
  const texte = [libelleEmotion(h.emotion), h.humeur != null && `humeur ${h.humeur}`,
    h.energie && `énergie ${minusculeInitiale(libelle(carte, h.energie))}`].filter(Boolean).join(' · ');
  if (texte) return texte;
  const faisais = enMinuscules(h.faisais, carte);
  return faisais ? `ce que je faisais : ${faisais}` : '';
}

// Les familles de la roue notées dans ces relevés, chacune une fois, dans l'ordre de la journée (date puis heure, comme
// repo.parJour) : [{ cle, libelle }]. Un relevé sans émotion (ancienne note, énergie seule) n'en donne pas.
export function famillesDuJour(releves) {
  const vues = new Set();
  for (const h of [...(releves || [])].sort((a, b) => `${a.date} ${a.heure || ''}`.localeCompare(`${b.date} ${b.heure || ''}`))) {
    const f = familleDe(h && h.emotion);
    if (f) vues.add(f);
  }
  return [...vues].map((cle) => ({ cle, libelle: FAMILLES.find((f) => f.cle === cle).libelle }));
}
