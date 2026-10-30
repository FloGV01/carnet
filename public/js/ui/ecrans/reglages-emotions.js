// Réglages › Émotions (v8, spec §4) : le sens des mots de la roue, par famille, tel que la carte de l'Émotion du
// moment l'affiche. v9 (spec §13.3) : les 144 mots, Fatigué et Épuisé dans une section « Sans famille », au point
// creux, après les sept familles. Un toucher sur un mot ouvre le champ de sa définition ; le texte s'enregistre à la
// sortie du champ seulement, ou si l'app passe en arrière-plan (méta `definitionsRoue`, sauvegardée avec le reste) : la
// frappe reste dans le brouillon local, et rien ne bouge sous le doigt pendant qu'on réécrit (ChampTexte `aLaSortie`).
// « Revenir au texte de Carnet » retire la correction ; un champ vidé fait de même. Le texte de Carnet
// (domain/definitions-roue.js) ne change jamais.
// v9 (spec §4.5) : après « Sans famille », qui reste la seule (un mot à soi sans famille le dit sur sa rangée), la
// rubrique « Mes mots », les mots ajoutés depuis la loupe de l'émotion du moment : ceux de la carte, dans l'ordre de
// création, puis ceux mis de côté. Une rangée touchée devient son formulaire (ui/composants/mot-perso.js) : le nom, la
// couleur, la famille, la définition, écrits comme à la création (domain/mots-perso.js ; les relevés ne sont pas réécrits,
// leur énergie reste). Un mot qui sert dans un relevé se met de côté (« Remettre sur la carte » l'y ramène, s'il a une
// couleur) ; un mot qui ne sert dans aucun s'efface, après confirmation.
import { html, useEffect, useRef, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { ChampTexte } from '../composants/texte.js';
import { FormulaireMot, messageMot } from '../composants/mot-perso.js';
import { Confirmation } from '../composants/confirmation.js';
import { afficherToast } from '../composants/toast.js';
import { useDonnees } from '../hooks.js';
import { repo } from '../../donnees.js';
import { FAMILLES, MOTS_SANS_FAMILLE, estIdPerso, motPerso } from '../../domain/roue.js';
import { NOMS_ZONES } from '../../domain/carte-roue.js';
import { corriger, definition, estCorrigee } from '../../domain/definitions-roue.js';
import { persoDe, motsActifs, modifierMot, mettreDeCote, remettreSurLaCarte } from '../../domain/mots-perso.js';

const idChamp = (id) => `definition-${id.replace(/:/g, '-')}`;
// Le formulaire d'un mot à soi : le début des id de ses champs, et celui qui reçoit le focus à l'ouverture.
const idMot = (id) => `mot-${id.replace(/:/g, '-')}`;
const idFocus = (id) => (estIdPerso(id) ? idMot(id) : idChamp(id));
const LIBELLES_FAMILLES = Object.fromEntries(FAMILLES.map((f) => [f.cle, f.libelle]));
// Les sections : les sept familles, au point de leur couleur, puis les mots sans famille (v9), au point creux.
const SECTIONS = [
  ...FAMILLES.map((f) => ({ cle: f.cle, libelle: f.libelle, mots: f.mots, classe: `emo-${f.cle}` })),
  { cle: 'sans-famille', libelle: 'Sans famille', mots: MOTS_SANS_FAMILLE, classe: 'sans-famille' },
];

// Une rangée de « Mes mots » : fermée, le mot au point de sa zone, sa couleur et sa famille, sa définition ; ouverte, son
// formulaire et ce qu'on peut en faire. Ce qu'elle en dit suit l'état du mot : sur la carte (pas mis de côté, une zone,
// comme motsDeLaCarte) ou non, utilisé dans un relevé ou non. Un mot mis de côté dont le relevé a été supprimé ne sert
// plus : l'aide ne parle plus de relevés, ni la confirmation d'une carte qu'il a déjà quittée.
function MotPerso({ id, mot, utilise, ouvert, surOuvrir, surEffacer }) {
  const ecrire = (champs) => repo.meta.modifier('motsPerso', (p) => modifierMot(p, id, champs));
  const agir = (transformer) => repo.meta.modifier('motsPerso', transformer).catch((e) => afficherToast(messageMot(e), null, 3500));
  const zone = NOMS_ZONES[mot.zone] ? mot.zone : null;
  const surCarte = !mot.archive && Boolean(zone);
  const famille = LIBELLES_FAMILLES[mot.famille] || null;
  const def = definition(id, null, { [id]: mot });
  if (!ouvert) {
    return html`<button type="button" class="ligne-carte bouton-definition" onClick=${() => surOuvrir(id)}>
      <span class="mot-definitions mot-perso-ligne"><span class=${zone ? `point-evenement point-releve zone-${zone}` : 'point-evenement point-releve point-creux'} aria-hidden="true"></span>${mot.libelle}</span>${' '}
      <span class="texte-definitions">${zone ? NOMS_ZONES[zone] : 'Sans couleur'} · ${famille || 'Sans famille'}</span>
      ${def && html`${' '}<span class="texte-definitions">${def}</span>`}
    </button>`;
  }
  return html`<div class=${`editeur-mot${zone ? ` zone-${zone}` : ''}`} id=${idMot(id)} tabindex="-1" role="group" aria-label=${mot.libelle}>
    <${FormulaireMot} idBase=${idMot(id)} mot=${{ libelle: mot.libelle, zone, famille: mot.famille || null, definition: mot.definition || null }}
      surNom=${(libelle) => ecrire({ libelle })} surZone=${(z) => ecrire({ zone: z })}
      surFamille=${(f) => ecrire({ famille: f })} surDefinition=${(texte) => ecrire({ definition: texte })} />
    <p class="aide-carte">${surCarte ? (utilise ? 'Il sert dans un relevé : mis de côté, il quitte la carte et la loupe, et ses relevés le gardent.' : 'Il ne sert dans aucun relevé.')
      : !zone ? 'Choisis sa couleur pour le remettre sur la carte.'
        : utilise ? 'Il n\'est plus sur la carte ni dans la loupe ; ses relevés le gardent.' : 'Il n\'est plus sur la carte ni dans la loupe.'}</p>
    <div class="actions-mot">
      ${!mot.archive && utilise && html`<button type="button" class="btn-lien" onClick=${() => agir((p) => mettreDeCote(p, id))}>Mettre de côté</button>`}
      ${mot.archive && zone && html`<button type="button" class="btn-lien" onClick=${() => agir((p) => remettreSurLaCarte(p, id))}>Remettre sur la carte</button>`}
      ${!utilise && html`<button type="button" class="btn-lien" onClick=${() => surEffacer(id, mot.libelle, surCarte)}>Effacer</button>`}
    </div>
  </div>`;
}

// « Mes mots » : la méta `motsPerso` et les mots à soi cités par un relevé, relues après chaque écriture.
function MesMots({ ouvert, surOuvrir }) {
  const [effacer, setEffacer] = useState(null);
  const { donnees } = useDonnees(async () => {
    const [perso, humeurs] = await Promise.all([repo.meta.lire('motsPerso').catch(() => null), repo.humeurs.tous().catch(() => [])]);
    return { perso: persoDe(perso), utilises: new Set(humeurs.map((h) => h.emotion).filter(estIdPerso)) };
  }, []);
  if (!donnees) return null;
  const { perso, utilises } = donnees;
  // Sur la carte, dans l'ordre de création ; puis les autres mots lisibles (mis de côté, ou sans couleur), de même.
  const surLaCarte = motsActifs(perso).map((m) => m.id);
  const autres = Object.keys(perso).filter((id) => !surLaCarte.includes(id) && motPerso(id, perso))
    .sort((a, b) => String(perso[a].createdAt || '').localeCompare(String(perso[b].createdAt || '')) || a.localeCompare(b));
  const ligne = (id) => html`<li class="ligne-definition" key=${id}>
    <${MotPerso} id=${id} mot=${perso[id]} utilise=${utilises.has(id)} ouvert=${ouvert === id} surOuvrir=${surOuvrir}
      surEffacer=${(i, libelle, surCarte) => setEffacer({ id: i, libelle, surCarte })} />
  </li>`;
  const confirmer = async () => {
    const { id } = effacer;
    setEffacer(null);
    try { await repo.motsPerso.effacer(id); } catch (e) { afficherToast(messageMot(e), null, 3500); }
  };
  return html`<section class="famille-definitions mes-mots" aria-labelledby="titre-mes-mots">
    <h2 class="libelle-section titre-famille-definitions" id="titre-mes-mots">Mes mots</h2>
    <p class="aide-carte">${surLaCarte.length + autres.length === 0
    ? 'Les mots que tu ajoutes depuis la loupe de l\'émotion du moment, « Ajouter mon mot ».'
    : 'Les mots que tu as ajoutés. Touche un mot pour changer son nom, sa couleur, sa famille ou sa définition.'}</p>
    ${surLaCarte.length > 0 && html`<ul class="liste carte carte-groupe" aria-label="Sur la carte">${surLaCarte.map(ligne)}</ul>`}
    ${autres.length > 0 && html`<h3 class="sous-titre-mes-mots" id="titre-mis-de-cote">Mis de côté</h3>
      <ul class="liste carte carte-groupe" aria-labelledby="titre-mis-de-cote">${autres.map(ligne)}</ul>`}
    ${effacer && html`<${Confirmation} titre=${`Effacer « ${effacer.libelle} » ?`}
      texte=${effacer.surCarte ? 'Aucun relevé ne s\'en sert. Il quitte la carte et la loupe.' : 'Aucun relevé ne s\'en sert.'}
      action="Effacer" surAnnuler=${() => setEffacer(null)} surConfirmer=${confirmer} />`}
  </section>`;
}

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
    const champ = document.getElementById(idFocus(ouvert));
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
    ${SECTIONS.map((f) => html`<section class="famille-definitions" aria-labelledby=${`titre-${f.cle}`}>
      <h2 class=${`libelle-section titre-famille-definitions ${f.classe}`} id=${`titre-${f.cle}`}><span class="point-famille" aria-hidden="true"></span>${f.libelle}</h2>
      <ul class="liste carte carte-groupe">
        ${f.mots.map((m) => {
          const corrigee = estCorrigee(m.id, corrections);
          return html`<li class="ligne-definition" key=${m.id}>
            ${ouvert === m.id
              ? html`<div class="champ-definition"><${ChampTexte} key=${`${m.id}-${tour}`} id=${idChamp(m.id)} etiquette=${m.libelle}
                  valeur=${definition(m.id, corrections)} cleBrouillon=${`carnet:brouillon:definition:${m.id}`}
                  surEnregistrer=${(texte) => ecrire(m.id, texte)} lignes=${2} dicter=${false} aLaSortie=${true} /></div>`
              : html`<button type="button" class="ligne-carte bouton-definition" onClick=${() => ouvrir(m.id)}>
                  <span class="mot-definitions">${m.libelle}</span>${' '}<span class="texte-definitions">${definition(m.id, corrections)}</span>
                </button>`}
            ${corrigee && html`<button type="button" class="btn-lien revenir-carnet" onClick=${() => revenir(m.id)}>Revenir au texte de Carnet</button>`}
          </li>`;
        })}
      </ul>
    </section>`)}
    <${MesMots} ouvert=${ouvert} surOuvrir=${ouvrir} />
  </main>`;
}
