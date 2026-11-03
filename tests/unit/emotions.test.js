// v7 · Émotions du moment (analyse/emotions.js) : chaque fonction sur des jeux inventés, avec la bascule de 4 h, un
// relevé « vers », une famille sans mot, et l'invariance Paris / UTC. Données inventées, aucune donnée réelle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLES_FAMILLES, comptesVides, nombreDeReleves, relevesAEmotion, parFamille, emotionsParJour, famillesParJour, famillesParHeure,
  famillesParColonnes, apresNuit, autourDe, autourDuBienEtre, emotionsParActivite, relevesAvecActivite, selonSeuilEmotions,
  zonesVides, nombreParZone, texteZones, parZone, dernieresSemaines, zonesParSemaine,
} from '../../public/js/analyse/emotions.js';
import { SEUILS } from '../../public/js/analyse/seuils.js';
import { analyze } from '../../public/js/analyse/index.js';
import { frise } from '../../public/js/analyse/frise.js';
import { facteursParJour } from '../../public/js/analyse/comprendre.js';
import { SEED_V1, seedItems } from '../../public/js/domain/vocabulaire.js';

const releve = (date, heure, emotion, plus = {}) => ({ id: `${date}-${heure}-${emotion}`, date, heure, emotion, humeur: null, energie: null, vers: null, faisais: null, ...plus });
const compte = (o) => ({ ...comptesVides(), ...o });

test('les familles dans l\'ordre de la roue ; un compte vide les a toutes à zéro ; le seuil est de 5 relevés', () => {
  assert.deepEqual(CLES_FAMILLES, ['colere', 'degout', 'tristesse', 'joie', 'surprise', 'peur', 'serenite']);
  assert.deepEqual(Object.keys(comptesVides()), CLES_FAMILLES);
  assert.ok(Object.values(comptesVides()).every((n) => n === 0));
  assert.equal(nombreDeReleves(compte({ colere: 2, joie: 3 })), 5);
  assert.equal(nombreDeReleves(null), 0);
  assert.deepEqual(SEUILS.emotions, { minReleves: 5, heuresAutour: 3, zonesSemaines: 12 });
});

test('relevesAEmotion : jour logique (bascule à 4 h), famille et mot, famille seule, « vers », sans les anciennes notes', () => {
  const humeurs = [
    releve('2026-10-12', '18:00', 'roue:serenite:calme'),
    releve('2026-10-12', '09:00', 'roue:colere:irrite', { energie: 'energie:moyenne' }),
    releve('2026-10-13', '01:30', 'roue:peur'), // famille seule, jour logique : le 12
    releve('2026-10-13', '04:00', 'roue:joie:amuse'), // 04:00 pile : déjà le 13
    releve('2026-10-13', '14:00', 'roue:tristesse:vide', { vers: true }),
    { id: 'n', date: '2026-10-13', heure: '10:00', humeur: 6, emotion: null }, // ancienne note : pas d'émotion
    { id: 'e', date: '2026-10-13', heure: '11:00', energie: 'energie:basse' }, // énergie seule
    releve('2026-10-13', '12:00', 'roue:inconnue'), // identifiant inconnu : ignoré
  ];
  assert.deepEqual(relevesAEmotion(humeurs), [
    { date: '2026-10-12', heure: '09:00', famille: 'colere', mot: 'roue:colere:irrite', emotion: 'roue:colere:irrite', vers: false },
    { date: '2026-10-12', heure: '18:00', famille: 'serenite', mot: 'roue:serenite:calme', emotion: 'roue:serenite:calme', vers: false },
    { date: '2026-10-12', heure: '01:30', famille: 'peur', mot: null, emotion: 'roue:peur', vers: false },
    { date: '2026-10-13', heure: '04:00', famille: 'joie', mot: 'roue:joie:amuse', emotion: 'roue:joie:amuse', vers: false },
    { date: '2026-10-13', heure: '14:00', famille: 'tristesse', mot: 'roue:tristesse:vide', emotion: 'roue:tristesse:vide', vers: true },
  ]);
  assert.deepEqual(relevesAEmotion(null), []);
});

test('parFamille : le nombre de relevés de chaque famille, une famille seule comprise, sans total ni score', () => {
  const r = relevesAEmotion([releve('2026-10-12', '09:00', 'roue:colere:irrite'), releve('2026-10-12', '10:00', 'roue:colere'), releve('2026-10-12', '11:00', 'roue:joie')]);
  assert.deepEqual(parFamille(r), compte({ colere: 2, joie: 1 }));
  assert.deepEqual(Object.keys(parFamille(r)), CLES_FAMILLES, 'toutes les familles, dans leur ordre');
  assert.deepEqual(parFamille([]), comptesVides());
});

test('emotionsParJour et famillesParJour : par jour logique de la période, dans l\'ordre des heures, une par relevé', () => {
  const humeurs = [
    releve('2026-10-11', '23:00', 'roue:degout:juge'),
    releve('2026-10-12', '03:59', 'roue:colere'), // le 11
    releve('2026-10-12', '20:00', 'roue:serenite:pose'), releve('2026-10-12', '08:00', 'roue:serenite:pose'),
    releve('2026-10-19', '02:00', 'roue:joie', { vers: true }), // « vers 2 h » : le 18
    releve('2026-10-19', '10:00', 'roue:peur'), // hors période
  ];
  const ids = emotionsParJour(humeurs, '2026-10-11', '2026-10-18');
  assert.deepEqual([...ids], [
    ['2026-10-11', ['roue:degout:juge', 'roue:colere']],
    ['2026-10-12', ['roue:serenite:pose', 'roue:serenite:pose']],
    ['2026-10-18', ['roue:joie']],
  ]);
  assert.deepEqual([...famillesParJour(humeurs, '2026-10-11', '2026-10-18')], [
    ['2026-10-11', ['degout', 'colere']], ['2026-10-12', ['serenite', 'serenite']], ['2026-10-18', ['joie']],
  ]);
  assert.equal(famillesParJour(humeurs, '2026-10-12', '2026-10-12').has('2026-10-11'), false, 'bornes de la période');
});

test('famillesParHeure : 24 heures, une famille par relevé à son heure ; ni « vers », ni relevé sans heure', () => {
  const r = relevesAEmotion([
    releve('2026-10-12', '09:15', 'roue:colere:irrite'), releve('2026-10-13', '09:45', 'roue:colere'), releve('2026-10-13', '01:30', 'roue:peur'),
    releve('2026-10-13', '14:00', 'roue:joie', { vers: true }), releve('2026-10-13', null, 'roue:joie'),
  ]);
  const h = famillesParHeure(r);
  assert.deepEqual(Object.keys(h).map(Number), Array.from({ length: 24 }, (_, i) => i));
  assert.deepEqual(h[9], compte({ colere: 2 }));
  assert.deepEqual(h[1], compte({ peur: 1 }), 'un relevé d\'après minuit garde son heure');
  assert.deepEqual(h[14], comptesVides(), 'un relevé « vers » n\'a pas d\'heure précise');
  assert.equal(Object.values(h).reduce((s, c) => s + nombreDeReleves(c), 0), 3);
});

test('famillesParColonnes : jour de la semaine, mois, lieu ; jours à émotion seulement ; sous 5 relevés, aucune colonne', () => {
  const jours = [
    { date: '2026-10-12', lieu: 'lieu:bureau', familles: ['colere', 'colere'] }, // lundi
    { date: '2026-10-13', lieu: 'lieu:teletravail', familles: ['serenite'] }, // mardi
    { date: '2026-10-19', lieu: 'lieu:bureau', familles: ['joie'] }, // lundi
    { date: '2026-10-20', lieu: null, familles: ['peur'] }, // mardi, sans lieu
    { date: '2026-10-21', lieu: 'lieu:arret', familles: [] }, // aucune émotion : pas de colonne de lieu
    { date: '2026-09-30', lieu: 'lieu:bureau', familles: ['tristesse'] }, // hors période
  ];
  const periode = { du: '2026-10-01', au: '2026-10-21' };
  const semaine = famillesParColonnes(jours, periode, { cle: 'jourSemaine' });
  assert.equal(semaine.statut, 'ok');
  assert.deepEqual(semaine.colonnes.map((c) => [c.cle, c.n, c.jours]), [[0, 3, 2], [1, 2, 2], [2, 0, 0], [3, 0, 0], [4, 0, 0], [5, 0, 0], [6, 0, 0]]);
  assert.deepEqual(semaine.colonnes[0].familles, compte({ colere: 2, joie: 1 }));
  const mois = famillesParColonnes(new Map(jours.map((j) => [j.date, j])), periode, { cle: 'mois' });
  assert.deepEqual(mois.colonnes.map((c) => [c.cle, c.n]), [['2026-10', 5]], 'une Map de facteursParJour convient aussi');
  const items = [{ id: 'lieu:teletravail', ordre: 1 }, { id: 'lieu:bureau', ordre: 2 }];
  const lieu = famillesParColonnes(jours, periode, { cle: 'lieu' }, items);
  assert.equal(lieu.statut, 'insuffisant', 'un relevé sans lieu ne compte pas : 4 relevés');
  assert.deepEqual(lieu.colonnes, []);
  const plus = [...jours, { date: '2026-10-14', lieu: 'lieu:bureau', familles: ['surprise'] }];
  assert.deepEqual(famillesParColonnes(plus, periode, { cle: 'lieu' }, items).colonnes.map((c) => [c.cle, c.n]), [['lieu:teletravail', 1], ['lieu:bureau', 4]]);
});

test('famillesParColonnes par mois : les mois sans relevé à émotion (notes seulement, ou rien) n\'ont pas de ligne', () => {
  // Juillet et août n'ont que d'anciennes notes (aucune famille), septembre rien, octobre des émotions, novembre une.
  const jours = [
    { date: '2026-07-20', familles: [] }, { date: '2026-08-14', familles: [] },
    { date: '2026-10-05', familles: ['colere', 'joie'] }, { date: '2026-10-06', familles: ['serenite', 'peur'] },
    { date: '2026-11-02', familles: ['tristesse'] },
  ];
  const mois = famillesParColonnes(jours, { du: '2026-07-20', au: '2026-11-02' }, { cle: 'mois' });
  assert.equal(mois.statut, 'ok');
  assert.deepEqual(mois.colonnes.map((c) => [c.cle, c.n, c.jours]), [['2026-10', 4, 2], ['2026-11', 1, 1]]);
  // Les jours de la semaine gardent leurs sept colonnes, vides comprises.
  assert.equal(famillesParColonnes(jours, { du: '2026-07-20', au: '2026-11-02' }, { cle: 'jourSemaine' }).colonnes.length, 7);
});

test('apresNuit : la nuit notée le jour D et les émotions de D, bascule de 4 h comprise, sous 5 relevés insuffisant', () => {
  const journal = [
    { date: '2026-10-12', sommeilRessenti: 'sommeil:mal' }, { date: '2026-10-13', sommeilRessenti: 'sommeil:bien' },
    { date: '2026-10-14', sommeilRessenti: 'sommeil:mal' }, { date: '2026-10-15' }, { date: '2026-10-16', sommeilRessenti: 'sommeil:moyen' },
  ];
  const humeurs = [
    releve('2026-10-12', '10:00', 'roue:peur:accable'), releve('2026-10-13', '01:00', 'roue:tristesse'), // 01:00 le 13 : le 12
    releve('2026-10-13', '10:00', 'roue:joie:curieux'), releve('2026-10-13', '15:00', 'roue:serenite', { vers: true }),
    releve('2026-10-14', '10:00', 'roue:peur'),
    releve('2026-10-15', '10:00', 'roue:colere'), // nuit non notée : ne compte pas
    { id: 'n', date: '2026-10-16', heure: '10:00', humeur: 4 }, // ancienne note : ne compte pas
  ];
  const r = apresNuit(journal, humeurs, { du: '2026-10-12', au: '2026-10-16' });
  assert.equal(r.statut, 'ok');
  assert.deepEqual([r.mal, r.moyen, r.bien], [compte({ peur: 2, tristesse: 1 }), comptesVides(), compte({ joie: 1, serenite: 1 })]);
  assert.deepEqual(r.jours, { mal: 2, moyen: 0, bien: 1 });
  assert.equal(r.n, 5);
  assert.equal(apresNuit(journal, humeurs, { du: '2026-10-13', au: '2026-10-16' }).statut, 'insuffisant', '3 relevés');
});

test('autourDe : 3 heures avant, 3 heures après, en heures calendaires, un relevé une fois de chaque côté au plus', () => {
  const explosions = [{ date: '2026-10-12', heure: '23:00' }, { date: '2026-10-14', heure: '12:00' }, { date: '2026-10-15', heure: null }];
  const humeurs = [
    releve('2026-10-12', '20:00', 'roue:colere:furieux'), // 3 h avant : dedans
    releve('2026-10-12', '19:59', 'roue:colere'), // 3 h 01 avant : dehors
    releve('2026-10-13', '01:00', 'roue:tristesse:isole'), // 2 h après, le lendemain
    releve('2026-10-13', '02:00', 'roue:serenite', { vers: true }), // « vers 2 h » : 3 h après, dedans
    releve('2026-10-14', '12:00', 'roue:peur'), // à l'instant même : après
    releve('2026-10-14', '15:01', 'roue:joie'), // 3 h 01 après : dehors
    releve('2026-10-14', null, 'roue:degout'), // sans heure : pas placé
    { id: 'n', date: '2026-10-14', heure: '11:00', humeur: 3 }, // ancienne note
  ];
  const r = autourDe(explosions, humeurs);
  assert.deepEqual(r.avant, compte({ colere: 1 }));
  assert.deepEqual(r.apres, compte({ tristesse: 1, serenite: 1, peur: 1 }));
  assert.deepEqual([r.instants, r.n, r.statut], [2, 4, 'insuffisant']);
  // Deux instants rapprochés : le relevé entre les deux est après le premier et avant le second, compté une fois de chaque côté.
  const proches = autourDe([{ date: '2026-10-12', heure: '10:00' }, { date: '2026-10-12', heure: '11:00' }],
    [releve('2026-10-12', '10:30', 'roue:surprise'), releve('2026-10-12', '09:00', 'roue:surprise'), releve('2026-10-12', '09:30', 'roue:surprise'),
      releve('2026-10-12', '12:00', 'roue:surprise')]);
  assert.deepEqual([proches.avant.surprise, proches.apres.surprise, proches.n, proches.statut], [3, 2, 5, 'ok']);
  // Autre fenêtre.
  assert.deepEqual(autourDe([{ date: '2026-10-12', heure: '23:00' }], humeurs, { avantH: 4, apresH: 1 }).avant, compte({ colere: 2 }));
});

// v8 (Q26) : autourDe cherche l'instant voisin par dichotomie. Les comptes restent ceux de la recherche de tous les
// instants (la version d'avant, gardée ici comme référence), bornes comprises, sur des données tirées au hasard (semées).
test('autourDe, par dichotomie : les mêmes comptes que la recherche de tous les instants, bornes et instants confondus compris', async () => {
  const { generateur } = await import('../fixtures/generateur.js');
  const { diffDays, addDays } = await import('../../public/js/domain/dates.js');
  const { familleDe } = await import('../../public/js/domain/roue.js');
  const minutes = (date, heure) => diffDays('2000-01-01', date) * 1440 + Number(heure.slice(0, 2)) * 60 + Number(heure.slice(3, 5));
  const reference = (instants, humeurs, avantH = 3, apresH = 3) => {
    const temps = instants.map((i) => minutes(i.date, i.heure));
    const avant = comptesVides();
    const apres = comptesVides();
    for (const h of humeurs) {
      const m = minutes(h.date, h.heure);
      if (temps.some((t) => m >= t - avantH * 60 && m < t)) avant[familleDe(h.emotion)] += 1;
      if (temps.some((t) => m >= t && m <= t + apresH * 60)) apres[familleDe(h.emotion)] += 1;
    }
    return { avant, apres };
  };
  const alea = generateur(77);
  const heure = () => `${String(Math.floor(alea() * 24)).padStart(2, '0')}:${['00', '15', '30', '59'][Math.floor(alea() * 4)]}`;
  const mots = ['roue:colere:irrite', 'roue:peur', 'roue:joie:curieux', 'roue:serenite:calme', 'roue:tristesse:vide'];
  for (let essai = 0; essai < 20; essai++) {
    const jour = () => addDays('2026-09-01', Math.floor(alea() * 20));
    const instants = Array.from({ length: Math.floor(alea() * 12) }, () => ({ date: jour(), heure: heure() }));
    // Des relevés à 3 h pile avant et après, et à l'instant même : les bornes.
    const bornes = instants.flatMap((i) => [-180, -181, 0, 180, 181].map((d) => {
      const m = minutes(i.date, i.heure) + d;
      const j = Math.floor(m / 1440);
      const r = m - j * 1440;
      return releve(addDays('2000-01-01', j), `${String(Math.floor(r / 60)).padStart(2, '0')}:${String(r % 60).padStart(2, '0')}`, mots[(j + r) % 5]);
    }));
    const humeurs = [...bornes, ...Array.from({ length: 60 }, (_, k) => releve(jour(), heure(), mots[k % 5]))];
    for (const [a, p] of [[3, 3], [4, 1]]) {
      const r = autourDe(instants, humeurs, { avantH: a, apresH: p });
      assert.deepEqual({ avant: r.avant, apres: r.apres }, reference(instants, humeurs, a, p), `essai ${essai}, ${a} h et ${p} h`);
    }
  }
});

test('autourDe : la nuit du changement d\'heure se compte en heures d\'horloge, comme en UTC', () => {
  // Le 25 octobre 2026 à Paris, 3 h devient 2 h. De 01:00 à 03:30, il y a 2 h 30 sur l'horloge (3 h 30 écoulées) : dedans.
  const r = autourDe([{ date: '2026-10-25', heure: '01:00' }], [releve('2026-10-25', '03:30', 'roue:peur')]);
  assert.equal(r.apres.peur, 1);
});

test('frise : les émotions d\'un jour dans l\'ordre des heures, par semaine les comptes par famille ; avecHumeur dit s\'il y a des notes', () => {
  const humeurs = [
    releve('2026-10-12', '18:00', 'roue:serenite'), releve('2026-10-12', '09:00', 'roue:colere:irrite'), releve('2026-10-13', '02:00', 'roue:peur'),
  ];
  const f = frise({ journal: [], episodes: [], humeurs }, '2026-10-12', '2026-10-18');
  const lundi = f.colonnes.find((c) => c.cle === '2026-10-12');
  assert.deepEqual([lundi.emotions, lundi.aDonnee], [['roue:colere:irrite', 'roue:serenite', 'roue:peur'], true], 'le relevé de 02:00 le 13 est du 12');
  assert.deepEqual(f.colonnes.find((c) => c.cle === '2026-10-14').emotions, []);
  assert.equal(f.avecHumeur, false);
  const s = frise({ journal: [{ date: '2026-08-03', humeur: 6 }], episodes: [], humeurs }, '2026-07-20', '2026-10-18');
  assert.equal(s.pas, 'semaine');
  const semaine = s.colonnes.find((c) => c.cle === '2026-10-12');
  assert.deepEqual([semaine.familles, semaine.nEmotions, semaine.aDonnee], [compte({ colere: 1, peur: 1, serenite: 1 }), 3, true]);
  assert.equal(s.colonnes.find((c) => c.cle === '2026-08-03').familles, null);
  assert.equal(s.avecHumeur, true, 'une ancienne note sur la période');
});

test('autourDuBienEtre : seules les séances lancées depuis Bien-être, dont le jour logique est dans la période', () => {
  const seances = [
    { date: '2026-10-12', heure: '10:00', exercice: 'coherence', origine: 'bien-etre', dureeS: 300 },
    { date: '2026-10-12', heure: '16:00', exercice: 'coherence', origine: 'moment-difficile', dureeS: 300 }, // crise : ne compte pas
    { date: '2026-10-12', heure: '20:00', exercice: 'coherence', origine: 'ressourcer', dureeS: 120 }, // « Pour récupérer » : non plus
    { date: '2026-10-20', heure: '02:00', exercice: 'scan-corporel', origine: 'bien-etre', dureeS: 600 }, // jour logique du 19 : hors période
    { date: '2026-10-13', heure: null, exercice: 'epaules', origine: 'bien-etre', dureeS: 300 }, // sans heure : pas placée
  ];
  const humeurs = [
    releve('2026-10-12', '08:00', 'roue:peur:craintif'), releve('2026-10-12', '11:00', 'roue:serenite:calme'),
    releve('2026-10-12', '17:00', 'roue:colere'), releve('2026-10-12', '21:00', 'roue:tristesse'), releve('2026-10-20', '01:00', 'roue:joie'),
  ];
  const r = autourDuBienEtre(seances, humeurs, { du: '2026-10-01', au: '2026-10-18' });
  assert.deepEqual([r.avant, r.apres, r.instants, r.n], [compte({ peur: 1 }), compte({ serenite: 1 }), 1, 2]);
  assert.equal(r.statut, 'insuffisant');
  // La période qui contient le 19 : la séance de 2 h du 20 y entre.
  assert.equal(autourDuBienEtre(seances, humeurs, { du: '2026-10-19', au: '2026-10-21' }).avant.joie, 1);
  // v10 : une séance lancée depuis « Pour ce moment : » garde l'origine `bien-etre` et compte, comme la règle le dit (analyse/textes.js).
  const pourCeMoment = [{ date: '2026-10-12', heure: '09:00', exercice: 'soupir', origine: 'bien-etre', dureeS: 180 }];
  assert.equal(autourDuBienEtre(pourCeMoment, [releve('2026-10-12', '08:59', 'roue:peur:craintif')], { du: '2026-10-01', au: '2026-10-18' }).avant.peur, 1);
  assert.deepEqual(autourDuBienEtre([], humeurs, { du: '2026-10-01', au: '2026-10-31' }), autourDe([], humeurs));
  assert.equal(autourDuBienEtre(undefined, humeurs, { du: '2026-10-01', au: '2026-10-31' }).instants, 0);
});

test('frise, rangée Bien-être : un repère par jour qui a une séance (toutes origines, bascule à 4 h), par semaine sans nombre ; pas de rangée sans séance', () => {
  const seances = [
    { date: '2026-10-12', heure: '09:00', exercice: 'coherence', origine: 'bien-etre', dureeS: 300 },
    { date: '2026-10-12', heure: '18:00', exercice: 'epaules', origine: 'bien-etre', dureeS: 300 },
    { date: '2026-10-14', heure: '01:30', exercice: 'coherence', origine: 'moment-difficile', dureeS: 120 }, // du 13
  ];
  const f = frise({ journal: [], episodes: [], humeurs: [], seances }, '2026-10-12', '2026-10-18');
  assert.deepEqual(f.colonnes.filter((c) => c.bienEtre).map((c) => c.cle), ['2026-10-12', '2026-10-13']);
  assert.deepEqual(f.colonnes.filter((c) => c.aDonnee).map((c) => c.cle), ['2026-10-12', '2026-10-13'], 'un jour de séance seule se touche');
  assert.equal(f.colonnes[0].bienEtre, true, 'deux séances : un repère, pas un nombre');
  assert.equal(f.avecBienEtre, true);
  const s = frise({ journal: [], episodes: [], humeurs: [], seances }, '2026-07-20', '2026-10-18');
  assert.equal(s.pas, 'semaine');
  assert.deepEqual(s.colonnes.filter((c) => c.bienEtre).map((c) => c.cle), ['2026-10-12']);
  assert.equal(s.colonnes.find((c) => c.cle === '2026-10-12').bienEtre, true);
  // Sans séance (la Vue soignants n'en passe pas) : pas de rangée.
  assert.equal(frise({ journal: [], episodes: [], humeurs: [] }, '2026-10-12', '2026-10-18').avecBienEtre, false);
  assert.equal(frise({ journal: [], episodes: [], humeurs: [], seances }, '2026-09-01', '2026-09-30').avecBienEtre, false);
});

test('analyze : Mes jours reçoit les séances (rangée Bien-être sur les périodes qui en ont), sans rien en compter ailleurs', () => {
  const items = seedItems(SEED_V1, 'x');
  const seances = [{ id: 'se_1', date: '2026-10-01', heure: '10:00', exercice: 'coherence', origine: 'bien-etre', dureeS: 300 }];
  const a = analyze({ journal: [], humeurs: [], episodes: [], symptomes: [], traitements: [], seances }, { aujourdhui: '2026-10-18', items });
  assert.deepEqual([a.frise['7'].avecBienEtre, a.frise['30'].avecBienEtre], [false, true]);
  assert.equal(a.frise['30'].colonnes.find((c) => c.cle === '2026-10-01').bienEtre, true);
  assert.equal(analyze({ journal: [], humeurs: [], episodes: [], symptomes: [], traitements: [] }, { aujourdhui: '2026-10-18', items }).frise['30'].avecBienEtre, false);
  assert.ok(!JSON.stringify(a.fenetres).includes('seance'), 'aucun indicateur de séances');
  // « Tout » part de la première séance quand elle est la plus ancienne donnée (jour logique : 01:30 le 2 → le 1er).
  const b = analyze({ journal: [], humeurs: [releve('2026-10-12', '10:00', 'roue:joie')], episodes: [], symptomes: [], traitements: [],
    seances: [{ id: 'se_2', date: '2026-08-02', heure: '01:30', exercice: 'coherence', origine: 'ressourcer', dureeS: 120 }] }, { aujourdhui: '2026-10-18', items });
  assert.equal(b.premier, '2026-08-01');
  assert.equal(b.frise.tout.pas, 'semaine');
  assert.deepEqual(b.frise.tout.colonnes.filter((c) => c.bienEtre).map((c) => c.cle), ['2026-07-27']);
});

test('analyze : les émotions de chaque période (familles, heures, mots) et de Ma semaine ; une famille seule n\'est pas un mot', () => {
  const items = seedItems(SEED_V1, 'x');
  const humeurs = [
    ...['2026-10-12', '2026-10-13', '2026-10-14'].map((d) => releve(d, '10:00', 'roue:colere:irrite')),
    releve('2026-10-15', '10:00', 'roue:colere'), releve('2026-10-16', '10:00', 'roue:joie:amuse'), releve('2026-09-01', '10:00', 'roue:peur:craintif'),
  ];
  const a = analyze({ journal: [], humeurs, episodes: [], symptomes: [], traitements: [] }, { aujourdhui: '2026-10-18', items });
  assert.deepEqual(a.emotions['7'].parFamille, compte({ colere: 4, joie: 1 }));
  assert.equal(a.emotions['7'].n, 5);
  assert.deepEqual(a.emotions['7'].parHeure[10], compte({ colere: 4, joie: 1 }));
  assert.deepEqual([a.emotions['7'].mots.statut, a.emotions['7'].mots.top, a.emotions['7'].mots.nTop, a.emotions['7'].mots.total], ['ok', ['roue:colere:irrite'], 3, 4]);
  assert.deepEqual(a.emotions.tout.parFamille, compte({ colere: 4, joie: 1, peur: 1 }));
  assert.deepEqual(a.semaine.emotions, compte({ colere: 4, joie: 1 }));
  assert.deepEqual([a.semaine.du, a.semaine.au], ['2026-10-12', '2026-10-18']);
  assert.equal(a.premier, '2026-09-01', '« Tout » part du premier relevé à émotion');
});

test('invariance Paris / UTC : mêmes résultats quel que soit le fuseau du système', () => {
  const humeurs = [
    releve('2026-10-24', '23:30', 'roue:colere:irrite'), releve('2026-10-25', '01:30', 'roue:peur'), releve('2026-10-25', '03:30', 'roue:serenite'),
    releve('2026-10-25', '12:00', 'roue:joie', { vers: true }), releve('2026-10-26', '03:59', 'roue:tristesse'),
  ];
  const journal = [{ date: '2026-10-24', sommeilRessenti: 'sommeil:mal', lieu: 'lieu:bureau' }, { date: '2026-10-25', sommeilRessenti: 'sommeil:bien', lieu: 'lieu:teletravail' }];
  const periode = { du: '2026-10-20', au: '2026-10-31' };
  const calculer = () => JSON.stringify({
    releves: relevesAEmotion(humeurs), jours: [...famillesParJour(humeurs, periode.du, periode.au)], heures: famillesParHeure(relevesAEmotion(humeurs)),
    colonnes: famillesParColonnes(facteursParJour({ journal, humeurs, episodes: [] }), periode, { cle: 'jourSemaine' }),
    nuit: apresNuit(journal, humeurs, periode), autour: autourDe([{ date: '2026-10-25', heure: '00:30' }], humeurs),
  });
  const avant = process.env.TZ;
  try {
    process.env.TZ = 'Europe/Paris';
    const paris = calculer();
    process.env.TZ = 'UTC';
    assert.equal(calculer(), paris);
    process.env.TZ = 'Pacific/Kiritimati';
    assert.equal(calculer(), paris);
  } finally {
    if (avant === undefined) delete process.env.TZ; else process.env.TZ = avant;
  }
});

// ---------- v8 · Q18 : émotions selon ce que je faisais ----------

const TRAVAIL = 'activiteMoment:travail';
const TRAJET = 'activiteMoment:trajet';
const MONDE = 'activiteMoment:monde';

test('emotionsParActivite (v8) : par activité, les relevés de chaque famille ; un relevé de deux activités compte pour chacune', () => {
  const humeurs = [
    releve('2026-10-12', '09:00', 'roue:colere:irrite', { faisais: [TRAVAIL] }),
    releve('2026-10-12', '10:00', 'roue:colere', { faisais: [TRAVAIL, TRAJET] }), // une famille seule (v7) compte aussi
    releve('2026-10-12', '18:00', 'roue:serenite:calme', { faisais: [TRAJET, TRAJET], vers: true }), // « vers » compris, une fois
    releve('2026-10-13', '12:00', 'roue:joie:amuse', { faisais: [MONDE] }),
    releve('2026-10-13', '13:00', 'roue:joie:amuse', { faisais: [] }), // sans activité : nulle part
    releve('2026-10-13', '14:00', 'roue:joie:amuse'),
    { id: 'n', date: '2026-10-13', heure: '15:00', humeur: 6, emotion: null, faisais: [TRAVAIL] }, // ancienne note : pas d'émotion
    { id: 'e', date: '2026-10-13', heure: '16:00', energie: 'energie:basse', faisais: [TRAVAIL] }, // énergie seule
  ];
  const periode = { du: '2026-10-01', au: '2026-10-31' };
  const items = [{ id: MONDE, liste: 'activiteMoment', ordre: 10 }, { id: TRAVAIL, liste: 'activiteMoment', ordre: 20 }, { id: TRAJET, liste: 'activiteMoment', ordre: 30 }];
  const r = emotionsParActivite(humeurs, periode, items);
  assert.deepEqual(Object.keys(r), [MONDE, TRAVAIL, TRAJET], 'dans l\'ordre de la liste');
  assert.deepEqual(r, {
    [MONDE]: compte({ joie: 1 }),
    [TRAVAIL]: compte({ colere: 2 }),
    [TRAJET]: compte({ colere: 1, serenite: 1 }),
  });
  assert.ok(Object.values(r).every((c) => Object.keys(c).join() === CLES_FAMILLES.join()), 'toutes les familles, dans l\'ordre de la roue');
  // Sans liste : par identifiant. Le seuil compte les relevés, pas les activités : 4 relevés, pas 5.
  assert.deepEqual(Object.keys(emotionsParActivite(humeurs, periode)), [MONDE, TRAJET, TRAVAIL]);
  assert.equal(relevesAvecActivite(humeurs, periode).length, 4);
  assert.equal(selonSeuilEmotions(relevesAvecActivite(humeurs, periode).length), 'insuffisant');
  assert.deepEqual(emotionsParActivite([], periode), {});
});

test('emotionsParActivite (v8) : le jour logique fait foi (bascule de 4 h) ; seule la période compte', () => {
  const humeurs = [
    releve('2026-10-01', '03:59', 'roue:peur:craintif', { faisais: [TRAVAIL] }), // le 30/09 : avant la période
    releve('2026-10-01', '04:00', 'roue:peur:craintif', { faisais: [TRAVAIL] }),
    releve('2026-10-02', '01:00', 'roue:tristesse:vide', { faisais: [TRAVAIL], vers: true }), // encore le 01/10
    releve('2026-10-02', '04:00', 'roue:joie:amuse', { faisais: [TRAVAIL] }), // le 02/10 : après la période
  ];
  const periode = { du: '2026-10-01', au: '2026-10-01' };
  assert.deepEqual(emotionsParActivite(humeurs, periode), { [TRAVAIL]: compte({ peur: 1, tristesse: 1 }) });
  assert.deepEqual(relevesAvecActivite(humeurs, periode).map((x) => [x.date, x.famille, x.faisais]),
    [['2026-10-01', 'peur', [TRAVAIL]], ['2026-10-01', 'tristesse', [TRAVAIL]]]);
});

// ---------- v9 · les mots sans famille (spec §8 et §13.4) ----------

// Fatigué et Épuisé (roue:aucune:…, familleDe null) restent des relevés à émotion, mais n'entrent dans aucun compte par
// famille : ni clé « null », ni NaN, ni relevé compté en plus (relecture de la tâche 1). Fatigué et Fier le 02/09, Irrité
// le 15/09, Épuisé seul la semaine du 21/09.
test('v9 · un mot sans famille (Fatigué, Épuisé) : un relevé à émotion, compté dans aucune famille, sans clé « null » ni NaN', () => {
  const FATIGUE = 'roue:aucune:fatigue';
  const EPUISE = 'roue:aucune:epuise';
  const humeurs = [
    releve('2026-09-02', '10:00', FATIGUE, { faisais: [TRAVAIL], energie: 'energie:basse' }),
    releve('2026-09-02', '11:00', 'roue:joie:fier', { faisais: [TRAVAIL] }),
    releve('2026-09-15', '10:00', 'roue:colere:irrite'),
    releve('2026-09-22', '09:00', EPUISE, { faisais: [TRAJET] }),
  ];
  const periode = { du: '2026-09-01', au: '2026-09-30' };
  // Des comptes par famille propres : les sept familles, chacune un nombre fini.
  const propre = (c, quoi) => {
    assert.deepEqual(Object.keys(c), CLES_FAMILLES, `${quoi} : les sept familles, sans clé « null »`);
    assert.ok(Object.values(c).every(Number.isFinite), `${quoi} : ${JSON.stringify(c)}`);
  };

  // Un relevé à émotion, son mot compris, sans famille.
  const r = relevesAEmotion(humeurs);
  assert.deepEqual(r.filter((x) => x.famille === null).map((x) => [x.date, x.mot]), [['2026-09-02', FATIGUE], ['2026-09-22', EPUISE]]);
  assert.deepEqual(parFamille(r), compte({ joie: 1, colere: 1 }));
  assert.deepEqual([...emotionsParJour(humeurs, periode.du, periode.au).keys()], ['2026-09-02', '2026-09-15', '2026-09-22']);
  // Par jour : pas de famille null ; le jour d'Épuisé seul n'y est pas.
  assert.deepEqual([...famillesParJour(humeurs, periode.du, periode.au)], [['2026-09-02', ['joie']], ['2026-09-15', ['colere']]]);
  assert.deepEqual(facteursParJour({ humeurs }).get('2026-09-02').familles, ['joie']);

  // Après une nuit : Fatigué n'est ni compté ni dans n.
  const nuit = apresNuit([{ date: '2026-09-02', sommeilRessenti: 'sommeil:mal' }, { date: '2026-09-22', sommeilRessenti: 'sommeil:bien' }], humeurs, periode);
  propre(nuit.mal, 'apresNuit');
  propre(nuit.bien, 'apresNuit');
  assert.deepEqual([nuit.mal, nuit.bien, nuit.n], [compte({ joie: 1 }), comptesVides(), 1]);

  // Autour d'un instant : Fatigué (30 min avant) n'entre ni dans avant, ni dans n.
  const autour = autourDe([{ date: '2026-09-02', heure: '10:30' }], humeurs);
  propre(autour.avant, 'autourDe avant');
  propre(autour.apres, 'autourDe après');
  assert.deepEqual([autour.avant, autour.apres, autour.n], [comptesVides(), compte({ joie: 1 }), 1]);

  // Selon ce que je faisais : ni compté, ni dans le seuil ; l'activité d'Épuisé seul n'a pas de ligne.
  assert.deepEqual(relevesAvecActivite(humeurs, periode).map((x) => [x.date, x.famille]), [['2026-09-02', 'joie']]);
  const parActivite = emotionsParActivite(humeurs, periode);
  assert.deepEqual(parActivite, { [TRAVAIL]: compte({ joie: 1 }) });
  propre(parActivite[TRAVAIL], 'emotionsParActivite');

  // Mes jours : par jour, le mot reste (le détail du jour le montre) ; par semaine et par mois, aucune famille null.
  const jours = frise({ humeurs }, '2026-09-01', '2026-09-30');
  assert.equal(jours.pas, 'jour');
  assert.deepEqual(jours.colonnes.find((c) => c.cle === '2026-09-02').emotions, [FATIGUE, 'roue:joie:fier']);
  assert.equal(jours.colonnes.find((c) => c.cle === '2026-09-22').aDonnee, true);
  const semaines = frise({ humeurs }, '2026-08-03', '2026-10-04');
  assert.equal(semaines.pas, 'semaine');
  const s = (cle) => semaines.colonnes.find((c) => c.cle === cle);
  propre(s('2026-08-31').familles, 'frise, semaine du 31/08');
  assert.deepEqual([s('2026-08-31').familles, s('2026-08-31').nEmotions], [compte({ joie: 1 }), 1]);
  assert.deepEqual([s('2026-09-14').familles, s('2026-09-14').nEmotions], [compte({ colere: 1 }), 1]);
  assert.deepEqual([s('2026-09-21').familles, s('2026-09-21').nEmotions, s('2026-09-21').aDonnee], [null, 0, false], 'Épuisé seul');
  const mois = frise({ humeurs }, '2026-01-01', '2026-10-31');
  assert.equal(mois.pas, 'mois');
  const septembre = mois.colonnes.find((c) => c.cle === '2026-09');
  propre(septembre.familles, 'frise, septembre');
  assert.deepEqual([septembre.familles, septembre.nEmotions], [compte({ joie: 1, colere: 1 }), 2]);
});

// v9 · relecture de la tâche 3 : les mots à soi (méta motsPerso) entrent dans toute la chaîne de l'Analyse. Avec `perso`,
// un relevé de mot à soi est une émotion du jour, compté dans sa famille s'il en a une (Flottant, joie), dans aucune sinon
// (Brumeux, sans famille, comme Fatigué) ; sans `perso`, il reste hors des comptes, comme avant. Mots inventés.
test('v9 · un mot à soi, avec la méta motsPerso : une émotion du jour, comptée dans sa famille s\'il en a une, partout dans l\'Analyse', () => {
  const FLOTTANT = 'roue:perso:u-0a1b2c3d';
  const BRUMEUX = 'roue:perso:u-4e5f6a7b';
  const perso = {
    [FLOTTANT]: { libelle: 'Flottant', zone: 'vert', famille: 'joie', definition: null, archive: false, createdAt: '2026-08-01T08:00:00.000Z' },
    [BRUMEUX]: { libelle: 'Brumeux', zone: 'bleu', famille: null, definition: null, archive: true, createdAt: '2026-08-02T08:00:00.000Z' },
  };
  const humeurs = [
    releve('2026-09-02', '10:00', FLOTTANT, { faisais: [TRAVAIL], energie: 'energie:basse' }),
    releve('2026-09-02', '11:00', 'roue:colere:irrite', { faisais: [TRAVAIL] }),
    releve('2026-09-03', '01:00', BRUMEUX, { faisais: [TRAJET] }), // encore le 02
    releve('2026-09-15', '09:00', FLOTTANT),
  ];
  const periode = { du: '2026-09-01', au: '2026-09-30' };

  // Les relevés à émotion : les deux mots à soi, leur famille (null pour Brumeux) et leur mot ; mis de côté compris.
  assert.deepEqual(relevesAEmotion(humeurs, perso).map((r) => [r.date, r.famille, r.mot]), [
    ['2026-09-02', 'joie', FLOTTANT], ['2026-09-02', 'colere', 'roue:colere:irrite'], ['2026-09-02', null, BRUMEUX], ['2026-09-15', 'joie', FLOTTANT],
  ]);
  assert.deepEqual(parFamille(relevesAEmotion(humeurs, perso)), compte({ joie: 2, colere: 1 }));
  assert.deepEqual([...emotionsParJour(humeurs, periode.du, periode.au, perso)], [['2026-09-02', [FLOTTANT, 'roue:colere:irrite', BRUMEUX]], ['2026-09-15', [FLOTTANT]]]);
  assert.deepEqual([...famillesParJour(humeurs, periode.du, periode.au, perso)], [['2026-09-02', ['joie', 'colere']], ['2026-09-15', ['joie']]]);
  assert.deepEqual(facteursParJour({ humeurs, perso }).get('2026-09-15').familles, ['joie']);
  // Sans la méta : hors des comptes, comme avant la v9.
  assert.deepEqual(relevesAEmotion(humeurs).map((r) => r.mot), ['roue:colere:irrite']);
  assert.equal(facteursParJour({ humeurs }).has('2026-09-15'), false);

  // Après une nuit, autour d'un instant, selon ce que je faisais : Flottant compte dans la joie, Brumeux nulle part.
  const nuit = apresNuit([{ date: '2026-09-02', sommeilRessenti: 'sommeil:mal' }], humeurs, periode, perso);
  assert.deepEqual([nuit.mal, nuit.n], [compte({ joie: 1, colere: 1 }), 2]);
  const autour = autourDe([{ date: '2026-09-02', heure: '10:30' }], humeurs, {}, perso);
  assert.deepEqual([autour.avant, autour.apres, autour.n], [compte({ joie: 1 }), compte({ colere: 1 }), 2]);
  assert.deepEqual(autourDuBienEtre([{ origine: 'bien-etre', date: '2026-09-15', heure: '10:00' }], humeurs, periode, perso).avant, compte({ joie: 1 }));
  assert.deepEqual(relevesAvecActivite(humeurs, periode, perso).map((x) => [x.date, x.famille]), [['2026-09-02', 'joie'], ['2026-09-02', 'colere']]);
  assert.deepEqual(emotionsParActivite(humeurs, periode, [], perso), { [TRAVAIL]: compte({ joie: 1, colere: 1 }) });

  // Mes jours : par jour, les mots à soi sont des émotions du jour (leur point, leur nom) ; par semaine, Flottant compte
  // dans la joie.
  const jours = frise({ humeurs, perso }, '2026-09-01', '2026-09-30');
  assert.deepEqual(jours.colonnes.find((c) => c.cle === '2026-09-02').emotions, [FLOTTANT, 'roue:colere:irrite', BRUMEUX]);
  assert.equal(jours.colonnes.find((c) => c.cle === '2026-09-15').aDonnee, true);
  assert.equal(frise({ humeurs }, '2026-09-01', '2026-09-30').colonnes.find((c) => c.cle === '2026-09-15').aDonnee, false, 'sans la méta');
  const semaines = frise({ humeurs, perso }, '2026-08-03', '2026-10-04');
  const s = (cle) => semaines.colonnes.find((c) => c.cle === cle);
  assert.deepEqual([s('2026-08-31').familles, s('2026-08-31').nEmotions], [compte({ joie: 1, colere: 1 }), 2]);
  assert.deepEqual([s('2026-09-14').familles, s('2026-09-14').nEmotions], [compte({ joie: 1 }), 1]);

  // L'Analyse, avec la méta dans les données : comptes, Ma semaine, classement des mots et frise.
  const items = seedItems(SEED_V1, 'x');
  const a = analyze({ journal: [], humeurs, episodes: [], symptomes: [], traitements: [], perso }, { aujourdhui: '2026-09-20', items });
  assert.equal(a.emotions['30'].n, 4);
  assert.deepEqual(a.emotions['30'].parFamille, compte({ joie: 2, colere: 1 }));
  assert.deepEqual(a.semaine.emotions, compte({ joie: 1 }));
  assert.deepEqual(a.emotions['30'].mots.tries.map(([id, n]) => [id, n]), [[FLOTTANT, 2], ['roue:colere:irrite', 1], [BRUMEUX, 1]]);
  assert.deepEqual(a.frise['30'].colonnes.find((c) => c.cle === '2026-09-15').emotions, [FLOTTANT]);
  const sans = analyze({ journal: [], humeurs, episodes: [], symptomes: [], traitements: [] }, { aujourdhui: '2026-09-20', items });
  assert.equal(sans.emotions['30'].n, 1, 'sans la méta : seul Irrité');
});

// ---------- v9 · Tes zones (spec §8 et §13.2) ----------
// Les relevés comptés par zone de la carte : seuls ceux dont le mot a une zone ; Fatigué et Épuisé (sans famille) et les
// mots à soi y comptent, une famille seule (v7), une énergie seule ou une ancienne note non. Mots inventés.
const FLOTTANT = 'roue:perso:u-0a1b2c3d';
const BRUMEUX = 'roue:perso:u-4e5f6a7b';
const SANS_ZONE = 'roue:perso:u-8c9d0e1f';
const PERSO_ZONES = {
  [FLOTTANT]: { libelle: 'Flottant', zone: 'vert', famille: 'joie', definition: null, archive: false, createdAt: '2026-08-01T08:00:00.000Z' },
  [BRUMEUX]: { libelle: 'Brumeux', zone: 'bleu', famille: null, definition: null, archive: true, createdAt: '2026-08-02T08:00:00.000Z' },
  // Recréé à l'import, sans zone connue (point de vigilance 4) : une émotion, sans zone.
  [SANS_ZONE]: { libelle: 'Mot sans libellé', zone: null, famille: null, definition: null, archive: true, createdAt: '2026-08-03T08:00:00.000Z' },
};
const zones = (o) => ({ ...zonesVides(), ...o });

test('v9 · zonesVides, nombreParZone, texteZones : les quatre zones dans leur ordre ; « rouge 3 · bleu 9 », sans zéro', () => {
  assert.deepEqual(Object.keys(zonesVides()), ['rouge', 'jaune', 'bleu', 'vert']);
  assert.ok(Object.values(zonesVides()).every((n) => n === 0));
  assert.equal(nombreParZone(zones({ rouge: 3, vert: 5 })), 8);
  assert.equal(nombreParZone(null), 0);
  assert.equal(texteZones({ vert: 5, bleu: 9, jaune: 2, rouge: 3 }), 'rouge 3 · jaune 2 · bleu 9 · vert 5', 'l\'ordre des zones, pas celui reçu');
  assert.equal(texteZones(zones({ bleu: 9 })), 'bleu 9');
  assert.equal(texteZones(zonesVides()), '');
  assert.equal(texteZones(null), '');
});

test('v9 · parZone : les relevés dont le mot a une zone ; Fatigué en bleu, un mot à soi dans la sienne ; ni famille seule, ni note', () => {
  const humeurs = [
    releve('2026-10-12', '09:00', 'roue:colere:irrite'), releve('2026-10-12', '10:00', 'roue:colere:furieux'),
    releve('2026-10-12', '11:00', 'roue:joie:fier'), releve('2026-10-12', '12:00', 'roue:aucune:fatigue'),
    releve('2026-10-12', '13:00', 'roue:serenite:calme'), releve('2026-10-12', '14:00', 'roue:peur:accable'), // Accablé : rouge en v9
    releve('2026-10-12', '15:00', 'roue:colere'), // famille seule (v7) : pas de zone
    releve('2026-10-12', '16:00', FLOTTANT), releve('2026-10-12', '17:00', BRUMEUX), releve('2026-10-12', '18:00', SANS_ZONE),
    { id: 'n', date: '2026-10-12', heure: '19:00', humeur: 6 }, { id: 'e', date: '2026-10-12', heure: '20:00', energie: 'energie:basse' },
  ];
  const r = relevesAEmotion(humeurs, PERSO_ZONES);
  assert.deepEqual(parZone(r, PERSO_ZONES), zones({ rouge: 3, jaune: 1, bleu: 2, vert: 2 }));
  // Les familles, elles, ne comptent ni Fatigué ni Brumeux (sans famille), et comptent la famille seule.
  assert.deepEqual(parFamille(r), compte({ colere: 3, joie: 2, serenite: 1, peur: 1 }));
  // Sans la méta : les mots à soi n'ont ni zone ni place dans les relevés à émotion.
  assert.deepEqual(parZone(relevesAEmotion(humeurs), null), zones({ rouge: 3, jaune: 1, bleu: 1, vert: 1 }));
  // Des relevés bruts (qui portent `emotion`) se comptent de même ; rien ne vaut ni NaN ni clé « null ».
  assert.deepEqual(parZone(humeurs, PERSO_ZONES), zones({ rouge: 3, jaune: 1, bleu: 2, vert: 2 }));
  assert.deepEqual(parZone([], null), zonesVides());
  assert.deepEqual(parZone(null), zonesVides());
  assert.deepEqual(Object.keys(parZone(r, PERSO_ZONES)), ['rouge', 'jaune', 'bleu', 'vert']);
});

test('v9 · dernieresSemaines et zonesParSemaine : 12 lundis, la plus ancienne d\'abord ; jour logique (4 h) ; semaines vides à zéro ; ni avant ni après', () => {
  // Jeudi 15 octobre 2026 : la semaine du lundi 12, et les 11 d'avant, depuis le 27 juillet.
  const semaines = dernieresSemaines('2026-10-15');
  assert.equal(semaines.length, 12);
  assert.deepEqual([semaines[0], semaines.at(-1)], ['2026-07-27', '2026-10-12']);
  assert.ok(semaines.every((s, i) => i === 0 || s > semaines[i - 1]));
  assert.deepEqual(dernieresSemaines('2026-10-12', 2), ['2026-10-05', '2026-10-12'], 'un lundi est le début de sa semaine');
  const humeurs = [
    releve('2026-10-12', '09:00', 'roue:colere:irrite'), releve('2026-10-12', '10:00', 'roue:aucune:epuise'),
    releve('2026-10-12', '03:30', 'roue:joie:fier'), // 03:30 le lundi 12 : encore le dimanche 11, la semaine du 5
    releve('2026-10-07', '14:00', 'roue:serenite:calme', { vers: true }), releve('2026-10-08', '14:00', 'roue:colere'), // famille seule
    releve('2026-10-09', '14:00', FLOTTANT),
    releve('2026-07-26', '14:00', 'roue:colere:irrite'), // la semaine du 20 juillet : hors des 12
  ];
  const res = zonesParSemaine(relevesAEmotion(humeurs, PERSO_ZONES), semaines, PERSO_ZONES);
  assert.equal(res.length, 12);
  assert.deepEqual(res.map((x) => x.semaine), semaines);
  assert.deepEqual(res.at(-1), { semaine: '2026-10-12', ...zones({ rouge: 1, bleu: 1 }) });
  assert.deepEqual(res.at(-2), { semaine: '2026-10-05', ...zones({ jaune: 1, vert: 2 }) });
  assert.ok(res.slice(0, -2).every((x) => nombreParZone(x) === 0), 'les autres semaines, à zéro');
  assert.deepEqual(Object.keys(res[0]), ['semaine', 'rouge', 'jaune', 'bleu', 'vert']);
  // Sans la méta, Flottant ne compte pas.
  assert.deepEqual(zonesParSemaine(relevesAEmotion(humeurs), semaines).at(-2), { semaine: '2026-10-05', ...zones({ jaune: 1, vert: 1 }) });
  assert.deepEqual(zonesParSemaine([], []), []);
  // Le dimanche de la dernière semaine compte ; le lundi suivant, non.
  const bords = [releve('2026-10-18', '23:00', 'roue:colere:irrite'), releve('2026-10-19', '05:00', 'roue:colere:irrite'), releve('2026-07-27', '04:00', 'roue:joie:fier')];
  const r = zonesParSemaine(relevesAEmotion(bords), semaines);
  assert.deepEqual([r[0].jaune, r.at(-1).rouge, r.reduce((s, x) => s + nombreParZone(x), 0)], [1, 1, 2]);
});

test('v9 · analyze : les zones de chaque période et des 12 dernières semaines, sans relevé après aujourd\'hui ; Paris et UTC', () => {
  const items = seedItems(SEED_V1, 'x');
  const humeurs = [
    ...['2026-10-12', '2026-10-13', '2026-10-14'].map((d) => releve(d, '10:00', 'roue:colere:irrite')),
    releve('2026-10-15', '10:00', 'roue:colere'), releve('2026-10-16', '10:00', 'roue:aucune:fatigue'), releve('2026-10-17', '10:00', FLOTTANT),
    releve('2026-09-01', '10:00', 'roue:joie:fier'), releve('2026-05-04', '10:00', 'roue:serenite:calme'),
    releve('2026-10-19', '02:00', 'roue:peur:craintif'), // le lundi 19 à 2 h : encore le dimanche 18, aujourd'hui
    releve('2026-10-19', '10:00', 'roue:peur:craintif'), // après aujourd'hui : nulle part
  ];
  const calculer = () => analyze({ journal: [], humeurs, episodes: [], symptomes: [], traitements: [], perso: PERSO_ZONES }, { aujourdhui: '2026-10-18', items });
  const a = calculer();
  assert.deepEqual(a.emotions['7'].parZone, zones({ rouge: 4, bleu: 1, vert: 1 }));
  assert.deepEqual(a.emotions['90'].parZone, zones({ rouge: 4, jaune: 1, bleu: 1, vert: 1 }));
  assert.deepEqual(a.emotions.tout.parZone, zones({ rouge: 4, jaune: 1, bleu: 1, vert: 2 }));
  assert.equal(a.zonesSemaines.length, 12);
  assert.deepEqual(a.zonesSemaines.at(-1), { semaine: '2026-10-12', ...zones({ rouge: 4, bleu: 1, vert: 1 }) });
  assert.deepEqual(a.zonesSemaines.find((x) => x.semaine === '2026-08-31'), { semaine: '2026-08-31', ...zones({ jaune: 1 }) });
  assert.equal(a.zonesSemaines.reduce((s, x) => s + nombreParZone(x), 0), 7, 'le 4 mai, hors des 12 semaines ; le 19 à 10 h, après aujourd\'hui');
  const avant = process.env.TZ;
  try {
    process.env.TZ = 'UTC';
    assert.equal(JSON.stringify([calculer().emotions, calculer().zonesSemaines]), JSON.stringify([a.emotions, a.zonesSemaines]));
  } finally {
    if (avant === undefined) delete process.env.TZ; else process.env.TZ = avant;
  }
});
