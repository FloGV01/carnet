// Racine de l'interface : route courante, onglets, bandeau de mise à jour, toast.
import { html, useEffect, useState } from './ui/lib.js';
import { etatApp } from './store.js';
import { lireRoute, ongletDe } from './routeur.js';
import { BarreOnglets } from './ui/composants/barre-onglets.js';
import { BandeauMaj } from './ui/composants/bandeau-maj.js';
import { Toast } from './ui/composants/toast.js';
import { appliquerMaj } from './plateforme/sw-client.js';
import { estSiteTest } from './plateforme/mode.js';
import { Guide } from './ui/ecrans/guide.js';
import { EcranAttente } from './ui/ecrans/attente.js';
import { Reglages } from './ui/ecrans/reglages.js';
import { Diagnostic } from './ui/ecrans/diagnostic.js';
import { Aujourdhui } from './ui/ecrans/aujourdhui.js';
import { Episode } from './ui/ecrans/episode.js';
import { Moment } from './ui/ecrans/moment.js';
import { ExerciceCrise, MomentDifficile } from './ui/ecrans/moment-difficile.js';
import { MonPlan } from './ui/ecrans/mon-plan.js';
import { ApresCoup } from './ui/ecrans/apres-coup.js';
import { ApresCoupListe } from './ui/ecrans/apres-coup-liste.js';
import { MaJournee } from './ui/ecrans/ma-journee.js';
import { ReglagesMomentDifficile } from './ui/ecrans/reglages-moment-difficile.js';
import { ReglagesRessourcer } from './ui/ecrans/reglages-ressourcer.js';
import { ReglagesEmotions } from './ui/ecrans/reglages-emotions.js';
import { Sauvegarde } from './ui/ecrans/sauvegarde.js';
import { Effacer } from './ui/ecrans/effacer.js';
import { Rappel } from './ui/ecrans/rappel.js';
import { AideIphone } from './ui/ecrans/aide-iphone.js';
import { Historique } from './ui/ecrans/historique.js';
import { Soins } from './ui/ecrans/soins.js';
import { Rdv } from './ui/ecrans/rdv.js';
import { Consultation } from './ui/ecrans/consultation.js';
import { Traitement } from './ui/ecrans/traitement.js';
import { Symptome } from './ui/ecrans/symptome.js';
import { Analyse } from './ui/ecrans/analyse.js';
import { Comprendre } from './ui/ecrans/comprendre.js';
import { ExportPsy } from './ui/ecrans/export-psy.js';
import { IndexListes, EcranListe } from './ui/ecrans/listes.js';
import { Soignants } from './ui/ecrans/soignants.js';
import { BienEtre, Coherence, ExerciceSeul } from './ui/ecrans/bien-etre.js';
import { EntreeBienEtre } from './ui/ecrans/entree-bien-etre.js';
import { Programme, SeanceProgramme } from './ui/ecrans/programme.js';
import { Minuteur } from './ui/ecrans/minuteur.js';
import { Concentration } from './ui/ecrans/concentration.js';
import { Sons } from './ui/ecrans/sons.js';
import { MesRefuges } from './ui/ecrans/refuges.js';

const ECRANS = {
  aujourdhui: () => html`<${Aujourdhui} />`,
  jour: (p) => html`<${Aujourdhui} date=${p.date} />`,
  'historique-jour': (p) => html`<${Aujourdhui} date=${p.date} depuisHistorique=${true} />`,
  // Un relevé neuf, ou un relevé rouvert (v9) : chacun sa clé, pour que passer de l'un à l'autre reparte de zéro.
  moment: () => html`<${Moment} key="neuf" />`,
  'moment-releve': (p) => html`<${Moment} key=${`releve-${p.id}`} id=${p.id} />`,
  'moment-difficile': () => html`<${MomentDifficile} />`,
  crise: (p) => html`<${ExerciceCrise} key=${p.id} id=${p.id} />`,
  'mon-plan': () => html`<${MonPlan} />`,
  'apres-coup-liste': () => html`<${ApresCoupListe} />`,
  'apres-coup': (p) => html`<${ApresCoup} key=${p.id} id=${p.id} />`,
  'reglages-journee': () => html`<${MaJournee} />`,
  'reglages-moment-difficile': () => html`<${ReglagesMomentDifficile} />`,
  'reglages-ressourcer': () => html`<${ReglagesRessourcer} />`,
  'reglages-emotions': () => html`<${ReglagesEmotions} />`,
  episode: (p) => html`<${Episode} key=${p.id === 'nouveau' ? 'nouveau' : 'existant'} id=${p.id} />`,
  historique: () => html`<${Historique} />`,
  soins: () => html`<${Soins} />`,
  rdv: (p) => html`<${Rdv} key=${p.id === 'nouveau' ? 'nouveau' : 'existant'} id=${p.id} />`,
  consultation: (p) => html`<${Consultation} key=${p.id} id=${p.id} />`,
  traitement: (p) => html`<${Traitement} key=${p.id === 'nouveau' ? 'nouveau' : 'existant'} id=${p.id} />`,
  symptome: (p) => html`<${Symptome} key=${p.id === 'nouveau' ? 'nouveau' : 'existant'} id=${p.id} />`,
  reglages: () => html`<${Reglages} />`,
  'reglages-sauvegarde': () => html`<${Sauvegarde} />`,
  'reglages-effacer': () => html`<${Effacer} />`,
  'reglages-rappel': () => html`<${Rappel} />`,
  'reglages-aide-iphone': () => html`<${AideIphone} />`,
  diagnostic: () => html`<${Diagnostic} />`,
  analyse: () => html`<${Analyse} />`,
  comprendre: (p) => html`<${Comprendre} onglet=${p.onglet} />`,
  'export-psy': () => html`<${ExportPsy} />`,
  'listes-index': () => html`<${IndexListes} />`,
  soignants: () => html`<${Soignants} />`,
  listes: (p) => html`<${EcranListe} key=${p.liste} liste=${p.liste} />`,
  'bien-etre': () => html`<${BienEtre} />`,
  'entree-bien-etre': (p) => html`<${EntreeBienEtre} key=${p.entree} id=${p.entree} />`,
  coherence: () => html`<${Coherence} />`,
  programme: () => html`<${Programme} />`,
  'seance-programme': (p) => html`<${SeanceProgramme} key=${p.id} id=${p.id} />`,
  exercice: (p) => html`<${ExerciceSeul} key=${p.id} id=${p.id} />`,
  minuteur: () => html`<${Minuteur} />`,
  concentration: () => html`<${Concentration} />`,
  sons: () => html`<${Sons} />`,
  refuges: () => html`<${MesRefuges} />`,
};

function useEtatApp() {
  const [etat, setEtat] = useState(etatApp.lire());
  useEffect(() => etatApp.abonner(setEtat), []);
  return etat;
}

export function App({ guide }) {
  const etat = useEtatApp();
  if (guide) return html`<${Guide} />`;
  const { route } = etat;
  const rendu = ECRANS[route.nom] || ECRANS.aujourdhui;
  // Dans un parcours, le toast se pose en haut : il ne couvre pas les réponses, près du pouce (2b). Pas celui qu'un
  // parcours affiche en se fermant (l'adresse a déjà changé, l'écran pas encore) : il reste en bas, sans sauter.
  const toastEnHaut = etat.parcoursOuvert && lireRoute(location.hash).nom === route.nom;
  return html`<div class="app">
    ${estSiteTest() && html`<div class="bandeau-test">TEST</div>`}
    ${etat.majDisponible && !etat.parcoursOuvert && html`<${BandeauMaj} surRecharger=${appliquerMaj} />`}
    ${rendu(route.params)}
    <${Toast} toast=${etat.toast} enHaut=${toastEnHaut} />
    ${!etat.parcoursOuvert && html`<${BarreOnglets} actif=${ongletDe(route.nom)} />`}
  </div>`;
}
