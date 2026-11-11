// Réglages : sauvegarde (exporter, importer, revenir) en tête, puis « Ma saisie » (le soir, listes, émotions (v8 : le
// sens des mots de la roue), rappels) et « Moment difficile » (mon plan, respiration et « Une chose à la fois », me
// ressourcer, aide iPhone), puis à propos et la zone sensible (v6.1). v7 : la section « Analyse » (signal de ressemblance,
// tendances) disparaît avec ces analyses ; les réglages déjà enregistrés sont ignorés. v11 : « Revenir » demande confirmation.
import { html, useEffect, useRef, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { IconeLigne } from '../composants/rubrique.js';
import { Icones } from '../icones.js';
import { VERSION, VERSION_APP } from '../../version.js';
import { etatStockage, formaterOctets } from '../../plateforme/persistance.js';
import { verifierMaj } from '../../plateforme/sw-client.js';
import { estModeApp } from '../../plateforme/mode.js';
import { revenirAvantImport } from '../../db/sauvegarde.js';
import { afficherToast } from '../composants/toast.js';
import { Confirmation } from '../composants/confirmation.js';
import { repo } from '../../donnees.js';
import { cleLocale, formaterDateLongue } from '../../domain/dates.js';
import { pourAffichage } from '../../domain/typographie.js';
import { useSauvegarde, analyserChoix } from '../sauvegarde.js';
import { oublierLectures } from '../lecture.js';

function useAppuiLong(action, ms = 700) {
  const minuteur = useRef(null);
  const debut = () => { minuteur.current = setTimeout(action, ms); };
  const fin = () => clearTimeout(minuteur.current);
  return { onPointerDown: debut, onPointerUp: fin, onPointerLeave: fin, onPointerCancel: fin, onContextMenu: (e) => e.preventDefault() };
}

export const dateIso = (iso) => formaterDateLongue(cleLocale(new Date(iso)));

// Liste groupée 2b : l'icône, à l'accent (la rangée ouvre un écran ; v12, sans carré ni couleur de parcours), le libellé, le
// chevron ; filets décalés après l'icône.
const LigneLien = ({ href, icone, titre }) => html`<li><a class="ligne-carte" href=${href}>
  ${icone && html`<${IconeLigne} icone=${icone} />`}<span class="ligne-libelle">${titre}</span>${Icones.chevron({ trait: 2 })}</a></li>`;

export function Reglages() {
  const [stockage, setStockage] = useState(null);
  const [infos, setInfos] = useState({});
  const entree = useRef(null);
  const sauvegarde = useSauvegarde();
  const horsLigne = typeof navigator !== 'undefined' && navigator.serviceWorker && navigator.serviceWorker.controller;
  useEffect(() => {
    etatStockage().then(setStockage);
    repo.audios.metas().then((metas) => setInfos({ memos: metas.reduce((n, m) => n + (m.taille || 0), 0) }));
  }, []);
  const appui = useAppuiLong(() => { location.hash = '#/diagnostic'; });
  const chercher = async () => {
    const ok = await verifierMaj(true);
    afficherToast(ok ? 'Recherche faite.' : 'Pas de recherche possible ici.', null, 2500);
  };
  const choisirFichiers = async (e) => {
    const choisis = [...(e.target.files || [])];
    e.target.value = '';
    if (!choisis.length) return;
    await analyserChoix(choisis);
    location.hash = '#/reglages/sauvegarde';
  };
  // v11 : « Revenir » remplace tout d'un seul toucher, juste sous « Importer » : il demande d'abord confirmation (spec §10).
  const [confirmerRetour, setConfirmerRetour] = useState(false);
  const revenir = async () => {
    await revenirAvantImport(repo);
    oublierLectures();
    afficherToast("État d'avant l'import rétabli.", null, 3000);
    await sauvegarde.recharger();
  };
  const s = sauvegarde.infos;
  const fichiers = sauvegarde.fichiers;

  return html`<main class="ecran reglages">
    <${Entete} titre="Réglages" />
    <h2 class="libelle-section">Sauvegarde</h2>
    <section class="carte carte-groupe" aria-label="Sauvegarde">
      <div class="texte-carte">
        <p>${s && s.derniere ? `Dernière sauvegarde : ${dateIso(s.derniere)}` : "Aucune sauvegarde pour l'instant. Tes données ne sont que sur cet iPhone."}</p>
        ${s && html`<p class="note-carte-interne">Taille : ${formaterOctets(s.taille)}${fichiers && fichiers.length > 1 ? ` · ${fichiers.length} fichiers` : ''}</p>`}
      </div>
      <ul class="liste avec-carres">
        <li><button type="button" class="ligne-carte action" disabled=${!fichiers} onClick=${sauvegarde.exporterMaintenant}><${IconeLigne} icone="exporter" />Exporter</button></li>
        <li><button type="button" class="ligne-carte action" onClick=${() => entree.current && entree.current.click()}><${IconeLigne} icone="importer" />Importer</button></li>
        ${s && s.copie && html`<li><button type="button" class="ligne-carte action" onClick=${() => setConfirmerRetour(true)}><${IconeLigne} icone="retour" />Revenir à l'état d'avant l'import</button></li>`}
      </ul>
      <input ref=${entree} type="file" multiple class="visuellement-cache" aria-label="Fichier de sauvegarde" onChange=${choisirFichiers} />
    </section>
    <p class="aide-carte">Enregistrer dans Fichiers, puis iCloud Drive, dossier Emozio.</p>
    <p class="aide-carte">${pourAffichage('Supprimer l\'icône efface tout ce qui est noté ici. Pour une mise à jour, le bandeau « Nouvelle version prête » suffit.')}</p>
    ${sauvegarde.message && html`<p class="aide-carte" role="status">${sauvegarde.message}</p>`}
    ${!estModeApp() && fichiers && html`<p class="aide-carte">${fichiers.map((f) => html`<a class="lien" href=${URL.createObjectURL(f.fichier)} download=${f.nom}>Télécharger ${f.nom}</a>`)}</p>`}

    <h2 id="titre-ma-saisie" class="libelle-section">Ma saisie</h2>
    <ul class="liste carte carte-groupe avec-carres" aria-labelledby="titre-ma-saisie">
      <${LigneLien} href="#/reglages/journee" icone="aujourdhui" titre="Le soir" />
      <${LigneLien} href="#/reglages/listes" icone="listes" titre="Listes" />
      <${LigneLien} href="#/reglages/emotions" icone="emotion" titre="Émotions" />
      <${LigneLien} href="#/reglages/rappel" icone="rappel" titre="Rappels" />
    </ul>

    <h2 id="titre-moment-difficile" class="libelle-section">Moment difficile</h2>
    <ul class="liste carte carte-groupe avec-carres" aria-labelledby="titre-moment-difficile">
      <${LigneLien} href="#/mon-plan" icone="monPlan" titre="Mon plan" />
      <${LigneLien} href="#/reglages/moment-difficile" icone="respiration" titre="Moment difficile" />
      <${LigneLien} href="#/reglages/ressourcer" icone="energie" titre="Me ressourcer" />
      <${LigneLien} href="#/reglages/aide-iphone" icone="aideIphone" titre="Aide iPhone" />
    </ul>

    <h2 class="libelle-section">À propos</h2>
    <section class="carte carte-groupe a-propos" aria-label="À propos">
      <p class="texte-carte">Tes données restent sur cet iPhone.</p>
      <ul class="liste">
        <li class="ligne-info"><span>Version</span><span class="version-app" ...${appui}>${VERSION_APP} · ${VERSION}</span></li>
        <li><button type="button" class="ligne-carte action petite" onClick=${chercher}>Rechercher une mise à jour</button></li>
        <li class="ligne-info"><span>Stockage protégé</span><span>${stockage ? (stockage.persiste ? 'oui' : 'non') : '·'}</span></li>
        <li class="ligne-info"><span>Espace utilisé</span><span>${stockage ? formaterOctets(stockage.utilise) : '·'}</span></li>
        <li class="ligne-info"><span>Mémos vocaux</span><span>${infos.memos != null ? formaterOctets(infos.memos) : '·'}</span></li>
        <li class="ligne-info"><span>Hors ligne</span><span>${horsLigne ? 'prêt' : 'pas encore'}</span></li>
      </ul>
    </section>

    <h2 class="libelle-section">Zone sensible</h2>
    <ul class="liste carte carte-groupe"><${LigneLien} href="#/reglages/effacer" titre="Tout effacer" /></ul>
    ${confirmerRetour && s && s.copie && html`<${Confirmation} titre="Revenir à l'état d'avant l'import ?"
      texte=${`Ce qui est noté ici sera remplacé par ce qu'il y avait avant l'import du ${dateIso(s.copie.date)}. Les mémos vocaux d'avant l'import ne reviennent pas.`}
      action="Revenir" surAnnuler=${() => setConfirmerRetour(false)} surConfirmer=${() => { setConfirmerRetour(false); revenir(); }} />`}
  </main>`;
}
