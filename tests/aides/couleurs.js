// Couleurs pour les tests de style : contraste WCAG, OKLCH, et lecture des jetons de public/css/tokens.css.

// « #rrggbb » ou « rgb(r, g, b) » / « rgba(…) » (couleur calculée par le navigateur) → [r, g, b] de 0 à 255.
export function canaux(couleur) {
  if (couleur.startsWith('#')) return [1, 3, 5].map((i) => parseInt(couleur.slice(i, i + 2), 16));
  return couleur.match(/[\d.]+/g).slice(0, 3).map(Number);
}
const lineaire = (c) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
export function luminance(couleur) {
  const [r, g, b] = canaux(couleur).map(lineaire);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export const contraste = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// OKLCH (L de 0 à 1, C, teinte H en degrés).
export function oklch(couleur) {
  const [r, g, b] = canaux(couleur).map(lineaire);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  return { L, C: Math.hypot(A, B), H: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
}
export const ecartTeinte = (a, b) => { const d = Math.abs(oklch(a).H - oklch(b).H) % 360; return d > 180 ? 360 - d : d; };
// L'écart ΔE en OKLab (v12) : la distance entre deux couleurs, teinte, clarté et saturation comprises.
export const ecartOklab = (a, b) => {
  const [x, y] = [oklch(a), oklch(b)];
  const ab = (c) => [c.C * Math.cos((c.H * Math.PI) / 180), c.C * Math.sin((c.H * Math.PI) / 180)];
  const [[a1, b1], [a2, b2]] = [ab(x), ab(y)];
  return Math.hypot(x.L - y.L, a1 - a2, b1 - b2);
};

// Jetons d'un bloc de déclarations : { nom: valeur }, sans le « -- ».
const declarations = (bloc) => Object.fromEntries([...bloc.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));

// Les jetons de tokens.css en clair (le premier :root) et en sombre (le :root du @media sombre, par-dessus le clair),
// avec les var() résolus.
export function jetons(css) {
  const sansCom = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const clair = declarations(sansCom.match(/^:root\s*\{([\s\S]*?)\n\}/m)[1]);
  const sombre = { ...clair, ...declarations(sansCom.match(/@media \(prefers-color-scheme: dark\)\s*\{\s*:root\s*\{([\s\S]*?)\}\s*\}/)[1]) };
  const resoudre = (t) => {
    const v = (n, pile = []) => {
      const x = t[n];
      if (x === undefined || pile.includes(n)) return undefined;
      const m = /^var\(--([\w-]+)\)$/.exec(x);
      return m ? v(m[1], [...pile, n]) : x;
    };
    return Object.fromEntries(Object.keys(t).map((n) => [n, v(n)]));
  };
  return { clair: resoudre(clair), sombre: resoudre(sombre), sombreSeul: declarations(sansCom.match(/@media \(prefers-color-scheme: dark\)\s*\{\s*:root\s*\{([\s\S]*?)\}\s*\}/)[1]) };
}

// Les couleurs du système : les 7 familles de la roue des émotions (v7), puis les 4 zones de la carte des émotions (v9),
// dans leur ordre. Les 12 couleurs de rubrique du lot 2b sont retirées en v12 (spec §5.2) : la couleur ne dit qu'une émotion.
export const FAMILLES_ROUE = ['colere', 'degout', 'tristesse', 'joie', 'surprise', 'peur', 'serenite'];
export const ZONES_ROUE = ['rouge', 'jaune', 'bleu', 'vert'];
export const ROLES = ['', '-fill', '-on', '-tint', '-tint-2', '-text'];
