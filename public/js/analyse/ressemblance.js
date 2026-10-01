// Signal de ressemblance (plan §7.7) : les 4 derniers jours ressemblent-ils, dans les chiffres,
// aux jours qui ont précédé les périodes plus basses passées ? Jamais une prévision, jamais une
// alerte. Il ne s'active que si l'historique le justifie (périodes, signature, sensibilité et
// précision historiques), et il est normal qu'il reste muet pendant des mois. Pur.
import { SEUILS } from './seuils.js';
import { mediane, moyenne, ecartType, quantile } from './stats.js';
import { calendrier } from './calendrier.js';
import { addDays, diffDays, jourEvenement } from '../domain/dates.js';
import { nombre } from './textes.js';

const S = SEUILS.signal;

export const CARACS = [
  { cle: 'ecartHumeur', plus: "une humeur plus haute que d'habitude", moins: "une humeur plus basse que d'habitude" },
  { cle: 'nuitsMal', plus: 'plus de nuits notées Mal', moins: 'moins de nuits notées Mal' },
  { cle: 'reveils', plus: 'plus de réveils la nuit', moins: 'moins de réveils la nuit' },
  { cle: 'explosions', plus: "plus d'explosions", moins: "moins d'explosions" },
  { cle: 'contact', plus: 'plus de contact humain', moins: 'moins de contact humain' },
  { cle: 'mouvement', plus: 'plus de mouvement', moins: 'moins de mouvement' },
  { cle: 'episodes', plus: "plus d'épisodes pesants", moins: "moins d'épisodes pesants" },
  { cle: 'symptomes', plus: 'plus de symptômes notés', moins: 'moins de symptômes notés' },
];

// Ligne de base et écart propre à chaque jour (fenêtre [i-60, i-8]).
function bases(h) {
  const B = new Array(h.length).fill(null);
  const G = new Array(h.length).fill(null);
  for (let i = 0; i < h.length; i++) {
    const vals = [];
    for (let k = Math.max(0, i - S.baseDe); k <= i - S.baseA; k++) if (h[k] != null) vals.push(h[k]);
    if (vals.length < S.baseMin) continue;
    const med = mediane(vals);
    const mad = mediane(vals.map((v) => Math.abs(v - med)));
    B[i] = med;
    G[i] = Math.min(S.plafond, Math.max(S.ecartMin, 1.4826 * mad));
  }
  return { B, G };
}

// Périodes plus basses : suites de jours bas (moyenne sur 3 jours sous la base), trous de 3 jours
// au plus, au moins 4 jours bas, fusion à moins de 10 jours.
export function periodesBasses(h) {
  const { B, G } = bases(h);
  const bas = h.map((_, i) => {
    if (B[i] == null) return false;
    const vals = [];
    for (let k = Math.max(0, i - S.lissage + 1); k <= i; k++) if (h[k] != null) vals.push(h[k]);
    if (vals.length < S.lissageMin) return false;
    const m3 = moyenne(vals);
    return m3 <= B[i] - G[i] && m3 <= 5;
  });
  const suites = [];
  let courant = null;
  for (let i = 0; i < bas.length; i++) {
    if (!bas[i]) continue;
    if (courant && i - courant.fin - 1 <= S.trouMax) { courant.fin = i; courant.n++; } else { courant = { debut: i, fin: i, n: 1 }; suites.push(courant); }
  }
  const periodes = [];
  for (const s of suites.filter((x) => x.n >= S.minJoursBas)) {
    const prec = periodes[periodes.length - 1];
    if (prec && s.debut - prec.fin < S.fusion) { prec.fin = s.fin; prec.n += s.n; } else periodes.push({ ...s });
  }
  for (const p of periodes) {
    let d = p.debut;
    for (let i = Math.max(0, p.debut - 2); i <= p.fin; i++) if (h[i] != null && B[i] != null && h[i] <= B[i] - G[i]) { d = i; break; }
    p.debut = d;
  }
  return { periodes, B, G, bas };
}

// Profil d'une fenêtre de 4 jours se terminant au jour `fin` (indice).
function profil(fin, { entrees, h, B, episodesParJour, symptomesParJour, agreables }) {
  const debut = fin - S.fenetre + 1;
  if (debut < 0) return null;
  let notes = 0;
  const acc = { hum: [], mal: [], rev: [], exp: [], con: [], mou: [], epi: 0, sym: 0 };
  for (let i = debut; i <= fin; i++) {
    const j = entrees[i];
    if (j) notes++;
    if (h[i] != null) acc.hum.push(h[i]);
    if (j && j.sommeilRessenti) acc.mal.push(j.sommeilRessenti === 'sommeil:mal' ? 1 : 0);
    if (j && j.reveilsNocturnes != null) acc.rev.push(j.reveilsNocturnes);
    if (j && j.explosions != null) acc.exp.push(j.explosions);
    if (j && j.contactHumain != null) acc.con.push(j.contactHumain ? 1 : 0);
    if (j && j.sportMouvement != null) acc.mou.push(j.sportMouvement ? 1 : 0);
    acc.epi += (episodesParJour[i] || []).filter((e) => e.emotion && !agreables.has(e.emotion)).length;
    acc.sym += (symptomesParJour[i] || 0);
  }
  if (notes < S.fenetreMin) return null;
  const base = B[fin];
  return {
    fin,
    valeurs: {
      ecartHumeur: acc.hum.length && base != null ? moyenne(acc.hum) - base : null,
      nuitsMal: acc.mal.length ? moyenne(acc.mal) : null,
      reveils: acc.rev.length ? moyenne(acc.rev) : null,
      explosions: acc.exp.length ? moyenne(acc.exp) : null,
      contact: acc.con.length ? moyenne(acc.con) : null,
      mouvement: acc.mou.length ? moyenne(acc.mou) : null,
      episodes: acc.epi / S.fenetre,
      symptomes: acc.sym / S.fenetre,
    },
  };
}

function signatureDe(precurseurs, retenues) {
  const sig = {};
  for (const c of retenues) {
    const zs = precurseurs.map((p) => p.z[c]).filter((z) => z != null);
    if (zs.length < 2) continue;
    const m = moyenne(zs);
    const memeSigne = zs.filter((z) => Math.sign(z) === Math.sign(m)).length / zs.length;
    if (Math.abs(m) >= S.signatureZ && memeSigne >= S.signatureAccord) sig[c] = m;
  }
  return Object.keys(sig).length >= S.minCaracs ? sig : null;
}

function distance(z, sig) {
  const cles = Object.keys(sig).filter((c) => z[c] != null);
  if (cles.length < S.minCaracs) return null;
  return moyenne(cles.map((c) => (z[c] - sig[c]) ** 2));
}

function seuilDistance(sig, ordinaires) {
  const d = ordinaires.map((f) => distance(f.z, sig)).filter((x) => x != null);
  return d.length ? quantile(d, S.quantile) : null;
}

export function ressemblance({ journal, episodes = [], symptomes = [] }, { aujourdhui, items = [], actif = true }) {
  const inactif = (raison) => ({ actif: false, raison, ressemble: false });
  if (!actif) return inactif('desactive');
  // Historique borné aux 3 dernières années : une date aberrante ne fait pas exploser le calcul.
  const depuis = addDays(aujourdhui, -SEUILS.calendrier.histoireSignal);
  const cal = calendrier(journal.filter((j) => j.date <= aujourdhui && j.date >= depuis), aujourdhui);
  const { entrees, debut } = cal;
  if (!debut) return inactif('peu_de_jours');
  const h = entrees.map((j) => (j && j.humeur != null ? j.humeur : null));
  if (h.filter((x) => x != null).length < S.minJoursHumeur) return inactif('peu_de_jours');

  const idx = (date) => diffDays(debut, date);
  const episodesParJour = [];
  for (const e of episodes) { const i = idx(jourEvenement(e.date, e.heure)); if (i >= 0 && i < h.length) (episodesParJour[i] ||= []).push(e); }
  const symptomesParJour = [];
  for (const s of symptomes) { const i = idx(s.date); if (i >= 0 && i < h.length) symptomesParJour[i] = (symptomesParJour[i] || 0) + 1; }
  const agreables = new Set(items.filter((i) => i.agreable).map((i) => i.id));

  const { periodes, B } = periodesBasses(h);
  const contexte = { entrees, h, B, episodesParJour, symptomesParJour, agreables };
  const fenetres = [];
  for (let fin = 0; fin < h.length; fin++) { const p = profil(fin, contexte); if (p) fenetres.push(p); }

  // Normalisation sur toutes les fenêtres valides ; caractéristiques présentes dans ≥ 50 %.
  const stats = {};
  const retenues = [];
  for (const { cle } of CARACS) {
    const vals = fenetres.map((f) => f.valeurs[cle]).filter((v) => v != null);
    if (vals.length < fenetres.length * S.couvertureCarac) continue;
    stats[cle] = { m: moyenne(vals), sd: Math.max(S.sdPlancher, ecartType(vals) || 0) };
    retenues.push(cle);
  }
  for (const f of fenetres) {
    f.z = {};
    for (const c of retenues) f.z[c] = f.valeurs[c] == null ? null : (f.valeurs[c] - stats[c].m) / stats[c].sd;
  }
  const parFin = new Map(fenetres.map((f) => [f.fin, f]));

  // Une période dont la fin touche les derniers jours est « en cours » : le signal se tait.
  const enCours = periodes.some((p) => h.length - 1 - p.fin <= S.trouMax);
  const passees = periodes.filter((p) => h.length - 1 - p.fin > S.trouMax);
  const avec = passees.map((p) => ({ p, avant: parFin.get(p.debut - 1) })).filter((x) => x.avant);
  if (avec.length < S.minPeriodes) return inactif('peu_de_periodes');
  const exclus = (fin) => periodes.some((p) => fin - S.fenetre + 1 <= p.fin + S.margeApres && fin >= p.debut - S.margeAvant);
  const ordinaires = fenetres.filter((f) => !exclus(f.fin));
  if (ordinaires.length < S.minOrdinaires) return inactif('peu_ordinaires');
  const sig = signatureDe(avec.map((x) => x.avant), retenues);
  if (!sig) return inactif('pas_de_signature');
  const seuil = seuilDistance(sig, ordinaires);
  if (seuil == null) return inactif('pas_de_signature');

  // Sensibilité « leave-one-out » et précision historique (signature refaite sans la période testée).
  const sansP = new Map();
  for (const x of avec) {
    const s2 = signatureDe(avec.filter((y) => y !== x).map((y) => y.avant), retenues);
    sansP.set(x.p, s2 ? { sig: s2, seuil: seuilDistance(s2, ordinaires) } : null);
  }
  const retrouves = avec.filter((x) => { const o = sansP.get(x.p); if (!o || o.seuil == null) return false; const d = distance(x.avant.z, o.sig); return d != null && d <= o.seuil; }).length;
  const sensibilite = retrouves / avec.length;
  if (sensibilite < S.sensibiliteMin) return inactif('sensibilite');

  let parle = 0; let suivi = 0;
  for (const f of fenetres) {
    if (periodes.some((p) => f.fin >= p.debut && f.fin - S.fenetre + 1 <= p.fin)) continue;
    const proche = avec.find((x) => x.p.debut > f.fin && x.p.debut <= f.fin + S.horizonPrecision);
    const o = proche ? sansP.get(proche.p) : { sig, seuil };
    if (!o || o.seuil == null) continue;
    const d = distance(f.z, o.sig);
    if (d == null || d > o.seuil) continue;
    parle++;
    if (proche) suivi++;
  }
  const precision = parle ? suivi / parle : 0;
  if (precision < S.precisionMin) return inactif('precision');

  const actuelle = parFin.get(h.length - 1);
  if (!actuelle) return { actif: true, raison: 'fenetre_incomplete', ressemble: false };
  if (enCours) return { actif: true, raison: 'periode_en_cours', ressemble: false };
  const d = distance(actuelle.z, sig);
  const ressemble = d != null && d <= seuil;

  const caracs = Object.keys(sig)
    .filter((c) => actuelle.z[c] != null && Math.sign(actuelle.z[c]) === Math.sign(sig[c]))
    .sort((a, b) => Math.min(Math.abs(actuelle.z[b]), Math.abs(sig[b])) - Math.min(Math.abs(actuelle.z[a]), Math.abs(sig[a])));
  const texteCarac = (c) => { const def = CARACS.find((x) => x.cle === c); return sig[c] >= 0 ? def.plus : def.moins; };
  const morceaux = caracs.slice(0, 2).map(texteCarac);
  const par = morceaux.length ? `, surtout par ${morceaux.join(' et ')},` : '';
  const brut = (liste, c) => moyenne(liste.map((f) => f.valeurs[c]).filter((v) => v != null));
  return {
    actif: true, raison: null, ressemble,
    phrase: `Ces 4 derniers jours ressemblent${par} aux jours qui ont précédé certaines périodes plus basses. C'est une ressemblance dans les chiffres, pas une prévision.`,
    phraseExport: `ces 4 derniers jours ressemblent${par} aux jours qui ont précédé certaines périodes plus basses. Ressemblance dans les chiffres, pas une prévision.`,
    detail: Object.keys(sig).map((c) => ({
      cle: c, libelle: texteCarac(c),
      cesJours: actuelle.valeurs[c], avant: brut(avec.map((x) => x.avant), c), habitude: brut(ordinaires, c),
    })),
  };
}

export const formaterDetail = (v) => nombre(v, 1);
