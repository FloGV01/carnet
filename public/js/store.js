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
