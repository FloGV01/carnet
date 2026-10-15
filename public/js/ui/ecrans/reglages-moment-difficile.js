// Réglages › Moment difficile (v6) : la respiration guidée (durée, rythme, signal sonore, méta
// `respiration`) et les rubriques de Mon plan qui passent dans « Une chose à la fois » (méta
// `uneChoseALaFois`). Chaque choix s'enregistre d'un toucher.
import { html, useEffect, useRef, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { Interrupteur } from '../composants/interrupteur.js';
import { Segmente } from '../composants/segmente.js';
import { repo } from '../../donnees.js';
import { DUREES, RYTHMES, normaliserRespiration } from '../../domain/respiration.js';
import { RUBRIQUES_PLAN, TITRE_SI_ALORS, normaliserUneChose } from '../../domain/mon-plan.js';

const OPTIONS_DUREE = DUREES.map((d) => ({ valeur: d, libelle: `${d} min` }));
const OPTIONS_RYTHME = RYTHMES.map((r) => ({ valeur: r, libelle: r }));

export function ReglagesMomentDifficile() {
  const [respiration, setRespiration] = useState(null);
  const [uneChose, setUneChose] = useState(null);
  const file = useRef(Promise.resolve());
  // Une lecture qui échoue donne les réglages par défaut : l'écran ne reste jamais vide.
  useEffect(() => {
    repo.meta.lire('respiration').catch(() => null).then((v) => setRespiration(normaliserRespiration(v)));
    repo.meta.lire('uneChoseALaFois').catch(() => null).then((v) => setUneChose(normaliserUneChose(v)));
  }, []);
  // Les écritures se suivent : deux touchers rapprochés ne s'écrasent pas.
  const ecrire = (cleMeta, normaliser, poser, modifier) => {
    file.current = file.current.then(async () => {
      poser(normaliser(await repo.meta.modifier(cleMeta, (v) => modifier(normaliser(v)))));
    }).catch(() => {});
  };
  const changer = (cle) => (valeur) => ecrire('respiration', normaliserRespiration, setRespiration, (r) => ({ ...r, [cle]: valeur }));
  // Une rubrique allumée ou éteinte : la liste garde l'ordre de Mon plan.
  const choisirRubrique = (cle) => (actif) => ecrire('uneChoseALaFois', normaliserUneChose, setUneChose, (u) => ({
    ...u, rubriques: RUBRIQUES_PLAN.map(([k]) => k).filter((k) => (k === cle ? actif : u.rubriques.includes(k))),
  }));
  const choisirSiAlors = (actif) => ecrire('uneChoseALaFois', normaliserUneChose, setUneChose, (u) => ({ ...u, siAlors: actif }));
  const retour = () => { location.hash = '#/reglages'; };
  if (!respiration || !uneChose) return html`<main class="ecran fiche"><${Entete} titre="Moment difficile" retour=${retour} /></main>`;
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
    <h2 class="libelle-section">Une chose à la fois</h2>
    <ul class="liste carte carte-groupe">
      ${RUBRIQUES_PLAN.map(([cle, titre]) => html`<li>
        <div class="ligne-interrupteur">
          <span class="ligne-libelle">${titre}</span>
          <${Interrupteur} etiquette=${titre} actif=${uneChose.rubriques.includes(cle)} surChanger=${choisirRubrique(cle)} />
        </div>
      </li>`)}
      <li>
        <div class="ligne-interrupteur">
          <span class="ligne-libelle">${TITRE_SI_ALORS}</span>
          <${Interrupteur} etiquette=${TITRE_SI_ALORS} actif=${uneChose.siAlors} surChanger=${choisirSiAlors} />
        </div>
      </li>
    </ul>
    <p class="aide-carte">Chaque ligne des rubriques allumées devient un écran, avec le nom de la rubrique en petit. Ils s'ouvrent depuis Moment difficile.</p>
  </main>`;
}
