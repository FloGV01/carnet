// Réglages › Me ressourcer (v6) : la règle, éteinte au départ (méta `ressourcer`). Allumée, une énergie basse
// notée maintenant dans l'Humeur du moment affiche « Pour récupérer, je… » (domain/ressourcer.js). Le choix
// s'enregistre d'un toucher.
import { html, useEffect, useRef, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { Interrupteur } from '../composants/interrupteur.js';
import { lireRessourcer } from '../composants/ressourcer.js';
import { repo } from '../../donnees.js';
import { normaliserRessourcer } from '../../domain/ressourcer.js';

const LIBELLE = 'Quand je note une énergie basse, montre-moi ma liste.';

export function ReglagesRessourcer() {
  const [reglage, setReglage] = useState(null);
  const file = useRef(Promise.resolve());
  useEffect(() => { lireRessourcer().then(setReglage); }, []);
  // Les écritures se suivent : deux touchers rapprochés ne s'écrasent pas.
  const changer = (energieBasse) => {
    file.current = file.current.then(async () => {
      setReglage(normaliserRessourcer(await repo.meta.modifier('ressourcer', (v) => ({ ...normaliserRessourcer(v), energieBasse }))));
    }).catch(() => {});
  };
  const retour = () => { location.hash = '#/reglages'; };
  if (!reglage) return html`<main class="ecran fiche"><${Entete} titre="Me ressourcer" retour=${retour} /></main>`;
  return html`<main class="ecran fiche reglages-ressourcer">
    <${Entete} titre="Me ressourcer" retour=${retour} />
    <ul class="liste carte carte-groupe">
      <li>
        <div class="ligne-interrupteur">
          <span class="ligne-libelle">${LIBELLE}</span>
          <${Interrupteur} etiquette=${LIBELLE} actif=${reglage.energieBasse} surChanger=${changer} />
        </div>
      </li>
    </ul>
    <p class="aide-carte">Ma liste est « Pour récupérer, je… », dans Mon plan. Elle ne s'affiche que quand je note moi-même l'énergie, maintenant.</p>
  </main>`;
}
