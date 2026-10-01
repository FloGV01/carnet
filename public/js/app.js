// Racine de l'interface : route courante, onglets, bandeau de mise à jour, toast.
import { html, useEffect, useState } from './ui/lib.js';
import { etatApp } from './store.js';
import { ongletDe } from './routeur.js';
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

const ECRANS = {
  aujourdhui: () => html`<${Aujourdhui} />`,
  jour: (p) => html`<${Aujourdhui} date=${p.date} />`,
  historique: () => html`<${EcranAttente} titre="Historique" />`,
  soins: () => html`<${EcranAttente} titre="Soins" />`,
  reglages: () => html`<${Reglages} />`,
  'reglages-sauvegarde': () => html`<${Reglages} />`,
  diagnostic: () => html`<${Diagnostic} />`,
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
  return html`<div class="app">
    ${estSiteTest() && html`<div class="bandeau-test">TEST</div>`}
    ${etat.majDisponible && !etat.parcoursOuvert && html`<${BandeauMaj} surRecharger=${appliquerMaj} />`}
    ${rendu(route.params)}
    <${Toast} toast=${etat.toast} />
    ${!etat.parcoursOuvert && html`<${BarreOnglets} actif=${ongletDe(route.nom)} />`}
  </div>`;
}
