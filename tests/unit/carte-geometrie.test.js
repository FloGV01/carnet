import { test } from 'node:test';
import assert from 'node:assert/strict';
import { couleurCase, couleurLisible, contraste, disposition, etendue, motDuMilieu, pointDe, PAS, FOND_CARTE_DU_BAS } from '../../public/js/ui/carte-geometrie.js';
import { motsDeLaCarte, zoneDe, zoneDeCase } from '../../public/js/domain/carte-roue.js';
import { jetons } from '../aides/couleurs.js';
import { RACINE, lire } from '../aides/fichiers.js';
import { join } from 'node:path';

// v9 (4/8) · La carte des émotions en nombres (ui/carte-geometrie.js ; visuel-hwf.md §2.2 à §2.5) : la couleur de chaque
// case, lisible avec son texte noir ; la lentille autour du mot choisi, sans chevauchement. Mots à soi inventés.
// v10 (2/9) : le mot du milieu, centre de la lentille pendant le glissement (spec §4.1) ; n'importe quel mot peut donc
// être le centre, avec ou sans mot choisi ailleurs.
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
// Le plus petit écart entre une double capsule à son échelle (le centre de chaque moitié à 24 pt × échelle) et un disque.
const ecartCapsule = (q, [x, y, r]) => Math.min(...[-1, 1].map((sens) => {
  const demi = 24 * q.echelle;
  return distanceSegment([x, y], [q.x + sens * demi, q.y - demi], [q.x + sens * demi, q.y + demi]) - demi - r;
}));
const disquesDe = (p, sauf = null) => [...p.entries()].filter(([i]) => i !== sauf).map(([, q]) => [q.x, q.y, 48 * q.echelle]);
test('aucune bulle n\'en chevauche une autre, quel que soit le centre (chacun des mots, ou aucun), en cercles comme avec la double capsule, mots à soi compris', () => {
  const mots = motsDeLaCarte(PERSO);
  for (const centre of [null, ...mots.map((m) => m.id)]) {
    const p = disposition(mots, centre);
    // Le centre en cercle de 156 (le mot du milieu, pendant le glissement) ; les autres, des disques.
    const disques = disquesDe(p);
    for (let i = 0; i < disques.length; i++) {
      for (let j = i + 1; j < disques.length; j++) {
        const [a, b] = [disques[i], disques[j]];
        assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) >= a[2] + b[2] - 0.01, `${centre} : deux disques se chevauchent`);
      }
    }
    if (!centre) continue;
    // Le centre en double capsule (le mot touché).
    for (const d of disquesDe(p, centre)) assert.ok(ecartCapsule(p.get(centre), d) >= -0.01, `${centre} : la double capsule chevauche un disque`);
  }
});

// Spec §4.1 : la lentille suit le milieu, le mot choisi ailleurs garde sa double capsule, à l'échelle qu'elle lui donne.
// Ses coins sortent du disque que la lentille a prévu pour lui : là où elle resserre ses voisins, ils peuvent mordre sur
// eux d'un point au plus, sans cacher de libellé.
test('un mot choisi hors du centre de la lentille : sa double capsule mord d\'un point au plus sur ses voisins', () => {
  const mots = motsDeLaCarte(PERSO);
  for (const centre of mots) {
    const p = disposition(mots, centre.id);
    for (const choisi of mots) {
      if (choisi.id === centre.id) continue;
      const q = p.get(choisi.id);
      for (const d of disquesDe(p, choisi.id)) {
        // Un disque à plus de deux diamètres ne peut pas la toucher : le calcul est évité (146 × 146 × 145 paires).
        if (Math.abs(d[0] - q.x) > 200 || Math.abs(d[1] - q.y) > 200) continue;
        assert.ok(ecartCapsule(q, d) >= -1, `centre ${centre.libelle}, choisi ${choisi.libelle}`);
      }
    }
  }
});

test('étendue : le plan contient la disposition de chacun des centres possibles ; pointDe : le milieu d\'une zone, ou la place régulière d\'un mot', () => {
  const e = etendue(MOTS);
  assert.deepEqual(e.regulier, { minX: 0, maxX: 11 * PAS, minY: 0, maxY: 11 * PAS });
  for (const mots of [MOTS, motsDeLaCarte(PERSO)]) {
    const f = etendue(mots);
    for (const m of mots) {
      for (const q of disposition(mots, m.id).values()) assert.ok(q.x >= f.minX && q.x <= f.maxX && q.y >= f.minY && q.y <= f.maxY, m.libelle);
    }
  }
  assert.ok(e.minX < 0 && e.maxX > 11 * PAS, 'la lentille écarte les bords');
  // Le milieu de la zone rouge (colonnes 1 à 6, rangs 12 à 7), celui de la verte (7 à 12, 6 à 1).
  assert.deepEqual(pointDe(MOTS, { zone: 'rouge' }), { x: 2.5 * PAS, y: 2.5 * PAS });
  assert.deepEqual(pointDe(MOTS, { zone: 'vert' }), { x: 8.5 * PAS, y: 8.5 * PAS });
  assert.deepEqual(pointDe(MOTS, { id: id('Calme') }), { x: 6 * PAS, y: 6 * PAS });
  // Les mots qui servent de repères ici sont bien dans la zone attendue.
  assert.deepEqual(['Enragé', 'Serein', 'Calme', 'Ennui'].map((l) => zoneDe(id(l))), ['rouge', 'vert', 'vert', 'bleu']);
});

test('le mot du milieu : sur une place, ce mot ; entre deux places, la plus proche ; le calcul part des places régulières, mots à soi compris', () => {
  const place = (libelle, mots = MOTS) => disposition(mots).get(mots.find((m) => m.libelle === libelle).id);
  for (const libelle of ['Enragé', 'Calme', 'Serein', 'Ennui']) assert.equal(motDuMilieu(MOTS, place(libelle)), id(libelle));
  // Calme est à (6 ; 6) pas, À l'aise à (7 ; 6) : un tiers du chemin reste à Calme, deux tiers vont à À l'aise.
  const calme = place('Calme');
  assert.equal(motDuMilieu(MOTS, { x: calme.x + PAS / 3, y: calme.y }), id('Calme'));
  assert.equal(motDuMilieu(MOTS, { x: calme.x + (2 * PAS) / 3, y: calme.y }), id('À l\'aise'));
  // Très loin hors de la carte : le coin le plus proche.
  assert.equal(motDuMilieu(MOTS, { x: -2000, y: -2000 }), id('Enragé'));
  // Un mot à soi décale les colonnes (la colonne 1 passe à un pas du bord) : le point suit le même repère.
  const avec = motsDeLaCarte(PERSO);
  assert.equal(motDuMilieu(avec, place('Bouillonnant', avec)), 'roue:perso:u-0000000a');
  assert.equal(motDuMilieu(avec, place('Enragé', avec)), id('Enragé'));
  assert.equal(motDuMilieu(avec, place('Flottant', avec)), 'roue:perso:u-0000000b');
  // Rien sur la carte : rien.
  assert.equal(motDuMilieu([], { x: 0, y: 0 }), null);
});

test('le mot du milieu : l\'hystérésis garde le précédent tant qu\'aucune place n\'est plus proche d\'au moins 15 % du pas ; ce seuil se règle', () => {
  const { x, y } = disposition(MOTS).get(id('Calme'));
  const point = (t) => ({ x: x + t, y });
  const [calme, aise] = [id('Calme'), id('À l\'aise')];
  // Au milieu des deux, et un peu au-delà : À l'aise est le plus proche, mais de moins de 15,9 pt.
  assert.equal(motDuMilieu(MOTS, point(PAS / 2 + 1)), aise);
  assert.equal(motDuMilieu(MOTS, point(PAS / 2 + 1), calme), calme);
  assert.equal(motDuMilieu(MOTS, point(PAS / 2 + 7.9), calme), calme);
  // Plus proche de 16 pt : il change. Et de l'autre côté, le précédent est À l'aise : même règle.
  assert.equal(motDuMilieu(MOTS, point(PAS / 2 + 8), calme), aise);
  assert.equal(motDuMilieu(MOTS, point(PAS / 2 - 7.9), aise), aise);
  assert.equal(motDuMilieu(MOTS, point(PAS / 2 - 8), aise), calme);
  // Le seuil en paramètre : sans lui, plus d'hystérésis ; plus grand, elle tient plus loin.
  assert.equal(motDuMilieu(MOTS, point(PAS / 2 + 1), calme, 0), aise);
  assert.equal(motDuMilieu(MOTS, point(PAS / 2 + 8), calme, 0.3), calme);
  // Un précédent qui n'est plus sur la carte (un mot à soi mis de côté) ne compte pas ; ni un précédent loin du point.
  assert.equal(motDuMilieu(MOTS, point(0), 'roue:perso:u-00000000'), calme);
  assert.equal(motDuMilieu(MOTS, point(0), id('Enragé')), calme);
});

test('le mot du milieu : à égalité entre quatre mots (le milieu d\'une zone), le plus haut puis le plus à gauche ; entre deux, pareil', () => {
  // Le milieu de chaque zone tombe entre les colonnes 3 et 4 (ou 9 et 10), et les rangs 9 et 10 (ou 3 et 4).
  const coin = (col, rang) => MOTS.find((m) => m.col === col && m.rang === rang).id;
  assert.equal(motDuMilieu(MOTS, pointDe(MOTS, { zone: 'rouge' })), coin(3, 10));
  assert.equal(motDuMilieu(MOTS, pointDe(MOTS, { zone: 'jaune' })), coin(9, 10));
  assert.equal(motDuMilieu(MOTS, pointDe(MOTS, { zone: 'bleu' })), coin(3, 4));
  assert.equal(motDuMilieu(MOTS, pointDe(MOTS, { zone: 'vert' })), coin(9, 4));
  // Le résultat ne dépend pas de l'ordre de la liste.
  assert.equal(motDuMilieu([...MOTS].reverse(), pointDe(MOTS, { zone: 'rouge' })), coin(3, 10));
  // Entre deux mots d'une même rangée, le plus à gauche ; d'une même colonne, le plus haut.
  const p = disposition(MOTS).get(coin(5, 8));
  assert.equal(motDuMilieu(MOTS, { x: p.x + PAS / 2, y: p.y }), coin(5, 8));
  assert.equal(motDuMilieu([...MOTS].reverse(), { x: p.x + PAS / 2, y: p.y }), coin(5, 8));
  assert.equal(motDuMilieu(MOTS, { x: p.x, y: p.y + PAS / 2 }), coin(5, 8));
  assert.equal(motDuMilieu([...MOTS].reverse(), { x: p.x, y: p.y + PAS / 2 }), coin(5, 8));
  // À égalité, le précédent reste : ni l'un ni l'autre n'est plus proche.
  assert.equal(motDuMilieu(MOTS, pointDe(MOTS, { zone: 'rouge' }), coin(4, 9)), coin(4, 9));
});
