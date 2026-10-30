// Réglages › Me ressourcer (v6) : la règle, éteinte au départ (méta `ressourcer`). Allumée, un relevé d'énergie basse
// noté maintenant affiche « Pour récupérer, je… » (domain/ressourcer.js). Le choix s'enregistre d'un toucher.
// v9 (relecture finale) : on ne note plus l'énergie, elle vient de la case du mot (domain/carte-roue.js, energieDe :
// rangs 1 à 4 basse, 5 à 8 moyenne ; un mot à soi, basse en bleu et en vert). Les textes le disent : la bulle « Énergie
// basse » ne suffit pas, Fatigué et Calme sont en énergie moyenne.
import { html, useEffect, useRef, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { Interrupteur } from '../composants/interrupteur.js';
import { lireRessourcer } from '../composants/ressourcer.js';
import { repo } from '../../donnees.js';
import { normaliserRessourcer } from '../../domain/ressourcer.js';

const LIBELLE = 'Quand je choisis un mot d\'énergie basse, montre-moi ma liste.';
const AIDE = 'Ma liste est « Pour récupérer, je… », dans Mon plan. Un mot est d\'énergie basse dans les quatre rangs du bas '
  + 'de la carte (Épuisé, Vide, Reposé, Serein…), ou si c\'est un mot à moi, en bleu ou en vert ; Fatigué et Calme, un '
  + 'peu plus haut, sont d\'énergie moyenne. La liste ne s\'affiche pas pour un relevé noté « C\'était vers… ».';

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
    <p class="aide-carte">${AIDE}</p>
  </main>`;
}
