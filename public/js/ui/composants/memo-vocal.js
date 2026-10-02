// « Mémo vocal » : la voix gardée telle quelle, sur l'iPhone, réécoutable. Un bouton par fiche.
// getUserMedia est appelé dans le geste. L'enregistrement s'arrête au toucher, à 5 min, à la
// sortie de l'écran ou quand l'app passe en arrière-plan, et ce qui a été dit est gardé.
import { html, useEffect, useRef, useState } from '../lib.js';
import { Icones } from '../icones.js';
import { repo } from '../../donnees.js';
import { ouvrirMicro, creerEnregistreur, assembler, microDisponible, MESSAGES } from '../../plateforme/micro.js';
import { formaterDuree } from '../../domain/dates.js';
import { afficherToast } from './toast.js';

let lecteurActif = null;

// Onde décorative de 26 barres (hauteurs dans composants.css, sans style en ligne : CSP).
const ONDE = Array.from({ length: 26 }, (_, i) => i);

function Puce({ audio, surSupprimer }) {
  const [lecture, setLecture] = useState(false);
  const [position, setPosition] = useState(0);
  const lecteur = useRef(null);
  const url = useRef(null);
  // La source est détachée avant de révoquer l'adresse, qui ne l'est qu'un peu plus tard :
  // un lecteur qui lit encore ne doit jamais tomber sur une adresse déjà révoquée.
  const arreter = () => {
    const a = lecteur.current;
    lecteur.current = null;
    if (a) {
      a.onended = null; a.onerror = null;
      a.pause();
      a.removeAttribute('src');
      try { a.load(); } catch { /* déjà déchargé */ }
    }
    const u = url.current;
    url.current = null;
    if (u) setTimeout(() => URL.revokeObjectURL(u), 1000);
    setLecture(false);
    setPosition(0);
  };
  useEffect(() => arreter, []);
  const basculer = async () => {
    if (lecture) { arreter(); return; }
    if (lecteurActif) lecteurActif();
    const complet = audio.data ? audio : await repo.audios.lire(audio.id);
    if (!complet) return;
    url.current = URL.createObjectURL(new Blob([complet.data], { type: complet.mime }));
    const a = new Audio(url.current);
    lecteur.current = a;
    a.onended = arreter;
    a.onerror = arreter;
    // La durée d'un mp4 de MediaRecorder peut valoir Infinity sur iOS : le total vient de dureeMs.
    a.ontimeupdate = () => setPosition(Math.min(a.currentTime * 1000, audio.dureeMs || 0));
    lecteurActif = arreter;
    setLecture(true);
    try { await a.play(); } catch { arreter(); }
  };
  return html`<div class="puce-memo">
    <button type="button" class="puce-lecture" aria-label=${lecture ? 'Pause' : 'Écouter le mémo'} onClick=${basculer}>
      ${lecture ? Icones.pause() : Icones.lecture()}</button>
    <span class="puce-texte">Mémo vocal · ${lecture ? `${formaterDuree(position)} / ` : ''}${formaterDuree(audio.dureeMs)}</span>
    <button type="button" class="effacer" aria-label="Supprimer le mémo" onClick=${() => { arreter(); surSupprimer(audio); }}>${Icones.fermer()}</button>
  </div>`;
}

export function MemoVocal({ parentStore, parentId, date, assurerParent }) {
  const [memos, setMemos] = useState([]);
  const [etat, setEtat] = useState({ mode: 'repos' });
  const [duree, setDuree] = useState(0);
  const enreg = useRef(null);
  const minuteur = useRef(null);
  const verrou = useRef(null);

  const recharger = async (id = parentId) => {
    if (!id) { setMemos([]); return; }
    const liste = await repo.audios.parParent(parentStore, id);
    setMemos(liste.map(({ data, ...m }) => m));
  };
  useEffect(() => { recharger(); }, [parentStore, parentId]);

  useEffect(() => {
    const surCache = () => { if (document.visibilityState === 'hidden' && enreg.current) enreg.current.arreter('arriere-plan'); };
    const surQuitter = () => { if (enreg.current) enreg.current.arreter('arriere-plan'); };
    document.addEventListener('visibilitychange', surCache);
    window.addEventListener('pagehide', surQuitter);
    return () => {
      document.removeEventListener('visibilitychange', surCache);
      window.removeEventListener('pagehide', surQuitter);
      if (enreg.current) enreg.current.arreter('sortie');
    };
  }, []);

  const liberer = () => {
    clearInterval(minuteur.current);
    if (verrou.current) { verrou.current.release().catch(() => {}); verrou.current = null; }
  };

  const demarrer = async () => {
    if (etat.mode === 'ouverture') return;
    if (lecteurActif) lecteurActif();
    // Bouton inactif pendant la demande d'autorisation : un double toucher n'ouvre pas deux flux.
    setEtat({ mode: 'ouverture' });
    let flux;
    try {
      flux = await ouvrirMicro();
    } catch (e) {
      setEtat({ mode: 'erreur', message: e.message || MESSAGES.MICRO_INDISPONIBLE });
      return;
    }
    let rec;
    try { rec = creerEnregistreur(flux); } catch {
      flux.getTracks().forEach((t) => t.stop());
      setEtat({ mode: 'erreur', message: MESSAGES.MICRO_INDISPONIBLE });
      return;
    }
    enreg.current = rec;
    setEtat({ mode: 'enregistrement' });
    setDuree(0);
    minuteur.current = setInterval(() => setDuree(rec.duree()), 250);
    try { if (navigator.wakeLock) verrou.current = await navigator.wakeLock.request('screen'); } catch { /* facultatif */ }
    const res = await rec.fin;
    enreg.current = null;
    liberer();
    const total = res.morceaux.reduce((n, m) => n + (m.size || 0), 0);
    if (total === 0) { setEtat({ mode: 'erreur', message: MESSAGES.MICRO_INDISPONIBLE }); return; }
    try {
      const audio = await assembler(res);
      const id = parentId || (assurerParent ? await assurerParent() : null);
      if (!id) throw new Error('fiche absente');
      await repo.audios.creer({ parentStore, parentId: id, date, dureeMs: res.dureeMs, mime: audio.mime, taille: audio.taille, data: audio.donnees });
      setEtat({ mode: 'repos' });
      await recharger(id);
    } catch {
      setEtat({ mode: 'erreur', message: "Le mémo n'a pas pu être gardé cette fois." });
    }
  };

  const supprimer = async (audio) => {
    const sauve = await repo.audios.supprimer(audio.id);
    await recharger();
    afficherToast('Mémo supprimé', { libelle: 'Annuler', faire: async () => { await repo.audios.restaurer(sauve); await recharger(); } });
  };

  if (!microDisponible() && memos.length === 0) return null;
  const enCours = etat.mode === 'enregistrement';
  const ouverture = etat.mode === 'ouverture';
  return html`<div class="memo-vocal">
    ${memos.map((m) => html`<${Puce} key=${m.id} audio=${m} surSupprimer=${supprimer} />`)}
    ${microDisponible() && (enCours
    ? html`<div class="memo-en-cours">
        <button type="button" class="btn-arreter" onClick=${() => enreg.current && enreg.current.arreter('utilisateur')}>${Icones.stop()}Arrêter</button>
        <span class="duree" role="timer" aria-live="off">${formaterDuree(duree)}</span>
        <span class="onde-memo" aria-hidden="true">${ONDE.map((i) => html`<i key=${i}></i>`)}</span>
      </div>`
    : html`<button type="button" class="btn-memo" disabled=${ouverture} aria-busy=${ouverture ? 'true' : null} onClick=${demarrer}>
        ${Icones.onde()}<span>Mémo vocal</span></button>`)}
    ${etat.mode === 'erreur' && html`<p class="memo-erreur" role="status">${etat.message}</p>`}
  </div>`;
}
