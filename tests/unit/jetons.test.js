import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { RACINE, lister, rel, lire, sansCommentaires } from '../aides/fichiers.js';
import { contraste, ecartTeinte, ecartOklab, oklch, jetons, FAMILLES_ROUE, ZONES_ROUE, ROLES } from '../aides/couleurs.js';

// v7 · Fondations 2b (plan v7, tâche 1) : jetons des 7 familles de la roue des émotions, en clair et en sombre ; contraste
// AA ; aucune variable CSS sans valeur. v9 (tâche 3) : les 4 zones de la carte des émotions. v12 (tâche 3, spec §5.2 et
// §5.3) : la base neutre façon iOS, une seule couleur d'accent, le vert B, et plus de couleur de rubrique.
const CSS = lister(join(RACINE, 'public', 'css'), (p) => p.endsWith('.css'));
const JS = lister(join(RACINE, 'public', 'js'), (p) => p.endsWith('.js') && !p.includes('/vendor/'));
const TOKENS = lire(join(RACINE, 'public', 'css', 'tokens.css'));
const { clair, sombre, sombreSeul } = jetons(TOKENS);
const THEMES = [['clair', clair], ['sombre', sombre]];
const TOUTES = [...FAMILLES_ROUE.map((f) => `emo-${f}`), ...ZONES_ROUE.map((z) => `zone-${z}`)];
// Les règles des feuilles, sans commentaires : [sélecteur, déclarations].
const REGLES = CSS.flatMap((f) => [...sansCommentaires(lire(f)).matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map((m) => [m[1].replace(/\s+/g, ' ').trim(), m[2].replace(/\s+/g, ' ').trim(), rel(f)]));

test('aucune variable CSS non définie : chaque var(--x) des feuilles (et du JS) est déclarée dans une feuille', () => {
  const declarees = new Set();
  const fautes = [];
  for (const f of CSS) for (const m of sansCommentaires(lire(f)).matchAll(/(--[\w-]+)\s*:/g)) declarees.add(m[1]);
  for (const f of [...CSS, ...JS]) {
    for (const m of sansCommentaires(lire(f)).matchAll(/var\(\s*(--[\w-]+)/g)) if (!declarees.has(m[1])) fautes.push(`${rel(f)} : ${m[1]}`);
  }
  assert.deepEqual([...new Set(fautes)], []);
});

test('v10 : une seule police, la police système : ni --police-serif, ni ui-serif, ni Georgia, ni New York dans public/, commentaires compris', () => {
  const textes = lister(join(RACINE, 'public'), (p) => /\.(css|js|html)$/.test(p) && !p.includes('/vendor/'));
  assert.ok(textes.length > CSS.length, 'le CSS, le JS et le HTML sont lus');
  const fautes = [];
  for (const f of textes) {
    for (const m of lire(f).matchAll(/--police-serif|ui-serif|georgia|new york|(?<!sans-)serif/gi)) fautes.push(`${rel(f)} : ${m[0]}`);
  }
  assert.deepEqual(fautes, []);
  assert.match(TOKENS, /--police: -apple-system/);
});

test('v10 : docs/design/integration.md ne donne plus la serif pour l\'état actuel : chaque mention dit jusqu\'à quand (la v7 hors du relevé, la v10 dans le relevé)', () => {
  const lignes = lire(join(RACINE, 'docs', 'design', 'integration.md')).split('\n');
  const mentions = lignes.filter((l) => /ui-serif|new york|serif/i.test(l));
  assert.equal(mentions.length, 3);
  assert.deepEqual(mentions.filter((l) => !/jusqu'à la v7|police système depuis la v10/.test(l)), []);
});

// ---------- v12 · La base et l'accent (spec §5.2 et §5.3) ----------
const BASE = ['bg', 'surface', 'surface-2', 'barre', 'line', 'contour', 'text', 'text-2', 'desactive', 'piste', 'fenetre',
  'accent', 'sur-accent', 'accent-texte', 'donnee', 'donnee-1', 'donnee-2', 'donnee-3'];

test('v12 : la base et l\'accent B, aux valeurs exactes de la spec, en clair et en sombre ; --action et --action-on sont les alias de l\'accent', () => {
  assert.deepEqual(BASE.map((n) => clair[n]), ['#f2f2f7', '#ffffff', '#eeeef0', '#f9f9f9', '#c6c6c8', '#86868b', '#000000', '#6c6c70',
    '#c7c7cc', '#eeeef0', '#ffffff', '#1c7d36', '#ffffff', '#1c7d36', '#48484a', '#c7c7cc', '#8e8e93', '#3a3a3c']);
  assert.deepEqual(BASE.map((n) => sombre[n]), ['#000000', '#1c1c1e', '#2c2c2e', '#161618', '#38383a', '#7c7c80', '#ffffff', '#98989f',
    '#48484a', '#111113', '#48484c', '#30d158', '#000000', '#30d158', '#aeaeb2', '#48484a', '#8e8e93', '#e5e5ea']);
  // Les alias : déclarés une fois, sur la racine, et jamais redéfinis en sombre (ils y suivent l'accent du thème).
  const racine = sansCommentaires(TOKENS).match(/^:root\s*\{([\s\S]*?)\n\}/m)[1];
  assert.match(racine, /--action: var\(--accent\);/);
  assert.match(racine, /--action-on: var\(--sur-accent\);/);
  assert.equal(sombreSeul.action, undefined);
  assert.equal(sombreSeul['action-on'], undefined);
  for (const [, t] of THEMES) assert.deepEqual([t.action, t['action-on'], t['fond-choix']], [t.accent, t['sur-accent'], 'transparent']);
  // theme-color et le manifest : le fond du clair.
  const index = lire(join(RACINE, 'public', 'index.html'));
  assert.match(index, /<meta name="theme-color" content="#f2f2f7" media="\(prefers-color-scheme: light\)">/);
  assert.match(index, /<meta name="theme-color" content="#000000" media="\(prefers-color-scheme: dark\)">/);
  const manifest = JSON.parse(lire(join(RACINE, 'public', 'manifest.webmanifest')));
  assert.deepEqual([manifest.background_color, manifest.theme_color], ['#f2f2f7', '#f2f2f7']);
});

// Relecture de la tâche 4 : la marge était restée à 14, celle du lot 2b, au lieu des 16 de la spec.
test('v12 : les formes de la spec §5.2 : rayon des cartes 16, marge 16, grand titre 34/41 (plafonné à 48), titre de section 22/28, libellé d\'onglet 10', () => {
  assert.deepEqual(['r-carte', 'marge', 't-grand-titre', 'l-grand-titre', 't-titre-section', 'l-titre-section', 't-onglet'].map((n) => clair[n]),
    ['16px', '16px', 'min(2rem, 48px)', 'min(2.412rem, 58px)', '1.294rem', '1.647rem', '10px']);
  for (const n of ['r-carte', 'marge']) assert.equal(sombreSeul[n], undefined, n);
});

test('v12 : AA du texte et du texte secondaire sur le fond, la carte et --surface-2 ; l\'accent et le texte posé dessus à 4,5:1 au moins', () => {
  for (const [theme, t] of THEMES) {
    for (const fond of ['bg', 'surface', 'surface-2']) {
      assert.ok(contraste(t.text, t[fond]) >= 4.5, `${theme} : texte sur ${fond}`);
      assert.ok(contraste(t['text-2'], t[fond]) >= 4.5, `${theme} : texte secondaire sur ${fond} (${contraste(t['text-2'], t[fond]).toFixed(2)})`);
    }
    assert.ok(contraste(t['sur-accent'], t.accent) >= 4.5, `${theme} : sur l'accent (${contraste(t['sur-accent'], t.accent).toFixed(2)})`);
  }
});

test('v12 : un lien vert (--accent-texte) à 4,5:1 au moins sur le fond, la carte et la barre ; en clair, jamais sur --surface-2 (sous 4,5)', () => {
  for (const [theme, t] of THEMES) {
    for (const fond of ['bg', 'surface', 'barre']) {
      assert.ok(contraste(t['accent-texte'], t[fond]) >= 4.5, `${theme} : lien sur ${fond} (${contraste(t['accent-texte'], t[fond]).toFixed(2)})`);
    }
  }
  // La raison de la règle « un lien ne se pose jamais sur --surface-2 » : en clair, il y passe sous 4,5.
  assert.ok(contraste(clair['accent-texte'], clair['surface-2']) < 4.5);
  assert.ok(contraste(sombre['accent-texte'], sombre['surface-2']) >= 4.5);
});

test('v12 : le contour (choix non faits, champs, roues) à 3:1 au moins sur le fond, la carte et --surface-2', () => {
  for (const [theme, t] of THEMES) {
    for (const fond of ['bg', 'surface', 'surface-2']) {
      assert.ok(contraste(t.contour, t[fond]) >= 3, `${theme} : contour sur ${fond} (${contraste(t.contour, t[fond]).toFixed(2)})`);
    }
  }
});

// Relecture de la tâche 3 : « Réveil la nuit » (.parcours.ecran-noir) redéclare son contour, sa carte et --surface-2. Son
// contour (champs, rail et bouton de l'interrupteur éteint) suit la même règle, sur ses propres fonds (il était à 2,81:1 sur
// la carte et 2,60:1 sur --surface-2), et reste plus sombre que son texte : la nuit n'éclaire pas la chambre.
test('v12 : la nuit aussi, le contour de .parcours.ecran-noir à 3:1 au moins sur son fond, sa carte et son --surface-2, plus sombre que son texte', () => {
  const declare = (selecteur) => Object.fromEntries(REGLES.filter(([sel]) => sel === selecteur)
    .flatMap(([, d]) => [...d.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()])));
  const nuit = { ...declare('.ecran-noir'), ...declare('.parcours.ecran-noir') };
  for (const n of ['bg', 'surface', 'surface-2', 'contour', 'text']) assert.match(nuit[n] || '', /^#[0-9a-f]{6}$/, `--${n} de la nuit`);
  assert.equal(nuit.contour, declare('.parcours.ecran-noir').contour, 'le contour est redéclaré par .parcours.ecran-noir');
  for (const fond of ['bg', 'surface', 'surface-2']) {
    assert.ok(contraste(nuit.contour, nuit[fond]) >= 3, `nuit : contour sur ${fond} (${contraste(nuit.contour, nuit[fond]).toFixed(2)})`);
  }
  assert.ok(contraste(nuit.contour, nuit.bg) < contraste(nuit.text, nuit.bg), 'nuit : le contour moins clair que le texte');
});

test('v12 : l\'accent clair est loin de la menthe des zones (ΔE OKLab ≥ 0,12) ; l\'encre des graphiques, sans teinte, se voit sur la carte', () => {
  // La menthe : le plein de la zone verte (bulles, points, cases), son accent et son texte en sombre.
  const menthe = [clair['c-zone-vert-fill'], sombre['c-zone-vert'], sombre['c-zone-vert-text']];
  assert.deepEqual(menthe, ['#4ce39b', '#4ce39b', '#44dd95']);
  for (const m of menthe) {
    for (const n of ['accent', 'accent-texte']) assert.ok(ecartOklab(clair[n], m) >= 0.12, `${n} clair et ${m} : ${ecartOklab(clair[n], m).toFixed(3)}`);
  }
  // En sombre, le vert iPhone est plus près de la menthe (≈ 0,07) : c'est la forme qui les sépare (jamais un rond ni un
  // point d'accent) et les lieux (pas d'accent sur les écrans de l'émotion ni dans les graphiques, plus bas).
  assert.ok(ecartOklab(sombre.accent, menthe[0]) < 0.12);
  for (const [theme, t] of THEMES) {
    for (const n of ['donnee', 'donnee-1', 'donnee-2', 'donnee-3']) assert.ok(oklch(t[n]).C < 0.02, `${theme} : --${n} sans teinte`);
    assert.ok(contraste(t.donnee, t.surface) >= 4.5, `${theme} : --donnee sur la carte`);
    assert.ok(contraste(t['donnee-2'], t.surface) >= 3, `${theme} : --donnee-2, contour du pas le plus discret, sur la carte`);
  }
});

test('v12 : les rubriques n\'ont plus de couleur : ni --c-<rubrique>, ni --chart-*, ni .teinte-*, ni --r-icone, dans aucune feuille', () => {
  const RUBRIQUES = ['lieu', 'sommeil', 'contact', 'sport', 'traitement', 'positifs', 'humeur', 'episode', 'symptome', 'difficile', 'energie', 'explosions'];
  const motif = new RegExp(`--c-(${RUBRIQUES.join('|')})\\b|--chart-|\\.teinte-|--r-icone`, 'g');
  const fautes = [];
  for (const f of CSS) for (const m of sansCommentaires(lire(f)).matchAll(motif)) fautes.push(`${rel(f)} : ${m[0]}`);
  assert.deepEqual(fautes, []);
  // Les couleurs de la base, des familles et des zones seulement : aucune autre couleur de jeton n'a de teinte, hors
  // l'accent, --danger et les écrans de l'émotion (la carte et ses bulles).
  const teintes = Object.entries(clair).filter(([n, v]) => /^#[0-9a-f]{6}$/i.test(v) && oklch(v).C >= 0.03 && !/^c-(emo|zone)-|^(accent|accent-texte|action)$/.test(n));
  assert.deepEqual(teintes.map(([n]) => n), ['danger']);
});

// v12, point de vigilance 3 : les écrans de l'émotion (.moment-plein) et « Réveil la nuit » (.ecran-noir) n'ont aucun
// accent. Leurs règles redéclarent --accent, --sur-accent, --accent-texte, --action et --action-on à l'encre (des gris
// sans teinte, dans les deux thèmes), et aucune feuille ne lit l'accent dans ces écrans.
test('v12 : pas d\'accent dans .moment-plein ni dans .ecran-noir : l\'accent y est redéclaré à l\'encre, et aucune feuille ne l\'y lit', () => {
  const ACCENTS = ['accent', 'sur-accent', 'accent-texte', 'action', 'action-on'];
  const declare = (selecteur) => {
    const r = REGLES.filter(([sel]) => sel === selecteur);
    assert.ok(r.length > 0, selecteur);
    return Object.fromEntries(r.flatMap(([, d]) => [...d.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()])));
  };
  const neutre = (v, quoi) => assert.ok(/^#[0-9a-f]{6}$/.test(v) && oklch(v).C < 0.02, `${quoi} : ${v}, une encre sans teinte`);
  // Les écrans de l'émotion : l'accent est le plein des ronds (Continuer, Terminer), à l'encre dans les deux thèmes.
  const moment = declare('.moment-plein');
  assert.deepEqual(ACCENTS.map((n) => moment[n]), ['var(--moment-plein)', 'var(--moment-plein-on)', 'var(--moment-plein)', 'var(--moment-plein)', 'var(--moment-plein-on)']);
  for (const [theme, t] of THEMES) for (const n of ['moment-plein', 'moment-plein-on']) neutre(t[n], `${theme} --${n}`);
  // La nuit : des valeurs, sans var() (un var(--accent) y serait lu avant d'être redéclaré, sur la racine, en vert).
  for (const sel of ['.ecran-noir', '.parcours.ecran-noir']) {
    const d = declare(sel);
    for (const n of ACCENTS) if (d[n] !== undefined) neutre(d[n], `${sel} --${n}`);
  }
  assert.deepEqual(ACCENTS.filter((n) => declare('.ecran-noir')[n] === undefined), []);
  assert.deepEqual(['accent', 'accent-texte', 'action'].filter((n) => declare('.parcours.ecran-noir')[n] === undefined), []);
  // Aucune règle de ces écrans ne lit l'accent, et le vert de l'accent n'est écrit que dans tokens.css.
  const fautes = REGLES.filter(([sel, d]) => /\.moment-plein|\.ecran-noir/.test(sel) && /var\(\s*--(accent|sur-accent|accent-texte)\b/.test(d)).map(([sel]) => sel);
  assert.deepEqual(fautes, []);
  const verts = new RegExp([clair.accent, sombre.accent].join('|'), 'i');
  assert.deepEqual(CSS.filter((f) => !f.endsWith('tokens.css') && verts.test(sansCommentaires(lire(f)))).map(rel), []);
});

test('v12 : un choix fait est un aplat d\'accent (ou de sa famille, de sa zone) au texte --sur-accent, en 600, avec sa coche ; non fait, transparent avec son contour ; rien ne change de taille au toucher', () => {
  // Les déclarations de toutes les règles d'un sélecteur, à la suite.
  const decl = (selecteur) => {
    const r = REGLES.filter(([sel]) => sel.split(/,(?![^(]*\))/).map((x) => x.trim()).includes(selecteur));
    assert.ok(r.length > 0, selecteur);
    return r.map(([, d]) => d).join(' ');
  };
  for (const sel of ['.pastille', '.segmente button']) {
    assert.match(decl(sel), /background: var\(--fond-choix\);/, sel);
    assert.match(decl(sel), /box-shadow: inset 0 0 0 1px var\(--contour\);/, sel);
    assert.doesNotMatch(decl(sel), /font-weight/, `${sel} : en 400`);
    const fait = decl(`${sel}[aria-pressed="true"]`);
    assert.match(fait, /background: var\(--c-fill, var\(--action\)\); color: var\(--c-on, var\(--action-on\)\); box-shadow: none; font-weight: 600;/, sel);
  }
  // La coche : montrée devant le libellé d'un choix fait, cachée sinon.
  assert.match(decl('.coche'), /display: none;/);
  assert.match(decl('[aria-pressed="true"] > .coche'), /display: inline-flex;/);
  // Ni rebond ni agrandissement : aucune règle d'un choix fait ne pose transform ou animation.
  const bougent = REGLES.filter(([sel, d]) => /aria-pressed="true"/.test(sel) && /\b(transform|animation)\s*:/.test(d)).map(([sel]) => sel);
  assert.deepEqual(bougent, []);
  assert.ok(CSS.every((f) => !/@keyframes rebond/.test(lire(f))));
  // La roue : une piste au contour, la fenêtre neutre puis d'accent, la valeur notée en --sur-accent et en 600.
  assert.match(decl('.roue-choix'), /background: var\(--piste\); box-shadow: inset 0 0 0 1px var\(--contour\);/);
  assert.match(decl('.roue-choix::before'), /background: var\(--fenetre\);/);
  assert.match(decl('.roue-choix.notee::before'), /background: var\(--accent\);/);
  assert.match(decl('.roue-valeur[aria-pressed="true"]'), /font-weight: 600; color: var\(--sur-accent\);/);
  // L'interrupteur : un rail d'accent et un bouton blanc, comme sur iOS.
  assert.match(decl('.interrupteur[aria-checked="true"]'), /background: var\(--action\);/);
  assert.match(decl('.interrupteur[aria-checked="true"] .interrupteur-bouton'), /background: #ffffff;/);
});

// v12 (3/9) : la couleur ne dit plus qu'une émotion, et ses couleurs ne bougent pas. L'empreinte des 132 valeurs des
// 7 familles et des 4 zones (six rôles, en clair et en sombre), calculée sur les jetons de la v11.0.0 : la refonte de la
// base et de l'accent n'en change aucune.
test('v12 : les familles et les zones sont inchangées depuis la v11 : leurs six rôles, en clair et en sombre, à l\'octet', () => {
  const valeurs = TOUTES.flatMap((c) => ROLES.flatMap((r) => [['clair', clair], ['sombre', sombre]].map(([theme, t]) => `${theme} --c-${c}${r}: ${t[`c-${c}${r}`]}`)));
  assert.equal(valeurs.length, 132);
  assert.equal(createHash('sha256').update(valeurs.join('\n')).digest('hex'), 'bcbbae16b626176d098ba4a288fcaf8c48cf37e2b53cb84e06f4b0ea3ad72333');
});

test('chaque famille et chaque zone a ses six rôles ; -fill et -on ne changent pas en sombre, les quatre autres sont redéclarés', () => {
  for (const c of TOUTES) {
    for (const r of ROLES) {
      assert.match(clair[`c-${c}${r}`] || '', /^#[0-9a-f]{6}$/, `--c-${c}${r} en clair`);
    }
    for (const r of ['-fill', '-on']) assert.equal(sombreSeul[`c-${c}${r}`], undefined, `--c-${c}${r} redéfini en sombre`);
    for (const r of ['', '-tint', '-tint-2', '-text']) assert.match(sombreSeul[`c-${c}${r}`] || '', /^#[0-9a-f]{6}$/, `--c-${c}${r} en sombre`);
  }
});

test('AA : -on sur -fill, -text sur le fond, les cartes et la teinte ; l\'accent à 3:1 au moins sur le fond', () => {
  for (const [theme, t] of THEMES) {
    for (const c of TOUTES) {
      const v = (r) => t[`c-${c}${r}`];
      assert.ok(contraste(v('-on'), v('-fill')) >= 4.5, `${theme} ${c} : -on sur -fill (${contraste(v('-on'), v('-fill')).toFixed(2)})`);
      for (const fond of [t.bg, t.surface, v('-tint')]) assert.ok(contraste(v('-text'), fond) >= 4.5, `${theme} ${c} : -text sur ${fond}`);
      assert.ok(contraste(v(''), t.bg) >= 3, `${theme} ${c} : accent sur le fond`);
    }
  }
});

test('roue des émotions : 7 familles, dans l\'ordre ; -text lisible aussi sur -tint-2 ; une classe emo-<famille> par famille', () => {
  const ordre = [...TOKENS.matchAll(/--c-emo-([a-z]+):/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(ordre)], FAMILLES_ROUE);
  for (const [theme, t] of THEMES) {
    for (const f of FAMILLES_ROUE) assert.ok(contraste(t[`c-emo-${f}-text`], t[`c-emo-${f}-tint-2`]) >= 4.5, `${theme} ${f} : -text sur -tint-2`);
  }
  const sansCom = sansCommentaires(TOKENS);
  for (const f of FAMILLES_ROUE) {
    const regle = sansCom.match(new RegExp(`\\.emo-${f}\\s*\\{([^}]*)\\}`));
    assert.ok(regle, `.emo-${f}`);
    for (const r of ROLES) assert.ok(regle[1].includes(`--c${r}: var(--c-emo-${f}${r});`), `.emo-${f} : --c${r}`);
  }
});

test('teintes de la roue : rouge, orange, jaune-olive, vert, bleu, violet ; Sérénité turquoise, distincte de Joie et de Surprise', () => {
  // Teinte OKLCH de l'accent clair, par famille : la couleur de la roue.
  const H = Object.fromEntries(FAMILLES_ROUE.map((f) => [f, oklch(clair[`c-emo-${f}`]).H]));
  const entre = (h, a, b) => h >= a && h <= b;
  assert.ok(entre(H.colere, 15, 35), `colère ${H.colere}`);
  assert.ok(entre(H.degout, 40, 65), `dégoût ${H.degout}`);
  assert.ok(entre(H.tristesse, 95, 120), `tristesse ${H.tristesse}`);
  assert.ok(entre(H.joie, 130, 155), `joie ${H.joie}`);
  assert.ok(entre(H.surprise, 235, 265), `surprise ${H.surprise}`);
  assert.ok(entre(H.peur, 285, 315), `peur ${H.peur}`);
  assert.ok(entre(H.serenite, 180, 205), `sérénité ${H.serenite}`);
  // Sérénité se distingue de Joie et de Surprise d'au moins 30° de teinte, en accent comme en plein, dans les deux thèmes.
  for (const [theme, t] of THEMES) {
    for (const r of ['', '-fill', '-text']) {
      for (const autre of ['joie', 'surprise']) {
        const d = ecartTeinte(t[`c-emo-serenite${r}`], t[`c-emo-${autre}${r}`]);
        assert.ok(d >= 30, `${theme} : sérénité${r} et ${autre}${r} à ${d.toFixed(0)}°`);
      }
    }
  }
  // Deux familles voisines de la roue ne se confondent pas : au moins 20° de teinte entre leurs pleins.
  for (let i = 0; i < FAMILLES_ROUE.length; i++) {
    for (let j = i + 1; j < FAMILLES_ROUE.length; j++) {
      const [a, b] = [FAMILLES_ROUE[i], FAMILLES_ROUE[j]];
      assert.ok(ecartTeinte(clair[`c-emo-${a}-fill`], clair[`c-emo-${b}-fill`]) >= 20, `${a} et ${b}`);
    }
  }
});

test('les couleurs de la roue ne servent qu\'aux classes .emo-* (roue et graphiques d\'émotions) : aucune feuille ne les lit directement', () => {
  const fautes = [];
  for (const f of CSS) {
    const code = sansCommentaires(lire(f)).replace(/\.emo-[a-z]+\s*\{[^}]*\}/g, '');
    if (/var\(\s*--c-emo-/.test(code)) fautes.push(rel(f));
  }
  assert.deepEqual(fautes, []);
});

test('teintes locales : chaque classe .emo-* et .zone-* donne les six rôles d\'une seule couleur (v12 : plus de .teinte-*)', () => {
  const sansCom = sansCommentaires(TOKENS);
  const regles = [...sansCom.matchAll(/((?:\.(?:teinte|emo|zone)-[\w-]+\s*,?\s*)+)\{([^}]*)\}/g)];
  assert.equal(regles.length, FAMILLES_ROUE.length + ZONES_ROUE.length);
  for (const [, selecteurs, corps] of regles) {
    const cibles = [...corps.matchAll(/--c([\w-]*):\s*var\(--c-([\w-]+?)\1\);/g)];
    assert.equal(cibles.length, 6, selecteurs);
    assert.equal(new Set(cibles.map((m) => m[2])).size, 1, `${selecteurs} : une seule couleur`);
  }
});

// ---------- v9 · Zones de la carte des émotions (tâche 3) ----------
// Les couleurs médianes des quatre bulles de How We Feel (visuel-hwf.md §1.5, dont les valeurs font foi), lues dans l'annexe.
const VISUEL = lire(join(RACINE, 'docs', 'superpowers', 'specs', '2026-10-28-carnet-v9', 'visuel-hwf.md'));
const NOMS_VISUEL = { rouge: 'Rouge', jaune: 'Jaune', bleu: 'Bleu', vert: 'Vert' };
const MEDIANE = Object.fromEntries(ZONES_ROUE.map((z) => [z, VISUEL.match(new RegExp(`^\\| ${NOMS_VISUEL[z]} \\| (#[0-9a-f]{6}) \\|`, 'm'))[1]]));

test('zones : rouge, jaune, bleu, vert, dans l\'ordre ; -fill est la couleur médiane de la bulle de How We Feel ; en sombre, l\'accent aussi', () => {
  assert.deepEqual(MEDIANE, { rouge: '#fe4c40', jaune: '#ffd04c', bleu: '#789fff', vert: '#4ce39b' });
  const ordre = [...TOKENS.matchAll(/--c-zone-([a-z]+):/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(ordre)], ZONES_ROUE);
  for (const z of ZONES_ROUE) {
    assert.equal(clair[`c-zone-${z}-fill`], MEDIANE[z], `${z} : -fill`);
    // Sur noir, comme chez How We Feel : l'accent du thème sombre est la couleur de la bulle elle-même.
    assert.equal(sombre[`c-zone-${z}`], MEDIANE[z], `${z} : accent en sombre`);
  }
  const sansCom = sansCommentaires(TOKENS);
  for (const z of ZONES_ROUE) {
    const regle = sansCom.match(new RegExp(`\\.zone-${z}\\s*\\{([^}]*)\\}`));
    assert.ok(regle, `.zone-${z}`);
    for (const r of ROLES) assert.ok(regle[1].includes(`--c${r}: var(--c-zone-${z}${r});`), `.zone-${z} : --c${r}`);
  }
});

test('zones : AA de -on sur -fill et de -text sur le fond, les cartes, la surface 2 et les deux teintes ; l\'accent à 3:1 sur le fond et les cartes', () => {
  for (const [theme, t] of THEMES) {
    for (const z of ZONES_ROUE) {
      const v = (r) => t[`c-zone-${z}${r}`];
      assert.ok(contraste(v('-on'), v('-fill')) >= 4.5, `${theme} ${z} : -on sur -fill (${contraste(v('-on'), v('-fill')).toFixed(2)})`);
      for (const [nom, fond] of [['fond', t.bg], ['carte', t.surface], ['surface 2', t['surface-2']], ['teinte', v('-tint')], ['teinte 2', v('-tint-2')]]) {
        assert.ok(contraste(v('-text'), fond) >= 4.5, `${theme} ${z} : -text sur ${nom} (${contraste(v('-text'), fond).toFixed(2)})`);
      }
      // Un point de zone se pose sur le fond (en-tête du jour) ou sur une carte (Ma journée, Historique, Mes jours) : son
      // liseré, à l'accent, y porte le 3:1 (relecture finale ; le test suivant).
      for (const [nom, fond] of [['fond', t.bg], ['carte', t.surface]]) {
        assert.ok(contraste(v(''), fond) >= 3, `${theme} ${z} : accent sur ${nom} (${contraste(v(''), fond).toFixed(2)})`);
      }
    }
  }
});

// Relecture finale : en clair, l'accent assombri pour le 3:1 n'était plus la couleur de How We Feel (le jaune devenait
// olive, voisin de la Tristesse), alors que les bulles de la même carte la gardaient. Une marque de zone (le point d'un
// jour, le rond d'un relevé, un point ou une barre de graphique, un rond de légende) est donc peinte en -fill, la couleur
// des bulles, dans les deux thèmes, et un liseré à l'accent porte le 3:1 sur le fond clair. En sombre, l'accent est
// -fill : le liseré s'y fond.
test('zones : une marque de zone a la couleur des bulles (-fill) et un liseré à l\'accent ; -fill seul n\'a pas le 3:1 en clair', () => {
  const regles = [...sansCommentaires(lire(join(RACINE, 'public', 'css', 'ecrans.css'))).matchAll(/([^{}]+)\{([^}]*)\}/g)]
    .map((m) => [m[1].replace(/\s+/g, ' ').trim(), m[2]]);
  // Les sélecteurs d'une règle, coupés aux virgules hors des parenthèses (celles de :is() restent).
  const selecteurs = (sel) => sel.split(/,(?![^(]*\))/).map((x) => x.trim());
  const decl = (selecteur) => {
    const r = regles.filter(([sel]) => selecteurs(sel).includes(selecteur));
    assert.equal(r.length, 1, selecteur);
    return r[0][1].replace(/\s+/g, ' ');
  };
  const zones = ':is(.zone-rouge, .zone-jaune, .zone-bleu, .zone-vert)';
  for (const sel of ['.zones-jour i', `.point-releve${zones}`]) {
    const d = decl(sel);
    assert.match(d, /background: var\(--c-fill\);/, sel);
    assert.match(d, /box-shadow: inset 0 0 0 1px var\(--c\);/, sel);
  }
  for (const sel of [`.g-emo${zones}`, `${zones} > svg > .g-emo`]) {
    const d = decl(sel);
    assert.match(d, /fill: var\(--c-fill\);/, sel);
    assert.match(d, /stroke: var\(--c\); stroke-width: 1;/, sel);
  }
  // Le jaune des bulles sur le fond clair : sans liseré, il ne se verrait pas assez.
  assert.ok(contraste(clair['c-zone-jaune-fill'], clair.surface) < 3);
  for (const z of ZONES_ROUE) assert.equal(sombre[`c-zone-${z}`], clair[`c-zone-${z}-fill`], `${z} : en sombre, le liseré est la couleur de la bulle`);
});

test('zones : chaque rôle garde la teinte de sa bulle (à 12° près), et les quatre zones restent bien distinctes', () => {
  for (const [theme, t] of THEMES) {
    for (const z of ZONES_ROUE) {
      for (const r of ['', '-text', '-tint', '-tint-2']) {
        const d = ecartTeinte(t[`c-zone-${z}${r}`], MEDIANE[z]);
        assert.ok(d <= 12, `${theme} ${z}${r} : ${d.toFixed(0)}° de la bulle`);
      }
    }
    for (let i = 0; i < ZONES_ROUE.length; i++) {
      for (let j = i + 1; j < ZONES_ROUE.length; j++) {
        const [a, b] = [ZONES_ROUE[i], ZONES_ROUE[j]];
        assert.ok(ecartTeinte(t[`c-zone-${a}`], t[`c-zone-${b}`]) >= 45, `${theme} : ${a} et ${b}`);
      }
    }
  }
});

test('les couleurs de zone ne servent qu\'aux classes .zone-* : aucune feuille ne les lit directement', () => {
  const fautes = [];
  for (const f of CSS) {
    const code = sansCommentaires(lire(f)).replace(/\.zone-[a-z]+\s*\{[^}]*\}/g, '');
    if (/var\(\s*--c-zone-/.test(code)) fautes.push(rel(f));
  }
  assert.deepEqual(fautes, []);
});

// Relecture de la tâche 9 : les règles des classes que l'app ne pose plus disparaissent avec leur composant (Rubrique,
// .ligne-champ d'Aujourd'hui avant les cartes 2b, .filet-tirets).
test('aucune règle pour une classe retirée de l\'app : .rubrique, .rubrique-icone, .rubrique-dessous, .ligne-champ, .filet-tirets', () => {
  const RETIREES = new Set(['rubrique', 'rubrique-icone', 'rubrique-dessous', 'ligne-champ', 'filet-tirets']);
  const fautes = [];
  for (const f of CSS) {
    for (const m of sansCommentaires(lire(f)).matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) if (RETIREES.has(m[1])) fautes.push(`${rel(f)} : .${m[1]}`);
  }
  assert.deepEqual(fautes, []);
});
