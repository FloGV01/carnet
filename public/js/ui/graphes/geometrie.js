// Géométrie pure des graphiques (rendue en SVG à l'écran et sur canvas pour le PDF).
// Coordonnées arrondies au dixième. Une semaine vide ne dessine rien.
const r1 = (x) => Math.round(x * 10) / 10;

export const DIM = { largeur: 340, hauteur: 140, haut: 8, bas: 22, gauche: 24, droite: 6 };

function colonnes(n, d) {
  const interieur = d.largeur - d.gauche - d.droite;
  const pas = interieur / n;
  return { pas, centre: (i) => d.gauche + pas * (i + 0.5) };
}

// Humeur : axe fixe de 1 à 10, filets à 4 et 7, point plein ou anneau (moyenne fragile).
export function geometrieHumeur(semaines, d = DIM) {
  const h = d.hauteur - d.haut - d.bas;
  const y = (v) => r1(d.haut + ((10 - v) / 9) * h);
  const { centre } = colonnes(semaines.length, d);
  const points = [];
  const segments = [];
  let prec = null;
  semaines.forEach((s, i) => {
    if (s.humeur == null) { prec = null; return; }
    const p = { x: r1(centre(i)), y: y(s.humeur), plein: !s.fragile, valeur: s.humeur, lundi: s.lundi };
    if (prec) segments.push({ x1: prec.x, y1: prec.y, x2: p.x, y2: p.y });
    points.push(p);
    prec = p;
  });
  return { points, segments, filets: [{ v: 4, y: y(4) }, { v: 7, y: y(7) }], graduations: [1, 4, 7, 10].map((v) => ({ v, y: y(v) })), y };
}

// Explosions : barres ; zéro avec des données = trait de 2 ; semaine sans donnée = rien.
export function geometrieExplosions(semaines, d = DIM) {
  const h = d.hauteur - d.haut - d.bas;
  const max = Math.max(1, ...semaines.map((s) => s.explosions || 0));
  const { pas, centre } = colonnes(semaines.length, d);
  const larg = r1(Math.min(18, pas * 0.6));
  const base = d.haut + h;
  const barres = [];
  semaines.forEach((s, i) => {
    if (s.explosions == null) return;
    const hauteur = s.explosions === 0 ? 2 : r1((s.explosions / max) * h);
    barres.push({ x: r1(centre(i) - larg / 2), y: r1(base - hauteur), l: larg, h: hauteur, valeur: s.explosions, zero: s.explosions === 0 });
  });
  return { barres, max, base: r1(base) };
}

// Sommeil : barres empilées Mal / Moyen / Bien (rampe d'une seule teinte, en classes CSS).
export function geometrieSommeil(semaines, d = DIM) {
  const h = d.hauteur - d.haut - d.bas;
  const max = Math.max(1, ...semaines.map((s) => (s.sommeil ? s.sommeil.mal + s.sommeil.moyen + s.sommeil.bien : 0)));
  const { pas, centre } = colonnes(semaines.length, d);
  const larg = r1(Math.min(18, pas * 0.6));
  const base = d.haut + h;
  const piles = [];
  semaines.forEach((s, i) => {
    if (!s.sommeil) return;
    let yCourant = base;
    const morceaux = [];
    for (const [cle, classe] of [['mal', 'sommeil-1'], ['moyen', 'sommeil-2'], ['bien', 'sommeil-3']]) {
      const n = s.sommeil[cle];
      if (!n) continue;
      const hh = r1((n / max) * h);
      yCourant -= hh;
      morceaux.push({ classe, y: r1(yCourant), h: hh, n, cle });
    }
    piles.push({ x: r1(centre(i) - larg / 2), l: larg, morceaux });
  });
  return { piles, max, base: r1(base) };
}

// Étiquettes de l'axe des semaines (une sur trois pour rester lisible).
export function etiquettesSemaines(semaines, d = DIM) {
  const { centre } = colonnes(semaines.length, d);
  return semaines.map((s, i) => ({ x: r1(centre(i)), texte: `${Number(s.lundi.slice(8))}/${Number(s.lundi.slice(5, 7))}`, visible: (semaines.length - 1 - i) % 3 === 0 }));
}

// Haltère : deux proportions sur une échelle de 0 à 1.
export function geometrieHaltere(p1, p2, largeur = 300, marge = 10) {
  const x = (p) => r1(marge + p * (largeur - 2 * marge));
  return { x1: x(p1), x2: x(p2) };
}
