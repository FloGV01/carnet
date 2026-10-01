// Enregistreur de mémos vocaux : getUserMedia + MediaRecorder, en AAC (audio/mp4)
// quand c'est possible. Aucune dépendance au DOM : navigateur et horloge sont injectables.
export const DUREE_MAX_MS = 5 * 60 * 1000;
export const DEBIT = 64000;

export const MESSAGES = {
  MICRO_REFUSE: "Micro non autorisé. Tu peux l'activer dans les réglages de l'iPhone.",
  MICRO_INDISPONIBLE: 'Le micro ne répond pas pour l\'instant. Tu peux écrire, ou dicter avec le clavier.',
};

export function formatsSupportes(MR = globalThis.MediaRecorder) {
  const tester = (t) => { try { return Boolean(MR && MR.isTypeSupported && MR.isTypeSupported(t)); } catch { return false; } };
  return { mp4: tester('audio/mp4'), aac: tester('audio/mp4;codecs=mp4a.40.2'), webm: tester('audio/webm;codecs=opus') };
}

export function choisirMime(MR = globalThis.MediaRecorder) {
  return formatsSupportes(MR).mp4 ? 'audio/mp4' : '';
}

export function microDisponible(nav = globalThis.navigator, MR = globalThis.MediaRecorder) {
  return Boolean(nav && nav.mediaDevices && nav.mediaDevices.getUserMedia && MR);
}

class ErreurMicro extends Error {
  constructor(code, cause) { super(MESSAGES[code]); this.code = code; this.cause = cause; }
}

async function etatPermission(nav) {
  try {
    if (!nav.permissions || !nav.permissions.query) return null;
    return (await nav.permissions.query({ name: 'microphone' })).state;
  } catch { return null; }
}

export async function traduireErreur(e, nav = globalThis.navigator) {
  if (e && e.name === 'NotAllowedError') {
    const etat = await etatPermission(nav);
    return new ErreurMicro(etat === 'granted' ? 'MICRO_INDISPONIBLE' : 'MICRO_REFUSE', e);
  }
  return new ErreurMicro('MICRO_INDISPONIBLE', e);
}

// À appeler directement dans le geste : getUserMedia est le premier appel asynchrone.
export async function ouvrirMicro(nav = globalThis.navigator) {
  try {
    return await nav.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
  } catch (e) {
    throw await traduireErreur(e, nav);
  }
}

export function creerEnregistreur(flux, {
  MR = globalThis.MediaRecorder,
  dureeMax = DUREE_MAX_MS,
  maintenant = () => Date.now(),
  minuteurs = { set: (f, ms) => setTimeout(f, ms), clear: (id) => clearTimeout(id) },
} = {}) {
  const mime = choisirMime(MR);
  const options = { audioBitsPerSecond: DEBIT };
  if (mime) options.mimeType = mime;
  const rec = new MR(flux, options);
  const morceaux = [];
  const debut = maintenant();
  let fini = false;
  let resoudre;
  const fin = new Promise((r) => { resoudre = r; });

  const terminer = (raison) => {
    if (fini) return;
    fini = true;
    minuteurs.clear(minuteur);
    for (const piste of flux.getTracks()) { try { piste.stop(); } catch { /* déjà arrêtée */ } }
    resoudre({ morceaux: morceaux.slice(), mime: rec.mimeType || mime || 'audio/mp4', dureeMs: Math.min(maintenant() - debut, dureeMax), raison });
  };
  let raisonArret = 'utilisateur';
  rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) morceaux.push(e.data); };
  rec.onstop = () => terminer(raisonArret);
  rec.onerror = () => terminer('erreur');
  const minuteur = minuteurs.set(() => arreter('duree'), dureeMax);

  let arretDemande = false;
  function arreter(raison = 'utilisateur') {
    if (fini || arretDemande) return fin;
    arretDemande = true;
    raisonArret = raison;
    try {
      if (rec.state !== 'inactive') rec.stop(); else terminer(raison);
    } catch { terminer(raison); }
    return fin;
  }

  rec.start(1000);
  return { arreter, fin, morceaux, duree: () => maintenant() - debut, mime: () => rec.mimeType || mime };
}

export async function assembler({ morceaux, mime }) {
  const blob = new Blob(morceaux, { type: mime || 'audio/mp4' });
  return { donnees: await blob.arrayBuffer(), taille: blob.size, mime: blob.type || 'audio/mp4' };
}
