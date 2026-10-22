// Écran Comprendre (v6, spec §2) : ouvert depuis l'Analyse, trois onglets, Explosions · Énergie · Rythmes.
// Graphiques seulement, aucune phrase calculée. Les calculs sont ceux, purs, d'analyse/comprendre.js et (v7)
// d'analyse/emotions.js ; sous un seuil, chaque graphique dit « Pas encore assez de données pour le dire. ». La période
// et la mesure sont gardées d'une ouverture à l'autre ; l'onglet vient de la porte touchée dans l'Analyse (v6.1).
// v7 : la mesure « Humeur » devient « Émotions » (les familles), avec « Après une nuit » et « Autour de tes explosions » ;
// « Autour du Bien-être » (spec §6.4) ferme l'onglet Énergie.
import { html, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { Segmente } from '../composants/segmente.js';
import { repo } from '../../donnees.js';
import { useDonnees, lireLocal, ecrireLocal } from '../hooks.js';
import { carteLibelles } from '../../domain/libelles.js';
import { premiereDate } from '../../analyse/fenetres.js';
import {
  PERIODES, MESURES, periodeComprendre, facteursParJour, explosionsAvant, explosionsApres, energieAvant, retoursBureau,
  parColonnes, nuitsParSoir, energieParActivite, peseRecharge,
} from '../../analyse/comprendre.js';
import { apresNuit, autourDe, autourDuBienEtre } from '../../analyse/emotions.js';
import { SEUILS } from '../../analyse/seuils.js';
import { estExplosion } from '../../domain/explosions.js';
import { jourEvenement } from '../../domain/dates.js';
import {
  GrapheAligne, GrapheColonnes, GrapheNuits, GrapheActivites, GraphePeseRecharge, GrapheFamilles, GrapheFamillesColonnes, PasAssez, nomMesure,
} from '../graphes/comprendre.js';
import { versHash } from '../../routeur.js';

const CLE_PERIODE = 'carnet:comprendre:periode';
const CLE_MESURE = 'carnet:comprendre:mesure';
const H = SEUILS.emotions.heuresAutour;

// Les onglets, aussi les trois portes de l'Analyse (v6.1).
export const ONGLETS = [{ valeur: 'explosions', libelle: 'Explosions' }, { valeur: 'energie', libelle: 'Énergie' }, { valeur: 'rythmes', libelle: 'Rythmes' }];
const CHOIX_PERIODE = [{ valeur: '3mois', libelle: '3 mois' }, { valeur: 'tout', libelle: 'Tout' }];
const COTES = [{ valeur: 'avant', libelle: 'Avant' }, { valeur: 'apres', libelle: 'Après' }];

// Un choix gardé, relu seulement s'il est encore valable.
const lireChoix = (cle, valeurs, defaut) => { const v = lireLocal(cle); return valeurs.includes(v) ? v : defaut; };

async function charger() {
  const [journal, episodes, humeurs, seances, items, zeroDepuis] = await Promise.all([
    repo.journal.tous(), repo.episodes.tous(), repo.humeurs.tous(), repo.seances.tous(), repo.listes.items(), repo.meta.lire('explosionsDepuis'),
  ]);
  const aujourdhui = repo.aujourdhui();
  const jours = facteursParJour({ journal, humeurs, episodes, zeroDepuis });
  // « Tout » part du premier jour qui porte une donnée lue ici : un soir, un relevé, une explosion.
  const premier = premiereDate({ journal: [...jours.values()] }, aujourdhui);
  return { journal, humeurs, episodes, seances, items, jours, premier, aujourdhui, carte: carteLibelles(items) };
}

// periode : { du, au }, pour les calculs ; choixPeriode : la clé du sélecteur (« 3mois » ou « tout »), pour la
// phrase des graphiques. Sous son seuil, un graphique laisse sa place à PasAssez. Les graphiques alignés ont une
// clé graphe + période : une barre touchée ne passe pas d'un graphique ou d'une période à l'autre ; de même, la
// règle dépliée d'Avant ne reste pas ouverte sur Après.
function Aligne({ graphe, resultat, d, choixPeriode }) {
  if (resultat.statut !== 'ok') return html`<${PasAssez} key=${graphe} graphe=${graphe} />`;
  return html`<${GrapheAligne} key=${`${graphe}-${choixPeriode}`} graphe=${graphe} resultat=${resultat} periode=${choixPeriode} carte=${d.carte} aujourdhui=${d.aujourdhui} />`;
}

// Autour de tes explosions (v7) : les émotions du moment notées dans les 3 heures avant et après une explosion de la
// période dont l'heure est notée (SEUILS.emotions.heuresAutour).
function AutourExplosions({ d, periode, choixPeriode }) {
  const instants = d.episodes.filter((e) => estExplosion(e) && e.heure && (() => { const j = jourEvenement(e.date, e.heure); return j >= periode.du && j <= periode.au; })());
  const r = autourDe(instants, d.humeurs);
  if (r.statut !== 'ok') return html`<${PasAssez} graphe="autourExplosions" />`;
  return html`<${GrapheFamilles} graphe="autourExplosions" entete="Quand" periode=${choixPeriode} carte=${d.carte}
    lignes=${[{ cle: 'avant', nom: `${H} heures avant`, compte: r.avant }, { cle: 'apres', nom: `${H} heures après`, compte: r.apres }]} />`;
}

// Autour du Bien-être (v7, spec §6.4) : les émotions du moment notées dans les 3 heures avant et après une séance lancée
// depuis l'onglet Bien-être (les respirations de Moment difficile et de « Pour récupérer » ne comptent pas), sur la période.
// Une description, sans phrase calculée ni verdict.
function AutourBienEtre({ d, periode, choixPeriode }) {
  const r = autourDuBienEtre(d.seances, d.humeurs, periode);
  if (r.statut !== 'ok') return html`<${PasAssez} graphe="autourBienEtre" />`;
  return html`<${GrapheFamilles} graphe="autourBienEtre" entete="Quand" periode=${choixPeriode} carte=${d.carte}
    lignes=${[{ cle: 'avant', nom: `${H} heures avant`, compte: r.avant }, { cle: 'apres', nom: `${H} heures après`, compte: r.apres }]} />`;
}

function Explosions({ d, periode, choixPeriode, cote, choisirCote }) {
  const graphe = cote === 'apres' ? 'explosionsApres' : 'explosionsAvant';
  const calcul = cote === 'apres' ? explosionsApres : explosionsAvant;
  return html`<${Segmente} etiquette="Avant ou après" options=${COTES} valeur=${cote} surChoix=${choisirCote} classe="petit" sansVide=${true} />
    <${Aligne} graphe=${graphe} resultat=${calcul(d.jours, periode, d.items)} d=${d} choixPeriode=${choixPeriode} />
    <${AutourExplosions} d=${d} periode=${periode} choixPeriode=${choixPeriode} />`;
}

function Energie({ d, periode, choixPeriode }) {
  const pr = peseRecharge(d.journal, periode, d.items);
  const activites = energieParActivite(d.humeurs, periode, d.items);
  return html`${pr.statut === 'ok' ? html`<${GraphePeseRecharge} resultat=${pr} periode=${choixPeriode} carte=${d.carte} />` : html`<${PasAssez} graphe="peseRecharge" />`}
    <${Aligne} graphe="energieAvant" resultat=${energieAvant(d.jours, periode, d.items)} d=${d} choixPeriode=${choixPeriode} />
    ${activites.statut === 'ok' ? html`<${GrapheActivites} resultat=${activites} periode=${choixPeriode} carte=${d.carte} />` : html`<${PasAssez} graphe="activites" />`}
    <${AutourBienEtre} d=${d} periode=${periode} choixPeriode=${choixPeriode} />`;
}

// Après une nuit (v7) : les émotions du jour selon la nuit notée ce jour-là.
function ApresNuit({ d, periode, choixPeriode }) {
  const lib = (id) => d.carte.get(id) || id;
  const r = apresNuit(d.journal, d.humeurs, periode);
  if (r.statut !== 'ok') return html`<${PasAssez} graphe="apresNuit" />`;
  const jours = (n) => (n ? `${n} jour${n > 1 ? 's' : ''}` : null);
  return html`<${GrapheFamilles} graphe="apresNuit" entete="Nuit" periode=${choixPeriode} carte=${d.carte}
    lignes=${['mal', 'moyen', 'bien'].map((k) => ({ cle: k, nom: lib(`sommeil:${k}`), compte: r[k], detail: jours(r.jours[k]) }))} />`;
}

// Le choix de mesure sert aux graphiques 1, 2 et 5 (jour de la semaine, lieu, mois).
function Rythmes({ d, periode, choixPeriode, mesure, choisirMesure }) {
  const lib = (id) => d.carte.get(id) || id;
  const colonnes = (pas) => {
    const r = parColonnes(d.jours, periode, { cle: pas, mesure }, d.items);
    if (r.statut !== 'ok') return html`<${PasAssez} graphe=${pas} mesure=${mesure} />`;
    return mesure === 'emotions' ? html`<${GrapheFamillesColonnes} pas=${pas} resultat=${r} periode=${choixPeriode} carte=${d.carte} />`
      : html`<${GrapheColonnes} pas=${pas} mesure=${mesure} resultat=${r} periode=${choixPeriode} carte=${d.carte} />`;
  };
  const nuits = nuitsParSoir(d.journal, periode);
  return html`<${Segmente} etiquette="Mesure" options=${MESURES.map((m) => ({ valeur: m, libelle: nomMesure(m, lib) }))}
      valeur=${mesure} surChoix=${choisirMesure} classe="petit" sansVide=${true} />
    ${colonnes('semaine')}
    ${colonnes('lieu')}
    <${Aligne} graphe="retoursBureau" resultat=${retoursBureau(d.jours, periode)} d=${d} choixPeriode=${choixPeriode} />
    ${nuits.statut === 'ok' ? html`<${GrapheNuits} resultat=${nuits} periode=${choixPeriode} />` : html`<${PasAssez} graphe="nuits" />`}
    <${ApresNuit} d=${d} periode=${periode} choixPeriode=${choixPeriode} />
    ${colonnes('mois')}`;
}

// onglet : explosions, energie ou rythmes (la route n'en accepte pas d'autre).
export function Comprendre({ onglet }) {
  const [choixPeriode, setChoixPeriode] = useState(() => lireChoix(CLE_PERIODE, PERIODES, 'tout'));
  const [mesure, setMesure] = useState(() => lireChoix(CLE_MESURE, MESURES, 'emotions'));
  const [cote, setCote] = useState('avant');
  const { donnees: d } = useDonnees(charger, []);
  const garder = (cle, set) => (v) => { if (v) { set(v); ecrireLocal(cle, v); } };

  const tete = html`<${Entete} titre="Comprendre" retour=${() => { location.hash = '#/analyse'; }} />
    <${Segmente} etiquette="Comprendre" options=${ONGLETS} valeur=${onglet}
      surChoix=${(v) => { if (v) location.hash = versHash('comprendre', { onglet: v }); }} classe="large" sansVide=${true} />`;
  if (!d) return html`<main class="ecran comprendre">${tete}</main>`;
  const periode = periodeComprendre(choixPeriode, d.aujourdhui, d.premier);
  const props = { d, periode, choixPeriode };
  return html`<main class="ecran comprendre">
    ${tete}
    <div class="selecteur-periode"><${Segmente} etiquette="Période" options=${CHOIX_PERIODE} valeur=${choixPeriode} surChoix=${garder(CLE_PERIODE, setChoixPeriode)} classe="petit" sansVide=${true} /></div>
    ${onglet === 'energie' ? html`<${Energie} ...${props} />`
      : onglet === 'rythmes' ? html`<${Rythmes} ...${props} mesure=${mesure} choisirMesure=${garder(CLE_MESURE, setMesure)} />`
        : html`<${Explosions} ...${props} cote=${cote} choisirCote=${(v) => v && setCote(v)} />`}
  </main>`;
}
