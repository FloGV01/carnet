import { test } from 'node:test';
import assert from 'node:assert/strict';
import { couleurCase, couleurLisible, contraste, disposition, etendue, pointDe, PAS, FOND_CARTE_DU_BAS } from '../../public/js/ui/carte-geometrie.js';
import { motsDeLaCarte, zoneDe } from '../../public/js/domain/carte-roue.js';

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
  const rel = (libelle) => { const q = p.get(id(libelle)); return [q.x - c.x, q.y - c.y, q.echelle]; };
  // Au-dessus, en dessous, à gauche, à droite : 78 + 4 + 60 = 142 (capture : 142,1).
  assert.deepEqual(rel('Réjoui'), [0, -142, 1.25]);
  assert.deepEqual(rel('Bien'), [0, 142, 1.25]);
  assert.deepEqual(rel('Ennui'), [-142, 0, 1.25]);
  assert.deepEqual(rel('À l\'aise'), [142, 0, 1.25]);
  // En diagonale : 118 (capture : 117,1) ; deux cases plus haut : 260 (capture : 260,3).
  assert.deepEqual(rel('Mal à l\'aise'), [-118, -118, 1.125]);
  assert.deepEqual(rel('Pensif'), [118, 118, 1.125]);
  assert.deepEqual(rel('Gai'), [0, -260, 1.125]);
  assert.equal(rel('Tendu')[2], 1);
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
