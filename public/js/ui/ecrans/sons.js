// Sons de fond (v10, spec §9.3 et §14) : un écran plein de l'onglet Bien-être, où le son vit (composants/sons-de-fond.js).
// - Avant : le choix du son, la minuterie (15 · 30 · 60 min), le volume, « Commencer » et l'épingle. Une ligne dit ce que fait la
//   session « playback » : le son joue en mode silencieux et met la musique en pause.
// - Pendant : le son choisi, la minuterie, le volume et « Arrêter ».
// Le contexte audio naît dans le toucher « Commencer ». Quitter l'écran (« Fermer », retour) arrête le son, en fondu court ; le
// verrouillage ou une autre app ne quittent pas l'écran : le son continue, et l'écran n'est pas gardé allumé (spec §14.2). Il
// n'y a pas de pause, pas de séance : rien n'est écrit en base. Les réglages restent sur cet appareil (`carnet:sons`), écrits
// seulement quand ils changent. La minuterie finie, l'écran revient à son début.
import { html, useEffect, useRef, useState } from '../lib.js';
import { CadreParcours } from '../composants/parcours.js';
import { Epingle } from '../composants/epingle.js';
import { retourDemande } from '../composants/lecteur.js';
import { Segmente } from '../composants/segmente.js';
import { relancerSon, suspendreSon } from '../composants/signal-sonore.js';
import { FONDU_SORTIE_S, LIBELLES_FOND, SONS_DE_FOND, demarrerFond } from '../composants/sons-de-fond.js';
import { Icones } from '../icones.js';
import { ecrireLocal, lireLocal } from '../hooks.js';
import { titreElement } from '../../domain/entrees-bien-etre.js';
import { pourAffichage } from '../../domain/typographie.js';

const CLE_SONS = 'carnet:sons';
const ID = 'sons-de-fond';
const MINUTERIES = [15, 30, 60];
const DEFAUT = Object.freeze({ son: SONS_DE_FOND[0], minuterie: 30, volume: 0.5 });
const OPTIONS_SON = SONS_DE_FOND.map((s) => ({ valeur: s, libelle: LIBELLES_FOND[s] }));
const OPTIONS_MINUTERIE = MINUTERIES.map((m) => ({ valeur: m, libelle: `${m} min` }));
// Le contexte dort une fois le fondu fini : la session audio est alors rendue à iOS, et la musique peut repartir.
const VEILLE_MS = FONDU_SORTIE_S * 1000 + 200;
const VERIFIE_MS = 1000;

const VOLUME_MIN = 0.05;
const estVolume = (v) => typeof v === 'number' && v >= VOLUME_MIN && v <= 1;
// Une clé abîmée (ou d'une autre version) ne compte pas : chaque valeur retombe sur son défaut.
export function lireReglagesSons() {
  const v = lireLocal(CLE_SONS, null);
  const r = v && typeof v === 'object' ? v : {};
  return {
    son: SONS_DE_FOND.includes(r.son) ? r.son : DEFAUT.son,
    minuterie: MINUTERIES.includes(r.minuterie) ? r.minuterie : DEFAUT.minuterie,
    volume: estVolume(r.volume) ? r.volume : DEFAUT.volume,
  };
}

// Le volume bouge le son pendant le geste, et n'est écrit qu'au lâcher. La part remplie de la piste, à l'accent jusqu'au
// bouton (v12, ecrans.css), suit la valeur : --part, de 0 à 1, posée par style (CSSOM, jamais un attribut écrit en texte).
function Volume({ valeur, surGlisser, surLacher }) {
  const part = (valeur - VOLUME_MIN) / (1 - VOLUME_MIN);
  return html`<label class="reglage-volume">
    <span>Volume</span>
    <input type="range" min=${VOLUME_MIN} max="1" step="0.05" value=${valeur} aria-valuetext=${`${Math.round(valeur * 100)} %`}
      style=${{ '--part': String(Math.round(part * 1000) / 1000) }}
      onInput=${(e) => surGlisser(Number(e.target.value))} onChange=${(e) => surLacher(Number(e.target.value))} />
  </label>`;
}

export function Sons() {
  const [reglages, setReglages] = useState(lireReglagesSons);
  const [volume, setVolume] = useState(reglages.volume);
  const [enCours, setEnCours] = useState(false);
  const [retour] = useState(retourDemande);
  const fond = useRef(null);
  const finA = useRef(0);
  const titre = titreElement(ID);

  // Écrit seulement si la valeur change.
  const changer = (champ, valeur) => {
    if (reglages[champ] === valeur) return;
    const suite = { ...reglages, [champ]: valeur };
    setReglages(suite);
    ecrireLocal(CLE_SONS, suite);
  };
  const glisser = (v) => {
    setVolume(v);
    if (fond.current) fond.current.regler(v);
  };
  const commencer = () => {
    const { son, minuterie } = reglages;
    fond.current = demarrerFond(son, { minuterieS: minuterie * 60, volume });
    finA.current = Date.now() + minuterie * 60000;
    setEnCours(true);
  };
  const arreter = () => {
    if (!fond.current) return;
    fond.current.arreter();
    fond.current = null;
    suspendreSon({ apresMs: VEILLE_MS });
    setEnCours(false);
  };
  // La minuterie est sur l'horloge audio ; l'écran la retrouve à l'horloge murale, relue aussi au retour : le son s'est déjà
  // éteint, ou s'éteint maintenant si le contexte a été interrompu (son horloge s'est arrêtée).
  useEffect(() => {
    if (!enCours) return undefined;
    const verifier = () => { if (Date.now() >= finA.current) arreter(); };
    const auRetour = () => {
      if (document.visibilityState === 'hidden') return;
      relancerSon();
      verifier();
    };
    const m = setInterval(verifier, VERIFIE_MS);
    document.addEventListener('visibilitychange', auRetour);
    return () => { clearInterval(m); document.removeEventListener('visibilitychange', auRetour); };
  }, [enCours]);
  // Quitter l'écran arrête le son : il n'y a pas de son sans son écran.
  useEffect(() => arreter, []);

  const fermer = () => { location.hash = retour; };
  const curseur = html`<${Volume} valeur=${volume} surGlisser=${glisser} surLacher=${(v) => changer('volume', v)} />`;
  const corps = enCours
    ? html`<div class="lecteur lecteur-plein">
        <p class="lecteur-consigne">${LIBELLES_FOND[reglages.son]}</p>
        <p class="lecteur-description">${pourAffichage(`Minuterie : ${reglages.minuterie} min, puis le son s'éteint en fondu.`)}</p>
        <div class="lecteur-centre"></div>
        ${curseur}
      </div>`
    : html`<div class="lecteur lecteur-avant">
        <div class="lecteur-ligne">
          <p class="lecteur-duree">${reglages.minuterie} min, puis un fondu</p>
          <${Epingle} id=${ID} titre=${titre} />
        </div>
        <p class="lecteur-description">Le son joue aussi en mode silencieux et met ta musique en pause.</p>
        <${Segmente} etiquette="Son" classe="large choix-son" options=${OPTIONS_SON} valeur=${reglages.son} surChoix=${(v) => changer('son', v)} sansVide=${true} />
        <${Segmente} etiquette="Minuterie" classe="large" options=${OPTIONS_MINUTERIE} valeur=${reglages.minuterie} surChoix=${(v) => changer('minuterie', v)} sansVide=${true} />
        ${curseur}
        <div class="lecteur-centre">
          <button type="button" class="bouton-lecture grand" aria-label="Commencer" onClick=${commencer}>${Icones.lecture()}</button>
        </div>
      </div>`;
  const pied = enCours && html`<button type="button" class="btn btn-plein bouton-arreter" onClick=${arreter}>Arrêter</button>`;
  return html`<${CadreParcours} titre=${titre} icone=${enCours ? undefined : 'onde'} surFermer=${fermer} pied=${pied}>${corps}</${CadreParcours}>`;
}
