// Écran de diagnostic (appui long sur la version, dans Réglages) : vérifie sur l'iPhone
// ce qu'aucune source ne garantit (partage, impression, presse-papier, micro, dictée). v8 (Q27) : l'écran aussi, la
// fenêtre, les zones sûres (encoche, barre d'accueil), la hauteur utile entre elles, la marge du soir (entre la
// dernière carte du soir et la bande du bas, prise au dernier affichage du soir d'aujourd'hui, détails fermés) et celle
// de « J'ai fini pour ce soir » : des chiffres techniques, rien sur l'usage. v10 (spec §14.2) : 2 min de bruit rose en session
// « playback », pour vérifier sur l'iPhone qu'un son de fond continue écran verrouillé.
import { html, useEffect, useRef, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { suspendreSon } from '../composants/signal-sonore.js';
import { FONDU_SORTIE_S, demarrerFond } from '../composants/sons-de-fond.js';
import { VERSION, VERSION_APP } from '../../version.js';
import { libelleMode } from '../../plateforme/mode.js';
import { demanderPersistance, etatStockage, formaterOctets } from '../../plateforme/persistance.js';
import { versionSw } from '../../plateforme/sw-client.js';
import { peutPartager, partager, variantesTexte, premierPartageable } from '../../plateforme/partage.js';
import { copier } from '../../plateforme/presse-papier.js';
import { formatsSupportes, microDisponible, ouvrirMicro, creerEnregistreur, assembler } from '../../plateforme/micro.js';
import { creerZip } from '../../db/zip.js';
import { lireTout } from '../../db/sauvegarde.js';
import { verifierDonnees } from '../../domain/verification.js';
import { pourAffichage } from '../../domain/typographie.js';
import { repo } from '../../donnees.js';
import { creerPdfJpeg } from '../../export/pdf.js';
import { zonesSures, hauteurUtile, lireMargeSoir, lireMargeFini } from '../mesures.js';

const enc = new TextEncoder();
const ESSAI_FOND_S = 120;
// « 28,3 px », « −12 px » : une décimale au plus, à la française.
const px = (n) => `${String(n).replace('-', '−').replace('.', ',')} px`;

// L'écran, relu à l'ouverture et quand la fenêtre change de taille (rotation, clavier, bandeau de Safari).
function useEcran() {
  const lire = () => { const zones = zonesSures(); return { zones, ...hauteurUtile(zones), marge: lireMargeSoir(), fini: lireMargeFini() }; };
  const [ecran, setEcran] = useState(null);
  useEffect(() => {
    const maj = () => setEcran(lire());
    maj();
    window.addEventListener('resize', maj);
    return () => window.removeEventListener('resize', maj);
  }, []);
  return ecran;
}
const texteZones = (z) => `haut ${z.haut} · bas ${z.bas} · gauche ${z.gauche} · droite ${z.droite}`;
const texteMarge = (m) => (m == null ? '· (ouvre le soir d\'aujourd\'hui)' : `${px(m)}${m < 0 ? ' (le soir défile)' : ''}`);
// « J'ai fini pour ce soir » n'est là qu'après un premier choix du soir.
const texteFini = (m) => (m == null ? '·' : `${px(m)}${m < 0 ? ' (sous la bande)' : ''}`);

async function fabriquerPdfTest() {
  const canvas = document.createElement('canvas');
  canvas.width = 1654; canvas.height = 2339;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#1F1D1A'; ctx.font = '64px -apple-system, sans-serif';
  ctx.fillText('Carnet : page de test', 140, 220);
  ctx.strokeStyle = '#3B4A6B'; ctx.lineWidth = 6; ctx.strokeRect(140, 300, 1374, 600);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
  const jpeg = new Uint8Array(await blob.arrayBuffer());
  const pdf = creerPdfJpeg(jpeg, { largeurPx: 1654, hauteurPx: 2339 });
  return new File([pdf], 'carnet-test.pdf', { type: 'application/pdf' });
}

export function Diagnostic() {
  const [infos, setInfos] = useState({});
  const [fichiers, setFichiers] = useState({});
  const [journal, setJournal] = useState([]);
  const [micro, setMicro] = useState({ etat: 'repos' });
  const [verif, setVerif] = useState({ etat: 'repos' });
  const [fondActif, setFondActif] = useState(false);
  const fond = useRef(null);
  const finFond = useRef(null);
  const zoneDicter = useRef(null);
  const ecran = useEcran();
  const noter = (test, resultat) => setJournal((j) => [...j, `${test} : ${resultat}`]);

  useEffect(() => {
    (async () => {
      const stockage = await etatStockage();
      setInfos({
        mode: libelleMode(), version: `${VERSION_APP} · ${VERSION}`, sw: (await versionSw()) || 'aucun',
        persiste: stockage.persiste, utilise: formaterOctets(stockage.utilise), quota: formaterOctets(stockage.quota),
        formats: formatsSupportes(), microApi: microDisponible(),
        webSpeech: typeof window.webkitSpeechRecognition !== 'undefined' || typeof window.SpeechRecognition !== 'undefined',
        ua: navigator.userAgent,
      });
      const json = JSON.stringify({ format: 'carnet-test', date: new Date().toISOString() }, null, 2);
      const variantes = variantesTexte('carnet-test.json', json, 'application/json');
      const zip = creerZip([
        { nom: 'sauvegarde.json', donnees: enc.encode(json) },
        { nom: 'audios/test.bin', donnees: new Uint8Array(2048).map((_, i) => i % 251) },
      ], { date: new Date() });
      let pdf = null;
      try { pdf = await fabriquerPdfTest(); } catch (e) { noter('Fabrication du PDF', `échec (${e && e.message})`); }
      setFichiers({
        json: premierPartageable(variantes), jsonVariantes: variantes,
        zip: new File(zip.morceaux, 'carnet-test.zip', { type: 'application/zip' }), pdf,
      });
    })();
  }, []);

  const partagerFichier = (cle, libelle) => {
    const f = fichiers[cle];
    if (!f) { noter(libelle, 'fichier non prêt ou non partageable'); return; }
    partager(f, { titre: 'Carnet' }).then((r) => noter(libelle, `${r} (${f.type || 'sans type'})`));
  };
  const copierTest = () => copier('Carnet : test du presse-papier').then((ok) => noter('Presse-papier', ok ? 'copié' : 'échec'));
  const imprimer = () => { try { window.print(); noter('Impression', 'appel fait (vérifier à l\'écran)'); } catch (e) { noter('Impression', `échec (${e && e.message})`); } };
  const persister = () => demanderPersistance().then((r) => noter('Persistance', String(r)));
  // Des nombres seulement : rien de ce que l'utilisateur a écrit n'est affiché ni copié.
  const verifier = async () => {
    setVerif({ etat: 'lecture' });
    try {
      setVerif({ etat: 'fini', ...verifierDonnees(await lireTout(repo)) });
    } catch (e) {
      setVerif({ etat: 'repos' });
      noter('Vérification des données', `échec (${(e && e.code) || (e && e.name) || 'erreur'})`);
    }
  };
  const arreterFond = () => {
    clearTimeout(finFond.current);
    if (!fond.current) return;
    fond.current.arreter();
    fond.current = null;
    suspendreSon({ apresMs: FONDU_SORTIE_S * 1000 + 200 });
  };
  const essayerFond = () => {
    if (fond.current) {
      arreterFond();
      setFondActif(false);
      noter('Son de fond', 'arrêté');
      return;
    }
    fond.current = demarrerFond('rose', { minuterieS: ESSAI_FOND_S, volume: 0.5 });
    setFondActif(true);
    noter('Son de fond', `lancé (${ESSAI_FOND_S} s, session ${navigator.audioSession ? navigator.audioSession.type : 'non réglable'})`);
    finFond.current = setTimeout(() => { arreterFond(); setFondActif(false); noter('Son de fond', 'fini'); }, ESSAI_FOND_S * 1000);
  };
  useEffect(() => arreterFond, []);
  const dicter = () => { const z = zoneDicter.current; if (z) { z.focus(); noter('Dicter', 'focus demandé (le clavier est-il ouvert ?)'); } };

  const enregistrer = async () => {
    if (micro.url) URL.revokeObjectURL(micro.url);
    setMicro({ etat: 'enregistrement' });
    try {
      const flux = await ouvrirMicro();
      const rec = creerEnregistreur(flux, { dureeMax: 5000 });
      const res = await rec.fin;
      const audio = await assembler(res);
      const url = URL.createObjectURL(new Blob([audio.donnees], { type: audio.mime }));
      const parSeconde = Math.round(audio.taille / Math.max(1, res.dureeMs / 1000));
      setMicro({ etat: 'fini', url, mime: audio.mime, taille: audio.taille, parSeconde, duree: res.dureeMs });
      noter('Micro', `${audio.mime}, ${audio.taille} o, ${parSeconde} o/s, ${res.morceaux.length} morceaux`);
    } catch (e) {
      setMicro({ etat: 'erreur', message: (e && e.message) || 'erreur' });
      noter('Micro', `échec : ${(e && e.code) || ''} ${(e && e.cause && e.cause.name) || (e && e.name) || ''}`);
    }
  };
  useEffect(() => () => { if (micro.url) URL.revokeObjectURL(micro.url); }, [micro.url]);

  const rapport = () => [
    `Carnet ${infos.version} · ${new Date().toLocaleString('fr-FR')}`,
    `Mode : ${infos.mode} · SW : ${infos.sw}`,
    ...(ecran ? [`Écran : ${ecran.largeur} × ${ecran.fenetre} · zones sûres ${texteZones(ecran.zones)} · hauteur utile ${px(ecran.utile)} · marge du soir ${texteMarge(ecran.marge)} · marge de « J'ai fini » ${texteFini(ecran.fini)}`] : []),
    `Stockage protégé : ${infos.persiste} · utilisé ${infos.utilise} / quota ${infos.quota}`,
    `canShare JSON : ${fichiers.jsonVariantes ? fichiers.jsonVariantes.map((f) => `${f.type}=${peutPartager(f)}`).join(', ') : '·'}`,
    `canShare ZIP : ${fichiers.zip ? peutPartager(fichiers.zip) : '·'} · PDF : ${fichiers.pdf ? peutPartager(fichiers.pdf) : '·'}`,
    `Formats micro : ${JSON.stringify(infos.formats)} · API micro : ${infos.microApi} · webkitSpeechRecognition exposé : ${infos.webSpeech}`,
    ...(verif.etat === 'fini' ? [`Données : ${Object.entries(verif.parTable).map(([t, n]) => `${t} ${n}`).join(' · ')} · mémos sans fiche ${verif.memosSansFiche} · fiches illisibles ${verif.fichesIllisibles}`] : []),
    `UA : ${infos.ua}`, '', ...journal,
  ].join('\n');

  return html`<main class="ecran diag">
    <${Entete} titre="Diagnostic" retour=${() => { location.hash = '#/reglages'; }} />
    <section class="carte">
      <dl>
        <dt>Mode</dt><dd>${infos.mode || '·'}</dd>
        <dt>Version</dt><dd>${infos.version || '·'}</dd>
        <dt>Service worker</dt><dd>${infos.sw || '·'}</dd>
        <dt>Stockage protégé</dt><dd>${String(infos.persiste ?? '·')}</dd>
        <dt>Utilisé / quota</dt><dd>${infos.utilise || '·'} / ${infos.quota || '·'}</dd>
        <dt>Fenêtre</dt><dd>${ecran ? `${ecran.largeur} × ${ecran.fenetre}` : '·'}</dd>
        <dt>Zones sûres</dt><dd>${ecran ? texteZones(ecran.zones) : '·'}</dd>
        <dt>Hauteur utile</dt><dd>${ecran ? px(ecran.utile) : '·'}</dd>
        <dt>Marge du soir</dt><dd>${ecran ? texteMarge(ecran.marge) : '·'}</dd>
        <dt>Marge de « J'ai fini »</dt><dd>${ecran ? texteFini(ecran.fini) : '·'}</dd>
        <dt>Formats micro</dt><dd>${infos.formats ? Object.entries(infos.formats).map(([k, v]) => `${k} ${v ? 'oui' : 'non'}`).join(' · ') : '·'}</dd>
        <dt>canShare</dt><dd>JSON ${fichiers.json ? 'oui' : 'non'} · ZIP ${fichiers.zip && peutPartager(fichiers.zip) ? 'oui' : 'non'} · PDF ${fichiers.pdf && peutPartager(fichiers.pdf) ? 'oui' : 'non'}</dd>
      </dl>
    </section>
    <section class="section">
      <h2>Mes données</h2>
      <div class="actions">
        <button type="button" class="btn" disabled=${verif.etat === 'lecture'} onClick=${verifier}>Vérifier mes données</button>
      </div>
      <div class="resultat" aria-live="polite">
        ${verif.etat === 'fini' && html`<section class="carte">
          <dl>
            ${Object.entries(verif.parTable).map(([table, n]) => html`<dt>${table}</dt><dd>${n}</dd>`)}
            <dt>Mémos sans fiche</dt><dd>${verif.memosSansFiche}</dd>
            <dt>Fiches illisibles</dt><dd>${verif.fichesIllisibles}</dd>
          </dl>
        </section>`}
      </div>
    </section>
    <section class="section">
      <h2>Tests</h2>
      <div class="actions">
        <button type="button" class="btn" onClick=${() => partagerFichier('json', 'Partage JSON')}>Partager un JSON</button>
        <button type="button" class="btn" onClick=${() => partagerFichier('zip', 'Partage ZIP')}>Partager un ZIP</button>
        <button type="button" class="btn" onClick=${() => partagerFichier('pdf', 'Partage PDF')}>Partager un PDF</button>
        <button type="button" class="btn" onClick=${copierTest}>Copier dans le presse-papier</button>
        <button type="button" class="btn" onClick=${imprimer}>Imprimer</button>
        <button type="button" class="btn" onClick=${persister}>Demander le stockage protégé</button>
        <button type="button" class="btn" disabled=${micro.etat === 'enregistrement'} onClick=${enregistrer}>
          ${micro.etat === 'enregistrement' ? 'Enregistrement (5 s)…' : 'Enregistrer 5 s au micro'}</button>
        ${micro.etat === 'fini' && html`<audio controls src=${micro.url} preload="metadata"></audio>
          <p class="discret">${micro.mime} · ${micro.taille} o · ${micro.parSeconde} o/s · ${Math.round(micro.duree / 100) / 10} s</p>`}
        ${micro.etat === 'erreur' && html`<p class="discret">${micro.message}</p>`}
        <label class="discret" for="diag-dicter">Champ de test pour Dicter</label>
        <textarea id="diag-dicter" class="champ-texte" ref=${zoneDicter}></textarea>
        <button type="button" class="btn" onClick=${dicter}>Dicter (ouvre le clavier)</button>
        <button type="button" class="btn" onClick=${essayerFond}>${fondActif ? 'Arrêter le son de fond' : 'Son de fond, écran verrouillé'}</button>
        <p class="discret">${pourAffichage('Lance 2 min de bruit rose. À vérifier : verrouille l\'iPhone, le son doit continuer, puis s\'éteindre en fondu à la fin des 2 min. Il joue aussi en mode silencieux et met la musique en pause.')}</p>
      </div>
    </section>
    <section class="section">
      <h2>Rapport</h2>
      <pre>${rapport()}</pre>
      <button type="button" class="btn btn-plein" onClick=${() => copier(rapport()).then((ok) => noter('Copie du rapport', ok ? 'faite' : 'échec'))}>Copier le rapport</button>
    </section>
  </main>`;
}
