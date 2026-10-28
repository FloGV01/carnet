// Un relevé du moment en mots (v7), pour « Ma journée » et l'écran Émotion du moment. Pur.
// v9 (spec §4.6 et §13.4) : la couleur d'un relevé est celle de la zone de son mot (domain/carte-roue.js) ; `perso`, la
// méta `motsPerso`, fait connaître les mots à soi (sans elle, un mot à soi n'a ni libellé ni zone).
import { libelle } from './libelles.js';
import { libelleEmotion } from './roue.js';
import { ZONES, NOMS_ZONES, zoneDe } from './carte-roue.js';
import { minusculeInitiale } from './phrase.js';

// Libellés d'une liste en minuscules, séparés par des virgules : « travail, trajet ».
const enMinuscules = (ids, carte) => (ids || []).map((id) => minusculeInitiale(libelle(carte, id))).join(', ');

// « Irrité · énergie moyenne » ; une famille seule, « Colère » ; un ancien relevé garde sa note, « humeur 6 · énergie
// basse ». Sans émotion, note ni énergie : « ce que je faisais : travail, trajet ». Un relevé vide : '' (pas de ligne).
export function texteReleve(h, carte, perso) {
  const texte = [libelleEmotion(h.emotion, perso), h.humeur != null && `humeur ${h.humeur}`,
    h.energie && `énergie ${minusculeInitiale(libelle(carte, h.energie))}`].filter(Boolean).join(' · ');
  if (texte) return texte;
  const faisais = enMinuscules(h.faisais, carte);
  return faisais ? `ce que je faisais : ${faisais}` : '';
}

const ordreHeure = (a, b) => `${a.date} ${a.heure || ''}`.localeCompare(`${b.date} ${b.heure || ''}`);

// La ligne d'un jour dans l'Historique (v7) : les émotions notées (le mot, ou la famille seule), chacune une fois, dans
// l'ordre de la journée, `max` au plus, en minuscules ; `plus` est vrai s'il y en a d'autres (« … ») ; et les zones du
// jour (zonesDuJour, v9 ; les familles jusqu'à la v8). Un jour sans émotion : aucun mot.
export function resumeEmotions(releves, max = 2, perso) {
  const mots = [];
  for (const h of [...(releves || [])].filter(Boolean).sort(ordreHeure)) {
    const t = libelleEmotion(h.emotion, perso);
    if (t && !mots.includes(t)) mots.push(t);
  }
  return { mots: mots.slice(0, max).map(minusculeInitiale), plus: mots.length > max, zones: zonesDuJour(releves, perso) };
}

// Les zones des mots notés dans ces relevés (v9, spec §13.4) : chacune une fois, dans l'ordre fixe rouge, jaune, bleu,
// vert, et non dans celui de la journée (un point par zone présente, sans doublon) : [{ cle, libelle }]. Un relevé sans
// zone (ancienne note, énergie seule, famille seule de la v7, mot à soi inconnu) n'en donne pas.
export function zonesDuJour(releves, perso) {
  const vues = new Set((releves || []).map((h) => h && zoneDe(h.emotion, perso)).filter(Boolean));
  return ZONES.filter((z) => vues.has(z)).map((cle) => ({ cle, libelle: NOMS_ZONES[cle] }));
}
