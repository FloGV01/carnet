// Minuteur de concentration (v10, spec §9.2 et §14.3) : un écran plein de l'onglet Bien-être. Un outil de travail, pas un
// exercice : rien n'est écrit en base.
// - Avant : la durée (15 · 25 · 45 min), un son de fond facultatif (« Aucun » au départ, puis les quatre), « Commencer » et
//   l'épingle.
// - Pendant : le temps restant et « Arrêter ». L'heure de fin est fixée une fois, au départ, à l'horloge murale : le temps
//   continue quand la page est cachée, il n'y a pas de pause. L'écran est gardé allumé. Session « ambient » : le son respecte
//   le mode silencieux et ne coupe pas la musique ; son volume est celui de l'écran des sons.
// - La fin : « Le temps est passé. », sans chiffre, et le bol seulement si l'app est à l'écran à cet instant. Au retour après
//   l'heure de fin, le même texte, sans bol.
// Les réglages restent sur cet appareil (`carnet:concentration`), écrits seulement quand ils changent.
import { html, useEffect, useReducer, useRef, useState } from '../lib.js';
import { CadreParcours } from '../composants/parcours.js';
import { Epingle } from '../composants/epingle.js';
import { minuteur, retourDemande } from '../composants/lecteur.js';
import { PuceReglage } from '../composants/respiration.js';
import { Segmente } from '../composants/segmente.js';
import { preparerSon, relancerSon, suspendreSon } from '../composants/signal-sonore.js';
import { DUREE_BOL_MINUTEUR_S, sons } from '../composants/sons.js';
import { FONDU_SORTIE_S, LIBELLES_FOND, SONS_DE_FOND, demarrerFond } from '../composants/sons-de-fond.js';
import { Icones } from '../icones.js';
import { ecrireLocal, lireLocal } from '../hooks.js';
import { useVerrouEcran } from '../seance.js';
import { lireReglagesSons } from './sons.js';
import { titreElement } from '../../domain/entrees-bien-etre.js';

const CLE_CONCENTRATION = 'carnet:concentration';
const TEMPS_PASSE = 'Le temps est passé.';
const ID = 'concentration';
const DUREES = [15, 25, 45];
const AUCUN = 'aucun';
const DEFAUT = Object.freeze({ duree: 25, son: AUCUN });
const OPTIONS_DUREE = DUREES.map((d) => ({ valeur: d, libelle: `${d} min` }));
const OPTIONS_SON = [[AUCUN, 'Aucun'], ...SONS_DE_FOND.map((s) => [s, LIBELLES_FOND[s]])];
const TIC_MS = 200;
// Le bol est programmé un peu en avance, à l'instant exact sur l'horloge audio.
const AVANCE_MS = 450;
// Passé ce retard, la fin n'a pas eu lieu à l'écran (l'app revient au premier plan, ses minuteries repartent) : pas de bol.
const RETARD_BOL_MS = 2000;
const VEILLE_SORTIE_MS = FONDU_SORTIE_S * 1000 + 200;

function lireReglages() {
  const v = lireLocal(CLE_CONCENTRATION, null);
  const r = v && typeof v === 'object' ? v : {};
  return { duree: DUREES.includes(r.duree) ? r.duree : DEFAUT.duree, son: SONS_DE_FOND.includes(r.son) ? r.son : DEFAUT.son };
}
const pageVisible = () => document.visibilityState !== 'hidden';

export function Concentration() {
  const [reglages, setReglages] = useState(lireReglages);
  const [etat, setEtat] = useState('avant'); // 'avant', 'en-cours', 'fini'
  const [retour] = useState(retourDemande);
  const [, tic] = useReducer((n) => n + 1, 0);
  const verrou = useVerrouEcran();
  const titre = titreElement(ID);
  const finA = useRef(0);
  const bolProgramme = useRef(false);
  const seconde = useRef(null);
  const fond = useRef(null);
  // L'état courant, pour les gestionnaires installés une fois (page cachée, sortie) et les minuteries.
  const courant = useRef(etat);
  courant.current = etat;
  const passer = (e) => { courant.current = e; setEtat(e); };

  // Écrit seulement si la valeur change.
  const changer = (champ, valeur) => {
    if (reglages[champ] === valeur) return;
    const suite = { ...reglages, [champ]: valeur };
    setReglages(suite);
    ecrireLocal(CLE_CONCENTRATION, suite);
  };
  const couperFond = (fonduS) => {
    if (!fond.current) return;
    fond.current.arreter(fonduS);
    fond.current = null;
  };
  const commencer = () => {
    const dureeS = reglages.duree * 60;
    // Le contexte se prépare dans ce toucher, avec ou sans son : le bol de fin en a besoin.
    if (reglages.son === AUCUN) preparerSon({ session: 'ambient' });
    else fond.current = demarrerFond(reglages.son, { minuterieS: dureeS, volume: lireReglagesSons().volume, session: 'ambient' });
    finA.current = Date.now() + dureeS * 1000;
    bolProgramme.current = false;
    passer('en-cours');
    verrou.prendre();
  };
  const arreter = () => {
    couperFond();
    sons.couper();
    suspendreSon({ apresMs: VEILLE_SORTIE_MS });
    verrou.rendre();
    passer('avant');
  };
  const finir = () => {
    const aLEcran = pageVisible() && Date.now() - finA.current < RETARD_BOL_MS;
    if (aLEcran && !bolProgramme.current) sons.bolMinuteur();
    couperFond(0.3);
    suspendreSon({ apresMs: aLEcran ? DUREE_BOL_MINUTEUR_S * 1000 : undefined });
    verrou.rendre();
    passer('fini');
  };

  useEffect(() => {
    if (etat !== 'en-cours') return undefined;
    const avancer = () => {
      // Un tic d'avant le nouveau rendu ne fait rien.
      if (courant.current !== 'en-cours') return;
      const reste = finA.current - Date.now();
      if (reste <= 0) { finir(); return; }
      if (!bolProgramme.current && reste <= AVANCE_MS && pageVisible()) {
        sons.bolMinuteur({ dansS: reste / 1000 });
        bolProgramme.current = true;
      }
      // Un nouveau rendu seulement quand le chiffre change.
      const s = Math.ceil(reste / 1000);
      if (s !== seconde.current) { seconde.current = s; tic(); }
    };
    // Cachée : le bol programmé s'annule, le temps continue. De retour : le son et l'écran gardé repartent, ou c'est déjà fini.
    const visibilite = () => {
      if (courant.current !== 'en-cours') return;
      if (document.visibilityState === 'hidden') {
        sons.couper();
        bolProgramme.current = false;
        return;
      }
      if (finA.current <= Date.now()) { finir(); return; }
      relancerSon();
      verrou.prendre();
      tic();
    };
    const m = setInterval(avancer, TIC_MS);
    document.addEventListener('visibilitychange', visibilite);
    return () => { clearInterval(m); document.removeEventListener('visibilitychange', visibilite); };
  }, [etat]);
  // Sortie : le son s'éteint en fondu court, plus rien ne reste programmé.
  useEffect(() => () => {
    const e = courant.current;
    verrou.rendre();
    if (e !== 'en-cours' && e !== 'fini') return;
    couperFond();
    sons.couper();
    suspendreSon({ apresMs: VEILLE_SORTIE_MS });
  }, []);

  const fermer = () => { location.hash = retour; };
  let corps = null;
  let pied = null;
  if (etat === 'avant') {
    corps = html`<div class="lecteur lecteur-avant">
      <div class="lecteur-ligne">
        <p class="lecteur-duree">${reglages.duree} min</p>
        <${Epingle} id=${ID} titre=${titre} />
      </div>
      <p class="lecteur-description">Le temps restant s'affiche, et continue si tu quittes Emozio. Un bol à la fin, si l'app est à l'écran.</p>
      <${Segmente} etiquette="Durée" classe="large" options=${OPTIONS_DUREE} valeur=${reglages.duree} surChoix=${(v) => changer('duree', v)} sansVide=${true} />
      <div class="lecteur-centre">
        <button type="button" class="bouton-lecture grand" aria-label="Commencer" onClick=${commencer}>${Icones.lecture()}</button>
      </div>
      <ul class="liste carte carte-groupe reglages-lecteur" aria-label="Réglages du minuteur">
        <li class="ligne-interrupteur reglage-son">
          <span class="ligne-libelle" aria-hidden="true">Son de fond</span>
          <${PuceReglage} etiquette="Son de fond" valeur=${reglages.son} options=${OPTIONS_SON} surChoix=${(v) => changer('son', v)} />
        </li>
      </ul>
    </div>`;
  } else if (etat === 'fini') {
    corps = html`<div class="lecteur lecteur-plein"><p class="lecteur-consigne">${TEMPS_PASSE}</p></div>`;
  } else {
    corps = html`<div class="lecteur lecteur-plein">
      <div class="lecteur-centre">
        <p class="temps-restant" role="timer" aria-label="Temps restant">${minuteur(finA.current - Date.now())}</p>
        ${reglages.son !== AUCUN && html`<p class="lecteur-reste">${LIBELLES_FOND[reglages.son]}</p>`}
      </div>
    </div>`;
    pied = html`<button type="button" class="btn btn-plein bouton-arreter" onClick=${arreter}>Arrêter</button>`;
  }
  return html`<${CadreParcours} titre=${titre} teinte="bien-etre" icone=${etat === 'avant' ? 'historique' : undefined} surFermer=${fermer} pied=${pied}>${corps}</${CadreParcours}>`;
}
