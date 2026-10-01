// Réglages › Sauvegarde : exporter (feuille de partage iOS), importer avec aperçu, revenir.
import { html, useEffect, useRef, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { repo } from '../../donnees.js';
import { VERSION_APP } from '../../version.js';
import { exporter, analyserFichiers, remplacer, chiffrerPerte, lireTout, copieAvantImport, revenirAvantImport } from '../../db/sauvegarde.js';
import { partagerPlusieurs, variantesTexte, premierPartageable, partager } from '../../plateforme/partage.js';
import { copier } from '../../plateforme/presse-papier.js';
import { estModeApp } from '../../plateforme/mode.js';
import { formaterOctets } from '../../plateforme/persistance.js';
import { cleLocale, formaterDateLongue, formaterJour } from '../../domain/dates.js';
import { afficherToast } from '../composants/toast.js';

const dateIso = (iso) => formaterDateLongue(cleLocale(new Date(iso)));
const pluriel = (n, un, plusieurs) => `${n} ${n > 1 ? plusieurs : un}`;

function phraseContenu(r) {
  const morceaux = [pluriel(r.journees, 'journée', 'journées'), pluriel(r.episodes, 'épisode', 'épisodes')];
  if (r.symptomes) morceaux.push(pluriel(r.symptomes, 'symptôme', 'symptômes'));
  if (r.traitements) morceaux.push(pluriel(r.traitements, 'fiche de traitement', 'fiches de traitement'));
  if (r.rdv) morceaux.push(pluriel(r.rdv, 'rendez-vous', 'rendez-vous'));
  if (r.memos) morceaux.push(pluriel(r.memos, 'mémo vocal', 'mémos vocaux'));
  const periode = r.du ? ` (du ${formaterJour(r.du, { annee: true })} au ${formaterJour(r.au, { annee: true })})` : '';
  return `Ce fichier contient ${morceaux.join(', ')}${periode}.`;
}
function phrasePerte(p) {
  const m = [];
  if (p.journal) m.push(pluriel(p.journal, 'journée', 'journées'));
  if (p.episodes) m.push(pluriel(p.episodes, 'épisode', 'épisodes'));
  if (p.symptomes) m.push(pluriel(p.symptomes, 'symptôme', 'symptômes'));
  if (p.traitements) m.push(pluriel(p.traitements, 'fiche de traitement', 'fiches de traitement'));
  if (p.rdv) m.push(pluriel(p.rdv, 'rendez-vous', 'rendez-vous'));
  if (p.audios) m.push(pluriel(p.audios, 'mémo vocal', 'mémos vocaux'));
  if (!m.length) return null;
  return `Ce qui est ici et absent du fichier sera effacé : ${m.join(', ')}.`;
}

export function Sauvegarde() {
  const [infos, setInfos] = useState(null);
  const [fichiers, setFichiers] = useState(null);
  const [apercu, setApercu] = useState(null);
  const [message, setMessage] = useState(null);
  const entree = useRef(null);

  const charger = async () => {
    const [derniere, ecriture, tout, copie] = await Promise.all([
      repo.meta.lire('derniereSauvegarde'), repo.meta.lire('derniereEcriture'), lireTout(repo), copieAvantImport(repo),
    ]);
    const prets = (await exporter(repo, { versionApp: VERSION_APP })).map((f) => ({ ...f, fichier: new File(f.morceaux, f.nom, { type: f.type }) }));
    setFichiers(prets);
    setInfos({ derniere, ecriture, tout, copie, taille: prets.reduce((n, f) => n + f.taille, 0) });
  };
  useEffect(() => { charger(); }, []);

  const noterSauvegarde = async () => {
    await repo.meta.ecrire('derniereSauvegarde', repo.maintenant().toISOString());
    afficherToast('Sauvegarde faite.', null, 3000);
    setInfos((i) => ({ ...i, derniere: repo.maintenant().toISOString() }));
  };

  // Appelé dans le geste : aucun await avant navigator.share.
  const exporterMaintenant = () => {
    if (!fichiers) return;
    const liste = fichiers.map((f) => f.fichier);
    partagerPlusieurs(liste).then(async (r) => {
      if (r === 'partage') { await noterSauvegarde(); return; }
      if (r === 'annule') return;
      if (fichiers.length === 1 && fichiers[0].type === 'application/json') {
        const texte = new TextDecoder().decode(fichiers[0].morceaux[0]);
        const variante = premierPartageable(variantesTexte(fichiers[0].nom, texte, 'application/json').slice(1));
        if (variante) { const r2 = await partager(variante); if (r2 === 'partage') { await noterSauvegarde(); return; } }
        if (await copier(texte)) { setMessage('Copié. Colle-le dans une note pour le garder.'); return; }
      }
      setMessage(estModeApp() ? "L'iPhone n'a pas proposé de partage cette fois." : null);
    });
  };

  const lireFichiers = async (e) => {
    setMessage(null);
    const choisis = [...(e.target.files || [])];
    e.target.value = '';
    if (!choisis.length) return;
    try {
      const lus = await Promise.all(choisis.map(async (f) => ({ nom: f.name, octets: new Uint8Array(await f.arrayBuffer()) })));
      const analyse = analyserFichiers(lus);
      const actuel = await lireTout(repo);
      const base = actuel.journal.length + actuel.episodes.length + actuel.symptomes.length + actuel.traitements.length + actuel.rdv.length;
      setApercu({ analyse, perte: base ? chiffrerPerte(actuel, analyse) : null });
    } catch (err) {
      setApercu(null);
      setMessage(err && err.code ? err.message : 'Ce fichier est illisible.');
    }
  };

  const appliquer = async () => {
    await remplacer(repo, apercu.analyse);
    setApercu(null);
    afficherToast('Sauvegarde importée.', null, 3000);
    await charger();
  };

  const revenir = async () => {
    await revenirAvantImport(repo);
    afficherToast("État d'avant l'import rétabli.", null, 3000);
    await charger();
  };

  if (!infos) return html`<main class="ecran"><${Entete} titre="Sauvegarde" retour=${() => { location.hash = '#/reglages'; }} /></main>`;
  const a = apercu && apercu.analyse;
  const perte = apercu && apercu.perte && phrasePerte(apercu.perte);
  const plusAncien = a && infos.ecriture && a.resume.exportedAt < infos.ecriture;

  return html`<main class="ecran sauvegarde">
    <${Entete} titre="Sauvegarde" retour=${() => { location.hash = '#/reglages'; }} />
    <section class="carte">
      <p>${infos.derniere ? `Dernière sauvegarde : ${dateIso(infos.derniere)}` : "Aucune sauvegarde pour l'instant. Tes données ne sont que sur cet iPhone."}</p>
      <p class="discret">Taille : ${formaterOctets(infos.taille)}${fichiers && fichiers.length > 1 ? ` · ${fichiers.length} fichiers` : ''}</p>
      <div class="actions-col">
        <button type="button" class="btn btn-plein" disabled=${!fichiers} onClick=${exporterMaintenant}>Exporter</button>
        <p class="discret">Enregistrer dans Fichiers, puis iCloud Drive, dossier Carnet.</p>
        ${!estModeApp() && fichiers && html`<p class="discret">${fichiers.map((f) => html`<a class="lien" href=${URL.createObjectURL(f.fichier)} download=${f.nom}>Télécharger ${f.nom}</a>`)}</p>`}
        <button type="button" class="btn" onClick=${() => entree.current && entree.current.click()}>Importer</button>
        <input ref=${entree} type="file" multiple class="visuellement-cache" aria-label="Fichier de sauvegarde" onChange=${lireFichiers} />
        ${infos.copie && html`<button type="button" class="btn-lien" onClick=${revenir}>Revenir à l'état d'avant l'import</button>`}
      </div>
      ${message && html`<p class="discret" role="status">${message}</p>`}
    </section>
    ${a && html`<section class="carte section apercu" aria-label="Aperçu de l'import">
      <p>${phraseContenu(a.resume)}</p>
      ${perte && html`<p>${perte}</p>`}
      ${a.manquants > 0 && html`<p>${pluriel(a.manquants, 'mémo vocal n\'est', 'mémos vocaux ne sont')} pas dans les fichiers choisis.</p>`}
      ${plusAncien && html`<p class="discret">Ce fichier date du ${dateIso(a.resume.exportedAt)}. La dernière saisie ici date du ${dateIso(infos.ecriture)}.</p>`}
      ${a.erreurs.length > 0 && html`<details><summary>${pluriel(a.erreurs.length, 'élément illisible sera ignoré', 'éléments illisibles seront ignorés')}</summary>
        <ul>${a.erreurs.slice(0, 20).map((e) => html`<li class="discret">${e}</li>`)}</ul></details>`}
      <div class="actions-col">
        <button type="button" class="btn" onClick=${exporterMaintenant}>Exporter d'abord</button>
        <button type="button" class="btn btn-plein" onClick=${appliquer}>${a.erreurs.length ? 'Importer les éléments lisibles' : 'Remplacer par ce fichier'}</button>
        <button type="button" class="btn-lien" onClick=${() => setApercu(null)}>Ne rien changer</button>
      </div>
    </section>`}
  </main>`;
}
