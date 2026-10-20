// Humeur du moment (v4) : humeur 1-10 puis énergie, en deux touchers, quand on le veut.
// Le relevé est créé au premier toucher (date et heure réelles, ou l'heure de « C'était vers… ») ;
// une fois les deux choisis, l'écran se referme, sauf si « Ce que je faisais » est ouvert ou si la règle
// « Me ressourcer » joue : sous les choix, « Pour récupérer, je… » (domain/ressourcer.js).
// L'humeur du jour (v6) est la moyenne de ces relevés (analyse/humeur-jour.js).
import { html, useEffect, useReducer, useRef, useState } from '../lib.js';
import { repo } from '../../donnees.js';
import { useDonnees, useIndicateur, ecrireAvecEssais, lireLocal, ecrireLocal } from '../hooks.js';
import { cleLocale, heureLocale, heuresVers, versDateHeure, formaterVers } from '../../domain/dates.js';
import { nouvelId } from '../../domain/ids.js';
import { carteLibelles, libelle } from '../../domain/libelles.js';
import { minusculeInitiale } from '../../domain/phrase.js';
import { normaliserPlan } from '../../domain/mon-plan.js';
import { regleRessourcer } from '../../domain/ressourcer.js';
import { CadreParcours } from '../composants/parcours.js';
import { PastillesMultiples } from '../composants/multiples.js';
import { Pastilles } from '../composants/pastilles.js';
import { lirePlan } from '../composants/mon-plan.js';
import { PourRecuperer, lireRessourcer } from '../composants/ressourcer.js';
import { Repli } from '../composants/repli.js';
import { Segmente } from '../composants/segmente.js';
import { coche, libelleChoix } from '../composants/coche.js';
import { afficherToast } from '../composants/toast.js';
import { Icones } from '../icones.js';
import { options } from './aujourdhui.js';

const HUMEURS = Array.from({ length: 10 }, (_, i) => ({ valeur: i + 1, libelle: String(i + 1) }));
const DELAI_FERMETURE_MS = 250;
const CLE_FAISAIS = 'carnet:moment:faisais';
const CLE_VERS = 'carnet:moment:vers';
// Ce que l'écran porte : les valeurs du relevé, et son heure (null : maintenant, sinon { date, heure } de « vers »).
const NEUF = { humeur: null, energie: null, faisais: null, quand: null };

const complet = (r) => r.humeur != null && r.energie != null;
// Seul endroit qui décide si l'écran se ferme tout seul, humeur et énergie choisies : pas tant que
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

// « Maintenant ▾ » ouvre les heures déjà passées du jour logique ; avant 6 h il n'y en a pas, la ligne
// reste fixe. Choisir une heure laisse la liste ouverte (v6.1) : seul ce bouton l'ouvre et la ferme, et elle
// rouvre comme on l'a laissée, d'une ouverture de l'écran à l'autre.
function LigneQuand({ quand, heures, surChoix }) {
  const [ouvert, setOuvert] = useState(() => lireLocal(CLE_VERS, false) === true);
  const basculer = () => { const v = !ouvert; setOuvert(v); ecrireLocal(CLE_VERS, v); };
  if (heures.length === 0 && !quand) return html`<p class="ligne-date ligne-date-fixe">Maintenant</p>`;
  const choisie = quand ? Number(quand.heure.slice(0, 2)) : null;
  const choix = [{ h: null, texte: 'Maintenant' }, ...heures.map((h) => ({ h, texte: `${h} h` }))];
  return html`<div class="ligne-date">
    <button type="button" class="btn-lien" aria-expanded=${ouvert ? 'true' : 'false'} onClick=${basculer}>
      ${quand ? `C'était ${formaterVers(quand.heure)}` : 'Maintenant'}${Icones.chevronBas({ trait: 2 })}</button>
    ${ouvert && html`<div class="pastilles souples teinte-humeur choix-vers" role="group" aria-label="C'était vers…">
      ${choix.map(({ h, texte }) => html`<button type="button" class="pastille" aria-pressed=${h === choisie ? 'true' : 'false'}
        onClick=${() => surChoix(h)}>${coche()}${libelleChoix(texte)}</button>`)}
    </div>`}
  </div>`;
}

export function Moment() {
  const [releve, setReleve] = useState(NEUF);
  const [faisaisOuvert, setFaisaisOuvert] = useState(() => lireLocal(CLE_FAISAIS, false) === true);
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
    if (id) afficherToast('Humeur du moment notée', { libelle: 'Annuler', faire: () => repo.humeurs.supprimer(id) });
  };
  // Écrit en file. Le relevé est créé avec tout ce que porte l'écran (`etat`), dès qu'il y a une
  // humeur ou une énergie : des activités ou une heure seules ne créent rien. Ensuite on le modifie.
  const ecrire = (changements, etat) => {
    file.current = file.current.then(async () => {
      if (!idRef.current) {
        if (etat.humeur == null && etat.energie == null) return;
        const id = nouvelId('hu');
        const cree = await ecrireAvecEssais(() => repo.humeurs.creer({
          ...horaire(etat.quand, repo.maintenant()), humeur: etat.humeur, energie: etat.energie, faisais: etat.faisais,
        }, { id }), signaler);
        if (cree) idRef.current = cree.id;
        return;
      }
      const res = await ecrireAvecEssais(() => repo.humeurs.modifier(idRef.current, changements), signaler);
      if (res === null) idRef.current = null;
    }).catch(() => {});
    return file.current;
  };
  const choisir = (champ) => (v) => {
    const suivant = { ...releve, [champ]: v };
    setReleve(suivant);
    ecrire({ [champ]: v }, suivant);
    clearTimeout(fermeture.current);
    if (seFermeSeul(suivant, { faisaisOuvert, ressourcer: regle(suivant) })) fermeture.current = setTimeout(terminer, DELAI_FERMETURE_MS);
  };
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
  return html`<${CadreParcours} titre="Humeur du moment" teinte="humeur" surFermer=${() => (complet(releve) ? terminer() : fermer())}
    sousTitre=${html`<${LigneQuand} quand=${releve.quand} heures=${heuresVers(repo.maintenant())} surChoix=${choisirQuand} />`}>
    <div class="etape">
      <div><h2 class="titre-question">Humeur</h2><p class="sous-question">1 = au plus bas, 10 = au plus haut</p></div>
      <${Pastilles} etiquette="Humeur du moment" ariaPrefixe="Humeur" options=${HUMEURS} valeur=${releve.humeur} surChoix=${choisir('humeur')}
        colonnes=${5} classe="chiffres grille-choix" teinte="humeur" />
      <h2 class="titre-question">Énergie</h2>
      <${Segmente} etiquette="Énergie" options=${options(items, 'energie', releve.energie)} valeur=${releve.energie} surChoix=${choisir('energie')}
        classe="large energie" teinte="humeur" />
      ${regle(releve) && html`<${PourRecuperer} texte=${donnees.plan.pourRecuperer} />`}
      <${Repli} titre="Ce que je faisais" cleStockage=${CLE_FAISAIS} resume=${resumeFaisais(releve.faisais, carte)} surBascule=${basculerFaisais}>
        <${PastillesMultiples} etiquette="Ce que je faisais" options=${options(items, 'activiteMoment', releve.faisais)} valeurs=${releve.faisais}
          surChoix=${choisir('faisais')} teinte="humeur" />
      </${Repli}>
      ${jour.length > 0 && html`<section class="moments-du-jour" aria-label="Relevés d'aujourd'hui">
        <h3 class="libelle-section">Aujourd'hui</h3>
        <ul class="liste carte carte-groupe">${jour.map((h) => html`<li class="ligne-info">
          <span><span class="heure-moment">${h.vers ? formaterVers(h.heure) : h.heure || '·'}</span> humeur ${h.humeur ?? '·'}${h.energie ? ` · énergie ${libelle(carte, h.energie).toLowerCase()}` : ''}</span>
          <button type="button" class="effacer" aria-label=${`Supprimer le relevé ${h.vers ? formaterVers(h.heure) : `de ${h.heure || 'cette heure'}`}`} onClick=${() => supprimer(h)}>${Icones.fermer()}</button>
        </li>`)}</ul>
      </section>`}
    </div>
  </${CadreParcours}>`;
}
