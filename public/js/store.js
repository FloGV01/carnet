// Petit état observable, partagé par l'interface.
export function creerStore(initial) {
  let etat = initial;
  const abonnes = new Set();
  return {
    lire: () => etat,
    maj(changement) {
      const delta = typeof changement === 'function' ? changement(etat) : changement;
      etat = { ...etat, ...delta };
      abonnes.forEach((f) => f(etat));
    },
    abonner(f) { abonnes.add(f); return () => abonnes.delete(f); },
  };
}

export const etatApp = creerStore({
  route: { nom: 'aujourdhui', params: {} },
  majDisponible: false,
  parcoursOuvert: false,
  toast: null,
});

// Enregistrements en attente (texte en cours) à vider avant une fermeture forcée de la base.
export const vidanges = new Set();
export async function viderEnregistrements(delaiMs = 2000) {
  const tout = Promise.allSettled([...vidanges].map((f) => f()));
  await Promise.race([tout, new Promise((ok) => setTimeout(ok, delaiMs))]);
}
