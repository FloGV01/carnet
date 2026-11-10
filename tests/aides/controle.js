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
  // Le fond : la couleur du premier ancêtre opaque (le fond de la page à défaut). La valeur notée d'une roue (v12) se lit sur
  // la fenêtre du milieu, le ::before de sa roue (un aplat d'accent), et non sur la piste.
  const fond = (el) => {
    const roue = el.matches && el.matches('.roue-valeur[aria-pressed="true"]') && el.closest('.roue-choix.notee');
    if (roue) {
      const c = rgba(getComputedStyle(roue, '::before').backgroundColor);
      if (c && c[3] >= 0.99) return c;
    }
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
// `racine` (v11) : sous une boîte modale, seule la boîte se touche ; l'écran du dessous, sous son voile, n'est pas compté.
export const ciblesPetites = (page, racine = null) => page.evaluate((sel) => {
  const nom = (el) => (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 30);
  const COTE = 21.5;
  const fautes = [];
  const dans = (sel && document.querySelector(sel)) || document;
  for (const el of dans.querySelectorAll('a[href], button, input, select, textarea, [role="button"], [role="switch"], [role="slider"]')) {
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
}, racine);

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

// Le plan et les données du contrôle global (v7-controle.spec.js, déplacés ici en v12 : la hauteur de la page du soir,
// v12-design.spec.js, se mesure sur les mêmes).
export const PLAN_CONTROLE = {
  premiersSignes: 'Mâchoire serrée, je parle plus vite.', quandCaMonte: 'Je m\'éloigne cinq minutes.',
  siSurcharge: 'Casque antibruit.', pourRecuperer: 'Marcher dehors.', prevenir: 'Un proche, par message.',
  siAlors: [{ si: 'le bruit monte', alors: 'je mets le casque' }],
};

// Des données inventées et banales : quelques soirs, des relevés (anciennes notes et émotions), un épisode, un symptôme,
// deux rendez-vous, un changement de traitement, une note, une séance. Ce soir, « Mes points positifs » est vide : son
// texte d'aide est mesuré ; « Mes gratitudes » (v11) aussi, et deux jours de la semaine en ont (« Tes gratitudes »).
// Le prochain rendez-vous a une question abordée, posée par son sujet (v8) : la fiche montre
// la pastille « Sommeil » choisie et le texte gris d'une question abordée. v8 (9/9) : des nuits en heures (Mes nuits,
// une nuit sans qualité a sa barre creuse, une nuit sans durée n'a que son texte), deux séances du Programme menées au
// bout et un sens de mot corrigé (Réglages › Émotions) ; les relevés d'émotion ont ce que je faisais (une ou deux
// activités), pour que « Émotions selon ce que je faisais » (Q18) se dessine. v9 (8/8) : un mot à soi (Flottant, vert,
// sans famille) et Fatigué, chacun dans un relevé. Renvoie les identifiants utiles.
export async function verserControle(page) {
  return page.evaluate(async (plan) => {
    const r = window.__carnet.repo;
    const jours = ['2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15'];
    for (const [i, d] of jours.entries()) {
      await r.journal.patch(d, {
        lieu: i % 3 ? 'lieu:bureau' : 'lieu:conge_repos', sommeilRessenti: i === 5 ? null : ['sommeil:mal', 'sommeil:moyen', 'sommeil:bien'][i % 3],
        heuresSommeil: i % 4 === 3 ? null : 4 + (i % 7),
        contactHumain: i % 2 === 0, sportMouvement: i % 3 === 0, traitementPris: 'traitementPris:oui',
        pointsPositifs: i % 2 ? null : 'Une bonne marche.', pese: ['pese:bruit'], recharge: ['recharge:calme'],
        gratitudes: i % 3 ? null : 'Merci au collègue.',
      });
    }
    await r.humeurs.creer({ date: '2026-10-08', heure: '10:00', humeur: 6, energie: 'energie:moyenne' });
    await r.humeurs.creer({ date: '2026-10-09', heure: '18:00', humeur: 4, energie: 'energie:basse' });
    const emotions = ['roue:colere:irrite', 'roue:serenite:calme', 'roue:joie:curieux', 'roue:tristesse', 'roue:peur:preoccupe', 'roue:surprise:perplexe', 'roue:degout:hesitant'];
    const faisais = [['activiteMoment:travail'], ['activiteMoment:repos'], ['activiteMoment:trajet', 'activiteMoment:travail']];
    for (const [i, d] of jours.slice(2).entries()) {
      await r.humeurs.creer({ date: d, heure: '12:00', emotion: emotions[i % emotions.length], energie: 'energie:moyenne', faisais: faisais[i % 3] });
      await r.humeurs.creer({ date: d, heure: '19:30', emotion: emotions[(i + 3) % emotions.length], energie: i % 2 ? 'energie:basse' : 'energie:haute',
        faisais: faisais[(i + 1) % 3] });
    }
    const ep = await r.episodes.creer({ date: '2026-10-14', heure: '18:40', declencheur: 'declencheur:surcharge_sensorielle', emotion: 'emotion:colere',
      intensite: 7, dessous: 'dessous:fatigue_debordement', reaction: 'reaction:explosion', situation: 'Open space bruyant.' });
    await r.symptomes.creer({ date: '2026-10-13', symptome: 'symptome:ruminations', intensite: 5, duree: 'duree:moins_une_heure' });
    const rdv = await r.rdv.creer({ date: '2026-10-22', heure: '14:00', professionnel: 'professionnel:psychiatre',
      questions: [{ texte: 'Le sommeil du week-end est plus décalé.', abordee: false }, { texte: 'Parler de : sommeil', abordee: true }] });
    await r.rdv.creer({ date: '2026-10-07', heure: '10:30', professionnel: 'professionnel:psychologue', compteRendu: 'Travail sur les premiers signes.' });
    const tr = await r.traitements.creer({ date: '2026-09-28', changement: 'Comprimé A : matin 1 → 1½', effetsSecondaires: ['effetSecondaire:aucun'], effetRessenti: 'effetRessenti:mieux' });
    await r.notes.creer({ date: '2026-10-14', heure: '22:05', texte: 'Les après-midi au bureau sont plus durs.' });
    await r.seances.creer({ date: '2026-10-13', heure: '18:10', exercice: 'coherence', origine: 'bien-etre', dureeS: 300 });
    await r.seances.creer({ date: '2026-10-14', heure: '18:10', exercice: 'les-sons', origine: 'bien-etre', dureeS: 315, fin: true, programme: 'les-sons' });
    await r.seances.creer({ date: '2026-10-11', heure: '09:30', exercice: 'respiration-abdominale', origine: 'bien-etre', dureeS: 180, fin: true, programme: 'respiration-abdominale' });
    await r.meta.ecrire('motsPerso', { 'roue:perso:u-0a1b2c3d': { libelle: 'Flottant', zone: 'vert', famille: null,
      definition: 'Un peu ailleurs, sans attache.', archive: false, createdAt: '2026-10-01T08:00:00.000Z' } });
    await r.humeurs.creer({ date: '2026-10-15', heure: '20:00', emotion: 'roue:perso:u-0a1b2c3d', energie: 'energie:basse' });
    await r.humeurs.creer({ date: '2026-10-14', heure: '20:00', emotion: 'roue:aucune:fatigue', energie: 'energie:basse' });
    await r.meta.ecrire('monPlan', plan);
    await r.meta.ecrire('definitionsRoue', { 'roue:colere:irrite': 'Agacé par ce qui se répète, et ça dure.' });
    await r.meta.ecrire('traitementActuel', { depuis: '2026-06-15', lignes: [{ id: 'l1', nom: 'Comprimé A', doses: { matin: '1½', midi: null, apresMidi: null, soir: '½', coucher: null } }] });
    return { ep: ep.id, rdv: rdv.id, tr: tr.id };
  }, PLAN_CONTROLE);
}
