// « Mon plan » (v4) : rédigé par l'utilisateur, si possible avec son soignant. L'app ne propose
// aucun contenu : elle range ses mots et les rouvre au même endroit. Pur ; stocké dans meta.monPlan.
export const RUBRIQUES_PLAN = [
  ['premiersSignes', 'Mes premiers signes'],
  ['quandCaMonte', 'Quand ça monte, je…'],
  ['siSurcharge', 'Si c\'est trop, je…'],
  ['pourRecuperer', 'Pour récupérer, je…'],
  ['prevenir', 'Qui prévenir'],
];

const propre = (v) => (typeof v === 'string' && v.normalize('NFC').trim() ? v.normalize('NFC').trim() : null);

export function normaliserPlan(brut) {
  const b = brut && typeof brut === 'object' ? brut : {};
  const plan = Object.fromEntries(RUBRIQUES_PLAN.map(([cle]) => [cle, propre(b[cle])]));
  plan.siAlors = (Array.isArray(b.siAlors) ? b.siAlors : [])
    .map((x) => ({ si: propre(x && x.si), alors: propre(x && x.alors) }))
    .filter((x) => x.si || x.alors);
  return plan;
}

export const planVide = (p) => RUBRIQUES_PLAN.every(([cle]) => !p[cle]) && p.siAlors.length === 0;

// Retire un « si… alors… » (Annuler après un ajout), sans toucher au reste du plan.
export function retirerSiAlors(p, si, alors) {
  const cible = normaliserPlan({ siAlors: [{ si, alors }] }).siAlors[0];
  const n = normaliserPlan(p);
  if (!cible) return n;
  return { ...n, siAlors: n.siAlors.filter((x) => x.si !== cible.si || x.alors !== cible.alors) };
}

// Ajoute un « si… alors… » venu d'un Après coup, sans doublon.
export function ajouterSiAlors(p, si, alors) {
  const n = normaliserPlan({ ...p, siAlors: [...p.siAlors, { si, alors }] });
  const vus = new Set();
  n.siAlors = n.siAlors.filter((x) => { const k = `${x.si}|${x.alors}`; if (vus.has(k)) return false; vus.add(k); return true; });
  return n;
}

// Titre de la rubrique des « si… alors… » (liste de Mon plan, cartes de « Une chose à la fois »).
export const TITRE_SI_ALORS = 'Si… alors…';
export const phraseSiAlors = (x) => `Si ${x.si || '…'}, alors ${x.alors || '…'}`;

// « Une chose à la fois » (v6, méta `uneChoseALaFois`) : quelles rubriques passent en cartes. Par défaut
// toutes, sauf « Mes premiers signes », et sans les « si… alors… ».
export const UNE_CHOSE_DEFAUT = Object.freeze({
  rubriques: Object.freeze(RUBRIQUES_PLAN.map(([cle]) => cle).filter((cle) => cle !== 'premiersSignes')),
  siAlors: false,
});

// Lecture d'un réglage : un champ absent ou d'un type inattendu prend sa valeur par défaut ; une liste
// vide est un choix valide (aucune rubrique). Les rubriques sortent dans l'ordre de Mon plan.
export function normaliserUneChose(brut) {
  const b = brut && typeof brut === 'object' ? brut : {};
  return {
    rubriques: Array.isArray(b.rubriques)
      ? RUBRIQUES_PLAN.map(([cle]) => cle).filter((cle) => b.rubriques.includes(cle))
      : [...UNE_CHOSE_DEFAUT.rubriques],
    siAlors: b.siAlors === true,
  };
}

// Les cartes de « Une chose à la fois » : une par ligne non vide de chaque rubrique choisie, puis une par
// « si… alors… » si les réglages le demandent. `rubrique` est le nom affiché en petit au-dessus du texte.
export function cartesPlan(plan, reglages) {
  const p = normaliserPlan(plan);
  const { rubriques, siAlors } = normaliserUneChose(reglages);
  const cartes = RUBRIQUES_PLAN.filter(([cle]) => rubriques.includes(cle)).flatMap(([cle, titre]) => (p[cle] || '')
    .split(/\r?\n|\r/).map((ligne) => ligne.trim()).filter(Boolean).map((texte) => ({ rubrique: titre, texte })));
  if (siAlors) cartes.push(...p.siAlors.map((x) => ({ rubrique: TITRE_SI_ALORS, texte: phraseSiAlors(x) })));
  return cartes;
}
