import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creerPdfJpeg } from '../../public/js/export/pdf.js';

const jpegFactice = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 0xff, 0xd9]);
const txt = (u8) => new TextDecoder('latin1').decode(u8);

test('PDF d\'une page, image aux bonnes dimensions', () => {
  const pdf = creerPdfJpeg(jpegFactice, { largeurPx: 1654, hauteurPx: 2339 });
  const t = txt(pdf);
  assert.ok(t.startsWith('%PDF-1.4\n'));
  assert.match(t, /\/Count 1/);
  assert.match(t, /\/Width 1654 \/Height 2339/);
  assert.match(t, /\/Filter \/DCTDecode \/Length 10/);
  assert.ok(t.trimEnd().endsWith('%%EOF'));
});

test('table xref valide : chaque décalage pointe sur son objet', () => {
  const pdf = creerPdfJpeg(jpegFactice, { largeurPx: 10, hauteurPx: 20 });
  const t = txt(pdf);
  const debut = Number(t.match(/startxref\n(\d+)/)[1]);
  assert.ok(t.slice(debut).startsWith('xref\n0 6\n'));
  const lignes = t.slice(debut).split('\n').slice(3, 8);
  lignes.forEach((l, i) => {
    const off = Number(l.slice(0, 10));
    assert.ok(t.slice(off).startsWith(`${i + 1} 0 obj`), `objet ${i + 1}`);
  });
});

test('entrées invalides refusées', () => {
  assert.throws(() => creerPdfJpeg([1, 2], { largeurPx: 1, hauteurPx: 1 }), TypeError);
  assert.throws(() => creerPdfJpeg(jpegFactice, {}), TypeError);
});
