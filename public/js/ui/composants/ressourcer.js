// « Me ressourcer » (v6) : « Pour récupérer, je… » tel que l'utilisateur l'a écrit dans Mon plan, avec
// « Respirer », dans la carte de l'Émotion du moment (la règle). L'écran « Me ressourcer » est parti en v6.1 :
// son contenu est dans Mon plan, sur Moment difficile. Rien n'y est calculé ni compté.
import { html, useEffect, useRef, useState } from '../lib.js';
import { repo } from '../../donnees.js';
import { normaliserRessourcer, TITRE_RECUPERER } from '../../domain/ressourcer.js';
import { Icones } from '../icones.js';
import { Respiration } from './respiration.js';
import { preparerSon } from './signal-sonore.js';

// Une lecture qui échoue donne le réglage par défaut, éteint : la règle ne joue pas.
export const lireRessourcer = () => repo.meta.lire('ressourcer').catch(() => null).then(normaliserRessourcer);

// Un toucher affiche la respiration à la place du bouton et la démarre aussitôt. Le contexte audio ne naît
// que dans un geste : on le prépare ici, en premier et de façon synchrone, sans regarder le réglage du signal
// (la respiration le rendort s'il est éteint). La respiration crée une séance d'origine `ressourcer` (v7).
function Respirer() {
  const [affichee, setAffichee] = useState(false);
  if (affichee) return html`<${Respiration} demarrerTout=${true} origine="ressourcer" dureeALaLigne=${true} />`;
  return html`<button type="button" class="btn btn-plein" onClick=${() => { preparerSon(); setAffichee(true); }}>${Icones.respiration()}Respirer</button>`;
}

// La carte paraît au-dessus du panneau des réponses (v7) : quand elle paraît, et quand elle grandit (la respiration
// s'y ouvre), le corps de l'écran défile juste assez pour la montrer, en douceur, ou d'un saut avec « Réduire les
// animations ». Trop haute, on en montre le haut (la liste) ; la respiration ouverte, le bas (le cercle, « Inspire »
// et « Arrêter »).
const MARGE_CARTE = 12;
function montrer(carte) {
  const corps = carte && carte.closest('.parcours-corps');
  if (!corps) return;
  const [c, z] = [carte.getBoundingClientRect(), corps.getBoundingClientRect()];
  const versLeBas = c.bottom + MARGE_CARTE - z.bottom;
  const decalage = carte.querySelector('.respiration') ? versLeBas : Math.min(versLeBas, c.top - MARGE_CARTE - z.top);
  if (decalage <= 0) return;
  const reduit = Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  corps.scrollBy({ top: Math.ceil(decalage), behavior: reduit ? 'auto' : 'smooth' });
}

export function PourRecuperer({ texte }) {
  const zone = useRef(null);
  useEffect(() => {
    const carte = zone.current;
    montrer(carte);
    if (!carte || typeof ResizeObserver !== 'function') return undefined;
    const suivi = new ResizeObserver(() => montrer(carte));
    suivi.observe(carte);
    return () => suivi.disconnect();
  }, []);
  return html`<section ref=${zone} class="ressourcer-liste carte" aria-labelledby="titre-ressourcer">
    <h2 class="ressourcer-rubrique" id="titre-ressourcer">${TITRE_RECUPERER}</h2>
    <p class="ressourcer-texte">${texte}</p>
    <${Respirer} />
  </section>`;
}
