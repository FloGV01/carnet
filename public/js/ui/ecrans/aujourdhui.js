// Écran d'ouverture : l'entrée du jour, saisie en quelques touchers, sans bouton « Enregistrer ».
import { html, useEffect, useLayoutEffect, useReducer, useRef, useState } from '../lib.js';
import { repo } from '../../donnees.js';
import { useDonnees, useEtatApp, useIndicateur, ecrireAvecEssais, lireLocal, ecrireLocal } from '../hooks.js';
import { addDays, JOURS, jourSemaine, jourEvenement, estAvantBascule, formaterJour, formaterVers } from '../../domain/dates.js';
import { episodesRecents, premierJourRecent } from '../../domain/apres-coup.js';
import { versHash } from '../../routeur.js';
import { EnteteJour } from '../composants/entete-jour.js';
import { Pastilles } from '../composants/pastilles.js';
import { Segmente, OuiNon } from '../composants/segmente.js';
import { ChampTexte } from '../composants/texte.js';
import { ChampHeure } from '../composants/heure.js';
import { Repli } from '../composants/repli.js';
import { Icones } from '../icones.js';
import { MemoVocal } from '../composants/memo-vocal.js';
import { afficherToast } from '../composants/toast.js';
import { Confirmation } from '../composants/confirmation.js';
import { TeteRubrique } from '../composants/rubrique.js';
import { sensGlissement, departIgnore } from '../glissement.js';
import { phraseResume, minusculeInitiale } from '../../domain/phrase.js';
import { avecHumeurDuJour } from '../../analyse/humeur-jour.js';
import { normaliserJournee, champsAffiches, repliAffiche, repliNuitAffiche, NOM_PESE_RECHARGE, NOM_NUIT } from '../../domain/journee.js';
import { HEURES_SOMMEIL, texteHeuresSommeil } from '../../domain/champs.js';
import { estExplosion } from '../../domain/explosions.js';
import { familleDe } from '../../domain/roue.js';
import { texteReleve, famillesDuJour } from '../../domain/releves.js';
import { PastillesMultiples } from '../composants/multiples.js';
import { etatApp } from '../../store.js';
import { carteLibelles, libelle } from '../../domain/libelles.js';
import { prochainRdv } from '../../domain/soins.js';
import { libelleRdv } from './soins.js';
import { noterMargeSoir } from '../mesures.js';

const HUMEURS = Array.from({ length: 10 }, (_, i) => ({ valeur: i + 1, libelle: String(i + 1) }));
const EXPLOSIONS = Array.from({ length: 6 }, (_, i) => ({ valeur: i, libelle: String(i) }));
const REVEILS = Array.from({ length: 6 }, (_, i) => ({ valeur: i, libelle: i === 5 ? '5 ou plus' : String(i) }));
// Durée de la nuit (v8, spec §7 bis) : « 4 h ou moins · 5 h · … · 10 h ou plus ». « ou moins » et « ou plus » passent sous
// le nombre, en petit (la précision d'une pastille) ; VoiceOver lit le libellé entier.
const HEURES = Array.from({ length: HEURES_SOMMEIL.max - HEURES_SOMMEIL.min + 1 }, (_, i) => {
  const h = HEURES_SOMMEIL.min + i;
  const texte = texteHeuresSommeil(h);
  return { valeur: h, libelle: texte.replace(/ (ou \w+)$/, ' ($1)'), aria: texte };
});
// Les textes que prend « Durée › » : ouvert, il garde la largeur du plus long.
const TEXTES_LIEN_DUREE = ['Durée', ...HEURES.map((h) => h.aria)];

// actuel : la valeur choisie, ou les valeurs d'un choix multiple. Un élément archivé encore choisi
// reste proposé (en dernier) pour pouvoir être vu et retiré.
export function options(items, liste, actuel) {
  const choisi = (id) => (Array.isArray(actuel) ? actuel.includes(id) : id === actuel);
  return items
    .filter((i) => i.liste === liste && (!i.archive || choisi(i.id)))
    .sort((a, b) => Number(a.archive) - Number(b.archive) || a.ordre - b.ordre)
    .map((i) => ({ valeur: i.id, libelle: i.libelle }));
}

// Plusieurs contacts (v5) : une ligne par contact (avec qui, comment c'était), comme les activités.
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
        exclusifs=${new Set()} surChoix=${changer(i, 'avec')} teinte="contact" />
      <${Segmente} etiquette=${`Contact ${i + 1} : comment c'était`} options=${options(items, 'contactEffet', l.effet)} valeur=${l.effet ?? null}
        surChoix=${changer(i, 'effet')} teinte="contact" classe="large" />
    </div>`)}
    ${lignes.length > 0 && !enPlus && html`<button type="button" class="btn-lien action" onClick=${() => setEnPlus(true)}>${Icones.plus({ trait: 2 })}Un autre contact</button>`}
  </div>`;
}

// Plusieurs activités : une ligne par activité (type, durée), une ligne vide en attente d'un choix.
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
      <${Pastilles} etiquette=${`Activité ${i + 1} : type`} options=${options(items, 'typeSport', l.type)} valeur=${l.type ?? null} surChoix=${changer(i, 'type')} classe="souples" teinte="sport" />
      <${Pastilles} etiquette=${`Activité ${i + 1} : durée`} options=${options(items, 'dureeSport', l.duree)} valeur=${l.duree ?? null} surChoix=${changer(i, 'duree')} classe="souples" teinte="sport" />
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
// garde pour elle que les gestes horizontaux). L'heure vient de performance.now(), comme celle d'un événement.
function useGlissementJour(surGlisser) {
  const rappel = useRef(surGlisser);
  rappel.current = surGlisser;
  useEffect(() => {
    let depart = null;
    const poser = (e) => {
      depart = null;
      if (e.pointerType !== 'touch' || !e.isPrimary || !e.target.closest || !e.target.closest('main.aujourdhui') || departIgnore(e.target)) return;
      depart = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
    };
    const lever = (e) => {
      if (!depart || e.pointerId !== depart.id) return;
      const sens = sensGlissement(e.clientX - depart.x, e.clientY - depart.y, performance.now() - depart.t);
      depart = null;
      if (sens) rappel.current(sens);
    };
    const annuler = () => { depart = null; };
    document.addEventListener('pointerdown', poser, { passive: true });
    document.addEventListener('pointerup', lever, { passive: true });
    document.addEventListener('pointercancel', annuler, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', poser);
      document.removeEventListener('pointerup', lever);
      document.removeEventListener('pointercancel', annuler);
    };
  }, []);
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
  // Détails ouverts depuis le lien d'une carte (v8, Q5) : « Durée › » du Sommeil, « Détail › » du Sport et du Contact.
  // Fermés au départ, à chaque ouverture de l'écran et à chaque changement de jour ; jamais ouverts seuls.
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
    const [episodes, symptomes, items, rdvs, avecMemo, humeurs, recents] = await Promise.all([
      repo.episodes.parJour(date, date), repo.symptomes.parJour(date, date), repo.listes.items(), repo.rdv.tous(), repo.audios.parents(),
      repo.humeurs.parJour(date, date), date === aujourdhui ? repo.episodes.parJour(premierJourRecent(aujourdhui), aujourdhui) : [],
    ]);
    return {
      episodes, symptomes, carte: carteLibelles(items), rdv: prochainRdv(rdvs, repo.aujourdhui()), avecMemo, humeurs,
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
  // Le Diagnostic (v8, Q27) : la marge du soir, reprise à chaque affichage et quand la fenêtre change de taille. Celle du
  // soir d'aujourd'hui seulement : un autre jour (glissé, ou ouvert depuis l'Historique) a « Revenir à aujourd'hui » ou
  // « ‹ Retour » en plus, et sa marge n'est pas celle du soir à saisir (relecture : 36 px d'écart).
  const soirDuJour = date === aujourdhui && !depuisHistorique;
  useLayoutEffect(() => { if (soirDuJour) noterMargeSoir(refPage.current); });
  useEffect(() => {
    if (!soirDuJour) return undefined;
    const surTaille = () => noterMargeSoir(refPage.current);
    window.addEventListener('resize', surTaille);
    return () => window.removeEventListener('resize', surTaille);
  }, [soirDuJour]);

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
  const effacerJournee = async () => {
    setConfirmerEffacer(false);
    const sauve = await repo.journal.supprimer(date);
    setGeneration((g) => g + 1);
    afficherToast('Journée effacée', { libelle: 'Annuler', faire: async () => { await repo.journal.restaurer(sauve); setGeneration((g) => g + 1); } });
  };
  const vide = Object.entries(entree).every(([k, v]) => ['date', 'createdAt', 'updatedAt'].includes(k) || v == null);
  const enVeille = date === aujourdhui && estAvantBascule(maintenant);

  const carte = carteLibelles(items);
  const nExplosions = evenements ? evenements.episodes.filter(estExplosion).length : 0;
  // Humeur du jour (v6) : le résumé dit la moyenne des notes de 1 à 10 des relevés du jour, sinon l'humeur du soir ;
  // depuis la v7, seuls les anciens relevés en ont (« humeur 6 » reste affiché, spec §5). Les champs, eux, gardent
  // l'entrée du soir telle quelle. Pendant un changement de jour, les relevés encore chargés sont ceux de l'autre
  // jour : seule l'entrée de ce jour-ci compte, et seuls les relevés de ce jour-ci donnent leurs familles.
  const duJour = avecHumeurDuJour([entree], evenements ? evenements.humeurs : []).find((j) => j.date === date);
  const phrase = phraseResume('jour', duJour, carte, { nExplosions });
  const resume = phrase.map((x) => x.texte).join('');
  // v7 : les familles d'émotions du jour, en points de couleur, au lieu de l'humeur moyenne (spec §5).
  const familles = famillesDuJour(evenements ? evenements.humeurs.filter((h) => jourEvenement(h.date, h.heure) === date) : []);
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
  // Une rubrique du soir (2b) : une carte, en tête le carré à sa couleur et son titre, puis ses choix.
  const carteChamp = (cle, teinte, tete, ...contenu) => html`<div key=${cle} class=${`champ-jour carte-champ teinte-${teinte}`}>${tete}${contenu}</div>`;
  // Le lien d'une carte vers son détail (v8, Q5).
  const lien = (cle, nom, texte, reserve) => ({ texte, nom, ouvert: ouverts.includes(cle), controle: `detail-${cle}`, surToucher: basculerDetail(cle), reserve });
  const heures = texteHeuresSommeil(entree.heuresSommeil);
  const CHAMPS = {
    lieu: () => carteChamp('lieu', 'lieu', html`<${TeteRubrique} icone="lieu" libelle="Lieu" />`,
      html`<${Pastilles} etiquette="Lieu" options=${options(items, 'lieu', entree.lieu)} valeur=${entree.lieu} surChoix=${ecrire('lieu')} colonnes=${3} teinte="lieu" />`),
    // Sommeil (v8, spec §7 bis) : la qualité, puis la durée de la nuit. Le soir ne tiendrait plus sans défiler avec les deux
    // rangées (docs/decisions.md) : la Durée s'ouvre par « Durée › », qui dit la durée notée (« 6 h › ») et, ouvert, garde
    // la largeur de la plus longue (en grand texte, noter une durée ne fait pas passer le titre à la ligne).
    sommeil: () => carteChamp('sommeil', 'sommeil', html`<${TeteRubrique} icone="sommeil" libelle="Sommeil" sous="nuit dernière"
        lien=${lien('duree', heures ? `Durée de la nuit : ${heures}` : 'Durée de la nuit', heures || 'Durée', TEXTES_LIEN_DUREE)} />`,
      html`<${Segmente} etiquette="Sommeil" options=${options(items, 'sommeil', entree.sommeilRessenti)} valeur=${entree.sommeilRessenti} surChoix=${ecrire('sommeilRessenti')} teinte="sommeil" />`,
      ouverts.includes('duree') && html`<div class="detail-duree" id="detail-duree">
        <${Pastilles} etiquette="Durée de la nuit" options=${HEURES} valeur=${entree.heuresSommeil ?? null} surChoix=${ecrire('heuresSommeil')} classe="heures-sommeil" teinte="sommeil" />
      </div>`),
    humeur: () => carteChamp('humeur', 'humeur', html`<${TeteRubrique} icone="humeur" libelle="Humeur" />`,
      html`<${Pastilles} etiquette="Humeur" ariaPrefixe="Humeur" options=${HUMEURS} valeur=${entree.humeur} surChoix=${ecrire('humeur')} colonnes=${5} classe="chiffres" teinte="humeur" />`),
    contact: () => carteChamp('contact', 'contact', html`<${TeteRubrique} icone="contact" libelle="Contact humain" lien=${lien('contact', 'Contact en détail', 'Détail')} />`,
      html`<${OuiNon} etiquette="Contact humain" valeur=${entree.contactHumain} surChoix=${ecrire('contactHumain')} teinte="contact" />`),
    sport: () => carteChamp('sport', 'sport', html`<${TeteRubrique} icone="sport" libelle="Sport / mouvement" lien=${lien('sport', 'Sport en détail', 'Détail')} />`,
      html`<${OuiNon} etiquette="Sport / mouvement" valeur=${entree.sportMouvement} surChoix=${ecrire('sportMouvement')} teinte="sport" />`),
    explosions: () => carteChamp('explosions', 'expl', html`<${TeteRubrique} icone="explosions" libelle="Explosions" />`,
      html`<${Pastilles} etiquette="Explosions" ariaPrefixe="Explosions" options=${EXPLOSIONS} valeur=${entree.explosions} surChoix=${ecrire('explosions')} colonnes=${6} classe="chiffres" teinte="expl" />`),
    traitement: () => carteChamp('traitement', 'trt', html`<${TeteRubrique} icone="traitement" libelle="Traitement pris" />`,
      html`<${Segmente} etiquette="Traitement pris" options=${options(items, 'traitementPris', entree.traitementPris)} valeur=${entree.traitementPris} surChoix=${ecrire('traitementPris')} teinte="trt" />`),
    positifs: () => carteChamp('positifs', 'pos', html`<${TeteRubrique} icone="positifs" libelle="Mes points positifs" />`,
      html`<${ChampTexte} key=${`${date}-pp-${generation}`} id="points-positifs" etiquette=${null} ariaLabel="Mes points positifs" valeur=${entree.pointsPositifs}
        placeholder="Même petit. « J'ai tenu » compte aussi." lignes=${2}
        cleBrouillon=${`carnet:brouillon:${date}:pointsPositifs`} surEnregistrer=${ecrireTexte('pointsPositifs')} />`),
  };
  // Le détail du Sport et du Contact (v8, Q5) : une carte en pleine largeur, sous la paire (ou sous sa carte), ouverte par
  // le lien « Détail › » de sa carte. Leurs replis ont quitté la liste.
  const DETAILS = {
    contact: () => html`<div key="detail-contact" id="detail-contact" class="champ-jour carte-champ carte-detail teinte-contact">
      <${TeteRubrique} icone="contact" libelle="Contact en détail" />
      <${DetailContact} entree=${entree} items=${items} surChanger=${ecrireContacts} />
    </div>`,
    sport: () => html`<div key="detail-sport" id="detail-sport" class="champ-jour carte-champ carte-detail teinte-sport">
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
  // le texte, puis le chevron d'une fiche. Le repère d'un épisode ou d'un symptôme est un petit carré à la couleur de
  // son parcours, celui d'un relevé un rond : des couleurs de parcours et de familles se ressemblent (Symptôme et
  // Sérénité, Épisode et Peur), la forme les distingue.
  const ligneEvenement = (cle, href, heure, texte, teinte, memo) => html`<li key=${cle}><a class="ligne-evenement" href=${href}>
    <span class="heure">${heure || ''}</span>
    <span class=${`point-evenement point-parcours teinte-${teinte}`} aria-hidden="true"></span>
    <span class="resume">${texte}</span>
    ${memo && html`<span class="icone-memo" role="img" aria-label="avec mémo vocal">${Icones.onde()}</span>`}
    ${Icones.chevron({ trait: 2 })}</a></li>`;
  // Un relevé n'a ni lien ni chevron : il s'efface dans l'écran Émotion du moment. « Irrité · énergie moyenne », au point
  // de sa famille (v7) ; un relevé sans émotion (ancienne note, énergie seule) a un point creux, le même pour tous.
  const ligneReleve = (h) => {
    const famille = familleDe(h.emotion);
    return html`<li key=${h.id}><div class="ligne-evenement releve">
      <span class="heure">${h.vers ? formaterVers(h.heure) : h.heure}</span>
      <span class=${famille ? `point-evenement point-releve emo-${famille}` : 'point-evenement point-releve point-creux'} aria-hidden="true"></span>
      <span class="resume">${texteReleve(h, evenements.carte)}</span></div></li>`;
  };
  // Ma journée (v6.1) : relevés du moment et épisodes du jour logique rangés par heure ; puis ce qui n'a pas
  // d'heure, les épisodes notés depuis la page d'un jour passé, et enfin les symptômes. Rien pour un jour sans rien.
  const lignesJournee = () => {
    const elements = [
      ...evenements.humeurs.filter((h) => texteReleve(h, evenements.carte)).map((h) => ({ x: h, rendu: ligneReleve(h) })),
      ...evenements.episodes.map((ep) => ({ x: ep, rendu: ligneEvenement(ep.id, versHash('episode', { id: ep.id }), ep.heure,
        [libelle(evenements.carte, ep.emotion), ep.intensite, libelle(evenements.carte, ep.declencheur)].filter((x) => x != null).join(' · ') || 'Épisode',
        'ep', evenements.avecMemo.has(`episodes:${ep.id}`)) })),
    ];
    const parHeure = elements.filter((e) => e.x.heure).sort((a, b) => cleHeure(a.x).localeCompare(cleHeure(b.x)));
    const sansHeure = elements.filter((e) => !e.x.heure);
    return [...parHeure, ...sansHeure].map((e) => e.rendu).concat(evenements.symptomes.map((sy) => ligneEvenement(sy.id, versHash('symptome', { id: sy.id }), null,
      [libelle(evenements.carte, sy.symptome), sy.intensite, libelle(evenements.carte, sy.duree)].filter((x) => x != null).join(' · ') || 'Symptôme',
      'sy', evenements.avecMemo.has(`symptomes:${sy.id}`))));
  };
  // « J'ai fini pour ce soir » (v6.1) : à droite de « Mémo vocal », après un premier choix du soir ; en couleur action,
  // sans fond (2b).
  const finiBouton = date === aujourdhui && !vide
    ? html`<button type="button" class="btn-lien action fini-bouton" onClick=${() => terminer(true)}>${Icones.replierSoiree({ trait: 2 })}J'ai fini pour ce soir</button>`
    : null;

  return html`<main class=${classeEcran} ref=${refPage}>
    <${EnteteJour} date=${date} aujourdhui=${aujourdhui} surAller=${aller} indicateur=${indicateur} resume=${resume} familles=${familles} surRetour=${retour}
      veille=${enVeille ? `Encore ${JOURS[jourSemaine(aujourdhui)]} jusqu'à 4 h.` : null} />
    ${date !== aujourdhui && html`<a class="lien revenir" href="#/aujourdhui">Revenir à aujourd'hui</a>`}

    ${replie && html`<section class="carte fini-soir" aria-label="Ta soirée">
      <p class="phrase-recap">${phrase.map((s) => (s.valeur ? html`<span class="valeur">${s.texte}</span>` : s.texte))}</p>
      ${entree.pointsPositifs && html`<p class="fini-positifs">« ${entree.pointsPositifs} »</p>`}
      <button type="button" class="btn-lien action" onClick=${() => terminer(false)}>Rouvrir la saisie</button>
    </section>`}
    ${!replie && html`${rendreChamps()}
    <${MemoVocal} key=${`memo-${date}-${generation}`} parentStore="journal" parentId=${date} date=${date} aCote=${finiBouton} />`}
    ${date === aujourdhui && evenements && evenements.avecApresCoup && html`<a class="ligne-apres-coup-jour" href=${versHash('apres-coup-liste')}>
      <span>Après coup (TCC) · tes épisodes récents</span>${Icones.chevron({ trait: 2 })}</a>`}

    ${!replie && html`<div class="replis carte carte-groupe">
      ${repliNuitAffiche(journee, entree) && html`<${Repli} cle="nuit" titre=${NOM_NUIT} resume=${resumeNuit(entree)} icone="sommeil" teinte="sommeil" resumeSous=${true}>
        <${ChampHeure} id="coucher" etiquette="Coucher" sous="la veille" valeur=${entree.heureCoucher} surChoix=${ecrire('heureCoucher')} />
        <${ChampHeure} id="lever" etiquette="Lever" valeur=${entree.heureLever} surChoix=${ecrire('heureLever')} />
        <div class="champ-jour">
          <span class="etiquette">Réveils</span>
          <${Pastilles} etiquette="Réveils" ariaPrefixe="Réveils" options=${REVEILS} valeur=${entree.reveilsNocturnes} surChoix=${ecrire('reveilsNocturnes')} colonnes=${6} classe="chiffres reveils" teinte="sommeil" />
        </div>
      </${Repli}>`}
      ${repliAffiche(journee, entree) && html`<${Repli} cle="pese" titre=${NOM_PESE_RECHARGE} resume=${resumePeseRecharge(entree, carte)} icone="peseRecharge" teinte="energie" resumeSous=${true} caler=${true}>
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
      <h2 class="libelle-section">Ma journée</h2>
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
      <a class="action-bande moment-difficile teinte-difficile" href="#/moment-difficile" aria-label="Moment difficile">
        <span class="carre-action" aria-hidden="true">${Icones.respiration()}</span><span class="libelle-action">Moment difficile</span></a>
      ${date === aujourdhui && html`<a class="action-bande moment teinte-humeur" href="#/moment" aria-label="Émotion du moment">
        <span class="carre-action" aria-hidden="true">${Icones.emotion()}</span><span class="libelle-action">Émotion</span></a>`}
      <a class="fab" href="#/episode/nouveau" aria-label="Épisode">${Icones.plus({ trait: 2.2 })}<span class="libelle-action">Épisode</span></a>
    </div>
  </main>`;
}
