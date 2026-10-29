// Un mot à soi (v9, spec §4.5) : son nom, sa couleur (les quatre bulles en petit, ui/composants/quatre-bulles.js), sa
// famille (les sept de la roue, ou « Aucune », comme Fatigué et Épuisé) et sa définition, facultative. Aucun bouton
// « Enregistrer » : une couleur ou une famille s'écrit au toucher, le nom à la sortie de son champ (ou « Terminé » du
// clavier), la définition comme tout texte libre (ChampTexte).
// Le formulaire sert deux fois : à la création, depuis la loupe de l'émotion du moment, où le mot naît au premier choix
// de sa couleur (`cree` faux : le nom et la couleur suffisent, la famille et la définition viennent ensuite), et dans
// Réglages › Émotions › « Mes mots ». L'écran qui l'utilise écrit (domain/mots-perso.js) ; une écriture refusée rend son
// message, montré sous le nom (« Ce mot est déjà sur la carte. »), et le texte tapé reste dans son champ.
import { html, useRef, useState } from '../lib.js';
import { QuatreBulles } from './quatre-bulles.js';
import { Pastilles } from './pastilles.js';
import { ChampTexte } from './texte.js';
import { FAMILLES } from '../../domain/roue.js';
import { ErreurMot, LIBELLE_MAX } from '../../domain/mots-perso.js';

// « Aucune » : la famille null, celle de Fatigué et d'Épuisé.
const AUCUNE = 'aucune';
const OPTIONS_FAMILLES = [...FAMILLES.map((f) => ({ valeur: f.cle, libelle: f.libelle })), { valeur: AUCUNE, libelle: 'Aucune' }];
const ECHEC = 'Le changement n\'a pas pu être enregistré.';
export const messageMot = (e) => (e instanceof ErreurMot ? e.message : ECHEC);

// mot : { libelle, zone, famille, definition } ; idBase : le début des id de ses champs, et de la clé du brouillon de sa
// définition (propre à chaque mot). surNom(texte), surZone(zone, nom) (le nom tapé, pour la création), surFamille(cle|null)
// et surDefinition(texte|null) écrivent ; une promesse rejetée montre son message.
export function FormulaireMot({ idBase, mot, cree = true, enGarde = false, surNom, surZone, surFamille, surDefinition }) {
  const nom = useRef(null);
  const [erreur, setErreur] = useState(null);
  const essayer = async (action) => {
    try { await action(); setErreur(null); } catch (e) { setErreur(messageMot(e)); }
  };
  // Le nom : à la création, il reste dans son champ jusqu'au choix de la couleur ; ensuite, il s'écrit à la sortie. Remis
  // tel qu'il est, il n'y a rien à écrire, ni plus rien à dire.
  const validerNom = () => {
    const texte = nom.current ? nom.current.value : '';
    if (!cree) return;
    if (texte.trim() === mot.libelle) { setErreur(null); return; }
    essayer(() => surNom(texte));
  };
  const idErreur = `${idBase}-erreur`;
  const famille = mot.famille || AUCUNE;
  return html`<div class="formulaire-mot">
    <div class="rubrique-mot">
      <label class="etiquette" for=${`${idBase}-nom`}>Nom</label>
      <input id=${`${idBase}-nom`} key=${mot.libelle} ref=${nom} class="champ-ligne nom-mot" defaultValue=${mot.libelle} maxLength=${LIBELLE_MAX}
        enterkeyhint="done" autocomplete="off" aria-invalid=${erreur ? 'true' : null} aria-describedby=${erreur ? idErreur : null}
        onKeyDown=${(e) => { if (e.key === 'Enter') e.target.blur(); }} onBlur=${validerNom} />
      <p class="erreur-mot" id=${idErreur} role="alert">${erreur}</p>
    </div>
    <div class="rubrique-mot">
      <p class="etiquette">Couleur</p>
      <${QuatreBulles} petites=${true} choisie=${mot.zone} etiquette="Couleur" enGarde=${enGarde}
        surZone=${(z) => { if (z !== mot.zone) essayer(() => surZone(z, nom.current ? nom.current.value : mot.libelle)); }} />
      ${!cree && html`<p class="aide-mot">Il rejoint la carte, et ce relevé, au toucher de sa couleur.</p>`}
    </div>
    ${cree && html`<div class="rubrique-mot">
      <p class="etiquette">Famille</p>
      <${Pastilles} etiquette="Famille" classe="souples" options=${OPTIONS_FAMILLES} valeur=${famille}
        surChoix=${(v) => { const cle = v && v !== AUCUNE ? v : null; if (cle !== (mot.famille || null)) essayer(() => surFamille(cle)); }} />
    </div>
    <div class="rubrique-mot">
      <${ChampTexte} id=${`${idBase}-definition`} etiquette="Définition" facultatif=${true} valeur=${mot.definition}
        cleBrouillon=${`carnet:brouillon:${idBase}-definition`} surEnregistrer=${surDefinition} lignes=${2} dicter=${false} />
    </div>`}
  </div>`;
}
