// « Voir » (v6) : la fiche liée à une question, en lecture seule, par-dessus « En consultation », sans navigation
// (modèle FeuillePlan). Récapitulatif et textes, rien ne s'y écrit. Fermer ramène à la consultation.
import { html, useEffect, useState } from '../lib.js';
import { repo } from '../../donnees.js';
import { carteLibelles, libelle } from '../../domain/libelles.js';
import { formaterJour, jourEvenement } from '../../domain/dates.js';
import { ETAPES_EPISODE, TEXTES_EPISODE } from '../ecrans/episode.js';
import { ETAPES_SYMPTOME, TEXTES_SYMPTOME } from '../ecrans/symptome.js';
import { resumeApresCoup } from '../ecrans/parcours-fiche.js';
import { Feuille } from './feuille.js';

const TITRES = { episodes: 'Épisode', symptomes: 'Symptôme', traitements: 'Traitement' };

// Les lignes du récapitulatif, dans l'ordre de la fiche : un choix vide s'écrit « · », un texte vide est omis.
function lignes(store, e, carte) {
  const lib = (v) => (Array.isArray(v) ? v.map((x) => libelle(carte, x)).join(', ') : libelle(carte, v));
  const choix = (etapes) => etapes.map((et) => ({ nom: et.recap, valeur: e[et.champ] == null ? null : et.type === 'intensite' ? String(e[et.champ]) : lib(e[et.champ]) }));
  const textes = (defs) => defs.filter((t) => e[t.champ]).map((t) => ({ nom: t.etiquette, valeur: e[t.champ], texte: true }));
  if (store === 'episodes') {
    const apresCoup = resumeApresCoup(e.apresCoup, carte);
    return [...choix(ETAPES_EPISODE), ...textes(TEXTES_EPISODE), ...(apresCoup ? [{ nom: 'Après coup · TCC', valeur: apresCoup }] : [])];
  }
  if (store === 'symptomes') return [...choix(ETAPES_SYMPTOME), ...textes(TEXTES_SYMPTOME)];
  return [
    ...textes([{ champ: 'changement', etiquette: 'Changement / ajustement' }]),
    { nom: 'Effets secondaires', valeur: e.effetsSecondaires && e.effetsSecondaires.length ? lib(e.effetsSecondaires) : null },
    { nom: 'Effet ressenti', valeur: e.effetRessenti ? lib(e.effetRessenti) : null },
    ...textes([{ champ: 'notes', etiquette: 'Notes' }]),
  ];
}

export function FeuilleElement({ lien, surFermer, retourFocus }) {
  const [lu, setLu] = useState(null);
  useEffect(() => {
    Promise.all([repo[lien.store].lire(lien.id), repo.listes.items()]).then(([element, items]) => setLu({ element, carte: carteLibelles(items) }));
  }, []);
  const e = lu && lu.element;
  const quand = e && (e.heure ? `${formaterJour(jourEvenement(e.date, e.heure))} · ${e.heure}` : formaterJour(e.date));
  return html`<${Feuille} titre=${TITRES[lien.store]} idTitre="titre-feuille-element" surFermer=${surFermer} retourFocus=${retourFocus}>
    ${lu && !e && html`<p class="texte-secondaire">Cette fiche a été supprimée.</p>`}
    ${e && html`<p class="quand-lecture">${quand}</p>
      <dl class="recap-lecture">${lignes(lien.store, e, lu.carte).map((l) => html`<div class=${l.texte ? 'ligne-lecture texte' : 'ligne-lecture'}>
        <dt>${l.nom}</dt><dd class=${l.valeur == null ? 'discret' : null}>${l.valeur ?? '·'}</dd></div>`)}</dl>`}
  </${Feuille}>`;
}
