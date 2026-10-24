// Carte des émotions (v8, spec §4), comme How We Feel : d'abord une tuile, l'énergie et un côté (« plutôt
// désagréable », « plutôt agréable »), puis un mot sur une carte de bulles. Un toucher enregistre :
// - la tuile enregistre l'énergie (jamais devinée d'après le mot) et ouvre la carte centrée sur sa zone ; le côté
//   n'est ni enregistré ni calculé, il ne sert qu'à trouver le mot. Retoucher la tuile choisie efface l'énergie ;
// - la bulle, à la couleur de sa famille, enregistre `roue:<famille>:<mot>` ; elle grossit et sa définition s'affiche
//   en bas. Retoucher le mot choisi l'efface ;
// - un appui long sur une bulle montre sa définition sans rien choisir ;
// - « Toute la carte » ouvre la carte sans passer par l'énergie, « ‹ Énergie » ramène aux tuiles.
// La carte est toujours la même (domain/carte-roue.js) : trois bandes d'énergie, deux côtés, et dans chaque zone les
// mots d'une même famille côte à côte. Elle se fait glisser dans les deux sens ; rien n'est grisé.
// Une vue remplace l'autre au même endroit : pendant 350 ms, ses boutons ignorent les touchers (un second toucher
// rapide tomberait sur un mot jamais vu), fondu ou non (« Réduire les animations ») ; ils sont alors aria-disabled.
// Pour VoiceOver, chaque zone est un groupe nommé par sa légende (« Basse · plutôt agréable ») ; ouverte depuis une
// tuile, la carte met le focus sur la zone touchée, sinon (« Toute la carte », « ‹ Énergie ») sur le titre de la vue.
// surEnergie(id | null), surMot(id | null) : les choix ; surRetour() : retour aux tuiles ; surGeste.suspendre() et
// surGeste.relancer() : un doigt posé sur la carte, puis levé ou la carte qui glisse (la fermeture attend).
import { html, useEffect, useLayoutEffect, useRef, useState } from '../lib.js';
import { FAMILLES, familleDe, libelleEmotion } from '../../domain/roue.js';
import { COTES, ENERGIES, EXEMPLES, cleZone, motsDeZone, zoneDe } from '../../domain/carte-roue.js';
import { definition } from '../../domain/definitions-roue.js';
import { Icones } from '../icones.js';
import { coche, libelleChoix } from './coche.js';

const GARDE_MS = 350;
const APPUI_LONG_MS = 500;
const TOLERANCE_PX = 10;
const ID_ENERGIE = Object.freeze({ haute: 'energie:haute', moyenne: 'energie:moyenne', basse: 'energie:basse' });
const COTE_TEXTE = { gauche: 'plutôt désagréable', droite: 'plutôt agréable' };
const NOM_FAMILLE = new Map(FAMILLES.flatMap((f) => f.mots.map((m) => [m.id, f.libelle])));
const ZONES = ENERGIES.flatMap((energie) => COTES.map((cote) => ({ energie, cote, cle: cleZone({ energie, cote }), mots: motsDeZone({ energie, cote }) })));

// Ouvre la carte sur une zone : centrée si elle tient dans le cadre, sinon son haut. Sans zone (« Toute la carte »), au
// milieu : de part et d'autre du centre, sur la bande Moyenne. Positions de mise en page (offset*), que le fondu
// d'apparition ne fausse pas.
function centrer(cadre, cle) {
  const carte = cadre.firstElementChild;
  const zone = carte.querySelector(`[data-zone="${cle || cleZone({ energie: 'moyenne', cote: 'gauche' })}"]`);
  if (!zone) return;
  cadre.scrollLeft = Math.max(0, cle ? zone.offsetLeft + zone.offsetWidth / 2 - cadre.clientWidth / 2 : (carte.offsetWidth - cadre.clientWidth) / 2);
  cadre.scrollTop = Math.max(0, zone.offsetHeight <= cadre.clientHeight
    ? zone.offsetTop + zone.offsetHeight / 2 - cadre.clientHeight / 2
    : zone.offsetTop - 8);
}

// La définition après le mot et « : » : son initiale en minuscule (« Curieux : l'envie de découvrir… »), sauf pour un
// sigle ou un nom (deux capitales de suite).
const apresDeuxPoints = (texte) => (/^\p{Lu}(\p{Ll}|['’ ])/u.test(texte) ? texte[0].toLowerCase() + texte.slice(1) : texte);

export function CarteEmotions({ emotion, energie, libelle, corrections, surEnergie, surMot, surRetour, surGeste }) {
  // La vue : les tuiles, ou la carte (`centre` : la zone de la tuile touchée, null pour « Toute la carte »).
  const [vue, setVue] = useState({ nom: 'tuiles', centre: null });
  // Le côté de la tuile touchée (jamais enregistré) : il dit laquelle des deux tuiles d'une énergie est cochée.
  const [cote, setCote] = useState(null);
  // Le mot dont la définition s'affiche : le mot choisi, ou celui d'un appui long.
  const [montre, setMontre] = useState(() => (zoneDe(emotion) ? emotion : null));
  const [enGarde, setEnGarde] = useState(false);
  const titre = useRef(null);
  const cadre = useRef(null);
  const aFocaliser = useRef(false);
  const garde = useRef(null);
  const appui = useRef({ minuteur: null, x: 0, y: 0, long: false });
  useEffect(() => () => { clearTimeout(garde.current); clearTimeout(appui.current.minuteur); }, []);
  // Plus de mot (relevé supprimé, mot retouché) : sa définition part avec lui ; un mot choisi la montre.
  useEffect(() => { if (emotion == null) setMontre(null); }, [emotion]);
  // Plus d'énergie : aucune tuile cochée.
  useEffect(() => { if (energie == null) setCote(null); }, [energie]);

  const montrer = (nom, centre = null) => {
    aFocaliser.current = true;
    setMontre(zoneDe(emotion) ? emotion : null);
    clearTimeout(garde.current);
    setEnGarde(true);
    garde.current = setTimeout(() => setEnGarde(false), GARDE_MS);
    setVue({ nom, centre });
  };
  useLayoutEffect(() => {
    if (vue.nom === 'carte' && cadre.current) centrer(cadre.current, vue.centre);
  }, [vue]);
  useEffect(() => {
    if (!aFocaliser.current) return;
    aFocaliser.current = false;
    const zone = vue.nom === 'carte' && vue.centre && cadre.current && cadre.current.querySelector(`[data-zone="${vue.centre}"]`);
    const cible = zone || titre.current;
    if (cible) cible.focus({ preventScroll: true });
  }, [vue]);
  // Un toucher, sauf pendant la garde.
  const sauf = (faire) => (e) => { if (!enGarde) faire(e); };

  if (vue.nom === 'tuiles') {
    const toucherTuile = (e, c) => {
      const id = ID_ENERGIE[e];
      if (energie === id && cote === c) { setCote(null); surEnergie(null); return; }
      setCote(c);
      if (energie !== id) surEnergie(id);
      montrer('carte', cleZone({ energie: e, cote: c }));
    };
    return html`<div class="bloc-reponse vue-tuiles" key="tuiles">
      <div class="tete-reponse">
        <h2 class="titre-reponse" ref=${titre} tabindex="-1">Énergie</h2>
        <button type="button" class="btn-lien toute-la-carte" aria-disabled=${enGarde ? 'true' : null} onClick=${sauf(() => montrer('carte', null))}>Toute la carte${Icones.chevron({ trait: 2 })}</button>
      </div>
      <div class="tuiles-emotion" role="group" aria-label="Énergie" aria-disabled=${enGarde ? 'true' : null}>
        ${COTES.map((c) => html`<span class="cote-tuiles" aria-hidden="true">${COTE_TEXTE[c]}</span>`)}
        ${ENERGIES.map((e) => COTES.map((c) => {
          const choisie = energie === ID_ENERGIE[e] && cote === c;
          const nom = libelle(ID_ENERGIE[e]);
          return html`<button type="button" class="tuile-emotion" aria-pressed=${choisie ? 'true' : 'false'}
            aria-label=${`Énergie ${nom.toLowerCase()}, ${COTE_TEXTE[c]}`} onClick=${sauf(() => toucherTuile(e, c))}>
            ${coche()}${libelleChoix(nom)}
            <span class="tuile-exemples">${EXEMPLES[cleZone({ energie: e, cote: c })].map((id) => html`<span class=${`exemple-tuile emo-${familleDe(id)}`}>${libelleEmotion(id)}</span>`)}</span>
          </button>`;
        }))}
      </div>
    </div>`;
  }

  // Appui long : la définition, sans choisir. Le clic de pointeur qui suit l'appui est ignoré ; un doigt qui bouge (la
  // carte glisse) l'annule. Un nouvel appui repart de zéro, et chaque clic efface la marque : un appui long levé hors de
  // la bulle n'avale pas le clic suivant, ni un clic sans pointeur (clavier, aides techniques : e.detail vaut 0).
  const poser = (id) => (e) => {
    const a = appui.current;
    clearTimeout(a.minuteur);
    Object.assign(a, { x: e.clientX, y: e.clientY, long: false });
    a.minuteur = setTimeout(() => { a.long = true; setMontre(id); }, APPUI_LONG_MS);
  };
  const bouger = (e) => {
    const a = appui.current;
    if (Math.hypot(e.clientX - a.x, e.clientY - a.y) > TOLERANCE_PX) clearTimeout(a.minuteur);
  };
  const lever = () => clearTimeout(appui.current.minuteur);
  const toucherMot = (e, id) => {
    const apresAppuiLong = appui.current.long;
    appui.current.long = false;
    if (apresAppuiLong && e.detail !== 0) return;
    if (emotion === id) { setMontre(null); surMot(null); return; }
    setMontre(id);
    surMot(id);
  };
  const retour = () => { surRetour(); montrer('tuiles'); };
  const famille = montre && familleDe(montre);
  const texte = montre && definition(montre, corrections);
  return html`<div class="bloc-reponse vue-carte" key="carte">
    <div class="tete-reponse">
      <button type="button" class="btn-lien retour-energie" aria-disabled=${enGarde ? 'true' : null} onClick=${sauf(retour)}>${Icones.retour({ trait: 2 })}Énergie</button>
      <h2 class="titre-reponse" ref=${titre} tabindex="-1">Émotion</h2>
    </div>
    <div class="carte-cadre" ref=${cadre} role="group" aria-label="Émotion" aria-disabled=${enGarde ? 'true' : null}
      onPointerDown=${() => surGeste.suspendre()} onPointerUp=${() => surGeste.relancer()} onTouchEnd=${() => surGeste.relancer()}
      onScroll=${() => surGeste.relancer()}>
      <div class="carte-roue">
        ${ZONES.map((z) => html`<div class=${`zone-carte zone-${z.cote}`} data-zone=${z.cle} role="group" aria-labelledby=${`legende-${z.cle}`} tabindex="-1">
          <p class="legende-zone" id=${`legende-${z.cle}`}>${libelle(ID_ENERGIE[z.energie])} · ${COTE_TEXTE[z.cote]}</p>
          <div class="bulles-zone">${z.mots.map((id) => {
            const choisi = emotion === id;
            const nom = libelleEmotion(id);
            return html`<button type="button" class=${`bulle bulle-carte emo-${familleDe(id)}${montre === id && !choisi ? ' montree' : ''}`}
              aria-pressed=${choisi ? 'true' : 'false'} aria-label=${`${nom}, famille ${NOM_FAMILLE.get(id)}`}
              onPointerDown=${poser(id)} onPointerMove=${bouger} onPointerUp=${lever} onPointerCancel=${lever} onPointerLeave=${lever}
              onContextMenu=${(e) => e.preventDefault()} onClick=${sauf((e) => toucherMot(e, id))}>${coche()}${libelleChoix(nom)}</button>`;
          })}</div>
        </div>`)}
      </div>
    </div>
    <p class="definition-carte" aria-live="polite">${texte
      ? html`<strong class=${`mot-definition emo-${famille}`}>${libelleEmotion(montre)}</strong>${' : '}${apresDeuxPoints(texte)}`
      : html`<span class="aide-definition">Un appui long sur un mot montre son sens, sans le choisir.</span>`}</p>
  </div>`;
}
