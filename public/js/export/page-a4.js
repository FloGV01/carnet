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

// Une valeur faite d'éléments séparés par « · » (« colère 3 · joie 4 · sérénité 5 ») : les éléments entiers, ligne après
// ligne, sans couper un élément. Une ligne peut dépasser l'estimation de 10 % : celle-ci est prudente (les espaces et
// « · » sont étroits), et la page réduit au besoin la police d'un texte trop large (jusqu'à 75 %). Ainsi, des comptes à
// 4 chiffres (« colère 1028 · dégoût 1028 ») gardent deux familles par ligne, et la page reste d'un seul tenant.
const MARGE_LISTE = 0.9;
export function couperListe(texte, taillePt, largeurMm) {
  const max = Math.floor(Math.max(8, largeurMm / (taillePt * PT * LARGEUR_CAR)) / MARGE_LISTE);
  const lignes = [];
  for (const el of String(texte).split(' · ')) {
    const derniere = lignes.length - 1;
    if (derniere >= 0 && `${lignes[derniere]} · ${el}`.length <= max) lignes[derniere] += ` · ${el}`;
    else lignes.push(el);
  }
  return lignes;
}

// Hauteur de la frise (mm) : sans ou avec la rangée « Humeur (notes) » (anciennes notes sur la période).
export const HAUTEUR_FRISE = { seule: 30, avecNotes: 36 };
// La légende des émotions : une case à motif par famille (lisible imprimée en noir et blanc), puis son nom.
export const CASE_EMOTION = { l: 4.2, h: 2.6, ecart: 1, apres: 3.2, taille: 6.5 };
const LIGNE_INDICATEUR = 3.9;
const INTERLIGNE_LISTE = 7 * PT * 1.1;
const largeurTexte = (t, taille) => t.length * taille * PT * LARGEUR_CAR;
// Nuit par nuit (v8, Q15) : les nuits en 4 colonnes, de haut en bas puis de gauche à droite, dans l'ordre des jours. Chaque
// nuit : son jour, une barre longue comme ses heures (de 0 à 12 h, plus si une nuit ancienne a duré davantage), à la teinte
// de sa qualité (la rampe de la frise, creuse sans qualité), puis son texte (« Mal · 6 h »).
export const NUIT_PAR_NUIT = { colonnes: 4, jourL: 11, barreL: 12, ecart: 1, ligne: 3, barreH: 1.6, taille: 6.5, axeMin: 12, axePas: 4 };

// La page, avec « Nuit par nuit » sur 4 semaines ; si elle dépasse 273 mm, sur 2 semaines ; si elle dépasse encore, sans
// cette section (le reste de la page ne change jamais). `nuitsSemaines` : la fenêtre retenue (0 sans la section).
export function mettreEnPage(m) {
  let page = null;
  for (const nuits of [...(m.nuits || []), null]) {
    page = { ...composer(m, nuits), nuitsSemaines: nuits ? nuits.semaines : 0 };
    if (page.hauteur <= A4.hauteurMax) break;
  }
  return page;
}

function composer(m, nuits) {
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
  // droite : des éléments posés au bout de la ligne du titre (la légende des émotions), s'ils y tiennent.
  const titreSection = (t, droite = null) => {
    y += 2;
    texte(t.toUpperCase(), { taille: 7.5, gras: true, couleur: 'secondaire', interligne: 1.3 });
    if (droite) droite(y, x0 + largeurTexte(t, 7.5) + 4);
    y += 0.8; ops.push({ type: 'ligne', x1: x0, y1: y, x2: x0 + largeur, y2: y }); y += 0.6;
  };

  texte(m.entete, { taille: 12, gras: true });
  texte(m.sousTitre, { taille: 8, couleur: 'secondaire' });
  texte(m.noteLecture, { taille: 8, couleur: 'secondaire' });

  // La légende des zones (v9), d'une ligne, au bout de la ligne du titre (dessous si elle n'y tient pas).
  titreSection('Indicateurs', m.legendeZones ? (yLigne, xMin) => {
    const T = CASE_EMOTION.taille;
    let x = x0 + largeur - largeurTexte(m.legendeZones, T);
    if (x < xMin) { y += T * PT * 1.6; yLigne = y; x = x0; }
    ops.push({ type: 'texte', x, y: yLigne, taille: T, texte: m.legendeZones, couleur: 'secondaire' });
  } : null);
  const lNom = 54;
  const lCol = (largeur - lNom) / m.colonnes.length;
  y += 3.5;
  m.colonnes.forEach((c, i) => ops.push({ type: 'texte', x: x0 + lNom + i * lCol, y, taille: 7.5, gras: true, texte: c, couleur: 'secondaire' }));
  for (const ligne of m.indicateurs) {
    y += LIGNE_INDICATEUR;
    ops.push({ type: 'texte', x: x0, y, taille: 7, gras: false, texte: ligne.nom, couleur: 'texte', maxLargeur: lNom - 1.5 });
    // Une ligne multiligne (les émotions par famille, par zone) passe à la ligne entre deux éléments ; la rangée prend la
    // hauteur de sa plus longue valeur.
    let lignes = 1;
    ligne.valeurs.forEach((v, i) => {
      if (!ligne.multiligne) { ops.push({ type: 'texte', x: x0 + lNom + i * lCol, y, taille: 7, texte: v, couleur: 'texte', maxLargeur: lCol - 1.5 }); return; }
      const morceaux = couperListe(v, 7, lCol - 1.5);
      morceaux.forEach((t, k) => ops.push({ type: 'texte', x: x0 + lNom + i * lCol, y: y + k * INTERLIGNE_LISTE, taille: 7, texte: t, couleur: 'texte', maxLargeur: lCol - 1.5 }));
      lignes = Math.max(lignes, morceaux.length);
    });
    y += (lignes - 1) * INTERLIGNE_LISTE;
    ops.push({ type: 'ligne', x1: x0, y1: y + 1.2, x2: x0 + largeur, y2: y + 1.2, fin: true });
  }

  // La frise (v7, la géométrie de « Mes jours ») : une étiquette par rangée, les émotions en barres empilées par famille
  // dans l'ordre de la roue, « Humeur (notes) » seulement si la période a d'anciennes notes.
  // La légende des émotions, au bout de la ligne du titre : une case par famille notée sur la frise, à sa couleur et à
  // son motif, dans l'ordre de la roue (celui des barres, de bas en haut), puis son nom. Elle passe sous le titre si
  // elle n'y tient pas.
  const familles = m.frise.familles || [];
  const legendeFamilles = (yLigne, xMin) => {
    const T = CASE_EMOTION.taille;
    const largeurs = familles.map((f) => CASE_EMOTION.l + CASE_EMOTION.ecart + largeurTexte(f.libelle, T));
    const total = largeurs.reduce((a, b) => a + b, 0) + CASE_EMOTION.apres * (familles.length - 1);
    let x = x0 + largeur - total;
    if (x < xMin) { y += T * PT * 1.6; yLigne = y; x = x0; }
    familles.forEach((f, i) => {
      ops.push({ type: 'emotion', famille: f.cle, x, y: yLigne - CASE_EMOTION.h + 0.2, l: CASE_EMOTION.l, h: CASE_EMOTION.h });
      ops.push({ type: 'texte', x: x + CASE_EMOTION.l + CASE_EMOTION.ecart, y: yLigne, taille: T, texte: f.libelle, couleur: 'secondaire' });
      x += largeurs[i] + CASE_EMOTION.apres;
    });
  };
  titreSection(m.titreEvolution, familles.length ? legendeFamilles : null);
  y += 1.5;
  const hFrise = m.frise.avecHumeur ? HAUTEUR_FRISE.avecNotes : HAUTEUR_FRISE.seule;
  ops.push({ type: 'frise', y, hauteur: hFrise, largeur, x: x0, frise: m.frise });
  y += hFrise + 1;
  // Les rangées portent leur nom : la légende ne dit que ce qui ne se voit pas.
  const [mal, moyen, bien] = m.libellesSommeil;
  const unite = m.frise.pas === 'mois' ? 'mois' : 'semaine';
  const legende = [
    familles.length && `Émotions : relevés par ${unite}, de bas en haut dans l'ordre de la légende`,
    m.frise.avecHumeur && 'Humeur (notes) : 1 en bas, 10 en haut ; anneau : peu de valeurs',
    `nuits ${mal}, ${moyen}, ${bien} : du plus clair au plus foncé`,
    'Épisodes : autres que les explosions',
    // Repères de traitement (v6) : leur légende est la ligne numérotée de la section Traitement.
    m.frise.reperes && m.frise.reperes.length && 'trait numéroté : changement de traitement (voir Traitement)',
  ].filter(Boolean);
  texte(`${legende.join(' · ')}.`, { taille: 6.5, couleur: 'secondaire' });

  // Nuit par nuit (v8) : la légende au bout de la ligne du titre (ou dessous si elle n'y tient pas), puis les nuits.
  function nuitParNuit({ semaines, nuits: liste }) {
    const N = NUIT_PAR_NUIT;
    const plusLongue = Math.max(0, ...liste.map((n) => n.heures ?? 0));
    const max = Math.max(N.axeMin, Math.ceil(plusLongue / N.axePas) * N.axePas);
    const note = `barre : heures dormies, de 0 à ${max} h · date : le jour qui suit la nuit`;
    titreSection(`Nuit par nuit (${semaines} semaines)`, (yLigne, xMin) => {
      let x = x0 + largeur - largeurTexte(note, N.taille);
      if (x < xMin) { y += N.taille * PT * 1.6; yLigne = y; x = x0; }
      ops.push({ type: 'texte', x, y: yLigne, taille: N.taille, texte: note, couleur: 'secondaire' });
    });
    const lColonne = largeur / N.colonnes;
    const rangs = Math.ceil(liste.length / N.colonnes);
    const haut = y + 0.4;
    liste.forEach((n, i) => {
      const x = x0 + Math.floor(i / rangs) * lColonne;
      const yy = haut + ((i % rangs) + 1) * N.ligne;
      const xBarre = x + N.jourL;
      ops.push({ type: 'texte', x, y: yy, taille: N.taille, texte: n.jour, couleur: 'secondaire', maxLargeur: N.jourL - 0.6 });
      if (n.heures != null) ops.push({ type: 'nuit', x: xBarre, y: yy - N.barreH - 0.2, l: Math.max(0.4, (n.heures / max) * N.barreL), h: N.barreH, qualite: n.qualite });
      const xTexte = xBarre + N.barreL + N.ecart;
      ops.push({ type: 'texte', x: xTexte, y: yy, taille: N.taille, texte: n.texte, couleur: 'texte', maxLargeur: x + lColonne - xTexte - 1.5 });
    });
    // Le 0 h des barres de chaque colonne : un filet.
    for (let c = 0; c * rangs < liste.length; c += 1) {
      const xBase = x0 + c * lColonne + N.jourL;
      ops.push({ type: 'ligne', x1: xBase, y1: haut + 0.4, x2: xBase, y2: haut + rangs * N.ligne + 0.6, fin: true });
    }
    y = haut + rangs * N.ligne + 1;
  }
  if (nuits) nuitParNuit(nuits);

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

  // Traitement : l'actuel en deux colonnes, puis les changements datés des 90 derniers jours.
  const actuel = m.traitementActuel || [];
  if (actuel.length || m.traitement.length) {
    titreSection('Traitement');
    for (let i = 0; i < actuel.length; i += 2) {
      const yLigne = y;
      texte(actuel[i], { taille: 7.5, uneLigne: true, l: largeur / 2 - 2 });
      if (actuel[i + 1]) { const yApres = y; y = yLigne; texte(actuel[i + 1], { taille: 7.5, uneLigne: true, x: x0 + largeur / 2, l: largeur / 2 - 2 }); y = yApres; }
    }
    for (const t of m.traitement) texte(t, { taille: 8, uneLigne: true });
  }

  titreSection(`Pour ce rendez-vous${m.rdv.professionnel ? ` · ${m.rdv.professionnel}` : ''}`);
  texte(m.rdv.prochain ? `Prochain rendez-vous : ${m.rdv.prochain}` : 'Aucun rendez-vous à venir noté.', { taille: 8 });
  if (m.rdv.questions.length) { texte('Questions :', { taille: 8, gras: true }); for (const q of m.rdv.questions) texte(`· ${q}`, { taille: 7, interligne: 1.2 }); }
  if (m.rdv.prochaineEtape) texte(`Prochaine étape notée la dernière fois : ${m.rdv.prochaineEtape}`, { taille: 8 });

  return { ops, hauteur: y + 2 };
}
