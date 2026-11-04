// Onglet Bien-être (v7, spec §6.2 ; v8, spec §5 et §6 ; v10, spec §7) : pour pratiquer hors des moments de crise. De haut en
// bas, à des places qui ne bougent pas d'une fois sur l'autre :
// - « Reprendre », le dernier élément lancé (retenu sur cet appareil, lecteur.js) : son titre et le bouton lecture, qui le relance
//   depuis son début. Absente sans valeur valide. Ni date, ni « déjà fait ».
// - « Favoris », les éléments épinglés (composants/epingle.js), dans l'ordre où ils l'ont été, chacun avec son bouton lecture.
//   Absente s'il n'y en a pas.
// - Les quatre entrées, toujours dans cet ordre : trois listes (ecrans/entree-bien-etre.js) et l'écran du Programme.
// - En bas, une ligne fixe.
// Aucun compteur : ni nombre de séances, ni série, ni « déjà fait aujourd'hui », ni rappel, et aucun tri selon l'heure. La fin d'une
// lecture laisse le message « Noter mon émotion » quelques secondes (lecteur.js) ; rien ne s'ouvre tout seul.
import { html, useEffect, useMemo, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { useFavoris } from '../composants/epingle.js';
import { Lecteur, lireDernier } from '../composants/lecteur.js';
import { LigneElement, hashElement, lancerElement, surOuvrir } from '../composants/ligne-element.js';
import { PucesRespiration, useReglagesRespiration } from '../composants/respiration.js';
import { CarreIcone } from '../composants/rubrique.js';
import { Icones } from '../icones.js';
import { ENTREES, titreElement } from '../../domain/entrees-bien-etre.js';
import { exerciceDe } from '../../domain/exercices.js';
import { seanceCoherence } from '../../domain/respiration.js';
import { versHash } from '../../routeur.js';

export const LIGNE_FIXE = 'Tu peux t\'arrêter à tout moment.';

const RETOUR = versHash('bien-etre');
const ICONES_ENTREES = { calmer: 'respiration', dormir: 'sommeil', concentrer: 'historique' };
// Les quatre entrées : les trois listes, puis le Programme, qui a son écran.
const LIGNES_ENTREES = [
  ...ENTREES.map((x) => ({ id: x.id, titre: x.titre, icone: ICONES_ENTREES[x.id], href: versHash('entree-bien-etre', { entree: x.id }) })),
  { id: 'programme', titre: 'Programme', icone: 'bienEtre', href: versHash('programme') },
];

// La carte « Reprendre » : un lien vers l'écran de départ de l'élément (le titre de la carte, le sien) et, à droite, le bouton
// lecture, qui le relance d'un toucher.
function CarteReprendre({ id }) {
  const titre = titreElement(id);
  return html`<section class="carte carte-reprendre teinte-bien-etre" aria-labelledby="titre-reprendre">
    <a class="lien-reprendre" href=${hashElement(id)} onClick=${surOuvrir(id, RETOUR)}>
      <h2 class="titre-carte" id="titre-reprendre">Reprendre</h2>
      <span class="exercice-titre">${titre}</span>
    </a>
    <button type="button" class="bouton-lecture" aria-label=${`Commencer ${titre}`} onClick=${() => lancerElement(id, { retour: RETOUR })}>${Icones.lecture()}</button>
  </section>`;
}

// Tant que les favoris ne sont pas lus, rien sous « Reprendre » : les entrées ne sautent pas sous le doigt quand ils arrivent.
export function BienEtre() {
  const [dernier] = useState(lireDernier);
  const [favoris] = useFavoris();
  return html`<main class="ecran bien-etre">
    <${Entete} titre="Bien-être" />
    ${dernier && html`<${CarteReprendre} id=${dernier} />`}
    ${favoris && favoris.length > 0 && html`<section class="carte carte-groupe teinte-bien-etre" aria-labelledby="titre-favoris">
      <h2 class="titre-carte titre-etape" id="titre-favoris">Favoris</h2>
      <ul class="liste">${favoris.map((id) => html`<${LigneElement} key=${id} id=${id} retour=${RETOUR} />`)}</ul>
    </section>`}
    ${favoris && html`<ul class="liste carte carte-groupe avec-carres entrees teinte-bien-etre" aria-label="Entrées">
      ${LIGNES_ENTREES.map((x) => html`<li key=${x.id}><a class="ligne-carte" href=${x.href}>
        <${CarreIcone} icone=${x.icone} teinte="bien-etre" /><span class="ligne-libelle">${x.titre}</span>${Icones.chevron({ trait: 2 })}</a></li>`)}
    </ul>
    <p class="ligne-fixe">${LIGNE_FIXE}</p>`}
  </main>`;
}

// La cohérence cardiaque dans le lecteur (#/bien-etre/coherence), de la durée et du rythme réglés. Lancée d'un toucher, elle démarre
// aussitôt ; ouverte autrement, elle attend « Commencer », et sa durée et son rythme se règlent là, comme dans Moment difficile.
export function Coherence() {
  const [reglages, regler] = useReglagesRespiration();
  const seance = useMemo(() => reglages && seanceCoherence(reglages), [reglages]);
  return seance ? html`<${Lecteur} seance=${seance} reglagesAvant=${html`<${PucesRespiration} reglages=${reglages} regler=${regler} />`} />` : null;
}

// Un exercice seul dans le lecteur (#/exercice/<id>, v10, spec §7.4), à la durée retenue pour ceux qui en ont une au choix
// (lecteur.js). Lancé d'un toucher (lancerLecture), il démarre aussitôt et revient à l'écran d'où il part ; ouvert autrement,
// il attend « Commencer ». Il n'écrit pas `programme` : seul le Programme date ses séances. Un exercice inconnu ramène à
// Bien-être.
export function ExerciceSeul({ id }) {
  const exercice = exerciceDe(id);
  useEffect(() => { if (!exercice) location.hash = versHash('bien-etre'); }, [id]);
  return exercice ? html`<${Lecteur} seance=${exercice} />` : null;
}
