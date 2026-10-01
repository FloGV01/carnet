// Générateur de journaux synthétiques à vérité connue (aucune donnée réelle).
import { generateur } from '../../public/js/analyse/stats.js';
import { addDays } from '../../public/js/domain/dates.js';

const LIEUX = ['lieu:bureau', 'lieu:teletravail', 'lieu:conge_repos'];
const SOMMEILS = ['sommeil:mal', 'sommeil:moyen', 'sommeil:bien'];

function normale(alea) { let u = 0; let v = 0; while (u === 0) u = alea(); while (v === 0) v = alea(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const borne = (x) => Math.max(1, Math.min(10, Math.round(x)));

// scenario : 'nul' | 'bureau' | 'sommeilJourMeme' | 'sommeilLendemain' | 'ar1' | 'malEnSuite'
export function generer({ jours = 180, debut = '2026-01-05', seed = 1, scenario = 'nul', effet = 3, trous = 0 } = {}) {
  const alea = generateur(seed);
  const res = [];
  let ar = 0;
  let lieuBloc = LIEUX[0];
  let sommeilPrec = 1;
  for (let i = 0; i < jours; i++) {
    const date = addDays(debut, i);
    if (scenario === 'ar1' && i % 7 === 0) lieuBloc = LIEUX[Math.floor(alea() * LIEUX.length)];
    const lieu = scenario === 'ar1' ? lieuBloc : LIEUX[Math.floor(alea() * 2)];
    let s = Math.floor(alea() * 3);
    if (scenario === 'malEnSuite') s = alea() < 0.8 ? sommeilPrec : Math.floor(alea() * 3);
    let h = 5.5 + normale(alea) * 1.6;
    if (scenario === 'bureau' && lieu === 'lieu:bureau') h += effet;
    if (scenario === 'sommeilJourMeme' || scenario === 'malEnSuite') h += (s - 1) * 1.8;
    if (scenario === 'sommeilLendemain') h += (sommeilPrec - 1) * 2.2;
    if (scenario === 'ar1') { ar = 0.6 * ar + normale(alea) * 1.6; h = 5.5 + ar; }
    sommeilPrec = s;
    if (trous && alea() < trous) continue;
    res.push({
      date, lieu, sommeilRessenti: SOMMEILS[s], humeur: borne(h), contactHumain: alea() < 0.5, sportMouvement: alea() < 0.4,
      explosions: alea() < 0.15 ? 1 : 0, traitementPris: 'traitementPris:oui', reveilsNocturnes: Math.floor(alea() * 3),
      pointsPositifs: null, heureCoucher: null, heureLever: null, notes: null,
    });
  }
  return res;
}
