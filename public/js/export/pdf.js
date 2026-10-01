// PDF d'une page contenant une image JPEG pleine page (A4 par défaut). Pur.
const enc = new TextEncoder();

export function creerPdfJpeg(jpeg, { largeurPx, hauteurPx, largeurPt = 595.28, hauteurPt = 841.89 } = {}) {
  if (!(jpeg instanceof Uint8Array)) throw new TypeError('jpeg doit être un Uint8Array');
  if (!(largeurPx > 0 && hauteurPx > 0)) throw new TypeError('dimensions requises');
  const morceaux = [];
  const offsets = [];
  let taille = 0;
  const pousser = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; morceaux.push(b); taille += b.length; };
  const objet = (n, corps) => { offsets[n] = taille; pousser(`${n} 0 obj\n${corps}\nendobj\n`); };

  pousser('%PDF-1.4\n');
  pousser(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));
  objet(1, '<< /Type /Catalog /Pages 2 0 R >>');
  objet(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  objet(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${largeurPt} ${hauteurPt}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  offsets[4] = taille;
  pousser(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${largeurPx} /Height ${hauteurPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
  pousser(jpeg);
  pousser('\nendstream\nendobj\n');
  const contenu = `q ${largeurPt} 0 0 ${hauteurPt} 0 0 cm /Im0 Do Q`;
  objet(5, `<< /Length ${contenu.length} >>\nstream\n${contenu}\nendstream`);
  const debutXref = taille;
  let xref = 'xref\n0 6\n0000000000 65535 f \n';
  for (let n = 1; n <= 5; n++) xref += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`;
  pousser(`${xref}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${debutXref}\n%%EOF\n`);

  const sortie = new Uint8Array(taille);
  let pos = 0;
  for (const m of morceaux) { sortie.set(m, pos); pos += m.length; }
  return sortie;
}
