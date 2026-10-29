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

// ---------- v7 : les émotions sur la page (barres empilées lisibles en noir et blanc) ----------

// Un contexte factice qui note, avec chaque appel, la couleur de remplissage et de trait du moment.
function toileNotee() {
  const appels = [];
  const etat = { fillStyle: null, strokeStyle: null };
  const ctx = new Proxy(etat, {
    get: (cible, nom) => (nom in cible ? cible[nom] : (...args) => {
      appels.push({ nom, args, fill: cible.fillStyle, stroke: cible.strokeStyle });
      return nom === 'measureText' ? { width: String(args[0]).length * 10 } : undefined;
    }),
    set: (cible, nom, v) => { cible[nom] = v; return true; },
  });
  return { toile: { getContext: () => ctx }, appels };
}

test('v7 · les couleurs des familles sont celles de la roue (tokens.css, en clair), et chaque famille a son motif', async () => {
  const { readFileSync } = await import('node:fs');
  const { COULEURS_EMOTIONS, MOTIFS } = await import('../../public/js/ui/graphes/dessin-canvas.js');
  const { FAMILLES } = await import('../../public/js/domain/roue.js');
  const jetons = readFileSync(new URL('../../public/css/tokens.css', import.meta.url), 'utf8');
  const clair = jetons.slice(0, jetons.indexOf('@media'));
  for (const f of FAMILLES) {
    const m = clair.match(new RegExp(`--c-emo-${f.cle}:\\s*(#[0-9a-f]{6})`, 'i'));
    assert.ok(m, f.cle);
    assert.equal(COULEURS_EMOTIONS[f.cle].toLowerCase(), m[1].toLowerCase(), f.cle);
  }
  assert.deepEqual(Object.keys(MOTIFS), FAMILLES.map((f) => f.cle));
  assert.equal(new Set(Object.values(MOTIFS)).size, 7, 'sept motifs différents : lisible en noir et blanc');
});

test('v7 · la frise dessine les familles empilées dans l\'ordre de la roue, de bas en haut, avec leur motif ; la légende aussi', async () => {
  const { dessinerPage, COULEURS_EMOTIONS, MOTIFS, geometriePage } = await import('../../public/js/ui/graphes/dessin-canvas.js');
  const { mettreEnPage } = await import('../../public/js/export/page-a4.js');
  const { modeleSoignants } = await import('../../public/js/export/soignants.js');
  const { analyze } = await import('../../public/js/analyse/index.js');
  const { SEED_V1, seedItems } = await import('../../public/js/domain/vocabulaire.js');
  const { carteLibelles } = await import('../../public/js/domain/libelles.js');
  const { FAMILLES } = await import('../../public/js/domain/roue.js');
  const items = seedItems(SEED_V1, 'x');
  // Une semaine avec toutes les familles (une par jour), et une note ancienne.
  const humeurs = FAMILLES.map((f, i) => ({ id: `h${i}`, date: `2026-10-${String(5 + i).padStart(2, '0')}`, heure: '10:00', emotion: f.mots[0].id, humeur: null }));
  const data = { journal: [{ date: '2026-09-01', humeur: 6 }], episodes: [], symptomes: [], traitements: [], humeurs };
  const aujourdhui = '2026-10-14';
  const m = modeleSoignants(data, { aujourdhui, carte: carteLibelles(items), analyse: analyze(data, { aujourdhui, items }), professionnel: null, prenom: '' });
  const page = mettreEnPage(m);
  const { toile, appels } = toileNotee();
  dessinerPage(toile, page);
  const couleurs = new Map(Object.entries(COULEURS_EMOTIONS).map(([k, v]) => [v, k]));
  // Dans la frise (de son save(), suivi de translate() et scale(), au restore() qui lui répond) : un rectangle par famille,
  // dans l'ordre de la roue, chacun au-dessus du précédent.
  const debut = appels.findIndex((a, i) => a.nom === 'save' && appels[i + 1].nom === 'translate');
  let fin = debut;
  for (let niveau = 0; ; fin += 1) {
    if (appels[fin].nom === 'save') niveau += 1;
    if (appels[fin].nom === 'restore' && --niveau === 0) break;
  }
  const segments = appels.slice(debut, fin).filter((a) => a.nom === 'fillRect' && couleurs.has(a.fill));
  assert.deepEqual(segments.map((a) => couleurs.get(a.fill)), FAMILLES.map((f) => f.cle));
  assert.ok(segments.every((a, i) => i === 0 || a.args[1] < segments[i - 1].args[1]), 'de bas en haut');
  // Le motif : des traits ou des points blancs, coupés au rectangle, pour toutes les familles sauf la colère (pleine).
  const motifs = appels.filter((a) => a.nom === 'clip').length;
  assert.equal(motifs, 2 * (FAMILLES.length - 1), 'la frise et la légende');
  assert.equal(Object.values(MOTIFS).filter((x) => x === 'plein').length, 1);
  // La légende : une case par famille, hors de la frise, dans l'ordre de la roue.
  const legende = [...appels.slice(0, debut), ...appels.slice(fin)].filter((a) => a.nom === 'fillRect' && couleurs.has(a.fill));
  assert.deepEqual(legende.map((a) => couleurs.get(a.fill)), FAMILLES.map((f) => f.cle));
  // La rangée des notes, ses graduations, et les étiquettes des rangées.
  const textes = appels.filter((a) => a.nom === 'fillText').map((a) => a.args[0]);
  for (const t of ['Émotions', 'Humeur', '(notes)', 'Nuits', 'Explosions', 'Épisodes', '10', '1']) assert.ok(textes.includes(t), t);
  assert.ok(!textes.includes('Énergie'), 'jamais l\'énergie sur la page');
  // La géométrie suit le rapport du cadre : rien n'est écrasé.
  const op = page.ops.find((o) => o.type === 'frise');
  const g = geometriePage(op);
  assert.ok(Math.abs(g.dim.largeur / g.dim.hauteur - op.largeur / op.hauteur) < 0.01);
});

// ---------- v8 : Nuit par nuit sur la page dessinée ----------

test('v8 · Nuit par nuit : une barre par nuit qui a sa durée, à la teinte imprimée de sa qualité (celle de la frise), creuse sans qualité', async () => {
  const { dessinerPage, COULEURS_SOMMEIL, TAILLE_PX } = await import('../../public/js/ui/graphes/dessin-canvas.js');
  const { mettreEnPage, A4 } = await import('../../public/js/export/page-a4.js');
  const { modeleSoignants } = await import('../../public/js/export/soignants.js');
  const { analyze } = await import('../../public/js/analyse/index.js');
  const { SEED_V1, seedItems } = await import('../../public/js/domain/vocabulaire.js');
  const { carteLibelles } = await import('../../public/js/domain/libelles.js');
  const items = seedItems(SEED_V1, 'x');
  const journal = [
    { date: '2026-10-10', sommeilRessenti: 'sommeil:mal', heuresSommeil: 5 },
    { date: '2026-10-11', sommeilRessenti: 'sommeil:moyen', heuresSommeil: 7 },
    { date: '2026-10-12', sommeilRessenti: 'sommeil:bien', heuresSommeil: 10 },
    { date: '2026-10-13', heuresSommeil: 6 },
    { date: '2026-10-14', sommeilRessenti: 'sommeil:bien' },
  ];
  const data = { journal, episodes: [], symptomes: [], traitements: [], humeurs: [] };
  const aujourdhui = '2026-10-14';
  const m = modeleSoignants(data, { aujourdhui, carte: carteLibelles(items), analyse: analyze(data, { aujourdhui, items }), professionnel: null, prenom: '' });
  const page = mettreEnPage(m);
  assert.equal(page.nuitsSemaines, 4);
  const { toile, appels } = toileNotee();
  dessinerPage(toile, page);
  const k = TAILLE_PX.largeur / A4.largeur;
  const ops = page.ops.filter((o) => o.type === 'nuit');
  assert.equal(ops.length, 4);
  // Les barres pleines : à leur place, dans l'ordre des jours, Mal, Moyen puis Bien.
  const pleines = appels.filter((a) => a.nom === 'fillRect' && COULEURS_SOMMEIL.includes(a.fill) && ops.some((o) => Math.abs(o.x * k - a.args[0]) < 1e-6 && Math.abs(o.y * k - a.args[1]) < 1e-6));
  assert.deepEqual(pleines.map((a) => COULEURS_SOMMEIL.indexOf(a.fill)), [0, 1, 2]);
  assert.ok(pleines[2].args[2] > pleines[1].args[2] && pleines[1].args[2] > pleines[0].args[2], 'longues comme les heures');
  // La nuit sans qualité : un contour, pas un aplat.
  const creuse = appels.filter((a) => a.nom === 'strokeRect');
  assert.equal(creuse.length, 1);
  assert.ok(Math.abs(creuse[0].args[0] - ops[3].x * k) < 1e-6);
  // Tout dans la page.
  for (const a of [...pleines, ...creuse]) {
    assert.ok(a.args[0] >= 0 && a.args[0] + a.args[2] <= TAILLE_PX.largeur && a.args[1] >= 0 && a.args[1] + a.args[3] <= TAILLE_PX.hauteur);
  }
  // La nuit qui n'a que sa qualité : son texte, sans barre.
  assert.ok(appels.some((a) => a.nom === 'fillText' && a.args[0] === 'Bien'));
});

// v9 (spec §8) : la page dessine la ligne « Émotions par zone (relevés) » sous celle des familles, ses valeurs dans leur
// colonne, et la légende des zones une seule fois, sur la ligne du titre « Indicateurs », en texte secondaire.
test('v9 · la page dessine la ligne des zones sous les familles et la légende des zones, une fois, sur la ligne d\'« Indicateurs »', async () => {
  const { dessinerPage, TAILLE_PX } = await import('../../public/js/ui/graphes/dessin-canvas.js');
  const { mettreEnPage, A4 } = await import('../../public/js/export/page-a4.js');
  const { modeleSoignants, NOM_EMOTIONS, NOM_ZONES, LEGENDE_ZONES } = await import('../../public/js/export/soignants.js');
  const { analyze } = await import('../../public/js/analyse/index.js');
  const { SEED_V1, seedItems } = await import('../../public/js/domain/vocabulaire.js');
  const { carteLibelles } = await import('../../public/js/domain/libelles.js');
  const items = seedItems(SEED_V1, 'x');
  const emo = (date, heure, emotion) => ({ id: `${date}-${heure}`, date, heure, emotion, humeur: null, energie: null });
  const humeurs = [emo('2026-10-13', '09:00', 'roue:colere:irrite'), emo('2026-10-13', '12:00', 'roue:aucune:fatigue'), emo('2026-10-14', '09:00', 'roue:serenite:calme')];
  const data = { journal: [{ date: '2026-10-13', lieu: 'lieu:bureau' }], episodes: [], symptomes: [], traitements: [], humeurs };
  const aujourdhui = '2026-10-14';
  const m = modeleSoignants(data, { aujourdhui, carte: carteLibelles(items), analyse: analyze(data, { aujourdhui, items }), professionnel: null, prenom: '' });
  const page = mettreEnPage(m);
  const { toile, appels } = toileFactice();
  dessinerPage(toile, page);
  const k = TAILLE_PX.largeur / A4.largeur;
  const textes = appels.filter((a) => a.nom === 'fillText').map((a) => ({ texte: a.args[0], x: a.args[1] / k, y: a.args[2] / k }));
  const un = (t) => { const l = textes.filter((x) => x.texte === t); assert.equal(l.length, 1, t); return l[0]; };
  const legende = un(LEGENDE_ZONES);
  assert.ok(Math.abs(legende.y - un('INDICATEURS').y) < 1e-6, 'sur la ligne du titre');
  assert.ok(legende.x > A4.marge && legende.x < A4.largeur - A4.marge);
  assert.ok(un(NOM_EMOTIONS).y < un(NOM_ZONES).y, 'sous les familles');
  const valeurs = textes.filter((x) => Math.abs(x.y - un(NOM_ZONES).y) < 1e-6 && x.texte !== NOM_ZONES).map((x) => x.texte);
  assert.deepEqual(valeurs, ['rouge 1 · bleu 1 · vert 1', 'rouge 1 · bleu 1 · vert 1', 'rouge 1 · bleu 1 · vert 1']);
});
