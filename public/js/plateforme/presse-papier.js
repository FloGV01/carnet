// Copie dans le presse-papier. À appeler directement dans le geste de l'utilisateur.
export function copier(texte, nav = globalThis.navigator, doc = globalThis.document) {
  if (nav.clipboard && nav.clipboard.writeText) {
    let p;
    try { p = nav.clipboard.writeText(texte); } catch { p = Promise.reject(); }
    return p.then(() => true, () => copierAncienneMethode(texte, doc));
  }
  return Promise.resolve(copierAncienneMethode(texte, doc));
}

function copierAncienneMethode(texte, doc) {
  if (!doc || !doc.createElement) return false;
  const zone = doc.createElement('textarea');
  zone.value = texte;
  zone.setAttribute('readonly', '');
  zone.className = 'visuellement-cache';
  doc.body.appendChild(zone);
  zone.select();
  try { zone.setSelectionRange(0, texte.length); } catch { /* ignoré */ }
  let ok = false;
  try { ok = doc.execCommand('copy'); } catch { ok = false; }
  zone.remove();
  return ok;
}
