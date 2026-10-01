// Cycle de vie : retour au premier plan, horloge douce (minute) pour la bascule de 4 h.
export function survivreAuCycle({ surRetour, surMinute, doc = globalThis.document, maintenant = () => Date.now() }) {
  let cacheDepuis = null;
  let minuteur = null;
  const demarrer = () => { arreter(); minuteur = setInterval(() => surMinute && surMinute(), 60000); };
  const arreter = () => { if (minuteur) clearInterval(minuteur); minuteur = null; };
  const surVisibilite = () => {
    if (doc.visibilityState === 'hidden') { cacheDepuis = maintenant(); arreter(); return; }
    const absence = cacheDepuis == null ? 0 : maintenant() - cacheDepuis;
    cacheDepuis = null;
    demarrer();
    if (surRetour) surRetour(absence);
  };
  doc.addEventListener('visibilitychange', surVisibilite);
  demarrer();
  return () => { doc.removeEventListener('visibilitychange', surVisibilite); arreter(); };
}
