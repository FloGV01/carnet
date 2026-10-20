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

export function Bulles({ valeur, surChoix }) {
  // La famille dont les mots sont montrés ; null : le choix de la famille.
  const [ouverte, setOuverte] = useState(null);
  const titre = useRef(null);
  const aFocaliser = useRef(false);
  // Plus d'émotion (famille retouchée, relevé supprimé) : retour au choix de la famille.
  useEffect(() => { if (valeur == null) setOuverte(null); }, [valeur]);
  // Après un changement de vue fait au toucher, le focus va au titre de la nouvelle vue (VoiceOver) : le bouton
  // touché n'existe plus.
  useEffect(() => {
    if (!aFocaliser.current || !titre.current) return;
    aFocaliser.current = false;
    titre.current.focus({ preventScroll: true });
  }, [ouverte]);
  const montrer = (cle) => { aFocaliser.current = true; setOuverte(cle); };
  const famille = ouverte ? PAR_CLE.get(ouverte) : null;

  if (!famille) {
    const choisie = familleDe(valeur);
    return html`<div class="bloc-reponse" key="familles">
      <div class="tete-reponse">
        <h2 class="titre-reponse" ref=${titre} tabindex="-1">Émotion</h2>
        <p class="aide-reponse">une famille, puis un mot</p>
      </div>
      <div class="bulles bulles-familles" role="group" aria-label="Émotion">
        ${FAMILLES.map((f) => {
          const choisi = choisie === f.cle;
          // Le mot choisi dans la famille, sous son nom.
          const mot = choisi && valeur !== f.id ? libelleEmotion(valeur) : null;
          const toucher = () => {
            if (choisi) { surChoix(null, { mot: false }); return; }
            surChoix(f.id, { mot: false });
            montrer(f.cle);
          };
          return html`<button type="button" class=${`bulle bulle-famille emo-${f.cle}`} aria-pressed=${choisi ? 'true' : 'false'}
            aria-label=${mot ? `${f.libelle}, ${mot}` : null} onClick=${toucher}>
            ${coche()}<span class="bulle-nom">${f.libelle}</span>${mot && html`<small>${mot}</small>`}
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
    <div class=${`bulles bulles-mots emo-${famille.cle}`} role="group" aria-label=${`Mots de la famille ${famille.libelle}`}>
      ${famille.mots.map((m) => {
        const choisi = valeur === m.id;
        return html`<button type="button" class="bulle bulle-mot" aria-pressed=${choisi ? 'true' : 'false'}
          aria-label=${`${m.libelle}, famille ${famille.libelle}`}
          onClick=${() => surChoix(choisi ? famille.id : m.id, { mot: !choisi })}>${coche()}${libelleChoix(m.libelle)}</button>`;
      })}
    </div>
  </div>`;
}
