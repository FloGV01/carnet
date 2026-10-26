// Le Programme de Bien-être (v8, spec §6, §12.2 et §12.4) : #/bien-etre/programme, ouvert depuis sa carte de Bien-être.
// En tête, la présentation, écrite une fois (d'où vient le programme, un rythme proposé, jamais mesuré). Puis une carte par
// étape, avec son titre seul (aucun numéro) ; dans chaque carte, ses séances, avec leur titre et « 5 min · assis ». Une
// séance faite (lancée depuis le Programme et menée au bout) porte une coche et « Faite le 12/10 », sa date la plus
// récente ; une séance pas faite n'affiche rien, ni case vide ni grisé. Rien n'est verrouillé : un toucher sur une
// séance ouvre le lecteur (#/bien-etre/programme/<id>), qui attend « Commencer ». Aucun compteur, aucune date de départ,
// aucun repère de progression ; rien ne s'ouvre seul. En bas, la ligne fixe de Bien-être.
import { html, useEffect, useMemo, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { Lecteur } from '../composants/lecteur.js';
import { Icones } from '../icones.js';
import { useDonnees } from '../hooks.js';
import { repo } from '../../donnees.js';
import { jourLogique } from '../../domain/dates.js';
import { dureeEtPosture } from '../../domain/exercices.js';
import { ETAPES, PRESENTATION, estSeanceProgramme, faitesLe, seanceProgramme, texteFaite } from '../../domain/programme.js';
import { normaliserRespiration } from '../../domain/respiration.js';
import { pourAffichage } from '../../domain/typographie.js';
import { versHash } from '../../routeur.js';
import { LIGNE_FIXE } from './bien-etre.js';

const RETOUR = '#/bien-etre';
const ADRESSE_PROGRAMME = '#/bien-etre/programme';

// Une séance du Programme dans sa carte : son titre, « 5 min · assis », et, faite, la coche et « Faite le 12/10 ».
function LigneSeance({ id, faiteLe, aujourdhui }) {
  const s = seanceProgramme(id);
  return html`<li>
    <a class="ligne-exercice ligne-seance" href=${versHash('seance-programme', { id })}>
      <span class="ligne-exercice-corps">
        <span class="exercice-titre">${s.titre}</span>
        <span class="exercice-description">${pourAffichage(dureeEtPosture(s))}</span>
        ${faiteLe && html`<span class="seance-faite">${Icones.coche({ trait: 3 })}${texteFaite(faiteLe, aujourdhui)}</span>`}
      </span>
      ${Icones.chevron({ trait: 2 })}
    </a>
  </li>`;
}

export function Programme() {
  const { donnees } = useDonnees(() => repo.seances.tous());
  const faites = useMemo(() => faitesLe(donnees), [donnees]);
  const aujourdhui = jourLogique(repo.maintenant());
  return html`<main class="ecran fiche programme">
    <${Entete} titre="Programme" retour=${() => { location.hash = RETOUR; }} />
    <div class="presentation-programme">${PRESENTATION.map((t) => html`<p>${pourAffichage(t)}</p>`)}</div>
    ${ETAPES.map((etape) => html`<section class="carte carte-groupe etape-programme teinte-bien-etre" key=${etape.id} aria-labelledby=${`etape-${etape.id}`}>
      <h2 class="titre-carte titre-etape" id=${`etape-${etape.id}`}>${etape.titre}</h2>
      <ul class="liste">${etape.seances.map((id) => html`<${LigneSeance} key=${id} id=${id} faiteLe=${faites[id]} aujourdhui=${aujourdhui} />`)}</ul>
    </section>`)}
    <p class="ligne-fixe">${LIGNE_FIXE}</p>
  </main>`;
}

// Une séance du Programme dans le lecteur (#/bien-etre/programme/<id>) : la séance enregistrée porte son identifiant
// (`programme`), et le lecteur revient au Programme. La cohérence cardiaque y dure 5 min, au rythme réglé. Lancée par la
// carte Programme de Bien-être (lancerLecture), elle démarre aussitôt et revient à Bien-être. Une séance inconnue ramène
// au Programme.
export function SeanceProgramme({ id }) {
  const connue = estSeanceProgramme(id);
  const [reglages, setReglages] = useState(() => (id === 'coherence' ? null : {}));
  useEffect(() => {
    if (!connue) { location.hash = ADRESSE_PROGRAMME; return; }
    if (id === 'coherence') repo.meta.lire('respiration').catch(() => null).then((v) => setReglages(normaliserRespiration(v)));
  }, [id]);
  const seance = useMemo(() => (connue && reglages ? seanceProgramme(id, reglages) : null), [id, reglages]);
  return seance ? html`<${Lecteur} seance=${seance} origine=${ADRESSE_PROGRAMME} programme=${id} />` : null;
}
