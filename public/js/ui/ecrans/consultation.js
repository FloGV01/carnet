// « En consultation » : le rendez-vous en plein écran, à garder sous les yeux pendant l'échange.
// Chiffres des 30 derniers jours, questions en grand, compte rendu, prochaine étape, mémo.
// Tout est enregistré au fil des touchers : Fermer et Terminer ferment simplement.
import { html } from '../lib.js';
import { CadreParcours } from '../composants/parcours.js';
import { ChampTexte } from '../composants/texte.js';
import { MemoVocal } from '../composants/memo-vocal.js';
import { QuestionsACocher, AjoutQuestion } from '../composants/questions.js';
import { repo } from '../../donnees.js';
import { etatApp } from '../../store.js';
import { useDonnees } from '../hooks.js';
import { useFiche } from '../fiche.js';
import { addDays } from '../../domain/dates.js';
import { carteLibelles, libelle } from '../../domain/libelles.js';
import { indicateurs } from '../../analyse/fenetres.js';
import { nomRdv, quandRdv } from './soins.js';

const decimale = (x) => x.toFixed(1).replace('.', ',');

function revenir() {
  const precedente = etatApp.lire().routePrecedente;
  location.hash = precedente && /^#\/(soins|rdv\/)/.test(precedente) ? precedente : '#/soins';
}

export function Consultation({ id: idRoute }) {
  const { fiche, id, ecrire, assurer } = useFiche({ store: 'rdv', route: 'rdv', idRoute, retour: '#/soins', initiale: () => ({}) });
  const { donnees } = useDonnees(async () => {
    const [journal, episodes, symptomes, items] = await Promise.all([repo.journal.tous(), repo.episodes.tous(), repo.symptomes.tous(), repo.listes.items()]);
    const au = repo.aujourdhui();
    return { ind: indicateurs({ journal, episodes, symptomes }, addDays(au, -29), au), carte: carteLibelles(items) };
  }, []);
  if (!fiche || !donnees) return html`<div class="parcours"></div>`;
  const { ind, carte } = donnees;
  const questions = fiche.questions || [];
  const majQuestions = (q) => ecrire({ questions: q.length ? q : null });
  const cellules = [
    { libelle: 'Humeur moyenne', valeur: ind.humeur.n ? decimale(ind.humeur.moyenne) : null, teinte: 'humeur' },
    { libelle: `Nuits ${libelle(carte, 'sommeil:mal')}`, valeur: ind.nuits.n ? String(ind.nuits.mal) : null, teinte: 'sommeil' },
    { libelle: 'Explosions', valeur: ind.explosions.n ? String(ind.explosions.total) : null, teinte: 'expl' },
    { libelle: 'Épisodes', valeur: String(ind.episodes.nombre), teinte: 'ep' },
  ];
  return html`<${CadreParcours} titre="En consultation" teinte="trt" sansPoint=${true} surFermer=${revenir}
    pied=${html`<button type="button" class="btn btn-plein terminer" onClick=${revenir}>Terminer</button>`}>
    <div class="consultation">
      <div class="identite">
        <h1 class="titre-consultation">${nomRdv(fiche, carte)}</h1>
        <span class="quand-consultation">${quandRdv(fiche)}</span>
      </div>
      <section class="carte chiffres-consultation" aria-label="30 derniers jours">
        <span class="legende-chiffres">30 derniers jours</span>
        <div class="grille-chiffres">${cellules.map((c) => html`<div class="cellule-chiffre">
          <span class=${c.valeur == null ? 'valeur-chiffre vide-chiffre' : `valeur-chiffre teinte-${c.teinte}`}>${c.valeur ?? '·'}</span>
          <span class="libelle-chiffre">${c.libelle}</span></div>`)}</div>
      </section>
      <section class="bloc-consultation">
        <h2 class="titre-carte">Mes questions</h2>
        <${QuestionsACocher} questions=${questions} surChanger=${majQuestions} grand=${true} />
        <${AjoutQuestion} surAjouter=${(t) => majQuestions([...(fiche.questions || []), { texte: t, abordee: false }])} />
      </section>
      <${ChampTexte} id="consultation-compte-rendu" etiquette="Ce qui a été dit / décidé" icone="note" valeur=${fiche.compteRendu} lignes=${4}
        cleBrouillon=${id ? `carnet:brouillon:${id}:compteRendu` : null} surEnregistrer=${(v) => ecrire({ compteRendu: v })} />
      <${ChampTexte} id="consultation-prochaine-etape" etiquette="Prochaine étape" icone="etape" valeur=${fiche.prochaineEtape} lignes=${2}
        cleBrouillon=${id ? `carnet:brouillon:${id}:prochaineEtape` : null} surEnregistrer=${(v) => ecrire({ prochaineEtape: v })} />
      <${MemoVocal} parentStore="rdv" parentId=${id} assurerParent=${assurer} />
    </div>
  </${CadreParcours}>`;
}
