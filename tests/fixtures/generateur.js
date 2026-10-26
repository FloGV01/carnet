// Générateur de journaux synthétiques à vérité connue (aucune donnée réelle).
import { addDays, jourSemaine } from '../../public/js/domain/dates.js';

// Générateur pseudo-aléatoire semé (mulberry32) : mêmes données, même graine. Il vivait dans analyse/stats.js, qui ne
// garde plus que la moyenne et la médiane (v8, Q32) : seuls les tests s'en servent.
export function generateur(graine) {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LIEUX = ['lieu:bureau', 'lieu:teletravail', 'lieu:conge_repos'];
const SOMMEILS = ['sommeil:mal', 'sommeil:moyen', 'sommeil:bien'];

function normale(alea) { let u = 0; let v = 0; while (u === 0) u = alea(); while (v === 0) v = alea(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const borne = (x) => Math.max(1, Math.min(10, Math.round(x)));
const pad = (n) => String(n).padStart(2, '0');

// v6 : de 0 à 6 relevés du moment (nombre uniforme), entre 8 h et 22 h, entiers de 1 à 10, tirés
// autour de l'humeur latente du jour (bruit σ = 1). Triés par heure.
function relevesDuJour(alea, date, h) {
  const n = Math.floor(alea() * 7);
  const minutes = Array.from({ length: n }, () => 8 * 60 + Math.floor(alea() * (14 * 60 + 1))).sort((a, b) => a - b);
  return minutes.map((m, k) => ({
    id: `hu-${date}-${k}`, date, heure: `${pad(Math.floor(m / 60))}:${pad(m % 60)}`, humeur: borne(h + normale(alea)),
    energie: null, vers: null, faisais: null,
  }));
}

// scenario : 'nul' | 'bureau' | 'sommeilJourMeme' | 'sommeilLendemain' | 'ar1' | 'malEnSuite' | 'jourMemeAR' | 'ar1Long' | 'emploiDuTemps'
//   | 'lente' (composante lente φ = 0,98 + bruit rapide) | 'decalage' (AR(1), puis + effet sur les 28 derniers jours)
// releves (v6) : renvoie { journal, humeurs } ; l'humeur n'est plus notée le soir (journal.humeur = null)
// mais en relevés du moment autour de l'humeur latente, effets plantés compris. Les relevés ont leur
// propre suite aléatoire : le journal est, à l'humeur près, celui de la forme par défaut. Un jour
// sauté (trous) n'a ni soir ni relevés.
export function generer({ jours = 180, debut = '2026-01-05', seed = 1, scenario = 'nul', effet = 3, trous = 0, releves = false } = {}) {
  const alea = generateur(seed);
  const aleaReleves = generateur((seed ^ 0x5eed5eed) >>> 0);
  const res = [];
  const humeurs = [];
  let ar = 0;
  let lent = 0;
  let lieuBloc = LIEUX[0];
  let sommeilPrec = 1;
  for (let i = 0; i < jours; i++) {
    const date = addDays(debut, i);
    if (scenario === 'ar1' && (i + seed) % 7 === 0) lieuBloc = LIEUX[Math.floor(alea() * LIEUX.length)];
    if (scenario === 'ar1Long' && alea() < 1 / 14) lieuBloc = LIEUX[Math.floor(alea() * LIEUX.length)];
    // Emploi du temps fixe : bureau lun/mar/jeu, télétravail mer/ven, repos sam/dim.
    const jsem = (jourSemaine(addDays(debut, i)));
    const lieuEdt = [0, 1, 3].includes(jsem) ? LIEUX[0] : [2, 4].includes(jsem) ? LIEUX[1] : LIEUX[2];
    const lieu = scenario === 'ar1' || scenario === 'ar1Long' ? lieuBloc : scenario === 'emploiDuTemps' ? lieuEdt : LIEUX[Math.floor(alea() * 2)];
    let s = Math.floor(alea() * 3);
    if (scenario === 'malEnSuite') s = alea() < 0.8 ? sommeilPrec : Math.floor(alea() * 3);
    if (scenario === 'ar1Long' && alea() < 0.9) s = sommeilPrec;
    let h = 5.5 + normale(alea) * 1.6;
    if ((scenario === 'bureau' || scenario === 'emploiDuTemps') && lieu === 'lieu:bureau') h += effet;
    if (scenario === 'sommeilJourMeme' || scenario === 'malEnSuite') h += (s - 1) * 1.8;
    if (scenario === 'sommeilLendemain') h += (sommeilPrec - 1) * 2.2;
    if (scenario === 'ar1') { ar = 0.6 * ar + normale(alea) * 1.6; h = 5.5 + ar; }
    if (scenario === 'ar1Long') { ar = 0.9 * ar + normale(alea) * 1.6 * Math.sqrt(1 - 0.81); h = 5.5 + ar; }
    if (scenario === 'jourMemeAR') { ar = 0.7 * ar + normale(alea) * 1.15; h = 5.5 + ar + (s - 1) * 1.5; }
    if (scenario === 'lente') { lent = 0.98 * lent + normale(alea) * 0.2; ar = 0.5 * ar + normale(alea) * 1.2; h = 5.5 + lent + ar; }
    if (scenario === 'decalage') { ar = 0.6 * ar + normale(alea) * 1.6; h = 5.5 + ar + (i >= jours - 28 ? effet : 0); }
    sommeilPrec = s;
    if (trous && alea() < trous) continue;
    res.push({
      date, lieu, sommeilRessenti: SOMMEILS[s], humeur: releves ? null : borne(h), contactHumain: alea() < 0.5, sportMouvement: alea() < 0.4,
      explosions: alea() < 0.15 ? 1 : 0, traitementPris: 'traitementPris:oui', reveilsNocturnes: Math.floor(alea() * 3),
      pointsPositifs: null, heureCoucher: null, heureLever: null, notes: null,
    });
    if (releves) humeurs.push(...relevesDuJour(aleaReleves, date, h));
  }
  return releves ? { journal: res, humeurs } : res;
}

// Périodes plus basses plantées, chacune précédée de 4 jours « signature » (nuits Mal, pas de
// contact, réveils). leurres : fenêtres signature NON suivies d'une période (précision basse).
export function genererPeriodes({ jours = 320, debut = '2025-11-01', seed = 1, periodes = [90, 150, 210, 270], leurres = [], signatureAvant = true } = {}) {
  const alea = generateur(seed);
  const res = [];
  const dansSignature = (i) => (signatureAvant && periodes.some((p) => i >= p - 4 && i < p)) || leurres.some((l) => i >= l && i < l + 4);
  const dansPeriode = (i) => periodes.some((p) => i >= p && i < p + 7);
  for (let i = 0; i < jours; i++) {
    const sig = dansSignature(i);
    const bas = dansPeriode(i);
    let h = 6.8 + normale(alea) * 0.9;
    if (bas) h = 2.5 + alea();
    else if (sig) h = 5.8 + normale(alea) * 0.6;
    res.push({
      date: addDays(debut, i), lieu: LIEUX[Math.floor(alea() * 2)],
      sommeilRessenti: sig ? 'sommeil:mal' : SOMMEILS[1 + Math.floor(alea() * 2)], humeur: borne(h),
      contactHumain: sig ? false : alea() < 0.8, sportMouvement: alea() < 0.5, explosions: 0, traitementPris: 'traitementPris:oui',
      reveilsNocturnes: sig ? 3 : Math.floor(alea() * 2), pointsPositifs: null, heureCoucher: null, heureLever: null, notes: null,
    });
  }
  return res;
}
