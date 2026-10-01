// Dessine les opérations de la page A4 (mm) sur un canvas de 1654 × 2339 px (200 ppp).
// Toujours en thème clair : la page doit rester lisible imprimée en noir et blanc.
import { A4 } from '../../export/page-a4.js';
import { DIM, geometrieHumeur, geometrieExplosions, geometrieSommeil } from './geometrie.js';

export const TAILLE_PX = { largeur: 1654, hauteur: 2339 };
const PT = 0.3528;
const COULEURS = { texte: '#1F1D1A', secondaire: '#6B665E', filet: '#E4DFD8', trait: '#8C857B', accent: '#3B4A6B', fond: '#FFFFFF', sommeil: ['#A9B5CF', '#6D7FA6', '#3B4A6B'] };
const POLICE = '-apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif';

function dessinerGraphes(ctx, op, k) {
  const graphes = [
    (g) => {
      const geo = geometrieHumeur(op.semaines);
      g.strokeStyle = COULEURS.filet; g.lineWidth = 1;
      for (const f of geo.filets) { g.beginPath(); g.moveTo(DIM.gauche, f.y); g.lineTo(DIM.largeur - DIM.droite, f.y); g.stroke(); }
      g.fillStyle = COULEURS.secondaire; g.font = `9px ${POLICE}`;
      for (const t of geo.graduations) g.fillText(String(t.v), 4, t.y + 3);
      g.strokeStyle = COULEURS.accent; g.lineWidth = 2;
      for (const s of geo.segments) { g.beginPath(); g.moveTo(s.x1, s.y1); g.lineTo(s.x2, s.y2); g.stroke(); }
      for (const p of geo.points) {
        g.beginPath(); g.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        if (p.plein) { g.fillStyle = COULEURS.accent; g.fill(); } else { g.fillStyle = COULEURS.fond; g.fill(); g.stroke(); }
      }
    },
    (g) => {
      const geo = geometrieExplosions(op.semaines);
      g.strokeStyle = COULEURS.filet; g.lineWidth = 1;
      g.beginPath(); g.moveTo(DIM.gauche, geo.base); g.lineTo(DIM.largeur - DIM.droite, geo.base); g.stroke();
      g.fillStyle = COULEURS.accent;
      for (const b of geo.barres) g.fillRect(b.x, b.y, b.l, b.h);
    },
    (g) => {
      const geo = geometrieSommeil(op.semaines);
      for (const p of geo.piles) for (const m of p.morceaux) { g.fillStyle = COULEURS.sommeil[Number(m.classe.slice(-1)) - 1]; g.fillRect(p.x, m.y, p.l, m.h); }
    },
  ];
  graphes.forEach((dessin, i) => {
    const x = (op.x + i * (op.largeur + op.ecart)) * k;
    const y = op.y * k;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale((op.largeur * k) / DIM.largeur, (op.hauteur * k) / DIM.hauteur);
    dessin(ctx);
    ctx.restore();
  });
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
    } else if (op.type === 'graphes') {
      dessinerGraphes(ctx, op, k);
    }
  }
  return canvas;
}
