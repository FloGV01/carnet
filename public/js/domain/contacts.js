// Contacts de la journée (v5) : une ligne par contact, { avec: refs contactAvec, effet: ref
// contactEffet }, comme les activités. Pur.
//
// Passage depuis la v4 (un seul « avec qui » multiple et un seul effet par jour) : le détail du
// jour devient une seule ligne, telle quelle. Rien n'est inventé : un effet noté pour
// « Famille, Collègues » reste attaché aux deux ensemble, jamais recopié sur chacun.
export function versContacts(entree) {
  if (!entree || typeof entree !== 'object') return entree;
  if (!('contactAvec' in entree) && !('contactEffet' in entree)) return entree;
  const { contactAvec, contactEffet, ...reste } = entree;
  const avec = Array.isArray(contactAvec) && contactAvec.length ? contactAvec : null;
  const effet = typeof contactEffet === 'string' && contactEffet ? contactEffet : null;
  if (!avec && !effet) return reste;
  const contacts = Array.isArray(reste.contacts) ? reste.contacts : [];
  return { ...reste, contacts: [...contacts, { avec, effet }] };
}

// Résumé d'une journée. Écran : « Famille, Amis (Ressourçant) · Collègues (Coûteux) ».
// Export PSY (dans une parenthèse) : « famille, amis : ressourçant ; collègues : coûteux ».
export function resumeContacts(contacts, lib, { minuscule = (t) => t, pourExport = false } = {}) {
  return (contacts || []).map((c) => {
    const qui = (c.avec || []).map((id) => minuscule(lib(id))).join(', ');
    const effet = c.effet ? minuscule(lib(c.effet)) : '';
    if (!qui || !effet) return qui || effet;
    return pourExport ? `${qui} : ${effet}` : `${qui} (${effet})`;
  }).filter(Boolean).join(pourExport ? ' ; ' : ' · ');
}
