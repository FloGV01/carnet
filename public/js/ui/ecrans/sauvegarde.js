// Réglages › Importer une sauvegarde : aperçu, perte chiffrée, puis remplacement (jamais de fusion).
import { html, useRef, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { repo } from '../../donnees.js';
import { remplacer } from '../../db/sauvegarde.js';
import { formaterJour } from '../../domain/dates.js';
import { afficherToast } from '../composants/toast.js';
import { useSauvegarde, analyserChoix, lireImportEnAttente, oublierImport } from '../sauvegarde.js';
import { dateIso } from './reglages.js';
import { reinitialiserHistorique } from './historique.js';
import { oublierLectures } from '../lecture.js';

const pluriel = (n, un, plusieurs) => `${n} ${n > 1 ? plusieurs : un}`;
const enumerer = (m) => (m.length > 1 ? `${m.slice(0, -1).join(', ')} et ${m[m.length - 1]}` : m[0]);

function phraseContenu(r) {
  const morceaux = [pluriel(r.journees, 'journée', 'journées'), pluriel(r.episodes, 'épisode', 'épisodes')];
  if (r.symptomes) morceaux.push(pluriel(r.symptomes, 'symptôme', 'symptômes'));
  if (r.traitements) morceaux.push(pluriel(r.traitements, 'fiche de traitement', 'fiches de traitement'));
  if (r.rdv) morceaux.push(pluriel(r.rdv, 'rendez-vous', 'rendez-vous'));
  if (r.humeurs) morceaux.push(pluriel(r.humeurs, "relevé d'émotion du moment", "relevés d'émotion du moment"));
  if (r.notes) morceaux.push(pluriel(r.notes, 'note', 'notes'));
  if (r.seances) morceaux.push(pluriel(r.seances, 'séance de Bien-être', 'séances de Bien-être'));
  if (r.memos) morceaux.push(pluriel(r.memos, 'mémo vocal', 'mémos vocaux'));
  const periode = r.du ? ` (du ${formaterJour(r.du, { annee: true })} au ${formaterJour(r.au, { annee: true })})` : '';
  return `Ce fichier contient ${morceaux.join(', ')}${periode}.`;
}
// « 12 journées et 3 épisodes présents ici et absents du fichier seront effacés. » Accord au
// féminin seulement si tout ce qui est nommé est féminin (« 2 notes présentes… effacées »).
const NOMS_PERTE = [
  ['journal', 'journée', 'journées', true], ['episodes', 'épisode', 'épisodes'], ['symptomes', 'symptôme', 'symptômes'],
  ['traitements', 'fiche de traitement', 'fiches de traitement', true], ['rdv', 'rendez-vous', 'rendez-vous'],
  ['humeurs', "relevé d'émotion du moment", "relevés d'émotion du moment"], ['notes', 'note', 'notes', true],
  ['seances', 'séance de Bien-être', 'séances de Bien-être', true], ['audios', 'mémo vocal', 'mémos vocaux'],
];
export function phrasePerte(p) {
  const nommes = NOMS_PERTE.filter(([cle]) => p[cle]);
  if (!nommes.length) return null;
  const m = nommes.map(([cle, un, plusieurs]) => pluriel(p[cle], un, plusieurs));
  const feminin = nommes.every(([, , , f]) => f);
  const auPluriel = Object.values(p).reduce((n, x) => n + (Number(x) || 0), 0) > 1;
  const accord = (mot) => `${mot}${feminin ? 'e' : ''}${auPluriel ? 's' : ''}`;
  return `${enumerer(m)} ${accord('présent')} ici et ${accord('absent')} du fichier ${auPluriel ? 'seront' : 'sera'} ${accord('effacé')}.`;
}

// « Mon plan et les réglages du soir et des rappels seront remplacés par ce que contient le fichier. »
const NOMS_META = {
  monPlan: 'Mon plan', journee: 'les réglages du soir et des rappels', traitementActuel: 'ton traitement actuel',
  reglages: 'les réglages de l\'analyse', prenomSoignants: 'le prénom pour la vue soignants',
  respiration: 'les réglages de la respiration', uneChoseALaFois: 'les réglages de « Une chose à la fois »',
  ressourcer: 'les réglages de « Me ressourcer »', definitionsRoue: 'les définitions des émotions',
  motsPerso: 'les mots ajoutés à la carte des émotions', favorisBienEtre: 'les exercices épinglés',
};
// Accord au féminin seulement si tout ce qui est nommé est féminin, comme pour la perte.
const META_FEMININES = new Set(['definitionsRoue']);
export function phraseMeta(cles) {
  const nommees = (cles || []).filter((c) => NOMS_META[c]);
  if (!nommees.length) return null;
  const noms = nommees.map((c) => NOMS_META[c]);
  // « Les réglages de la respiration » seuls sont aussi un pluriel.
  const plusieurs = noms.length > 1 || noms[0].startsWith('les ');
  const participe = `remplacé${nommees.every((c) => META_FEMININES.has(c)) ? 'e' : ''}${plusieurs ? 's' : ''}`;
  const t = `${enumerer(noms)} ${plusieurs ? 'seront' : 'sera'} ${participe} par ce que contient le fichier.`;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function Sauvegarde() {
  const [etat, setEtat] = useState(() => lireImportEnAttente());
  const entree = useRef(null);
  const sauvegarde = useSauvegarde();
  const retour = () => { oublierImport(); location.hash = '#/reglages'; };
  const choisir = async (e) => {
    const choisis = [...(e.target.files || [])];
    e.target.value = '';
    if (!choisis.length) return;
    setEtat(await analyserChoix(choisis));
  };
  const appliquer = async () => {
    await remplacer(repo, etat.analyse);
    // Un filtre de l'Historique pourrait viser un élément absent du fichier : l'Historique repart de zéro.
    reinitialiserHistorique();
    oublierLectures();
    oublierImport();
    afficherToast('Import terminé.', null, 3000);
    location.hash = '#/reglages';
  };
  const s = sauvegarde.infos;
  const a = etat && etat.analyse;
  const perte = etat && etat.perte && phrasePerte(etat.perte);
  const meta = etat && phraseMeta(etat.metaRemplacee);
  const plusAncien = a && s && s.ecriture && a.resume.exportedAt < s.ecriture;
  const boutonFichier = (texte) => html`<button type="button" class="btn" onClick=${() => entree.current && entree.current.click()}>${texte}</button>`;

  return html`<main class="ecran import">
    <${Entete} titre="Importer une sauvegarde" retour=${retour} />
    <input ref=${entree} type="file" multiple class="visuellement-cache" aria-label="Fichier de sauvegarde" onChange=${choisir} />
    ${!etat && html`<p class="texte-import">Choisis le fichier de sauvegarde (.json ou .zip), par exemple dans iCloud Drive, dossier Carnet.</p>
      ${boutonFichier('Choisir un fichier')}`}
    ${etat && etat.erreur && html`<p class="texte-import" role="status">${etat.erreur}</p>${boutonFichier('Choisir un autre fichier')}`}
    ${a && html`<section class="apercu-import" aria-label="Aperçu de l'import">
      <p class="texte-import">${phraseContenu(a.resume)}</p>
      ${perte && html`<p class="encadre-perte">${perte}</p>`}
      ${meta && html`<p class="encadre-perte">${meta}</p>`}
      ${a.manquants > 0 && html`<p class="note-import">${pluriel(a.manquants, 'mémo vocal n\'est', 'mémos vocaux ne sont')} pas dans les fichiers choisis.</p>`}
      ${plusAncien && html`<p class="note-import">Ce fichier date du ${dateIso(a.resume.exportedAt)}. La dernière saisie ici date du ${dateIso(s.ecriture)}.</p>`}
      ${a.erreurs.length > 0 && html`<details class="note-import"><summary>${pluriel(a.erreurs.length, 'élément illisible sera ignoré', 'éléments illisibles seront ignorés')}</summary>
        <ul>${a.erreurs.slice(0, 20).map((e) => html`<li>${e}</li>`)}</ul></details>`}
      <div class="actions-col">
        <button type="button" class="btn" disabled=${!sauvegarde.fichiers} onClick=${sauvegarde.exporterMaintenant}>Exporter d'abord</button>
        <button type="button" class="btn btn-plein" onClick=${appliquer}>${a.erreurs.length ? 'Importer les éléments lisibles' : 'Importer'}</button>
      </div>
      ${sauvegarde.message && html`<p class="note-import" role="status">${sauvegarde.message}</p>`}
    </section>`}
  </main>`;
}
