// Lecteur de Bien-être (v8, spec §5, §12.1 et §12.3), à la Petit BamBou : le même pour un exercice et pour la cohérence
// cardiaque de l'onglet. Plein écran, sans onglets.
// - Avant : le titre, « 8 min · assis ou allongé », une ligne de description, un gros bouton lecture au centre, et les
//   réglages du son.
// - Pendant : la consigne en grand en haut ; au milieu, un anneau qui se remplit avec le temps de tout l'exercice, et le
//   bouton pause au centre ; dessous, « il reste 6:40 » ; en bas, près du pouce, étape précédente, étape suivante, et
//   « Terminer » en lien discret. Les étapes avancent seules, voix allumée ou non ; « Suivant » ne sert qu'à sauter une
//   étape. Aucun repère « 3 sur 8 ».
// - Une étape rythmée (`souffle`, quatre temps) : un disque grandit à l'inspiration et rétrécit à l'expiration, sous
//   « Inspire », « Retiens », « Expire » ; pendant « Retiens », il reste immobile et le souffle sonore se tait. Deux étapes
//   rythmées qui se suivent au même rythme gardent le même cycle : jamais deux inspirations de suite, même après une
//   pause au milieu de la première.
// - La fin (au bout, ou « Terminer ») : trois bols, « Fin de l'exercice. » dit par la voix si elle est allumée, et rien
//   d'autre à l'écran (ni anneau ni temps : rien ne dit ce qui a été fait ou non) ; le lecteur se ferme seul 6 s plus
//   tard et revient à l'écran d'origine, où le message « Noter mon émotion » reste 6 s (après une séance notée seulement,
//   v8). Rien ne s'ouvre seul, aucune félicitation.
// - Pause, page cachée (écran verrouillé, autre app) ou quittée : la voix et les sons se coupent, le verrou d'écran est
//   rendu ; « Reprendre » repart de l'étape, le souffle d'un début de cycle. Le verrou d'écran est gardé pendant la séance.
// - Réglages du lecteur, gardés sur cet appareil (localStorage) : « Son : Aucun · Repères · Repères + souffle » (Repères
//   + souffle au départ), « Jouer même en mode silencieux » (éteint : session audio « ambient », le son se tait en
//   silencieux et se mêle à la musique ; allumé : « playback », la musique se met en pause), et la lecture à voix haute
//   (v7, éteinte au départ ; sans voix française, l'interrupteur n'apparaît pas). Ils se règlent avant de commencer, dans
//   une carte sous l'anneau, et en pause, dans la même carte sous l'écran de lecture (en défilant) : l'écran de pause a
//   la mise en page de la lecture, « Reprendre » est à la place exacte de « Pause ». Ils ne valent que pour ce lecteur :
//   Moment difficile et « Respirer » gardent leur réglage (Réglages › Moment difficile, spec §12.1).
// - Séance (ui/seance.js), d'origine `bien-etre` : menée au bout, ou arrêtée après 60 s, une seule par lecture. La durée
//   est celle du temps actif, pauses exclues ; menée au bout, la dernière étape atteinte après la moitié de la durée (une
//   séance d'une seule étape, la cohérence cardiaque : tout son temps écoulé), elle porte `fin: true`. Lancée depuis le
//   Programme (v8, spec §12.2), elle porte aussi `programme` : l'identifiant de la séance du Programme ; menée au bout,
//   elle y porte alors « Faite le 12/10 ». Arrêtée en route, rien.
// Le son ne naît que dans un toucher (« Commencer », « Reprendre », « Terminer », ou le bouton lecture d'une carte, par
// lancerLecture) ; la voix est débloquée de même, par une parole muette (Safari ne parle qu'après un geste).
// v10 (spec §5.3, §6, §7.3, §14.4 et §14.5) :
// - Durée au choix (le soupir, l'expiration longue, le noting) : 1 · 3 · 5 min sur l'écran « avant » ; la dernière est
//   gardée par exercice sur cet appareil, écrite seulement quand elle change. L'étape qui se répète s'allonge
//   (domain/exercices.js).
// - Une étape à `etiquettes` (le noting) : quatre grosses étiquettes ; un toucher en fait briller une 600 ms et n'écrit rien.
// - Un souffle à `inspi2` (le soupir) : le disque, le mot et le souffle sonore suivent la petite inspiration en plus.
// - L'épingle, sur l'écran « avant » (composants/epingle.js).
// - Un exercice `nuit` (« Réveil la nuit ») : fond noir dans les deux thèmes, texte gris.
// - `mode` : 'bien-etre' (tout ce qui précède) ou 'crise', les exercices courts de Moment difficile. En crise, un toucher
//   démarre aussitôt (lancerLecture) ; ni anneau, ni « il reste », ni bols, ni souffle sonore, ni « Noter mon émotion », ni
//   épingle. Le son et la voix suivent Réglages › Moment difficile (méta `respiration`) : le signal sonore donne un repère
//   discret à chaque changement d'étape, rien d'autre ; « Réveil la nuit » l'ignore, seule la voix peut y parler. Le signal
//   comme la voix jouent en session « ambient », la voix seule aussi. En pause, on peut les changer pour cette fois : rien
//   n'est retenu. La séance prend l'origine `moment-difficile`.
import { html, useEffect, useMemo, useReducer, useRef, useState } from '../lib.js';
import { CadreParcours } from './parcours.js';
import { Epingle } from './epingle.js';
import { Interrupteur } from './interrupteur.js';
import { PuceReglage } from './respiration.js';
import { Segmente } from './segmente.js';
import { afficherToast } from './toast.js';
import { preparerSon, sonner, suspendreSon } from './signal-sonore.js';
import { sons } from './sons.js';
import { Icones } from '../icones.js';
import { lireLocal, ecrireLocal } from '../hooks.js';
import { garderEcran, useSeance } from '../seance.js';
import { repo } from '../../donnees.js';
import { DUREES_AU_CHOIX, aDureeAuChoix, dureeEtPosture, dureeExerciceS, exerciceAvecDuree, exerciceMeneAuBout } from '../../domain/exercices.js';
import { TEMPS_SOUFFLE, motPhase, normaliserRespiration, phaseSouffle, phasesEntre } from '../../domain/respiration.js';
import { pourAffichage } from '../../domain/typographie.js';

export const CLE_VOIX = 'carnet:exercice:voix';
export const CLE_SON = 'carnet:lecteur:son';
export const CLE_SILENCIEUX = 'carnet:lecteur:silencieux';
export const SONS = [{ valeur: 'aucun', libelle: 'Aucun' }, { valeur: 'reperes', libelle: 'Repères' }, { valeur: 'souffle', libelle: 'Repères + souffle' }];
const SON_DEFAUT = 'souffle';
const lireSon = () => { const v = lireLocal(CLE_SON, null); return SONS.some((s) => s.valeur === v) ? v : SON_DEFAUT; };
const lireSilencieux = () => lireLocal(CLE_SILENCIEUX, false) === true;
const sessionAudio = (silencieux) => (silencieux ? 'playback' : 'ambient');
// La durée retenue d'un exercice (v10), ou null : une valeur hors liste (clé abîmée) ne compte pas.
const cleDuree = (id) => `carnet:duree:${id}`;
const lireDuree = (id) => { const v = lireLocal(cleDuree(id), null); return DUREES_AU_CHOIX.includes(v) ? v : null; };
const OPTIONS_DUREE = DUREES_AU_CHOIX.map((d) => ({ valeur: d, libelle: `${d} min` }));

export const FIN = 'Fin de l\'exercice.';
export const NOTER_EMOTION = 'Noter mon émotion';
const TIC_MS = 200;
// Une étiquette du noting brille ce temps-là.
const BRILLE_MS = 600;
// Le souffle sonore est programmé un peu en avance, à l'instant exact de chaque phase sur l'horloge audio.
const AVANCE_MS = 450;
export const FERMETURE_MS = 6000;
export const MESSAGE_MS = 6000;
// La voix suit le bol, le temps qu'il sonne d'abord.
const VOIX_APRES_BOL_DEBUT_MS = 1500;
const VOIX_APRES_BOL_MS = 800;
const VOIX_APRES_BOLS_FIN_MS = 2800;
// L'anneau : un cercle de rayon 56 dans un carré de 120.
const RAYON = 56;
const CIRCONFERENCE = 2 * Math.PI * RAYON;

// La voix française du système (fr-FR d'abord), ou null : sans synthèse vocale ni voix française, pas de lecture.
function voixFrancaise() {
  try {
    const s = window.speechSynthesis;
    if (!s || typeof window.SpeechSynthesisUtterance !== 'function') return null;
    const fr = (s.getVoices() || []).filter((v) => v && /^fr([-_]|$)/i.test(v.lang || '') && v.localService !== false);
    return fr.find((v) => /^fr[-_]fr$/i.test(v.lang)) || fr[0] || null;
  } catch { return null; }
}

// Les voix arrivent parfois après le premier rendu (événement voiceschanged).
export function useVoixFrancaise() {
  const [voix, setVoix] = useState(voixFrancaise);
  useEffect(() => {
    const s = window.speechSynthesis;
    if (!s || typeof s.addEventListener !== 'function') return undefined;
    const maj = () => setVoix(voixFrancaise());
    s.addEventListener('voiceschanged', maj);
    return () => s.removeEventListener('voiceschanged', maj);
  }, []);
  return voix;
}

// Une lecture lancée d'un toucher ailleurs (le bouton lecture d'une carte de Bien-être) : le toucher prépare le son et la
// voix, puis ouvre l'écran du lecteur, qui démarre aussitôt. Sans ce toucher (une adresse ouverte autrement), le lecteur
// attend « Commencer » : rien ne joue seul. `retour` : l'écran où revenir, s'il n'est pas celui que donne l'adresse (la
// carte Programme de Bien-être lance une séance du Programme, et le lecteur revient à Bien-être).
// `mode` : celui du lecteur qui s'ouvre (v10). En crise, le réglage est dans la méta, qui se lit après le toucher : le toucher
// prépare donc le son et la voix dans tous les cas, sans bruit (session « ambient », parole muette) ; le lecteur laisse le son
// se rendormir si le réglage ne le demande pas.
let demande = null;
const DEMANDE_MS = 3000;
export function lancerLecture(hash, { retour = null, mode = 'bien-etre' } = {}) {
  if (mode === 'crise') {
    preparerSon({ session: 'ambient' });
    amorcerVoix();
  } else {
    if (lireSon() !== 'aucun') preparerSon({ session: sessionAudio(lireSilencieux()) });
    if (lireLocal(CLE_VOIX, false) === true) amorcerVoix();
  }
  demande = { hash, instant: performance.now(), retour };
  location.hash = hash;
}
// La demande de lecture qui vient d'ouvrir ce lecteur, ou null.
function prendreDemande() {
  const d = demande;
  demande = null;
  return d && d.hash === location.hash && performance.now() - d.instant < DEMANDE_MS ? d : null;
}
// Un écran de départ (les deux minuteurs, les sons de fond), ouvert d'un toucher ailleurs (une entrée de Bien-être) : comme le
// lecteur, il revient à l'écran d'où il part (`retour`). Rien ne se prépare ici : il attend son propre « Commencer », où le son naît.
export function ouvrirDepart(hash, { retour = null } = {}) {
  demande = { hash, instant: performance.now(), retour };
  location.hash = hash;
}
// L'écran où revenir, pour un écran de départ qui s'ouvre : celui de la demande, sinon Bien-être.
export const retourDemande = () => prendreDemande()?.retour || '#/bien-etre';
// Une parole muette dans le toucher : Safari laisse ensuite parler le lecteur hors d'un geste.
function amorcerVoix() {
  try {
    const u = new window.SpeechSynthesisUtterance('');
    u.volume = 0;
    window.speechSynthesis.speak(u);
  } catch { /* pas de voix */ }
}

// Deux souffles aux mêmes quatre temps.
const memeSouffle = (a, b) => Boolean(a && b) && TEMPS_SOUFFLE.every((k) => a[k] === b[k]);

// « 6:40 » : le temps qui reste, jamais négatif.
export const minuteur = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

// seance : { id, titre, dureeMin, posture, description, nuit?, etapes: [{ texte, dureeS, souffle?, etiquettes? }] } (un
// exercice de domain/exercices.js, ou la cohérence cardiaque de domain/respiration.js). mode : 'bien-etre' ou 'crise' (v10).
// retour : l'écran où revenir (« Fermer » et la fermeture après la fin), sauf si la lecture a été lancée avec un autre retour.
// origineSeance : l'origine de la séance enregistrée, celle du mode si elle n'est pas donnée. programme : l'identifiant de la
// séance du Programme, quand la lecture en est une (v8).
export function Lecteur({ seance: exercice, mode = 'bien-etre', retour = '#/bien-etre', origineSeance, programme = null }) {
  const crise = mode === 'crise';
  const [lancee] = useState(prendreDemande);
  const auto = lancee != null;
  const adresseRetour = (lancee && lancee.retour) || retour;
  const [etat, setEtat] = useState('avant'); // 'avant', 'en-cours', 'pause', 'fin'
  const [place, setPlace] = useState(0);
  // Les réglages : ceux de ce lecteur, gardés sur l'appareil ; en crise, ceux de la méta, lus à l'ouverture (`pret`).
  const [voixVoulue, setVoixVoulue] = useState(() => !crise && lireLocal(CLE_VOIX, false) === true);
  const [son, setSon] = useState(() => (crise ? 'aucun' : lireSon()));
  const [silencieux, setSilencieux] = useState(() => !crise && lireSilencieux());
  const [pret, setPret] = useState(!crise);
  const [, tic] = useReducer((n) => n + 1, 0);
  const voix = useVoixFrancaise();
  const lecture = voixVoulue && voix != null;
  // La durée au choix : l'exercice joué est celui de la durée retenue. Elle ne change que sur l'écran « avant ».
  const avecDuree = !crise && aDureeAuChoix(exercice);
  const [duree, setDuree] = useState(() => (avecDuree ? lireDuree(exercice.id) ?? exercice.dureeMin : null));
  const seance = useMemo(() => (avecDuree ? exerciceAvecDuree(exercice, duree) : exercice), [exercice, duree]);
  const [brille, setBrille] = useState(null);
  const finBrille = useRef(null);
  const suivi = useSeance(seance.id, origineSeance || (crise ? 'moment-difficile' : 'bien-etre'), { programme });
  const etapes = seance.etapes;
  const totalMs = dureeExerciceS(seance) * 1000;
  // Le temps actif, en ms : cumulé aux pauses, compté depuis `depuis` quand la lecture tourne ; `debutEtape`, celui où
  // l'étape a commencé.
  const temps = useRef({ cumul: 0, depuis: null, debutEtape: 0 });
  // Le souffle de l'étape : l'origine de ses cycles en temps de l'étape (0 au début de l'étape, l'instant de la reprise
  // après une pause ; avant le début de l'étape quand le cycle vient de l'étape précédente), jusqu'où le souffle sonore
  // est programmé, et la clé du disque (une origine nouvelle le relance).
  const souffle = useRef({ origine: 0, programme: 0, cle: 0 });
  const verrou = useRef(null);
  const parle = useRef(false);
  const voixEnAttente = useRef(null);
  const fermeture = useRef(null);
  // L'état courant, pour les gestionnaires installés une fois (page cachée, sortie) et les minuteries.
  const courant = useRef({});
  courant.current = { etat, place, lecture, son, silencieux };
  const etape = etapes[place];
  const derniere = place === etapes.length - 1;

  const ecoule = () => temps.current.cumul + (temps.current.depuis == null ? 0 : performance.now() - temps.current.depuis);
  const dansEtape = () => ecoule() - temps.current.debutEtape;
  const arreterTemps = () => { temps.current.cumul = ecoule(); temps.current.depuis = null; };
  // Le temps qui reste à tout l'exercice : la fin de l'étape, puis les étapes suivantes.
  const resteMs = () => {
    if (etat === 'avant') return totalMs;
    const apres = etapes.slice(place + 1).reduce((n, x) => n + (x.dureeS || 0) * 1000, 0);
    return apres + Math.max(0, etape.dureeS * 1000 - dansEtape());
  };

  const dire = (texte, delaiMs = 0) => {
    clearTimeout(voixEnAttente.current);
    voixEnAttente.current = null;
    const parler = () => {
      voixEnAttente.current = null;
      try {
        const s = window.speechSynthesis;
        s.cancel();
        const u = new window.SpeechSynthesisUtterance(texte);
        u.lang = voix.lang;
        u.voice = voix;
        s.speak(u);
        parle.current = true;
      } catch { /* pas de voix : la lecture continue en silence */ }
    };
    if (delaiMs <= 0) { parler(); return; }
    if (parle.current) { try { window.speechSynthesis.cancel(); } catch { /* rien à couper */ } }
    voixEnAttente.current = setTimeout(parler, delaiMs);
  };
  const couperVoix = () => {
    clearTimeout(voixEnAttente.current);
    voixEnAttente.current = null;
    if (!parle.current) return;
    try { window.speechSynthesis.cancel(); } catch { /* rien à couper */ }
  };
  // Le son est à préparer dans un toucher pour jouer ; en crise, la voix le veut aussi, pour lire en session « ambient ».
  const voixEnCrise = () => crise && courant.current.lecture;
  const sonAPreparer = () => courant.current.son !== 'aucun' || voixEnCrise();
  const rendreVerrou = () => { if (verrou.current) { verrou.current.release().catch(() => {}); verrou.current = null; } };
  // Un verrou obtenu après la pause ou la fin est rendu tout de suite.
  const tenir = (v) => { if (v && courant.current.etat !== 'en-cours') { v.release().catch(() => {}); return; } if (v) verrou.current = v; };
  // L'étape n et la suivante sont rythmées au même rythme : le cycle passe de l'une à l'autre sans repartir.
  const cycleContinue = (n) => n + 1 < etapes.length && memeSouffle(etapes[n].souffle, etapes[n + 1].souffle);
  // `derniereAtteinte` : la lecture est sur la dernière étape ; elle n'est menée au bout qu'après assez de temps actif
  // (domain/exercices.js : la moitié, ou tout le temps d'une séance d'une seule étape).
  const noter = (derniereAtteinte) => {
    const dureeS = ecoule() / 1000;
    return suivi.noter({ dureeS, terminee: exerciceMeneAuBout(seance, { derniereAtteinte, dureeS }) });
  };

  // Le bol (de début, ou d'étape), puis la voix, le temps qu'il sonne. En crise : le signal sonore, à un changement d'étape
  // seulement, et non au début.
  const annoncer = (n, debut = false) => {
    const { son: s, lecture: l } = courant.current;
    const avecBol = s !== 'aucun' && !(crise && debut);
    if (avecBol) { if (crise) sonner('expire'); else (debut ? sons.bolDebut : sons.bolEtape)(); }
    if (l) dire(etapes[n].texte, !avecBol ? 0 : debut ? VOIX_APRES_BOL_DEBUT_MS : VOIX_APRES_BOL_MS);
  };
  // Le souffle sonore de l'étape rythmée, programmé jusqu'à un peu plus loin que maintenant, sans dépasser l'étape (sauf
  // quand l'étape suivante continue le cycle : la programmation passe sur elle, et une phase qui déborde va jusqu'au
  // bout). Une phase commencée depuis la dernière programmation (le début de l'étape, vu au tic suivant) part tout de
  // suite, pour le temps qui lui reste.
  const programmerSouffle = () => {
    const { place: n, son: s, etat: e } = courant.current;
    const rythme = etapes[n].souffle;
    if (!rythme || s !== 'souffle' || e !== 'en-cours') return;
    const t = dansEtape();
    const finEtape = etapes[n].dureeS * 1000;
    const finSon = cycleContinue(n) ? Infinity : finEtape;
    const { origine: o, programme: de } = souffle.current;
    const a = Math.min(t + AVANCE_MS, finSon);
    if (a <= de) return;
    for (const p of phasesEntre(de - o, a - o, rythme)) {
      const debut = p.debutMs + o;
      const fin = Math.min(debut + p.dureeMs, finSon);
      sons.souffle({ phase: p.phase, dureeS: (fin - Math.max(debut, t)) / 1000, dansS: Math.max(0, debut - t) / 1000 });
    }
    souffle.current.programme = a;
  };

  // `auto` : l'étape a fini son temps ; l'étape suivante commence à l'instant exact où elle a fini. Au même rythme, le
  // cycle continue (le disque ne repart pas, la phase en cours n'est pas coupée) ; sinon, ou sautée d'un toucher,
  // l'étape repart d'une inspiration.
  const aller = (n, auto = false) => {
    const t = temps.current;
    const avant = courant.current.place;
    const finAvant = etapes[avant].dureeS * 1000;
    t.debutEtape = auto ? t.debutEtape + finAvant : ecoule();
    if (auto && n === avant + 1 && cycleContinue(avant)) {
      const { origine, programme, cle } = souffle.current;
      souffle.current = { origine: origine - finAvant, programme: programme - finAvant, cle };
    } else {
      souffle.current = { origine: 0, programme: 0, cle: souffle.current.cle + 1 };
      sons.couperSouffle();
    }
    courant.current.place = n;
    setPlace(n);
    if (courant.current.etat === 'en-cours') annoncer(n);
    else couperVoix();
  };
  // `dansToucher` : « Commencer » touché ici ; sinon (lancerLecture), le toucher a déjà préparé le son.
  const commencer = (dansToucher) => {
    suivi.commencer();
    temps.current = { cumul: 0, depuis: performance.now(), debutEtape: 0 };
    souffle.current = { origine: 0, programme: 0, cle: souffle.current.cle + 1 };
    courant.current.etat = 'en-cours';
    courant.current.place = 0;
    setEtat('en-cours');
    setPlace(0);
    if (dansToucher && sonAPreparer()) preparerSon({ session: sessionAudio(courant.current.silencieux) });
    // La voix parle après le bol, hors du toucher : une parole muette dans le toucher la débloque.
    if (dansToucher && courant.current.lecture) amorcerVoix();
    annoncer(0, true);
    garderEcran().then(tenir);
  };
  // Après la fin, le message « Noter mon émotion » ne paraît qu'après une séance notée (v8, Q29) : « Terminer » touché
  // trop tôt (moins de 60 s, sans être allé au bout) ne laisse aucun message, comme une respiration arrêtée tôt. Jamais en
  // crise (v10).
  const fermer = () => {
    clearTimeout(fermeture.current);
    if (!crise && courant.current.etat === 'fin' && suivi.notee()) {
      afficherToast(FIN, { libelle: NOTER_EMOTION, faire: () => { location.hash = '#/moment'; } }, MESSAGE_MS);
    }
    location.hash = adresseRetour;
  };
  // La fin : au bout du temps de la dernière étape, ou « Terminer ».
  const finir = () => {
    const n = courant.current.place;
    arreterTemps();
    courant.current.etat = 'fin';
    setEtat('fin');
    rendreVerrou();
    sons.couperSouffle();
    const avecBols = !crise && courant.current.son !== 'aucun';
    // « Terminer » touché en pause : le contexte dort, le toucher le relance pour les bols, ou pour la voix en crise. Au bout
    // du temps, il tourne déjà.
    if (avecBols || voixEnCrise()) preparerSon({ session: sessionAudio(courant.current.silencieux) });
    if (avecBols) sons.bolsFin();
    if (courant.current.lecture) dire(FIN, avecBols ? VOIX_APRES_BOLS_FIN_MS : 0); else couperVoix();
    noter(n === etapes.length - 1);
    fermeture.current = setTimeout(fermer, FERMETURE_MS);
  };
  // Pause : touchée, ou la page cachée. La séance est notée dès maintenant si elle passe la règle (l'app peut ne jamais
  // revenir) ; reprise et finie, elle reste la même séance.
  const pause = () => {
    if (courant.current.etat !== 'en-cours') return;
    arreterTemps();
    courant.current.etat = 'pause';
    setEtat('pause');
    couperVoix();
    sons.couper();
    suspendreSon();
    rendreVerrou();
    noter(false);
  };
  const reprendre = () => {
    temps.current.depuis = performance.now();
    const t = dansEtape();
    souffle.current = { origine: t, programme: t, cle: souffle.current.cle + 1 };
    courant.current.etat = 'en-cours';
    setEtat('en-cours');
    if (sonAPreparer()) preparerSon({ session: sessionAudio(courant.current.silencieux) });
    if (courant.current.lecture) dire(etapes[courant.current.place].texte);
    garderEcran().then(tenir);
  };
  // En crise, un réglage changé ne vaut que pour cette fois : rien n'est écrit.
  const changerVoix = (v) => {
    setVoixVoulue(v);
    if (!crise) ecrireLocal(CLE_VOIX, v || null);
    if (!v) { couperVoix(); return; }
    // Allumée d'un toucher (avant de commencer, ou en pause) : la voix est débloquée pour la suite.
    if (voix) amorcerVoix();
  };
  const changerSon = (v) => {
    setSon(v);
    courant.current.son = v;
    if (!crise) ecrireLocal(CLE_SON, v === SON_DEFAUT ? null : v);
    if (v === 'aucun') sons.couper();
  };
  const changerSilencieux = (v) => {
    setSilencieux(v);
    ecrireLocal(CLE_SILENCIEUX, v || null);
  };
  // Une durée touchée : écrite seulement si elle change.
  const choisirDuree = (d) => {
    if (d === duree) return;
    setDuree(d);
    ecrireLocal(cleDuree(exercice.id), d);
  };
  // Une étiquette du noting : elle brille, et rien n'est écrit.
  const briller = (x) => {
    setBrille(x);
    clearTimeout(finBrille.current);
    finBrille.current = setTimeout(() => setBrille(null), BRILLE_MS);
  };

  // La minuterie : l'anneau et le disque redessinés à chaque tic ; l'étape écoulée passe à la suivante, la dernière finit.
  useEffect(() => {
    if (etat !== 'en-cours') return undefined;
    programmerSouffle();
    const m = setInterval(() => {
      // Un tic d'avant le nouveau rendu (pause, fin) ne fait rien.
      if (courant.current.etat !== 'en-cours') return;
      tic();
      const n = courant.current.place;
      if (dansEtape() >= etapes[n].dureeS * 1000) {
        if (n === etapes.length - 1) finir(); else aller(n + 1, true);
        return;
      }
      programmerSouffle();
    }, TIC_MS);
    return () => clearInterval(m);
  }, [etat, place]);

  // En crise, les réglages de la méta. Le toucher a préparé le son sans le savoir : si ni le signal ni la voix n'en veulent,
  // il se rendort. S'ils en veulent, il reste éveillé : une respiration en cours, quittée par ce toucher, a demandé sa veille
  // en se démontant, et plus aucun geste ne pourrait le relancer sur l'iPhone. Déjà quitté à cette lecture, le lecteur a tout
  // rendu : plus rien à faire.
  useEffect(() => {
    if (!crise) return;
    repo.meta.lire('respiration').catch(() => null).then((v) => {
      if (courant.current.etat === 'sortie') return;
      const r = normaliserRespiration(v);
      const signal = r.son && !seance.nuit;
      setSon(signal ? 'reperes' : 'aucun');
      setVoixVoulue(r.voix);
      setPret(true);
      if (auto) { if (signal || r.voix) preparerSon({ session: 'ambient' }); else suspendreSon(); }
    });
  }, []);
  // Lancée d'un toucher ailleurs : elle démarre aussitôt, les réglages lus.
  useEffect(() => { if (auto && pret) commencer(false); }, [pret]);
  // Page cachée (écran verrouillé, autre app) ou quittée : pause.
  useEffect(() => {
    const cachee = () => { if (document.visibilityState === 'hidden') pause(); };
    document.addEventListener('visibilitychange', cachee);
    window.addEventListener('pagehide', pause);
    return () => { document.removeEventListener('visibilitychange', cachee); window.removeEventListener('pagehide', pause); };
  }, []);
  // Sortie (« Fermer », la fermeture après la fin, un autre écran) : voix et sons coupés, verrou rendu, séance notée si
  // elle passe la règle.
  useEffect(() => () => {
    const { etat: e } = courant.current;
    if (e === 'en-cours' || e === 'pause') { arreterTemps(); noter(false); }
    courant.current.etat = 'sortie';
    clearTimeout(fermeture.current);
    clearTimeout(finBrille.current);
    rendreVerrou();
    couperVoix();
    sons.couper();
    suspendreSon();
  }, []);

  // Les réglages du lecteur, avant de commencer et en pause : la voix (si l'iPhone a une voix française), le son, le mode
  // silencieux. En pause, ils viennent après l'écran de lecture, qui garde toute la hauteur : rien ne bouge sous le pouce.
  // En crise : le signal sonore (sauf la nuit, où il ne sonne jamais) et la voix, pour cette fois ; rien s'il n'y a ni l'un
  // ni l'autre.
  const ligneVoix = (etiquette) => voix && html`<li>
    <div class="ligne-interrupteur">
      <span class="ligne-libelle" aria-hidden="true">${etiquette}</span>
      <${Interrupteur} etiquette=${etiquette} actif=${voixVoulue} surChanger=${changerVoix} />
    </div>
  </li>`;
  const reglages = crise ? (voix || !seance.nuit) && html`<ul class="liste carte carte-groupe reglages-lecteur" aria-label="Réglages du lecteur">
    ${!seance.nuit && html`<li>
      <div class="ligne-interrupteur">
        <span class="ligne-libelle" aria-hidden="true">Signal sonore</span>
        <${Interrupteur} etiquette="Signal sonore" actif=${son !== 'aucun'} surChanger=${(v) => changerSon(v ? 'reperes' : 'aucun')} />
      </div>
    </li>`}
    ${ligneVoix('Lire les consignes à voix haute')}
  </ul>
  <p class="note-carte-interne marge-interne">Pour cette fois seulement.</p>` : html`<ul class="liste carte carte-groupe reglages-lecteur" aria-label="Réglages du lecteur">
    ${ligneVoix('Lecture à voix haute')}
    <li class="ligne-interrupteur reglage-son">
      <span class="ligne-libelle" aria-hidden="true">Son</span>
      <${PuceReglage} etiquette="Son" valeur=${son} options=${SONS.map((x) => [x.valeur, x.libelle])} surChoix=${changerSon} />
    </li>
    <li>
      <div class="ligne-interrupteur">
        <span class="ligne-libelle" aria-hidden="true">Jouer même en mode silencieux</span>
        <${Interrupteur} etiquette="Jouer même en mode silencieux" actif=${silencieux} surChanger=${changerSilencieux} />
      </div>
      <p class="note-carte-interne marge-interne">Sinon, le son se tait en mode silencieux. Allumé, il met la musique en pause.</p>
    </li>
  </ul>`;

  // Le disque de l'étape rythmée : la phase, sa durée (la classe de l'animation), figé en pause.
  const phase = etape.souffle && (etat === 'en-cours' || etat === 'pause')
    ? phaseSouffle(dansEtape() - souffle.current.origine, etape.souffle) : null;
  const progres = Math.min(1, Math.max(0, 1 - resteMs() / totalMs));
  const centre = etat === 'avant'
    ? html`<button type="button" class="bouton-lecture grand" aria-label="Commencer" onClick=${() => commencer(true)}>${Icones.lecture()}</button>`
    : etat === 'en-cours'
      ? html`<button type="button" class="bouton-lecture" aria-label="Pause" onClick=${pause}>${Icones.pause()}</button>`
      : etat === 'pause'
        ? html`<button type="button" class="bouton-lecture" aria-label="Reprendre" onClick=${reprendre}>${Icones.lecture()}</button>`
        : null;
  // En crise, pas d'anneau : la place reste, pour le disque et le bouton.
  const anneau = html`<div class="lecteur-anneau">
    ${!crise && html`<svg class="anneau-temps" viewBox="0 0 120 120" aria-hidden="true">
      <circle class="anneau-piste" cx="60" cy="60" r=${RAYON} />
      ${progres > 0 && html`<circle class="anneau-plein" cx="60" cy="60" r=${RAYON} transform="rotate(-90 60 60)"
        stroke-dasharray=${CIRCONFERENCE.toFixed(2)} stroke-dashoffset=${(CIRCONFERENCE * (1 - progres)).toFixed(2)} />`}
    </svg>`}
    ${phase && html`<span key=${souffle.current.cle} aria-hidden="true"
      class=${`disque-souffle phase-${phase.phase}${phase.phase === 'inspire' && etape.souffle.inspi2 > 0 ? ' avant-encore' : ''} duree-souffle-${Math.round(phase.dureeMs / 1000)}${etat === 'pause' ? ' en-pause' : ''}`}></span>`}
    ${centre}
  </div>`;

  // Rien tant que la lecture n'a pas démarré, si elle va démarrer seule, ou que les réglages de crise ne sont pas lus : ni
  // « Commencer » qui clignote, ni réglage qui change sous le doigt.
  const attente = etat === 'avant' && (auto || !pret);
  let corps = null;
  let pied = null;
  if (etat === 'avant') {
    if (!attente) corps = html`<div class="lecteur lecteur-avant">
      <div class="lecteur-ligne">
        <p class="lecteur-duree">${dureeEtPosture(seance)}</p>
        ${!crise && html`<${Epingle} id=${seance.id} titre=${seance.titre} />`}
      </div>
      <p class="lecteur-description">${pourAffichage(seance.description)}</p>
      ${avecDuree && html`<${Segmente} etiquette="Durée" classe="large" options=${OPTIONS_DUREE} valeur=${duree} surChoix=${choisirDuree} sansVide=${true} />`}
      <div class="lecteur-centre">${anneau}</div>
      ${reglages}
    </div>`;
  } else if (etat === 'fin') {
    corps = html`<div class="lecteur lecteur-plein">
      <p class="lecteur-consigne">${FIN}</p>
    </div>`;
  } else {
    corps = html`<div class="lecteur lecteur-plein">
      <section class="lecteur-etape" aria-live="polite" aria-atomic="true">
        <p class="lecteur-consigne">${pourAffichage(etape.texte)}</p>
      </section>
      ${etape.etiquettes && html`<div class="etiquettes-noting" role="group" aria-label="Ce qui passe">
        ${etape.etiquettes.map((x) => html`<button type="button" class=${`etiquette-noting${brille === x ? ' brille' : ''}`} onClick=${() => briller(x)}>${x}</button>`)}
      </div>`}
      <div class="lecteur-centre">
        ${phase && html`<p class="mot-souffle" aria-live="polite">${motPhase(phase.phase)}</p>`}
        ${anneau}
        <p class="lecteur-reste">${crise ? (etat === 'pause' ? 'En pause' : '') : `${etat === 'pause' ? 'En pause · ' : ''}il reste ${minuteur(resteMs())}`}</p>
      </div>
    </div>
    ${etat === 'pause' && reglages && html`<div class="lecteur reglages-pause">${reglages}</div>`}`;
    pied = html`<div class="actions-lecteur">
      ${etapes.length > 1 && html`<button type="button" class="btn" disabled=${place === 0} onClick=${() => aller(place - 1)}>${Icones.retour({ trait: 2 })}Précédent</button>
        <button type="button" class="btn" disabled=${derniere} onClick=${() => aller(place + 1)}>Suivant${Icones.chevron({ trait: 2 })}</button>`}
      <button type="button" class="lien-discret terminer-lecteur" onClick=${finir}>Terminer</button>
    </div>`;
  }
  const iconeAvant = crise ? 'respiration' : 'bienEtre';
  return html`<${CadreParcours} titre=${seance.titre} teinte=${crise ? 'difficile' : 'bien-etre'} noir=${seance.nuit === true}
    icone=${etat === 'avant' && !attente ? iconeAvant : undefined} surFermer=${fermer} pied=${pied}>${corps}</${CadreParcours}>`;
}
