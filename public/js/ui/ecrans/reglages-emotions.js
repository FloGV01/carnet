// Réglages › Émotions (v8, spec §4) : le sens des 79 mots de la roue, par famille, tel que la carte de l'Émotion du
// moment l'affiche. Un toucher sur un mot ouvre le champ de sa définition ; le texte s'enregistre à la sortie du champ
// (méta `definitionsRoue`, sauvegardée avec le reste). « Revenir au texte de Carnet » retire la correction ; un champ
// vidé fait de même. Le texte de Carnet (domain/definitions-roue.js) ne change jamais.
import { html, useEffect, useRef, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { ChampTexte } from '../composants/texte.js';
import { repo } from '../../donnees.js';
import { FAMILLES } from '../../domain/roue.js';
import { corriger, definition, estCorrigee } from '../../domain/definitions-roue.js';

const idChamp = (id) => `definition-${id.replace(/:/g, '-')}`;

export function ReglagesEmotions() {
  const [corrections, setCorrections] = useState(null);
  // Le mot dont le champ est ouvert, et le tour du champ : « Revenir » le remonte avec le texte de Carnet.
  const [ouvert, setOuvert] = useState(null);
  const [tour, setTour] = useState(0);
  const file = useRef(Promise.resolve());
  const aFocaliser = useRef(false);
  // Une lecture impossible : le texte de Carnet partout.
  useEffect(() => { repo.meta.lire('definitionsRoue').catch(() => null).then((v) => setCorrections(v || {})); }, []);
  useEffect(() => {
    if (!aFocaliser.current || !ouvert) return;
    aFocaliser.current = false;
    const champ = document.getElementById(idChamp(ouvert));
    if (champ) champ.focus({ preventScroll: true });
  }, [ouvert]);
  // Les écritures se suivent : la sortie du champ, puis « Revenir », ne s'écrasent pas. Un échec est rendu au champ,
  // qui garde son brouillon.
  const ecrire = (id, texte) => {
    file.current = file.current.catch(() => {}).then(async () => {
      setCorrections(await repo.meta.modifier('definitionsRoue', (d) => corriger(d, id, texte)));
    });
    return file.current;
  };
  const revenir = async (id) => {
    await ecrire(id, null).catch(() => {});
    setTour((n) => n + 1);
  };
  const ouvrir = (id) => { aFocaliser.current = true; setOuvert(id); };
  const retour = () => { location.hash = '#/reglages'; };

  if (!corrections) return html`<main class="ecran fiche"><${Entete} titre="Émotions" retour=${retour} /></main>`;
  return html`<main class="ecran fiche reglages-emotions">
    <${Entete} titre="Émotions" retour=${retour} />
    <p class="aide-carte">Le sens de chaque mot, tel que la carte de l'émotion du moment l'affiche. Touche un mot pour l'écrire à ta façon.</p>
    ${FAMILLES.map((f) => html`<section class="famille-definitions" aria-labelledby=${`titre-${f.cle}`}>
      <h2 class=${`libelle-section titre-famille-definitions emo-${f.cle}`} id=${`titre-${f.cle}`}><span class="point-famille" aria-hidden="true"></span>${f.libelle}</h2>
      <ul class="liste carte carte-groupe">
        ${f.mots.map((m) => {
          const corrigee = estCorrigee(m.id, corrections);
          return html`<li class="ligne-definition" key=${m.id}>
            ${ouvert === m.id
              ? html`<div class="champ-definition"><${ChampTexte} key=${`${m.id}-${tour}`} id=${idChamp(m.id)} etiquette=${m.libelle}
                  valeur=${definition(m.id, corrections)} cleBrouillon=${`carnet:brouillon:definition:${m.id}`}
                  surEnregistrer=${(texte) => ecrire(m.id, texte)} lignes=${2} dicter=${false} /></div>`
              : html`<button type="button" class="ligne-carte bouton-definition" onClick=${() => ouvrir(m.id)}>
                  <span class="mot-definitions">${m.libelle}</span>${' '}<span class="texte-definitions">${definition(m.id, corrections)}</span>
                </button>`}
            ${corrigee && html`<button type="button" class="btn-lien revenir-carnet" onClick=${() => revenir(m.id)}>Revenir au texte de Carnet</button>`}
          </li>`;
        })}
      </ul>
    </section>`)}
  </main>`;
}
