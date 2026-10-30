import { test } from 'node:test';
import assert from 'node:assert/strict';
import { couleurCase, couleurLisible, contraste, disposition, etendue, pointDe, PAS, FOND_CARTE_DU_BAS } from '../../public/js/ui/carte-geometrie.js';
import { motsDeLaCarte, zoneDe, zoneDeCase } from '../../public/js/domain/carte-roue.js';
import { jetons } from '../aides/couleurs.js';
import { RACINE, lire } from '../aides/fichiers.js';
import { join } from 'node:path';

// v9 (4/8) · La carte des émotions en nombres (ui/carte-geometrie.js ; visuel-hwf.md §2.2 à §2.5) : la couleur de chaque
// case, lisible avec son texte noir ; la lentille autour du mot choisi, sans chevauchement. Mots à soi inventés.
const MOTS = motsDeLaCarte(null);
const id = (libelle) => MOTS.find((m) => m.libelle === libelle).id;
const PERSO = {
  'roue:perso:u-0000000a': { libelle: 'Bouillonnant', zone: 'rouge', famille: null, definition: null, archive: false, createdAt: '2026-10-28T08:00:00.000Z' },
  'roue:perso:u-0000000b': { libelle: 'Flottant', zone: 'vert', famille: 'serenite', definition: 'Un peu ailleurs.', archive: false, createdAt: '2026-10-28T09:00:00.000Z' },
};

test('couleurs : le coin intérieur de chaque zone est la couleur mesurée sur How We Feel ; plus loin du centre, plus profond', () => {
  // Les quatre cases qui bordent le centre de la carte : C00 de visuel §2.5.
  assert.deepEqual([couleurCase(6, 7), couleurCase(7, 7), couleurCase(6, 6), couleurCase(7, 6)], ['#ff8662', '#f7e46d', '#80d5ff', '#95ffae']);
  // Chaque case a la couleur de sa zone, et le coin extérieur est plus sombre que le coin intérieur.
  const lum = (h) => [1, 3, 5].reduce((s, i) => s + parseInt(h.slice(i, i + 2), 16), 0);
  for (const [z, interieur, exterieur] of [['rouge', [6, 7], [1, 12]], ['jaune', [7, 7], [12, 12]], ['bleu', [6, 6], [1, 1]], ['vert', [7, 6], [12, 1]]]) {
    assert.ok(lum(couleurCase(...exterieur)) < lum(couleurCase(...interieur)), z);
  }
  // Toutes différentes d'une case à l'autre dans une zone (un dégradé, pas des aplats).
  assert.equal(new Set(MOTS.map((m) => couleurCase(m.col, m.rang))).size, 144);
});

test('couleurs : un mot à soi, hors du carré, a la couleur de la case du bord de sa zone, sur son rang (spec §4.5)', () => {
  assert.equal(couleurCase(0, 12), couleurCase(1, 12));
  assert.equal(couleurCase(-1, 9), couleurCase(1, 9));
  assert.equal(couleurCase(13, 1), couleurCase(12, 1));
  assert.equal(couleurCase(15, 7), couleurCase(12, 7));
});

test('AA : le texte noir sur chaque case (144 et les colonnes des mots à soi) ; le mot de la carte du bas sur #2c2c2e', () => {
  for (let col = -2; col <= 15; col++) {
    for (let rang = 1; rang <= 12; rang++) {
      const c = couleurCase(col, rang);
      assert.ok(contraste(c, '#000000') >= 4.5, `${col}, ${rang} : ${c}`);
      const lisible = couleurLisible(c);
      assert.ok(contraste(lisible, FOND_CARTE_DU_BAS) >= 4.5, `carte du bas ${col}, ${rang} : ${lisible}`);
    }
  }
  // Une couleur déjà lisible ne change pas ; une case profonde est éclaircie, en gardant sa teinte (le rouge reste rouge).
  assert.equal(couleurLisible('#95ffae'), '#95ffae');
  const enrage = couleurLisible(couleurCase(1, 12));
  assert.notEqual(enrage, couleurCase(1, 12));
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(enrage.slice(i, i + 2), 16));
  assert.ok(r > g && r > b, enrage);
});

// Relecture finale : à l'écran 3, une activité choisie prend la couleur de la case du mot (moment.js, --c-fill), avec
// le texte -on de sa zone (tokens.css, le même dans les deux thèmes) : AA sur chaque case de la zone.
test('AA : le texte -on de chaque zone sur chaque case de cette zone (une activité choisie à l\'écran 3)', () => {
  const { clair } = jetons(lire(join(RACINE, 'public', 'css', 'tokens.css')));
  for (let col = -2; col <= 15; col++) {
    for (let rang = 1; rang <= 12; rang++) {
      const zone = zoneDeCase(Math.min(12, Math.max(1, col)), rang);
      const c = couleurCase(col, rang);
      assert.ok(contraste(clair[`c-zone-${zone}-on`], c) >= 4.5, `${col}, ${rang} : ${c}`);
    }
  }
});

test('disposition sans mot choisi : une grille carrée au pas de 106, échelle 1 ; avec des mots à soi, elle s\'élargit de leur côté', () => {
  const p = disposition(MOTS);
  assert.deepEqual(p.get(id('Enragé')), { x: 0, y: 0, echelle: 1 });
  assert.deepEqual(p.get(id('Calme')), { x: 6 * PAS, y: 6 * PAS, echelle: 1 });
  assert.deepEqual(p.get(id('Serein')), { x: 11 * PAS, y: 11 * PAS, echelle: 1 });
  const avec = motsDeLaCarte(PERSO);
  const q = disposition(avec);
  // Bouillonnant, rouge, à la colonne 0 : la colonne 1 passe à un pas du bord ; Flottant, vert, à la colonne 13.
  assert.deepEqual(q.get('roue:perso:u-0000000a'), { x: 0, y: 0, echelle: 1 });
  assert.deepEqual(q.get(id('Enragé')), { x: PAS, y: 0, echelle: 1 });
  assert.deepEqual(q.get('roue:perso:u-0000000b'), { x: 13 * PAS, y: 11 * PAS, echelle: 1 });
});

test('disposition avec un mot choisi : il garde sa place, ses voisines à 120 puis 108 pt, les autres à 96 (visuel §2.2)', () => {
  const calme = id('Calme');
  const p = disposition(MOTS, calme);
  const c = p.get(calme);
  assert.deepEqual(c, { x: 6 * PAS, y: 6 * PAS, echelle: 1.625 });
  const rel = (libelle) => { const q = p.get(id(libelle)); return [+(q.x - c.x).toFixed(1), +(q.y - c.y).toFixed(1), q.echelle]; };
  // Au-dessus, en dessous, à gauche, à droite : 142,1 (78 + 4 + 60, mesuré sur la capture).
  assert.deepEqual(rel('Réjoui'), [0, -142.1, 1.25]);
  assert.deepEqual(rel('Bien'), [0, 142.1, 1.25]);
  assert.deepEqual(rel('Ennui'), [-142.1, 0, 1.25]);
  assert.deepEqual(rel('À l\'aise'), [142.1, 0, 1.25]);
  // En diagonale : 117,1 ; deux cases plus haut : 260,3.
  assert.deepEqual(rel('Mal à l\'aise'), [-117.1, -117.1, 1.125]);
  assert.deepEqual(rel('Pensif'), [117.1, 117.1, 1.125]);
  assert.deepEqual(rel('Gai'), [0, -260.3, 1.125]);
  assert.equal(rel('Tendu')[2], 1);
});

// Relecture finale : la fenêtre visible autour du mot choisi (|Δcol| ≤ 2 et |Δrang| ≤ 4, et sa transposée) reprend la
// table mesurée de visuel §2.2 au dixième de pt près ; au-delà, les colonnes restent droites et le pas lointain est de
// 106. Calme (col 7, rang 6) a ses voisines des deux côtés jusqu'à 4 cases : toute la fenêtre est sur la carte.
const TABLE_VISUEL = {
  '0,1': [0, 142.1], '1,0': [142.1, 0], '1,1': [117.1, 117.1], '0,2': [0, 260.3], '2,0': [260.3, 0],
  '1,2': [100.3, 222.3], '2,1': [222.3, 100.3], '2,2': [202.4, 202.4], '0,3': [0, 366.5], '1,3': [95.1, 328.8],
  '2,3': [192.2, 308.3], '1,4': [93.7, 434.3], '2,4': [188.8, 415.3], '0,4': [0, 472.5],
};
test('disposition avec un mot choisi : la fenêtre visible suit la table mesurée de visuel §2.2, transposée comprise ; au-delà, le pas de 106', () => {
  const calme = MOTS.find((m) => m.libelle === 'Calme');
  const p = disposition(MOTS, calme.id);
  const c = p.get(calme.id);
  const a = (di, dj) => { const m = MOTS.find((x) => x.col === calme.col + di && x.rang === calme.rang - dj); const q = p.get(m.id); return [q.x - c.x, q.y - c.y]; };
  const proche = ([x, y], [ex, ey], msg) => assert.ok(Math.abs(x - ex) < 0.05 && Math.abs(y - ey) < 0.05, `${msg} : (${x.toFixed(1)} ; ${y.toFixed(1)}) au lieu de (${ex} ; ${ey})`);
  for (const [cle, [x, y]] of Object.entries(TABLE_VISUEL)) {
    const [i, j] = cle.split(',').map(Number);
    for (const [si, sj] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      proche(a(si * i, sj * j), [si * x, sj * y], `(${si * i}, ${sj * j})`);
      proche(a(si * j, sj * i), [si * y, sj * x], `transposée (${si * j}, ${sj * i})`);
    }
  }
  // Au-delà de la fenêtre : la colonne de (1, 4) reste droite, au pas de 106 ; la rangée de (4, 1) aussi.
  proche(a(1, 5), [93.7, 434.3 + PAS], '(1, 5)');
  proche(a(5, 1), [434.3 + PAS, 93.7], '(5, 1)');
  proche(a(3, 3), [192.2 + PAS, 192.2 + PAS], '(3, 3)');
});

// Le mot choisi est une double capsule : deux capsules verticales de 78 × 156 (rayon 39) accolées ; les autres, des disques.
const distanceSegment = ([px, py], [ax, ay], [bx, by]) => {
  const [dx, dy] = [bx - ax, by - ay];
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};
test('aucune bulle n\'en chevauche une autre, quel que soit le mot choisi (et sans mot choisi), mots à soi compris', () => {
  const mots = motsDeLaCarte(PERSO);
  for (const choisi of [null, ...mots.map((m) => m.id)]) {
    const p = [...disposition(mots, choisi).entries()];
    const disques = p.filter(([i]) => i !== choisi).map(([, q]) => [q.x, q.y, 48 * q.echelle]);
    for (let i = 0; i < disques.length; i++) {
      for (let j = i + 1; j < disques.length; j++) {
        const [a, b] = [disques[i], disques[j]];
        assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) >= a[2] + b[2] - 0.01, `${choisi} : deux disques se chevauchent`);
      }
    }
    if (!choisi) continue;
    const q = disposition(mots, choisi).get(choisi);
    for (const [x, y, r] of disques) {
      for (const dx of [-39, 39]) {
        assert.ok(distanceSegment([x, y], [q.x + dx, q.y - 39], [q.x + dx, q.y + 39]) >= 39 + r - 0.01, `${choisi} : la double capsule chevauche un disque`);
      }
    }
  }
});

test('étendue : le plan contient toutes les dispositions ; pointDe : le milieu d\'une zone, ou la place régulière d\'un mot', () => {
  const e = etendue(MOTS);
  assert.deepEqual(e.regulier, { minX: 0, maxX: 11 * PAS, minY: 0, maxY: 11 * PAS });
  for (const choisi of [id('Enragé'), id('Calme'), id('Serein')]) {
    for (const q of disposition(MOTS, choisi).values()) assert.ok(q.x >= e.minX && q.x <= e.maxX && q.y >= e.minY && q.y <= e.maxY);
  }
  assert.ok(e.minX < 0 && e.maxX > 11 * PAS, 'la lentille écarte les bords');
  // Le milieu de la zone rouge (colonnes 1 à 6, rangs 12 à 7), celui de la verte (7 à 12, 6 à 1).
  assert.deepEqual(pointDe(MOTS, { zone: 'rouge' }), { x: 2.5 * PAS, y: 2.5 * PAS });
  assert.deepEqual(pointDe(MOTS, { zone: 'vert' }), { x: 8.5 * PAS, y: 8.5 * PAS });
  assert.deepEqual(pointDe(MOTS, { id: id('Calme') }), { x: 6 * PAS, y: 6 * PAS });
  // Les mots qui servent de repères ici sont bien dans la zone attendue.
  assert.deepEqual(['Enragé', 'Serein', 'Calme', 'Ennui'].map((l) => zoneDe(id(l))), ['rouge', 'vert', 'vert', 'bleu']);
});
