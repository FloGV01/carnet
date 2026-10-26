// v7 · Émotions du moment (analyse/emotions.js) : chaque fonction sur des jeux inventés, avec la bascule de 4 h, un
// relevé « vers », une famille sans mot, et l'invariance Paris / UTC. Données inventées, aucune donnée réelle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLES_FAMILLES, comptesVides, nombreDeReleves, relevesAEmotion, parFamille, emotionsParJour, famillesParJour, famillesParHeure,
  famillesParColonnes, apresNuit, autourDe, autourDuBienEtre, emotionsParActivite, relevesAvecActivite, selonSeuilEmotions,
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
  assert.deepEqual(SEUILS.emotions, { minReleves: 5, heuresAutour: 3 });
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
