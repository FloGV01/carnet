// Dessine les opérations de la page A4 (mm) sur un canvas de 1654 × 2339 px (200 ppp).
// Toujours en thème clair : la page doit rester lisible imprimée en noir et blanc.
import { A4 } from '../../export/page-a4.js';
import { DIM_FRISE, TAILLE_REPERE, geometrieFrise } from './geometrie.js';

export const TAILLE_PX = { largeur: 1654, hauteur: 2339 };
const PT = 0.3528;
const COULEURS = { texte: '#1F1D1A', secondaire: '#6B665E', filet: '#E4DFD8', trait: '#8C857B', accent: '#3B4A6B', fond: '#FFFFFF', sommeil: ['#A9B5CF', '#6D7FA6', '#3B4A6B'] };
const POLICE = '-apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif';

// Frise « Mes jours » (semaines ou mois) : même géométrie qu'à l'écran, mise à l'échelle du cadre.
// Échelle uniforme : la géométrie est calculée sur une largeur qui suit le rapport du cadre
// (sinon points et textes seraient écrasés). La bande des repères de traitement (v6) ajoute de la
// hauteur : un second calcul en tient compte, et l'échelle ne dépasse jamais le cadre.
function dessinerFrise(ctx, op, k) {
  const cadre = (hauteur) => ({ ...DIM_FRISE, largeur: (hauteur * op.largeur) / op.hauteur });
  let geo = geometrieFrise(op.frise, cadre(DIM_FRISE.hauteur));
  if (geo.dim.hauteur !== DIM_FRISE.hauteur) geo = geometrieFrise(op.frise, cadre(geo.dim.hauteur));
  const d = geo.dim;
  const echelle = Math.min((op.hauteur * k) / d.hauteur, (op.largeur * k) / d.largeur);
  ctx.save();
  ctx.translate(op.x * k, op.y * k);
  ctx.scale(echelle, echelle);
  ctx.strokeStyle = COULEURS.filet; ctx.lineWidth = 1;
  for (const f of geo.filets) { ctx.beginPath(); ctx.moveTo(d.gauche, f.y); ctx.lineTo(d.largeur - d.droite, f.y); ctx.stroke(); }
  // Repères de traitement (v6) : un trait fin sous les données, son numéro en haut.
  ctx.strokeStyle = COULEURS.trait; ctx.lineWidth = 0.8;
  for (const r of geo.reperes) { ctx.beginPath(); ctx.moveTo(r.x, r.y1); ctx.lineTo(r.x, r.y2); ctx.stroke(); }
  ctx.fillStyle = COULEURS.texte; ctx.font = `600 ${TAILLE_REPERE}px ${POLICE}`; ctx.textAlign = 'center';
  for (const r of geo.reperes) ctx.fillText(r.etiquette, r.texteX, r.texteY);
  ctx.textAlign = 'start';
  ctx.fillStyle = COULEURS.secondaire; ctx.font = `8px ${POLICE}`;
  for (const t of geo.graduations) ctx.fillText(String(t.v), 4, t.y + 3);
  ctx.strokeStyle = COULEURS.accent; ctx.lineWidth = 1.6;
  for (const s of geo.moyenne) { ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke(); }
  for (const p of geo.points) {
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    if (p.plein) { ctx.fillStyle = COULEURS.accent; ctx.fill(); } else { ctx.fillStyle = COULEURS.fond; ctx.fill(); ctx.stroke(); }
  }
  for (const n of geo.nuits) { ctx.fillStyle = COULEURS.sommeil[Number(n.classe.slice(-1)) - 1]; ctx.fillRect(n.x, n.y, n.l, n.h); }
  ctx.fillStyle = COULEURS.texte;
  for (const e of geo.encoches) ctx.fillRect(e.x, e.y, e.l, e.h);
  ctx.strokeStyle = COULEURS.secondaire; ctx.lineWidth = 1.2;
  for (const a of geo.autres) { ctx.beginPath(); ctx.arc(a.x, a.y, 2.2, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = COULEURS.secondaire; ctx.textAlign = 'center';
  for (const e of geo.etiquettes) ctx.fillText(e.texte, e.x, d.axeY);
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
    }
  }
  return canvas;
}
