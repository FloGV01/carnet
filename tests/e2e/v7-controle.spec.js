import { readFileSync } from 'node:fs';
import { test, expect } from '../aides/gardes.js';
import { viderBase, aller, appPrete } from '../aides/saisie.js';
import { canaux, contraste, jetons } from '../aides/couleurs.js';

// v7 (9/9) · Contrôle global (plan v6.2, tâches 6 et 7) : on parcourt les écrans principaux, avec des données inventées,
// en clair et en sombre.
// - Contraste : tout texte visible a au moins 4,5:1 sur son fond calculé (approximation du plan : la couleur du premier
//   ancêtre opaque ; la couleur du texte est fondue dans ce fond selon son alpha et l'opacité de ses ancêtres). Le texte
//   d'aide d'un champ vide (placeholder) est mesuré à sa couleur propre (::placeholder). Le texte d'un contrôle inactif
//   (WCAG l'exempte) et la page A4 dessinée (canvas, lisible imprimée, B3) n'entrent pas dans la mesure.
// - Débordement : à 390 px, au texte par défaut et en grand texte (23 px), la page ne défile pas de côté et aucun
//   élément visible ne sort de l'écran.
// - Pas de tirets (2b) : aucun filet ni cadre en pointillés sur ces écrans ; tout choix fait a sa coche.
// - Réglages et Le soir en listes groupées 2b, carrés d'icônes ; l'Historique et ses puces 2b.
// Horloge : jeudi 15 octobre 2026, 21:00.
const { clair, sombre } = jetons(readFileSync(new URL('../../public/css/tokens.css', import.meta.url), 'utf8'));
const rgb = (hex) => `rgb(${canaux(hex).join(', ')})`;

const PLAN = {
  premiersSignes: 'Mâchoire serrée, je parle plus vite.', quandCaMonte: 'Je m\'éloigne cinq minutes.',
  siSurcharge: 'Casque antibruit.', pourRecuperer: 'Marcher dehors.', prevenir: 'Un proche, par message.',
  siAlors: [{ si: 'le bruit monte', alors: 'je mets le casque' }],
};

// Des données inventées et banales : quelques soirs, des relevés (anciennes notes et émotions), un épisode, un symptôme,
// deux rendez-vous, un changement de traitement, une note, une séance. Ce soir, « Mes points positifs » est vide : son
// texte d'aide est mesuré. Renvoie les identifiants utiles.
async function verser(page) {
  return page.evaluate(async (plan) => {
    const r = window.__carnet.repo;
    const jours = ['2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15'];
    for (const [i, d] of jours.entries()) {
      await r.journal.patch(d, {
        lieu: i % 3 ? 'lieu:bureau' : 'lieu:conge_repos', sommeilRessenti: ['sommeil:mal', 'sommeil:moyen', 'sommeil:bien'][i % 3],
        contactHumain: i % 2 === 0, sportMouvement: i % 3 === 0, traitementPris: 'traitementPris:oui',
        pointsPositifs: i % 2 ? null : 'Une bonne marche.', pese: ['pese:bruit'], recharge: ['recharge:calme'],
      });
    }
    await r.humeurs.creer({ date: '2026-10-08', heure: '10:00', humeur: 6, energie: 'energie:moyenne' });
    await r.humeurs.creer({ date: '2026-10-09', heure: '18:00', humeur: 4, energie: 'energie:basse' });
    const emotions = ['roue:colere:irrite', 'roue:serenite:calme', 'roue:joie:curieux', 'roue:tristesse', 'roue:peur:preoccupe', 'roue:surprise:perplexe', 'roue:degout:hesitant'];
    for (const [i, d] of jours.slice(2).entries()) {
      await r.humeurs.creer({ date: d, heure: '12:00', emotion: emotions[i % emotions.length], energie: 'energie:moyenne' });
      await r.humeurs.creer({ date: d, heure: '19:30', emotion: emotions[(i + 3) % emotions.length], energie: i % 2 ? 'energie:basse' : 'energie:haute' });
    }
    const ep = await r.episodes.creer({ date: '2026-10-14', heure: '18:40', declencheur: 'declencheur:surcharge_sensorielle', emotion: 'emotion:colere',
      intensite: 7, dessous: 'dessous:fatigue_debordement', reaction: 'reaction:explosion', situation: 'Open space bruyant.' });
    await r.symptomes.creer({ date: '2026-10-13', symptome: 'symptome:ruminations', intensite: 5, duree: 'duree:moins_une_heure' });
    const rdv = await r.rdv.creer({ date: '2026-10-22', heure: '14:00', professionnel: 'professionnel:psychiatre',
      questions: [{ texte: 'Le sommeil du week-end est plus décalé.', abordee: false }] });
    await r.rdv.creer({ date: '2026-10-07', heure: '10:30', professionnel: 'professionnel:psychologue', compteRendu: 'Travail sur les premiers signes.' });
    const tr = await r.traitements.creer({ date: '2026-09-28', changement: 'Comprimé A : matin 1 → 1½', effetsSecondaires: ['effetSecondaire:aucun'], effetRessenti: 'effetRessenti:mieux' });
    await r.notes.creer({ date: '2026-10-14', heure: '22:05', texte: 'Les après-midi au bureau sont plus durs.' });
    await r.seances.creer({ date: '2026-10-13', heure: '18:10', exercice: 'coherence', origine: 'bien-etre', dureeS: 300 });
    await r.seances.creer({ date: '2026-10-14', heure: '18:10', exercice: 'les-sons', origine: 'bien-etre', dureeS: 315, fin: true, programme: 'les-sons' });
    await r.meta.ecrire('monPlan', plan);
    await r.meta.ecrire('traitementActuel', { depuis: '2026-06-15', lignes: [{ id: 'l1', nom: 'Comprimé A', doses: { matin: '1½', midi: null, apresMidi: null, soir: '½', coucher: null } }] });
    return { ep: ep.id, rdv: rdv.id, tr: tr.id };
  }, PLAN);
}

// Attend la fin des animations finies (fondus, glissements) ; le cercle de respiration et l'onde du mémo tournent sans fin.
const stabiliser = (page) => page.evaluate(async () => {
  const finies = document.getAnimations().filter((a) => { const t = a.effect && a.effect.getComputedTiming(); return t && Number.isFinite(t.endTime); });
  await Promise.race([Promise.all(finies.map((a) => a.finished.catch(() => {}))), new Promise((ok) => setTimeout(ok, 1500))]);
  await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
});

// Chaque texte visible sous `racine` et son contraste ; renvoie ceux sous 4,5:1.
const contrastesFaibles = (page, racine = 'body') => page.evaluate((sel) => {
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

// Ce qui sort de l'écran de côté : la page qui défile horizontalement, un élément visible hors des 390 px, ou une ligne
// de texte qui dépasse de sa boîte jusque hors de l'écran. N'est pas compté ce qui est dans une zone qui défile de côté,
// ou coupé exprès par une ellipse (un résumé sur une ligne) ; un parent qui masque seulement son débordement ne suffit
// pas : ce qu'il coupe serait perdu.
const debordements = (page) => page.evaluate(() => {
  const fautes = [];
  const dedans = (r) => r.left >= -0.5 && r.right <= innerWidth + 0.5;
  const coupe = (el) => {
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (!dedans(p.getBoundingClientRect())) continue;
      if (['auto', 'scroll'].includes(s.overflowX) || (s.overflowX !== 'visible' && s.textOverflow === 'ellipsis')) return true;
    }
    return false;
  };
  const nom = (el) => `${el.tagName.toLowerCase()}.${String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className).split(' ').join('.')}`;
  if (document.documentElement.scrollWidth > innerWidth + 0.5) fautes.push(`page : ${document.documentElement.scrollWidth} px de large`);
  const plage = document.createRange();
  for (const el of document.querySelectorAll('main *, .parcours *, .bandeau *, .voile *, .feuille *')) {
    if (el.closest('.visuellement-cache') || getComputedStyle(el).visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width >= 1 && r.height >= 1 && !dedans(r) && !coupe(el.parentElement)) {
      fautes.push(`${nom(el)} « ${(el.textContent || '').trim().slice(0, 30)} » : ${Math.round(r.left)} → ${Math.round(r.right)}`);
    }
    for (const n of el.childNodes) {
      if (n.nodeType !== Node.TEXT_NODE || !n.data.trim()) continue;
      plage.selectNodeContents(n);
      if ([...plage.getClientRects()].some((q) => q.width > 0 && !dedans(q)) && !coupe(el)) fautes.push(`texte de ${nom(el)} « ${n.data.trim().slice(0, 30)} »`);
    }
  }
  return [...new Set(fautes)].slice(0, 12);
});

// Les cadres et filets en tirets ou en pointillés des éléments visibles (2b : aucun).
const tirets = (page) => page.evaluate(() => [...document.querySelectorAll('body *')].filter((el) => {
  const r = el.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return false;
  const s = getComputedStyle(el);
  return ['Top', 'Right', 'Bottom', 'Left'].some((c) => ['dashed', 'dotted'].includes(s[`border${c}Style`]) && parseFloat(s[`border${c}Width`]) > 0);
}).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ').join('.')}`));

// Les choix faits visibles sans leur coche (jamais la couleur seule). Une question cochée a sa propre case.
const sansCoche = (page) => page.evaluate(() => [...document.querySelectorAll('[aria-pressed="true"]')].filter((b) => {
  if (b.getBoundingClientRect().width < 1 || b.closest('.visuellement-cache') || b.classList.contains('question-case')) return false;
  const svg = b.querySelector(':scope > .coche svg');
  return !svg || svg.getBoundingClientRect().width < 10;
}).map((b) => b.textContent.trim().slice(0, 30)));

// Les écrans parcourus : [nom, préparation]. `ids` : les identifiants versés.
const ECRANS = (ids) => [
  ['Aujourd\'hui', (p) => aller(p, '#/aujourdhui'), '.aujourdhui .evenements-jour'],
  ['Émotion du moment', (p) => aller(p, '#/moment'), '.tuiles-emotion'],
  // v8 : la carte, ouverte par une tuile, un mot choisi et sa définition (« Ce que je faisais » ouvert d'abord : l'écran
  // ne se ferme pas seul pendant le contrôle).
  ['Émotion du moment, carte', async (p) => {
    await p.getByRole('button', { name: /^Ce que je faisais/ }).click();
    await p.getByRole('button', { name: 'Énergie moyenne, plutôt désagréable', exact: true }).click();
    await p.getByRole('button', { name: 'Préoccupé, famille Peur', exact: true }).click();
  }, '.mot-definition'],
  ['Épisode, étape 1', async (p) => { await aller(p, '#/aujourdhui'); await aller(p, '#/episode/nouveau'); }, '.titre-question'],
  ['Épisode rouvert', async (p) => { await aller(p, '#/aujourdhui'); await aller(p, `#/episode/${ids.ep}`); }, '.recap'],
  ['Moment difficile', async (p) => { await aller(p, '#/aujourdhui'); await aller(p, '#/moment-difficile'); }, '.plan-moment'],
  ['Analyse', (p) => aller(p, '#/analyse'), '.analyse .selecteur-periode'],
  ['Comprendre, Explosions', (p) => aller(p, '#/comprendre/explosions'), '.comprendre figure.graphe'],
  ['Comprendre, Énergie', (p) => aller(p, '#/comprendre/energie'), '.comprendre figure.graphe'],
  ['Comprendre, Rythmes', (p) => aller(p, '#/comprendre/rythmes'), '.comprendre figure.graphe'],
  ['Historique', (p) => aller(p, '#/historique'), '.historique .semaine'],
  ['Historique, filtres', (p) => p.getByRole('button', { name: /Filtrer/ }).click(), '.filtres'],
  ['Bien-être', (p) => aller(p, '#/bien-etre'), '.bien-etre .carte-programme .seance-qui-vient'],
  // v8 : le Programme (une séance faite porte « Faite le »), puis le lecteur, avant de commencer, sur une étape rythmée
  // (le disque et « Inspire »), puis en pause (ses réglages, sous l'écran de lecture).
  ['Programme', (p) => aller(p, '#/bien-etre/programme'), '.programme .seance-faite'],
  ['Exercice', (p) => aller(p, '#/bien-etre/programme/respiration-carree'), '.lecteur-avant .reglages-lecteur'],
  ['Exercice, étape rythmée', async (p) => {
    await p.getByRole('button', { name: 'Commencer', exact: true }).click();
    for (let i = 0; i < 6; i += 1) await p.getByRole('button', { name: 'Suivant', exact: true }).click();
  }, '.mot-souffle'],
  ['Exercice en pause', (p) => p.getByRole('button', { name: 'Pause', exact: true }).click(), '.reglages-pause .reglages-lecteur'],
  ['Soins, Rendez-vous', async (p) => { await aller(p, '#/soins'); await p.getByRole('button', { name: 'Soins : Rendez-vous', exact: true }).click(); }, '.carte-prochain'],
  ['Soins, Notes', (p) => p.getByRole('button', { name: 'Soins : Notes', exact: true }).click(), '.notes-en-vrac'],
  ['Soins, Traitement', (p) => p.getByRole('button', { name: 'Soins : Traitement', exact: true }).click(), '.tableau-traitement'],
  ['Rendez-vous', (p) => aller(p, `#/rdv/${ids.rdv}`), '#rdv-date'],
  ['Confirmation', (p) => p.getByRole('button', { name: 'Supprimer ce rendez-vous' }).click(), '.boite-confirmation'],
  ['En consultation', async (p) => { await p.getByRole('button', { name: 'Annuler' }).click(); await aller(p, `#/consultation/${ids.rdv}`); }, '.chiffres-consultation'],
  ['Traitement', async (p) => { await aller(p, '#/soins'); await aller(p, `#/traitement/${ids.tr}`); }, '#tr-changement'],
  ['Export PSY', (p) => aller(p, '#/export-psy'), 'pre.apercu-export'],
  ['Vue soignants', (p) => aller(p, '#/soignants'), 'canvas.apercu-page'],
  ['Réglages', (p) => aller(p, '#/reglages'), '.reglages .a-propos'],
  ['Réglages › Le soir', (p) => aller(p, '#/reglages/journee'), '.ma-journee .avec-carres'],
  ['Réglages › Listes', (p) => aller(p, '#/reglages/listes'), '.listes .carte-groupe'],
  ['Réglages › Émotions', (p) => aller(p, '#/reglages/emotions'), '.reglages-emotions .bouton-definition'],
  ['Réglages › une liste', (p) => aller(p, '#/reglages/listes/declencheur'), '.element-liste'],
  ['Réglages › Rappels', (p) => aller(p, '#/reglages/rappel'), '.heures-moment'],
  ['Réglages › Moment difficile', (p) => aller(p, '#/reglages/moment-difficile'), '.reglage-respiration'],
  ['Réglages › Me ressourcer', (p) => aller(p, '#/reglages/ressourcer'), '.ligne-interrupteur'],
  ['Réglages › Aide iPhone', (p) => aller(p, '#/reglages/aide-iphone'), '.etapes'],
  ['Mon plan', (p) => aller(p, '#/mon-plan'), '.mon-plan .champ-texte'],
  ['Sauvegarde', (p) => aller(p, '#/reglages/sauvegarde'), '.import .btn'],
  ['Tout effacer', (p) => aller(p, '#/reglages/effacer'), '.effacer .btn'],
  ['Diagnostic', (p) => aller(p, '#/diagnostic'), '.diag dl'],
  ['Bandeau de mise à jour', async (p) => { await aller(p, '#/reglages'); await p.evaluate(() => window.__carnet.etatApp.maj({ majDisponible: true })); }, '.bandeau'],
  ['Guide d\'installation', async (p) => { await p.goto('/?forcer-guide'); }, '.guide'],
];

async function parcourir(page, schema, verifier) {
  await page.emulateMedia({ colorScheme: schema });
  const ids = await verser(page);
  await page.reload();
  await appPrete(page);
  const fautes = {};
  for (const [nom, preparer, attendu] of ECRANS(ids)) {
    await preparer(page);
    await expect(page.locator(attendu).first(), `${schema} : ${nom}`).toBeVisible({ timeout: 15000 });
    if (nom === 'Analyse') await expect(page.locator('main')).not.toContainText('Calcul…', { timeout: 30000 });
    await stabiliser(page);
    const f = await verifier(nom);
    if (f.length) fautes[nom] = f;
  }
  return fautes;
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

for (const schema of ['light', 'dark']) {
  test(`contraste ${schema === 'light' ? 'en clair' : 'en sombre'} : tout texte visible des écrans principaux a au moins 4,5:1 sur son fond ; ni tirets, ni choix fait sans coche`, async ({ page }) => {
    test.setTimeout(180000);
    const fautes = await parcourir(page, schema, async (nom) => [
      ...await contrastesFaibles(page, nom === 'Confirmation' ? '.boite-confirmation' : 'body'),
      ...(await tirets(page)).map((x) => `tirets : ${x}`),
      ...(await sansCoche(page)).map((x) => `choix fait sans coche : ${x}`),
    ]);
    expect(fautes).toEqual({});
  });
}

test('à 390 px, au texte par défaut et en grand texte (23 px), rien ne sort de l\'écran de côté', async ({ page }) => {
  test.setTimeout(240000);
  const fautes = await parcourir(page, 'light', async () => {
    const f = [];
    for (const taille of [null, 23]) {
      if (taille) await page.evaluate((t) => { document.documentElement.style.fontSize = `${t}px`; }, taille);
      await stabiliser(page);
      f.push(...(await debordements(page)).map((x) => `${taille ? `${taille} px` : 'défaut'} : ${x}`));
    }
    await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
    return f;
  });
  expect(fautes).toEqual({});
});

// Le style d'un carré d'icône et de la rangée qui le porte, et le filet de la rangée suivante (son ::before).
const carres = (page, liste) => page.locator(liste).evaluate((ul) => [...ul.querySelectorAll(':scope > li')].map((li) => {
  const c = li.querySelector('.carre-ligne');
  const r = c && c.getBoundingClientRect();
  const filet = getComputedStyle(li, '::before');
  return {
    texte: li.textContent.trim(), fond: c && getComputedStyle(c).backgroundColor, icone: c && getComputedStyle(c.querySelector('svg')).color,
    taille: r && [Math.round(r.width), Math.round(r.height)], rayon: c && getComputedStyle(c).borderTopLeftRadius,
    hauteur: Math.round(li.getBoundingClientRect().height),
    filet: filet.content === 'none' || filet.content === 'normal' ? null : Math.round(parseFloat(filet.left)),
    gaucheCarre: r && Math.round(r.left - ul.getBoundingClientRect().left),
  };
}));

test('Réglages et Le soir en listes groupées 2b : carrés de 28 (rayon 7), neutres ou à la couleur du parcours, filets décalés après le carré, en clair et en sombre', async ({ page }) => {
  for (const [schema, t] of [['light', clair], ['dark', sombre]]) {
    await page.emulateMedia({ colorScheme: schema });
    await aller(page, '#/reglages');
    await expect(page.locator('#titre-moment-difficile')).toBeVisible();
    const md = await carres(page, 'ul[aria-labelledby="titre-moment-difficile"]');
    expect(md.map((x) => x.texte)).toEqual(['Mon plan', 'Moment difficile', 'Me ressourcer', 'Aide iPhone']);
    const attendus = [['c-difficile', 'c-difficile-on'], ['c-difficile', 'c-difficile-on'], ['c-energie', 'c-energie-on'], ['surface-2', 'text']];
    md.forEach((x, i) => {
      expect(x.fond, `${schema} ${x.texte}`).toBe(rgb(t[attendus[i][0]]));
      expect(x.icone, `${schema} ${x.texte}`).toBe(rgb(t[attendus[i][1]]));
      expect(contraste(x.fond, x.icone), `${schema} ${x.texte} : icône`).toBeGreaterThanOrEqual(3);
      expect(x.taille).toEqual([28, 28]);
      expect(x.rayon).toBe('7px');
      expect(x.gaucheCarre).toBe(12);
      expect(x.hauteur).toBeGreaterThanOrEqual(52);
      // La première rangée n'a pas de filet ; les suivantes, un filet qui commence après le carré (12 + 28 + 12).
      expect(x.filet).toBe(i === 0 ? null : 52);
    });
    const saisie = await carres(page, 'ul[aria-labelledby="titre-ma-saisie"]');
    for (const x of saisie) expect(x.fond, `${schema} ${x.texte}`).toBe(rgb(t['surface-2']));
    // Le soir : chaque champ a le carré de sa rubrique, comme sa carte sur Aujourd'hui.
    await aller(page, '#/reglages/journee');
    await expect(page.locator('.ma-journee .avec-carres')).toBeVisible();
    const soir = await carres(page, '.ma-journee .avec-carres');
    const couleurs = { Lieu: 'lieu', Sommeil: 'sommeil', Humeur: 'humeur', 'Contact humain': 'contact', 'Sport / mouvement': 'sport',
      'Explosions (compteur du soir)': 'explosions', 'Traitement pris': 'traitement', 'Mes points positifs': 'positifs',
      // v8 : « Nuit en détail », masqué par défaut, avec ce qu'il contient en secondaire.
      'Nuit en détailcoucher, lever, réveils': 'sommeil', 'Ce qui a pesé · ce qui a rechargé': 'energie' };
    expect(soir.map((x) => x.texte)).toEqual(Object.keys(couleurs));
    for (const x of soir) expect(x.fond, `${schema} ${x.texte}`).toBe(rgb(t[`c-${couleurs[x.texte]}`]));
  }
});

// Chaque rangée des listes à carrés : son nombre de lignes de texte, sa hauteur, et l'écart entre son texte et ses bords
// (là où passent les filets), filet propre de la rangée exclu.
const margesTexte = (page) => page.evaluate(() => [...document.querySelectorAll('main .avec-carres > li')].map((li) => {
  const s = getComputedStyle(li);
  const b = li.getBoundingClientRect();
  const r = { top: b.top + parseFloat(s.borderTopWidth), bottom: b.bottom - parseFloat(s.borderBottomWidth) };
  r.height = r.bottom - r.top;
  const plage = document.createRange();
  const lignes = [];
  const marche = document.createTreeWalker(li, NodeFilter.SHOW_TEXT);
  for (let n = marche.nextNode(); n; n = marche.nextNode()) {
    if (!n.data.trim() || n.parentElement.closest('.visuellement-cache')) continue;
    plage.selectNodeContents(n);
    lignes.push(...[...plage.getClientRects()].filter((q) => q.height > 0));
  }
  return {
    texte: li.textContent.trim(), lignes: new Set(lignes.map((q) => Math.round(q.top))).size, hauteur: Math.round(r.height),
    haut: Math.round(Math.min(...lignes.map((q) => q.top)) - r.top), bas: Math.round(r.bottom - Math.max(...lignes.map((q) => q.bottom))),
  };
}));

test('Réglages et Le soir : au texte par défaut et en grand texte (23 px), le libellé d\'une rangée reste à 8 px au moins de ses filets ; une rangée d\'une ligne garde 52', async ({ page }) => {
  for (const [route, attendu] of [['#/reglages', '.reglages .a-propos'], ['#/reglages/journee', '.ma-journee .avec-carres']]) {
    await aller(page, route);
    await expect(page.locator(attendu)).toBeVisible();
    for (const taille of [null, 23]) {
      await page.evaluate((t) => { document.documentElement.style.fontSize = t ? `${t}px` : ''; }, taille);
      await stabiliser(page);
      const rangees = await margesTexte(page);
      // Réglages : Sauvegarde (2), Ma saisie (4, Émotions en v8), Moment difficile (4) ; Le soir : 8 champs, « Nuit en
      // détail » (v8) et pesé · rechargé.
      expect(rangees.length, route).toBe(10);
      for (const x of rangees) {
        const ou = `${route} ${taille ? `${taille} px` : 'défaut'} : ${x.texte}`;
        expect(x.haut, ou).toBeGreaterThanOrEqual(8);
        expect(x.bas, ou).toBeGreaterThanOrEqual(8);
        expect(x.hauteur, ou).toBeGreaterThanOrEqual(52);
        if (!taille && x.lignes === 1) expect(x.hauteur, ou).toBe(52);
      }
    }
    await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  }
});

// Les guillemets du texte de l'écran qui touchent une espace ordinaire (« suivi d'une espace, ou une espace suivie de ») :
// ils pourraient commencer ou finir seuls une ligne.
const guillemetsSeuls = (page) => page.locator('main').first().evaluate((m) => m.textContent.match(/.{0,24}(« | »).{0,24}/g) || []);

test('Réglages, Rappels et guide d\'installation : chaque guillemet tient à son mot par une espace insécable', async ({ page }) => {
  await aller(page, '#/reglages');
  await expect(page.locator('.reglages .a-propos')).toBeVisible();
  await expect(page.locator('main.reglages')).toContainText('Nouvelle version prête');
  expect(await guillemetsSeuls(page)).toEqual([]);
  await aller(page, '#/reglages/rappel');
  await expect(page.locator('main.rappel')).toContainText('chaque heure choisie');
  expect(await guillemetsSeuls(page)).toEqual([]);
  // Avec des heures choisies, le texte de la notification suit la liste des heures.
  await page.getByRole('group', { name: 'Heures des rappels' }).getByRole('button', { name: '9 h', exact: true }).click();
  await expect(page.locator('main.rappel')).toContainText('09:00');
  expect(await guillemetsSeuls(page)).toEqual([]);
  await page.goto('/?forcer-guide');
  await expect(page.locator('.guide')).toBeVisible();
  expect(await guillemetsSeuls(page)).toEqual([]);
});

test('Historique 2b : « Semaine du… » en libellé de section, puces neutres avec l\'icône de leur rubrique à sa couleur, en clair et en sombre', async ({ page }) => {
  await page.evaluate(() => window.__carnet.repo.journal.patch('2026-10-14', { lieu: 'lieu:bureau', sommeilRessenti: 'sommeil:mal', contactHumain: true }));
  for (const [schema, t] of [['light', clair], ['dark', sombre]]) {
    await page.emulateMedia({ colorScheme: schema });
    await aller(page, '#/historique');
    const semaine = page.locator('.titre-semaine').first();
    await expect(semaine).toBeVisible();
    expect(await semaine.evaluate((e) => { const s = getComputedStyle(e); return [s.textTransform, s.fontWeight, s.color]; })).toEqual(['uppercase', '600', rgb(t['text-2'])]);
    const puces = await page.locator('.puce').evaluateAll((l) => l.map((p) => ({
      texte: p.textContent, fond: getComputedStyle(p).backgroundColor, couleur: getComputedStyle(p).color,
      icone: p.querySelector('svg') && getComputedStyle(p.querySelector('svg')).color,
    })));
    expect(puces.map((p) => p.texte)).toEqual(['Bureau', 'nuit mal', 'contact oui']);
    puces.forEach((p, i) => {
      expect(p.fond).toBe(rgb(t['surface-2']));
      expect(p.couleur).toBe(rgb(t.text));
      expect(contraste(p.fond, p.couleur)).toBeGreaterThanOrEqual(4.5);
      expect(p.icone).toBe(rgb(t[`c-${['lieu', 'sommeil', 'contact'][i]}`]));
    });
  }
});
