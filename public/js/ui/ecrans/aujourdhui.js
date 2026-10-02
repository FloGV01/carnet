// Écran d'ouverture : l'entrée du jour, saisie en quelques touchers, sans bouton « Enregistrer ».
import { html, useEffect, useState } from '../lib.js';
import { repo } from '../../donnees.js';
import { useDonnees, useEtatApp, useIndicateur, ecrireAvecEssais } from '../hooks.js';
import { addDays, JOURS, jourSemaine, estAvantBascule, formaterJour } from '../../domain/dates.js';
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
import { phraseResume } from '../../domain/phrase.js';
import { etatApp } from '../../store.js';
import { carteLibelles, libelle } from '../../domain/libelles.js';
import { prochainRdv } from '../../domain/soins.js';
import { libelleRdv } from './soins.js';

const HUMEURS = Array.from({ length: 10 }, (_, i) => ({ valeur: i + 1, libelle: String(i + 1) }));
const EXPLOSIONS = Array.from({ length: 6 }, (_, i) => ({ valeur: i, libelle: String(i) }));
const REVEILS = Array.from({ length: 6 }, (_, i) => ({ valeur: i, libelle: i === 5 ? '5 ou plus' : String(i) }));

export function options(items, liste, actuel) {
  return items
    .filter((i) => i.liste === liste && (!i.archive || i.id === actuel))
    .sort((a, b) => Number(a.archive) - Number(b.archive) || a.ordre - b.ordre)
    .map((i) => ({ valeur: i.id, libelle: i.libelle }));
}

function resumeNuit(e) {
  const morceaux = [];
  if (e.heureCoucher || e.heureLever) morceaux.push(`${e.heureCoucher || '·'} → ${e.heureLever || '·'}`);
  if (e.reveilsNocturnes != null) morceaux.push(e.reveilsNocturnes === 5 ? '5 réveils ou plus' : `${e.reveilsNocturnes} réveil${e.reveilsNocturnes > 1 ? 's' : ''}`);
  return morceaux.join(' · ');
}

export function Aujourdhui({ date: dateRoute }) {
  useEtatApp((e) => e.horloge || 0);
  const maintenant = repo.maintenant();
  const aujourdhui = repo.aujourdhui();
  const date = dateRoute && dateRoute <= aujourdhui ? dateRoute : aujourdhui;
  const [indicateur, signaler] = useIndicateur();
  const [entree, setEntree] = useState(null);
  const [generation, setGeneration] = useState(0);
  const [confirmerEffacer, setConfirmerEffacer] = useState(false);

  const { donnees } = useDonnees(async () => {
    const [lue, items, dates] = await Promise.all([repo.journal.lire(date), repo.listes.items(), repo.journal.dates()]);
    return { entree: lue || { date }, items, baseVide: dates.length === 0 };
  }, [date, generation], { suivre: false });
  useEffect(() => { if (donnees) setEntree(donnees.entree); }, [donnees]);
  useEffect(() => { etatApp.maj({ jourContexte: date }); }, [date]);
  const { donnees: evenements } = useDonnees(async () => {
    const [episodes, symptomes, items, rdvs, audios] = await Promise.all([
      repo.episodes.parJour(date, date), repo.symptomes.parJour(date, date), repo.listes.items(), repo.rdv.tous(), repo.audios.metas(),
    ]);
    const avecMemo = new Set(audios.map((a) => `${a.parentStore}:${a.parentId}`));
    return { episodes, symptomes, carte: carteLibelles(items), rdv: prochainRdv(rdvs, repo.aujourdhui()), avecMemo };
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

  const { items, baseVide } = donnees;
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

  const resume = phraseResume('jour', entree, carteLibelles(items)).map((x) => x.texte).join('');
  const ligneEvenement = (href, heure, texte, teinte, memo) => html`<li><a class="ligne-evenement" href=${href}>
    <span class=${`point-evenement teinte-${teinte}`} aria-hidden="true"></span>
    <span class="heure">${heure || ''}</span>
    <span class="resume">${texte}</span>
    ${memo && html`<span class="icone-memo" role="img" aria-label="avec mémo vocal">${Icones.onde()}</span>`}
    ${Icones.chevron({ trait: 2 })}</a></li>`;

  return html`<main class="ecran aujourdhui">
    <${EnteteJour} date=${date} aujourdhui=${aujourdhui} surAller=${aller} indicateur=${indicateur} resume=${resume} />
    ${enVeille && html`<p class="ligne-veille">Encore ${JOURS[jourSemaine(aujourdhui)]} jusqu'à 4 h.</p>`}
    ${date !== aujourdhui && html`<a class="lien revenir" href="#/aujourdhui">Revenir à aujourd'hui</a>`}

    <div class="champ-jour">
      <${Rubrique} teinte="lieu" icone="lieu" libelle="Lieu" />
      <${Pastilles} etiquette="Lieu" options=${options(items, 'lieu', entree.lieu)} valeur=${entree.lieu} surChoix=${ecrire('lieu')} colonnes=${3} teinte="lieu" />
    </div>
    <div class="champ-jour ligne-champ">
      <${Rubrique} teinte="sommeil" icone="sommeil" libelle="Sommeil" sous="nuit dernière" dessous=${true} />
      <${Segmente} etiquette="Sommeil" options=${options(items, 'sommeil', entree.sommeilRessenti)} valeur=${entree.sommeilRessenti} surChoix=${ecrire('sommeilRessenti')} teinte="sommeil" />
    </div>
    <div class="champ-jour">
      <${Rubrique} teinte="humeur" icone="humeur" libelle="Humeur" />
      <${Pastilles} etiquette="Humeur" ariaPrefixe="Humeur" options=${HUMEURS} valeur=${entree.humeur} surChoix=${ecrire('humeur')} colonnes=${5} classe="chiffres" teinte="humeur" />
    </div>
    <div class="champ-jour deux-colonnes">
      <div class="champ-jour"><${Rubrique} teinte="contact" icone="contact" libelle="Contact humain" /><${OuiNon} etiquette="Contact humain" valeur=${entree.contactHumain} surChoix=${ecrire('contactHumain')} teinte="contact" /></div>
      <div class="champ-jour"><${Rubrique} teinte="sport" icone="sport" libelle="Sport / mouvement" /><${OuiNon} etiquette="Sport / mouvement" valeur=${entree.sportMouvement} surChoix=${ecrire('sportMouvement')} teinte="sport" /></div>
    </div>
    <div class="champ-jour">
      <${Rubrique} teinte="expl" icone="explosions" libelle="Explosions" />
      <${Pastilles} etiquette="Explosions" ariaPrefixe="Explosions" options=${EXPLOSIONS} valeur=${entree.explosions} surChoix=${ecrire('explosions')} colonnes=${6} classe="chiffres" teinte="expl" />
    </div>
    <div class="champ-jour ligne-champ">
      <${Rubrique} teinte="trt" icone="traitement" libelle="Traitement pris" />
      <${Segmente} etiquette="Traitement pris" options=${options(items, 'traitementPris', entree.traitementPris)} valeur=${entree.traitementPris} surChoix=${ecrire('traitementPris')} teinte="trt" />
    </div>
    <div class="champ-jour">
      <${Rubrique} teinte="pos" icone="positifs" libelle="Mes points positifs" />
      <${ChampTexte} key=${`${date}-pp-${generation}`} id="points-positifs" etiquette=${null} ariaLabel="Mes points positifs" valeur=${entree.pointsPositifs}
        placeholder="Même petit. « J'ai tenu » compte aussi." lignes=${2}
        cleBrouillon=${`carnet:brouillon:${date}:pointsPositifs`} surEnregistrer=${ecrireTexte('pointsPositifs')} />
    </div>
    <${MemoVocal} key=${`memo-${date}-${generation}`} parentStore="journal" parentId=${date} date=${date} />

    <div class="replis">
      <${Repli} cle="nuit" titre="Nuit en détail" resume=${resumeNuit(entree)}>
        <${ChampHeure} id="coucher" etiquette="Coucher" sous="la veille" valeur=${entree.heureCoucher} surChoix=${ecrire('heureCoucher')} />
        <${ChampHeure} id="lever" etiquette="Lever" valeur=${entree.heureLever} surChoix=${ecrire('heureLever')} />
        <div class="champ-jour">
          <span class="etiquette">Réveils</span>
          <${Pastilles} etiquette="Réveils" ariaPrefixe="Réveils" options=${REVEILS} valeur=${entree.reveilsNocturnes} surChoix=${ecrire('reveilsNocturnes')} colonnes=${6} classe="chiffres reveils" teinte="sommeil" />
        </div>
      </${Repli}>
      <${Repli} cle="notes" titre="Notes libres" resume=${entree.notes ? entree.notes.slice(0, 40) : null}>
        <${ChampTexte} key=${`${date}-notes-${generation}`} id="notes" etiquette=${null} ariaLabel="Notes libres" valeur=${entree.notes} lignes=${3}
          cleBrouillon=${`carnet:brouillon:${date}:notes`} surEnregistrer=${ecrireTexte('notes')} />
      </${Repli}>
    </div>

    ${evenements && html`<section class="evenements-jour">
      <h2 class="libelle-section">Épisodes et symptômes</h2>
      <ul class="liste-evenements">
        ${evenements.episodes.map((ep) => ligneEvenement(versHash('episode', { id: ep.id }), ep.heure,
          [libelle(evenements.carte, ep.emotion), ep.intensite, libelle(evenements.carte, ep.declencheur)].filter((x) => x != null).join(' · ') || 'Épisode',
          'ep', evenements.avecMemo.has(`episodes:${ep.id}`)))}
        ${evenements.symptomes.map((sy) => ligneEvenement(versHash('symptome', { id: sy.id }), null,
          [libelle(evenements.carte, sy.symptome), sy.intensite, libelle(evenements.carte, sy.duree)].filter((x) => x != null).join(' · ') || 'Symptôme',
          'sy', evenements.avecMemo.has(`symptomes:${sy.id}`)))}
      </ul>
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
      <a class="pilule pas-a-pas" href=${versHash('pas-a-pas', { date })}>${Icones.pasAPas()}Pas à pas</a>
      <a class="fab" href="#/episode/nouveau">${Icones.plus({ trait: 2.2 })}<span>Épisode</span></a>
    </div>
  </main>`;
}
