import { readFileSync } from 'node:fs';
import { test, expect } from '../aides/gardes.js';
import { viderBase, aller, appPrete, groupe } from '../aides/saisie.js';
import { canaux, contraste, jetons } from '../aides/couleurs.js';
import { vueMoment, toucherMot, noter, continuer, terminer } from '../aides/emotion.js';
import { installerParole, cacher, montrer } from '../aides/lecteur.js';
import { stabiliser, contrastesFaibles, ciblesPetites, motsInterdits, ecouterMouvements, mouvements, verserControle as verser, rondsAccent, accentHorsDeSaPlace,
  liensSurSurface2 } from '../aides/controle.js';

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
// v8 (9/9) : le parcours passe aussi par les écrans de la v8 : le détail du Sport dans sa carte (v11 : la Durée sur sa
// roue, toujours visible), la carte de l'Émotion (une zone, toute la carte, un sens montré), le Programme, le lecteur
// (avant, étape rythmée, pause, fin) et la cohérence cardiaque de l'onglet, Mes nuits (graphique et tableau),
// « Émotions selon ce que je faisais » (graphique et tableau), Réglages › Émotions (un sens corrigé). v9 (4/8) : les
// écrans noirs de l'émotion (les quatre bulles, la carte, un mot choisi et sa carte du bas) remplacent ceux de la v8 ;
// v9 (5/8) : l'écran 3 (« Ce que je faisais », une activité choisie) et un relevé rouvert depuis Ma journée. v9 (8/8) :
// la loupe (un mot trouvé, à la couleur de sa zone), l'écran du mot à soi (une couleur choisie : le mot naît), puis ce
// mot sur la carte, hors du carré de sa zone ; « Tes zones » en tableau ; Réglages › Émotions › « Mes mots », un mot
// ouvert. Les relevés versés citent un mot à soi et un mot sans famille (Fatigué). Aucune violation de la CSP sur tout
// le parcours. v10 (7/9) : l'accueil de Bien-être plein (« Reprendre », « Favoris ») et l'épingle allumée, sur le fond
// de sa teinte puis sur le noir de « Réveil la nuit » : son dessin, qui n'est pas un texte, a au moins 3:1 sur son
// fond. v10 (9/9) : les écrans nouveaux (ECRANS_V10 : les exercices de crise, les listes des entrées, le soupir, le
// noting, les sons de fond, les deux minuteurs, « Pour ce moment : », et Réglages › Moment difficile, où la voix
// s'ajoute), dans ce parcours et, en plus, dans le leur : cibles de 44 pt au doigt, mots interdits, polices, rien de
// téléchargé, mouvement réduit. v11 (8/11) : les écrans de l'émotion suivent le thème (spec §9), noirs en sombre comme avant,
// sur le gris clair d'Aujourd'hui en clair ; le parcours les contrôle déjà dans les deux thèmes (contraste, anneau de la
// couleur d'un mot à soi à 3:1, largeur et grand texte). En plus, en très grand texte (33 à 53), la capsule où le mot choisi
// s'écrit en clair, pour le plus long mot de la carte. « Tes zones », qui suivait déjà le thème, est contrôlée sans changer.
// v11 (11/11) : les écrans nouveaux (ECRANS_V11 : le soir et ses trois roues, vides puis notées, Sport et Contact en détail,
// Mes gratitudes ; l'Analyse et « Tes gratitudes » ouvert, l'Historique par la porte Épisodes, l'épisode rouvert et « Ce que
// j'en retiens » ; Mes refuges vide et plein, Moment difficile avec ses playlists et ses titres, Bien-être et ses cinq
// entrées, le Diagnostic et « Ouvrir une playlist » ; la confirmation de « Revenir » et l'Aide iPhone), dans ce parcours et,
// en plus, dans le leur, comme ceux de la v10. Le soir y gagne le contrôle des 44 pt, qui échouait déjà en v10 sous
// « Jour précédent » (corrigé : `.sous-jour`, ecrans.css). En très grand texte (33 à 53), Mes refuges, les roues et Mes
// gratitudes. Les écrans de la connexion à Spotify sont contrôlés à part (v12-spotify.spec.js), à cause de sa garde réseau.
// v12 (6/9) : Mes refuges, une simple liste : vide, puis plein avec ses morceaux et « La suite est dans Spotify. » ; ses
// réglages (la saisie de la v11) ; en très grand texte, un titre de morceau de 70 signes sans espace. v12 (7/9) : Moment
// difficile avec ses morceaux, après Mon plan ; le Diagnostic et « Ouvrir un morceau ».
// v12 (5/9) : sur chaque écran du parcours, l'accent vert reste à sa place (spec §5.3, §5.5 et §5.6) : aucun rond sans texte ni
// icône ne l'a pour fond ou pour contour, aucun graphique, écran de l'émotion ni « Réveil la nuit » n'en a de trace, et en clair,
// aucun lien vert ne se pose sur --surface-2. Le parcours passe aussi par un jour de Mes jours touché, son détail ouvert.
// Réglages et Le soir ont des icônes sans carré.
// Horloge : jeudi 15 octobre 2026, 21:00.
const { clair, sombre } = jetons(readFileSync(new URL('../../public/css/tokens.css', import.meta.url), 'utf8'));
const rgb = (hex) => `rgb(${canaux(hex).join(', ')})`;

// Le plan et les données inventées du contrôle (verser) sont dans tests/aides/controle.js depuis la v12 (4/9) : la hauteur
// de la page du soir (v12-design.spec.js) se mesure sur les mêmes.

// Ce qui sort de l'écran de côté : la page qui défile horizontalement, un élément visible hors des 390 px, ou une ligne
// de texte qui dépasse de sa boîte jusque hors de l'écran. N'est pas compté ce qui est dans une zone qui défile de côté,
// ou coupé exprès par une ellipse (un résumé sur une ligne) ; un parent qui masque seulement son débordement ne suffit
// pas : ce qu'il coupe serait perdu. `dans` (v11) : ces éléments seuls et ce qu'ils contiennent, sans la largeur de la page,
// qu'un voisin peut élargir.
const debordements = (page, dans = null) => page.evaluate((sel) => {
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
  if (!sel && document.documentElement.scrollWidth > innerWidth + 0.5) fautes.push(`page : ${document.documentElement.scrollWidth} px de large`);
  const plage = document.createRange();
  const elements = sel ? [...document.querySelectorAll(sel)].flatMap((e) => [e, ...e.querySelectorAll('*')])
    : document.querySelectorAll('main *, .parcours *, .moment-plein *, .bandeau *, .voile *, .feuille *');
  for (const el of elements) {
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
}, dans);

// Les cadres et filets en tirets ou en pointillés des éléments visibles (2b : aucun).
const tirets = (page) => page.evaluate(() => [...document.querySelectorAll('body *')].filter((el) => {
  const r = el.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return false;
  const s = getComputedStyle(el);
  return ['Top', 'Right', 'Bottom', 'Left'].some((c) => ['dashed', 'dotted'].includes(s[`border${c}Style`]) && parseFloat(s[`border${c}Width`]) > 0);
}).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ').join('.')}`));

// Les choix faits visibles sans leur coche (jamais la couleur seule). Une question cochée a sa propre case ; le mot choisi
// de la carte des émotions (v9) a sa forme, la double capsule de 156 au lieu d'un disque de 96 (visuel §2.4) ; la couleur
// choisie d'un mot à soi (v9, les quatre bulles en petit), son anneau autour du disque (blanc sur le noir du relevé, foncé
// sur son gris clair en clair depuis la v11, couleur du texte dans Réglages). Relecture de la tâche 8 : cet anneau ne vaut coche que s'il se voit, un contour plein
// d'au moins 2 px, à 2 px au moins du disque, à 3:1 au moins sur son fond (le premier ancêtre opaque, comme plus haut).
// L'épingle allumée (v10) a sa forme aussi : son dessin se remplit ; sa couleur est mesurée par `epinglesFaibles`. La valeur
// notée d'une roue (v11) aussi : sa place au milieu de la bande (à 1 px près), sur la fenêtre (v12 : un aplat d'accent,
// .notee) et sa graisse de 600 au moins (700 jusqu'à la v11).
const sansCoche = (page) => page.evaluate(() => {
  const rgba = (c) => {
    const m = /rgba?\(([^)]+)\)/.exec(c || '');
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  };
  const lin = (v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const fond = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const c = rgba(getComputedStyle(e).backgroundColor);
      if (c && c[3] >= 0.99) return c;
    }
    return rgba(getComputedStyle(document.documentElement).backgroundColor) || [255, 255, 255, 1];
  };
  // L'anneau est dessiné hors du disque : son fond est celui du parent ; sa couleur y est fondue selon son alpha.
  const anneauVu = (b) => {
    const s = getComputedStyle(b);
    const c = rgba(s.outlineColor);
    if (s.outlineStyle !== 'solid' || parseFloat(s.outlineWidth) < 2 || parseFloat(s.outlineOffset) < 2 || !c) return false;
    const f = fond(b.parentElement);
    return ratio([0, 1, 2].map((i) => c[3] * c[i] + (1 - c[3]) * f[i]), f) >= 3;
  };
  return [...document.querySelectorAll('[aria-pressed="true"]')].filter((b) => {
    if (b.getBoundingClientRect().width < 1 || b.closest('.visuellement-cache') || b.classList.contains('question-case')) return false;
    if (b.classList.contains('bulle-mot') || (b.matches('.quatre-bulles.petites .bulle-zone') && anneauVu(b))) return false;
    if (b.classList.contains('epingle') && getComputedStyle(b.querySelector('svg')).fill !== 'none') return false;
    if (b.classList.contains('roue-valeur')) {
      const [d, r] = [b.closest('.roue-defile').getBoundingClientRect(), b.getBoundingClientRect()];
      if (Math.abs(r.left + r.width / 2 - (d.left + d.width / 2)) <= 1 && b.closest('.roue-choix.notee') && Number(getComputedStyle(b).fontWeight) >= 600) return false;
    }
    const svg = b.querySelector(':scope > .coche svg');
    return !svg || svg.getBoundingClientRect().width < 10;
  }).map((b) => b.textContent.trim().slice(0, 30));
});

// Les épingles dont le dessin (éteint ou allumé) n'a pas 3:1 sur son fond : le fond de l'épingle s'il est opaque, sinon le premier
// ancêtre opaque. Un dessin n'est pas un texte : `contrastesFaibles` ne le voit pas.
const epinglesFaibles = (page) => page.evaluate(() => {
  const rgba = (c) => {
    const m = /rgba?\(([^)]+)\)/.exec(c || '');
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  };
  const lin = (v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const fond = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const c = rgba(getComputedStyle(e).backgroundColor);
      if (c && c[3] >= 0.99) return c;
    }
    return rgba(getComputedStyle(document.documentElement).backgroundColor) || [255, 255, 255, 1];
  };
  return [...document.querySelectorAll('.epingle')].filter((b) => b.getBoundingClientRect().width > 0).map((b) => {
    const r = ratio(rgba(getComputedStyle(b.querySelector('svg')).color), fond(b));
    return r < 3 ? `épingle ${b.getAttribute('aria-label')} (${b.getAttribute('aria-pressed')}) : ${r.toFixed(2)}` : null;
  }).filter(Boolean);
});

// Les écrans nouveaux de la v10, de quoi les atteindre sans rien attendre du parcours : chacun part de son adresse, ou de l'écran
// qui le précède ici.
const bouton = (p, nom) => p.getByRole('button', { name: nom, exact: true });
// Jusqu'à l'étape voulue. Les étapes avancent aussi seules : le lecteur y est peut-être déjà.
const jusqua = async (p, selecteur) => {
  for (let i = 0; i < 4 && await p.locator(selecteur).count() === 0; i += 1) await bouton(p, 'Suivant').click();
};
const ECRANS_V10 = [
  // v10 (5/9, 9/9) : les quatre boutons de Moment difficile. Un toucher démarre aussitôt : une consigne, une étape rythmée, la
  // pause (ses réglages, pour cette fois). Ouvert par son adresse, l'exercice attend « Commencer ». Puis « Réveil la nuit », sur son
  // fond noir : avant, sur son étape rythmée, en pause (la voix seule, sans signal).
  ['Moment difficile, les quatre boutons', async (p) => { await aller(p, '#/aujourdhui'); await aller(p, '#/moment-difficile'); }, '.exercices-courts .exercice-court'],
  ['Panique, lancée d\'un toucher', (p) => p.getByRole('group', { name: 'Un exercice court' }).getByRole('button', { name: 'Panique', exact: true }).click(), '.lecteur-plein .lecteur-consigne'],
  ['Panique, étape rythmée', (p) => jusqua(p, '.mot-souffle'), '.mot-souffle'],
  ['Panique, en pause', (p) => bouton(p, 'Pause').click(), '.reglages-pause .reglages-lecteur'],
  ['Panique, ouverte par son adresse', async (p) => { await aller(p, '#/aujourdhui'); await aller(p, '#/crise/panique'); }, '.lecteur-avant .reglages-lecteur'],
  ['Réveil la nuit, ouvert par son adresse', async (p) => { await aller(p, '#/aujourdhui'); await aller(p, '#/crise/reveil-nuit'); }, '.parcours.ecran-noir .lecteur-avant'],
  ['Réveil la nuit, étape rythmée', async (p) => { await bouton(p, 'Commencer').click(); await jusqua(p, '.mot-souffle'); }, '.parcours.ecran-noir .mot-souffle'],
  ['Réveil la nuit, en pause', (p) => bouton(p, 'Pause').click(), '.parcours.ecran-noir .reglages-pause .reglages-lecteur'],
  // v10 (7/9) : l'accueil plein, une liste où des épingles sont allumées, et l'écran « avant » de « Réveil la nuit », épinglé, sur
  // son fond noir. Une séance du Programme est épinglée elle aussi : le Programme a son épingle allumée.
  ['Bien-être plein', async (p) => {
    await aller(p, '#/aujourdhui');
    await p.evaluate(async () => {
      localStorage.setItem('carnet:bien-etre:dernier', JSON.stringify('expiration-longue'));
      await window.__carnet.repo.meta.ecrire('favorisBienEtre', ['soupir', 'reveil-nuit', 'sons-de-fond', 'les-sons']);
    });
    await aller(p, '#/bien-etre');
  }, '.bien-etre .carte-reprendre .bouton-lecture'],
  ['Me calmer vite, une épingle allumée', (p) => aller(p, '#/bien-etre/calmer'), '.entree-bien-etre .epingle[aria-pressed="true"]'],
  ['Dormir ou me rendormir', (p) => aller(p, '#/bien-etre/dormir'), '.entree-bien-etre .ligne-element'],
  ['Me concentrer', (p) => aller(p, '#/bien-etre/concentrer'), '.entree-bien-etre .ligne-element'],
  ['Réveil la nuit, épinglé', (p) => aller(p, '#/exercice/reveil-nuit'), '.lecteur-avant .epingle[aria-pressed="true"]'],
  // v10 (4/9, 9/9) : le soupir (sa durée au choix, puis son étape rythmée et sa petite inspiration en plus), et le noting (ses
  // quatre étiquettes, l'une d'elles touchée).
  ['Le soupir', (p) => aller(p, '#/exercice/soupir'), '.lecteur-avant .reglages-lecteur'],
  ['Le soupir, étape rythmée', async (p) => { await bouton(p, 'Commencer').click(); await jusqua(p, '.mot-souffle'); }, '.mot-souffle'],
  ['Noter ce qui passe', (p) => aller(p, '#/exercice/noting'), '.lecteur-avant .reglages-lecteur'],
  ['Noter ce qui passe, les étiquettes', async (p) => {
    await bouton(p, 'Commencer').click();
    await jusqua(p, '.etiquettes-noting');
    await bouton(p, 'Corps').click();
  }, '.etiquettes-noting .etiquette-noting'],
  // v10 (6/9, 9/9) : les sons de fond, le minuteur silencieux (en cours, puis en pause, la page cachée puis revue) et le minuteur de
  // concentration (en cours, puis le temps passé), chacun avant et pendant.
  ['Sons de fond', (p) => aller(p, '#/sons'), '.lecteur-avant .choix-son'],
  ['Sons de fond en cours', (p) => bouton(p, 'Commencer').click(), '.lecteur-plein .reglage-volume'],
  ['Minuteur silencieux', (p) => aller(p, '#/minuteur'), '.lecteur-avant .reglages-lecteur'],
  ['Minuteur silencieux en cours', (p) => bouton(p, 'Commencer').click(), '.lecteur-plein .lecteur-consigne'],
  ['Minuteur silencieux en pause', async (p) => { await cacher(p); await montrer(p); }, '.lecteur-plein .bouton-lecture'],
  ['Minuteur de concentration', (p) => aller(p, '#/concentration'), '.lecteur-avant .reglages-lecteur'],
  ['Minuteur de concentration en cours', (p) => bouton(p, 'Commencer').click(), '.lecteur-plein .temps-restant'],
  ['Minuteur de concentration, le temps passé', (p) => p.clock.fastForward('25:01'), '.lecteur-plein > .lecteur-consigne'],
  // v10 (8/9, 9/9) : l'écran 3 d'un relevé neuf, sa garde passée : « Pour ce moment : » et ses exercices.
  ['Émotion du moment, Pour ce moment', async (p) => {
    await aller(p, '#/aujourdhui');
    await aller(p, '#/moment');
    const vue = vueMoment(p);
    await noter(vue, 'rouge', 'Irrité');
    await continuer(vue).click();
    await expect(terminer(vue)).not.toHaveAttribute('aria-disabled', 'true');
  }, '.pour-ce-moment .proposition'],
  // Relecture finale : Réglages › Moment difficile, où « Lire les consignes à voix haute » s'ajoute au signal sonore.
  ['Réglages › Moment difficile, la voix', (p) => aller(p, '#/reglages/moment-difficile'), '.reglages-moment-difficile .interrupteur[aria-label="Lire les consignes à voix haute"]'],
];

// Les écrans nouveaux de la v11, sur le même modèle : chacun part de son adresse, ou de l'écran qui le précède ici, et pose
// ce qu'il lui faut. Mes refuges, inventés : deux titres, une playlist venue de Spotify (nommé à côté) et une collée. v12 : la
// playlist de Spotify a ses morceaux, inventés, et une suite ; ses identifiants sont factices (22 signes), le dépôt est public.
const ID_FACTICE = (debut) => debut.padEnd(22, '0');
const MORCEAUX = ['Pluie lente', 'Le matin calme', 'Rivière douce', 'Sous les pins', 'Marée basse', 'Brume du lac', 'Nuit claire', 'Pas à pas']
  .map((titre, i) => ({ id: ID_FACTICE(`mo${i + 1}`), titre, artiste: i % 3 === 2 ? null : 'Les Vagues Douces' }));
const REFUGES = {
  titres: 'Pluie lente\nLe matin calme',
  playlists: [
    { nom: 'Pour souffler', lien: `https://open.spotify.com/playlist/${ID_FACTICE('pl1')}`, source: 'spotify', morceaux: MORCEAUX, suite: true },
    { nom: 'Pour marcher', lien: 'https://music.apple.com/fr/playlist/marcher/pl.u-abc', source: null },
  ],
};
// Les trois roues du soir, avec la valeur qu'un toucher y note.
const ROUES = [['Durée de la nuit', '7 h 30'], ['Durée du sport', '30 à 60 min'], ['Comment c\'était', 'Ressourçant']];
// Une valeur au milieu de sa bande, à 1 px près, la bande arrêtée.
const auMilieu = (b) => expect.poll(() => b.evaluate((x) => {
  const [d, r] = [x.closest('.roue-defile').getBoundingClientRect(), x.getBoundingClientRect()];
  return Math.abs(r.left + r.width / 2 - (d.left + d.width / 2));
})).toBeLessThanOrEqual(1);
// Un écran remonté : en passant par Réglages, il relit la base.
const remonter = async (p, adresse) => { await aller(p, '#/reglages'); await expect(p.locator('.reglages .a-propos')).toBeVisible(); await aller(p, adresse); };
const ECRANS_V11 = [
  // v11 (2/11, 3/11) : le soir et ses trois roues, toujours visibles. Vides : rien de marqué, la bande centrée, une teinte neutre ;
  // puis notées d'un toucher (Oui mis avec la durée du sport et l'effet du contact), la valeur au milieu, en 700, sans coche.
  ['Le soir, trois roues vides', async (p) => {
    await p.evaluate(() => window.__carnet.repo.journal.patch('2026-10-15', { heuresSommeil: null, sportMouvement: null, activites: null, contactHumain: null, contacts: null }));
    await remonter(p, '#/aujourdhui');
    await expect(p.locator('.aujourdhui .roue-choix')).toHaveCount(3);
    await expect(p.locator('.aujourdhui .roue-choix [aria-pressed="true"]')).toHaveCount(0);
  }, '.aujourdhui .roue-choix'],
  ['Le soir, trois roues notées', async (p) => {
    for (const [nom, v] of ROUES) {
      const b = groupe(p, nom).getByRole('button', { name: v, exact: true });
      await b.click();
      await expect(b).toHaveAttribute('aria-pressed', 'true');
      await auMilieu(b);
    }
    await expect(p.locator('.aujourdhui .roue-choix.notee')).toHaveCount(3);
  }, '.aujourdhui .roue-choix.notee'],
  // v11 (3/11) : Sport et Contact en détail, la durée et l'effet sur la même roue, qui suit la carte.
  ['Le soir, Sport et Contact en détail', async (p) => {
    await bouton(p, 'Sport en détail').click();
    await bouton(p, 'Contact en détail').click();
    for (const [nom, v] of [['Activité 1 : durée', '30 à 60 min'], ['Contact 1 : comment c\'était', 'Ressourçant']]) {
      const b = groupe(p, nom).getByRole('button', { name: v, exact: true });
      await expect(b).toHaveAttribute('aria-pressed', 'true');
      await auMilieu(b);
    }
  }, '.aujourdhui [role="group"][aria-label="Contact 1 : comment c\'était"] .roue-valeur[aria-pressed="true"]'],
  // v11 (4/11) : Mes gratitudes, écrites, juste sous Mes points positifs.
  ['Le soir, Mes gratitudes', async (p) => {
    await p.getByRole('textbox', { name: 'Mes gratitudes', exact: true }).fill('Merci à la voisine pour le colis.');
    await expect.poll(() => p.evaluate(() => window.__carnet.repo.journal.lire('2026-10-15').then((e) => e && e.gratitudes))).toBe('Merci à la voisine pour le colis.');
  }, '.aujourdhui #gratitudes'],
  // v11 (4/11, 5/11) : l'Analyse, ses deux portes Historique et Épisodes, et « Tes gratitudes » ouvert.
  ['Analyse, Tes gratitudes ouvert', async (p) => {
    await aller(p, '#/analyse');
    await expect(p.locator('main')).not.toContainText('Calcul…', { timeout: 30000 });
    await p.getByRole('button', { name: /^Tes gratitudes/ }).click();
  }, '.analyse .repli-tete[aria-expanded="true"]:has-text("Tes gratitudes")'],
  // v11 (5/11) : l'Historique par la porte Épisodes, forcé sur ce segment.
  ['Historique, par la porte Épisodes', async (p) => {
    await p.getByRole('navigation', { name: 'Historique, épisodes et Comprendre' }).getByRole('link', { name: 'Épisodes', exact: true }).click();
    await expect(p.getByRole('group', { name: 'Afficher' }).getByRole('button', { name: /Épisodes/ })).toHaveAttribute('aria-pressed', 'true');
  }, '.historique a.ligne-hist[href^="#/episode/"]'],
  // v11 (5/11) : l'épisode rouvert et « Ce que j'en retiens », écrit, sous la carte Après coup.
  ['Épisode rouvert, Ce que j\'en retiens', async (p) => {
    await p.locator('.historique a.ligne-hist[href^="#/episode/"]').first().click();
    const zone = p.getByRole('textbox', { name: 'Ce que j\'en retiens', exact: true });
    await zone.fill('Partir avant que ça monte.');
    await expect.poll(() => p.evaluate(() => window.__carnet.repo.episodes.tous().then((l) => l.map((e) => e.ceQueJeRetiens)))).toContain('Partir avant que ça monte.');
  }, '.recap ~ .champ-recap #episodes-ceQueJeRetiens'],
  // v11 (6/11, 7/11 ; v12, 6/9) : Mes refuges vide (sa phrase, « Choisir dans mon compte », jamais touché ici, et « Coller un
  // lien »), puis plein : une playlist de Spotify, nommé à côté, une collée, chacune s'écoute d'un toucher ; ses morceaux,
  // « La suite est dans Spotify. » et ses titres, en lecture seule. Puis ses réglages : la saisie de la v11, les boutons de
  // Spotify et « Retirer ces playlists ».
  ['Mes refuges, vide', async (p) => {
    await p.evaluate(() => window.__carnet.repo.meta.ecrire('refuges', null));
    await remonter(p, '#/refuges');
  }, 'main.refuges .refuges-vide .btn-plein'],
  ['Mes refuges, plein', async (p) => {
    await p.evaluate((r) => window.__carnet.repo.meta.ecrire('refuges', r), REFUGES);
    await remonter(p, '#/refuges');
    await expect(p.locator('main.refuges a.lien-refuge')).toHaveCount(2);
    await expect(p.locator('main.refuges .ligne-morceau')).toHaveCount(MORCEAUX.length);
  }, 'main.refuges .titres-refuges'],
  ['Réglages de Mes refuges', (p) => p.locator('main.refuges').getByRole('link', { name: 'Modifier', exact: true }).click(),
    'main.refuges-reglages #refuges-nom-0'],
  // v11 (6/11) : Moment difficile, ses playlists sous « Une chose à la fois » et ses titres avec Mon plan. v12 (7/9) : ses
  // morceaux après Mon plan, sous le nom de la playlist, et « La suite est dans Spotify. ».
  ['Moment difficile, playlists, titres et morceaux', async (p) => {
    await remonter(p, '#/moment-difficile');
    await expect(p.locator('.plan-moment')).toContainText('Pluie lente');
    await expect(p.locator('.moment-difficile a.lien-refuge')).toHaveCount(2);
    await expect(p.locator('.moment-difficile .morceaux-moment .ligne-morceau')).toHaveCount(MORCEAUX.length);
    await expect(p.locator('.moment-difficile .morceaux-moment .note-refuges')).toHaveText('La suite est dans Spotify.');
  }, '.moment-difficile .morceaux-moment .ligne-morceau'],
  // v11 (6/11) : Bien-être et ses cinq entrées, Mes refuges après le Programme.
  ['Bien-être, cinq entrées', async (p) => {
    await aller(p, '#/bien-etre');
    await expect(p.getByRole('list', { name: 'Entrées' }).getByRole('link')).toHaveText(['Me calmer vite', 'Dormir ou me rendormir', 'Me concentrer', 'Programme', 'Mes refuges']);
  }, '.bien-etre .entrees .ligne-carte'],
  // v11 (6/11) : le Diagnostic, « Ouvrir une playlist » et ses trois formes du lien, jamais suivies. v12 (7/9) : « Ouvrir un
  // morceau », les deux formes du premier morceau gardé.
  ['Diagnostic, Ouvrir un morceau', async (p) => {
    await aller(p, '#/diagnostic');
    await expect(p.locator('.diag section[aria-labelledby="titre-ouvrir-morceau"] a.btn')).toHaveText(['Morceau seul', 'Morceau dans sa playlist']);
  }, '.diag section[aria-labelledby="titre-ouvrir-morceau"] a.btn'],
  // v11 (10/11) : « Revenir à l'état d'avant l'import » demande confirmation : une copie posée en base, comme après un import.
  ['Confirmation « Revenir »', async (p) => {
    await p.evaluate(() => window.__carnet.repo.tx(['snapshots'], 'readwrite', (t) => {
      t.objectStore('snapshots').put({ id: 'avant-import-2026-10-12T19:00:00.000Z', type: 'avant-import', date: '2026-10-12T19:00:00.000Z', schemaVersion: 6, data: {} });
    }));
    await aller(p, '#/bien-etre');
    await expect(p.locator('.bien-etre .entrees')).toBeVisible();
    await aller(p, '#/reglages');
    await p.getByRole('button', { name: 'Revenir à l\'état d\'avant l\'import', exact: true }).click();
  }, '.boite-confirmation'],
  // v11 (10/11) : Aide iPhone et sa septième rubrique, « Changer d'icône sans rien perdre ».
  ['Aide iPhone, changer d\'icône', async (p) => {
    await p.getByRole('button', { name: 'Annuler', exact: true }).click();
    await aller(p, '#/reglages/aide-iphone');
    await expect(p.locator('.aide-rubrique h2')).toHaveCount(7);
  }, '.aide-rubrique h2:has-text("Changer d\'icône sans rien perdre")'],
];

// Les écrans parcourus : [nom, préparation]. `ids` : les identifiants versés.
const ECRANS = (ids) => [
  ['Aujourd\'hui', (p) => aller(p, '#/aujourdhui'), '.aujourdhui .evenements-jour'],
  // v8 (9/9) : le détail du Sport (« Détail › ») ouvert dans sa carte ; v11 : la Durée de la nuit sur sa roue, toujours là,
  // une nuit notée (la valeur au milieu, en 700, sans coche). v11 (3/11) : la durée du sport notée sur la roue de sa carte,
  // étroite, et celle du détail, qui la suit.
  ['Aujourd\'hui, Sport en détail', async (p) => {
    const sport = p.getByRole('group', { name: 'Durée du sport', exact: true }).getByRole('button', { name: '30 à 60 min', exact: true });
    await sport.click();
    await expect(sport).toHaveAttribute('aria-pressed', 'true');
    await p.getByRole('button', { name: 'Sport en détail', exact: true }).click();
    const notee = p.getByRole('group', { name: 'Durée de la nuit', exact: true }).getByRole('button', { name: '7 h 30', exact: true });
    await notee.click();
    await expect(notee).toHaveAttribute('aria-pressed', 'true');
    const detail = p.getByRole('group', { name: 'Activité 1 : durée', exact: true }).getByRole('button', { name: '30 à 60 min', exact: true });
    await expect(detail).toHaveAttribute('aria-pressed', 'true');
    for (const b of [sport, notee, detail]) {
      await expect.poll(() => b.evaluate((x) => {
        const [d, r] = [x.closest('.roue-defile').getBoundingClientRect(), x.getBoundingClientRect()];
        return Math.abs(r.left + r.width / 2 - (d.left + d.width / 2));
      })).toBeLessThanOrEqual(1);
    }
  }, '.aujourdhui .roue-choix.notee'],
  // v9 (4/8) : les écrans de l'émotion, comme How We Feel (noirs ; selon le thème depuis la v11) : les quatre bulles et
  // « C'était vers… » ouvert, puis la carte ouverte par une bulle, puis un mot au sens corrigé, choisi : la double capsule et
  // sa carte du bas (en clair, le mot sur sa capsule).
  ['Émotion du moment', async (p) => {
    await aller(p, '#/moment');
    await p.getByRole('button', { name: 'Maintenant', exact: true }).click();
  }, '.quatre-bulles .face .etiquette-bulle'],
  ['Émotion du moment, carte', (p) => p.getByRole('button', { name: 'Énergie haute, désagréable', exact: true }).click(), '.carte-plan .bulle-mot'],
  ['Émotion du moment, un mot et son sens', async (p) => {
    await toucherMot(vueMoment(p), 'Irrité');
    await expect(p.locator('.definition-carte-du-bas')).toHaveText('Agacé par ce qui se répète, et ça dure.');
  }, '.bulle-mot.choisi'],
  ['Émotion du moment, Ce que je faisais', async (p) => {
    await p.getByRole('button', { name: 'Continuer', exact: true }).click();
    await p.getByRole('group', { name: 'Ce que je faisais', exact: true }).getByRole('button', { name: 'Travail', exact: true }).click();
  }, '.choix-faisais .pastille[aria-pressed="true"]'],
  ['Émotion du moment, un relevé rouvert', async (p) => {
    await p.getByRole('button', { name: 'Terminer', exact: true }).click();
    await p.locator('.liste-evenements a.releve').first().click();
  }, '.ecran-faisais .supprimer-releve'],
  // v9 (8/8) : la loupe, un mot trouvé ; l'écran du mot à soi, une couleur choisie (le mot naît, avec sa famille et sa
  // définition à compléter) ; puis la carte, ce mot choisi hors du carré de sa zone, et sa carte du bas.
  ['Émotion du moment, la loupe', async (p) => {
    await aller(p, '#/aujourdhui');
    await aller(p, '#/moment');
    await p.getByRole('button', { name: 'Chercher un mot', exact: true }).click();
    await p.getByRole('searchbox', { name: 'Chercher un mot', exact: true }).fill('fat');
  }, '.resultats-loupe .resultat-loupe .extrait-resultat'],
  ['Émotion du moment, mon mot', async (p) => {
    await p.getByRole('searchbox', { name: 'Chercher un mot', exact: true }).fill('brumeux');
    await p.getByRole('button', { name: 'Ajouter mon mot « Brumeux »', exact: true }).click();
    await p.getByRole('group', { name: 'Couleur', exact: true }).getByRole('button', { name: 'Énergie basse, désagréable', exact: true }).click();
  }, '.ecran-mot .formulaire-mot [role="group"][aria-label="Famille"]'],
  ['Émotion du moment, mon mot sur la carte', (p) => p.getByRole('button', { name: 'Continuer', exact: true }).click(), '.bulle-mot.choisi'],
  ['Épisode, étape 1', async (p) => { await aller(p, '#/aujourdhui'); await aller(p, '#/episode/nouveau'); }, '.titre-question'],
  ['Épisode rouvert', async (p) => { await aller(p, '#/aujourdhui'); await aller(p, `#/episode/${ids.ep}`); }, '.recap'],
  ['Moment difficile', async (p) => { await aller(p, '#/aujourdhui'); await aller(p, '#/moment-difficile'); }, '.plan-moment'],
  ['Analyse', (p) => aller(p, '#/analyse'), '.analyse .selecteur-periode'],
  // v12 (5/9) : le dernier jour de Mes jours touché, son détail ouvert et son lien « Voir ce jour » (sur le fond de l'écran, et non
  // sur --surface-2 : spec §5.3).
  ['Analyse, un jour de Mes jours touché', (p) => p.locator('figure.graphe', { hasText: 'Mes jours' }).locator('rect.g-zone').last().click(),
    'figure.graphe .detail-colonne a.lien'],
  // v9 (8/8) : « Tes zones », ses bulles comptées, puis sa barre par semaine en tableau.
  ['Analyse, Tes zones en tableau', (p) => p.locator('section.tes-zones').getByRole('button', { name: 'Voir en tableau' }).click(),
    'section.tes-zones figure.g-zones-semaines table'],
  ['Comprendre, Explosions', (p) => aller(p, '#/comprendre/explosions'), '.comprendre figure.graphe'],
  // v8 (9/9) : le graphique « Émotions selon ce que je faisais » (Q18) dessiné, puis son tableau.
  ['Comprendre, Énergie', (p) => aller(p, '#/comprendre/energie'), '.comprendre figure.graphe svg[aria-label^="Émotions selon ce que je faisais"]'],
  ['Comprendre, Émotions selon ce que je faisais en tableau',
    (p) => p.locator('figure.graphe', { has: p.locator('svg[aria-label^="Émotions selon ce que je faisais"]') }).getByRole('button', { name: 'Voir en tableau' }).click(),
    '.comprendre figure.graphe:has-text("Émotions selon ce que je faisais") table.tableau-familles'],
  ['Comprendre, Rythmes', (p) => aller(p, '#/comprendre/rythmes'), '.comprendre figure.g-mes-nuits svg'],
  // v8 (9/9) : Mes nuits en tableau.
  ['Comprendre, Mes nuits en tableau', (p) => p.locator('figure.g-mes-nuits').getByRole('button', { name: 'Voir en tableau' }).click(),
    '.comprendre figure.g-mes-nuits table'],
  ['Historique', (p) => aller(p, '#/historique'), '.historique .semaine'],
  ['Historique, filtres', (p) => p.getByRole('button', { name: /Filtrer/ }).click(), '.filtres'],
  ['Bien-être', (p) => aller(p, '#/bien-etre'), '.bien-etre .entrees .ligne-carte'],
  ...ECRANS_V10,
  ...ECRANS_V11,
  // v8 : le Programme (une séance faite porte « Faite le »), puis le lecteur, avant de commencer, sur une étape rythmée
  // (le disque et « Inspire »), puis en pause (ses réglages, sous l'écran de lecture).
  ['Programme', (p) => aller(p, '#/bien-etre/programme'), '.programme .seance-faite'],
  ['Exercice', (p) => aller(p, '#/bien-etre/programme/respiration-carree'), '.lecteur-avant .reglages-lecteur'],
  ['Exercice, étape rythmée', async (p) => {
    await p.getByRole('button', { name: 'Commencer', exact: true }).click();
    for (let i = 0; i < 6; i += 1) await p.getByRole('button', { name: 'Suivant', exact: true }).click();
  }, '.mot-souffle'],
  ['Exercice en pause', (p) => p.getByRole('button', { name: 'Pause', exact: true }).click(), '.reglages-pause .reglages-lecteur'],
  // v8 (9/9) : la fin (« Fin de l'exercice. » seul), puis la cohérence cardiaque de l'onglet dans le lecteur, avant de
  // commencer et pendant (le disque, sans étapes).
  ['Exercice, fin', (p) => p.getByRole('button', { name: 'Terminer', exact: true }).click(), '.lecteur-plein > .lecteur-consigne'],
  ['Cohérence cardiaque', async (p) => { await aller(p, '#/bien-etre'); await aller(p, '#/bien-etre/coherence'); }, '.lecteur-avant .reglages-lecteur'],
  ['Cohérence cardiaque en cours', (p) => p.getByRole('button', { name: 'Commencer', exact: true }).click(), '.mot-souffle'],
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
  // v8 (9/9) : le sens corrigé d'Irrité, ouvert dans son champ, et « Revenir au texte d'Emozio ».
  ['Réglages › Émotions, un sens corrigé', (p) => p.getByRole('button', { name: /^Irrité/ }).click(), '.reglages-emotions .champ-definition + .revenir-carnet'],
  // v9 (8/8) : « Mes mots », Flottant (versé) et Brumeux (né dans la loupe) ; Flottant ouvert dans son formulaire.
  ['Réglages › Émotions, Mes mots', (p) => p.getByRole('button', { name: /^Flottant/ }).click(), '.reglages-emotions .editeur-mot .formulaire-mot'],
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

// v9 (8/8) : chaque écran dit aussi les violations de la CSP survenues depuis l'écran d'avant. `ecrans` : la liste parcourue,
// tous les écrans au départ (v10 : ou ceux de la v10 seuls).
async function parcourir(page, schema, verifier, ecrans = ECRANS) {
  await page.emulateMedia({ colorScheme: schema });
  await page.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.sourceFile || ''}`));
  });
  const ids = await verser(page);
  await page.reload();
  await appPrete(page);
  const fautes = {};
  for (const [nom, preparer, attendu] of ecrans(ids)) {
    await preparer(page);
    await expect(page.locator(attendu).first(), `${schema} : ${nom}`).toBeVisible({ timeout: 15000 });
    if (nom === 'Analyse') await expect(page.locator('main')).not.toContainText('Calcul…', { timeout: 30000 });
    await stabiliser(page);
    const f = await verifier(nom);
    f.push(...(await page.evaluate(() => (window.__csp || []).splice(0))).map((x) => `CSP : ${x}`));
    if (f.length) fautes[nom] = f;
  }
  return fautes;
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  // Une voix française : les réglages de la voix du lecteur sont à l'écran, et seuls sur le noir de « Réveil la nuit ».
  await installerParole(page);
  await page.goto('/');
  await viderBase(page);
});

// v12 (5/9) : sur chaque écran, l'accent vert reste à sa place (spec §5.3, §5.5 et §5.6). La règle de forme : aucun rond sans
// texte ni icône ne l'a pour fond ou pour contour ; le point de vigilance 3 : aucune trace de lui dans les graphiques, sur les
// écrans de l'émotion ni sur « Réveil la nuit » ; et, en clair, aucun lien vert sur --surface-2 (tests/aides/controle.js).
for (const schema of ['light', 'dark']) {
  test(`contraste ${schema === 'light' ? 'en clair' : 'en sombre'} : tout texte visible des écrans principaux a au moins 4,5:1 sur son fond ; ni tirets, ni choix fait sans coche ; l'accent vert à sa place`, async ({ page }) => {
    test.setTimeout(240000);
    const t = schema === 'light' ? clair : sombre;
    const accents = [rgb(t.accent), rgb(t['accent-texte'])];
    const fautes = await parcourir(page, schema, async (nom) => [
      ...await contrastesFaibles(page, nom.startsWith('Confirmation') ? '.boite-confirmation' : 'body'),
      ...await epinglesFaibles(page),
      ...(await tirets(page)).map((x) => `tirets : ${x}`),
      ...(await sansCoche(page)).map((x) => `choix fait sans coche : ${x}`),
      ...(await rondsAccent(page, accents)).map((x) => `rond à l'accent : ${x}`),
      ...(await accentHorsDeSaPlace(page, accents)).map((x) => `accent hors de sa place : ${x}`),
      ...(schema === 'light' ? await liensSurSurface2(page, rgb(t['accent-texte']), rgb(t['surface-2'])) : []),
    ]);
    expect(fautes).toEqual({});
  });
}

// Toute police à empattements calculée sur la page, pseudo-éléments compris.
const empattements = (page) => page.evaluate(() => {
  const fautes = new Set();
  for (const e of document.querySelectorAll('*')) {
    for (const pseudo of [null, '::before', '::after']) {
      const f = getComputedStyle(e, pseudo).fontFamily;
      if (/ui-serif|georgia|new york|times|(?<!sans-)serif/i.test(f)) fautes.add(`${e.tagName} ${e.getAttribute('class') || ''} ${pseudo || ''} : ${f}`);
    }
  }
  return [...fautes];
});

// Un fichier son, une police, ou quoi que ce soit d'une autre origine, parmi ces adresses demandées par la page (les sons de fond
// sont fabriqués sur place). Les gardes (gardes.js) font déjà échouer toute requête vers une autre origine, ici comme ailleurs.
const telecharges = (adresses) => adresses.filter((u) => /\.(mp3|m4a|aac|wav|ogg|flac|woff2?|ttf|otf)($|\?)/i.test(u) || !u.startsWith('http://127.0.0.1'));

// Le contrôle des écrans de la v10, en clair et en sombre, avec « Réduire les animations » allumé : le contraste, les tirets et
// le débordement sont vérifiés plus haut, sur le parcours entier.
for (const schema of ['light', 'dark']) {
  test(`écrans de la v10 ${schema === 'light' ? 'en clair' : 'en sombre'} : cibles de 44 pt, aucun mot interdit, aucune police à empattements, rien de téléchargé, aucune requête sortante ni violation de la CSP, rien qui bouge en mouvement réduit`, async ({ page }) => {
    test.setTimeout(120000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await ecouterMouvements(page);
    const demandes = [];
    page.on('request', (r) => { if (!['blob:', 'data:'].includes(new URL(r.url()).protocol)) demandes.push(r.url()); });
    const fautes = await parcourir(page, schema, async () => [
      ...(await ciblesPetites(page)).map((x) => `cible : ${x}`),
      ...(await motsInterdits(page)).map((x) => `mot interdit : ${x}`),
      ...(await empattements(page)).map((x) => `police : ${x}`),
      ...telecharges(demandes.splice(0)).map((x) => `téléchargé : ${x}`),
      ...(await mouvements(page)).map((x) => `mouvement : ${x}`),
    ], () => ECRANS_V10);
    expect(fautes).toEqual({});
  });
}

// v11 (11/11) : les écrans de la v11, de même, en clair et en sombre, avec « Réduire les animations » allumé. Le contraste, les
// tirets, les coches, la CSP et le débordement à 390 px sont vérifiés plus haut, sur le parcours entier, qui passe par eux.
for (const schema of ['light', 'dark']) {
  test(`écrans de la v11 ${schema === 'light' ? 'en clair' : 'en sombre'} : cibles de 44 pt, aucun mot interdit, aucune police à empattements, rien de téléchargé, aucune requête sortante ni violation de la CSP, rien qui bouge en mouvement réduit`, async ({ page }) => {
    test.setTimeout(120000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await ecouterMouvements(page);
    const demandes = [];
    page.on('request', (r) => { if (!['blob:', 'data:'].includes(new URL(r.url()).protocol)) demandes.push(r.url()); });
    const fautes = await parcourir(page, schema, async (nom) => [
      ...(await ciblesPetites(page, nom.startsWith('Confirmation') ? '.boite-confirmation' : null)).map((x) => `cible : ${x}`),
      ...(await motsInterdits(page)).map((x) => `mot interdit : ${x}`),
      ...(await empattements(page)).map((x) => `police : ${x}`),
      ...telecharges(demandes.splice(0)).map((x) => `téléchargé : ${x}`),
      ...(await mouvements(page)).map((x) => `mouvement : ${x}`),
    ], () => ECRANS_V11);
    expect(fautes).toEqual({});
  });
}

// Contre-relecture : Réglages › Le soir, hérité de la v6.1. Ses interrupteurs n'avaient pas la zone de toucher de 47 : une touche à 21 pt
// du centre tombait sur la rangée, qui ne bascule rien. Ils voisinent avec les flèches : chacun garde ses 44 pt, sans mordre sur l'autre.
test('Réglages › Le soir : cibles de 44 pt, les interrupteurs et leurs flèches voisines compris', async ({ page }) => {
  await aller(page, '#/reglages/journee');
  await expect(page.locator('.ma-journee .interrupteur').first()).toBeVisible();
  await stabiliser(page);
  const nombre = await page.locator('.ligne-champ-reglage .interrupteur').count();
  expect(nombre).toBeGreaterThanOrEqual(10);
  expect(await page.locator('.ligne-champ-reglage .fleche').count()).toBeGreaterThan(0);
  expect(await ciblesPetites(page)).toEqual([]);
  // Le contrôle voit pour de bon un interrupteur sans sa zone et une flèche de 42.
  await page.evaluate(() => {
    const feuille = document.styleSheets[0];
    feuille.insertRule('.interrupteur::after { content: none !important; }', feuille.cssRules.length);
    feuille.insertRule('.fleche { width: 42px !important; }', feuille.cssRules.length);
  });
  const abimees = await ciblesPetites(page);
  expect(abimees.filter((x) => x.startsWith('button.interrupteur'))).toHaveLength(nombre);
  expect(abimees.filter((x) => x.startsWith('button.fleche')).length).toBeGreaterThan(0);
});

// Le contrôle lui-même, dans le même ordre que `parcourir` : trois mouvements de 50 ms, finis quand il regarde.
test('le contrôle du mouvement voit ce qui a déjà fini de bouger : une animation CSS, une transition, une animation lancée par le code', async ({ page }) => {
  await ecouterMouvements(page);
  await page.reload();
  await appPrete(page);
  await stabiliser(page);
  await mouvements(page); // Ce qu'a lancé l'ouverture de l'app.
  await page.evaluate(() => {
    document.styleSheets[0].insertRule('@keyframes essai-mouvement { from { opacity: 0.5; } }');
    const [a, b, c] = ['essai-a', 'essai-b', 'essai-c'].map((classe) => {
      const el = document.createElement('div');
      el.className = classe;
      document.body.append(el);
      return el;
    });
    a.style.animation = 'essai-mouvement 50ms';
    b.style.transition = 'opacity 50ms';
    void getComputedStyle(b).opacity; // Le départ de la transition : sans ce calcul, le navigateur ne voit aucun changement.
    b.style.opacity = '0.5';
    c.animate([{ opacity: 0.5 }, { opacity: 1 }], 50);
  });
  await stabiliser(page);
  const essais = async () => (await mouvements(page)).filter((x) => x.includes('essai-'));
  expect(await page.locator('.essai-a, .essai-b, .essai-c').evaluateAll((els) => els.flatMap((el) => el.getAnimations()).length), 'tout est fini').toBe(0);
  expect((await essais()).sort()).toEqual(['animate() de essai-c', 'animationstart essai-mouvement de essai-a', 'transitionrun opacity de essai-b']);
  expect(await essais(), 'la liste se vide à chaque contrôle').toEqual([]);
});

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

// v11 (8/11) : la capsule du mot choisi, à la carte du bas (elle reste dans la carte, avant la flèche) et à l'écran 3 (elle tient
// dans l'écran, et son texte, qui passe à la ligne s'il le faut, y reste). Rien ne défile de côté. En sombre, sans capsule, le
// mot obéit aux mêmes règles.
const capsuleDebordante = (page, selecteur) => page.locator(selecteur).evaluate((e) => {
  const fautes = [];
  const r = e.getBoundingClientRect();
  if (r.left < -0.5 || r.right > innerWidth + 0.5) fautes.push(`hors de l'écran : ${Math.round(r.left)} → ${Math.round(r.right)}`);
  const plage = document.createRange();
  plage.selectNodeContents(e);
  // De côté, chaque ligne reste dans la capsule ; en hauteur, ce sont ses lignes qui la font, et la boîte des lettres, plus
  // haute que le pas des lignes, la dépasse sans rien en montrer.
  if ([...plage.getClientRects()].some((q) => q.width > 0 && (q.left < r.left - 0.5 || q.right > r.right + 0.5))) fautes.push('texte hors de la capsule');
  if (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1) fautes.push('coupé');
  const carte = e.closest('.carte-du-bas');
  if (carte) {
    const [c, f] = [carte.getBoundingClientRect(), carte.querySelector('.continuer').getBoundingClientRect()];
    if (r.right > f.left + 0.5 || r.top < c.top - 0.5 || r.bottom > c.bottom + 0.5) fautes.push('hors de la carte du bas');
  }
  if (document.documentElement.scrollWidth > innerWidth + 0.5) fautes.push(`page : ${document.documentElement.scrollWidth} px de large`);
  return fautes;
});

test('très grand texte (33 à 53), en clair et en sombre : la capsule du plus long mot de la carte ne déborde pas, à la carte du bas et à l\'écran 3', async ({ page }) => {
  test.setTimeout(240000);
  const fautes = {};
  for (const schema of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: schema });
    for (const taille of [null, 23, 33, 40, 47, 53]) {
      await page.evaluate((t) => { document.documentElement.style.fontSize = t ? `${t}px` : ''; }, taille);
      await aller(page, '#/aujourdhui');
      await aller(page, '#/moment');
      const vue = vueMoment(page);
      await noter(vue, 'bleu', 'Désillusionné');
      await stabiliser(page);
      const ou = `${schema === 'light' ? 'clair' : 'sombre'}, ${taille ? `${taille} px` : 'défaut'}`;
      // En clair, c'est bien une capsule : le fond de la case du mot, opaque.
      const fond = await page.locator('.mot-carte-du-bas').evaluate((e) => getComputedStyle(e).backgroundColor);
      expect(fond === 'rgba(0, 0, 0, 0)', ou).toBe(schema === 'dark');
      const bas = await capsuleDebordante(page, '.carte-du-bas .mot-carte-du-bas');
      if (bas.length) fautes[`${ou}, carte du bas`] = bas;
      await continuer(vue).click();
      await expect(vue.getByRole('heading', { name: 'Désillusionné', level: 1 })).toBeVisible();
      await stabiliser(page);
      const ecran3 = await capsuleDebordante(page, '.mot-rappel');
      if (ecran3.length) fautes[`${ou}, écran 3`] = ecran3;
      await terminer(vue).click();
      await expect(page).toHaveURL(/#\/aujourdhui$/);
    }
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  expect(fautes).toEqual({});
});

// Contre-relecture : l'Analyse et Comprendre, tout ouvert (les replis, tous les tableaux), là où ces écrans débordaient : leurs tableaux
// défilent dans leur carte, les tuiles de « Tous les chiffres » passent sur une colonne, et rien ne bouge à la page.
test('très grand texte (33 à 53) : l\'Analyse et Comprendre, replis et tableaux ouverts, ne défilent pas de côté', async ({ page }) => {
  test.setTimeout(180000);
  await verser(page);
  await page.reload();
  await appPrete(page);
  const fautes = {};
  for (const taille of [33, 40, 47, 53]) {
    await page.evaluate((t) => { document.documentElement.style.fontSize = `${t}px`; }, taille);
    for (const route of ['#/analyse', '#/comprendre/explosions', '#/comprendre/energie', '#/comprendre/rythmes']) {
      await aller(page, '#/aujourdhui');
      await aller(page, route);
      await expect(page.locator('main figure.graphe').first()).toBeVisible({ timeout: 15000 });
      await page.evaluate(async () => {
        for (let f = document.querySelector('main .repli-tete[aria-expanded="false"]'); f; f = document.querySelector('main .repli-tete[aria-expanded="false"]')) {
          f.click();
          await new Promise((ok) => setTimeout(ok, 30));
        }
        for (const b of document.querySelectorAll('main .bascule-graphe')) if (b.textContent === 'Voir en tableau') b.click();
      });
      await expect(page.locator('main .bascule-graphe', { hasText: 'Voir en tableau' })).toHaveCount(0);
      await stabiliser(page);
      const f = await debordements(page);
      // Un tableau plus large que sa carte y défile sans rien gagner en hauteur : la page seule défile vers le bas.
      f.push(...await page.locator('main figure.graphe').evaluateAll((gs) => gs.filter((g) => g.scrollHeight > g.clientHeight + 0.5).map((g) => `défile en hauteur : ${g.textContent.slice(0, 30)}`)));
      if (f.length) fautes[`${route}, ${taille} px`] = f;
    }
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  expect(fautes).toEqual({});
});

// v11 (11/11) : en très grand texte (33 à 53), Mes refuges plein ne sort pas de l'écran de côté, page comprise. Le soir, à 33 px,
// non plus, en entier, page comprise. À partir de 40 px, seul ce que la v11 y ajoute est contrôlé : les trois roues notées et la
// carte Mes gratitudes, écrite. Le reste du soir y déborde encore (« nuit dernière », « Télétravail », le résumé d'un relevé),
// comme en v10, à l'identique (page de 395, 449 puis 496 px) : un écran hérité, hors de la v11 (spec v11 §3 ; docs/decisions.md,
// v10, « En attente de l'utilisateur »). v12 (6/9) : Mes refuges a ses morceaux, dont un titre et un artiste de 70 signes sans
// espace (point de vigilance 4), et ses réglages sont contrôlés de même.
test('très grand texte (33 à 53) : Mes refuges plein, ses morceaux et ses réglages, le soir entier à 33 px, et ses trois roues notées et Mes gratitudes écrites au-delà, ne sortent pas de l\'écran de côté', async ({ page }) => {
  test.setTimeout(180000);
  await verser(page);
  const long = 'x7'.repeat(35);
  const refugesLongs = { ...REFUGES, playlists: [{ ...REFUGES.playlists[0], morceaux: [{ id: ID_FACTICE('mo99'), titre: long, artiste: long }, ...MORCEAUX] }, REFUGES.playlists[1]] };
  await page.evaluate(async (r) => {
    await window.__carnet.repo.meta.ecrire('refuges', r);
    await window.__carnet.repo.journal.patch('2026-10-15', { heuresSommeil: 7.5, sportMouvement: true, activites: [{ duree: 'dureeSport:de_30_a_60' }],
      contactHumain: true, contacts: [{ effet: 'contactEffet:ressourcant' }], gratitudes: 'Merci à la voisine pour le colis.' });
  }, refugesLongs);
  await page.reload();
  await appPrete(page);
  const nouveauDuSoir = '.aujourdhui .roue-choix, .aujourdhui .carte-champ:has(#gratitudes)';
  const fautes = {};
  for (const taille of [33, 40, 47, 53]) {
    await page.evaluate((t) => { document.documentElement.style.fontSize = `${t}px`; }, taille);
    await remonter(page, '#/aujourdhui');
    await expect(page.locator('.aujourdhui .roue-choix.notee')).toHaveCount(3);
    await expect(page.locator(nouveauDuSoir)).toHaveCount(4);
    await stabiliser(page);
    const soir = taille === 33 ? await debordements(page) : await debordements(page, nouveauDuSoir);
    if (soir.length) fautes[`le soir, ${taille} px`] = soir;
    await remonter(page, '#/refuges');
    await expect(page.locator('main.refuges a.lien-refuge')).toHaveCount(2);
    await expect(page.locator('main.refuges .ligne-morceau')).toHaveCount(MORCEAUX.length + 1);
    await expect(page.locator('main.refuges .titre-morceau').first()).toHaveText(long);
    await stabiliser(page);
    const refuges = await debordements(page);
    if (refuges.length) fautes[`Mes refuges, ${taille} px`] = refuges;
    await remonter(page, '#/refuges/reglages');
    await expect(page.locator('main.refuges-reglages #refuges-nom-1')).toBeVisible();
    await stabiliser(page);
    const reglagesRefuges = await debordements(page);
    if (reglagesRefuges.length) fautes[`Réglages de Mes refuges, ${taille} px`] = reglagesRefuges;
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  expect(fautes).toEqual({});
});

// Le style de l'icône d'une rangée (sa place de 28) et de la rangée qui la porte, et le filet de la rangée suivante (son ::before).
const icones = (page, liste) => page.locator(liste).evaluate((ul) => [...ul.querySelectorAll(':scope > li')].map((li) => {
  const c = li.querySelector('.icone-ligne');
  const r = c && c.getBoundingClientRect();
  const filet = getComputedStyle(li, '::before');
  const chevron = li.querySelector('.ligne-carte > svg:last-child');
  return {
    texte: li.textContent.trim(), fond: c && getComputedStyle(c).backgroundColor, icone: c && getComputedStyle(c.querySelector('svg')).color,
    place: r && [Math.round(r.width), Math.round(r.height)], dessin: c && Math.round(c.querySelector('svg').getBoundingClientRect().width),
    hauteur: Math.round(li.getBoundingClientRect().height), chevron: chevron && getComputedStyle(chevron).color,
    filet: filet.content === 'none' || filet.content === 'normal' ? null : [Math.round(parseFloat(filet.left)), filet.height],
    gaucheIcone: r && Math.round(r.left - ul.getBoundingClientRect().left),
  };
}));

test('Réglages et Le soir en listes groupées 2b : des icônes de 22 sans carré (v12), à l\'accent sur une rangée qui ouvre un écran, en --text-2 sur une rangée qui nomme une rubrique ; chevrons en --contour, filets de 0,5 décalés après l\'icône, en clair et en sombre', async ({ page }) => {
  for (const [schema, t] of [['light', clair], ['dark', sombre]]) {
    await page.emulateMedia({ colorScheme: schema });
    await aller(page, '#/reglages');
    await expect(page.locator('#titre-moment-difficile')).toBeVisible();
    const md = await icones(page, 'ul[aria-labelledby="titre-moment-difficile"]');
    expect(md.map((x) => x.texte)).toEqual(['Mon plan', 'Moment difficile', 'Me ressourcer', 'Aide iPhone']);
    md.forEach((x, i) => {
      // Une rangée qui ouvre un écran : son icône à l'accent, sans carré ni couleur de parcours ; son chevron en --contour.
      expect([x.fond, x.icone, x.chevron], `${schema} ${x.texte}`).toEqual(['rgba(0, 0, 0, 0)', rgb(t['accent-texte']), rgb(t.contour)]);
      expect(contraste(x.icone, rgb(t.surface)), `${schema} ${x.texte} : icône`).toBeGreaterThanOrEqual(3);
      expect(contraste(x.chevron, rgb(t.surface)), `${schema} ${x.texte} : chevron`).toBeGreaterThanOrEqual(3);
      expect(x.place).toEqual([28, 28]);
      expect(x.dessin).toBe(22);
      expect(x.gaucheIcone).toBe(12);
      expect(x.hauteur).toBeGreaterThanOrEqual(52);
      // La première rangée n'a pas de filet ; les suivantes, un filet de 0,5 qui commence après l'icône (12 + 28 + 12).
      expect(x.filet).toEqual(i === 0 ? null : [52, '0.5px']);
    });
    const saisie = await icones(page, 'ul[aria-labelledby="titre-ma-saisie"]');
    for (const x of saisie) expect([x.fond, x.icone], `${schema} ${x.texte}`).toEqual(['rgba(0, 0, 0, 0)', rgb(t['accent-texte'])]);
    // Le soir : chaque champ a l'icône de sa rubrique, en --text-2, sans carré, comme sa carte sur Aujourd'hui (v12) : la
    // rangée nomme une rubrique (son interrupteur la règle), elle n'ouvre rien.
    await aller(page, '#/reglages/journee');
    await expect(page.locator('.ma-journee .avec-carres')).toBeVisible();
    const soir = await icones(page, '.ma-journee .avec-carres');
    const champs = ['Lieu', 'Sommeil', 'Humeur', 'Contact humain', 'Sport / mouvement', 'Explosions (compteur du soir)', 'Traitement pris',
      'Mes points positifs',
      // v11 : Mes gratitudes, juste après les points positifs.
      'Mes gratitudes',
      // v8 : « Nuit en détail », masqué par défaut, avec ce qu'il contient en secondaire.
      'Nuit en détailcoucher, lever, réveils', 'Ce qui a pesé · ce qui a rechargé'];
    expect(soir.map((x) => x.texte)).toEqual(champs);
    for (const x of soir) {
      expect([x.fond, x.icone], `${schema} ${x.texte}`).toEqual(['rgba(0, 0, 0, 0)', rgb(t['text-2'])]);
      expect(x.gaucheIcone, `${schema} ${x.texte}`).toBe(12);
    }
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
      // Réglages : Sauvegarde (2), Ma saisie (4, Émotions en v8), Moment difficile (4) ; Le soir : 9 champs (v11 : Mes
      // gratitudes), « Nuit en détail » (v8) et pesé · rechargé.
      expect(rangees.length, route).toBe(route === '#/reglages' ? 10 : 11);
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

test('Historique 2b : « Semaine du… » en libellé de section, puces neutres avec l\'icône de leur rubrique en --text-2 (v12), en clair et en sombre', async ({ page }) => {
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
    puces.forEach((p) => {
      expect(p.fond).toBe(rgb(t['surface-2']));
      expect(p.couleur).toBe(rgb(t.text));
      expect(contraste(p.fond, p.couleur)).toBeGreaterThanOrEqual(4.5);
      expect(p.icone).toBe(rgb(t['text-2']));
    });
  }
});
