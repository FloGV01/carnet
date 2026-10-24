// Émotion du moment (v8, spec §4 ; v7 : la roue en familles ; « Humeur du moment » de la v4 à la v6.1) : la carte de
// How We Feel. Une tuile (l'énergie et un côté, « plutôt désagréable » ou « plutôt agréable »), puis un mot sur la
// carte (ui/composants/carte-emotions.js) : deux touchers. La note de 1 à 10 n'est plus proposée, ni la famille seule
// de la v7 ; les anciens relevés gardent les leurs. Le relevé est créé au premier toucher (date et heure réelles, ou
// l'heure de « C'était vers… »). Une fois un mot choisi, sa définition s'affiche et l'écran se referme 1,5 s plus tard
// (chaque toucher ou glissement sur la carte relance le délai), sauf si « Ce que je faisais » a été ouvert pendant la
// saisie ou si la règle « Me ressourcer » joue : au-dessus des réponses, « Pour récupérer, je… » (domain/ressourcer.js).
// « Ce que je faisais » et « C'était vers… » sont repliés à chaque ouverture. Les réponses sont dans un panneau collé
// en bas, près du pouce (2b).
import { html, useEffect, useReducer, useRef, useState } from '../lib.js';
import { repo } from '../../donnees.js';
import { useDonnees, useIndicateur, ecrireAvecEssais } from '../hooks.js';
import { cleLocale, heureLocale, heuresVers, versDateHeure, formaterVers } from '../../domain/dates.js';
import { nouvelId } from '../../domain/ids.js';
import { carteLibelles, libelle } from '../../domain/libelles.js';
import { minusculeInitiale } from '../../domain/phrase.js';
import { normaliserPlan } from '../../domain/mon-plan.js';
import { regleRessourcer } from '../../domain/ressourcer.js';
import { familleDe } from '../../domain/roue.js';
import { texteReleve } from '../../domain/releves.js';
import { CadreParcours } from '../composants/parcours.js';
import { CarteEmotions } from '../composants/carte-emotions.js';
import { PastillesMultiples } from '../composants/multiples.js';
import { lirePlan } from '../composants/mon-plan.js';
import { PourRecuperer, lireRessourcer } from '../composants/ressourcer.js';
import { Repli } from '../composants/repli.js';
import { coche, libelleChoix } from '../composants/coche.js';
import { afficherToast } from '../composants/toast.js';
import { Icones } from '../icones.js';
import { options } from './aujourdhui.js';

const DELAI_FERMETURE_MS = 1500;
const NOTEE = 'Émotion du moment notée';
// Ce que l'écran porte : les valeurs du relevé, et son heure (null : maintenant, sinon { date, heure } de « vers »).
const NEUF = { emotion: null, energie: null, faisais: null, quand: null };

// Seul endroit qui décide si l'écran se ferme tout seul, un mot choisi : pas si « Ce que je faisais » a été ouvert
// pendant cette saisie, ni quand la règle « Me ressourcer » affiche la liste. Toute autre raison de le garder ouvert
// s'ajoute ici.
const seFermeSeul = (r, { faisaisOuvert, ressourcer }) => r.emotion != null && !faisaisOuvert && !ressourcer;

// Date, heure et « vers » d'un relevé : l'heure réelle, ou l'heure choisie dans « C'était vers… ».
const horaire = (quand, maintenant) => (quand
  ? { ...quand, vers: true }
  : { date: cleLocale(maintenant), heure: heureLocale(maintenant), vers: null });
const cleQuand = (quand) => (quand ? `${quand.date} ${quand.heure}` : '');

// « Ce que je faisais » replié : « travail, trajet ».
const resumeFaisais = (ids, carte) => (ids || []).map((id) => minusculeInitiale(libelle(carte, id))).join(', ');

// « Maintenant ▾ », en haut à droite, ouvre les heures déjà passées du jour logique ; avant 6 h il n'y en a pas, la
// puce reste fixe. Choisir une heure laisse la liste ouverte (v6.1) : seule la puce l'ouvre et la ferme. Elle est
// repliée à chaque ouverture de l'écran (v8).
function PuceQuand({ quand, heures, ouvert, surBascule }) {
  if (heures.length === 0 && !quand) return html`<p class="ligne-date ligne-date-fixe puce-quand">Maintenant</p>`;
  return html`<div class="ligne-date puce-quand">
    <button type="button" class="btn-lien" aria-expanded=${ouvert ? 'true' : 'false'} onClick=${surBascule}>
      ${quand ? `C'était ${formaterVers(quand.heure)}` : 'Maintenant'}${Icones.chevronBas({ trait: 2 })}</button>
  </div>`;
}

function ListeVers({ quand, heures, surChoix }) {
  const choisie = quand ? Number(quand.heure.slice(0, 2)) : null;
  const choix = [{ h: null, texte: 'Maintenant' }, ...heures.map((h) => ({ h, texte: `${h} h` }))];
  return html`<div class="pastilles souples teinte-humeur choix-vers" role="group" aria-label="C'était vers…">
    ${choix.map(({ h, texte }) => html`<button type="button" class="pastille" aria-pressed=${h === choisie ? 'true' : 'false'}
      onClick=${() => surChoix(h)}>${coche()}${libelleChoix(texte)}</button>`)}
  </div>`;
}

export function Moment() {
  const [releve, setReleve] = useState(NEUF);
  // « Ce que je faisais » a été ouvert pendant cette saisie : l'écran ne se ferme plus seul.
  const [faisaisOuvert, setFaisaisOuvert] = useState(false);
  const [versOuvert, setVersOuvert] = useState(false);
  const [, signaler] = useIndicateur();
  const [, rafraichir] = useReducer((n) => n + 1, 0);
  const idRef = useRef(null);
  const file = useRef(Promise.resolve());
  // La fermeture automatique : son minuteur, et `armee` tant qu'elle attend (un doigt posé sur la carte la suspend,
  // levé ou la carte qui glisse, il la relance pour 1,5 s).
  const fermeture = useRef({ minuteur: null, armee: false });
  const aujourdhui = repo.aujourdhui();
  const { donnees } = useDonnees(async () => {
    // Le réglage et le plan de la règle : une lecture qui échoue donne leurs valeurs par défaut (règle éteinte) ; les
    // définitions corrigées, le texte de Carnet.
    const [items, jour, reglage, plan, corrections] = await Promise.all([
      repo.listes.items(), repo.humeurs.parJour(aujourdhui, aujourdhui), lireRessourcer(), lirePlan().catch(() => normaliserPlan(null)),
      repo.meta.lire('definitionsRoue').catch(() => null),
    ]);
    return { items, carte: carteLibelles(items), jour, reglage, plan, corrections };
  }, [aujourdhui]);
  useEffect(() => () => clearTimeout(fermeture.current.minuteur), []);

  const annuler = () => { clearTimeout(fermeture.current.minuteur); fermeture.current.armee = false; };
  const armer = () => {
    clearTimeout(fermeture.current.minuteur);
    fermeture.current = { armee: true, minuteur: setTimeout(terminer, DELAI_FERMETURE_MS) };
  };
  const geste = {
    suspendre: () => clearTimeout(fermeture.current.minuteur),
    relancer: () => { if (fermeture.current.armee) armer(); },
  };
  const fermer = () => { annuler(); location.hash = '#/aujourdhui'; };
  // La règle « Me ressourcer » pour ce que porte l'écran : un relevé noté maintenant (pas « vers »), avec son énergie.
  const regle = (r) => Boolean(donnees) && regleRessourcer({
    reglage: donnees.reglage, releve: { vers: r.quand ? true : null, energie: r.energie }, plan: donnees.plan,
  });
  // Referme l'écran en disant que le relevé est noté (avec « Annuler »), s'il y en a un. La fermeture automatique en
  // attente est annulée tout de suite : ✕ touché pendant son délai ne doit pas noter le relevé deux fois.
  const terminer = async () => {
    annuler();
    await file.current;
    const id = idRef.current;
    fermer();
    if (id) afficherToast(NOTEE, { libelle: 'Annuler', faire: () => repo.humeurs.supprimer(id) });
  };
  // Écrit en file. Le relevé est créé avec tout ce que porte l'écran (`etat`), dès qu'il y a une
  // émotion ou une énergie : des activités ou une heure seules ne créent rien. Ensuite on le modifie.
  // Chaque état est écrit tel quel (un mot, un autre, plus de mot…) ; un relevé qui n'a plus rien est supprimé.
  const ecrire = (changements, etat) => {
    file.current = file.current.then(async () => {
      if (!idRef.current) {
        if (etat.emotion == null && etat.energie == null) return;
        const id = nouvelId('hu');
        const cree = await ecrireAvecEssais(() => repo.humeurs.creer({
          ...horaire(etat.quand, repo.maintenant()), emotion: etat.emotion, energie: etat.energie, faisais: etat.faisais,
        }, { id }), signaler);
        if (cree) idRef.current = cree.id;
        return;
      }
      const res = await ecrireAvecEssais(() => repo.humeurs.modifier(idRef.current, changements), signaler);
      if (res === null) idRef.current = null;
    }).catch(() => {});
    return file.current;
  };
  // `fermable` : ce toucher peut refermer l'écran (un mot, ou une autre énergie quand un mot est déjà choisi : la carte
  // se rouvre avec lui, puis l'écran se ferme). Les activités ne ferment jamais : leur repli est ouvert.
  const choisir = (champ, fermable = true) => (v) => {
    const suivant = { ...releve, [champ]: v };
    setReleve(suivant);
    ecrire({ [champ]: v }, suivant);
    annuler();
    if (fermable && seFermeSeul(suivant, { faisaisOuvert, ressourcer: regle(suivant) })) armer();
  };
  const choisirMot = (id) => choisir('emotion')(id);
  const choisirEnergie = (id) => choisir('energie', releve.emotion != null)(id);
  const basculerVers = () => setVersOuvert(!versOuvert);
  // Une heure de « vers » (ou « Maintenant ») : sans relevé encore, rien n'est écrit, l'heure reste à
  // l'écran et sera posée à la création ; avec un relevé, il change d'heure. La liste a pu s'ouvrir avant 4 h et
  // se toucher après : une heure qui n'est plus proposée est celle du jour d'avant, elle est ignorée (sinon elle
  // tomberait sur le nouveau jour) et la liste, restée ouverte, se rafraîchit.
  const choisirQuand = (h) => {
    const maintenant = repo.maintenant();
    if (h != null && !heuresVers(maintenant).includes(h)) { rafraichir(); return; }
    const quand = h == null ? null : versDateHeure(maintenant, h);
    if (cleQuand(quand) === cleQuand(releve.quand)) return;
    const suivant = { ...releve, quand };
    setReleve(suivant);
    ecrire(horaire(quand, maintenant), suivant);
  };
  const basculerFaisais = (ouvert) => {
    if (!ouvert) return;
    setFaisaisOuvert(true);
    annuler();
  };
  const supprimer = async (h) => {
    const sauve = await repo.humeurs.supprimer(h.id);
    if (h.id === idRef.current) { idRef.current = null; setReleve(NEUF); }
    afficherToast('Relevé supprimé', { libelle: 'Annuler', faire: () => repo.humeurs.restaurer(sauve) });
  };

  if (!donnees) return html`<div class="parcours"></div>`;
  const { items, carte, jour } = donnees;
  const heures = heuresVers(repo.maintenant());
  const panneau = html`<${CarteEmotions} emotion=${releve.emotion} energie=${releve.energie} libelle=${(id) => libelle(carte, id)}
    corrections=${donnees.corrections} surEnergie=${choisirEnergie} surMot=${choisirMot} surRetour=${annuler} surGeste=${geste} />`;
  return html`<${CadreParcours} titre="Émotion du moment" teinte="humeur" icone="emotion" surFermer=${terminer}
    droite=${html`<${PuceQuand} quand=${releve.quand} heures=${heures} ouvert=${versOuvert} surBascule=${basculerVers} />`}
    sousTitre=${versOuvert && (heures.length > 0 || releve.quand) && html`<${ListeVers} quand=${releve.quand} heures=${heures} surChoix=${choisirQuand} />`}
    panneau=${panneau}>
    <div class="moment-corps">
      <${Repli} titre="Ce que je faisais" icone="ceQueJeFaisais" memoriser=${false} resume=${resumeFaisais(releve.faisais, carte)} surBascule=${basculerFaisais}>
        <${PastillesMultiples} etiquette="Ce que je faisais" options=${options(items, 'activiteMoment', releve.faisais)} valeurs=${releve.faisais}
          surChoix=${choisir('faisais', false)} teinte="humeur" />
      </${Repli}>
      ${jour.length > 0 && html`<section class="moments-du-jour" aria-label="Relevés d'aujourd'hui">
        <h3 class="libelle-section">Aujourd'hui</h3>
        <ul class="liste carte carte-groupe">${jour.map((h) => {
          const famille = familleDe(h.emotion);
          return html`<li class="ligne-releve">
            <span class="heure-moment">${h.vers ? formaterVers(h.heure) : h.heure || '·'}</span> <span class=${famille ? `point-releve-moment emo-${famille}` : 'point-releve-moment point-creux'} aria-hidden="true"></span> <span class="texte-releve">${texteReleve(h, carte) || '·'}</span>
            <button type="button" class="effacer" aria-label=${`Supprimer le relevé ${h.vers ? formaterVers(h.heure) : `de ${h.heure || 'cette heure'}`}`} onClick=${() => supprimer(h)}>${Icones.fermer()}</button>
          </li>`;
        })}</ul>
      </section>`}
      ${regle(releve) && html`<${PourRecuperer} texte=${donnees.plan.pourRecuperer} />`}
    </div>
  </${CadreParcours}>`;
}
