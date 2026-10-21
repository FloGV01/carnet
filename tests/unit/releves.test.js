import { test } from 'node:test';
import assert from 'node:assert/strict';
import { texteReleve, famillesDuJour } from '../../public/js/domain/releves.js';
import { carteLibelles } from '../../public/js/domain/libelles.js';

// v7 · Un relevé du moment en mots, pour Ma journée et Émotion du moment ; les familles du jour, pour le résumé sous le
// titre d'Aujourd'hui (spec §5). Données inventées.
const carte = carteLibelles([
  { id: 'energie:basse', libelle: 'Basse' }, { id: 'energie:moyenne', libelle: 'Moyenne' },
  { id: 'activiteMoment:travail', libelle: 'Travail' }, { id: 'activiteMoment:trajet', libelle: 'Trajet' },
]);

test('texteReleve : le mot ou la famille, puis l\'énergie ; un ancien relevé garde sa note', () => {
  assert.equal(texteReleve({ emotion: 'roue:colere:irrite', energie: 'energie:moyenne' }, carte), 'Irrité · énergie moyenne');
  assert.equal(texteReleve({ emotion: 'roue:colere', energie: null }, carte), 'Colère');
  assert.equal(texteReleve({ emotion: 'roue:peur:sans-valeur' }, carte), 'Sans valeur');
  assert.equal(texteReleve({ humeur: 6, energie: 'energie:moyenne' }, carte), 'humeur 6 · énergie moyenne');
  assert.equal(texteReleve({ emotion: null, humeur: 4, energie: null }, carte), 'humeur 4');
  assert.equal(texteReleve({ energie: 'energie:basse' }, carte), 'énergie basse');
  // Rien n'est caché : un relevé qui porterait les deux les montre tous les deux.
  assert.equal(texteReleve({ emotion: 'roue:serenite:calme', humeur: 7, energie: 'energie:basse' }, carte), 'Calme · humeur 7 · énergie basse');
});

test('texteReleve : sans émotion, note ni énergie, ce que je faisais ; un relevé vide n\'a pas de texte', () => {
  assert.equal(texteReleve({ faisais: ['activiteMoment:travail', 'activiteMoment:trajet'] }, carte), 'ce que je faisais : travail, trajet');
  assert.equal(texteReleve({ date: '2026-10-15', heure: '17:00' }, carte), '');
  assert.equal(texteReleve({ emotion: 'roue:inconnue', faisais: [] }, carte), '');
});

test('famillesDuJour : chaque famille une fois, dans l\'ordre de la journée, sans les relevés sans émotion', () => {
  const releves = [
    { date: '2026-10-15', heure: '18:00', emotion: 'roue:colere:irrite' },
    { date: '2026-10-15', heure: '09:10', emotion: 'roue:serenite' },
    { date: '2026-10-15', heure: '10:20', humeur: 6, emotion: null },
    { date: '2026-10-16', heure: '01:30', emotion: 'roue:peur:craintif' },
    { date: '2026-10-15', heure: '12:00', emotion: 'roue:serenite:calme' },
    { date: '2026-10-15', heure: '14:00', energie: 'energie:basse' },
  ];
  assert.deepEqual(famillesDuJour(releves), [
    { cle: 'serenite', libelle: 'Sérénité' }, { cle: 'colere', libelle: 'Colère' }, { cle: 'peur', libelle: 'Peur' },
  ]);
  assert.deepEqual(famillesDuJour([{ date: '2026-10-15', heure: '10:20', humeur: 6 }]), []);
  assert.deepEqual(famillesDuJour(null), []);
});
