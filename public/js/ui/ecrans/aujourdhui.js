// Écran d'ouverture : l'entrée du jour, saisie en quelques touchers, sans bouton « Enregistrer ».
import { html, useEffect, useState } from '../lib.js';
import { repo } from '../../donnees.js';
import { useDonnees, useEtatApp, useIndicateur, ecrireAvecEssais } from '../hooks.js';
import { addDays, JOURS, jourSemaine, estAvantBascule } from '../../domain/dates.js';
import { versHash } from '../../routeur.js';
import { EnteteJour } from '../composants/entete-jour.js';
import { Pastilles } from '../composants/pastilles.js';
import { Segmente, OuiNon } from '../composants/segmente.js';
import { ChampTexte } from '../composants/texte.js';
import { ChampHeure } from '../composants/heure.js';
import { Repli } from '../composants/repli.js';

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

  const { donnees } = useDonnees(async () => {
    const [lue, items, dates] = await Promise.all([repo.journal.lire(date), repo.listes.items(), repo.journal.dates()]);
    return { entree: lue || { date }, items, baseVide: dates.length === 0 };
  }, [date], { suivre: false });
  useEffect(() => { if (donnees) setEntree(donnees.entree); }, [donnees]);

  const aller = (cible) => {
    let d = cible;
    if (cible === 'precedent') d = addDays(date, -1);
    if (cible === 'suivant') d = addDays(date, 1);
    if (d > aujourdhui) return;
    location.hash = d === aujourdhui ? '#/aujourdhui' : versHash('jour', { date: d });
  };

  if (!donnees || !entree || entree.date !== date) {
    return html`<main class="ecran"><${EnteteJour} date=${date} aujourdhui=${aujourdhui} surAller=${aller} indicateur="repos" /></main>`;
  }

  const { items, baseVide } = donnees;
  const ecrire = (champ) => (valeur) => {
    setEntree((e) => ({ ...e, [champ]: valeur }));
    return ecrireAvecEssais(() => repo.journal.patch(date, { [champ]: valeur }), signaler);
  };
  const ecrireTexte = (champ) => (valeur) => ecrireAvecEssais(() => repo.journal.patch(date, { [champ]: valeur }), signaler)
    .then((r) => { setEntree((e) => ({ ...e, [champ]: valeur })); return r; });
  const vide = Object.entries(entree).every(([k, v]) => ['date', 'createdAt', 'updatedAt'].includes(k) || v == null);
  const enVeille = date === aujourdhui && estAvantBascule(maintenant);

  return html`<main class="ecran aujourdhui">
    <${EnteteJour} date=${date} aujourdhui=${aujourdhui} surAller=${aller} indicateur=${indicateur} />
    ${enVeille && html`<p class="discret ligne-info">Encore ${JOURS[jourSemaine(aujourdhui)]} jusqu'à 4 h.</p>`}
    ${date !== aujourdhui && html`<a class="ligne-info lien" href="#/aujourdhui">Revenir à aujourd'hui</a>`}

    <div class="champ">
      <span class="etiquette" id="et-lieu">Lieu</span>
      <${Pastilles} etiquette="Lieu" options=${options(items, 'lieu', entree.lieu)} valeur=${entree.lieu} surChoix=${ecrire('lieu')} colonnes=${3} />
    </div>
    <div class="champ ligne-champ">
      <span class="etiquette">Sommeil <span class="discret">(nuit dernière)</span></span>
      <${Segmente} etiquette="Sommeil" options=${options(items, 'sommeil', entree.sommeilRessenti)} valeur=${entree.sommeilRessenti} surChoix=${ecrire('sommeilRessenti')} />
    </div>
    <div class="champ">
      <span class="etiquette">Humeur</span>
      <${Pastilles} etiquette="Humeur" ariaPrefixe="Humeur" options=${HUMEURS} valeur=${entree.humeur} surChoix=${ecrire('humeur')} colonnes=${5} classe="chiffres" />
    </div>
    <div class="champ deux-colonnes">
      <div><span class="etiquette">Contact humain</span><${OuiNon} etiquette="Contact humain" valeur=${entree.contactHumain} surChoix=${ecrire('contactHumain')} /></div>
      <div><span class="etiquette">Sport / mouvement</span><${OuiNon} etiquette="Sport / mouvement" valeur=${entree.sportMouvement} surChoix=${ecrire('sportMouvement')} /></div>
    </div>
    <div class="champ">
      <span class="etiquette">Explosions</span>
      <${Pastilles} etiquette="Explosions" ariaPrefixe="Explosions" options=${EXPLOSIONS} valeur=${entree.explosions} surChoix=${ecrire('explosions')} colonnes=${6} classe="chiffres" />
    </div>
    <div class="champ ligne-champ">
      <span class="etiquette">Traitement pris</span>
      <${Segmente} etiquette="Traitement pris" options=${options(items, 'traitementPris', entree.traitementPris)} valeur=${entree.traitementPris} surChoix=${ecrire('traitementPris')} />
    </div>
    <div class="champ">
      <${ChampTexte} key=${`${date}-pp`} id="points-positifs" etiquette="Mes points positifs" valeur=${entree.pointsPositifs}
        placeholder="Même petit. « J'ai tenu » compte aussi." lignes=${2}
        cleBrouillon=${`carnet:brouillon:${date}:pointsPositifs`} surEnregistrer=${ecrireTexte('pointsPositifs')} />
    </div>

    <${Repli} cle="nuit" titre="Nuit en détail" resume=${resumeNuit(entree)}>
      <div class="deux-colonnes">
        <${ChampHeure} id="coucher" etiquette="Coucher (la veille)" valeur=${entree.heureCoucher} surChoix=${ecrire('heureCoucher')} />
        <${ChampHeure} id="lever" etiquette="Lever" valeur=${entree.heureLever} surChoix=${ecrire('heureLever')} />
      </div>
      <div class="champ">
        <span class="etiquette">Réveils</span>
        <${Pastilles} etiquette="Réveils" ariaPrefixe="Réveils" options=${REVEILS} valeur=${entree.reveilsNocturnes} surChoix=${ecrire('reveilsNocturnes')} colonnes=${6} classe="chiffres" />
      </div>
    </${Repli}>
    <${Repli} cle="notes" titre="Notes libres" resume=${entree.notes ? entree.notes.slice(0, 40) : null}>
      <${ChampTexte} key=${`${date}-notes`} id="notes" etiquette=${null} ariaLabel="Notes libres" valeur=${entree.notes} lignes=${4}
        cleBrouillon=${`carnet:brouillon:${date}:notes`} surEnregistrer=${ecrireTexte('notes')} />
    </${Repli}>

    <p class="pied discret">Tout est facultatif. Toucher un choix une seconde fois l'efface.</p>
    ${baseVide && vide && html`<a class="ligne-info lien discret" href="#/reglages/sauvegarde">Importer une sauvegarde</a>`}
  </main>`;
}
