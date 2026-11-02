// Bien-être par besoin (v10, spec §7 et §14.4) : les entrées de l'accueil, toujours dans cet ordre (« Programme », la
// quatrième, ouvre l'écran du Programme : elle n'a pas de liste ici), et tout ce qui peut être lancé, épinglé ou repris :
// les exercices de domain/exercices.js, la cohérence cardiaque, les deux minuteurs et les sons de fond. Un même élément
// peut paraître dans plusieurs entrées ; Savourer n'est dans aucune (il se propose après une émotion). Pur.
import { EXERCICES, exerciceDe } from './exercices.js';
import { NOM_RESPIRATION } from './respiration.js';

// Les éléments qui ne sont pas des exercices : leur identifiant et leur titre.
const AUTRES = Object.freeze({
  coherence: NOM_RESPIRATION,
  minuteur: 'Minuteur silencieux',
  concentration: 'Minuteur de concentration',
  'sons-de-fond': 'Sons de fond',
});

export const ELEMENTS_BIEN_ETRE = Object.freeze([...EXERCICES.map((x) => x.id), ...Object.keys(AUTRES)]);

export const ENTREES = Object.freeze([
  { id: 'calmer', titre: 'Me calmer vite', elements: ['soupir', 'expiration-longue', 'ancrage-court', 'noting', 'coherence', 'minuteur'] },
  { id: 'dormir', titre: 'Dormir ou me rendormir', elements: ['reveil-nuit', 'expiration-longue', 'scan-court', 'sons-de-fond'] },
  { id: 'concentrer', titre: 'Me concentrer', elements: ['concentration', 'sons-de-fond', 'noting'] },
].map((x) => Object.freeze({ ...x, elements: Object.freeze(x.elements) })));

// Le titre d'un élément ; une chaîne vide pour un identifiant inconnu.
export const titreElement = (id) => {
  const exercice = exerciceDe(id);
  if (exercice) return exercice.titre;
  return typeof id === 'string' && Object.hasOwn(AUTRES, id) ? AUTRES[id] : '';
};
