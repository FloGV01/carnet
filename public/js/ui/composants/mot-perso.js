// Un mot à soi (v9, spec §4.5) : son nom, sa couleur (les quatre bulles en petit, ui/composants/quatre-bulles.js), sa
// famille (les sept de la roue, ou aucune, comme Fatigué et Épuisé) et sa définition, facultative. Aucun bouton
// « Enregistrer » : une couleur ou une famille s'écrit au toucher, le nom à la sortie de son champ (ou « Terminé » du
// clavier), la définition comme tout texte libre (ChampTexte). Rien n'est coché d'avance : un mot sans famille n'en
// montre aucune, « Aucune » est le toucher qui retire la famille choisie.
// Le formulaire sert deux fois : à la création, depuis la loupe de l'émotion du moment, où le mot naît au premier choix
// de sa couleur (`cree` faux : le nom et la couleur suffisent, la famille et la définition viennent ensuite), et dans
// Réglages › Émotions › « Mes mots ». L'écran qui l'utilise écrit (domain/mots-perso.js) ; une écriture refusée rend son
// message, montré sous le nom (« Ce mot est déjà sur la carte. »), et le texte tapé reste dans son champ. Le message du
// nom reste tant que le champ montre un nom qui n'est pas enregistré, même si une couleur ou une famille s'écrit
// entre-temps : sinon le champ aurait l'air renommé.
import { html, useRef, useState } from '../lib.js';
import { QuatreBulles } from './quatre-bulles.js';
import { Pastilles } from './pastilles.js';
import { ChampTexte } from './texte.js';
import { FAMILLES } from '../../domain/roue.js';
import { ErreurMot, LIBELLE_MAX } from '../../domain/mots-perso.js';

// « Aucune » : le toucher qui écrit la famille null, celle de Fatigué et d'Épuisé. Il n'est jamais coché : null ne
// coche rien (rien par défaut).
const AUCUNE = 'aucune';
const OPTIONS_FAMILLES = [...FAMILLES.map((f) => ({ valeur: f.cle, libelle: f.libelle })), { valeur: AUCUNE, libelle: 'Aucune' }];
const ECHEC = 'Le changement n\'a pas pu être enregistré.';
export const messageMot = (e) => (e instanceof ErreurMot ? e.message : ECHEC);
// Les refus qui tiennent au nom (domain/mots-perso.js) : à la création, le choix de la couleur écrit aussi le nom tapé.
const REFUS_DU_NOM = new Set(['LIBELLE_VIDE', 'LIBELLE_EXISTANT']);

// mot : { libelle, zone, famille, definition } ; idBase : le début des id de ses champs, et de la clé du brouillon de sa
// définition (propre à chaque mot). surNom(texte), surZone(zone, nom) (le nom tapé, pour la création), surFamille(cle|null)
// et surDefinition(texte|null) écrivent ; une promesse rejetée montre son message.
export function FormulaireMot({ idBase, mot, cree = true, enGarde = false, surNom, surZone, surFamille, surDefinition }) {
  const nom = useRef(null);
  // Deux messages, montrés ensemble sous le nom : celui du nom, qui ne part qu'avec un nom écrit ou remis tel qu'il est
  // enregistré (à la création, par le choix de la couleur, qui l'écrit), et celui d'une couleur ou d'une famille, qui
  // part à la prochaine qui s'écrit.
  const [erreurNom, setErreurNom] = useState(null);
  const [erreur, setErreur] = useState(null);
  // Une couleur ou une famille. À la création, la couleur crée le mot avec le nom tapé : elle dit tout à elle seule,
  // réussie (les deux messages partent) ou refusée (pour le nom, ou pour autre chose).
  const essayer = async (action) => {
    try {
      await action();
      setErreur(null);
      if (!cree) setErreurNom(null);
    } catch (e) {
      const message = messageMot(e);
      if (cree) setErreur(message);
      else if (e instanceof ErreurMot && REFUS_DU_NOM.has(e.code)) { setErreurNom(message); setErreur(null); }
      else { setErreur(message); setErreurNom(null); }
    }
  };
  // Le nom : à la création, il reste dans son champ jusqu'au choix de la couleur ; ensuite, il s'écrit à la sortie. Remis
  // tel qu'il est, il n'y a rien à écrire, ni plus rien à dire.
  const validerNom = async () => {
    const texte = nom.current ? nom.current.value : '';
    if (!cree) return;
    if (texte.trim() === mot.libelle) { setErreurNom(null); return; }
    try { await surNom(texte); setErreurNom(null); } catch (e) { setErreurNom(messageMot(e)); }
  };
  const idErreur = `${idBase}-erreur`;
  const message = [erreurNom, erreur].filter(Boolean).join(' ');
  return html`<div class="formulaire-mot">
    <div class="rubrique-mot">
      <label class="etiquette" for=${`${idBase}-nom`}>Nom</label>
      <input id=${`${idBase}-nom`} key=${mot.libelle} ref=${nom} class="champ-ligne nom-mot" defaultValue=${mot.libelle} maxLength=${LIBELLE_MAX}
        enterkeyhint="done" autocomplete="off" aria-invalid=${erreurNom ? 'true' : null} aria-describedby=${erreurNom ? idErreur : null}
        onKeyDown=${(e) => { if (e.key === 'Enter') e.target.blur(); }} onBlur=${validerNom} />
      <p class="erreur-mot" id=${idErreur} role="alert">${message}</p>
    </div>
    <div class="rubrique-mot">
      <p class="etiquette">Couleur</p>
      <${QuatreBulles} petites=${true} choisie=${mot.zone} etiquette="Couleur" enGarde=${enGarde}
        surZone=${(z) => { if (z !== mot.zone) essayer(() => surZone(z, nom.current ? nom.current.value : mot.libelle)); }} />
      ${!cree && html`<p class="aide-mot">Il rejoint la carte, et ce relevé, au toucher de sa couleur.</p>`}
    </div>
    ${cree && html`<div class="rubrique-mot">
      <p class="etiquette">Famille</p>
      <${Pastilles} etiquette="Famille" classe="souples" options=${OPTIONS_FAMILLES} valeur=${mot.famille || null}
        surChoix=${(v) => { const cle = v && v !== AUCUNE ? v : null; if (cle !== (mot.famille || null)) essayer(() => surFamille(cle)); }} />
    </div>
    <div class="rubrique-mot">
      <${ChampTexte} id=${`${idBase}-definition`} etiquette="Définition" facultatif=${true} valeur=${mot.definition}
        cleBrouillon=${`carnet:brouillon:${idBase}-definition`} surEnregistrer=${surDefinition} lignes=${2} dicter=${false} />
    </div>`}
  </div>`;
}
