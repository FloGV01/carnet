// Émotion du moment (v9, spec §4, §7 et §13 ; v8 : la carte dans un panneau, v7 : la roue en familles, « Humeur du
// moment » de la v4 à la v6.1) : comme How We Feel, en plein écran, sans barre d'onglets ni en-tête de l'app. Sur fond
// noir dans les deux thèmes jusqu'à la v10 ; depuis la v11 (spec §9), l'écran suit le thème du système, par le CSS seul
// (ecrans.css, jetons --moment-*) : en sombre, le noir de How We Feel ; en clair, le fond d'Aujourd'hui, et le mot choisi
// en noir sur une capsule de la couleur de sa case.
// - Écran 1 : ✕, le titre, les quatre bulles (ui/composants/quatre-bulles.js) et, dessous, « Maintenant ▾ », qui ouvre
//   les heures de « C'était vers… » (heuresVers). Toucher une bulle n'écrit rien : il ouvre la carte, sur sa zone.
// - Écran 2 : la carte (ui/composants/carte-emotions.js), ← vers l'écran 1. Toucher un mot écrit le relevé tout de suite
//   (le mot, et l'énergie de sa case, energieDe) et montre la carte du bas (ui/composants/carte-du-bas.js) : le mot, sa
//   définition, et la flèche « Continuer ». Un autre mot le remplace, énergie comprise. Retoucher le mot choisi l'efface,
//   énergie comprise, et le relevé part s'il ne reste rien : une heure « vers » ou « Ce que je faisais » le garde (spec
//   §13.5).
// - Écran 3, après la flèche (spec §4.3) : le mot en rappel, dans sa couleur ; « Pour récupérer, je… » d'abord, si la
//   règle « Me ressourcer » joue (domain/ressourcer.js) ; puis « Ce que je faisais », les pastilles de la liste
//   `activiteMoment`, écrites au toucher ; enfin « Terminer ». « Terminer » et ✕ ferment l'écran : « Émotion du moment
//   notée » (avec Annuler). Rien n'y est obligatoire ; il n'y a ni fermeture automatique, ni appui long.
// - « Pour ce moment : » (v10, spec §8), sur l'écran 3 d'un relevé neuf dont le mot a une zone : après « Ce que je faisais »,
//   dans le corps qui défile, deux ou trois exercices (domain/propositions.js), jamais à la place de « Terminer ». Ils ne sont
//   pas sous la flèche de l'écran 2 pour une carte de hauteur minimale ; quand elle grandit, la flèche monte, et la garde protège
//   d'un second toucher (ecrans.css). En toucher un : son et voix préparés dans ce toucher, écriture en cours finie, puis le
//   lecteur de Bien-être sur cet exercice, qui revient à Aujourd'hui. Pas de message « notée » ici : le relevé se reprend dans
//   Ma journée.
// - Un relevé rouvert (#/moment/ID, depuis Ma journée de n'importe quel jour, spec §13.1) s'ouvre directement sur l'écran
//   3, comme un épisode rouvert sur son récapitulatif : son mot, ou « Aucun mot » pour un ancien relevé (énergie seule,
//   famille seule, note de 1 à 10), avec son jour et son heure, et « Changer le mot » (la carte, son mot choisi ; ← et la
//   flèche ramènent à l'écran 3) ; « Ce que je faisais » ; « Supprimer ce relevé » (confirmation, puis « Relevé supprimé »
//   avec Annuler). Ni « Maintenant ▾ » (son heure ne change pas) ni « Pour récupérer, je… » (la règle joue quand on note).
//   Fermer ramène à l'écran d'où il a été ouvert ; Annuler le remet tel qu'il était à l'ouverture. Un id inconnu renvoie
//   sur Aujourd'hui.
// À l'ouverture (#/moment comme #/moment/ID), le message laissé par l'écran d'avant se ferme (relecture de la tâche 5) :
// posé en haut, il cacherait le titre de l'écran 1 ou le mot en rappel. Et l'« Annuler » d'un relevé qu'on vient de
// fermer, rouvert aussitôt, déferait sous l'écran le relevé qui y est (retiré, ou remis tel qu'avant) : ce qu'on y
// toucherait ensuite serait perdu ou mêlé à l'ancien, et « Terminer » pourrait dire noté un relevé qui n'existe plus.
// Un relevé neuf est créé au premier mot (date et heure réelles, ou l'heure de « C'était vers… »), puis modifié : revenir
// à l'écran 1 ou fermer le garde. Chaque ouverture de #/moment part d'un relevé neuf, la liste des heures repliée.
// Après chaque changement de vue, et après chaque mot choisi, une garde de 350 ms : les boutons de l'écran ignorent les
// touchers et sont aria-disabled. Un second toucher rapide tomberait sur un mot jamais vu (point de vigilance 5), sur un
// autre mot que celui qu'on vient de toucher (la carte glissant jusqu'à lui), ou, sous la flèche, sur « Terminer » ou sur un
// exercice de « Pour ce moment : ».
// - La loupe (v9, spec §4.4), en haut à droite des écrans 1 et 2 : la recherche plein écran (ui/composants/
//   recherche-emotion.js), champ actif. Un mot trouvé est choisi comme sur la carte (écrit, s'il ne l'était pas déjà ; la
//   loupe ne l'efface jamais), puis la carte s'ouvre centrée sur lui, avec la carte du bas. ← ramène où l'on était.
// - « Ajouter mon mot « … » » (spec §4.5) : l'écran du mot à soi (ui/composants/mot-perso.js), son nom déjà rempli. Le
//   mot naît au premier choix de sa couleur (méta `motsPerso`, écrite avant le relevé, dont la validation la lit) et
//   entre aussitôt dans le relevé, comme un mot touché sur la carte ; une autre couleur change la sienne, et l'énergie du
//   relevé avec. Sa famille et sa définition le complètent ensuite, au toucher. La flèche ouvre la carte, centrée sur lui,
//   hors du carré de sa zone ; ← ramène à la loupe.
// - Le geste de retour (v11, spec §11) : sur l'écran 3 d'un relevé rouvert, où l'on relit, le doigt qui glisse vers la droite
//   fait comme ✕, garde comprise (.relecture, geste-retour.js). Ailleurs (l'écran 1, la carte, où le doigt la fait déjà
//   glisser, la loupe, Mon mot, un relevé neuf, « Changer le mot »), aucun geste.
import { html, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from '../lib.js';
import { repo } from '../../donnees.js';
import { etatApp } from '../../store.js';
import { useDonnees, useIndicateur, ecrireAvecEssais } from '../hooks.js';
import { cleLocale, heureLocale, heuresVers, versDateHeure, formaterVers, formaterJourComplet, jourEvenement, addDays } from '../../domain/dates.js';
import { nouvelId } from '../../domain/ids.js';
import { carteLibelles } from '../../domain/libelles.js';
import { normaliserPlan } from '../../domain/mon-plan.js';
import { regleRessourcer } from '../../domain/ressourcer.js';
import { FAMILLES, libelleEmotion } from '../../domain/roue.js';
import { motsDeLaCarte, energieDe, zoneDe } from '../../domain/carte-roue.js';
import { definition } from '../../domain/definitions-roue.js';
import { chercher, nomPropose, creerMot, modifierMot, nouvelIdMot } from '../../domain/mots-perso.js';
import { texteReleve } from '../../domain/releves.js';
import { propositionsPour } from '../../domain/propositions.js';
import { titreElement } from '../../domain/entrees-bien-etre.js';
import { pourAffichage } from '../../domain/typographie.js';
import { versHash } from '../../routeur.js';
import { couleurLisible } from '../carte-geometrie.js';
import { usePleinEcran } from '../composants/parcours.js';
import { useGesteRetour } from '../composants/geste-retour.js';
import { QuatreBulles } from '../composants/quatre-bulles.js';
import { CarteEmotions, motsColores } from '../composants/carte-emotions.js';
import { CarteDuBas, FLECHE } from '../composants/carte-du-bas.js';
import { RechercheEmotion, LOUPE, amorcerClavier } from '../composants/recherche-emotion.js';
import { FormulaireMot } from '../composants/mot-perso.js';
import { PastillesMultiples } from '../composants/multiples.js';
import { lirePlan } from '../composants/mon-plan.js';
import { PourRecuperer, lireRessourcer } from '../composants/ressourcer.js';
import { lancerLecture } from '../composants/lecteur.js';
import { Confirmation } from '../composants/confirmation.js';
import { coche, libelleChoix } from '../composants/coche.js';
import { afficherToast, fermerToast } from '../composants/toast.js';
import { Icones } from '../icones.js';
import { options } from './aujourdhui.js';

const GARDE_MS = 350;
const NOTEE = 'Émotion du moment notée';
const SUPPRIME = 'Relevé supprimé';
const TITRE = 'Touche la couleur la plus proche de ce moment';
// Ce que l'écran porte : le mot, son énergie, ce que je faisais, et l'heure (null : maintenant, sinon { date, heure } de
// « vers »). Un relevé rouvert porte aussi son ancienne note (`humeur`), qui ne change pas.
const NEUF = { emotion: null, energie: null, faisais: null, quand: null };

// Date, heure et « vers » d'un relevé : l'heure réelle, ou l'heure choisie dans « C'était vers… ».
const horaire = (quand, maintenant) => (quand
  ? { ...quand, vers: true }
  : { date: cleLocale(maintenant), heure: heureLocale(maintenant), vers: null });
const cleQuand = (quand) => (quand ? `${quand.date} ${quand.heure}` : '');
// Une famille seule (« roue:colere », v7) n'est pas un mot : l'écran 3 dit « Aucun mot ».
const IDS_FAMILLES = new Set(FAMILLES.map((f) => f.id));
// Le jour (logique) et l'heure d'un relevé rouvert : « Aujourd'hui · 21:00 », « Hier · vers 14 h », « Mardi 13 octobre ·
// 09:05 ».
function quandDuReleve(h, aujourdhui) {
  const jour = jourEvenement(h.date, h.heure);
  const nom = jour === aujourdhui ? 'Aujourd\'hui' : jour === addDays(aujourdhui, -1) ? 'Hier' : formaterJourComplet(jour);
  const heure = h.heure ? (h.vers ? formaterVers(h.heure) : h.heure) : null;
  return [nom.charAt(0).toUpperCase() + nom.slice(1), heure].filter(Boolean).join(' · ');
}

// Les icônes des boutons en verre (visuel §1.2 et §2.9) : la croix et la flèche retour, au trait fin (la loupe :
// recherche-emotion.js).
const CROIX = html`<svg width="19" height="19" viewBox="0 0 19 19" fill="none" stroke="currentColor" stroke-width="1.6"
  stroke-linecap="round" aria-hidden="true"><path d="M3 3l13 13M16 3L3 16" /></svg>`;
const RETOUR = html`<svg width="21" height="21" viewBox="0 0 21 21" fill="none" stroke="currentColor" stroke-width="1.6"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 10.5H3M9.5 4l-6.5 6.5 6.5 6.5" /></svg>`;

// « Maintenant ▾ », sous les bulles, ouvre les heures déjà passées du jour logique ; avant 6 h il n'y en a pas, il
// reste un texte. Choisir une heure laisse la liste ouverte (v6.1) : seul ce bouton l'ouvre et la ferme.
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

// Les exercices proposés pour ce moment : texte et contour, sans fond de couleur ; rien n'invite ni n'insiste.
function PourCeMoment({ exercices, ariaGarde, surExercice }) {
  return html`<section class="pour-ce-moment" aria-labelledby="titre-pour-ce-moment">
    <h2 class="titre-pour-ce-moment" id="titre-pour-ce-moment">${pourAffichage('Pour ce moment :')}</h2>
    <div class="propositions">
      ${exercices.map((x) => html`<button type="button" class="proposition" aria-disabled=${ariaGarde} onClick=${() => surExercice(x)}>${titreElement(x)}</button>`)}
    </div>
  </section>`;
}

// `id` : le relevé rouvert (#/moment/ID) ; sans lui, un relevé neuf (#/moment).
export function Moment({ id = null }) {
  usePleinEcran();
  // Le message de l'écran d'avant, quel qu'il soit, se ferme avant que cet écran-ci soit peint : il n'y paraît pas, même
  // un instant. Son « Annuler » ne manque pas ici : un relevé rouvert se supprime de l'écran 3, et un relevé noté juste
  // avant se rouvre depuis Ma journée.
  useLayoutEffect(() => { fermerToast(); }, []);
  const rouvert = Boolean(id);
  // La vue : les bulles, la carte (`zone` : la bulle touchée), « Ce que je faisais » (l'écran 3), la loupe (`retour` : la
  // vue d'où elle s'ouvre) ou le mot à soi (`libelle` : son nom proposé ; `id`, une fois créé ; `retour` : la loupe).
  const [vue, setVue] = useState(rouvert ? { nom: 'faisais' } : { nom: 'bulles', zone: null });
  // Le texte de la loupe, gardé d'une ouverture à l'autre.
  const [recherche, setRecherche] = useState('');
  // Les mots à soi tels qu'écrits ici (un mot créé, complété) ; avant, ceux de la lecture.
  const [persoEcrit, setPersoEcrit] = useState(undefined);
  // Un relevé rouvert n'est à l'écran qu'une fois lu (null jusque-là).
  const [releve, setReleve] = useState(rouvert ? null : NEUF);
  const [versOuvert, setVersOuvert] = useState(false);
  const [confirmer, setConfirmer] = useState(false);
  const [enGarde, setEnGarde] = useState(false);
  const [, signaler] = useIndicateur();
  const [, rafraichir] = useReducer((n) => n + 1, 0);
  const idRef = useRef(null);
  // Le relevé rouvert tel qu'à l'ouverture : son jour et son heure, s'il faut le recréer ; ce que remet « Annuler ».
  const avant = useRef(null);
  const file = useRef(Promise.resolve());
  const garde = useRef(null);
  const titre = useRef(null);
  const aFocaliser = useRef(false);
  const ferme = useRef(false);
  const enCreation = useRef(false);
  const { donnees } = useDonnees(async () => {
    // Les définitions corrigées (méta `definitionsRoue`), les mots à soi (méta `motsPerso`), les activités de « Ce que je
    // faisais », le réglage et le plan de la règle « Me ressourcer », le relevé rouvert : une lecture qui échoue donne le
    // texte d'Emozio, aucun mot à soi, aucune activité, la règle éteinte, ou le retour sur Aujourd'hui. La carte reste.
    const [corrections, perso, items, reglage, plan, lu] = await Promise.all([
      repo.meta.lire('definitionsRoue').catch(() => null), repo.meta.lire('motsPerso').catch(() => null), repo.listes.items().catch(() => []),
      lireRessourcer(), lirePlan().catch(() => normaliserPlan(null)), id ? repo.humeurs.lire(id).catch(() => null) : null,
    ]);
    return { corrections, perso, items, carte: carteLibelles(items), reglage, plan, lu };
  }, [], { suivre: false });
  const perso = persoEcrit !== undefined ? persoEcrit : donnees ? donnees.perso : null;
  const corrections = donnees ? donnees.corrections : null;
  // Le relevé de la dernière peinture, pour une écriture qui finit après une attente (la création d'un mot à soi).
  const releveRef = useRef(releve);
  releveRef.current = releve;
  const mots = useMemo(() => motsColores(motsDeLaCarte(perso)), [perso]);
  useEffect(() => () => clearTimeout(garde.current), []);

  const poserGarde = () => {
    clearTimeout(garde.current);
    setEnGarde(true);
    garde.current = setTimeout(() => setEnGarde(false), GARDE_MS);
  };
  // Le relevé rouvert, lu : il est à l'écran, sous la garde (le toucher qui l'a ouvert ne tombe pas sur une pastille).
  useEffect(() => {
    if (!donnees || !rouvert) return;
    const { lu } = donnees;
    if (!lu) { location.hash = '#/aujourdhui'; return; }
    idRef.current = lu.id;
    avant.current = lu;
    aFocaliser.current = true;
    poserGarde();
    setReleve({ emotion: lu.emotion ?? null, energie: lu.energie ?? null, faisais: lu.faisais ?? null, humeur: lu.humeur ?? null, quand: null });
  }, [donnees]);
  // Revenu à l'écran 1, arrivé à l'écran 3 ou au mot à soi, le focus va au titre (dans la loupe, il est au champ).
  useEffect(() => {
    if (!aFocaliser.current || !releve) return;
    aFocaliser.current = false;
    if (vue.nom !== 'carte' && vue.nom !== 'loupe' && titre.current) titre.current.focus({ preventScroll: true });
  }, [vue, releve !== null]);

  const changerDeVue = (suivante) => {
    poserGarde();
    aFocaliser.current = true;
    setVue(suivante);
  };
  // L'écran d'où un relevé rouvert a été ouvert (Ma journée d'Aujourd'hui, d'un autre jour, ou d'un jour de l'Historique) ;
  // un relevé neuf ramène sur Aujourd'hui.
  const revenir = () => {
    const precedente = etatApp.lire().routePrecedente;
    location.hash = rouvert && precedente && !/^#\/moment(\/|$)/.test(precedente) ? precedente : '#/aujourdhui';
  };
  // Ferme l'écran, l'écriture en cours finie, en disant que le relevé est noté, avec « Annuler » : un relevé neuf est
  // retiré, un relevé rouvert remis tel qu'à l'ouverture (« Relevé supprimé » s'il est parti, vidé de tout). Une seule
  // fois : un second toucher pendant l'écriture ne dit rien de plus.
  const terminer = async () => {
    if (ferme.current) return;
    ferme.current = true;
    await file.current;
    const idFin = idRef.current;
    const depart = avant.current;
    revenir();
    if (depart) afficherToast(idFin ? NOTEE : SUPPRIME, { libelle: 'Annuler', faire: () => repo.humeurs.restaurer({ entree: depart }) });
    else if (idFin) afficherToast(NOTEE, { libelle: 'Annuler', faire: () => repo.humeurs.supprimer(idFin) });
  };
  // Un exercice de « Pour ce moment : ». Comme « Terminer », l'écran part une fois l'écriture en cours finie, une seule fois,
  // mais sans message : le lecteur prend la place. Le toucher prépare le son et la voix (lancerLecture).
  const lancerExercice = (exercice) => {
    if (enGarde || ferme.current) return;
    ferme.current = true;
    lancerLecture(versHash('exercice', { id: exercice }), { retour: '#/aujourdhui', attendre: file.current });
  };
  // « Supprimer ce relevé », confirmé : « Annuler » le remet tel qu'il était.
  const supprimer = async () => {
    setConfirmer(false);
    if (ferme.current) return;
    ferme.current = true;
    await file.current;
    const idFin = idRef.current;
    revenir();
    const sauve = idFin ? await repo.humeurs.supprimer(idFin) : { entree: avant.current };
    afficherToast(SUPPRIME, { libelle: 'Annuler', faire: () => repo.humeurs.restaurer(sauve) });
  };
  // Écrit en file. Le relevé est créé au premier mot, avec tout ce que porte l'écran (`etat`) ; ensuite on le modifie.
  // Chaque état est écrit tel quel (un mot, un autre, plus de mot…) ; un relevé qui n'a plus rien est supprimé. Un relevé
  // rouvert ainsi vidé revient, sous son id, à son jour et à son heure, dès qu'il a de nouveau un mot ou une activité.
  const ecrire = (changements, etat) => {
    file.current = file.current.then(async () => {
      if (!idRef.current) {
        if (etat.emotion == null && !(etat.faisais && etat.faisais.length)) return;
        const depart = avant.current;
        const quand = depart ? { date: depart.date, heure: depart.heure ?? null, vers: depart.vers ?? null } : horaire(etat.quand, repo.maintenant());
        // L'id est tiré une seule fois, avant les essais : un nouvel essai réécrit la même clé, sans doublon (comme en v8).
        const idNeuf = depart ? depart.id : nouvelId('hu');
        const cree = await ecrireAvecEssais(() => repo.humeurs.creer({
          ...quand, emotion: etat.emotion, energie: etat.energie, faisais: etat.faisais,
        }, { id: idNeuf }), signaler);
        if (cree) idRef.current = cree.id;
        return;
      }
      const res = await ecrireAvecEssais(() => repo.humeurs.modifier(idRef.current, changements), signaler);
      if (res === null) idRef.current = null;
    }).catch(() => {});
    return file.current;
  };
  // Change le relevé à l'écran et l'écrit.
  const changer = (champs, depuis = releve) => {
    const suivant = { ...depuis, ...champs };
    setReleve(suivant);
    ecrire(champs, suivant);
  };
  // Un mot : il est écrit avec l'énergie de sa case (spec §7 ; sur un ancien relevé, elle remplace celle qui avait été
  // saisie), et la garde se pose, la carte glissant jusqu'à lui. Le mot déjà choisi : il s'efface, et son énergie avec ;
  // rien ne bouge sous le doigt, pas de garde.
  const choisirMot = (motId) => {
    const efface = releve.emotion === motId;
    if (!efface) poserGarde();
    changer(efface ? { emotion: null, energie: null } : { emotion: motId, energie: energieDe(motId, perso) });
  };
  // Un mot trouvé par la loupe : choisi comme sur la carte, mais jamais effacé (déjà choisi, il le reste) ; puis la carte,
  // centrée sur lui, avec la carte du bas.
  const choisirTrouve = (motId) => {
    if (releve.emotion !== motId) changer({ emotion: motId, energie: energieDe(motId, perso) });
    changerDeVue({ nom: 'carte', zone: null });
  };
  // Les mots à soi : la méta est écrite en file, avant le relevé qui cite un mot neuf (sa validation la lit dans sa
  // transaction). Un refus (nom pris ou vide) rejette, et le formulaire le dit.
  const ecrireMot = (transformer) => {
    const fait = file.current.then(() => repo.meta.modifier('motsPerso', transformer));
    file.current = fait.catch(() => {});
    return fait.then((p) => { setPersoEcrit(p); return p; });
  };
  // La couleur du mot à soi. Le premier choix crée le mot (le nom tapé et la couleur suffisent), et le met dans le
  // relevé, avec l'énergie de sa zone ; un autre change sa couleur, et l'énergie du relevé s'il porte encore ce mot.
  // Pendant la création, un second toucher ne crée pas un second mot.
  const choisirZoneDuMot = async (zone, libelle) => {
    if (enCreation.current) return;
    if (vue.id) {
      const id = vue.id;
      const p = await ecrireMot((v) => modifierMot(v, id, { zone }));
      if (releveRef.current.emotion === id) changer({ energie: energieDe(id, p) }, releveRef.current);
      return;
    }
    enCreation.current = true;
    try {
      const id = nouvelIdMot();
      const p = await ecrireMot((v) => creerMot(v, { libelle, zone }, { id, maintenant: repo.maintenant() }).perso);
      setVue((v) => (v.nom === 'mot' ? { ...v, id } : v));
      changer({ emotion: id, energie: energieDe(id, p) }, releveRef.current);
    } finally {
      enCreation.current = false;
    }
  };
  const completerMot = (champs) => ecrireMot((v) => modifierMot(v, vue.id, champs));
  // « Ce que je faisais » : écrit au toucher, comme en v8.
  const choisirFaisais = (faisais) => {
    if (enGarde) return;
    const suivant = { ...releve, faisais };
    setReleve(suivant);
    ecrire({ faisais }, suivant);
  };
  // Une heure de « vers » (ou « Maintenant ») : sans relevé encore, rien n'est écrit, l'heure reste à l'écran et sera
  // posée à la création ; avec un relevé, il change d'heure. La liste a pu s'ouvrir avant 4 h et se toucher après : une
  // heure qui n'est plus proposée est celle du jour d'avant, elle est ignorée (sinon elle tomberait sur le nouveau jour)
  // et la liste, restée ouverte, se rafraîchit.
  const choisirQuand = (h) => {
    const maintenant = repo.maintenant();
    if (h != null && !heuresVers(maintenant).includes(h)) { rafraichir(); return; }
    const quand = h == null ? null : versDateHeure(maintenant, h);
    if (cleQuand(quand) === cleQuand(releve.quand)) return;
    const suivant = { ...releve, quand };
    setReleve(suivant);
    ecrire(horaire(quand, maintenant), suivant);
  };
  // Un bouton de l'écran, qui ignore les touchers pendant la garde.
  const gardee = (action) => () => { if (!enGarde) action(); };
  const ariaGarde = enGarde ? 'true' : null;

  // ✕ est à la place de ← : un second toucher rapide sur ←, revenu aux bulles, ne ferme pas l'écran (la garde).
  const fermer = html`<button type="button" class="verre gauche" aria-label="Fermer" aria-disabled=${ariaGarde} onClick=${gardee(terminer)}>${CROIX}</button>`;
  // La loupe, en haut à droite des écrans 1 et 2 : le clavier s'amorce pendant le toucher même (recherche-emotion.js).
  const loupe = html`<button type="button" class="verre droite" aria-label="Chercher un mot" aria-disabled=${ariaGarde}
    onClick=${gardee(() => { amorcerClavier(); changerDeVue({ nom: 'loupe', retour: vue }); })}>${LOUPE}</button>`;
  let ecran = null;
  if (!releve) {
    // Le relevé rouvert se lit : l'écran reste vide, sur son fond.
  } else if (vue.nom === 'bulles') {
    const heures = heuresVers(repo.maintenant());
    ecran = html`<div class="ecran-bulles" key="bulles">
      ${fermer}${loupe}
      <h1 class="titre-bulles" ref=${titre} tabindex="-1">${TITRE}</h1>
      <span class="espace-bulles" aria-hidden="true"></span>
      <${QuatreBulles} etiquette=${TITRE} enGarde=${enGarde} surZone=${(zone) => changerDeVue({ nom: 'carte', zone })} />
      <${PuceQuand} quand=${releve.quand} heures=${heures} ouvert=${versOuvert} surBascule=${() => setVersOuvert(!versOuvert)} />
      ${versOuvert && (heures.length > 0 || releve.quand) && html`<${ListeVers} quand=${releve.quand} heures=${heures} surChoix=${choisirQuand} />`}
    </div>`;
  } else if (vue.nom === 'carte') {
    const choisi = releve.emotion && mots.find((m) => m.id === releve.emotion);
    // Rouvert, la carte vient de l'écran 3 et y ramène ; neuf, de l'écran 1.
    const arriere = rouvert ? { nom: 'faisais' } : { nom: 'bulles', zone: null };
    // ← vient avant la carte, comme à l'écran : VoiceOver et le clavier l'atteignent avant les 144 mots. Il reste
    // au-dessus des bulles par son z-index (.verre).
    ecran = html`<div class="ecran-carte" key="carte">
      <button type="button" class="verre gauche" aria-label=${rouvert ? 'Revenir au relevé' : 'Revenir au choix de la couleur'} aria-disabled=${ariaGarde}
        onClick=${gardee(() => changerDeVue(arriere))}>${RETOUR}</button>
      ${loupe}
      ${donnees && html`<${CarteEmotions} mots=${mots} choisi=${releve.emotion} centre=${vue.zone} enGarde=${enGarde} surMot=${choisirMot} />`}
      <div class="carte-fondu" aria-hidden="true"></div>
      <${CarteDuBas} mot=${choisi || null} definition=${choisi ? definition(choisi.id, corrections, perso) : null}
        enGarde=${enGarde} surContinuer=${() => changerDeVue({ nom: 'faisais' })} />
    </div>`;
  } else if (vue.nom === 'loupe') {
    ecran = html`<${RechercheEmotion} key="loupe" texte=${recherche} resultats=${chercher(perso, recherche, corrections)}
      propose=${nomPropose(perso, recherche)} enGarde=${enGarde} retour=${RETOUR}
      etiquetteRetour=${vue.retour.nom === 'carte' ? 'Revenir à la carte' : 'Revenir au choix de la couleur'}
      surTexte=${setRecherche} surMot=${choisirTrouve} surRetour=${() => changerDeVue(vue.retour)}
      surAjouter=${(libelle) => changerDeVue({ nom: 'mot', libelle, id: null, retour: vue })} />`;
  } else if (vue.nom === 'mot') {
    // Le mot à soi : ce qu'en dit la méta une fois créé ; avant, son nom proposé. Ses champs portent son id, comme dans
    // Réglages › Émotions : le brouillon de sa définition est le sien, jamais celui d'un autre mot.
    const sien = vue.id && perso && perso[vue.id];
    const mot = sien
      ? { libelle: sien.libelle, zone: sien.zone, famille: sien.famille ?? null, definition: sien.definition ?? null }
      : { libelle: vue.libelle, zone: null, famille: null, definition: null };
    ecran = html`<div class=${`ecran-mot${mot.zone ? ` zone-${mot.zone}` : ''}`} key="mot">
      <button type="button" class="verre gauche" aria-label="Revenir à la recherche" aria-disabled=${ariaGarde}
        onClick=${gardee(() => changerDeVue(vue.retour))}>${RETOUR}</button>
      <div class="corps-mot">
        <h1 class="titre-mot" ref=${titre} tabindex="-1">Mon mot</h1>
        <${FormulaireMot} idBase=${vue.id ? `mot-${vue.id.replace(/:/g, '-')}` : 'mot-neuf'} mot=${mot} cree=${Boolean(sien)} enGarde=${enGarde}
          surZone=${choisirZoneDuMot} surNom=${(libelle) => completerMot({ libelle })}
          surFamille=${(famille) => completerMot({ famille })} surDefinition=${(texte) => completerMot({ definition: texte })} />
      </div>
      ${sien && html`<div class="pied-mot">
        <button type="button" class="continuer" aria-label="Continuer" aria-disabled=${ariaGarde}
          onClick=${gardee(() => changerDeVue({ nom: 'carte', zone: null }))}>${FLECHE}</button>
      </div>`}
    </div>`;
  } else {
    // L'écran 3. Le mot dans la couleur de sa case (éclaircie, comme dans la carte du bas ; en clair, en noir sur une capsule
    // de la couleur même, --c-fill, ecrans.css), et une activité choisie dans celle de la case même (relecture finale : un
    // seul bleu pour Vide, pas l'azur de sa case et le pervenche de sa zone) ; le texte d'une activité choisie reste le -on
    // de la zone, à 4,5:1 sur toutes ses cases. Un mot à soi mis de côté, qui a quitté la carte, prend la couleur de sa zone
    // (-fill) ; un mot à soi sans zone, la couleur du texte de l'écran (blanc en sombre, noir sans capsule en clair).
    const libelle = IDS_FAMILLES.has(releve.emotion) ? null : libelleEmotion(releve.emotion, perso);
    const surCarte = libelle && mots.find((m) => m.id === releve.emotion);
    const zone = libelle ? zoneDe(releve.emotion, perso) : null;
    const couleur = surCarte ? { '--c-mot': couleurLisible(surCarte.couleur), '--c-fill': surCarte.couleur } : null;
    // Sous un ancien relevé sans mot, ce qu'il porte : « Colère · énergie basse », « humeur 6 », « énergie basse ».
    const ancien = !libelle && donnees ? texteReleve({ ...releve, faisais: null, vers: null }, donnees.carte, perso) : '';
    const regle = !rouvert && donnees && regleRessourcer({
      reglage: donnees.reglage, releve: { vers: releve.quand ? true : null, energie: releve.energie }, plan: donnees.plan,
    });
    const exercices = rouvert ? [] : propositionsPour(zone);
    ecran = html`<div class=${`ecran-faisais${zone ? ` zone-${zone}` : ''}`} key="faisais" style=${couleur}>
      ${fermer}
      <div class="corps-faisais">
        <div class="rappel-faisais">
          <h1 class=${`mot-rappel${libelle ? '' : ' sans-mot'}`} ref=${titre} tabindex="-1">${libelle || 'Aucun mot'}</h1>
          ${rouvert && avant.current && html`<p class="detail-rappel">${quandDuReleve(avant.current, repo.aujourdhui())}</p>`}
          ${ancien && html`<p class="detail-rappel">${ancien}</p>`}
          ${rouvert && html`<button type="button" class="btn-lien changer-mot" aria-disabled=${ariaGarde}
            onClick=${gardee(() => changerDeVue({ nom: 'carte', zone: null }))}>Changer le mot</button>`}
        </div>
        ${regle && html`<${PourRecuperer} texte=${donnees.plan.pourRecuperer} />`}
        <section class="faisais" aria-labelledby="titre-faisais">
          <h2 class="titre-faisais" id="titre-faisais">${Icones.ceQueJeFaisais()}<span>Ce que je faisais</span></h2>
          ${donnees && html`<div class="choix-faisais" aria-disabled=${ariaGarde}>
            <${PastillesMultiples} etiquette="Ce que je faisais" options=${options(donnees.items, 'activiteMoment', releve.faisais)}
              valeurs=${releve.faisais} surChoix=${choisirFaisais} />
          </div>`}
        </section>
        ${exercices.length > 0 && html`<${PourCeMoment} exercices=${exercices} ariaGarde=${ariaGarde} surExercice=${lancerExercice} />`}
        ${rouvert && html`<button type="button" class="lien-discret supprimer-releve" aria-disabled=${ariaGarde}
          onClick=${gardee(() => setConfirmer(true))}>Supprimer ce relevé</button>`}
      </div>
      <div class="pied-faisais">
        <button type="button" class="terminer-releve" aria-disabled=${ariaGarde} onClick=${gardee(terminer)}>Terminer</button>
      </div>
      ${confirmer && html`<${Confirmation} titre="Supprimer ce relevé ?" action="Supprimer"
        surAnnuler=${() => setConfirmer(false)} surConfirmer=${supprimer} />`}
    </div>`;
  }
  const relecture = rouvert && vue.nom === 'faisais';
  useGesteRetour(relecture ? gardee(terminer) : null);
  return html`<div class=${`moment-plein${relecture ? ' relecture' : ''}`} role="dialog" aria-modal="true" aria-label="Émotion du moment">${ecran}</div>`;
}
