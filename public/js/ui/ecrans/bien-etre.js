// Onglet Bien-être (v7, spec §6.2 ; v8, spec §5) : pour pratiquer hors des moments de crise. En tête, la carte de la
// cohérence cardiaque, compacte : sa durée et son rythme en puces (réglés au même endroit que Moment difficile, méta
// `respiration`) et un bouton lecture qui la lance d'un toucher dans le lecteur (#/bien-etre/coherence) ; puis les
// exercices, un par ligne (titre, durée approximative, une ligne de description), qui s'ouvrent dans le lecteur ; en bas,
// une ligne fixe. Aucun compteur : ni nombre de séances, ni série, ni « déjà fait aujourd'hui », ni rappel. La fin d'une
// lecture laisse le message « Noter mon émotion » quelques secondes (lecteur.js) ; rien ne s'ouvre tout seul.
import { html, useEffect, useMemo, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { Lecteur, lancerLecture } from '../composants/lecteur.js';
import { PucesRespiration, useReglagesRespiration } from '../composants/respiration.js';
import { Icones } from '../icones.js';
import { repo } from '../../donnees.js';
import { EXERCICES } from '../../domain/exercices.js';
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

export function BienEtre() {
  return html`<main class="ecran bien-etre">
    <${Entete} titre="Bien-être" />
    <${CarteCoherence} />
    <h2 class="libelle-section">Exercices</h2>
    <ul class="liste carte carte-groupe exercices" aria-label="Exercices">${EXERCICES.map((x) => html`<li>
      <a class="ligne-exercice" href=${versHash('exercice', { id: x.id })}>
        <span class="ligne-exercice-corps">
          <span class="exercice-titre">${x.titre}</span>
          <span class="exercice-description">${pourAffichage(`${x.dureeMin}\u00a0min · ${x.description}`)}</span>
        </span>
        ${Icones.chevron({ trait: 2 })}
      </a>
    </li>`)}</ul>
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
