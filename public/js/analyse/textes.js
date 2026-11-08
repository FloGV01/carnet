// Toutes les phrases de l'analyse, en trois voix : « tu » (app), « je » (export PSY),
// « neutre » (vue soignants). Factuelles, jamais causales, jamais évaluatives.
// v7 : les phrases calculées sur la note de 1 à 10 (bonnes journées, sommeil et humeur, tendances) sont retirées.
import { SEUILS } from './seuils.js';
import { texteHeuresSommeil } from '../domain/champs.js';

export const PAS_ASSEZ = 'Pas encore assez de données pour le dire.';
const E = SEUILS.emotions;
const M = SEUILS.moments;
// Le nombre de relevés d'une vue d'émotions, tiré du seuil (jamais recopié).
const AU_MOINS_EMOTIONS = `au moins ${E.minReleves} émotions du moment`;
// v9 · Tes zones (spec §8) : la zone d'un relevé vient de son mot.
export const NOTE_ZONES = "Seuls comptent les relevés qui ont un mot : une famille seule ou une ancienne note de 1 à 10 n'a pas de zone.";
export const REGLES = {
  // v9 · Tes zones : les bulles, sur la période ; la barre par semaine, sur les 12 dernières semaines.
  zones: `La règle : ${AU_MOINS_EMOTIONS} notées avec un mot sur la période. ${NOTE_ZONES}`,
  zonesSemaines: `La règle : ${AU_MOINS_EMOTIONS} notées avec un mot sur les ${E.zonesSemaines} dernières semaines. ${NOTE_ZONES}`,
  classement: 'La règle : au moins 3 éléments notés, et 2 fois le même en tête.',
  explosions: 'La règle : au moins 3 explosions sur la période (épisodes dont la réaction est « Explosion »). Une liste montre ce qui y est noté au moins 2 fois.',
  // Ta journée a deux rangées, chacune avec son seuil : la règle les dit toutes les deux (moments.js pour l'énergie).
  emotionsJournee: `La règle : ${AU_MOINS_EMOTIONS} notées sur la période, ou, pour l'énergie, un créneau de ${M.largeurCreneau} h où elle est notée au moins ${M.minJours} jours différents. Seuls comptent les relevés notés à leur heure (sans « C'était vers… »).`,
};
// v6 · Comprendre (spec §2.1) : sous son seuil, chaque graphique donne sa règle fixe, sans aucun décompte. Les
// nombres viennent de SEUILS.comprendre, jamais recopiés ; aucun libellé de liste modifiable n'y paraît.
const C = SEUILS.comprendre;
const REGLE_EXPLOSIONS = `La règle : au moins ${C.minEvenements} jours avec une explosion sur la période.`;
const regleColonnes = (quoi) => `La règle : au moins ${C.minColonnes} ${quoi} qui ont chacun au moins ${C.minValeurs} valeurs pour la mesure choisie.`;
export const REGLES_COMPRENDRE = {
  explosionsAvant: REGLE_EXPLOSIONS,
  explosionsApres: REGLE_EXPLOSIONS,
  energieAvant: `La règle : au moins ${C.minEvenements} jours à énergie basse sur la période.`,
  retoursBureau: `La règle : au moins ${C.minEvenements} retours au bureau sur la période (une journée au bureau dont la veille a un autre lieu noté).`,
  semaine: regleColonnes('jours de la semaine'),
  lieu: regleColonnes('lieux'),
  mois: regleColonnes('mois'),
  activites: `La règle : une activité de « Ce que je faisais » apparaît à partir de ${C.minActivite} relevés avec une énergie.`,
  // v8 · Mes nuits (Q15) : une barre dès qu'une nuit a sa durée.
  mesNuits: `La règle : au moins une nuit notée avec sa durée sur les ${C.nuitsSemaines} dernières semaines.`,
  peseRecharge: 'La règle : au moins un élément de « Ce qui a pesé » ou de « Ce qui a rechargé », noté sur la période.',
  // v7 · émotions du moment
  emotions: `La règle : ${AU_MOINS_EMOTIONS} notées sur la période.`,
  emotionsLieu: `La règle : ${AU_MOINS_EMOTIONS} notées sur la période, des jours où le lieu est noté.`,
  apresNuit: `La règle : ${AU_MOINS_EMOTIONS} notées sur la période, des jours où la nuit est notée.`,
  autourExplosions: `La règle : ${AU_MOINS_EMOTIONS} notées dans les ${E.heuresAutour} heures avant ou après une explosion dont l'heure est notée, sur la période.`,
  autourBienEtre: `La règle : ${AU_MOINS_EMOTIONS} notées dans les ${E.heuresAutour} heures avant ou après une séance lancée depuis Bien-être ou « Pour ce moment : », sur la période.`,
  // v8 · Q18
  emotionsActivites: `La règle : ${AU_MOINS_EMOTIONS} notées sur la période, avec « Ce que je faisais ».`,
};
export const PIED_EXPLOSIONS = 'Ce sont tes notes, rassemblées : pas des causes.';

// Moyenne affichée avec sa décimale, même ronde (« 6,0 ») : tuiles, Ma semaine, consultation.
export function uneDecimale(x) {
  if (x == null || Number.isNaN(x)) return '·';
  return x.toFixed(1).replace('.', ',');
}
export function nombre(x, decimales = 1) {
  if (x == null || Number.isNaN(x)) return '·';
  return x.toFixed(decimales).replace('.', ',').replace(/,0$/, '');
}
// Une valeur 5 vaut « 5 ou plus » : la moyenne n'est alors qu'une borne basse.
export const moyenneReveils = (r) => (r && r.n ? `${r.plafonne ? 'au moins ' : ''}${nombre(r.moyenne)}` : '·');

export function duree(min) {
  if (min == null) return '·';
  const m = Math.round(min);
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
}

// La durée d'une nuit (v8, Mes nuits) : « 4 h ou moins », « 6 h », « 7 h 30 » (v11), « 10 h ou plus » pour les heures
// notées le soir ; « 7 h 40 » pour une nuit ancienne, comptée du coucher au lever (« 11 h » pour une heure ronde) ; null
// sans durée.
export const texteHeuresNuit = (h) => (h == null ? null : texteHeuresSommeil(h) || (Number.isInteger(h) ? `${h} h` : duree(h * 60)));
// Une nuit de Mes nuits (analyse/comprendre.js) : « Mal · 6 h », « Bien », « 7 h 30 » ; la qualité d'abord, comme
// l'Export PSY. `lib` : le libellé d'un identifiant.
export const texteNuit = (n, lib) => [n.qualite && lib(n.qualite), texteHeuresNuit(n.heures)].filter(Boolean).join(' · ');

const NOMS_SOURCE = {
  declencheur: 'épisodes', dessous: 'épisodes', emotion: 'épisodes', reaction: 'épisodes', symptome: 'symptômes', effetSecondaire: 'mentions',
  emotionMoment: 'relevés',
};

// Ex aequo affichés au plus, par liste : les 79 mots de la roue sont souvent à égalité (un ou deux relevés chacun), et la
// phrase les enchaînait tous. Au-delà, les trois premiers, séparés par des virgules, puis « … ». Les autres listes les
// gardent tous.
const MAX_EGALITE = { emotionMoment: 3 };

// `lib` (facultatif) : un libellé pour les identifiants qui ne sont pas dans `carte` (les mots de la roue, v7).
export function phraseClassement(liste, c, carte, lib = (id) => (carte && carte.get(id)) || id) {
  if (c.statut === 'aucun') return liste === 'effetSecondaire' ? 'Aucun effet noté sur la période' : 'Rien de noté sur la période';
  const hors = c.hors.map((h) => `hors « ${lib(h.id)} » : ${h.n}`).join(', ');
  if (liste === 'effetSecondaire' && c.classables === 0) return `Aucun effet noté sur la période${hors ? ` (${hors})` : ''}`;
  if (c.statut === 'insuffisant') return PAS_ASSEZ;
  const max = MAX_EGALITE[liste];
  const egaux = max && c.top.length > max ? `${c.top.slice(0, max).map(lib).join(', ')}…` : c.top.map(lib).join(' et ');
  const tete = c.top.length > 1 ? `à égalité : ${egaux}` : lib(c.top[0]);
  return `${tete} · ${c.nTop} ${NOMS_SOURCE[liste]} sur ${c.total}${hors ? ` (${hors})` : ''}`;
}
