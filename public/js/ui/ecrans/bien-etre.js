// Onglet Bien-être (v7, spec §6.2 ; v8, spec §5 et §6) : pour pratiquer hors des moments de crise. Il ne garde que le
// Programme et la cohérence cardiaque (la liste des exercices disparaît : ils se font dans le Programme).
// - En tête, la carte Programme : la séance qui vient (celle qui suit la dernière faite dans l'ordre du Programme,
//   domain/programme.js), « 5 min · assis », et un gros bouton lecture rond qui la lance d'un toucher dans le lecteur ;
//   le reste de la carte ouvre l'écran Programme. Ni nombre, ni pourcentage, ni anneau.
// - Puis la carte de la cohérence cardiaque, compacte : sa durée et son rythme en puces (réglés au même endroit que
//   Moment difficile, méta `respiration`) et un bouton lecture qui la lance d'un toucher (#/bien-etre/coherence) ; elle
//   ne compte pas dans le Programme.
// - En bas, une ligne fixe.
// Aucun compteur : ni nombre de séances, ni série, ni « déjà fait aujourd'hui », ni rappel. La fin d'une lecture laisse
// le message « Noter mon émotion » quelques secondes (lecteur.js) ; rien ne s'ouvre tout seul.
import { html, useEffect, useMemo, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { Lecteur, lancerLecture } from '../composants/lecteur.js';
import { PucesRespiration, useReglagesRespiration } from '../composants/respiration.js';
import { Icones } from '../icones.js';
import { useDonnees } from '../hooks.js';
import { repo } from '../../donnees.js';
import { dureeEtPosture } from '../../domain/exercices.js';
import { seanceProgramme, suivante } from '../../domain/programme.js';
import { NOM_RESPIRATION, normaliserRespiration, seanceCoherence } from '../../domain/respiration.js';
import { pourAffichage } from '../../domain/typographie.js';
import { versHash } from '../../routeur.js';

export const LIGNE_FIXE = 'Tu peux t\'arrêter à tout moment.';

// Les réglages avec lesquels la carte vient de lancer la cohérence : l'écran du lecteur s'ouvre sans attendre de les relire.
let reglagesLances = null;

function CarteCoherence() {
  const [reglages, regler] = useReglagesRespiration();
  const lancer = () => {
    if (!reglages) return;
    reglagesLances = reglages;
    lancerLecture(versHash('coherence'));
  };
  return html`<section class="carte carte-coherence teinte-bien-etre" aria-labelledby="titre-coherence">
    <h2 class="titre-coherence" id="titre-coherence"><span class="carre-carte" aria-hidden="true">${Icones.respiration()}</span>${NOM_RESPIRATION}</h2>
    ${reglages && html`<${PucesRespiration} reglages=${reglages} regler=${regler} />`}
    <button type="button" class="bouton-lecture" aria-label="Commencer la cohérence cardiaque" disabled=${!reglages} onClick=${lancer}>
      ${Icones.lecture()}
    </button>
  </section>`;
}

// La carte Programme : un lien vers l'écran Programme (son titre, la séance qui vient et sa durée) et, à droite, le bouton
// lecture, qui lance cette séance d'un toucher ; le lecteur revient ensuite à Bien-être. Le titre est un titre de niveau
// 2, comme celui de la carte de la cohérence : le rotor « Titres » de VoiceOver passe par les deux. Tant que les séances
// ne sont pas lues, la séance qui vient n'est pas affichée et le bouton attend.
function CarteProgramme() {
  const { donnees } = useDonnees(() => repo.seances.tous());
  const id = donnees ? suivante(donnees) : null;
  const s = id && seanceProgramme(id);
  const lancer = () => { if (id) lancerLecture(versHash('seance-programme', { id }), { retour: '#/bien-etre' }); };
  return html`<section class="carte carte-programme teinte-bien-etre" aria-labelledby="titre-programme">
    <a class="lien-programme" href=${versHash('programme')}>
      <h2 class="titre-coherence titre-programme"><span class="carre-carte" aria-hidden="true">${Icones.bienEtre()}</span><span id="titre-programme">Programme</span>${Icones.chevron({ trait: 2 })}</h2>
      ${s && html`<span class="seance-qui-vient">
        <span class="exercice-titre">${s.titre}</span>
        <span class="exercice-description">${pourAffichage(dureeEtPosture(s))}</span>
      </span>`}
    </a>
    <button type="button" class="bouton-lecture" aria-label=${s ? `Commencer ${s.titre}` : 'Commencer'} disabled=${!s} onClick=${lancer}>
      ${Icones.lecture()}
    </button>
  </section>`;
}

export function BienEtre() {
  return html`<main class="ecran bien-etre">
    <${Entete} titre="Bien-être" />
    <${CarteProgramme} />
    <${CarteCoherence} />
    <p class="ligne-fixe">${LIGNE_FIXE}</p>
  </main>`;
}

// La cohérence cardiaque dans le lecteur (#/bien-etre/coherence), de la durée et du rythme réglés. Lancée par la carte, elle
// démarre aussitôt ; ouverte autrement, elle attend « Commencer ».
export function Coherence() {
  const [reglages, setReglages] = useState(() => { const r = reglagesLances; reglagesLances = null; return r; });
  useEffect(() => {
    if (reglages) return;
    repo.meta.lire('respiration').catch(() => null).then((v) => setReglages(normaliserRespiration(v)));
  }, []);
  const seance = useMemo(() => reglages && seanceCoherence(reglages), [reglages]);
  return seance ? html`<${Lecteur} seance=${seance} />` : null;
}
