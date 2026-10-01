// Mise en page A4 (en mm) de la vue soignants : une liste d'opérations de dessin.
// Pure : la largeur du texte est estimée (prudemment) pour garantir une seule page.
export const A4 = { largeur: 210, hauteur: 297, marge: 12, hauteurMax: 273 };
const PT = 0.3528;
const LARGEUR_CAR = 0.53;

export function couperLignes(texte, taillePt, largeurMm) {
  const max = Math.max(8, Math.floor(largeurMm / (taillePt * PT * LARGEUR_CAR)));
  const mots = String(texte).split(/\s+/);
  const lignes = [];
  let courant = '';
  for (const m of mots) {
    if (!courant) courant = m;
    else if ((courant + ' ' + m).length <= max) courant += ` ${m}`;
    else { lignes.push(courant); courant = m; }
    while (courant.length > max) { lignes.push(courant.slice(0, max)); courant = courant.slice(max); }
  }
  if (courant) lignes.push(courant);
  return lignes;
}

export function mettreEnPage(m) {
  const ops = [];
  const x0 = A4.marge;
  const largeur = A4.largeur - 2 * A4.marge;
  let y = A4.marge;
  const texte = (t, { taille = 9, gras = false, x = x0, l = largeur, couleur = 'texte', interligne = 1.35, uneLigne = false } = {}) => {
    let lignes = couperLignes(t, taille, l);
    if (uneLigne && lignes.length > 1) lignes = [`${lignes[0].slice(0, -1)}…`];
    for (const ligne of lignes) {
      y += taille * PT * interligne;
      ops.push({ type: 'texte', x, y, taille, gras, texte: ligne, couleur });
    }
  };
  const titreSection = (t) => { y += 2; texte(t.toUpperCase(), { taille: 7.5, gras: true, couleur: 'secondaire', interligne: 1.3 }); y += 0.8; ops.push({ type: 'ligne', x1: x0, y1: y, x2: x0 + largeur, y2: y }); y += 0.6; };

  texte(m.entete, { taille: 12, gras: true });
  texte(m.sousTitre, { taille: 8, couleur: 'secondaire' });

  titreSection('Indicateurs');
  const lNom = 54;
  const lCol = (largeur - lNom) / m.colonnes.length;
  y += 3.5;
  m.colonnes.forEach((c, i) => ops.push({ type: 'texte', x: x0 + lNom + i * lCol, y, taille: 7.5, gras: true, texte: c, couleur: 'secondaire' }));
  for (const ligne of m.indicateurs) {
    y += 3.9;
    ops.push({ type: 'texte', x: x0, y, taille: 7, gras: false, texte: ligne.nom, couleur: 'texte', maxLargeur: lNom - 1.5 });
    ligne.valeurs.forEach((v, i) => ops.push({ type: 'texte', x: x0 + lNom + i * lCol, y, taille: 7, texte: v, couleur: 'texte', maxLargeur: lCol - 1.5 }));
    ops.push({ type: 'ligne', x1: x0, y1: y + 1.2, x2: x0 + largeur, y2: y + 1.2, fin: true });
  }

  titreSection('Évolution sur 12 semaines');
  const lg = (largeur - 8) / 3;
  y += 2;
  ['Humeur', 'Explosions', 'Sommeil'].forEach((t, i) => ops.push({ type: 'texte', x: x0 + i * (lg + 4), y: y + 2.5, taille: 7.5, gras: true, texte: t, couleur: 'texte' }));
  ops.push({ type: 'graphes', y: y + 4, hauteur: 30, largeur: lg, x: x0, ecart: 4, semaines: m.semaines });
  y += 4 + 30 + 3;
  texte(`Sommeil : ${m.libellesSommeil.join(' · ')} (du plus foncé au plus clair).`, { taille: 6.5, couleur: 'secondaire' });

  titreSection('Ce qui revient le plus (30 jours)');
  const lc = largeur / 3;
  const yDebut = y;
  let yMax = y;
  m.classements.forEach((c, i) => {
    const col = i % 3;
    const rangee = Math.floor(i / 3);
    let yy = yDebut + rangee * 16 + 3.5;
    ops.push({ type: 'texte', x: x0 + col * lc, y: yy, taille: 7.5, gras: true, texte: c.titre, couleur: 'texte' });
    for (const e of c.elements.length ? c.elements : ['·']) { yy += 3.6; ops.push({ type: 'texte', x: x0 + col * lc, y: yy, taille: 7, texte: couperLignes(e, 7, lc - 2)[0], couleur: 'texte' }); }
    yMax = Math.max(yMax, yy);
  });
  y = Math.max(yMax, yDebut + 2 * 16);

  titreSection('Repères');
  for (const r of m.reperes) texte(`· ${r}`, { taille: 8 });

  if (m.traitement.length) {
    titreSection('Traitement (90 jours)');
    for (const t of m.traitement) texte(t, { taille: 8, uneLigne: true });
  }

  titreSection(`Pour ce rendez-vous${m.rdv.professionnel ? ` · ${m.rdv.professionnel}` : ''}`);
  texte(m.rdv.prochain ? `Prochain rendez-vous : ${m.rdv.prochain}` : 'Aucun rendez-vous à venir noté.', { taille: 8 });
  if (m.rdv.questions.length) { texte('Questions :', { taille: 8, gras: true }); for (const q of m.rdv.questions) texte(`· ${q}`, { taille: 7, interligne: 1.2 }); }
  if (m.rdv.prochaineEtape) texte(`Prochaine étape notée la dernière fois : ${m.rdv.prochaineEtape}`, { taille: 8 });

  return { ops, hauteur: y + 2 };
}
