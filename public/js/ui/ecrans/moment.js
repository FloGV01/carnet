// Émotion du moment (v7, spec §4.2 ; « Humeur du moment » de la v4 à la v6.1) : une émotion de la roue (une
// famille, puis un mot si on le trouve) et l'énergie, quand on le veut. La note de 1 à 10 n'est plus proposée ; les
// anciens relevés la gardent (« humeur 6 »). Le relevé est créé au premier toucher (date et heure réelles, ou
// l'heure de « C'était vers… ») ; une fois l'émotion (famille ou mot) et l'énergie choisies, l'écran se referme,
// sauf si « Ce que je faisais » est ouvert ou si la règle « Me ressourcer » joue : au-dessus des réponses,
// « Pour récupérer, je… » (domain/ressourcer.js). Les réponses sont dans un panneau collé en bas, près du pouce (2b).
import { html, useEffect, useReducer, useRef, useState } from '../lib.js';
import { repo } from '../../donnees.js';
import { useDonnees, useIndicateur, ecrireAvecEssais, lireLocal, ecrireLocal } from '../hooks.js';
import { cleLocale, heureLocale, heuresVers, versDateHeure, formaterVers } from '../../domain/dates.js';
import { nouvelId } from '../../domain/ids.js';
import { carteLibelles, libelle } from '../../domain/libelles.js';
import { minusculeInitiale } from '../../domain/phrase.js';
import { normaliserPlan } from '../../domain/mon-plan.js';
import { regleRessourcer } from '../../domain/ressourcer.js';
import { familleDe, libelleEmotion } from '../../domain/roue.js';
import { CadreParcours } from '../composants/parcours.js';
import { Bulles } from '../composants/bulles.js';
import { PastillesMultiples } from '../composants/multiples.js';
import { lirePlan } from '../composants/mon-plan.js';
import { PourRecuperer, lireRessourcer } from '../composants/ressourcer.js';
import { Repli } from '../composants/repli.js';
import { Segmente } from '../composants/segmente.js';
import { coche, libelleChoix } from '../composants/coche.js';
import { afficherToast } from '../composants/toast.js';
import { Icones } from '../icones.js';
import { options } from './aujourdhui.js';

const DELAI_FERMETURE_MS = 250;
const CLE_FAISAIS = 'carnet:moment:faisais';
const CLE_VERS = 'carnet:moment:vers';
const NOTEE = 'Émotion du moment notée';
// Ce que l'écran porte : les valeurs du relevé, et son heure (null : maintenant, sinon { date, heure } de « vers »).
const NEUF = { emotion: null, energie: null, faisais: null, quand: null };

const complet = (r) => r.emotion != null && r.energie != null;
// Seul endroit qui décide si l'écran se ferme tout seul, émotion et énergie choisies : pas tant que
// « Ce que je faisais » est ouvert, ni quand la règle « Me ressourcer » affiche la liste. Toute autre
// raison de le garder ouvert s'ajoute ici.
const seFermeSeul = (r, { faisaisOuvert, ressourcer }) => complet(r) && !faisaisOuvert && !ressourcer;

// Date, heure et « vers » d'un relevé : l'heure réelle, ou l'heure choisie dans « C'était vers… ».
const horaire = (quand, maintenant) => (quand
  ? { ...quand, vers: true }
  : { date: cleLocale(maintenant), heure: heureLocale(maintenant), vers: null });
const cleQuand = (quand) => (quand ? `${quand.date} ${quand.heure}` : '');

// « Ce que je faisais » replié : « travail, trajet ».
const resumeFaisais = (ids, carte) => (ids || []).map((id) => minusculeInitiale(libelle(carte, id))).join(', ');

// Un relevé du jour : « Irrité · énergie moyenne » ; un ancien relevé garde sa note, « humeur 6 · énergie basse ».
// Sans émotion, note ni énergie : « ce que je faisais : travail ».
function texteReleve(h, carte) {
  const texte = [libelleEmotion(h.emotion), h.humeur != null && `humeur ${h.humeur}`,
    h.energie && `énergie ${minusculeInitiale(libelle(carte, h.energie))}`].filter(Boolean).join(' · ');
  if (texte) return texte;
  const faisais = resumeFaisais(h.faisais, carte);
  return faisais ? `ce que je faisais : ${faisais}` : '·';
}

// « Maintenant ▾ », en haut à droite, ouvre les heures déjà passées du jour logique ; avant 6 h il n'y en a pas, la
// puce reste fixe. Choisir une heure laisse la liste ouverte (v6.1) : seule la puce l'ouvre et la ferme, et elle
// rouvre comme on l'a laissée, d'une ouverture de l'écran à l'autre.
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
  const [releve, setReleve] = useState(NEUF);
  const [faisaisOuvert, setFaisaisOuvert] = useState(() => lireLocal(CLE_FAISAIS, false) === true);
  const [versOuvert, setVersOuvert] = useState(() => lireLocal(CLE_VERS, false) === true);
  const [, signaler] = useIndicateur();
  const [, rafraichir] = useReducer((n) => n + 1, 0);
  const idRef = useRef(null);
  const file = useRef(Promise.resolve());
  const fermeture = useRef(null);
  const aujourdhui = repo.aujourdhui();
  const { donnees } = useDonnees(async () => {
    // Le réglage et le plan de la règle : une lecture qui échoue donne leurs valeurs par défaut (règle éteinte).
    const [items, jour, reglage, plan] = await Promise.all([
      repo.listes.items(), repo.humeurs.parJour(aujourdhui, aujourdhui), lireRessourcer(), lirePlan().catch(() => normaliserPlan(null)),
    ]);
    return { items, carte: carteLibelles(items), jour, reglage, plan };
  }, [aujourdhui]);
  useEffect(() => () => clearTimeout(fermeture.current), []);

  const fermer = () => { clearTimeout(fermeture.current); location.hash = '#/aujourdhui'; };
  // La règle « Me ressourcer » pour ce que porte l'écran : un relevé noté maintenant (pas « vers »), avec son énergie.
  const regle = (r) => Boolean(donnees) && regleRessourcer({
    reglage: donnees.reglage, releve: { vers: r.quand ? true : null, energie: r.energie }, plan: donnees.plan,
  });
  // Referme l'écran en disant que le relevé est noté (avec « Annuler »). La fermeture automatique en attente
  // est annulée tout de suite : ✕ touché pendant ses 250 ms ne doit pas noter le relevé deux fois.
  const terminer = async () => {
    clearTimeout(fermeture.current);
    await file.current;
    const id = idRef.current;
    fermer();
    if (id) afficherToast(NOTEE, { libelle: 'Annuler', faire: () => repo.humeurs.supprimer(id) });
  };
  // Écrit en file. Le relevé est créé avec tout ce que porte l'écran (`etat`), dès qu'il y a une
  // émotion ou une énergie : des activités ou une heure seules ne créent rien. Ensuite on le modifie.
  // Chaque état est écrit tel quel (famille, mot, de nouveau la famille…) ; un relevé qui n'a plus rien est supprimé.
  const ecrire = (changements, etat) => {
    file.current = file.current.then(async () => {
      if (!idRef.current) {
        if (etat.emotion == null && etat.energie == null) return;
        const id = nouvelId('hu');
        const cree = await ecrireAvecEssais(() => repo.humeurs.creer({
          ...horaire(etat.quand, repo.maintenant()), emotion: etat.emotion, energie: etat.energie, faisais: etat.faisais,
        }, { id }), signaler);
        if (cree) idRef.current = cree.id;
        return;
      }
      const res = await ecrireAvecEssais(() => repo.humeurs.modifier(idRef.current, changements), signaler);
      if (res === null) idRef.current = null;
    }).catch(() => {});
    return file.current;
  };
  // `fermable` : ce toucher peut refermer l'écran. Une famille touchée montre ses mots : l'écran attend le mot (ou
  // l'énergie), même si l'énergie est déjà choisie ; retoucher le mot choisi (retour à la famille) corrige, sans fermer.
  const choisir = (champ, fermable = true) => (v) => {
    const suivant = { ...releve, [champ]: v };
    setReleve(suivant);
    ecrire({ [champ]: v }, suivant);
    clearTimeout(fermeture.current);
    if (fermable && seFermeSeul(suivant, { faisaisOuvert, ressourcer: regle(suivant) })) fermeture.current = setTimeout(terminer, DELAI_FERMETURE_MS);
  };
  const choisirEmotion = (id, { mot }) => choisir('emotion', mot)(id);
  const basculerVers = () => { const v = !versOuvert; setVersOuvert(v); ecrireLocal(CLE_VERS, v); };
  // Une heure de « vers » (ou « Maintenant ») : sans relevé encore, rien n'est écrit, l'heure reste à
  // l'écran et sera posée à la création ; avec un relevé, il change d'heure. La liste a pu s'ouvrir avant 4 h et
  // se toucher après : une heure qui n'est plus proposée est celle du jour d'avant, elle est ignorée (sinon elle
  // tomberait sur le nouveau jour) et la liste, restée ouverte, se rafraîchit.
  const choisirQuand = (h) => {
    const maintenant = repo.maintenant();
    if (h != null && !heuresVers(maintenant).includes(h)) { rafraichir(); return; }
    const quand = h == null ? null : versDateHeure(maintenant, h);
    if (cleQuand(quand) === cleQuand(releve.quand)) return;
    const suivant = { ...releve, quand };
    setReleve(suivant);
    ecrire(horaire(quand, maintenant), suivant);
  };
  const basculerFaisais = (ouvert) => {
    setFaisaisOuvert(ouvert);
    if (ouvert) clearTimeout(fermeture.current);
  };
  const supprimer = async (h) => {
    const sauve = await repo.humeurs.supprimer(h.id);
    if (h.id === idRef.current) { idRef.current = null; setReleve(NEUF); }
    afficherToast('Relevé supprimé', { libelle: 'Annuler', faire: () => repo.humeurs.restaurer(sauve) });
  };

  if (!donnees) return html`<div class="parcours"></div>`;
  const { items, carte, jour } = donnees;
  const heures = heuresVers(repo.maintenant());
  const panneau = html`
    <${Bulles} valeur=${releve.emotion} surChoix=${choisirEmotion} />
    <div class="bloc-reponse">
      <h2 class="titre-reponse">Énergie</h2>
      <${Segmente} etiquette="Énergie" options=${options(items, 'energie', releve.energie)} valeur=${releve.energie} surChoix=${choisir('energie')}
        classe="large energie" teinte="humeur" />
    </div>`;
  return html`<${CadreParcours} titre="Émotion du moment" teinte="humeur" icone="emotion" surFermer=${() => (complet(releve) ? terminer() : fermer())}
    droite=${html`<${PuceQuand} quand=${releve.quand} heures=${heures} ouvert=${versOuvert} surBascule=${basculerVers} />`}
    sousTitre=${versOuvert && (heures.length > 0 || releve.quand) && html`<${ListeVers} quand=${releve.quand} heures=${heures} surChoix=${choisirQuand} />`}
    panneau=${panneau}>
    <div class="moment-corps">
      <${Repli} titre="Ce que je faisais" icone="ceQueJeFaisais" cleStockage=${CLE_FAISAIS} resume=${resumeFaisais(releve.faisais, carte)} surBascule=${basculerFaisais}>
        <${PastillesMultiples} etiquette="Ce que je faisais" options=${options(items, 'activiteMoment', releve.faisais)} valeurs=${releve.faisais}
          surChoix=${choisir('faisais')} teinte="humeur" />
      </${Repli}>
      ${jour.length > 0 && html`<section class="moments-du-jour" aria-label="Relevés d'aujourd'hui">
        <h3 class="libelle-section">Aujourd'hui</h3>
        <ul class="liste carte carte-groupe">${jour.map((h) => {
          const famille = familleDe(h.emotion);
          return html`<li class="ligne-releve">
            <span class="heure-moment">${h.vers ? formaterVers(h.heure) : h.heure || '·'}</span> <span class=${famille ? `point-releve-moment emo-${famille}` : 'point-releve-moment point-creux'} aria-hidden="true"></span> <span class="texte-releve">${texteReleve(h, carte)}</span>
            <button type="button" class="effacer" aria-label=${`Supprimer le relevé ${h.vers ? formaterVers(h.heure) : `de ${h.heure || 'cette heure'}`}`} onClick=${() => supprimer(h)}>${Icones.fermer()}</button>
          </li>`;
        })}</ul>
      </section>`}
      ${regle(releve) && html`<${PourRecuperer} texte=${donnees.plan.pourRecuperer} />`}
    </div>
  </${CadreParcours}>`;
}
