import { test, expect } from '../aides/gardes.js';

// v11 (10/11) · L'icône (spec §10) : la piste B, « Les quatre zones », un rond coupé en quatre aux couleurs des zones de la
// carte des émotions, sur le noir des écrans de l'émotion. Les PNG prennent un nouveau nom (préfixe v11-), et le fond imposé
// par scripts/icones.mjs passe au noir : l'icône masquable n'a plus de cadre bleu. Les deux theme-color d'index.html suivent
// le fond de l'app (spec §9), le manifest prend celles du clair. Chaque PNG est dessiné sur un canvas dans la page (même
// origine) : rien ne sort.
const ICONES = [
  ['icons/v11-apple-touch-icon.png', 180],
  ['icons/v11-icone-192.png', 192],
  ['icons/v11-icone-512.png', 512],
  ['icons/v11-icone-maskable-512.png', 512],
];
// Couleurs des jetons --c-zone-*-fill. Haut : énergie haute ; gauche : désagréable.
const QUARTS = [
  ['rouge', [0.35, 0.35], [0xfe, 0x4c, 0x40]],
  ['jaune', [0.65, 0.35], [0xff, 0xd0, 0x4c]],
  ['vert', [0.65, 0.65], [0x4c, 0xe3, 0x9b]],
  ['bleu', [0.35, 0.65], [0x78, 0x9f, 0xff]],
];
// Un PNG redessiné peut s'écarter d'une unité ou deux selon le moteur : tolérance de 3 par canal.
const proche = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= 3);

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('chaque PNG : coin noir, maskable compris (plus de cadre bleu), et un point de chaque quart rouge, jaune, vert, bleu', async ({ page }) => {
  for (const [src, taille] of ICONES) {
    const lu = await page.evaluate(async ({ s, points }) => {
      const img = new Image();
      img.src = s;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const px = (x, y) => Array.from(ctx.getImageData(x, y, 1, 1).data.slice(0, 3));
      return { largeur: img.naturalWidth, hauteur: img.naturalHeight, coin: px(2, 2), points: points.map(([fx, fy]) => px(Math.round(fx * c.width), Math.round(fy * c.height))) };
    }, { s: src, points: QUARTS.map(([, p]) => p) });
    expect([lu.largeur, lu.hauteur], src).toEqual([taille, taille]);
    expect(lu.coin, `${src} : pixel (2, 2)`).toEqual([0, 0, 0]);
    QUARTS.forEach(([nom, , attendu], i) => expect(proche(lu.points[i], attendu), `${src} : quart ${nom} ${lu.points[i]}`).toBe(true));
  }
});

test('index.html : theme-color #f2f2f7 en clair (v12 : le fond du clair), #000000 en sombre, l\'apple-touch-icon v11 ; manifest : couleurs du clair et icônes v11', async ({ page }) => {
  const metas = await page.locator('meta[name="theme-color"]').evaluateAll((els) => els.map((e) => [e.getAttribute('media'), e.getAttribute('content')]));
  expect(metas).toEqual([['(prefers-color-scheme: light)', '#f2f2f7'], ['(prefers-color-scheme: dark)', '#000000']]);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', 'icons/v11-apple-touch-icon.png');
  const manifest = await page.evaluate(async () => (await fetch('manifest.webmanifest')).json());
  expect(manifest.background_color).toBe('#f2f2f7');
  expect(manifest.theme_color).toBe('#f2f2f7');
  expect(manifest.icons.map((i) => [i.src, i.sizes, i.purpose])).toEqual([
    ['icons/v11-icone-192.png', '192x192', 'any'],
    ['icons/v11-icone-512.png', '512x512', 'any'],
    ['icons/v11-icone-maskable-512.png', '512x512', 'maskable'],
  ]);
});
