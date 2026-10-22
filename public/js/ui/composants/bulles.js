// Roue des émotions en bulles (v7, spec §4.2) : les 7 familles en grappe, puis les mots de la famille touchée.
// Un toucher enregistre : toucher une famille la choisit (`roue:<famille>`, un relevé peut garder une famille
// sans mot) et montre ses mots ; toucher un mot le choisit (`roue:<famille>:<mot>`). Retoucher le mot choisi
// ramène à la famille ; retoucher la famille choisie efface l'émotion. « ‹ Familles » revient au choix de la
// famille sans rien écrire. Toutes les bulles d'une famille ont sa couleur (classes emo-<famille>), qui ne vaut
// que pour la roue ; le choix fait suit la sélection commune (fond -fill, texte -on, 600 et coche).
// surChoix(id | null, { mot }) : mot vaut true quand un mot vient d'être choisi (l'écran peut alors se fermer
// seul) ; toucher une famille montre ses mots, l'écran attend.
import { html, useEffect, useRef, useState } from '../lib.js';
import { FAMILLES, familleDe, libelleEmotion } from '../../domain/roue.js';
import { Icones } from '../icones.js';
import { coche, libelleChoix } from './coche.js';

const PAR_CLE = new Map(FAMILLES.map((f) => [f.cle, f]));
// Une vue remplace l'autre au même endroit : un second toucher rapide au même point tomberait sur une bulle de la
// nouvelle vue, jamais vue (un mot sous la famille touchée). Ses bulles ignorent donc les touchers pendant 350 ms,
// fondu ou non (« Réduire les animations ») ; le groupe est alors aria-disabled.
const GARDE_MS = 350;

export function Bulles({ valeur, surChoix }) {
  // La famille dont les mots sont montrés ; null : le choix de la famille.
  const [ouverte, setOuverte] = useState(null);
  const [enGarde, setEnGarde] = useState(false);
  const titre = useRef(null);
  const aFocaliser = useRef(false);
  const garde = useRef(null);
  useEffect(() => () => clearTimeout(garde.current), []);
  // Tout changement de vue, à l'aller comme au retour. `focus` : fait au toucher, le focus va au titre de la
  // nouvelle vue (VoiceOver), le bouton touché n'existant plus.
  const montrer = (cle, { focus = true } = {}) => {
    aFocaliser.current = focus;
    clearTimeout(garde.current);
    setEnGarde(true);
    garde.current = setTimeout(() => setEnGarde(false), GARDE_MS);
    setOuverte(cle);
  };
  // Plus d'émotion (famille retouchée, relevé supprimé) : retour au choix de la famille.
  useEffect(() => { if (valeur == null && ouverte != null) montrer(null, { focus: false }); }, [valeur]);
  useEffect(() => {
    if (!aFocaliser.current || !titre.current) return;
    aFocaliser.current = false;
    titre.current.focus({ preventScroll: true });
  }, [ouverte]);
  // Un toucher sur une bulle, sauf pendant la garde.
  const sauf = (faire) => () => { if (!enGarde) faire(); };
  const famille = ouverte ? PAR_CLE.get(ouverte) : null;

  if (!famille) {
    const choisie = familleDe(valeur);
    // Le mot choisi, à côté du titre (une bulle de famille ne garde que son nom : le mot n'y tiendrait pas).
    const motChoisi = choisie && valeur !== PAR_CLE.get(choisie).id ? libelleEmotion(valeur) : null;
    return html`<div class="bloc-reponse" key="familles">
      <div class="tete-reponse">
        <h2 class="titre-reponse" ref=${titre} tabindex="-1">Émotion</h2>
        ${motChoisi
          ? html`<p class=${`mot-choisi emo-${choisie}`}><span class="point-famille" aria-hidden="true"></span>${motChoisi}</p>`
          : html`<p class="aide-reponse">une famille, puis un mot</p>`}
      </div>
      <div class="bulles bulles-familles" role="group" aria-label="Émotion" aria-disabled=${enGarde ? 'true' : null}>
        ${FAMILLES.map((f) => {
          const choisi = choisie === f.cle;
          const toucher = () => {
            if (choisi) { surChoix(null, { mot: false }); return; }
            surChoix(f.id, { mot: false });
            montrer(f.cle);
          };
          return html`<button type="button" class=${`bulle bulle-famille emo-${f.cle}`} aria-pressed=${choisi ? 'true' : 'false'}
            aria-label=${choisi && motChoisi ? `${f.libelle}, ${motChoisi}` : null} onClick=${sauf(toucher)}>
            ${coche()}<span class="bulle-nom">${f.libelle}</span>
          </button>`;
        })}
      </div>
    </div>`;
  }

  return html`<div class="bloc-reponse" key=${famille.cle}>
    <div class="tete-reponse">
      <button type="button" class="btn-lien retour-familles" onClick=${() => montrer(null)}>${Icones.retour({ trait: 2 })}Familles</button>
      <h2 class=${`titre-reponse titre-famille emo-${famille.cle}`} ref=${titre} tabindex="-1">
        <span class="point-famille" aria-hidden="true"></span>${famille.libelle}</h2>
    </div>
    <div class=${`bulles bulles-mots emo-${famille.cle}`} role="group" aria-label=${`Mots de la famille ${famille.libelle}`}
      aria-disabled=${enGarde ? 'true' : null}>
      ${famille.mots.map((m) => {
        const choisi = valeur === m.id;
        return html`<button type="button" class="bulle bulle-mot" aria-pressed=${choisi ? 'true' : 'false'}
          aria-label=${`${m.libelle}, famille ${famille.libelle}`}
          onClick=${sauf(() => surChoix(choisi ? famille.id : m.id, { mot: !choisi }))}>${coche()}${libelleChoix(m.libelle)}</button>`;
      })}
    </div>
  </div>`;
}
