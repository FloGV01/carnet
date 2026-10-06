// « Tendances » (v5) : une phrase quand l'humeur du soir des 4 dernières semaines s'écarte
// nettement de celle des 8 semaines d'avant. Une seule famille (l'humeur du soir), des fenêtres
// fixes jamais choisies après coup, et une échelle tirée de l'historique de l'utilisateur.
// Version prudente : peu de phrases, très rarement à tort (calibration : tests/calibration).
// La phrase dit ce que montrent les chiffres, jamais pourquoi. Pur.
import { addDays, diffDays } from '../domain/dates.js';
import { moyenne } from './stats.js';
import { SEUILS } from './seuils.js';

const S = SEUILS.tendances;

const humeurValide = (j) => j && Number.isInteger(j.humeur) && j.humeur >= 1 && j.humeur <= 10;

function valeurs(parDate, du, au) {
  const res = [];
  for (let d = du; d <= au; d = addDays(d, 1)) { const h = parDate.get(d); if (h != null) res.push(h); }
  return res;
}

function variance(xs) {
  const m = moyenne(xs);
  return xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
}

// Écart du jour J : R = [J-27, J], B = [J-83, J-28]. L'échelle vient des moyennes de fenêtres de
// 28 jours (glissant de 7 jours) sur l'année qui précède R : Var(moy. R − moy. B) ≈ 1,5 × V28.
export function ecartTendance(parDate, J) {
  const finB = addDays(J, -S.recent);
  const R = valeurs(parDate, addDays(J, -(S.recent - 1)), J);
  const B = valeurs(parDate, addDays(J, -(S.recent + S.avant - 1)), finB);
  if (R.length < S.minRecent || B.length < S.minAvant) return { calculable: false };
  // Garde silencieuse : un rythme de saisie très différent entre R et B fausserait les moyennes.
  const tauxR = R.length / S.recent;
  const tauxB = B.length / S.avant;
  if (tauxR < S.tauxSaisie * tauxB || tauxR * S.tauxSaisie > tauxB) return { calculable: false };
  const moyennes = [];
  const limite = addDays(J, -S.historique);
  for (let fin = finB; addDays(fin, -(S.lot - 1)) >= limite; fin = addDays(fin, -S.pasLots)) {
    const v = valeurs(parDate, addDays(fin, -(S.lot - 1)), fin);
    if (v.length >= S.minLotHumeurs) moyennes.push(moyenne(v));
  }
  if (moyennes.length < S.minLots) return { calculable: false, historique: false };
  const se = Math.sqrt(S.facteur * Math.max(S.varPlancher, variance(moyennes)));
  const moyR = moyenne(R);
  const moyB = moyenne(B);
  const d = moyR - moyB;
  return { calculable: true, d, z: d / se, moyR, moyB };
}

const signe = (x) => (x > 0 ? 'haut' : 'bas');

// deja : clés déjà affichées (constatsAffiches), pour ne pas faire clignoter la phrase.
export function tendances(journal, aujourdhui, deja = new Set()) {
  const parDate = new Map(journal.filter((j) => humeurValide(j) && j.date <= aujourdhui).map((j) => [j.date, j.humeur]));
  const dates = [...parDate.keys()].sort();
  if (!dates.length || diffDays(dates[0], aujourdhui) + 1 < S.minJoursHistoire) return { statut: 'insuffisant', constat: null };
  const e = ecartTendance(parDate, aujourdhui);
  if (e.historique === false) return { statut: 'insuffisant', constat: null };
  if (!e.calculable) return { statut: 'ok', constat: null };
  const sens = signe(e.d);
  const cle = `tendance:humeur:${sens}`;
  const net = (x) => x.calculable && Math.abs(x.z) >= S.zEntree && Math.abs(x.d) >= S.ecartMin;
  let retenu = false;
  if (deja.has(cle)) {
    retenu = Math.abs(e.z) >= S.zSortie && Math.abs(e.d) >= S.ecartSortie;
  } else if (net(e)) {
    // Stabilité : net aussi, et dans le même sens, sur chacune des 6 journées précédentes.
    retenu = true;
    for (let k = 1; k < S.joursStables && retenu; k++) {
      const p = ecartTendance(parDate, addDays(aujourdhui, -k));
      retenu = net(p) && signe(p.d) === sens;
    }
  }
  return { statut: 'ok', constat: retenu ? { cle, sens, moyR: e.moyR, moyB: e.moyB, d: e.d } : null };
}
