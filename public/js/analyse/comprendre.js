// Comprendre (v6, spec §2) : les calculs de l'écran. Ici, les facteurs de chaque jour logique et le
// graphique aligné : des jours repères (explosions, jours à énergie basse, retours au bureau), lus à
// quelques jours de décalage. Des comptes seulement, rassemblés : jamais une cause, jamais une phrase
// calculée. La date du jour arrive par la période, qui finit aujourd'hui. Pur.
import { addDays, jourEvenement } from '../domain/dates.js';
import { journalAvecExplosions, saisieDuSoir } from '../domain/explosions.js';
import { avecHumeurDuJour, estHumeur } from './humeur-jour.js';
import { bornesFenetre } from './fenetres.js';
import { SEUILS } from './seuils.js';

const S = SEUILS.comprendre;
const NUIT_MAL = 'sommeil:mal';
const BUREAU = 'lieu:bureau';
const ENERGIE_BASSE = 'energie:basse';
const COUTEUX = 'contactEffet:couteux';

// « 3 mois · Tout » (§2.1) : « 3 mois » est la fenêtre « 90 » de l'Analyse ; « Tout » par défaut.
export const PERIODES = ['3mois', 'tout'];
export function periodeComprendre(choix, aujourdhui, premier) {
  const [du, au] = bornesFenetre(choix === '3mois' ? '90' : 'tout', aujourdhui, premier);
  return { du, au };
}

// ---------- Facteurs (§2.2) : true (oui), false (non), null (inconnu) ----------

// Un champ noté : oui s'il vaut `cible`, non s'il vaut autre chose, inconnu s'il est vide.
const selon = (v, cible) => (v == null ? null : v === cible);
// Pesé, rechargé : une liste vide est inconnue.
const listeNotee = (v) => (Array.isArray(v) && v.length ? v : null);

// Contact coûteux, dans l'ordre : 1) une ligne Coûteux, quoi que dise contactHumain : oui ; 2) sinon
// contactHumain à non : non ; 3) sinon des lignes qui ont toutes un effet : non ; 4) sinon : inconnu.
function contactCouteux(j) {
  const lignes = (j.contacts || []).filter(Boolean);
  if (lignes.some((c) => c.effet === COUTEUX)) return true;
  if (j.contactHumain === false) return false;
  if (lignes.length && lignes.every((c) => c.effet)) return false;
  return null;
}

// Énergie basse par jour logique (« vers » compris) : oui dès un relevé « basse », non si les relevés
// d'énergie n'en ont aucun. Un jour sans relevé d'énergie n'a pas d'entrée.
function energieBasseParJour(humeurs) {
  const res = new Map();
  for (const h of humeurs || []) {
    if (!h || !h.date || !h.energie) continue;
    const jour = jourEvenement(h.date, h.heure);
    res.set(jour, res.get(jour) === true || h.energie === ENERGIE_BASSE);
  }
  return res;
}

// Les facteurs de chaque jour logique, rangés par date. Chaque jour garde aussi son humeur du jour et
// son lieu (pour les colonnes). Un jour a une entrée dès qu'il porte une saisie du soir, un relevé ou un
// épisode d'explosion.
export function facteursParJour({ journal = [], humeurs = [], episodes = [], zeroDepuis = null } = {}) {
  // Comme l'Analyse (analyse/index.js) : l'humeur du jour, puis les explosions. Un jour qui n'a que des
  // relevés n'a pas de saisie du soir : il ne vaut jamais 0 explosion.
  const entrees = journalAvecExplosions(avecHumeurDuJour(journal, humeurs), episodes, { zeroDepuis, jourNote: saisieDuSoir(journal) });
  const energie = energieBasseParJour(humeurs);
  const presentes = new Set(entrees.map((j) => j.date));
  for (const date of energie.keys()) if (!presentes.has(date)) entrees.push({ date });
  entrees.sort((a, b) => a.date.localeCompare(b.date));
  return new Map(entrees.map((j) => {
    const humeur = estHumeur(j.humeur) ? j.humeur : null;
    return [j.date, {
      date: j.date,
      humeur,
      lieu: j.lieu || null,
      nuitMal: selon(j.sommeilRessenti, NUIT_MAL),
      energieBasse: energie.has(j.date) ? energie.get(j.date) : null,
      contactCouteux: contactCouteux(j),
      bureau: selon(j.lieu, BUREAU),
      explosion: j.explosions == null ? null : j.explosions >= 1,
      humeurBasse: humeur == null ? null : humeur <= SEUILS.bonnesJournees.bas,
      pese: listeNotee(j.pese),
      recharge: listeNotee(j.recharge),
    }];
  }));
}

// ---------- Le graphique aligné (§2.2) ----------

const mesure = (oui, n) => ({ oui, n, part: n ? oui / n : null, peu: n < S.minValeurs });

// facteurs : [{ cle, valeur(jour) → true | false | null, …}] ; ce qui accompagne `valeur` passe au bloc.
// Un bloc par facteur, une barre par décalage. n compte les jours repères dont le jour décalé a ce
// facteur connu ; un jour décalé est lu dans toutes les données jusqu'à aujourd'hui, jamais après.
// `dates` : les jours repères où le facteur vaut oui. Le repère des autres jours : les mêmes comptes
// sur les jours `autres`. Moins de 3 valeurs : `peu`.
export function aligne({ jours, reperes, decalages, facteurs, autres, aujourdhui }) {
  // Parmi `dates`, celles dont le jour lu (décalé) a le facteur connu (n) et celles où il vaut oui.
  const compter = (valeur, dates, decalage = 0) => {
    const oui = [];
    let n = 0;
    for (const d of dates) {
      const lu = addDays(d, decalage);
      const j = lu <= aujourdhui ? jours.get(lu) : null;
      const v = j ? valeur(j) ?? null : null;
      if (v == null) continue;
      n += 1;
      if (v) oui.push(d);
    }
    return { oui, n };
  };
  return facteurs.map(({ valeur, ...bloc }) => {
    const barres = decalages.map((decalage) => {
      const { oui, n } = compter(valeur, reperes, decalage);
      return { decalage, ...mesure(oui.length, n), dates: oui };
    });
    const { oui, n } = compter(valeur, autres);
    return { ...bloc, barres, autres: mesure(oui.length, n) };
  });
}

// Les éléments d'une liste du soir (`pese` ou `recharge`) notés au moins `min` jours de la période,
// rangés par identifiant.
export function elementsFrequents(jours, periode, liste, min) {
  const n = new Map();
  for (const j of jours.values()) {
    if (j.date < periode.du || j.date > periode.au || !j[liste]) continue;
    for (const id of new Set(j[liste])) n.set(id, (n.get(id) || 0) + 1);
  }
  return [...n].filter(([, k]) => k >= min).map(([id]) => id).sort();
}

const fixes = (...cles) => cles.map((cle) => ({ cle, valeur: (j) => j[cle] }));

// Les éléments pesés ou rechargés de la période, dans l'ordre de leur liste (Réglages › Listes) ; un
// élément absent de `items` va à la fin. Connus seulement les jours où la liste du soir est remplie.
function elements(jours, periode, liste, items) {
  const rang = new Map(items.map((i) => [i.id, i.ordre]));
  const pos = (id) => (rang.has(id) ? rang.get(id) : Number.MAX_SAFE_INTEGER);
  return elementsFrequents(jours, periode, liste, S.minElement).sort((a, b) => pos(a) - pos(b))
    .map((id) => ({ cle: id, liste, valeur: (j) => (j[liste] ? j[liste].includes(id) : null) }));
}

const dans = (periode) => (date) => date >= periode.du && date <= periode.au;
// Les jours où `f` est vrai, dans toutes les données jusqu'à aujourd'hui.
const joursOu = (jours, au, f) => [...jours.values()].filter((j) => j.date <= au && f(j)).map((j) => j.date);
const joursDeLaPeriode = (jours, periode, f) => joursOu(jours, periode.au, f).filter(dans(periode));
// Les jours des fenêtres de tous les événements.
const fenetres = (evenements, decalages) => new Set(evenements.flatMap((e) => decalages.map((d) => addDays(e, d))));

// Les jours repères sont pris dans la période, à partir de 3.
function graphe(jours, periode, { evenements, decalages, facteurs, autres }) {
  const reperes = evenements.filter(dans(periode));
  if (reperes.length < S.minEvenements) return { statut: 'insuffisant', blocs: [] };
  return { statut: 'ok', blocs: aligne({ jours, reperes, decalages, facteurs, autres, aujourdhui: periode.au }) };
}

// Explosions (§2.3). Autres jours : explosion connue à 0, hors des 3 jours qui précèdent (avant) ou qui
// suivent (après) une explosion, même d'avant la période.
const AVANT = [-3, -2, -1, 0];
const APRES = [1, 2, 3];
function explosions(jours, periode, decalages, facteurs) {
  const evenements = joursOu(jours, periode.au, (j) => j.explosion === true);
  const exclus = fenetres(evenements, decalages);
  const autres = joursDeLaPeriode(jours, periode, (j) => j.explosion === false && !exclus.has(j.date));
  return graphe(jours, periode, { evenements, decalages, facteurs, autres });
}
export function explosionsAvant(jours, periode, items = []) {
  return explosions(jours, periode, AVANT,
    [...fixes('nuitMal', 'energieBasse', 'contactCouteux', 'bureau'), ...elements(jours, periode, 'pese', items)]);
}
export function explosionsApres(jours, periode, items = []) {
  return explosions(jours, periode, APRES,
    [...fixes('humeurBasse', 'energieBasse', 'nuitMal'), ...elements(jours, periode, 'recharge', items)]);
}

// Avant les jours à énergie basse (§2.4). Autres jours : énergie notée sans « basse », sans exclusion
// de fenêtre (des jours bas fréquents rendraient sinon la comparaison impossible).
export function energieAvant(jours, periode, items = []) {
  return graphe(jours, periode, {
    evenements: joursOu(jours, periode.au, (j) => j.energieBasse === true),
    decalages: AVANT,
    facteurs: [...fixes('nuitMal', 'contactCouteux', 'bureau', 'explosion'),
      ...elements(jours, periode, 'pese', items), ...elements(jours, periode, 'recharge', items)],
    autres: joursDeLaPeriode(jours, periode, (j) => j.energieBasse === false),
  });
}

// Autour d'un retour au bureau (§2.5) : une journée au bureau dont la veille a un lieu noté autre que
// Bureau. Autres jours : hors des fenêtres de tous les retours.
const RETOUR = [-1, 0, 1, 2];
export function retoursBureau(jours, periode) {
  const evenements = joursOu(jours, periode.au, (j) => j.bureau === true && jours.get(addDays(j.date, -1))?.bureau === false);
  const exclus = fenetres(evenements, RETOUR);
  return graphe(jours, periode, {
    evenements,
    decalages: RETOUR,
    facteurs: fixes('humeurBasse', 'nuitMal', 'energieBasse', 'explosion', 'contactCouteux'),
    autres: joursDeLaPeriode(jours, periode, (j) => !exclus.has(j.date)),
  });
}
