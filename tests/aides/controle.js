// Les contrôles d'écran du contrôle global (v7-controle.spec.js), partagés depuis la v11 (7/11) avec celui des écrans de
// la connexion à Spotify (v11-spotify.spec.js) : le contraste des textes, les cibles de 44 pt, les mots interdits, et le
// mouvement réduit. Repris tels quels de v7-controle.spec.js.
import { trouverInterdits } from './mots-interdits.js';

// Attend la fin des animations finies (fondus, glissements) ; le cercle de respiration et l'onde du mémo tournent sans fin.
export const stabiliser = (page) => page.evaluate(async () => {
  const finies = document.getAnimations().filter((a) => { const t = a.effect && a.effect.getComputedTiming(); return t && Number.isFinite(t.endTime); });
  await Promise.race([Promise.all(finies.map((a) => a.finished.catch(() => {}))), new Promise((ok) => setTimeout(ok, 1500))]);
  await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
});

// Chaque texte visible sous `racine` et son contraste ; renvoie ceux sous 4,5:1.
export const contrastesFaibles = (page, racine = 'body') => page.evaluate((sel) => {
  const rgba = (c) => {
    const m = /rgba?\(([^)]+)\)/.exec(c || '');
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  };
  const lin = (v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  // Le fond : la couleur du premier ancêtre opaque (le fond de la page à défaut).
  const fond = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const c = rgba(getComputedStyle(e).backgroundColor);
      if (c && c[3] >= 0.99) return c;
    }
    return rgba(getComputedStyle(document.documentElement).backgroundColor) || [255, 255, 255, 1];
  };
  const opacite = (el) => { let o = 1; for (let e = el; e; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity); return o; };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    if (typeof el.checkVisibility === 'function' && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    return !el.closest('.visuellement-cache, [hidden]');
  };
  const fautes = [];
  const racine = document.querySelector(sel) || document.body;
  const elements = [...racine.querySelectorAll('*')].filter((e) => !['SCRIPT', 'STYLE', 'OPTION', 'CANVAS'].includes(e.tagName));
  for (const el of elements) {
    const champ = ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
    const saisissable = champ && el.tagName !== 'SELECT' && !['checkbox', 'radio', 'file', 'range'].includes(el.type);
    // Un champ vide montre son texte d'aide, dans la couleur de son ::placeholder.
    const aide = saisissable && !el.value && el.placeholder ? '::placeholder' : null;
    const texte = champ ? (el.tagName === 'SELECT' ? (el.selectedOptions[0] || {}).textContent || '' : (saisissable ? el.value || el.placeholder : ''))
      : [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.data).join('').trim();
    if (!texte || !visible(el)) continue;
    if (el.closest('[disabled], [aria-disabled="true"]')) continue;
    const s = getComputedStyle(el, aide);
    const svg = el instanceof SVGElement;
    const c = rgba(svg ? s.fill : s.color);
    if (!c) continue;
    const f = fond(svg ? el.closest('svg') || el : el);
    const a = c[3] * opacite(el) * (aide ? parseFloat(s.opacity) : 1);
    const vu = [0, 1, 2].map((i) => a * c[i] + (1 - a) * f[i]);
    const r = ratio(vu, f);
    if (r < 4.5) fautes.push(`${texte.slice(0, 40)} (${el.tagName.toLowerCase()}.${String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className).split(' ').join('.')}${aide || ''}) : ${r.toFixed(2)}`);
  }
  return [...new Set(fautes)];
}, racine);

// Les cibles qu'un doigt de 44 pt ne touche pas tout entier : on vise le centre de chaque élément à toucher, puis 21,5 pt de chaque
// côté. Ce que le point rencontre doit être cet élément : les pseudo-éléments qui agrandissent une cible comptent (un
// interrupteur de 31 de haut touche sur 47), et un voisin ou un élément posé dessus ne compte pas. L'élément vient au milieu de
// l'écran d'abord : ce qui est plus bas s'atteint en défilant. Les points tombent sur un pixel entier, du côté du centre : WebKit donne
// un point fractionnaire au pixel d'après, et deux flèches de 44 collées (de 213 à 257, de 257 à 301) se volaient 256,5 sans raison.
export const ciblesPetites = (page) => page.evaluate(() => {
  const nom = (el) => (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 30);
  const COTE = 21.5;
  const fautes = [];
  for (const el of document.querySelectorAll('a[href], button, input, select, textarea, [role="button"], [role="switch"], [role="slider"]')) {
    if (el.disabled || el.closest('.visuellement-cache, [hidden]') || !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const [x, y] = [r.left + r.width / 2, r.top + r.height / 2];
    const [gauche, droite, haut, bas] = [Math.ceil(x - COTE), Math.floor(x + COTE), Math.ceil(y - COTE), Math.floor(y + COTE)];
    const manques = [[x, y], [gauche, y], [droite, y], [x, haut], [x, bas]].filter(([a, b]) => {
      const vise = document.elementFromPoint(a, b);
      return !vise || !el.contains(vise);
    });
    if (manques.length) fautes.push(`${el.tagName.toLowerCase()}.${el.className} « ${nom(el)} » : ${Math.round(r.width)} × ${Math.round(r.height)}, centre (${Math.round(x)}, ${Math.round(y)})`);
  }
  return fautes;
});

// Tout ce que l'écran dit, à voir ou à entendre : son texte et les noms donnés aux lecteurs d'écran.
export const motsInterdits = (page) => page.evaluate(() => {
  const textes = [document.body.innerText];
  for (const el of document.querySelectorAll('[aria-label], [aria-valuetext], [title], [placeholder]')) {
    textes.push(...['aria-label', 'aria-valuetext', 'title', 'placeholder'].map((a) => el.getAttribute(a) || ''));
  }
  return textes.join('\n');
}).then(trouverInterdits);

// Ce qui a bougé depuis le contrôle d'avant, écouté dès le chargement : `stabiliser` attend la fin des animations finies, qu'on ne
// verrait donc plus au moment de regarder. Le CSS le dit par ses événements ; une animation lancée par le code n'en a pas.
export const ecouterMouvements = (page) => page.addInitScript(() => {
  window.__mouvements = [];
  const noter = (quoi, el) => window.__mouvements.push(`${quoi} de ${el.getAttribute('class')}`);
  for (const type of ['animationstart', 'transitionrun']) {
    document.addEventListener(type, (e) => noter(`${type} ${e.animationName || e.propertyName}`, e.target), true);
  }
  const animer = Element.prototype.animate;
  Element.prototype.animate = function animate(...args) {
    noter('animate()', this);
    return animer.apply(this, args);
  };
});

// Ce qui bouge : ce qui a bougé depuis le contrôle d'avant (ci-dessus), toute animation ou transition en cours, et un disque du
// souffle qui n'est pas à sa taille fixe.
export const mouvements = (page) => page.evaluate(() => {
  const fautes = (window.__mouvements || []).splice(0);
  fautes.push(...document.getAnimations().map((a) => `animation ${a.animationName || a.transitionProperty || ''} de ${a.effect.target && a.effect.target.className}`));
  const disque = document.querySelector('.disque-souffle');
  if (disque && getComputedStyle(disque).transform !== 'matrix(0.8, 0, 0, 0.8, 0, 0)') fautes.push(`disque du souffle : ${getComputedStyle(disque).transform}`);
  return fautes;
});
