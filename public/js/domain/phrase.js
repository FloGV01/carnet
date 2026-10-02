// Phrase résumé d'une fiche, construite à partir des choix déjà faits (rien si rien n'est choisi).
// Renvoie des segments { texte, valeur, rubrique? } : l'interface met les valeurs en évidence.
// Les libellés de declencheur et dessous restent tels quels (ils ne se lissent jamais) ; ailleurs,
// l'initiale passe en minuscule au fil de la phrase, sauf pour un sigle (« TDAH » reste « TDAH »).
import { libelle } from './libelles.js';

const ESPACE_FINE = ' ';

function minusculeInitiale(texte) {
  if (texte.length > 1 && texte[1] === texte[1].toLowerCase() && texte[1] !== texte[1].toUpperCase()) {
    return texte[0].toLowerCase() + texte.slice(1);
  }
  return texte;
}
const majusculeInitiale = (texte) => texte.charAt(0).toUpperCase() + texte.slice(1);

// [champ, amorce, forme de la valeur]
const EPISODE = [
  ['declencheur', 'ça a démarré avec ', 'tel'],
  ['emotion', 'ça ressemblait à ', 'minuscule'],
  ['intensite', 'intensité ', 'nombre'],
  ['dessous', 'en dessous, ', 'tel'],
  ['reaction', `réaction${ESPACE_FINE}: `, 'minuscule'],
];
const SYMPTOME = [
  ['symptome', '', 'tel'],
  ['intensite', 'intensité ', 'nombre'],
  ['duree', '', 'minuscule'],
];

function phraseFiche(modele, fiche, carte) {
  const segments = [];
  for (const [champ, amorce, forme] of modele) {
    const v = fiche[champ];
    if (v == null) continue;
    const premier = segments.length === 0;
    let valeur = forme === 'nombre' ? String(v) : libelle(carte, v);
    if (forme === 'minuscule' && !(premier && !amorce)) valeur = minusculeInitiale(valeur);
    let lead = (premier ? '' : ', ') + amorce;
    if (premier) {
      if (lead) lead = majusculeInitiale(lead);
      else valeur = majusculeInitiale(valeur);
    }
    if (lead) segments.push({ texte: lead, valeur: false });
    segments.push({ texte: valeur, valeur: true });
  }
  if (segments.length) segments.push({ texte: '.', valeur: false });
  return segments;
}

const ouiNon = (v) => (v ? 'oui' : 'non');
// Journée : « Bureau · nuit moyen · humeur 6 · contact oui · … », chaque valeur à sa couleur
// (aussi les puces d'un jour dans l'Historique).
const JOUR = [
  ['lieu', 'lieu', (v, c) => libelle(c, v)],
  ['sommeilRessenti', 'sommeil', (v, c) => `nuit ${minusculeInitiale(libelle(c, v))}`],
  ['humeur', 'humeur', (v) => `humeur ${v}`],
  ['contactHumain', 'contact', (v) => `contact ${ouiNon(v)}`],
  ['sportMouvement', 'sport', (v) => `sport ${ouiNon(v)}`],
  ['explosions', 'expl', (v) => `explosions ${v}`],
  ['traitementPris', 'trt', (v, c) => `traitement ${minusculeInitiale(libelle(c, v))}`],
];

function phraseJour(entree, carte) {
  const segments = [];
  for (const [champ, rubrique, forme] of JOUR) {
    const v = entree[champ];
    if (v == null) continue;
    if (segments.length) segments.push({ texte: ' · ', valeur: false });
    segments.push({ texte: forme(v, carte), valeur: true, rubrique });
  }
  return segments;
}

export function phraseResume(type, fiche, carte) {
  if (!fiche) return [];
  if (type === 'episode') return phraseFiche(EPISODE, fiche, carte);
  if (type === 'symptome') return phraseFiche(SYMPTOME, fiche, carte);
  if (type === 'jour') return phraseJour(fiche, carte);
  return [];
}
