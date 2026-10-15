// Réglages › Moment difficile (v6) : la respiration guidée (durée, rythme, signal sonore). Chaque
// choix s'enregistre d'un toucher dans la méta `respiration`.
import { html, useEffect, useRef, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { Interrupteur } from '../composants/interrupteur.js';
import { Segmente } from '../composants/segmente.js';
import { repo } from '../../donnees.js';
import { DUREES, RYTHMES, normaliserRespiration } from '../../domain/respiration.js';

const OPTIONS_DUREE = DUREES.map((d) => ({ valeur: d, libelle: `${d} min` }));
const OPTIONS_RYTHME = RYTHMES.map((r) => ({ valeur: r, libelle: r }));

export function ReglagesMomentDifficile() {
  const [respiration, setRespiration] = useState(null);
  const file = useRef(Promise.resolve());
  // Une lecture qui échoue donne les réglages par défaut : l'écran ne reste jamais vide.
  useEffect(() => { repo.meta.lire('respiration').catch(() => null).then((v) => setRespiration(normaliserRespiration(v))); }, []);
  // Les écritures se suivent : deux touchers rapprochés ne s'écrasent pas.
  const changer = (cle) => (valeur) => {
    file.current = file.current.then(async () => {
      setRespiration(normaliserRespiration(await repo.meta.modifier('respiration', (v) => ({ ...normaliserRespiration(v), [cle]: valeur }))));
    }).catch(() => {});
  };
  const retour = () => { location.hash = '#/reglages'; };
  if (!respiration) return html`<main class="ecran fiche"><${Entete} titre="Moment difficile" retour=${retour} /></main>`;
  return html`<main class="ecran fiche reglages-moment-difficile">
    <${Entete} titre="Moment difficile" retour=${retour} />
    <h2 class="libelle-section">Respiration</h2>
    <ul class="liste carte carte-groupe">
      <li class="reglage-respiration">
        <span class="libelle-carte">Durée</span>
        <${Segmente} etiquette="Durée" classe="large" options=${OPTIONS_DUREE} valeur=${respiration.duree} surChoix=${changer('duree')} sansVide=${true} />
      </li>
      <li class="reglage-respiration">
        <span class="libelle-carte">Rythme</span>
        <${Segmente} etiquette="Rythme" classe="large" options=${OPTIONS_RYTHME} valeur=${respiration.rythme} surChoix=${changer('rythme')} sansVide=${true} />
        <p class="note-carte-interne">5-5 : 5 secondes pour inspirer, 5 pour expirer. 4-6 : 4 pour inspirer, 6 pour expirer.</p>
      </li>
      <li>
        <div class="ligne-interrupteur">
          <span class="ligne-libelle">Signal sonore</span>
          <${Interrupteur} etiquette="Signal sonore" actif=${respiration.son} surChanger=${changer('son')} />
        </div>
        <p class="note-carte-interne marge-interne">Un son doux à chaque changement de phase. Il se tait quand l'iPhone est en silencieux et se mêle à la musique.</p>
      </li>
    </ul>
  </main>`;
}
