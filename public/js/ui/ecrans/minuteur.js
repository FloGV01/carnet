// Minuteur silencieux (v10, spec §9.1 et §14.3) : un écran plein de l'onglet Bien-être, qui se comporte comme le lecteur.
// - Avant : la durée (5 · 10 · 20 min), « Un son chaque minute » (éteint au départ), « Commencer » et l'épingle.
// - Pendant : un bol au début, un bol à la fin, le son de chaque minute s'il est allumé, tous programmés sur l'horloge audio.
//   Le temps restant n'est jamais affiché : seulement « Arrêter ». L'écran est gardé allumé.
// - Page cachée (écran verrouillé, autre app) : pause, sons coupés, verrou rendu, séance notée si elle passe la règle. La pause
//   propose « Reprendre » ; le temps en pause ne compte pas.
// - La fin, au bout ou « Arrêter » : un bol, « Fin de l'exercice. », et l'écran se ferme seul 6 s plus tard, comme le lecteur,
//   avec le message « Noter mon émotion » après une séance notée.
// Session « ambient » : le son se tait en mode silencieux et se mêle à la musique. C'est une séance `{ exercice: 'minuteur',
// origine: 'bien-etre' }` (ui/seance.js : menée au bout, ou arrêtée après 60 s). Les réglages restent sur cet appareil
// (`carnet:minuteur`), écrits seulement quand ils changent.
import { html, useEffect, useRef, useState } from '../lib.js';
import { CadreParcours } from '../composants/parcours.js';
import { Epingle } from '../composants/epingle.js';
import { FERMETURE_MS, FIN, MESSAGE_MS, NOTER_EMOTION, retourDemande } from '../composants/lecteur.js';
import { Interrupteur } from '../composants/interrupteur.js';
import { Segmente } from '../composants/segmente.js';
import { preparerSon, suspendreSon } from '../composants/signal-sonore.js';
import { DUREE_BOL_MINUTEUR_S, sons } from '../composants/sons.js';
import { afficherToast } from '../composants/toast.js';
import { Icones } from '../icones.js';
import { ecrireLocal, lireLocal } from '../hooks.js';
import { useSeance, useVerrouEcran } from '../seance.js';
import { titreElement } from '../../domain/entrees-bien-etre.js';
import { pourAffichage } from '../../domain/typographie.js';

const CLE_MINUTEUR = 'carnet:minuteur';
const ID = 'minuteur';
const DUREES = [5, 10, 20];
const DEFAUT = Object.freeze({ duree: 5, intervalle: false });
const OPTIONS_DUREE = DUREES.map((d) => ({ valeur: d, libelle: `${d} min` }));
const SON_CHAQUE_MINUTE = 'Un son chaque minute';
const MINUTE_MS = 60000;
const TIC_MS = 200;
// Un bol est programmé un peu en avance, à l'instant exact sur l'horloge audio.
const AVANCE_MS = 450;

function lireReglages() {
  const v = lireLocal(CLE_MINUTEUR, null);
  const r = v && typeof v === 'object' ? v : {};
  return { duree: DUREES.includes(r.duree) ? r.duree : DEFAUT.duree, intervalle: r.intervalle === true };
}

export function Minuteur() {
  const [reglages, setReglages] = useState(lireReglages);
  const [etat, setEtat] = useState('avant'); // 'avant', 'en-cours', 'pause', 'fin'
  const [retour] = useState(retourDemande);
  const suivi = useSeance(ID, 'bien-etre');
  const verrou = useVerrouEcran();
  const titre = titreElement(ID);
  // Le temps actif, en ms : cumulé aux pauses, compté depuis `depuis` quand le minuteur tourne.
  const temps = useRef({ cumul: 0, depuis: null });
  // Le prochain son de chaque minute (en temps actif), et le bol de fin déjà programmé ou non.
  const bols = useRef({ prochain: MINUTE_MS, finProgramme: false });
  const fermeture = useRef(null);
  // L'état courant, pour les gestionnaires installés une fois (page cachée, sortie) et les minuteries.
  const courant = useRef({});
  courant.current = { etat, reglages };

  const ecoule = () => temps.current.cumul + (temps.current.depuis == null ? 0 : performance.now() - temps.current.depuis);
  const arreterTemps = () => { temps.current.cumul = ecoule(); temps.current.depuis = null; };
  const totalMs = () => courant.current.reglages.duree * MINUTE_MS;
  const noter = (terminee) => suivi.noter({ dureeS: ecoule() / 1000, terminee });
  const passer = (e) => { courant.current.etat = e; setEtat(e); };

  // Écrit seulement si la valeur change.
  const changer = (champ, valeur) => {
    if (reglages[champ] === valeur) return;
    const suite = { ...reglages, [champ]: valeur };
    setReglages(suite);
    ecrireLocal(CLE_MINUTEUR, suite);
  };
  // Ce qui tombe dans la petite avance est programmé à son instant exact. Une minute déjà passée (la page a été figée sans
  // être cachée) ne sonne plus : jamais de rafale.
  const programmer = (t) => {
    const b = bols.current;
    while (b.prochain < t) b.prochain += MINUTE_MS;
    if (courant.current.reglages.intervalle && b.prochain < totalMs() && b.prochain <= t + AVANCE_MS) {
      sons.bolIntervalle({ dansS: Math.max(0, b.prochain - t) / 1000 });
      b.prochain += MINUTE_MS;
    }
    if (!b.finProgramme && totalMs() <= t + AVANCE_MS) {
      sons.bolMinuteur({ dansS: Math.max(0, totalMs() - t) / 1000 });
      b.finProgramme = true;
    }
  };
  const commencer = () => {
    preparerSon({ session: 'ambient' });
    suivi.commencer();
    temps.current = { cumul: 0, depuis: performance.now() };
    bols.current = { prochain: MINUTE_MS, finProgramme: false };
    passer('en-cours');
    sons.bolMinuteur();
    verrou.prendre();
  };
  const pause = () => {
    if (courant.current.etat !== 'en-cours') return;
    arreterTemps();
    passer('pause');
    sons.couper();
    suspendreSon();
    verrou.rendre();
    noter(false);
  };
  const reprendre = () => {
    preparerSon({ session: 'ambient' });
    temps.current.depuis = performance.now();
    // Les sons programmés ont été coupés : on repart de la prochaine minute à venir.
    bols.current = { prochain: (Math.floor(temps.current.cumul / MINUTE_MS) + 1) * MINUTE_MS, finProgramme: false };
    passer('en-cours');
    verrou.prendre();
  };
  const fermer = () => {
    clearTimeout(fermeture.current);
    if (courant.current.etat === 'fin' && suivi.notee()) {
      afficherToast(FIN, { libelle: NOTER_EMOTION, faire: () => { location.hash = '#/moment'; } }, MESSAGE_MS);
    }
    location.hash = retour;
  };
  // `auBout` : le temps est écoulé, le bol est parti ou part maintenant. Sinon « Arrêter » : dans ce toucher, le contexte se
  // relance (il dort en pause) et les sons encore à venir sont annulés.
  const finir = (auBout) => {
    arreterTemps();
    passer('fin');
    verrou.rendre();
    if (!auBout) {
      sons.couper();
      preparerSon({ session: 'ambient' });
    }
    if (!auBout || !bols.current.finProgramme) sons.bolMinuteur();
    noter(auBout);
    fermeture.current = setTimeout(fermer, FERMETURE_MS);
  };

  useEffect(() => {
    if (etat !== 'en-cours') return undefined;
    const avancer = () => {
      // Un tic d'avant le nouveau rendu (pause, fin) ne fait rien.
      if (courant.current.etat !== 'en-cours') return;
      const t = ecoule();
      if (t >= totalMs()) finir(true); else programmer(t);
    };
    avancer();
    const m = setInterval(avancer, TIC_MS);
    return () => clearInterval(m);
  }, [etat]);
  // Page cachée (écran verrouillé, autre app) ou quittée : pause.
  useEffect(() => {
    const cachee = () => { if (document.visibilityState === 'hidden') pause(); };
    document.addEventListener('visibilitychange', cachee);
    window.addEventListener('pagehide', pause);
    return () => { document.removeEventListener('visibilitychange', cachee); window.removeEventListener('pagehide', pause); };
  }, []);
  // Sortie : sons coupés, verrou rendu, séance notée si elle passe la règle. Le dernier bol s'éteint avant la fermeture.
  useEffect(() => () => {
    const { etat: e } = courant.current;
    if (e === 'en-cours' || e === 'pause') { arreterTemps(); noter(false); }
    courant.current.etat = 'sortie';
    clearTimeout(fermeture.current);
    verrou.rendre();
    if (e === 'avant') return;
    sons.couper();
    suspendreSon({ apresMs: e === 'fin' ? DUREE_BOL_MINUTEUR_S * 1000 : undefined });
  }, []);

  let corps = null;
  let pied = null;
  if (etat === 'avant') {
    corps = html`<div class="lecteur lecteur-avant">
      <div class="lecteur-ligne">
        <p class="lecteur-duree">${pourAffichage(`${reglages.duree} min · là où tu es`)}</p>
        <${Epingle} id=${ID} titre=${titre} />
      </div>
      <p class="lecteur-description">Un bol au début, un bol à la fin. Le temps restant ne s'affiche pas.</p>
      <${Segmente} etiquette="Durée" classe="large" options=${OPTIONS_DUREE} valeur=${reglages.duree} surChoix=${(v) => changer('duree', v)} sansVide=${true} />
      <div class="lecteur-centre">
        <button type="button" class="bouton-lecture grand" aria-label="Commencer" onClick=${commencer}>${Icones.lecture()}</button>
      </div>
      <ul class="liste carte carte-groupe reglages-lecteur" aria-label="Réglages du minuteur">
        <li>
          <div class="ligne-interrupteur">
            <span class="ligne-libelle" aria-hidden="true">${SON_CHAQUE_MINUTE}</span>
            <${Interrupteur} etiquette=${SON_CHAQUE_MINUTE} actif=${reglages.intervalle} surChanger=${(v) => changer('intervalle', v)} />
          </div>
        </li>
      </ul>
    </div>`;
  } else if (etat === 'fin') {
    corps = html`<div class="lecteur lecteur-plein"><p class="lecteur-consigne">${FIN}</p></div>`;
  } else {
    corps = html`<div class="lecteur lecteur-plein">
      <p class="lecteur-consigne">${etat === 'pause' ? 'En pause' : 'Un bol sonnera à la fin.'}</p>
      <div class="lecteur-centre">
        ${etat === 'pause' && html`<button type="button" class="bouton-lecture" aria-label="Reprendre" onClick=${reprendre}>${Icones.lecture()}</button>`}
      </div>
    </div>`;
    pied = html`<div class="actions-lecteur"><button type="button" class="lien-discret terminer-lecteur" onClick=${() => finir(false)}>Arrêter</button></div>`;
  }
  return html`<${CadreParcours} titre=${titre} icone=${etat === 'avant' ? 'historique' : undefined} surFermer=${fermer} pied=${pied}>${corps}</${CadreParcours}>`;
}
