// Dessine les opérations de la page A4 (mm) sur un canvas de 1654 × 2339 px (200 ppp).
// Toujours en thème clair : la page doit rester lisible imprimée en noir et blanc.
import { A4 } from '../../export/page-a4.js';
import { DIM_MES_JOURS_PDF, TAILLE_REPERE, geometrieMesJours } from './geometrie.js';

export const TAILLE_PX = { largeur: 1654, hauteur: 2339 };
const PT = 0.3528;
const COULEURS = { texte: '#1F1D1A', secondaire: '#6B665E', filet: '#E4DFD8', trait: '#8C857B', accent: '#3B4A6B', fond: '#FFFFFF', sommeil: ['#A9B5CF', '#6D7FA6', '#3B4A6B'] };
const POLICE = '-apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif';

// Émotions (v7) : la couleur de chaque famille de la roue (tokens.css, --c-emo-<famille> en clair), et un motif blanc par
// famille, pour que les barres empilées se lisent aussi imprimées en noir et blanc : l'ordre est fixe (celui de la roue,
// de bas en haut), et chaque famille a son motif, repris dans la légende.
export const COULEURS_EMOTIONS = {
  colere: '#db423c', degout: '#c56001', tristesse: '#888505', joie: '#36982d', surprise: '#2f82d6', peur: '#9364ce', serenite: '#079390',
};
export const MOTIFS = {
  colere: 'plein', degout: 'montantes', tristesse: 'horizontales', joie: 'points', surprise: 'descendantes', peur: 'croisillons', serenite: 'verticales',
};
// Le pas du motif et l'épaisseur de ses traits, en mm sur la page : les mêmes dans la frise et dans la légende.
const MOTIF_MM = { pas: 0.75, trait: 0.2, point: 0.2 };

// Un rectangle d'une famille : sa couleur, puis son motif (en blanc), coupé au rectangle. `mm` : la taille d'un mm dans
// le repère courant du contexte.
function caseEmotion(ctx, famille, x, y, l, h, mm) {
  ctx.fillStyle = COULEURS_EMOTIONS[famille] || COULEURS.secondaire;
  ctx.fillRect(x, y, l, h);
  const motif = MOTIFS[famille];
  if (!motif || motif === 'plein') return;
  const pas = MOTIF_MM.pas * mm;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, l, h); ctx.clip();
  ctx.strokeStyle = COULEURS.fond; ctx.fillStyle = COULEURS.fond; ctx.lineWidth = MOTIF_MM.trait * mm;
  const trait = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
  if (motif === 'horizontales') for (let yy = y + pas / 2; yy < y + h; yy += pas) trait(x, yy, x + l, yy);
  if (motif === 'verticales') for (let xx = x + pas / 2; xx < x + l; xx += pas) trait(xx, y, xx, y + h);
  // Les diagonales croisées sont plus espacées : elles restent distinctes des points et des diagonales simples.
  const pasCroise = motif === 'croisillons' ? pas * 1.6 : pas;
  if (motif === 'montantes' || motif === 'croisillons') for (let t = -h; t < l; t += pasCroise) trait(x + t, y + h, x + t + h, y);
  if (motif === 'descendantes' || motif === 'croisillons') for (let t = -h; t < l; t += pasCroise) trait(x + t, y, x + t + h, y + h);
  if (motif === 'points') {
    for (let yy = y + pas / 2; yy < y + h; yy += pas) {
      for (let xx = x + pas / 2; xx < x + l; xx += pas) { ctx.beginPath(); ctx.arc(xx, yy, MOTIF_MM.point * mm, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  ctx.restore();
}

// La frise des émotions et des jours : la géométrie de « Mes jours » (geometrie.js), sans énergie, sur une largeur qui
// suit le rapport du cadre (sinon textes et barres seraient écrasés) ; la bande des repères de traitement ajoute de la
// hauteur, d'où un nouveau calcul. L'échelle ne dépasse jamais le cadre.
export function geometriePage(op) {
  const frise = { ...op.frise, avecEnergie: false };
  const calculer = (largeur) => geometrieMesJours(frise, { reperes: op.frise.reperes || [] }, { ...DIM_MES_JOURS_PDF, largeur });
  let geo = calculer(DIM_MES_JOURS_PDF.largeur);
  for (let k = 0; k < 3; k++) {
    const largeur = (geo.dim.hauteur * op.largeur) / op.hauteur;
    if (Math.abs(largeur - geo.dim.largeur) < 0.5) break;
    geo = calculer(largeur);
  }
  return geo;
}

function dessinerFrise(ctx, op, k) {
  const geo = geometriePage(op);
  const d = geo.dim;
  const echelle = Math.min((op.hauteur * k) / d.hauteur, (op.largeur * k) / d.largeur);
  const mm = k / echelle;
  const gauche = DIM_MES_JOURS_PDF.gauche;
  const droite = d.largeur - DIM_MES_JOURS_PDF.droite;
  ctx.save();
  ctx.translate(op.x * k, op.y * k);
  ctx.scale(echelle, echelle);
  // En tête : le nom des colonnes, sur un filet.
  ctx.strokeStyle = COULEURS.filet; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(geo.filet.x1, geo.filet.y); ctx.lineTo(geo.filet.x2, geo.filet.y); ctx.stroke();
  ctx.fillStyle = COULEURS.secondaire; ctx.font = `600 10px ${POLICE}`; ctx.textAlign = 'center';
  for (const e of geo.etiquettes) ctx.fillText(e.texte, e.x, e.y);
  // Les étiquettes des rangées, à gauche.
  ctx.textAlign = 'start'; ctx.textBaseline = 'middle';
  ctx.fillStyle = COULEURS.texte; ctx.font = `11px ${POLICE}`;
  for (const r of geo.libelles) for (const l of r.lignes) ctx.fillText(l.texte, 0, l.y);
  ctx.textBaseline = 'alphabetic';
  // Repères de traitement (v6) : un trait fin sous les données, son numéro en haut.
  ctx.strokeStyle = COULEURS.trait; ctx.lineWidth = 0.8;
  for (const r of geo.reperes) { ctx.beginPath(); ctx.moveTo(r.x, r.y1); ctx.lineTo(r.x, r.y2); ctx.stroke(); }
  ctx.fillStyle = COULEURS.texte; ctx.font = `600 ${TAILLE_REPERE}px ${POLICE}`; ctx.textAlign = 'center';
  for (const r of geo.reperes) ctx.fillText(r.etiquette, r.texteX, r.texteY);
  ctx.textAlign = 'start';
  // Émotions : une barre par colonne, empilée par famille, chacune à sa couleur et à son motif.
  for (const b of geo.barres) caseEmotion(ctx, b.famille, b.x, b.y, b.l, b.h, mm);
  // Humeur (notes) : le haut (10) et le bas (1) de la rangée, un filet à chacun ; le point d'une moyenne, un anneau s'il
  // est fait de peu de valeurs.
  if (geo.notes.graduations.length) {
    ctx.strokeStyle = COULEURS.filet; ctx.lineWidth = 1;
    ctx.fillStyle = COULEURS.secondaire; ctx.font = `9px ${POLICE}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (const g of geo.notes.graduations) {
      ctx.beginPath(); ctx.moveTo(gauche, g.y); ctx.lineTo(droite, g.y); ctx.stroke();
      ctx.fillText(String(g.v), gauche - 4, g.y);
    }
    ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
  }
  ctx.strokeStyle = COULEURS.accent; ctx.lineWidth = 1.6;
  for (const t of geo.notes.traits) { ctx.beginPath(); ctx.moveTo(t.x, t.y1); ctx.lineTo(t.x, t.y2); ctx.stroke(); }
  for (const p of geo.notes.points) {
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    if (p.plein) { ctx.fillStyle = COULEURS.accent; ctx.fill(); } else { ctx.fillStyle = COULEURS.fond; ctx.fill(); ctx.stroke(); }
  }
  for (const n of geo.nuits) { ctx.fillStyle = COULEURS.sommeil[Number(n.classe.slice(-1)) - 1]; ctx.fillRect(n.x, n.y, n.l, n.h); }
  ctx.fillStyle = COULEURS.texte;
  for (const e of geo.encoches) ctx.fillRect(e.x, e.y, e.l, e.h);
  ctx.strokeStyle = COULEURS.secondaire; ctx.lineWidth = 1.2;
  for (const a of geo.autres) { ctx.beginPath(); ctx.arc(a.x, a.y, 3, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}

export function dessinerPage(canvas, { ops }) {
  canvas.width = TAILLE_PX.largeur;
  canvas.height = TAILLE_PX.hauteur;
  const ctx = canvas.getContext('2d');
  const k = TAILLE_PX.largeur / A4.largeur;
  ctx.fillStyle = COULEURS.fond;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textBaseline = 'alphabetic';
  for (const op of ops) {
    if (op.type === 'texte') {
      ctx.fillStyle = COULEURS[op.couleur] || COULEURS.texte;
      let taille = op.taille * PT * k;
      ctx.font = `${op.gras ? '600 ' : ''}${taille.toFixed(1)}px ${POLICE}`;
      if (op.maxLargeur) {
        const max = op.maxLargeur * k;
        while (ctx.measureText(op.texte).width > max && taille > op.taille * PT * k * 0.75) {
          taille *= 0.95;
          ctx.font = `${op.gras ? '600 ' : ''}${taille.toFixed(1)}px ${POLICE}`;
        }
      }
      ctx.fillText(op.texte, op.x * k, op.y * k);
    } else if (op.type === 'ligne') {
      ctx.strokeStyle = op.fin ? COULEURS.filet : COULEURS.trait;
      ctx.lineWidth = op.fin ? 1 : 2;
      ctx.beginPath(); ctx.moveTo(op.x1 * k, op.y1 * k); ctx.lineTo(op.x2 * k, op.y2 * k); ctx.stroke();
    } else if (op.type === 'frise') {
      dessinerFrise(ctx, op, k);
    } else if (op.type === 'emotion') {
      // Une case de la légende des émotions, à la couleur et au motif de sa famille.
      caseEmotion(ctx, op.famille, op.x * k, op.y * k, op.l * k, op.h * k, k);
    }
  }
  return canvas;
}
