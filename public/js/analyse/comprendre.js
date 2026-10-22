// Comprendre (v6, spec §2) : les calculs de l'écran. Les facteurs de chaque jour logique et le graphique
// aligné : des jours repères (explosions, jours à énergie basse, retours au bureau), lus à quelques jours de
// décalage. Puis les colonnes (jour de la semaine, lieu, mois), les nuits selon le soir du coucher, l'énergie
// selon ce que je faisais, et ce qui a pesé ou rechargé. Des comptes seulement, rassemblés : jamais une cause,
// jamais une phrase calculée. v7 : la note de 1 à 10 n'est plus une mesure ; les colonnes comptent les émotions du
// moment par famille (emotions.js). La date du jour arrive par la période, qui finit aujourd'hui. Pur.
import { addDays, jourEvenement, jourSemaine, JOURS } from '../domain/dates.js';
import { journalAvecExplosions, saisieDuSoir } from '../domain/explosions.js';
import { energieBasseParJour } from './energie-jour.js';
import { famillesParJour, famillesParColonnes } from './emotions.js';
import { ordreDeListe, clesDeColonnes, colonneDe } from './colonnes.js';
import { bornesFenetre, dureeNuit, coucherAjuste, enMinutes, versHeure } from './fenetres.js';
import { mediane } from './stats.js';
import { SEUILS } from './seuils.js';

const S = SEUILS.comprendre;
const NUIT_MAL = 'sommeil:mal';
const BUREAU = 'lieu:bureau';
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

// Les facteurs de chaque jour logique, rangés par date. Chaque jour garde aussi son lieu (pour les colonnes) et
// les familles de ses émotions du moment, une par relevé (v7). Un jour a une entrée dès qu'il porte une saisie du
// soir, un relevé d'énergie ou d'émotion, ou un épisode d'explosion.
export function facteursParJour({ journal = [], humeurs = [], episodes = [], zeroDepuis = null } = {}) {
  // Comme l'Analyse (analyse/index.js) : les explosions. Un jour qui n'a que des relevés n'a pas de saisie du soir :
  // il ne vaut jamais 0 explosion.
  const entrees = journalAvecExplosions(journal, episodes, { zeroDepuis, jourNote: saisieDuSoir(journal) });
  const energie = energieBasseParJour(humeurs);
  const familles = famillesParJour(humeurs, '0000-01-01', '9999-12-31');
  const presentes = new Set(entrees.map((j) => j.date));
  for (const date of [...energie.keys(), ...familles.keys()]) if (!presentes.has(date)) { entrees.push({ date }); presentes.add(date); }
  entrees.sort((a, b) => a.date.localeCompare(b.date));
  return new Map(entrees.map((j) => [j.date, {
    date: j.date,
    lieu: j.lieu || null,
    familles: familles.get(j.date) || [],
    nuitMal: selon(j.sommeilRessenti, NUIT_MAL),
    energieBasse: energie.has(j.date) ? energie.get(j.date) : null,
    contactCouteux: contactCouteux(j),
    bureau: selon(j.lieu, BUREAU),
    explosion: j.explosions == null ? null : j.explosions >= 1,
    pese: listeNotee(j.pese),
    recharge: listeNotee(j.recharge),
  }]));
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

// Les éléments pesés ou rechargés de la période, dans l'ordre de leur liste. Connus seulement les jours où
// la liste du soir est remplie.
function elements(jours, periode, liste, items) {
  return elementsFrequents(jours, periode, liste, S.minElement).sort(ordreDeListe(items))
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
    [...fixes('energieBasse', 'nuitMal'), ...elements(jours, periode, 'recharge', items)]);
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
    facteurs: fixes('nuitMal', 'energieBasse', 'explosion', 'contactCouteux'),
    autres: joursDeLaPeriode(jours, periode, (j) => !exclus.has(j.date)),
  });
}

// ---------- Les colonnes (§2.5) : jour de la semaine, lieu, mois ----------

// Le choix « Émotions · Nuits Mal · Explosions · Énergie basse » (v7 : les émotions du moment par famille remplacent
// l'humeur). Une nuit Mal compte pour le jour où elle est notée.
export const MESURES = ['emotions', 'nuitMal', 'explosion', 'energieBasse'];

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

// Un graphique en colonnes apparaît à partir de 2 colonnes d'au moins 3 valeurs. Dessous : aucune colonne.
// Sous 3 valeurs, une colonne est `fragile` (barre creuse) : la même règle « moins de 3 valeurs » que `peu` dans
// aligne(). n === 0 veut dire « aucune valeur » (rien à dessiner, pas d'étiquette) : à tester avant `fragile`, qui
// est aussi vrai à n = 0.
const selonSeuil = (colonnes) => (colonnes.filter((c) => c.n >= S.minValeurs).length >= S.minColonnes
  ? { statut: 'ok', colonnes } : { statut: 'insuffisant', colonnes: [] });

// Le mot qui suit le compte d'une barre : « 3 lundis », « 3 jours ».
const motDe = { semaine: (cle) => JOURS[cle], lieu: () => 'jour', mois: () => 'jour' };

// Les mesures oui / non / inconnu, comme les facteurs. La part vaut oui / n ; le libellé ne dit que le compte de
// oui : n, le nombre de jours connus, ne va que dans « Voir en tableau ». Sans aucune valeur connue (n = 0), pas de
// libellé : un jour non noté n'est pas un zéro. « 0 lundi » reste dit quand des lundis sont connus et qu'aucun n'est oui.
function colonneOuiNon(cle, jours, quoi, mot) {
  const connus = jours.map((j) => j[quoi]).filter((v) => v != null);
  const oui = connus.filter(Boolean).length;
  return {
    cle, n: connus.length, oui, part: connus.length ? oui / connus.length : null, fragile: connus.length < S.minValeurs,
    libelle: connus.length ? pluriel(oui, mot) : null,
  };
}

// jours : le résultat de facteursParJour. pas : 'semaine' (clé 0 à 6), 'lieu' (clé : l'identifiant du lieu) ou
// 'mois' (clé : « 2026-09 »). items : les lieux, pour leur ordre. Une colonne à n === 0 n'a aucune valeur
// (ni barre, ni libellé). La mesure « emotions » rend les colonnes de famillesParColonnes (emotions.js), à son seuil.
export function parColonnes(jours, periode, { cle: pas, mesure: quoi }, items = []) {
  if (quoi === 'emotions') return famillesParColonnes(jours, periode, { cle: pas }, items);
  const ici = dans(periode);
  const dansPeriode = [...jours.values()].filter((j) => ici(j.date));
  const parCle = new Map(clesDeColonnes(pas, dansPeriode, periode, items).map((c) => [c, []]));
  for (const j of dansPeriode) parCle.get(colonneDe[pas](j))?.push(j);
  return selonSeuil([...parCle].map(([c, js]) => colonneOuiNon(c, js, quoi, motDe[pas](c))));
}

// ---------- Tes nuits selon le jour (§2.5, graphique 4) ----------

const LENDEMAIN = 1440; // le lever est le lendemain du coucher, en minutes
const heureExacte = (m) => (m == null ? null : versHeure(m));

// Une colonne par soir de coucher, du lundi (0) au dimanche. La nuit notée le jour D (celle qui précède D)
// est celle du soir D−1 ; la période porte sur D. Une nuit compte si le coucher et le lever sont notés et
// que dureeNuit n'est pas nul, comme dans l'Analyse. `coucher` et `lever` : médianes en minutes depuis minuit
// du jour du coucher (un coucher avant 12:00 compte après minuit, donc au-delà de 1440 ; le lever est le
// lendemain, + 1440) ; heureCoucher et heureLever : les mêmes, en heure exacte, pour le tableau. n === 0 :
// aucune nuit, tout est null et il n'y a rien à tracer ; à tester avant `fragile` (aussi vrai à n = 0, même
// règle « moins de 3 valeurs » que `peu` dans aligne()).
export function nuitsParSoir(journal, periode) {
  const ici = dans(periode);
  const soirs = Array.from({ length: 7 }, () => []);
  for (const j of journal || []) {
    if (!j || !ici(j.date) || dureeNuit(j.heureCoucher, j.heureLever) == null) continue;
    soirs[jourSemaine(addDays(j.date, -1))].push(j);
  }
  return selonSeuil(soirs.map((nuits, cle) => {
    const coucher = mediane(nuits.map((j) => coucherAjuste(j.heureCoucher)));
    const lever = mediane(nuits.map((j) => enMinutes(j.heureLever) + LENDEMAIN));
    return { cle, n: nuits.length, fragile: nuits.length < S.minValeurs, coucher, lever, heureCoucher: heureExacte(coucher), heureLever: heureExacte(lever) };
  }));
}

// ---------- Selon ce que je faisais (§2.4, graphique 3) ----------

const NIVEAUX = new Map([['energie:basse', 'basse'], ['energie:moyenne', 'moyenne'], ['energie:haute', 'haute']]);

// Une barre par activité de « Ce que je faisais », découpée en relevés d'énergie basse, moyenne et haute
// (« vers » compris). Elle compte des relevés, pas des jours : un relevé de deux activités compte pour
// chacune. Seules les activités présentes dans au moins 3 relevés avec énergie apparaissent, dans l'ordre de
// leur liste.
export function energieParActivite(humeurs, periode, items = []) {
  const ici = dans(periode);
  const par = new Map();
  for (const h of humeurs || []) {
    const niveau = h && h.date ? NIVEAUX.get(h.energie) : null;
    if (!niveau || !ici(jourEvenement(h.date, h.heure))) continue;
    for (const id of new Set(listeNotee(h.faisais) || [])) {
      const a = par.get(id) || { id, n: 0, basse: 0, moyenne: 0, haute: 0 };
      a.n += 1;
      a[niveau] += 1;
      par.set(id, a);
    }
  }
  const ordre = ordreDeListe(items);
  const activites = [...par.values()].filter((a) => a.n >= S.minActivite).sort((a, b) => ordre(a.id, b.id))
    .map((a) => ({ ...a, libelle: pluriel(a.n, 'relevé') }));
  return { statut: activites.length ? 'ok' : 'insuffisant', activites };
}

// ---------- Ce qui a pesé, ce qui a rechargé (§2.4, graphique 1) ----------

// Deux groupes de barres, dans l'ordre de leurs listes. Chaque élément compte les jours distincts où il est
// noté, dès une fois dans la période.
export function peseRecharge(journal, periode, items = []) {
  const ici = dans(periode);
  const ordre = ordreDeListe(items);
  const joursPar = (liste) => {
    const n = new Map();
    for (const j of journal || []) {
      if (!j || !ici(j.date)) continue;
      for (const id of new Set(listeNotee(j[liste]) || [])) n.set(id, (n.get(id) || 0) + 1);
    }
    return [...n].map(([id, jours]) => ({ id, n: jours, libelle: pluriel(jours, 'jour') })).sort((a, b) => ordre(a.id, b.id));
  };
  const pese = joursPar('pese');
  const recharge = joursPar('recharge');
  return { statut: pese.length || recharge.length ? 'ok' : 'insuffisant', pese, recharge };
}
