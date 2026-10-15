import { html, useEffect, useRef, useState } from '../lib.js';
import { BoutonDicter, AIDE_DICTER } from './dicter.js';
import { Icones } from '../icones.js';
import { lireLocal, ecrireLocal } from '../hooks.js';
import { vidanges } from '../../store.js';

// Une zone de texte grandit de sa taille au repos (`lignes`) à LIGNES_MAX lignes, puis elle défile (spec §8).
// CSS s'en charge avec field-sizing ; sans lui (iOS plus ancien), l'attribut rows suit le texte, sans style en ligne.
const LIGNES_MAX = 7; // comme max-height de textarea.champ-texte (composants.css)
export function ajusterLignes(zone, lignes) {
  if (!zone || getComputedStyle(zone).fieldSizing === 'content') return;
  zone.rows = lignes;
  if (!zone.value) return;
  while (zone.rows < LIGNES_MAX && zone.scrollHeight > zone.clientHeight) zone.rows += 1;
}

// Champ de texte libre, non contrôlé (la dictée iOS n'est jamais réécrite pendant la saisie).
// Enregistré 500 ms après la frappe, à la sortie du champ et quand l'app passe en arrière-plan.
// Le brouillon est doublé dans localStorage jusqu'à confirmation de l'écriture.
export function ChampTexte({ id, etiquette, icone, facultatif, ariaLabel, valeur, placeholder, surEnregistrer, cleBrouillon, lignes = 3, dicter = true }) {
  const zone = useRef(null);
  const minuteur = useRef(null);
  const enCours = useRef(false);
  const derniere = useRef(valeur ?? '');
  const [aide, setAide] = useState(false);

  const enregistrer = async () => {
    clearTimeout(minuteur.current);
    const z = zone.current;
    if (!z || enCours.current) return;
    const texte = z.value;
    // Le brouillon n'est retiré que s'il correspond au texte effectivement enregistré.
    const retirerBrouillon = () => { if (lireLocal(cleBrouillon) === texte) ecrireLocal(cleBrouillon, null); };
    if (texte === derniere.current) { retirerBrouillon(); return; }
    try {
      await surEnregistrer(texte.trim() === '' ? null : texte);
      derniere.current = texte;
      retirerBrouillon();
    } catch { /* le brouillon local reste : rien n'est perdu */ }
  };
  const planifier = () => { clearTimeout(minuteur.current); minuteur.current = setTimeout(enregistrer, 500); };

  useEffect(() => {
    const z = zone.current;
    const brouillon = lireLocal(cleBrouillon);
    if (z && typeof brouillon === 'string' && brouillon !== (valeur ?? '')) { z.value = brouillon; planifier(); }
    ajusterLignes(z, lignes);
    const surCache = () => { if (document.visibilityState === 'hidden') enregistrer(); };
    document.addEventListener('visibilitychange', surCache);
    window.addEventListener('pagehide', enregistrer);
    vidanges.add(enregistrer);
    return () => {
      vidanges.delete(enregistrer);
      document.removeEventListener('visibilitychange', surCache);
      window.removeEventListener('pagehide', enregistrer);
      enregistrer();
    };
  }, []);

  const surSaisie = (e) => {
    setAide(false);
    ajusterLignes(e.target, lignes);
    ecrireLocal(cleBrouillon, e.target.value);
    if (!enCours.current) planifier();
  };

  return html`<div class="champ-zone">
    ${etiquette && html`<label class=${icone || facultatif ? 'etiquette etiquette-icone' : 'etiquette'} for=${id}>
      ${icone && Icones[icone] && Icones[icone]()}${etiquette}${facultatif && html` <span class="facultatif">(facultatif)</span>`}</label>`}
    <div class="champ-avec-dicter">
      <textarea id=${id} ref=${zone} class="champ-texte" rows=${lignes} data-lignes=${lignes} placeholder=${placeholder || ''} defaultValue=${valeur ?? ''}
        aria-label=${etiquette ? null : ariaLabel || null}
        onInput=${surSaisie} onBlur=${() => { setAide(false); enregistrer(); }}
        onCompositionStart=${() => { enCours.current = true; }}
        onCompositionEnd=${() => { enCours.current = false; planifier(); }}></textarea>
      ${dicter && html`<${BoutonDicter} cible=${zone} surActive=${() => setAide(true)} />`}
    </div>
    ${aide && html`<p class="aide-dicter discret" role="status">${AIDE_DICTER}</p>`}
  </div>`;
}
