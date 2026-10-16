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

// ---------- v6 : repères de traitement sur la page dessinée (spec §3) ----------
// Un contexte 2D factice note chaque appel : on relit ce que la page dessine, sans navigateur.
function toileFactice() {
  const appels = [];
  const etat = {};
  const ctx = new Proxy(etat, {
    get: (cible, nom) => (nom in cible ? cible[nom] : (...args) => {
      appels.push({ nom, args });
      return nom === 'measureText' ? { width: String(args[0]).length * 10 } : undefined;
    }),
    set: (cible, nom, v) => { cible[nom] = v; return true; },
  });
  return { toile: { getContext: () => ctx }, appels };
}

test('v6 · la frise dessine un numéro par trait, chacun repris par une ligne de la section Traitement, dans son cadre', async () => {
  const { dessinerPage, TAILLE_PX } = await import('../../public/js/ui/graphes/dessin-canvas.js');
  const { mettreEnPage, A4 } = await import('../../public/js/export/page-a4.js');
  const { modeleSoignants } = await import('../../public/js/export/soignants.js');
  const { analyze } = await import('../../public/js/analyse/index.js');
  const { SEED_V1, seedItems } = await import('../../public/js/domain/vocabulaire.js');
  const { carteLibelles } = await import('../../public/js/domain/libelles.js');
  const items = seedItems(SEED_V1, 'x');
  // Textes inventés : jamais un vrai médicament.
  const traitements = [
    { id: 'g', date: '2026-10-14', changement: 'retour à la dose initiale' },
    { id: 'a', date: '2026-10-13', changement: 'passage à la dose du soir' },
    { id: 'c', date: '2026-10-06', changement: 'ajout d\'une prise le matin' },
    { id: 'f', date: '2026-08-10', changement: 'essai d\'un horaire décalé' },
    { id: 'e', date: '2026-08-03', changement: 'sans ligne : ni trait, ni numéro' },
  ];
  const data = { journal: [{ date: '2026-10-01', humeur: 6 }], episodes: [], symptomes: [], traitements, humeurs: [] };
  const aujourdhui = '2026-10-14';
  const m = modeleSoignants(data, { aujourdhui, carte: carteLibelles(items), analyse: analyze(data, { aujourdhui, items }), professionnel: null, prenom: '', traitements });
  const page = mettreEnPage(m);
  const { toile, appels } = toileFactice();
  dessinerPage(toile, page);
  assert.deepEqual([toile.width, toile.height], [TAILLE_PX.largeur, TAILLE_PX.hauteur]);

  // La frise : entre save() et restore(), à l'échelle.
  const debut = appels.findIndex((a) => a.nom === 'save');
  const fin = appels.findIndex((a) => a.nom === 'restore');
  const frise = appels.slice(debut, fin);
  const NUMERO = /^[①-⑳㉑-㉟㊱-㊿](–[①-⑳㉑-㉟㊱-㊿])?$/u;
  const numeros = frise.filter((a) => a.nom === 'fillText' && NUMERO.test(a.args[0])).map((a) => a.args[0]);
  assert.deepEqual(numeros, ['①', '②', '③–④'], 'le 03/08 n\'a pas de ligne : il n\'est pas tracé');
  // Chaque numéro tracé a sa ligne (et pas un de plus).
  const lignes = appels.filter((a) => a.nom === 'fillText' && !NUMERO.test(a.args[0]) && /^[①-⓿]/u.test(a.args[0])).map((a) => a.args[0]);
  assert.deepEqual(lignes.map((l) => l.slice(0, 1)).sort(), ['①', '②', '③', '④']);
  assert.ok(lignes.some((l) => l.startsWith('① lun 10/08 · essai')));
  // Un trait vertical par numéro.
  const verticaux = frise.filter((a, i) => a.nom === 'moveTo' && frise[i + 1] && frise[i + 1].nom === 'lineTo' && frise[i + 1].args[0] === a.args[0]);
  assert.ok(verticaux.length >= numeros.length);
  // Dans le cadre de la frise, bande des numéros comprise.
  const op = page.ops.find((o) => o.type === 'frise');
  const k = TAILLE_PX.largeur / A4.largeur;
  const [echelle] = frise.find((a) => a.nom === 'scale').args;
  const xs = frise.filter((a) => ['moveTo', 'lineTo', 'arc', 'fillRect'].includes(a.nom)).map((a) => a.args[0] + (a.nom === 'fillRect' ? a.args[2] : 0));
  const ys = frise.filter((a) => ['moveTo', 'lineTo', 'arc', 'fillRect'].includes(a.nom)).map((a) => a.args[1] + (a.nom === 'fillRect' ? a.args[3] : 0));
  assert.ok(Math.max(...xs) * echelle <= op.largeur * k + 0.5, 'pas plus large que le cadre');
  assert.ok(Math.max(...ys) * echelle <= op.hauteur * k + 0.5, 'pas plus haut que le cadre');
  assert.ok(Math.min(...ys) >= 0);
  assert.ok(Math.max(...xs) * echelle > op.largeur * k * 0.95, 'toute la largeur du cadre');
});
