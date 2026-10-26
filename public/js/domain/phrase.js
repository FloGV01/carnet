// Phrase résumé d'une fiche, construite à partir des choix déjà faits (rien si rien n'est choisi).
// Renvoie des segments { texte, valeur, rubrique? } : l'interface met les valeurs en évidence.
// Les libellés de declencheur et dessous restent tels quels (ils ne se lissent jamais) ; ailleurs,
// l'initiale passe en minuscule au fil de la phrase, sauf pour un sigle (« TDAH » reste « TDAH »).
import { libelle } from './libelles.js';
import { valeurExplosions } from './explosions.js';
import { texteHeuresSommeil } from './champs.js';

const ESPACE_FINE = ' ';

export function minusculeInitiale(texte) {
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
// Humeur du jour (v6) : une décimale au plus (« 5,6 », mais « 6 »). Une valeur abîmée s'écrit telle quelle.
const uneDecimaleAuPlus = (v) => (Number.isFinite(v) ? v.toFixed(1).replace('.', ',').replace(/,0$/, '') : String(v));
// Journée : « Bureau · nuit moyen · humeur 5,6 · contact oui · … », chaque valeur à sa couleur
// (aussi les puces d'un jour dans l'Historique). `humeur` : l'humeur du jour quand l'appelant l'a
// posée (analyse/humeur-jour.js), sinon celle du soir. La nuit (v8) dit aussi ses heures, en un
// seul segment : « nuit moyen · 6 h », ou « nuit 6 h » sans la qualité.
const texteNuit = (entree, c) => {
  const morceaux = [entree.sommeilRessenti != null && minusculeInitiale(libelle(c, entree.sommeilRessenti)), texteHeuresSommeil(entree.heuresSommeil)].filter(Boolean);
  return morceaux.length ? `nuit ${morceaux.join(' · ')}` : null;
};
const JOUR = [
  ['lieu', 'lieu', (v, c) => libelle(c, v)],
  ['sommeilRessenti', 'sommeil', (v) => v],
  ['humeur', 'humeur', (v) => `humeur ${uneDecimaleAuPlus(v)}`],
  ['contactHumain', 'contact', (v) => `contact ${ouiNon(v)}`],
  ['sportMouvement', 'sport', (v) => `sport ${ouiNon(v)}`],
  ['explosions', 'expl', (v) => `explosions ${v}`],
  ['traitementPris', 'trt', (v, c) => `traitement ${minusculeInitiale(libelle(c, v))}`],
];

// nExplosions : épisodes « Explosion » du jour (v4). Règle d'affichage de domain/explosions.js,
// jamais enregistrée : le compteur s'il est noté (au moins le nombre d'épisodes), sinon les épisodes.
// emotions (v7, facultatif) : les émotions du moment du jour (releves.js, resumeEmotions), placées après l'humeur, en un
// segment « irrité, calme » de rubrique « emotions » qui porte ses familles (l'interface en fait des points de couleur).
function phraseJour(entree, carte, nExplosions, emotions) {
  const segments = [];
  const ajouter = (segment) => {
    if (segments.length) segments.push({ texte: ' · ', valeur: false });
    segments.push(segment);
  };
  for (const [champ, rubrique, forme] of JOUR) {
    let v = entree[champ];
    if (champ === 'explosions') v = valeurExplosions(entree.explosions ?? null, nExplosions);
    if (champ === 'sommeilRessenti') v = texteNuit(entree, carte);
    if (v != null) ajouter({ texte: forme(v, carte), valeur: true, rubrique });
    if (champ === 'humeur' && emotions && emotions.mots.length) {
      ajouter({ texte: `${emotions.mots.join(', ')}${emotions.plus ? '…' : ''}`, valeur: true, rubrique: 'emotions', familles: emotions.familles });
    }
  }
  return segments;
}

export function phraseResume(type, fiche, carte, { nExplosions = 0, emotions = null } = {}) {
  if (!fiche) return [];
  if (type === 'episode') return phraseFiche(EPISODE, fiche, carte);
  if (type === 'symptome') return phraseFiche(SYMPTOME, fiche, carte);
  if (type === 'jour') return phraseJour(fiche, carte, nExplosions, emotions);
  return [];
}
