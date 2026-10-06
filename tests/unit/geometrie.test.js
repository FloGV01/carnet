import { test } from 'node:test';
import assert from 'node:assert/strict';
import { geometrieFrise, geometrieJournee, DIM_FRISE, CRENEAUX } from '../../public/js/ui/graphes/geometrie.js';

const jour = (cle, extra = {}) => ({ cle, humeur: null, moyenne7: null, nuit: null, explosions: null, autres: 0, aDonnee: false, ...extra });

test('frise par jour : y(10) au bord haut, colonne vide sans rien, trait de moyenne seulement entre jours voisins', () => {
  const colonnes = [
    jour('2026-10-01', { humeur: 10, moyenne7: 6, nuit: 'sommeil:mal', explosions: 2, aDonnee: true }),
    jour('2026-10-02'),
    jour('2026-10-03', { humeur: 1, moyenne7: 5, explosions: 0, autres: 1, aDonnee: true }),
    jour('2026-10-04', { humeur: 4, moyenne7: 5.5, aDonnee: true }),
  ];
  const g = geometrieFrise({ pas: 'jour', colonnes });
  assert.equal(g.points[0].y, DIM_FRISE.haut);
  assert.equal(g.points[1].y, DIM_FRISE.basHumeur);
  assert.equal(g.moyenne.length, 1, 'seulement entre le 3 et le 4');
  assert.equal(g.encoches.length, 1, 'zéro explosion ne dessine rien');
  assert.equal(g.nuits.length, 1);
  assert.equal(g.autres.length, 1);
  assert.deepEqual(g.zones.map((z) => z.cle), ['2026-10-01', '2026-10-03', '2026-10-04'], 'rien à toucher sur un jour vide');
  assert.ok(!JSON.stringify(g).includes('NaN'));
});

test('frise par semaine : nuits empilées, anneau si fragile, explosions à l\'échelle', () => {
  const colonnes = [
    { cle: '2026-09-21', humeur: 5, fragile: true, nuits: { mal: 1, moyen: 0, bien: 2 }, explosions: 3, autres: 0, aDonnee: true },
    { cle: '2026-09-28', humeur: 6, fragile: false, nuits: null, explosions: 1, autres: 2, aDonnee: true },
  ];
  const g = geometrieFrise({ pas: 'semaine', colonnes });
  assert.equal(g.points[0].plein, false);
  assert.equal(g.nuits.length, 2);
  assert.ok(g.encoches[0].h > g.encoches[1].h);
  assert.equal(g.moyenne.length, 1);
});

test('ta journée : 12 créneaux de 4 h à 4 h, points sans segments, énergie empilée', () => {
  assert.deepEqual(CRENEAUX.slice(0, 2), [4, 6]);
  assert.equal(CRENEAUX[CRENEAUX.length - 1], 2);
  const g = geometrieJournee([{ debut: 10, fin: 12, moyenne: 6, fragile: false, energie: { 'energie:basse': 2, 'energie:moyenne': 1, 'energie:haute': 0 } }, { debut: 0, fin: 2, moyenne: null, energie: { 'energie:basse': 1 } }]);
  assert.equal(g.points.length, 1, 'créneau sans humeur : pas de point');
  assert.equal(g.energies.length, 3);
  assert.ok(g.zones[1].x > g.zones[0].x, 'minuit après la soirée');
  assert.ok(!('segments' in g));
});
