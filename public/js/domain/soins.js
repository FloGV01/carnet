// Statut des rendez-vous (jamais stocké) : date antérieure au jour logique = passé ;
// date future, du jour ou absente = à venir.
import { addDays, jourEvenement, formaterJourCourt, formaterJourMois, formaterHeure } from './dates.js';
import { libelle } from './libelles.js';

export function statutRdv(rdv, aujourdhui) {
  return rdv.date && rdv.date < aujourdhui ? 'passe' : 'a-venir';
}

export function trierRdv(liste, aujourdhui) {
  const aVenir = liste.filter((r) => statutRdv(r, aujourdhui) === 'a-venir')
    .sort((a, b) => (a.date ? 0 : 1) - (b.date ? 0 : 1) || `${a.date || ''} ${a.heure || ''}`.localeCompare(`${b.date || ''} ${b.heure || ''}`));
  const passes = liste.filter((r) => statutRdv(r, aujourdhui) === 'passe')
    .sort((a, b) => `${b.date} ${b.heure || ''}`.localeCompare(`${a.date} ${a.heure || ''}`));
  return { aVenir, passes };
}

// Prochain rendez-vous daté dans l'horizon (14 jours par défaut), pour la ligne d'Aujourd'hui.
export function prochainRdv(liste, aujourdhui, horizon = 14) {
  const limite = addDays(aujourdhui, horizon);
  return trierRdv(liste, aujourdhui).aVenir.find((r) => r.date && r.date <= limite) || null;
}

// Rendez-vous de référence (v6, « La dernière fois » et vue soignants) : le dernier du même soignant, autre que
// `exclure`, daté strictement avant `avant` ; le même jour, l'heure départage. Sans soignant : tous (vue soignants).
export function rdvReference(rdvs, { professionnel = null, avant, exclure = null }) {
  let ref = null;
  for (const r of rdvs) {
    if (!r.date || r.date >= avant || r.id === exclure || (professionnel && r.professionnel !== professionnel)) continue;
    if (!ref || `${r.date} ${r.heure || ''}` > `${ref.date} ${ref.heure || ''}`) ref = r;
  }
  return ref;
}

// « La dernière fois » d'un rendez-vous : sa référence, et les questions qui n'y ont pas été abordées. C'est
// toujours un rendez-vous passé : compté depuis la date du rendez-vous s'il est passé, sinon (à venir ou
// « Date à fixer ») depuis aujourd'hui. null sans soignant ou s'il n'y a rien à montrer.
export function derniereFois(rdv, rdvs, aujourdhui) {
  if (!rdv || !rdv.professionnel) return null;
  const avant = rdv.date && rdv.date < aujourdhui ? rdv.date : aujourdhui;
  const ref = rdvReference(rdvs, { professionnel: rdv.professionnel, avant, exclure: rdv.id });
  if (!ref) return null;
  const questions = (ref.questions || []).filter((q) => !q.abordee);
  if (!ref.compteRendu && !ref.prochaineEtape && questions.length === 0) return null;
  return { rdv: ref, questions };
}

// Une question est déjà posée si une autre a le même texte.
export const dejaPosee = (questions, texte) => (questions || []).some((q) => q.texte.trim() === texte.trim());

// « Reprendre » : les questions du rendez-vous cible, avec la question copiée une fois (lien compris, à aborder).
// Rien ne change si le même texte y est déjà. Le rendez-vous d'origine n'est pas touché.
export function reprendreQuestion(rdvCible, question) {
  const questions = rdvCible.questions || [];
  if (dejaPosee(questions, question.texte)) return questions;
  return [...questions, { texte: question.texte, abordee: false, ...(question.lien ? { lien: { ...question.lien } } : {}) }];
}

const couper = (t, n) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
const avecIntensite = (nom, intensite) => [nom, intensite != null && `${intensite}/10`].filter(Boolean).join(' ');

// « En parler au rendez-vous » (v6) : la question déjà écrite, faite des choix seulement, jamais de la situation
// ni des notes (elle part sur la page A4). Le changement d'un traitement, déjà imprimé sur l'A4, est coupé à 60.
export function questionPreecrite(element, { store, carte }) {
  const lib = (id) => libelle(carte, id);
  let morceaux = [];
  if (store === 'episodes') {
    const jour = formaterJourCourt(jourEvenement(element.date, element.heure), { zero: false });
    morceaux = [`Épisode du ${jour}${element.heure ? `, ${formaterHeure(element.heure)}` : ''}`,
      avecIntensite(lib(element.emotion), element.intensite), lib(element.reaction)];
  } else if (store === 'symptomes') {
    morceaux = [`Symptôme du ${formaterJourCourt(element.date, { zero: false })}`,
      avecIntensite(lib(element.symptome), element.intensite), lib(element.duree)];
  } else if (store === 'traitements') {
    const changement = element.changement && element.changement.replace(/\s+/g, ' ').trim();
    morceaux = [`Traitement du ${formaterJourMois(element.date, { zero: false })}`, changement && couper(changement, 60),
      lib(element.effetRessenti), (element.effetsSecondaires || []).map(lib).join(', ')];
  }
  return morceaux.filter(Boolean).join(' · ');
}
