import { test } from 'node:test';
import assert from 'node:assert/strict';
import { frise, pasFrise } from '../../public/js/analyse/frise.js';
import { tendances, ecartTendance } from '../../public/js/analyse/tendances.js';
import { tesMoments } from '../../public/js/analyse/avant-explosions.js';
import { indicateurs } from '../../public/js/analyse/fenetres.js';
import { profilJournee } from '../../public/js/analyse/moments.js';
import { analyze } from '../../public/js/analyse/index.js';
import { addDays } from '../../public/js/domain/dates.js';
import { SEED_V1, SEED_V2_AJOUTS, seedItems } from '../../public/js/domain/vocabulaire.js';

const items = [...seedItems(SEED_V1, 'x'), ...seedItems(SEED_V2_AJOUTS, 'x')];

test('frise : une colonne par jour jusqu\'à 31 jours, par semaine jusqu\'à 26 semaines, par mois au-delà', () => {
  assert.equal(pasFrise('2026-10-01', '2026-10-31'), 'jour');
  assert.equal(pasFrise('2026-07-09', '2026-10-06'), 'semaine');
  assert.equal(pasFrise('2025-10-06', '2026-10-06'), 'mois');
  const journal = [
    { date: '2026-10-01', humeur: 5, sommeilRessenti: 'sommeil:mal', explosions: 1 },
    { date: '2026-10-02', humeur: 6 }, { date: '2026-10-03', humeur: 7 }, { date: '2026-10-05', humeur: 8, explosions: 0 },
  ];
  const episodes = [{ id: 'a', date: '2026-10-03', heure: '01:00', reaction: 'reaction:retrait_isolement' }];
  const f = frise({ journal, episodes }, '2026-09-30', '2026-10-06');
  assert.equal(f.pas, 'jour');
  assert.equal(f.colonnes.length, 7);
  const c = Object.fromEntries(f.colonnes.map((x) => [x.cle, x]));
  assert.equal(c['2026-09-30'].aDonnee, false, 'jour vide : colonne vide, sans zéro');
  assert.equal(c['2026-10-02'].autres, 1, 'épisode de 01:00 le 3 : rattaché au 2');
  assert.equal(c['2026-10-05'].aDonnee, true);
  assert.equal(c['2026-10-04'].moyenne7, null, 'moyenne des 7 jours : au moins 4 valeurs, ici 3');
  assert.equal(c['2026-10-05'].moyenne7, 6.5);
  assert.equal(c['2026-10-04'].aDonnee, false);
});

test('frise par semaine et par mois : moyennes, nuits, explosions connues seulement', () => {
  const journal = [];
  for (let i = 0; i < 70; i++) journal.push({ date: addDays('2026-07-01', i), humeur: 5 + (i % 3), sommeilRessenti: i % 2 ? 'sommeil:bien' : 'sommeil:mal', explosions: i % 10 === 0 ? 1 : 0 });
  const s = frise({ journal, episodes: [] }, '2026-07-01', '2026-09-28');
  assert.equal(s.pas, 'semaine');
  assert.ok(s.colonnes.every((c) => c.cle === addDays('2026-06-29', 7 * s.colonnes.indexOf(c))));
  const m = frise({ journal, episodes: [] }, '2025-09-01', '2026-09-30');
  assert.equal(m.pas, 'mois');
  const juillet = m.colonnes.find((c) => c.cle === '2026-07');
  assert.equal(juillet.nHumeur, 31);
  assert.equal(juillet.fragile, false);
  assert.equal(juillet.explosions, 4);
  assert.equal(m.colonnes.find((c) => c.cle === '2026-01').humeur, null, 'mois sans donnée : rien');
});

function serie(jours, f) {
  const res = [];
  for (let i = 0; i < jours; i++) { const h = f(i); if (h != null) res.push({ date: addDays('2025-01-01', i), humeur: h }); }
  return res;
}

test('tendances : rien avant 12 semaines, écart net dans les deux sens, jamais sur une fluctuation', () => {
  const court = serie(60, () => 6);
  assert.equal(tendances(court, court[court.length - 1].date).statut, 'insuffisant');
  // Humeur qui alterne autour de 6 sur 400 jours, puis 4 semaines à 3 : écart net vers le bas.
  const bas = serie(400, (i) => (i >= 372 ? 3 + (i % 2) : 5 + (i % 3)));
  const r = tendances(bas, addDays('2025-01-01', 399));
  assert.equal(r.statut, 'ok');
  assert.equal(r.constat.sens, 'bas');
  assert.ok(r.constat.moyB > r.constat.moyR);
  const haut = serie(400, (i) => (i >= 372 ? 9 + (i % 2) : 5 + (i % 3)));
  assert.equal(tendances(haut, addDays('2025-01-01', 399)).constat.sens, 'haut');
  const plat = serie(400, (i) => 5 + (i % 3));
  const p = tendances(plat, addDays('2025-01-01', 399));
  assert.equal(p.statut, 'ok');
  assert.equal(p.constat, null);
  // 4 dernières semaines presque vides : on ne compare rien et on ne dit rien (statut muet).
  const rare = serie(400, (i) => (i >= 372 ? (i % 6 === 0 ? 2 : null) : 5 + (i % 3)));
  assert.equal(ecartTendance(new Map(rare.map((j) => [j.date, j.humeur])), addDays('2025-01-01', 399)).calculable, false);
  assert.deepEqual(tendances(rare, addDays('2025-01-01', 399)), { statut: 'muet', constat: null });
});

test('tendances : une phrase déjà affichée reste tant que l\'écart tient (pas de clignotement)', () => {
  const bas = serie(400, (i) => (i >= 372 ? 3 + (i % 2) : 5 + (i % 3)));
  const J = addDays('2025-01-01', 399);
  const r = tendances(bas, J);
  assert.ok(r.constat);
  assert.ok(tendances(bas, J, new Set([r.constat.cle])).constat);
});

test('humeur du jour : un jour qui n\'a que des relevés entre dans Tendances et dans la frise', () => {
  // 372 soirs autour de 6, puis 28 jours sans soir, avec deux relevés (3 et 4) : 3,5 par jour.
  const journal = serie(372, (i) => 5 + (i % 3));
  const humeurs = [];
  for (let i = 372; i < 400; i++) {
    const date = addDays('2025-01-01', i);
    humeurs.push({ id: `${date}a`, date, heure: '10:00', humeur: 3 }, { id: `${date}b`, date, heure: '19:00', humeur: 4 });
  }
  const J = addDays('2025-01-01', 399);
  const a = analyze({ journal, humeurs, episodes: [], symptomes: [], traitements: [] }, { aujourdhui: J, items, zeroDepuis: '2025-01-01' });
  assert.equal(a.tendances.constat.sens, 'bas');
  assert.equal(a.tendances.constat.moyR, 3.5);
  const c = a.frise['30'].colonnes;
  const dernier = c[c.length - 1];
  assert.deepEqual([dernier.humeur, dernier.humeurMin, dernier.humeurMax, dernier.explosions, dernier.aDonnee], [3.5, 3, 4, null, true]);
  assert.equal(dernier.moyenne7, 3.5);
  // Un soir (une seule valeur) : pas de trait du plus bas au plus haut.
  assert.deepEqual([c[0].cle, c[0].humeur, c[0].humeurMin, c[0].humeurMax], [addDays('2025-01-01', 370), 6, null, null]);
});

test('tes moments : groupes Explosions et par type d\'Après coup, citations datées, rien de rassemblé sur les pensées', () => {
  const ep = (date, extra) => ({ id: date, date, heure: '18:00', ...extra });
  const ac = (types, extra = {}) => ({ types, tropDe: ['sourceSurcharge:bruit'], besoins: ['besoin:calme'], pensees: 'secret', ...extra });
  const episodes = [
    ep('2026-10-01', { reaction: 'reaction:retrait_isolement', apresCoup: ac(['typeExplosion:surcharge']) }),
    ep('2026-10-02', { reaction: 'reaction:retrait_isolement', apresCoup: ac(['typeExplosion:surcharge']), ceQuiAAide: 'casque' }),
    ep('2026-10-03', { reaction: 'reaction:explosion', apresCoup: ac(['typeExplosion:surcharge', 'typeExplosion:colere']) }),
    ep('2026-10-04', { reaction: 'reaction:explosion' }),
  ];
  const r = tesMoments(episodes, '2026-10-01', '2026-10-05', items);
  assert.equal(r.groupes[0].cle, 'explosions');
  assert.equal(r.groupes[0].statut, 'insuffisant', '2 explosions seulement');
  const surcharge = r.groupes.find((g) => g.cle === 'typeExplosion:surcharge');
  assert.equal(surcharge.n, 3);
  assert.deepEqual(surcharge.tropDe, { n: 3, elements: [{ id: 'sourceSurcharge:bruit', n: 3 }] });
  assert.deepEqual(surcharge.aide, [{ texte: 'casque', date: '02/10' }]);
  assert.equal(r.groupes.find((g) => g.cle === 'typeExplosion:colere'), undefined, 'moins de 3 : absent, sans message');
  assert.ok(!JSON.stringify(r).includes('secret'), 'les pensées ne sont jamais rassemblées');
});

test('détails en jours : paires (avec qui, effet) et (activité, durée)', () => {
  const journal = [
    { date: '2026-10-01', contacts: [{ avec: ['contactAvec:famille', 'contactAvec:amis'], effet: 'contactEffet:ressourcant' }, { avec: ['contactAvec:famille'], effet: 'contactEffet:ressourcant' }],
      activites: [{ type: 'typeSport:marche', duree: 'dureeSport:de_15_a_30' }, { type: 'typeSport:marche', duree: null }] },
    { date: '2026-10-02', contacts: [{ avec: null, effet: 'contactEffet:couteux' }] },
  ];
  const f = indicateurs({ journal, episodes: [], symptomes: [] }, '2026-10-01', '2026-10-02');
  // « Famille, Amis · Ressourçant » : l'effet n'est jamais recopié sur chacun (rangée « À plusieurs ») ;
  // la seconde ligne « Famille · Ressourçant » le porte, elle, pour la famille.
  assert.deepEqual(f.contactDetail.paires.par, {
    'contactAvec:famille': { aucun: 1, 'contactEffet:ressourcant': 1 }, 'contactAvec:amis': { aucun: 1 },
    plusieurs: { 'contactEffet:ressourcant': 1 }, sans: { 'contactEffet:couteux': 1 },
  });
  assert.equal(f.contactDetail.paires.jours['contactAvec:famille'], 1, 'longueur de barre : jours distincts, pas une somme de paires');
  assert.deepEqual(f.sportDetail.paires.par, { 'typeSport:marche': { 'dureeSport:de_15_a_30': 1, aucun: 1 } });
  assert.equal(f.sportDetail.paires.jours['typeSport:marche'], 1);
});

test('ta journée : énergie en jours, anneau sous 5 jours', () => {
  const h = (date, heure, humeur, energie) => ({ id: `${date}${heure}`, date, heure, humeur, energie });
  const humeurs = ['2026-10-01', '2026-10-02', '2026-10-03'].flatMap((d) => [h(d, '10:00', 5, 'energie:basse'), h(d, '11:00', 6, 'energie:basse')]);
  const p = profilJournee(humeurs, '2026-10-01', '2026-10-03');
  assert.equal(p.creneaux[0].energie['energie:basse'], 3, '6 relevés, 3 jours');
  assert.equal(p.creneaux[0].fragile, true);
});
