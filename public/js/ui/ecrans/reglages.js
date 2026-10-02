// Réglages : sauvegarde (exporter, importer, revenir), listes, rappel, analyse, à propos,
// et la zone sensible.
import { html, useEffect, useRef, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { Interrupteur } from '../composants/interrupteur.js';
import { Icones } from '../icones.js';
import { VERSION, VERSION_APP } from '../../version.js';
import { etatStockage, formaterOctets } from '../../plateforme/persistance.js';
import { verifierMaj } from '../../plateforme/sw-client.js';
import { estModeApp } from '../../plateforme/mode.js';
import { revenirAvantImport } from '../../db/sauvegarde.js';
import { afficherToast } from '../composants/toast.js';
import { repo } from '../../donnees.js';
import { cleLocale, formaterDateLongue } from '../../domain/dates.js';
import { useSauvegarde, analyserChoix } from '../sauvegarde.js';

function useAppuiLong(action, ms = 700) {
  const minuteur = useRef(null);
  const debut = () => { minuteur.current = setTimeout(action, ms); };
  const fin = () => clearTimeout(minuteur.current);
  return { onPointerDown: debut, onPointerUp: fin, onPointerLeave: fin, onPointerCancel: fin, onContextMenu: (e) => e.preventDefault() };
}

export const dateIso = (iso) => formaterDateLongue(cleLocale(new Date(iso)));

const LigneLien = ({ href, icone, titre }) => html`<li><a class="ligne-carte" href=${href}>
  ${icone && Icones[icone]()}<span class="ligne-libelle">${titre}</span>${Icones.chevron({ trait: 2 })}</a></li>`;

export function Reglages() {
  const [stockage, setStockage] = useState(null);
  const [infos, setInfos] = useState({});
  const entree = useRef(null);
  const sauvegarde = useSauvegarde();
  const horsLigne = typeof navigator !== 'undefined' && navigator.serviceWorker && navigator.serviceWorker.controller;
  useEffect(() => {
    etatStockage().then(setStockage);
    Promise.all([repo.audios.metas(), repo.meta.lire('prenomSoignants'), repo.meta.lire('reglages')]).then(([metas, prenom, reglages]) =>
      setInfos({ memos: metas.reduce((n, m) => n + (m.taille || 0), 0), prenom, reglages }));
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
  const revenir = async () => {
    await revenirAvantImport(repo);
    afficherToast("État d'avant l'import rétabli.", null, 3000);
    await sauvegarde.recharger();
  };
  const signal = infos.reglages ? infos.reglages.signal !== false : true;
  const basculerSignal = (v) => {
    const reglages = { ...(infos.reglages || {}), signal: v };
    setInfos((i) => ({ ...i, reglages }));
    repo.meta.ecrire('reglages', reglages);
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
      <ul class="liste">
        <li><button type="button" class="ligne-carte action" disabled=${!fichiers} onClick=${sauvegarde.exporterMaintenant}>${Icones.exporter()}Exporter</button></li>
        <li><button type="button" class="ligne-carte action" onClick=${() => entree.current && entree.current.click()}>${Icones.importer()}Importer</button></li>
        ${s && s.copie && html`<li><button type="button" class="ligne-carte action" onClick=${revenir}>Revenir à l'état d'avant l'import</button></li>`}
      </ul>
      <input ref=${entree} type="file" multiple class="visuellement-cache" aria-label="Fichier de sauvegarde" onChange=${choisirFichiers} />
    </section>
    <p class="aide-carte">Enregistrer dans Fichiers, puis iCloud Drive, dossier Carnet.</p>
    ${sauvegarde.message && html`<p class="aide-carte" role="status">${sauvegarde.message}</p>`}
    ${!estModeApp() && fichiers && html`<p class="aide-carte">${fichiers.map((f) => html`<a class="lien" href=${URL.createObjectURL(f.fichier)} download=${f.nom}>Télécharger ${f.nom}</a>`)}</p>`}

    <ul class="liste carte carte-groupe espace-haut">
      <${LigneLien} href="#/reglages/listes" icone="listes" titre="Listes" />
      <${LigneLien} href="#/reglages/rappel" icone="rappel" titre="Rappel du soir" />
    </ul>

    <h2 class="libelle-section">Analyse</h2>
    <section class="carte carte-groupe" aria-label="Analyse">
      <div class="ligne-interrupteur">
        <span id="libelle-signal" class="ligne-libelle">Signal de ressemblance</span>
        <${Interrupteur} etiquette="Signal de ressemblance" actif=${signal} surChanger=${basculerSignal} />
      </div>
      <p class="note-carte-interne marge-interne">Une ligne « Pour info » dans Analyse quand les derniers jours ressemblent, dans les chiffres, à ceux qui ont précédé des périodes plus basses.</p>
      <div class="champ-carte">
        <label class="libelle-carte" for="prenom-soignants">Prénom pour la vue soignants</label>
        <input id="prenom-soignants" class="champ-ligne" autocomplete="off" defaultValue=${infos.prenom || ''}
          onBlur=${(e) => repo.meta.ecrire('prenomSoignants', e.target.value.trim() || null)} />
      </div>
    </section>

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
  </main>`;
}
