import { html, useEffect, useRef, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { VERSION, VERSION_APP } from '../../version.js';
import { etatStockage, formaterOctets } from '../../plateforme/persistance.js';
import { verifierMaj } from '../../plateforme/sw-client.js';
import { afficherToast } from '../composants/toast.js';

function useAppuiLong(action, ms = 700) {
  const minuteur = useRef(null);
  const debut = () => { minuteur.current = setTimeout(action, ms); };
  const fin = () => clearTimeout(minuteur.current);
  return { onPointerDown: debut, onPointerUp: fin, onPointerLeave: fin, onPointerCancel: fin, onContextMenu: (e) => e.preventDefault() };
}

export function Reglages() {
  const [stockage, setStockage] = useState(null);
  const horsLigne = typeof navigator !== 'undefined' && navigator.serviceWorker && navigator.serviceWorker.controller;
  useEffect(() => { etatStockage().then(setStockage); }, []);
  const appui = useAppuiLong(() => { location.hash = '#/diagnostic'; });
  const chercher = async () => {
    const ok = await verifierMaj(true);
    afficherToast(ok ? 'Recherche faite.' : 'Pas de recherche possible ici.', null, 2500);
  };
  return html`<main class="ecran">
    <${Entete} titre="Réglages" />
    <section class="section">
      <h2>À propos</h2>
      <div class="carte">
        <p>Tes données restent sur cet iPhone.</p>
        <ul class="liste section">
          <li class="ligne"><span>Version</span><span class="discret version-app" ...${appui}>${VERSION_APP} · ${VERSION}</span></li>
          <li class="ligne"><span>Stockage protégé</span><span>${stockage ? (stockage.persiste ? 'oui' : 'non') : '·'}</span></li>
          <li class="ligne"><span>Espace utilisé</span><span>${stockage ? formaterOctets(stockage.utilise) : '·'}</span></li>
          <li class="ligne"><span>Hors ligne</span><span>${horsLigne ? 'prêt' : 'pas encore'}</span></li>
        </ul>
        <button type="button" class="btn" onClick=${chercher}>Rechercher une mise à jour</button>
      </div>
    </section>
  </main>`;
}
