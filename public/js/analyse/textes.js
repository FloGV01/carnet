// Toutes les phrases de l'analyse, en trois voix : « tu » (app), « je » (export PSY),
// « neutre » (vue soignants). Factuelles, jamais causales, jamais évaluatives.
// v7 : les phrases calculées sur la note de 1 à 10 (bonnes journées, sommeil et humeur, tendances) sont retirées.
import { SEUILS } from './seuils.js';

export const PAS_ASSEZ = 'Pas encore assez de données pour le dire.';
const E = SEUILS.emotions;
const M = SEUILS.moments;
// Le nombre de relevés d'une vue d'émotions, tiré du seuil (jamais recopié).
const AU_MOINS_EMOTIONS = `au moins ${E.minReleves} émotions du moment`;
export const REGLES = {
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
  nuits: `La règle : au moins ${C.minColonnes} soirs de la semaine qui ont chacun au moins ${C.minValeurs} nuits avec l'heure du coucher et du lever (« Nuit en détail »).`,
  activites: `La règle : une activité de « Ce que je faisais » apparaît à partir de ${C.minActivite} relevés avec une énergie.`,
  peseRecharge: 'La règle : au moins un élément de « Ce qui a pesé » ou de « Ce qui a rechargé », noté sur la période.',
  // v7 · émotions du moment
  emotions: `La règle : ${AU_MOINS_EMOTIONS} notées sur la période.`,
  emotionsLieu: `La règle : ${AU_MOINS_EMOTIONS} notées sur la période, des jours où le lieu est noté.`,
  apresNuit: `La règle : ${AU_MOINS_EMOTIONS} notées sur la période, des jours où la nuit est notée.`,
  autourExplosions: `La règle : ${AU_MOINS_EMOTIONS} notées dans les ${E.heuresAutour} heures avant ou après une explosion dont l'heure est notée, sur la période.`,
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

const NOMS_SOURCE = {
  declencheur: 'épisodes', dessous: 'épisodes', emotion: 'épisodes', reaction: 'épisodes', symptome: 'symptômes', effetSecondaire: 'mentions',
  emotionMoment: 'relevés',
};

// `lib` (facultatif) : un libellé pour les identifiants qui ne sont pas dans `carte` (les mots de la roue, v7).
export function phraseClassement(liste, c, carte, lib = (id) => (carte && carte.get(id)) || id) {
  if (c.statut === 'aucun') return liste === 'effetSecondaire' ? 'Aucun effet noté sur la période' : 'Rien de noté sur la période';
  const hors = c.hors.map((h) => `hors « ${lib(h.id)} » : ${h.n}`).join(', ');
  if (liste === 'effetSecondaire' && c.classables === 0) return `Aucun effet noté sur la période${hors ? ` (${hors})` : ''}`;
  if (c.statut === 'insuffisant') return PAS_ASSEZ;
  const tete = c.top.length > 1 ? `à égalité : ${c.top.map(lib).join(' et ')}` : lib(c.top[0]);
  return `${tete} · ${c.nTop} ${NOMS_SOURCE[liste]} sur ${c.total}${hors ? ` (${hors})` : ''}`;
}
