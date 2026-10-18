// Écran d'ouverture : l'entrée du jour, saisie en quelques touchers, sans bouton « Enregistrer ».
import { html, useEffect, useState } from '../lib.js';
import { repo } from '../../donnees.js';
import { useDonnees, useEtatApp, useIndicateur, ecrireAvecEssais, lireLocal, ecrireLocal } from '../hooks.js';
import { addDays, JOURS, jourSemaine, estAvantBascule, formaterJour, formaterVers } from '../../domain/dates.js';
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
import { Rubrique } from '../composants/rubrique.js';
import { phraseResume, minusculeInitiale } from '../../domain/phrase.js';
import { avecHumeurDuJour } from '../../analyse/humeur-jour.js';
import { normaliserJournee, champsAffiches, repliAffiche, NOM_PESE_RECHARGE } from '../../domain/journee.js';
import { estExplosion } from '../../domain/explosions.js';
import { PastillesMultiples } from '../composants/multiples.js';
import { etatApp } from '../../store.js';
import { carteLibelles, libelle } from '../../domain/libelles.js';
import { resumeContacts } from '../../domain/contacts.js';
import { prochainRdv } from '../../domain/soins.js';
import { libelleRdv } from './soins.js';

const HUMEURS = Array.from({ length: 10 }, (_, i) => ({ valeur: i + 1, libelle: String(i + 1) }));
const EXPLOSIONS = Array.from({ length: 6 }, (_, i) => ({ valeur: i, libelle: String(i) }));
const REVEILS = Array.from({ length: 6 }, (_, i) => ({ valeur: i, libelle: i === 5 ? '5 ou plus' : String(i) }));

// actuel : la valeur choisie, ou les valeurs d'un choix multiple. Un élément archivé encore choisi
// reste proposé (en dernier) pour pouvoir être vu et retiré.
export function options(items, liste, actuel) {
  const choisi = (id) => (Array.isArray(actuel) ? actuel.includes(id) : id === actuel);
  return items
    .filter((i) => i.liste === liste && (!i.archive || choisi(i.id)))
    .sort((a, b) => Number(a.archive) - Number(b.archive) || a.ordre - b.ordre)
    .map((i) => ({ valeur: i.id, libelle: i.libelle }));
}

// Détails du soir (v4) : « Marche 30 à 60 min · Vélo » ; « Famille, Collègues · Coûteux ».
function resumeSport(e, carte) {
  return (e.activites || []).map((a) => [a.type && libelle(carte, a.type), a.duree && libelle(carte, a.duree)].filter(Boolean).join(' ')).filter(Boolean).join(' · ');
}
const resumeContact = (e, carte) => resumeContacts(e.contacts, (id) => libelle(carte, id));

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

// Ce qui a pesé, ce qui a rechargé (v6) : « pesé : bruit, trajets · rechargé : calme ».
function resumePeseRecharge(e, carte) {
  const liste = (ids) => ids.map((id) => minusculeInitiale(libelle(carte, id))).join(', ');
  return [e.pese?.length && `pesé : ${liste(e.pese)}`, e.recharge?.length && `rechargé : ${liste(e.recharge)}`].filter(Boolean).join(' · ');
}

// Une humeur du moment dans « Ma journée » (v6.1) : « humeur 6 · énergie moyenne », un champ absent omis.
// L'heure (« 10:20 », ou « vers 14 h ») est dans sa colonne.
function texteReleve(h, carte) {
  return [h.humeur != null && `humeur ${h.humeur}`, h.energie && `énergie ${minusculeInitiale(libelle(carte, h.energie))}`].filter(Boolean).join(' · ');
}
// Ordre de « Ma journée » : date puis heure, comme les relevés et épisodes sont rangés (repo.parJour). Une
// heure avant 4 h tombe le lendemain en date calendaire, donc après celles de la soirée.
const cleHeure = (x) => `${x.date} ${x.heure || ''}`;

export function Aujourdhui({ date: dateRoute }) {
  useEtatApp((e) => e.horloge || 0);
  const maintenant = repo.maintenant();
  const aujourdhui = repo.aujourdhui();
  const date = dateRoute && dateRoute <= aujourdhui ? dateRoute : aujourdhui;
  const [indicateur, signaler] = useIndicateur();
  const [entree, setEntree] = useState(null);
  const [generation, setGeneration] = useState(0);
  const [confirmerEffacer, setConfirmerEffacer] = useState(false);
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
    if (d > aujourdhui) return;
    location.hash = d === aujourdhui ? '#/aujourdhui' : versHash('jour', { date: d });
  };

  if (!donnees || !entree || entree.date !== date) {
    return html`<main class="ecran aujourdhui"><${EnteteJour} date=${date} aujourdhui=${aujourdhui} surAller=${aller} indicateur="repos" /></main>`;
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
  // Humeur du jour (v6) : le résumé dit la moyenne des humeurs du moment du jour, sinon l'humeur du
  // soir. Les champs, eux, gardent l'entrée du soir telle quelle. Pendant un changement de jour, les
  // relevés encore chargés sont ceux de l'autre jour : seule l'entrée de ce jour-ci compte.
  const duJour = avecHumeurDuJour([entree], evenements ? evenements.humeurs : []).find((j) => j.date === date);
  const phrase = phraseResume('jour', duJour, carte, { nExplosions });
  const resume = phrase.map((x) => x.texte).join('');
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
  const CHAMPS = {
    lieu: () => html`<div class="champ-jour">
      <${Rubrique} teinte="lieu" icone="lieu" libelle="Lieu" />
      <${Pastilles} etiquette="Lieu" options=${options(items, 'lieu', entree.lieu)} valeur=${entree.lieu} surChoix=${ecrire('lieu')} colonnes=${3} teinte="lieu" />
    </div>`,
    sommeil: () => html`<div class="champ-jour ligne-champ">
      <${Rubrique} teinte="sommeil" icone="sommeil" libelle="Sommeil" sous="nuit dernière" dessous=${true} />
      <${Segmente} etiquette="Sommeil" options=${options(items, 'sommeil', entree.sommeilRessenti)} valeur=${entree.sommeilRessenti} surChoix=${ecrire('sommeilRessenti')} teinte="sommeil" />
    </div>`,
    humeur: () => html`<div class="champ-jour">
      <${Rubrique} teinte="humeur" icone="humeur" libelle="Humeur" />
      <${Pastilles} etiquette="Humeur" ariaPrefixe="Humeur" options=${HUMEURS} valeur=${entree.humeur} surChoix=${ecrire('humeur')} colonnes=${5} classe="chiffres" teinte="humeur" />
    </div>`,
    // Seul sur sa ligne (l'autre est masqué ou ailleurs dans l'ordre) : libellé à gauche, Oui / Non à droite.
    contact: (seul) => html`<div class=${seul ? 'champ-jour ligne-champ' : 'champ-jour'}><${Rubrique} teinte="contact" icone="contact" libelle="Contact humain" /><${OuiNon} etiquette="Contact humain" valeur=${entree.contactHumain} surChoix=${ecrire('contactHumain')} teinte="contact" /></div>`,
    sport: (seul) => html`<div class=${seul ? 'champ-jour ligne-champ' : 'champ-jour'}><${Rubrique} teinte="sport" icone="sport" libelle="Sport / mouvement" /><${OuiNon} etiquette="Sport / mouvement" valeur=${entree.sportMouvement} surChoix=${ecrire('sportMouvement')} teinte="sport" /></div>`,
    explosions: () => html`<div class="champ-jour">
      <${Rubrique} teinte="expl" icone="explosions" libelle="Explosions" />
      <${Pastilles} etiquette="Explosions" ariaPrefixe="Explosions" options=${EXPLOSIONS} valeur=${entree.explosions} surChoix=${ecrire('explosions')} colonnes=${6} classe="chiffres" teinte="expl" />
    </div>`,
    traitement: () => html`<div class="champ-jour ligne-champ">
      <${Rubrique} teinte="trt" icone="traitement" libelle="Traitement pris" />
      <${Segmente} etiquette="Traitement pris" options=${options(items, 'traitementPris', entree.traitementPris)} valeur=${entree.traitementPris} surChoix=${ecrire('traitementPris')} teinte="trt" />
    </div>`,
    positifs: () => html`<div class="champ-jour">
      <${Rubrique} teinte="pos" icone="positifs" libelle="Mes points positifs" />
      <${ChampTexte} key=${`${date}-pp-${generation}`} id="points-positifs" etiquette=${null} ariaLabel="Mes points positifs" valeur=${entree.pointsPositifs}
        placeholder="Même petit. « J'ai tenu » compte aussi." lignes=${2}
        cleBrouillon=${`carnet:brouillon:${date}:pointsPositifs`} surEnregistrer=${ecrireTexte('pointsPositifs')} />
    </div>`,
  };
  // Champs dans l'ordre choisi ; Contact et Sport côte à côte quand ils se suivent.
  const rendreChamps = () => {
    const blocs = [];
    for (let i = 0; i < visibles.length; i++) {
      const c = visibles[i];
      const suivant = visibles[i + 1];
      if ((c === 'contact' && suivant === 'sport') || (c === 'sport' && suivant === 'contact')) {
        blocs.push(html`<div class="champ-jour deux-colonnes">${CHAMPS[c](false)}${CHAMPS[suivant](false)}</div>`);
        i += 1;
      } else blocs.push(CHAMPS[c](true));
    }
    return blocs;
  };
  const ligneEvenement = (cle, href, heure, texte, teinte, memo) => html`<li key=${cle}><a class="ligne-evenement" href=${href}>
    <span class=${`point-evenement teinte-${teinte}`} aria-hidden="true"></span>
    <span class="heure">${heure || ''}</span>
    <span class="resume">${texte}</span>
    ${memo && html`<span class="icone-memo" role="img" aria-label="avec mémo vocal">${Icones.onde()}</span>`}
    ${Icones.chevron({ trait: 2 })}</a></li>`;
  // Un relevé n'a ni lien ni chevron : il s'efface dans l'écran Humeur du moment. Le même point creux pour
  // tous, quelle que soit l'humeur.
  const ligneReleve = (h) => html`<li key=${h.id}><div class="ligne-evenement releve">
    <span class="point-evenement point-releve teinte-humeur" aria-hidden="true"></span>
    <span class="heure">${h.vers ? formaterVers(h.heure) : h.heure}</span>
    <span class="resume">${texteReleve(h, evenements.carte)}</span></div></li>`;
  // Ma journée (v6.1) : humeurs du moment et épisodes du jour logique rangés par heure, puis les symptômes,
  // qui n'ont pas d'heure. Rien pour un jour sans rien.
  const lignesJournee = () => {
    const parHeure = [
      ...evenements.humeurs.map((h) => ({ cle: cleHeure(h), rendu: ligneReleve(h) })),
      ...evenements.episodes.map((ep) => ({ cle: cleHeure(ep), rendu: ligneEvenement(ep.id, versHash('episode', { id: ep.id }), ep.heure,
        [libelle(evenements.carte, ep.emotion), ep.intensite, libelle(evenements.carte, ep.declencheur)].filter((x) => x != null).join(' · ') || 'Épisode',
        'ep', evenements.avecMemo.has(`episodes:${ep.id}`)) })),
    ].sort((a, b) => a.cle.localeCompare(b.cle));
    return [...parHeure.map((x) => x.rendu), ...evenements.symptomes.map((sy) => ligneEvenement(sy.id, versHash('symptome', { id: sy.id }), null,
      [libelle(evenements.carte, sy.symptome), sy.intensite, libelle(evenements.carte, sy.duree)].filter((x) => x != null).join(' · ') || 'Symptôme',
      'sy', evenements.avecMemo.has(`symptomes:${sy.id}`)))];
  };
  // « J'ai fini pour ce soir » (v6.1) : à droite de « Mémo vocal », après un premier choix du soir.
  const finiBouton = date === aujourdhui && !vide ? html`<button type="button" class="btn fini-bouton" onClick=${() => terminer(true)}>J'ai fini pour ce soir</button>` : null;

  return html`<main class="ecran aujourdhui">
    <${EnteteJour} date=${date} aujourdhui=${aujourdhui} surAller=${aller} indicateur=${indicateur} resume=${resume} />
    ${enVeille && html`<p class="ligne-veille">Encore ${JOURS[jourSemaine(aujourdhui)]} jusqu'à 4 h.</p>`}
    ${date !== aujourdhui && html`<a class="lien revenir" href="#/aujourdhui">Revenir à aujourd'hui</a>`}

    ${replie && html`<section class="carte fini-soir" aria-label="Ta soirée">
      <p class="phrase-recap">${phrase.map((s) => (s.valeur ? html`<span class=${`valeur teinte-${s.rubrique}`}>${s.texte}</span>` : s.texte))}</p>
      ${entree.pointsPositifs && html`<p class="fini-positifs">« ${entree.pointsPositifs} »</p>`}
      <button type="button" class="btn-lien action" onClick=${() => terminer(false)}>Rouvrir la saisie</button>
    </section>`}
    ${!replie && html`${rendreChamps()}
    <${MemoVocal} key=${`memo-${date}-${generation}`} parentStore="journal" parentId=${date} date=${date} aCote=${finiBouton} />`}
    ${date === aujourdhui && evenements && evenements.avecApresCoup && html`<a class="ligne-apres-coup-jour" href=${versHash('apres-coup-liste')}>
      <span>Après coup (TCC) · tes épisodes récents</span>${Icones.chevron({ trait: 2 })}</a>`}

    ${!replie && html`<div class="replis">
      ${(visibles.includes('sommeil') || resumeNuit(entree)) && html`<${Repli} cle="nuit" titre="Nuit en détail" resume=${resumeNuit(entree)}>
        <${ChampHeure} id="coucher" etiquette="Coucher" sous="la veille" valeur=${entree.heureCoucher} surChoix=${ecrire('heureCoucher')} />
        <${ChampHeure} id="lever" etiquette="Lever" valeur=${entree.heureLever} surChoix=${ecrire('heureLever')} />
        <div class="champ-jour">
          <span class="etiquette">Réveils</span>
          <${Pastilles} etiquette="Réveils" ariaPrefixe="Réveils" options=${REVEILS} valeur=${entree.reveilsNocturnes} surChoix=${ecrire('reveilsNocturnes')} colonnes=${6} classe="chiffres reveils" teinte="sommeil" />
        </div>
      </${Repli}>`}
      ${repliAffiche(journee, entree) && html`<${Repli} cle="pese" titre=${NOM_PESE_RECHARGE} resume=${resumePeseRecharge(entree, carte)} resumeSous=${true} caler=${true}>
        <div class="champ-jour">
          <span class="etiquette">Ce qui a pesé</span>
          <${PastillesMultiples} etiquette="Ce qui a pesé" options=${options(items, 'pese', entree.pese)} valeurs=${entree.pese} surChoix=${ecrire('pese')} classe="colonnes-2 grille-choix pese-recharge" />
        </div>
        <div class="champ-jour">
          <span class="etiquette">Ce qui a rechargé</span>
          <${PastillesMultiples} etiquette="Ce qui a rechargé" options=${options(items, 'recharge', entree.recharge)} valeurs=${entree.recharge} surChoix=${ecrire('recharge')} classe="colonnes-2 grille-choix pese-recharge" />
        </div>
      </${Repli}>`}
      ${visibles.includes('sport') && html`<${Repli} cle="sport" titre="Sport en détail" resume=${resumeSport(entree, carte)} memoriser=${false}>
        <${DetailSport} entree=${entree} items=${items} surChanger=${ecrireActivites} />
      </${Repli}>`}
      ${visibles.includes('contact') && html`<${Repli} cle="contact" titre="Contact en détail" resume=${resumeContact(entree, carte)} memoriser=${false}>
        <${DetailContact} entree=${entree} items=${items} surChanger=${ecrireContacts} />
      </${Repli}>`}
      <${Repli} cle="notes" titre="Notes libres" resume=${entree.notes ? entree.notes.slice(0, 40) : null}>
        <${ChampTexte} key=${`${date}-notes-${generation}`} id="notes" etiquette=${null} ariaLabel="Notes libres" valeur=${entree.notes} lignes=${3}
          cleBrouillon=${`carnet:brouillon:${date}:notes`} surEnregistrer=${ecrireTexte('notes')} />
      </${Repli}>
    </div>`}

    ${evenements && html`<section class="evenements-jour">
      <h2 class="libelle-section">Ma journée</h2>
      <ul class="liste-evenements">${lignesJournee()}</ul>
      <a class="btn-lien action ajout-symptome" href="#/symptome/nouveau">${Icones.plus({ trait: 2 })}Symptôme</a>
      ${evenements.rdv && html`<a class="ligne-rdv" href=${versHash('rdv', { id: evenements.rdv.id })}>
        ${Icones.soins()}<span>Prochain RDV : ${libelleRdv(evenements.rdv, evenements.carte)}</span></a>`}
    </section>`}

    <p class="pied-jour">Tout est facultatif. Toucher un choix une seconde fois l'efface.</p>
    ${!vide && html`<button type="button" class="lien-discret effacer-jour" onClick=${() => setConfirmerEffacer(true)}>Effacer cette journée</button>`}
    ${baseVide && vide && html`<a class="lien importer" href="#/reglages/sauvegarde">Importer une sauvegarde</a>`}
    ${confirmerEffacer && html`<${Confirmation} titre=${`Effacer la journée du ${formaterJour(date)} ?`}
      texte=${`Les épisodes et symptômes de ce jour sont conservés.${evenements && evenements.avecMemo.has(`journal:${date}`) ? ' Le mémo vocal de cette journée est effacé aussi.' : ''}`}
      action="Effacer" surAnnuler=${() => setConfirmerEffacer(false)} surConfirmer=${effacerJournee} />`}
    <div class="actions-flottantes">
      <a class="pilule moment-difficile" href="#/moment-difficile" aria-label="Moment difficile">${Icones.respiration()}<span class="libelle-action">Moment difficile</span></a>
      ${date === aujourdhui && html`<a class="pilule moment" href="#/moment" aria-label="Humeur du moment">${Icones.humeur()}<span class="libelle-action">Humeur</span></a>`}
      <a class="fab" href="#/episode/nouveau">${Icones.plus({ trait: 2.2 })}<span>Épisode</span></a>
    </div>
  </main>`;
}
