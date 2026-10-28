// Émotion du moment (v9, spec §4 et §7 ; v8 : la carte dans un panneau, v7 : la roue en familles, « Humeur du moment »
// de la v4 à la v6.1) : comme How We Feel, en plein écran, sur fond noir dans les deux thèmes, sans barre d'onglets ni
// en-tête de Carnet.
// - Écran 1 : ✕, le titre, les quatre bulles (ui/composants/quatre-bulles.js) et, dessous, « Maintenant ▾ », qui ouvre
//   les heures de « C'était vers… » (heuresVers). Toucher une bulle n'écrit rien : il ouvre la carte, sur sa zone.
// - Écran 2 : la carte (ui/composants/carte-emotions.js), ← vers l'écran 1. Toucher un mot écrit le relevé tout de suite
//   (le mot, et l'énergie de sa case, energieDe) et montre la carte du bas (ui/composants/carte-du-bas.js) : le mot, sa
//   définition, et la flèche « Continuer ». Un autre mot le remplace, énergie comprise. Retoucher le mot choisi l'efface,
//   énergie comprise, et le relevé part s'il ne reste rien : une heure « vers » le garde (spec §13.5).
// - La flèche ferme l'écran, comme ✕ : « Émotion du moment notée » (avec Annuler) s'il y a un relevé. L'écran 3, « Ce que
//   je faisais », arrive à la tâche 5 du plan v9 ; il n'y a plus de fermeture automatique, ni d'appui long.
// Le relevé est créé au premier mot (date et heure réelles, ou l'heure de « C'était vers… »), puis modifié : revenir à
// l'écran 1 ou fermer le garde. Chaque ouverture de l'écran part d'un relevé neuf, la liste des heures repliée.
// Après chaque changement de vue, et après chaque mot choisi, une garde de 350 ms : les boutons de l'écran ignorent les
// touchers et sont aria-disabled. Un second toucher rapide tomberait sur un mot jamais vu (point de vigilance 5) ou, la
// carte glissant jusqu'au mot choisi, sur un autre mot que celui qu'on vient de toucher, qui le remplacerait.
import { html, useEffect, useMemo, useReducer, useRef, useState } from '../lib.js';
import { repo } from '../../donnees.js';
import { useDonnees, useIndicateur, ecrireAvecEssais } from '../hooks.js';
import { cleLocale, heureLocale, heuresVers, versDateHeure, formaterVers } from '../../domain/dates.js';
import { nouvelId } from '../../domain/ids.js';
import { motsDeLaCarte, energieDe } from '../../domain/carte-roue.js';
import { definition } from '../../domain/definitions-roue.js';
import { usePleinEcran } from '../composants/parcours.js';
import { QuatreBulles } from '../composants/quatre-bulles.js';
import { CarteEmotions, motsColores } from '../composants/carte-emotions.js';
import { CarteDuBas } from '../composants/carte-du-bas.js';
import { coche, libelleChoix } from '../composants/coche.js';
import { afficherToast } from '../composants/toast.js';
import { Icones } from '../icones.js';

const GARDE_MS = 350;
const NOTEE = 'Émotion du moment notée';
const TITRE = 'Touche la couleur la plus proche de ce moment';
// Ce que l'écran porte : le mot, son énergie, et l'heure (null : maintenant, sinon { date, heure } de « vers »).
const NEUF = { emotion: null, energie: null, quand: null };

// Date, heure et « vers » d'un relevé : l'heure réelle, ou l'heure choisie dans « C'était vers… ».
const horaire = (quand, maintenant) => (quand
  ? { ...quand, vers: true }
  : { date: cleLocale(maintenant), heure: heureLocale(maintenant), vers: null });
const cleQuand = (quand) => (quand ? `${quand.date} ${quand.heure}` : '');

// Les icônes des boutons en verre (visuel §1.2 et §2.9) : la croix et la flèche retour, au trait fin.
const CROIX = html`<svg width="19" height="19" viewBox="0 0 19 19" fill="none" stroke="currentColor" stroke-width="1.6"
  stroke-linecap="round" aria-hidden="true"><path d="M3 3l13 13M16 3L3 16" /></svg>`;
const RETOUR = html`<svg width="21" height="21" viewBox="0 0 21 21" fill="none" stroke="currentColor" stroke-width="1.6"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 10.5H3M9.5 4l-6.5 6.5 6.5 6.5" /></svg>`;

// « Maintenant ▾ », sous les bulles, ouvre les heures déjà passées du jour logique ; avant 6 h il n'y en a pas, il
// reste un texte. Choisir une heure laisse la liste ouverte (v6.1) : seul ce bouton l'ouvre et la ferme.
function PuceQuand({ quand, heures, ouvert, surBascule }) {
  if (heures.length === 0 && !quand) return html`<p class="ligne-date ligne-date-fixe puce-quand">Maintenant</p>`;
  return html`<div class="ligne-date puce-quand">
    <button type="button" class="btn-lien" aria-expanded=${ouvert ? 'true' : 'false'} onClick=${surBascule}>
      ${quand ? `C'était ${formaterVers(quand.heure)}` : 'Maintenant'}${Icones.chevronBas({ trait: 2 })}</button>
  </div>`;
}

function ListeVers({ quand, heures, surChoix }) {
  const choisie = quand ? Number(quand.heure.slice(0, 2)) : null;
  const choix = [{ h: null, texte: 'Maintenant' }, ...heures.map((h) => ({ h, texte: `${h} h` }))];
  return html`<div class="pastilles souples teinte-humeur choix-vers" role="group" aria-label="C'était vers…">
    ${choix.map(({ h, texte }) => html`<button type="button" class="pastille" aria-pressed=${h === choisie ? 'true' : 'false'}
      onClick=${() => surChoix(h)}>${coche()}${libelleChoix(texte)}</button>`)}
  </div>`;
}

export function Moment() {
  usePleinEcran();
  // La vue : les bulles, ou la carte (`zone` : la bulle touchée).
  const [vue, setVue] = useState({ nom: 'bulles', zone: null });
  const [releve, setReleve] = useState(NEUF);
  const [versOuvert, setVersOuvert] = useState(false);
  const [enGarde, setEnGarde] = useState(false);
  const [, signaler] = useIndicateur();
  const [, rafraichir] = useReducer((n) => n + 1, 0);
  const idRef = useRef(null);
  const file = useRef(Promise.resolve());
  const garde = useRef(null);
  const titre = useRef(null);
  const aFocaliser = useRef(false);
  const ferme = useRef(false);
  const { donnees } = useDonnees(async () => {
    // Les définitions corrigées (méta `definitionsRoue`) et les mots à soi (méta `motsPerso`) : une lecture qui échoue
    // donne le texte de Carnet et aucun mot à soi.
    const [corrections, perso] = await Promise.all([
      repo.meta.lire('definitionsRoue').catch(() => null), repo.meta.lire('motsPerso').catch(() => null),
    ]);
    return { corrections, perso };
  }, [], { suivre: false });
  const perso = donnees ? donnees.perso : null;
  const mots = useMemo(() => motsColores(motsDeLaCarte(perso)), [perso]);
  useEffect(() => () => clearTimeout(garde.current), []);
  // Revenu à l'écran 1, le focus va au titre.
  useEffect(() => {
    if (!aFocaliser.current) return;
    aFocaliser.current = false;
    if (vue.nom === 'bulles' && titre.current) titre.current.focus({ preventScroll: true });
  }, [vue]);

  const poserGarde = () => {
    clearTimeout(garde.current);
    setEnGarde(true);
    garde.current = setTimeout(() => setEnGarde(false), GARDE_MS);
  };
  const changerDeVue = (suivante) => {
    poserGarde();
    aFocaliser.current = true;
    setVue(suivante);
  };
  // Ferme l'écran, l'écriture en cours finie, en disant que le relevé est noté (avec « Annuler »), s'il y en a un. Une
  // seule fois : un second toucher pendant l'écriture ne dit rien de plus.
  const terminer = async () => {
    if (ferme.current) return;
    ferme.current = true;
    await file.current;
    const id = idRef.current;
    location.hash = '#/aujourdhui';
    if (id) afficherToast(NOTEE, { libelle: 'Annuler', faire: () => repo.humeurs.supprimer(id) });
  };
  // Écrit en file. Le relevé est créé au premier mot, avec tout ce que porte l'écran (`etat`) ; ensuite on le modifie.
  // Chaque état est écrit tel quel (un mot, un autre, plus de mot…) ; un relevé qui n'a plus rien est supprimé.
  const ecrire = (changements, etat) => {
    file.current = file.current.then(async () => {
      if (!idRef.current) {
        if (etat.emotion == null) return;
        const id = nouvelId('hu');
        const cree = await ecrireAvecEssais(() => repo.humeurs.creer({
          ...horaire(etat.quand, repo.maintenant()), emotion: etat.emotion, energie: etat.energie,
        }, { id }), signaler);
        if (cree) idRef.current = cree.id;
        return;
      }
      const res = await ecrireAvecEssais(() => repo.humeurs.modifier(idRef.current, changements), signaler);
      if (res === null) idRef.current = null;
    }).catch(() => {});
    return file.current;
  };
  // Un mot : il est écrit avec l'énergie de sa case (spec §7), et la garde se pose, la carte glissant jusqu'à lui. Le mot
  // déjà choisi : il s'efface, et son énergie avec ; rien ne bouge sous le doigt, pas de garde.
  const choisirMot = (id) => {
    const efface = releve.emotion === id;
    if (!efface) poserGarde();
    const champs = efface ? { emotion: null, energie: null } : { emotion: id, energie: energieDe(id, perso) };
    const suivant = { ...releve, ...champs };
    setReleve(suivant);
    ecrire(champs, suivant);
  };
  // Une heure de « vers » (ou « Maintenant ») : sans relevé encore, rien n'est écrit, l'heure reste à l'écran et sera
  // posée à la création ; avec un relevé, il change d'heure. La liste a pu s'ouvrir avant 4 h et se toucher après : une
  // heure qui n'est plus proposée est celle du jour d'avant, elle est ignorée (sinon elle tomberait sur le nouveau jour)
  // et la liste, restée ouverte, se rafraîchit.
  const choisirQuand = (h) => {
    const maintenant = repo.maintenant();
    if (h != null && !heuresVers(maintenant).includes(h)) { rafraichir(); return; }
    const quand = h == null ? null : versDateHeure(maintenant, h);
    if (cleQuand(quand) === cleQuand(releve.quand)) return;
    const suivant = { ...releve, quand };
    setReleve(suivant);
    ecrire(horaire(quand, maintenant), suivant);
  };

  // ✕ est à la place de ← : un second toucher rapide sur ←, revenu aux bulles, ne ferme pas l'écran (la garde).
  const fermer = html`<button type="button" class="verre gauche" aria-label="Fermer" aria-disabled=${enGarde ? 'true' : null}
    onClick=${() => { if (!enGarde) terminer(); }}>${CROIX}</button>`;
  let ecran;
  if (vue.nom === 'bulles') {
    const heures = heuresVers(repo.maintenant());
    ecran = html`<div class="ecran-bulles" key="bulles">
      ${fermer}
      <h1 class="titre-bulles" ref=${titre} tabindex="-1">${TITRE}</h1>
      <span class="espace-bulles" aria-hidden="true"></span>
      <${QuatreBulles} etiquette=${TITRE} enGarde=${enGarde} surZone=${(zone) => changerDeVue({ nom: 'carte', zone })} />
      <${PuceQuand} quand=${releve.quand} heures=${heures} ouvert=${versOuvert} surBascule=${() => setVersOuvert(!versOuvert)} />
      ${versOuvert && (heures.length > 0 || releve.quand) && html`<${ListeVers} quand=${releve.quand} heures=${heures} surChoix=${choisirQuand} />`}
    </div>`;
  } else {
    const choisi = releve.emotion && mots.find((m) => m.id === releve.emotion);
    // ← vient avant la carte, comme à l'écran : VoiceOver et le clavier l'atteignent avant les 144 mots. Il reste
    // au-dessus des bulles par son z-index (.verre).
    ecran = html`<div class="ecran-carte" key="carte">
      <button type="button" class="verre gauche" aria-label="Revenir au choix de la couleur" aria-disabled=${enGarde ? 'true' : null}
        onClick=${() => { if (!enGarde) changerDeVue({ nom: 'bulles', zone: null }); }}>${RETOUR}</button>
      ${donnees && html`<${CarteEmotions} mots=${mots} choisi=${releve.emotion} centre=${vue.zone} enGarde=${enGarde} surMot=${choisirMot} />`}
      <div class="carte-fondu" aria-hidden="true"></div>
      <${CarteDuBas} mot=${choisi || null} definition=${choisi ? definition(choisi.id, donnees && donnees.corrections, perso) : null}
        enGarde=${enGarde} surContinuer=${terminer} />
    </div>`;
  }
  return html`<div class="moment-plein ecran-noir" role="dialog" aria-modal="true" aria-label="Émotion du moment">${ecran}</div>`;
}
