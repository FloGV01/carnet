// Écran d'ouverture : l'entrée du jour, saisie en quelques touchers, sans bouton « Enregistrer ».
import { html, useEffect, useReducer, useRef, useState } from '../lib.js';
import { repo } from '../../donnees.js';
import { useDonnees, useEtatApp, useIndicateur, ecrireAvecEssais, lireLocal, ecrireLocal } from '../hooks.js';
import { addDays, JOURS, jourSemaine, jourEvenement, estAvantBascule, formaterJour, formaterVers } from '../../domain/dates.js';
import { episodesRecents, premierJourRecent } from '../../domain/apres-coup.js';
import { versHash } from '../../routeur.js';
import { EnteteJour } from '../composants/entete-jour.js';
import { Pastilles } from '../composants/pastilles.js';
import { Segmente, OuiNon } from '../composants/segmente.js';
import { RoueChoix } from '../composants/roue-choix.js';
import { ChampTexte } from '../composants/texte.js';
import { ChampHeure } from '../composants/heure.js';
import { Repli } from '../composants/repli.js';
import { Icones } from '../icones.js';
import { MemoVocal } from '../composants/memo-vocal.js';
import { afficherToast } from '../composants/toast.js';
import { Confirmation } from '../composants/confirmation.js';
import { TeteRubrique } from '../composants/rubrique.js';
import { ecouterGlissement, departIgnore } from '../glissement.js';
import { phraseResume, minusculeInitiale } from '../../domain/phrase.js';
import { avecHumeurDuJour } from '../../analyse/humeur-jour.js';
import { normaliserJournee, champsAffiches, repliAffiche, repliNuitAffiche, changerPremiereLigne, NOM_PESE_RECHARGE, NOM_NUIT } from '../../domain/journee.js';
import { VALEURS_HEURES_SOMMEIL, texteHeuresSommeil } from '../../domain/champs.js';
import { estExplosion } from '../../domain/explosions.js';
import { zoneDe } from '../../domain/carte-roue.js';
import { texteReleve, zonesDuJour } from '../../domain/releves.js';
import { PastillesMultiples } from '../composants/multiples.js';
import { etatApp } from '../../store.js';
import { carteLibelles, libelle } from '../../domain/libelles.js';
import { prochainRdv } from '../../domain/soins.js';
import { libelleRdv } from './soins.js';

const HUMEURS = Array.from({ length: 10 }, (_, i) => ({ valeur: i + 1, libelle: String(i + 1) }));
const EXPLOSIONS = Array.from({ length: 6 }, (_, i) => ({ valeur: i, libelle: String(i) }));
const REVEILS = Array.from({ length: 6 }, (_, i) => ({ valeur: i, libelle: i === 5 ? '5 ou plus' : String(i) }));
// Durée de la nuit (v11, spec §5) : « 4 h ou moins · 4 h 30 · … · 9 h 30 · 10 h ou plus », par demi-heure, sur la roue.
const HEURES = VALEURS_HEURES_SOMMEIL.map((h) => ({ valeur: h, libelle: texteHeuresSommeil(h) }));

// actuel : la valeur choisie, ou les valeurs d'un choix multiple. Un élément archivé encore choisi
// reste proposé (en dernier) pour pouvoir être vu et retiré.
export function options(items, liste, actuel) {
  const choisi = (id) => (Array.isArray(actuel) ? actuel.includes(id) : id === actuel);
  return items
    .filter((i) => i.liste === liste && (!i.archive || choisi(i.id)))
    .sort((a, b) => Number(a.archive) - Number(b.archive) || a.ordre - b.ordre)
    .map((i) => ({ valeur: i.id, libelle: i.libelle }));
}

// Plusieurs contacts (v5) : une ligne par contact (avec qui, comment c'était), comme les activités. v11 (spec §5.4) :
// « comment c'était » se règle sur la roue, la même que dans la carte, sur les mêmes données (la carte montre la première
// ligne).
function DetailContact({ entree, items, surChanger }) {
  const [enPlus, setEnPlus] = useState(false);
  const lignes = entree.contacts || [];
  const affichees = enPlus || lignes.length === 0 ? [...lignes, { avec: null, effet: null }] : lignes;
  const changer = (i, champ) => (v) => {
    const nouvelles = affichees.map((l, k) => (k === i ? { ...l, [champ]: v } : l)).filter((l) => (l.avec && l.avec.length) || l.effet);
    setEnPlus(false);
    surChanger(nouvelles.length ? nouvelles : null);
  };
  return html`<div class="detail-sport">
    ${affichees.map((l, i) => html`<div class="activite" key=${i}>
      <div class="activite-tete"><span class="etiquette">Contact ${i + 1}</span>
        ${((l.avec && l.avec.length) || l.effet) && html`<button type="button" class="effacer" aria-label=${`Retirer le contact ${i + 1}`}
          onClick=${() => { const n = lignes.filter((_, k) => k !== i); surChanger(n.length ? n : null); }}>${Icones.fermer()}</button>`}</div>
      <${PastillesMultiples} etiquette=${`Contact ${i + 1} : avec qui`} options=${options(items, 'contactAvec', l.avec)} valeurs=${l.avec}
        exclusifs=${new Set()} surChoix=${changer(i, 'avec')} />
      <${RoueChoix} etiquette=${`Contact ${i + 1} : comment c'était`} options=${options(items, 'contactEffet', l.effet)} valeur=${l.effet ?? null}
        surChoix=${changer(i, 'effet')} />
    </div>`)}
    ${lignes.length > 0 && !enPlus && html`<button type="button" class="btn-lien action" onClick=${() => setEnPlus(true)}>${Icones.plus({ trait: 2 })}Un autre contact</button>`}
  </div>`;
}

// Plusieurs activités : une ligne par activité (type, durée), une ligne vide en attente d'un choix. v11 (spec §5.4) : la
// durée se règle sur la roue, la même que dans la carte, sur les mêmes données (la carte montre la première ligne).
function DetailSport({ entree, items, surChanger }) {
  const [enPlus, setEnPlus] = useState(false);
  const lignes = entree.activites || [];
  const affichees = enPlus || lignes.length === 0 ? [...lignes, { type: null, duree: null }] : lignes;
  const changer = (i, champ) => (v) => {
    const nouvelles = affichees.map((l, k) => (k === i ? { ...l, [champ]: v } : l)).filter((l) => l.type || l.duree);
    setEnPlus(false);
    surChanger(nouvelles.length ? nouvelles : null);
  };
  return html`<div class="detail-sport">
    ${affichees.map((l, i) => html`<div class="activite" key=${i}>
      <div class="activite-tete"><span class="etiquette">Activité ${i + 1}</span>
        ${(l.type || l.duree) && html`<button type="button" class="effacer" aria-label=${`Retirer l'activité ${i + 1}`}
          onClick=${() => { const n = lignes.filter((_, k) => k !== i); surChanger(n.length ? n : null); }}>${Icones.fermer()}</button>`}</div>
      <${Pastilles} etiquette=${`Activité ${i + 1} : type`} options=${options(items, 'typeSport', l.type)} valeur=${l.type ?? null} surChoix=${changer(i, 'type')} classe="souples" />
      <${RoueChoix} etiquette=${`Activité ${i + 1} : durée`} options=${options(items, 'dureeSport', l.duree)} valeur=${l.duree ?? null} surChoix=${changer(i, 'duree')} />
    </div>`)}
    ${lignes.length > 0 && !enPlus && html`<button type="button" class="btn-lien action" onClick=${() => setEnPlus(true)}>${Icones.plus({ trait: 2 })}Une autre activité</button>`}
  </div>`;
}

function resumeNuit(e) {
  const morceaux = [];
  if (e.heureCoucher || e.heureLever) morceaux.push(`${e.heureCoucher || '·'} → ${e.heureLever || '·'}`);
  if (e.reveilsNocturnes != null) morceaux.push(e.reveilsNocturnes === 5 ? '5 réveils ou plus' : `${e.reveilsNocturnes} réveil${e.reveilsNocturnes > 1 ? 's' : ''}`);
  return morceaux.join(' · ');
}

// Libellés d'une liste en minuscules, séparés par des virgules : « bruit, trajets ».
const enMinuscules = (ids, carte) => (ids || []).map((id) => minusculeInitiale(libelle(carte, id))).join(', ');

// Ce qui a pesé, ce qui a rechargé (v6) : « pesé : bruit, trajets · rechargé : calme ».
function resumePeseRecharge(e, carte) {
  return [e.pese?.length && `pesé : ${enMinuscules(e.pese, carte)}`, e.recharge?.length && `rechargé : ${enMinuscules(e.recharge, carte)}`].filter(Boolean).join(' · ');
}

// Ordre de « Ma journée » : date puis heure, comme les relevés et épisodes sont rangés (repo.parJour). Une
// heure avant 4 h tombe le lendemain en date calendaire, donc après celles de la soirée.
const cleHeure = (x) => `${x.date} ${x.heure}`;

// Changer de jour en glissant (B4, ui/glissement.js) : un doigt posé sur la page du jour, puis levé. Les écouteurs sont
// passifs et rien n'est empêché : le défilement vertical reste celui d'iOS (touch-action: pan-y sur la page, qui ne
// garde pour elle que les gestes horizontaux).
function useGlissementJour(surGlisser) {
  const rappel = useRef(surGlisser);
  rappel.current = surGlisser;
  useEffect(() => ecouterGlissement({
    accepter: (e) => Boolean(e.target.closest && e.target.closest('main.aujourdhui')) && !departIgnore(e.target),
    surSens: (sens) => rappel.current(sens),
  }), []);
}
// Le dernier jour atteint en glissant, et de quel côté : sa page entre de ce côté (un petit déplacement de 200 ms au
// plus, supprimé avec « Réduire les animations »), le temps de l'animation.
let dernierGlissement = null;

// depuisHistorique (v6.1) : le jour a été ouvert depuis l'Historique. « ‹ Retour » y ramène, à la même position,
// et ‹ › changent de jour sans quitter l'onglet Historique. « Revenir à aujourd'hui » reste, comme ouvert autrement.
export function Aujourdhui({ date: dateRoute, depuisHistorique = false }) {
  useEtatApp((e) => e.horloge || 0);
  const maintenant = repo.maintenant();
  const aujourdhui = repo.aujourdhui();
  const date = dateRoute && dateRoute <= aujourdhui ? dateRoute : aujourdhui;
  const [indicateur, signaler] = useIndicateur();
  const [entree, setEntree] = useState(null);
  const [generation, setGeneration] = useState(0);
  const [confirmerEffacer, setConfirmerEffacer] = useState(false);
  // Détails ouverts depuis le lien d'une carte (v8, Q5) : « Détail › » du Sport et du Contact (v11 : la durée de la nuit
  // est sur la roue de sa carte, toujours visible). Fermés au départ, à chaque ouverture de l'écran et à chaque changement
  // de jour ; jamais ouverts seuls.
  const [details, setDetails] = useState({ date, ouverts: [] });
  const ouverts = details.date === date ? details.ouverts : [];
  useEffect(() => { setDetails((d) => (d.date === date ? d : { date, ouverts: [] })); }, [date]);
  const basculerDetail = (cle) => () => setDetails((d) => {
    const avant = d.date === date ? d.ouverts : [];
    return { date, ouverts: avant.includes(cle) ? avant.filter((c) => c !== cle) : [...avant, cle] };
  });
  // « J'ai fini pour ce soir » (v5) : préférence d'affichage de cet appareil, jamais une donnée
  // (rien n'est compté ni marqué ailleurs). La page repliée montre la phrase du jour.
  const cleFini = `carnet:fini:${date}`;
  const [fini, setFini] = useState(() => Boolean(lireLocal(cleFini)));
  useEffect(() => { setFini(Boolean(lireLocal(cleFini))); }, [cleFini]);
  const terminer = (oui) => {
    try { for (const k of Object.keys(localStorage)) if (k.startsWith('carnet:fini:') && k !== cleFini) localStorage.removeItem(k); } catch { /* stockage indisponible */ }
    ecrireLocal(cleFini, oui ? true : null);
    setFini(oui);
    window.scrollTo(0, 0);
  };

  const { donnees } = useDonnees(async () => {
    const [lue, items, dates, journee] = await Promise.all([repo.journal.lire(date), repo.listes.items(), repo.journal.dates(), repo.meta.lire('journee')]);
    return { entree: lue || { date }, items, baseVide: dates.length === 0, journee: normaliserJournee(journee) };
  }, [date, generation], { suivre: false });
  useEffect(() => { if (donnees) setEntree(donnees.entree); }, [donnees]);
  useEffect(() => { etatApp.maj({ jourContexte: date }); }, [date]);
  const { donnees: evenements } = useDonnees(async () => {
    // Les 7 derniers jours ne se lisent que sur la page d'aujourd'hui : ils font la ligne « Après coup » (v6).
    // v9 : les mots à soi (méta `motsPerso`), pour le libellé et la zone d'un relevé qui en cite un.
    const [episodes, symptomes, items, rdvs, avecMemo, humeurs, recents, perso] = await Promise.all([
      repo.episodes.parJour(date, date), repo.symptomes.parJour(date, date), repo.listes.items(), repo.rdv.tous(), repo.audios.parents(),
      repo.humeurs.parJour(date, date), date === aujourdhui ? repo.episodes.parJour(premierJourRecent(aujourdhui), aujourdhui) : [],
      repo.meta.lire('motsPerso'),
    ]);
    return {
      episodes, symptomes, carte: carteLibelles(items), rdv: prochainRdv(rdvs, repo.aujourdhui()), avecMemo, humeurs, perso,
      avecApresCoup: episodesRecents(recents, aujourdhui).length > 0,
    };
  }, [date]);

  const aller = (cible) => {
    let d = cible;
    if (cible === 'precedent') d = addDays(date, -1);
    if (cible === 'suivant') d = addDays(date, 1);
    if (d > aujourdhui) return false;
    if (depuisHistorique) location.hash = versHash('historique-jour', { date: d });
    else location.hash = d === aujourdhui ? '#/aujourdhui' : versHash('jour', { date: d });
    return d;
  };
  const retour = depuisHistorique ? () => { location.hash = versHash('historique'); } : null;
  // Vers la droite, la veille ; vers la gauche, le lendemain, jamais au-delà d'aujourd'hui (aller refuse).
  const [, rafraichir] = useReducer((n) => n + 1, 0);
  useGlissementJour((sens) => {
    const d = aller(sens);
    if (d) dernierGlissement = { date: d, sens };
  });
  const glisse = dernierGlissement && dernierGlissement.date === date ? dernierGlissement.sens : null;
  const charge = Boolean(donnees && entree && entree.date === date);
  const refPage = useRef(null);
  // L'entrée finit avec les animations du jour arrivé (v8, Q31), et non plus avec une minuterie de 400 ms lancée avant
  // l'arrivée de ses données : quand elles tardaient, la minuterie finissait d'abord, et le jour entrait sans glisser (ou
  // à moitié). Sans animation (« Réduire les animations »), elle finit tout de suite. Un nouveau glissement pendant
  // l'entrée coupe ses animations : leur fin ne touche pas à l'entrée du jour suivant.
  useEffect(() => {
    if (!glisse || !charge) return undefined;
    const cetteEntree = dernierGlissement;
    let fini = false;
    const finir = () => {
      if (fini || dernierGlissement !== cetteEntree) return;
      fini = true;
      dernierGlissement = null;
      rafraichir();
    };
    const page = refPage.current;
    const entrees = page && page.getAnimations
      ? page.getAnimations({ subtree: true }).filter((a) => String(a.animationName || '').startsWith('entree-')) : [];
    if (entrees.length) Promise.all(entrees.map((a) => a.finished)).then(finir, finir);
    else finir();
    return () => { fini = true; };
  }, [glisse, charge, date]);
  useEffect(() => () => { dernierGlissement = null; }, []);
  const classeEcran = `ecran aujourdhui${glisse ? ` entree-${glisse === 'precedent' ? 'veille' : 'lendemain'}` : ''}`;

  if (!charge) {
    return html`<main class=${classeEcran} ref=${refPage}><${EnteteJour} date=${date} aujourdhui=${aujourdhui} surAller=${aller} indicateur="repos" surRetour=${retour} /></main>`;
  }

  const { items, baseVide, journee } = donnees;
  const ecrire = (champ) => (valeur) => {
    setEntree((e) => ({ ...e, [champ]: valeur }));
    return ecrireAvecEssais(() => repo.journal.patch(date, { [champ]: valeur }), signaler);
  };
  const ecrireTexte = (champ) => (valeur) => ecrireAvecEssais(() => repo.journal.patch(date, { [champ]: valeur }), signaler)
    .then((r) => { setEntree((e) => ({ ...e, [champ]: valeur })); return r; });
  // Effacer, puis « Annuler » : les zones de texte, non contrôlées, renaissent à la génération suivante avec l'entrée du
  // moment. Elle est donc posée avec la génération (v11) : vide après l'effacement, relue après la restauration. Sinon,
  // l'ancienne entrée, encore là le temps de la relecture, revenait dans les zones, puis s'effaçait à son arrivée, et la
  // zone vidée enregistrait ce vide en partant : « Annuler » perdait les points positifs, les gratitudes et les notes.
  // Un autre jour ouvert entre-temps garde son entrée.
  const poserEntree = (e) => setEntree((actuelle) => (actuelle && actuelle.date === date ? e || { date } : actuelle));
  const effacerJournee = async () => {
    setConfirmerEffacer(false);
    const sauve = await repo.journal.supprimer(date);
    poserEntree(null);
    setGeneration((g) => g + 1);
    afficherToast('Journée effacée', { libelle: 'Annuler', faire: async () => {
      await repo.journal.restaurer(sauve);
      poserEntree(await repo.journal.lire(date));
      setGeneration((g) => g + 1);
    } });
  };
  const vide = Object.entries(entree).every(([k, v]) => ['date', 'createdAt', 'updatedAt'].includes(k) || v == null);
  const enVeille = date === aujourdhui && estAvantBascule(maintenant);

  const carte = carteLibelles(items);
  const nExplosions = evenements ? evenements.episodes.filter(estExplosion).length : 0;
  // Humeur du jour (v6) : le résumé dit la moyenne des notes de 1 à 10 des relevés du jour, sinon l'humeur du soir ;
  // depuis la v7, seuls les anciens relevés en ont (« humeur 6 » reste affiché, spec §5). Les champs, eux, gardent
  // l'entrée du soir telle quelle. Pendant un changement de jour, les relevés encore chargés sont ceux de l'autre
  // jour : seule l'entrée de ce jour-ci compte, et seuls les relevés de ce jour-ci donnent leurs zones.
  const duJour = avecHumeurDuJour([entree], evenements ? evenements.humeurs : []).find((j) => j.date === date);
  const phrase = phraseResume('jour', duJour, carte, { nExplosions });
  const resume = phrase.map((x) => x.texte).join('');
  // Les zones des émotions du jour, en points de couleur (v9, spec §13.4 ; v7 : leurs familles, au lieu de l'humeur moyenne).
  const zones = evenements ? zonesDuJour(evenements.humeurs.filter((h) => jourEvenement(h.date, h.heure) === date), evenements.perso) : [];
  const replie = fini && date === aujourdhui && !vide;
  const visibles = champsAffiches(journee, entree);
  // Un détail renseigné vaut aussi « Oui » quand le Oui / Non n'était pas encore choisi.
  const ecrireActivites = (activites) => {
    const changements = { activites };
    if (activites && activites.some((x) => x.type || x.duree) && entree.sportMouvement == null) changements.sportMouvement = true;
    setEntree((e) => ({ ...e, ...changements }));
    return ecrireAvecEssais(() => repo.journal.patch(date, changements), signaler);
  };
  const ecrireContacts = (contacts) => {
    const changements = { contacts };
    if (contacts && contacts.length && entree.contactHumain == null) changements.contactHumain = true;
    setEntree((e) => ({ ...e, ...changements }));
    return ecrireAvecEssais(() => repo.journal.patch(date, changements), signaler);
  };
  // Une rubrique du soir (v12, spec §5.4) : une carte, en tête l'icône grise et le titre, puis ses choix. Aucune couleur de
  // rubrique : la couleur ne dit qu'une émotion.
  const carteChamp = (cle, tete, ...contenu) => html`<div key=${cle} class="champ-jour carte-champ">${tete}${contenu}</div>`;
  // Le lien d'une carte vers son détail (v8, Q5).
  const lien = (cle, nom, texte) => ({ texte, nom, ouvert: ouverts.includes(cle), controle: `detail-${cle}`, surToucher: basculerDetail(cle) });
  const CHAMPS = {
    lieu: () => carteChamp('lieu', html`<${TeteRubrique} icone="lieu" libelle="Lieu" />`,
      html`<${Pastilles} etiquette="Lieu" options=${options(items, 'lieu', entree.lieu)} valeur=${entree.lieu} surChoix=${ecrire('lieu')} colonnes=${3} />`),
    // Sommeil (v8, spec §7 bis) : la qualité, puis la durée de la nuit, sur la roue toujours visible (v11, spec §5) : vide,
    // elle est centrée sur 7 h sans rien noter, et la nuit de la veille n'est jamais reprise. La clé porte la date : un
    // glissement en attente s'écrit sur son jour, même si le jour change avant qu'il s'arrête.
    sommeil: () => carteChamp('sommeil', html`<${TeteRubrique} icone="sommeil" libelle="Sommeil" sous="nuit dernière" />`,
      html`<${Segmente} etiquette="Sommeil" options=${options(items, 'sommeil', entree.sommeilRessenti)} valeur=${entree.sommeilRessenti} surChoix=${ecrire('sommeilRessenti')} />`,
      html`<${RoueChoix} key=${`duree-${date}`} etiquette="Durée de la nuit" options=${HEURES} valeur=${entree.heuresSommeil ?? null} centre=${7}
        surChoix=${ecrire('heuresSommeil')} />`),
    humeur: () => carteChamp('humeur', html`<${TeteRubrique} icone="humeur" libelle="Humeur" />`,
      html`<${Pastilles} etiquette="Humeur" ariaPrefixe="Humeur" options=${HUMEURS} valeur=${entree.humeur} surChoix=${ecrire('humeur')} colonnes=${5} classe="chiffres" />`),
    // Contact et Sport (v11, spec §5.4) : sous Oui / Non, la roue de l'effet du premier contact, celle de la durée de la
    // première activité, toujours visibles, avec les règles de celle du Sommeil. Une valeur notée sur rien de noté met Oui
    // (ecrireContacts, ecrireActivites) ; un Non reste un Non, et l'effacer laisse le Oui. Le reste est au détail.
    contact: () => carteChamp('contact', html`<${TeteRubrique} icone="contact" libelle="Contact humain" lien=${lien('contact', 'Contact en détail', 'Détail')} />`,
      html`<${OuiNon} etiquette="Contact humain" valeur=${entree.contactHumain} surChoix=${ecrire('contactHumain')} />`,
      html`<${RoueChoix} key=${`effet-${date}`} etiquette="Comment c'était" options=${options(items, 'contactEffet', entree.contacts?.[0]?.effet)}
        valeur=${entree.contacts?.[0]?.effet ?? null} surChoix=${(v) => ecrireContacts(changerPremiereLigne(entree.contacts, 'effet', v))} />`),
    sport: () => carteChamp('sport', html`<${TeteRubrique} icone="sport" libelle="Sport / mouvement" lien=${lien('sport', 'Sport en détail', 'Détail')} />`,
      html`<${OuiNon} etiquette="Sport / mouvement" valeur=${entree.sportMouvement} surChoix=${ecrire('sportMouvement')} />`,
      html`<${RoueChoix} key=${`duree-sport-${date}`} etiquette="Durée du sport" options=${options(items, 'dureeSport', entree.activites?.[0]?.duree)}
        valeur=${entree.activites?.[0]?.duree ?? null} surChoix=${(v) => ecrireActivites(changerPremiereLigne(entree.activites, 'duree', v))} />`),
    explosions: () => carteChamp('explosions', html`<${TeteRubrique} icone="explosions" libelle="Explosions" />`,
      html`<${Pastilles} etiquette="Explosions" ariaPrefixe="Explosions" options=${EXPLOSIONS} valeur=${entree.explosions} surChoix=${ecrire('explosions')} colonnes=${6} classe="chiffres" />`),
    traitement: () => carteChamp('traitement', html`<${TeteRubrique} icone="traitement" libelle="Traitement pris" />`,
      html`<${Segmente} etiquette="Traitement pris" options=${options(items, 'traitementPris', entree.traitementPris)} valeur=${entree.traitementPris} surChoix=${ecrire('traitementPris')} />`),
    positifs: () => carteChamp('positifs', html`<${TeteRubrique} icone="positifs" libelle="Mes points positifs" />`,
      html`<${ChampTexte} key=${`${date}-pp-${generation}`} id="points-positifs" etiquette=${null} ariaLabel="Mes points positifs" valeur=${entree.pointsPositifs}
        placeholder="Même petit. « J'ai tenu » compte aussi." lignes=${2}
        cleBrouillon=${`carnet:brouillon:${date}:pointsPositifs`} surEnregistrer=${ecrireTexte('pointsPositifs')} />`),
    // Mes gratitudes (v11, spec §6) : de même forme que les points positifs, juste dessous par défaut. Ni nombre, ni « Dit »,
    // ni partage. Comme toute zone de texte, elle n'est pas contrôlée : la clé porte la date (rien ne passe d'un jour à
    // l'autre) et la génération (le texte revient après « Annuler » d'une journée effacée).
    gratitudes: () => carteChamp('gratitudes', html`<${TeteRubrique} icone="positifs" libelle="Mes gratitudes" />`,
      html`<${ChampTexte} key=${`${date}-gr-${generation}`} id="gratitudes" etiquette=${null} ariaLabel="Mes gratitudes" valeur=${entree.gratitudes}
        placeholder="Ce pour quoi je suis reconnaissant. À qui je dis merci." lignes=${2}
        cleBrouillon=${`carnet:brouillon:${date}:gratitudes`} surEnregistrer=${ecrireTexte('gratitudes')} />`),
  };
  // Le détail du Sport et du Contact (v8, Q5) : une carte en pleine largeur, sous la paire (ou sous sa carte), ouverte par
  // le lien « Détail › » de sa carte. Leurs replis ont quitté la liste.
  const DETAILS = {
    contact: () => html`<div key="detail-contact" id="detail-contact" class="champ-jour carte-champ carte-detail">
      <${TeteRubrique} icone="contact" libelle="Contact en détail" />
      <${DetailContact} entree=${entree} items=${items} surChanger=${ecrireContacts} />
    </div>`,
    sport: () => html`<div key="detail-sport" id="detail-sport" class="champ-jour carte-champ carte-detail">
      <${TeteRubrique} icone="sport" libelle="Sport en détail" />
      <${DetailSport} entree=${entree} items=${items} surChanger=${ecrireActivites} />
    </div>`,
  };
  const detailsDe = (champs) => champs.filter((c) => DETAILS[c] && ouverts.includes(c)).map((c) => DETAILS[c]());
  // Champs dans l'ordre choisi ; Contact et Sport côte à côte quand ils se suivent, leurs détails ouverts dessous.
  const rendreChamps = () => {
    const blocs = [];
    for (let i = 0; i < visibles.length; i++) {
      const c = visibles[i];
      const suivant = visibles[i + 1];
      if ((c === 'contact' && suivant === 'sport') || (c === 'sport' && suivant === 'contact')) {
        blocs.push(html`<div key="paire" class="deux-colonnes">${CHAMPS[c]()}${CHAMPS[suivant]()}</div>`, ...detailsDe([c, suivant]));
        i += 1;
      } else blocs.push(CHAMPS[c](), ...detailsDe([c]));
    }
    return blocs;
  };
  // Ma journée (2b) : une rangée par relevé, épisode ou symptôme, dans une carte ; l'heure dans sa colonne, le repère,
  // le texte, puis le chevron d'une fiche. Le repère d'un épisode ou d'un symptôme est un petit carré neutre, en --text-2
  // (v12, spec §5.4 : un événement, pas une mesure d'émotion), celui d'un relevé un rond à la couleur de sa zone : la
  // forme les distingue.
  const ligneEvenement = (cle, href, heure, texte, memo) => html`<li key=${cle}><a class="ligne-evenement" href=${href}>
    <span class="heure">${heure || ''}</span>
    <span class="point-evenement point-parcours" aria-hidden="true"></span>
    <span class="resume">${texte}</span>
    ${memo && html`<span class="icone-memo" role="img" aria-label="avec mémo vocal">${Icones.onde()}</span>`}
    ${Icones.chevron({ trait: 2 })}</a></li>`;
  // Un relevé : « Irrité · énergie moyenne », au point de la zone de son mot (v9 ; de sa famille en v7 et v8) ; un relevé
  // sans zone (ancienne note, énergie seule, famille seule de la v7) a un point creux, le même pour tous. v9 (spec §13.1) :
  // il se rouvre d'un toucher, quel que soit le jour, sur l'écran 3 de l'Émotion du moment (son mot, « Ce que je
  // faisais », « Supprimer ce relevé ») ; il a donc son lien et son chevron, comme un épisode.
  const ligneReleve = (h) => {
    const zone = zoneDe(h.emotion, evenements.perso);
    return html`<li key=${h.id}><a class="ligne-evenement releve" href=${versHash('moment-releve', { id: h.id })}>
      <span class="heure">${h.vers ? formaterVers(h.heure) : h.heure}</span>
      <span class=${zone ? `point-evenement point-releve zone-${zone}` : 'point-evenement point-releve point-creux'} aria-hidden="true"></span>
      <span class="resume">${texteReleve(h, evenements.carte, evenements.perso)}</span>
      ${Icones.chevron({ trait: 2 })}</a></li>`;
  };
  // Ma journée (v6.1) : relevés du moment et épisodes du jour logique rangés par heure ; puis ce qui n'a pas
  // d'heure, les épisodes notés depuis la page d'un jour passé, et enfin les symptômes. Rien pour un jour sans rien.
  const lignesJournee = () => {
    const elements = [
      ...evenements.humeurs.filter((h) => texteReleve(h, evenements.carte, evenements.perso)).map((h) => ({ x: h, rendu: ligneReleve(h) })),
      ...evenements.episodes.map((ep) => ({ x: ep, rendu: ligneEvenement(ep.id, versHash('episode', { id: ep.id }), ep.heure,
        [libelle(evenements.carte, ep.emotion), ep.intensite, libelle(evenements.carte, ep.declencheur)].filter((x) => x != null).join(' · ') || 'Épisode',
        evenements.avecMemo.has(`episodes:${ep.id}`)) })),
    ];
    const parHeure = elements.filter((e) => e.x.heure).sort((a, b) => cleHeure(a.x).localeCompare(cleHeure(b.x)));
    const sansHeure = elements.filter((e) => !e.x.heure);
    return [...parHeure, ...sansHeure].map((e) => e.rendu).concat(evenements.symptomes.map((sy) => ligneEvenement(sy.id, versHash('symptome', { id: sy.id }), null,
      [libelle(evenements.carte, sy.symptome), sy.intensite, libelle(evenements.carte, sy.duree)].filter((x) => x != null).join(' · ') || 'Symptôme',
      evenements.avecMemo.has(`symptomes:${sy.id}`))));
  };
  // « J'ai fini pour ce soir » (v6.1) : à droite de « Mémo vocal », après un premier choix du soir ; en couleur action,
  // sans fond (2b).
  const finiBouton = date === aujourdhui && !vide
    ? html`<button type="button" class="btn-lien action fini-bouton" onClick=${() => terminer(true)}>${Icones.replierSoiree({ trait: 2 })}J'ai fini pour ce soir</button>`
    : null;

  return html`<main class=${classeEcran} ref=${refPage}>
    <${EnteteJour} date=${date} aujourdhui=${aujourdhui} surAller=${aller} indicateur=${indicateur} resume=${resume} zones=${zones} surRetour=${retour}
      veille=${enVeille ? `Encore ${JOURS[jourSemaine(aujourdhui)]} jusqu'à 4 h.` : null} />
    ${date !== aujourdhui && html`<a class="lien revenir" href="#/aujourdhui">Revenir à aujourd'hui</a>`}

    ${replie && html`<section class="carte fini-soir" aria-label="Ta soirée">
      <p class="phrase-recap">${phrase.map((s) => (s.valeur ? html`<span class="valeur">${s.texte}</span>` : s.texte))}</p>
      ${entree.pointsPositifs && html`<p class="fini-positifs">« ${entree.pointsPositifs} »</p>`}
      ${entree.gratitudes && html`<p class="fini-positifs">« ${entree.gratitudes} »</p>`}
      <button type="button" class="btn-lien action" onClick=${() => terminer(false)}>Rouvrir la saisie</button>
    </section>`}
    ${!replie && html`${rendreChamps()}
    <${MemoVocal} key=${`memo-${date}-${generation}`} parentStore="journal" parentId=${date} date=${date} aCote=${finiBouton} />`}
    ${date === aujourdhui && evenements && evenements.avecApresCoup && html`<a class="ligne-apres-coup-jour" href=${versHash('apres-coup-liste')}>
      <span>Après coup (TCC) · tes épisodes récents</span>${Icones.chevron({ trait: 2 })}</a>`}

    ${!replie && html`<div class="replis carte carte-groupe">
      ${repliNuitAffiche(journee, entree) && html`<${Repli} cle="nuit" titre=${NOM_NUIT} resume=${resumeNuit(entree)} icone="sommeil" resumeSous=${true}>
        <${ChampHeure} id="coucher" etiquette="Coucher" sous="la veille" valeur=${entree.heureCoucher} surChoix=${ecrire('heureCoucher')} />
        <${ChampHeure} id="lever" etiquette="Lever" valeur=${entree.heureLever} surChoix=${ecrire('heureLever')} />
        <div class="champ-jour">
          <span class="etiquette">Réveils</span>
          <${Pastilles} etiquette="Réveils" ariaPrefixe="Réveils" options=${REVEILS} valeur=${entree.reveilsNocturnes} surChoix=${ecrire('reveilsNocturnes')} colonnes=${6} classe="chiffres reveils" />
        </div>
      </${Repli}>`}
      ${repliAffiche(journee, entree) && html`<${Repli} cle="pese" titre=${NOM_PESE_RECHARGE} resume=${resumePeseRecharge(entree, carte)} icone="peseRecharge" resumeSous=${true} caler=${true}>
        <div class="champ-jour">
          <span class="etiquette">Ce qui a pesé</span>
          <${PastillesMultiples} etiquette="Ce qui a pesé" options=${options(items, 'pese', entree.pese)} valeurs=${entree.pese} surChoix=${ecrire('pese')} classe="colonnes-2 grille-choix pese-recharge" />
        </div>
        <div class="champ-jour">
          <span class="etiquette">Ce qui a rechargé</span>
          <${PastillesMultiples} etiquette="Ce qui a rechargé" options=${options(items, 'recharge', entree.recharge)} valeurs=${entree.recharge} surChoix=${ecrire('recharge')} classe="colonnes-2 grille-choix pese-recharge" />
        </div>
      </${Repli}>`}
      <${Repli} cle="notes" titre="Notes libres" resume=${entree.notes ? entree.notes.slice(0, 40) : null} icone="note" resumeSous=${true}>
        <${ChampTexte} key=${`${date}-notes-${generation}`} id="notes" etiquette=${null} ariaLabel="Notes libres" valeur=${entree.notes} lignes=${3}
          cleBrouillon=${`carnet:brouillon:${date}:notes`} surEnregistrer=${ecrireTexte('notes')} />
      </${Repli}>
    </div>`}

    ${evenements && html`<section class="evenements-jour">
      <h2 class="titre-section">Ma journée</h2>
      <ul class="liste-evenements carte carte-groupe">${lignesJournee()}</ul>
      <a class="btn-lien action ajout-symptome" href="#/symptome/nouveau">${Icones.plus({ trait: 2 })}Symptôme</a>
      ${evenements.rdv && html`<a class="ligne-rdv" href=${versHash('rdv', { id: evenements.rdv.id })}>
        ${Icones.soins()}<span>Prochain RDV : ${libelleRdv(evenements.rdv, evenements.carte)}</span></a>`}
    </section>`}

    <p class="pied-jour">Tout est facultatif. Toucher un choix une seconde fois l'efface.</p>
    ${!vide && html`<button type="button" class="lien-discret effacer-jour" onClick=${() => setConfirmerEffacer(true)}>Effacer cette journée</button>`}
    ${baseVide && vide && html`<a class="lien importer" href="#/reglages/sauvegarde">Importer une sauvegarde</a>`}
    ${confirmerEffacer && html`<${Confirmation} titre=${`Effacer la journée du ${formaterJour(date)} ?`}
      texte=${`Les épisodes, symptômes et émotions du moment de ce jour sont conservés.${evenements && evenements.avecMemo.has(`journal:${date}`) ? ' Le mémo vocal de cette journée est effacé aussi.' : ''}`}
      action="Effacer" surAnnuler=${() => setConfirmerEffacer(false)} surConfirmer=${effacerJournee} />`}
    <div class="actions-flottantes">
      <a class="action-bande moment-difficile" href="#/moment-difficile" aria-label="Moment difficile">
        ${Icones.respiration()}<span class="libelle-action">Moment difficile</span></a>
      ${date === aujourdhui && html`<a class="action-bande moment" href="#/moment" aria-label="Émotion du moment">
        ${Icones.emotion()}<span class="libelle-action">Émotion</span></a>`}
      <a class="fab" href="#/episode/nouveau" aria-label="Épisode">${Icones.plus({ trait: 2.4 })}<span class="libelle-action">Épisode</span></a>
    </div>
  </main>`;
}
