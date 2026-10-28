import { test } from 'node:test';
import assert from 'node:assert/strict';
import { texteReleve, zonesDuJour, resumeEmotions } from '../../public/js/domain/releves.js';
import { carteLibelles } from '../../public/js/domain/libelles.js';

// v7 · Un relevé du moment en mots, pour Ma journée et Émotion du moment ; les zones du jour (v9 ; les familles en v7 et
// v8), pour le résumé sous le titre d'Aujourd'hui, l'Historique et Après coup (spec v9 §13.4). Données inventées.
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
  // v9 (spec §13.5) : le mot effacé, un relevé « vers » reste ; il a sa ligne dans Ma journée.
  assert.equal(texteReleve({ date: '2026-10-15', heure: '14:00', vers: true, emotion: null, energie: null, faisais: null }, carte), 'Aucun mot');
  assert.equal(texteReleve({ vers: true, faisais: ['activiteMoment:travail'] }, carte), 'ce que je faisais : travail');
  assert.equal(texteReleve({ vers: true, energie: 'energie:basse' }, carte), 'énergie basse');
});

// v9 · Tâche 3 : un point par zone présente, sans doublon, dans l'ordre rouge, jaune, bleu, vert (et non celui de la
// journée) ; rien pour un relevé sans zone (point de vigilance 1).
test('zonesDuJour : chaque zone une fois, dans l\'ordre rouge, jaune, bleu, vert ; rien pour un relevé sans zone', () => {
  const releves = [
    { date: '2026-10-15', heure: '18:00', emotion: 'roue:serenite:calme' }, // vert
    { date: '2026-10-15', heure: '09:10', emotion: 'roue:serenite' }, // famille seule (v7) : sans zone
    { date: '2026-10-15', heure: '10:20', humeur: 6, emotion: null }, // ancienne note
    { date: '2026-10-16', heure: '01:30', emotion: 'roue:peur:craintif' }, // rouge
    { date: '2026-10-15', heure: '12:00', emotion: 'roue:colere:irrite' }, // rouge, une seconde fois
    { date: '2026-10-15', heure: '14:00', energie: 'energie:basse' }, // énergie seule (v8)
    { date: '2026-10-15', heure: '15:00', emotion: 'roue:aucune:fatigue' }, // bleu, sans famille
  ];
  assert.deepEqual(zonesDuJour(releves), [
    { cle: 'rouge', libelle: 'Énergie haute · désagréable' }, { cle: 'bleu', libelle: 'Énergie basse · désagréable' },
    { cle: 'vert', libelle: 'Énergie basse · agréable' },
  ]);
  assert.deepEqual(zonesDuJour([{ emotion: 'roue:joie:fier' }, { emotion: 'roue:colere:enrage' }]).map((z) => z.cle), ['rouge', 'jaune']);
  // Accablé, bleu en v8, est rouge en v9.
  assert.deepEqual(zonesDuJour([{ emotion: 'roue:peur:accable' }]).map((z) => z.cle), ['rouge']);
  assert.deepEqual(zonesDuJour([{ date: '2026-10-15', heure: '10:20', humeur: 6 }, { emotion: 'roue:colere' }]), []);
  assert.deepEqual(zonesDuJour(null), []);
  assert.deepEqual(zonesDuJour([null, undefined, {}]), []);
});

test('zonesDuJour, texteReleve, resumeEmotions : un mot à soi prend la zone et le libellé de la méta motsPerso, sinon rien', () => {
  const id = 'roue:perso:u-0a1b2c3d';
  const perso = { [id]: { libelle: 'Flottant', zone: 'bleu', famille: null, definition: null, archive: false, createdAt: '2026-10-27T08:00:00.000Z' } };
  const releve = { date: '2026-10-15', heure: '10:00', emotion: id, energie: 'energie:basse' };
  assert.deepEqual(zonesDuJour([releve], perso).map((z) => z.cle), ['bleu']);
  assert.equal(texteReleve(releve, carte, perso), 'Flottant · énergie basse');
  assert.deepEqual(resumeEmotions([releve], 2, perso), { mots: ['flottant'], plus: false, zones: [{ cle: 'bleu', libelle: 'Énergie basse · désagréable' }] });
  // Mis de côté, il reste lisible et garde sa zone ; sans la méta, ni libellé ni zone.
  const deCote = { [id]: { ...perso[id], archive: true } };
  assert.deepEqual(zonesDuJour([releve], deCote).map((z) => z.cle), ['bleu']);
  assert.deepEqual(zonesDuJour([releve]), []);
  assert.equal(texteReleve(releve, carte), 'énergie basse');
  // Recréé à l'import sans zone (point de vigilance 4) : lisible, sans point.
  const sansZone = { [id]: { ...perso[id], libelle: 'Mot sans libellé', zone: null, archive: true } };
  assert.deepEqual(zonesDuJour([releve], sansZone), []);
  assert.equal(texteReleve(releve, carte, sansZone), 'Mot sans libellé · énergie basse');
});

test('resumeEmotions (Historique) : deux mots au plus, dans l\'ordre de la journée, chacun une fois, puis « … » ; les zones du jour', () => {
  const r = (heure, emotion, plus = {}) => ({ date: '2026-10-12', heure, emotion, ...plus });
  const jour = [r('18:00', 'roue:serenite:calme'), r('09:00', 'roue:colere:irrite'), r('12:00', 'roue:colere:irrite'), r('20:00', 'roue:joie'),
    { date: '2026-10-12', heure: '10:00', humeur: 6 }];
  // Une famille seule (Joie, v7) a son mot, mais pas de zone.
  assert.deepEqual(resumeEmotions(jour), {
    mots: ['irrité', 'calme'], plus: true,
    zones: [{ cle: 'rouge', libelle: 'Énergie haute · désagréable' }, { cle: 'vert', libelle: 'Énergie basse · agréable' }],
  });
  assert.deepEqual(resumeEmotions([r('09:00', 'roue:peur'), r('10:00', 'roue:peur:sans-valeur')]).mots, ['peur', 'sans valeur'], 'une famille seule, en minuscules');
  assert.equal(resumeEmotions([r('09:00', 'roue:peur'), r('10:00', 'roue:joie')]).plus, false);
  assert.deepEqual(resumeEmotions([{ date: '2026-10-12', heure: '10:00', humeur: 4 }]), { mots: [], plus: false, zones: [] }, 'un ancien jour : aucun mot');
  assert.deepEqual(resumeEmotions(undefined), { mots: [], plus: false, zones: [] });
});
