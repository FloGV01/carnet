// Traitement actuel : ce qui est pris en ce moment, saisi à la main (nom et dose par moment).
// L'app ne calcule rien et ne commente rien : elle range et compare deux versions pour
// décrire un changement en une phrase, reprise dans une fiche « Changement / ajustement ». Pur.

export const MOMENTS = [
  ['matin', 'Matin'], ['midi', 'Midi'], ['apresMidi', 'Après-midi'], ['soir', 'Soir'], ['coucher', 'Coucher'],
];
const CLES = MOMENTS.map(([cle]) => cle);
const NOM_MOMENT = Object.fromEntries(MOMENTS.map(([cle, nom]) => [cle, nom.toLowerCase()]));

const propre = (v) => {
  if (typeof v !== 'string') return null;
  const t = v.normalize('NFC').trim().replace(/\s+/g, ' ');
  return t === '' ? null : t;
};

// Forme stable : { depuis, lignes: [{ id, nom, doses: { matin, ... } }] } ; une ligne vide disparaît.
export function normaliserTraitement(brut) {
  const b = brut && typeof brut === 'object' ? brut : {};
  const lignes = (Array.isArray(b.lignes) ? b.lignes : []).map((l) => ({
    id: String(l && l.id ? l.id : ''),
    nom: propre(l && l.nom),
    doses: Object.fromEntries(CLES.map((c) => [c, propre(l && l.doses && l.doses[c])])),
  })).filter((l) => l.id && (l.nom || CLES.some((c) => l.doses[c])));
  const depuis = typeof b.depuis === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.depuis) ? b.depuis : null;
  return { depuis, lignes };
}

// Moments affichés : seulement ceux qui ont au moins une dose (tous si rien n'est encore saisi).
export function momentsUtilises(t) {
  const utilises = MOMENTS.filter(([c]) => t.lignes.some((l) => l.doses[c]));
  return utilises.length ? utilises : MOMENTS;
}

const nomLigne = (l) => l.nom || 'médicament sans nom';
const posologie = (l) => CLES.filter((c) => l.doses[c]).map((c) => `${NOM_MOMENT[c]} ${l.doses[c]}`).join(', ');

// Une phrase par ligne : « Matin ½ · Après-midi ½ · Soir 1 » (page des soignants, consultation).
export function resumeLigne(l) {
  return CLES.filter((c) => l.doses[c]).map((c) => `${NOM_MOMENT[c]} ${l.doses[c]}`).join(' · ');
}

// Ce qui a changé entre deux versions, en phrases courtes ; [] si rien de notable.
export function decrireChangements(avantBrut, apresBrut) {
  const avant = normaliserTraitement(avantBrut);
  const apres = normaliserTraitement(apresBrut);
  const parId = new Map(avant.lignes.map((l) => [l.id, l]));
  const phrases = [];
  for (const l of apres.lignes) {
    const a = parId.get(l.id);
    parId.delete(l.id);
    if (!a) { phrases.push(`Ajout : ${nomLigne(l)}${posologie(l) ? ` (${posologie(l)})` : ''}`); continue; }
    const morceaux = [];
    if (a.nom !== l.nom) morceaux.push(`nom ${a.nom || '·'} → ${l.nom || '·'}`);
    for (const c of CLES) if (a.doses[c] !== l.doses[c]) morceaux.push(`${NOM_MOMENT[c]} ${a.doses[c] || '·'} → ${l.doses[c] || '·'}`);
    if (morceaux.length) phrases.push(`${nomLigne(l)} : ${morceaux.join(', ')}`);
  }
  for (const a of parId.values()) phrases.push(`Arrêt : ${nomLigne(a)}`);
  return phrases;
}
