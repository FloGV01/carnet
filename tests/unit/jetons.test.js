import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { RACINE, lister, rel, lire, sansCommentaires } from '../aides/fichiers.js';
import { contraste, ecartTeinte, oklch, jetons, COULEURS_LOT, FAMILLES_ROUE, ROLES } from '../aides/couleurs.js';

// v7 · Fondations 2b (plan v7, tâche 1) : jetons de la piste 2b et des 7 familles de la roue des émotions, en
// clair et en sombre ; contraste AA ; aucune variable CSS sans valeur.
const CSS = lister(join(RACINE, 'public', 'css'), (p) => p.endsWith('.css'));
const JS = lister(join(RACINE, 'public', 'js'), (p) => p.endsWith('.js') && !p.includes('/vendor/'));
const TOKENS = lire(join(RACINE, 'public', 'css', 'tokens.css'));
const { clair, sombre, sombreSeul } = jetons(TOKENS);
const THEMES = [['clair', clair], ['sombre', sombre]];
const TOUTES = [...COULEURS_LOT, ...FAMILLES_ROUE.map((f) => `emo-${f}`)];

test('aucune variable CSS non définie : chaque var(--x) des feuilles (et du JS) est déclarée dans une feuille', () => {
  const declarees = new Set();
  const fautes = [];
  for (const f of CSS) for (const m of sansCommentaires(lire(f)).matchAll(/(--[\w-]+)\s*:/g)) declarees.add(m[1]);
  for (const f of [...CSS, ...JS]) {
    for (const m of sansCommentaires(lire(f)).matchAll(/var\(\s*(--[\w-]+)/g)) if (!declarees.has(m[1])) fautes.push(`${rel(f)} : ${m[1]}`);
  }
  assert.deepEqual([...new Set(fautes)], []);
});

test('base 2b : les valeurs exactes du lot, en clair et en sombre', () => {
  assert.deepEqual(['bg', 'surface', 'surface-2', 'line', 'text', 'text-2', 'action', 'action-on'].map((n) => clair[n]),
    ['#e7eaee', '#ffffff', '#eef0f4', '#c2c4c8', '#181b1f', '#585b61', '#181b1f', '#fdfdfd']);
  assert.deepEqual(['bg', 'surface', 'surface-2', 'line', 'text', 'text-2', 'action', 'action-on'].map((n) => sombre[n]),
    ['#000000', '#1e1f21', '#2d2e30', '#47484a', '#bfc0c3', '#97989b', '#eaebed', '#000000']);
  for (const [theme, t] of THEMES) {
    assert.ok(contraste(t.text, t.bg) >= 4.5, `${theme} : texte`);
    for (const fond of ['bg', 'surface', 'surface-2']) assert.ok(contraste(t['text-2'], t[fond]) >= 4.5, `${theme} : texte secondaire sur ${fond}`);
    assert.ok(contraste(t['action-on'], t.action) >= 4.5, `${theme} : action`);
  }
});

test('chaque couleur (lot et roue) a ses six rôles ; -fill et -on ne changent pas en sombre, les quatre autres oui', () => {
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

test('teintes locales : chaque classe .teinte-* et .emo-* donne les six rôles d\'une seule couleur', () => {
  const sansCom = sansCommentaires(TOKENS);
  const regles = [...sansCom.matchAll(/((?:\.(?:teinte|emo)-[\w-]+\s*,?\s*)+)\{([^}]*)\}/g)];
  assert.ok(regles.length >= 12 + FAMILLES_ROUE.length);
  for (const [, selecteurs, corps] of regles) {
    const cibles = [...corps.matchAll(/--c([\w-]*):\s*var\(--c-([\w-]+?)\1\);/g)];
    assert.equal(cibles.length, 6, selecteurs);
    assert.equal(new Set(cibles.map((m) => m[2])).size, 1, `${selecteurs} : une seule couleur`);
  }
});
