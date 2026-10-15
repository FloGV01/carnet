import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modeleSoignants } from '../../public/js/export/soignants.js';
import { mettreEnPage, A4, couperLignes } from '../../public/js/export/page-a4.js';
import { analyze } from '../../public/js/analyse/index.js';
import { SEED_V1, seedItems } from '../../public/js/domain/vocabulaire.js';
import { carteLibelles } from '../../public/js/domain/libelles.js';
import { generer } from '../fixtures/generateur.js';

const items = seedItems(SEED_V1, 'x');
const carte = carteLibelles(items);

function cas({ extreme = false } = {}) {
  const journal = generer({ jours: 180, seed: 7, scenario: 'bureau', debut: '2026-04-03' }).map((j) => ({ ...j, pointsPositifs: 'texte privé', notes: 'note privée' }));
  const aujourdhui = journal[journal.length - 1].date;
  const long = (n) => 'Une question vraiment longue sur le sommeil et les effets du matin '.repeat(4).slice(0, n);
  const episodes = Array.from({ length: 30 }, (_, i) => ({ id: `e${i}`, date: journal[100 + i].date, heure: '12:00', emotion: 'emotion:sentiment_injustice',
    declencheur: 'declencheur:surcharge_sensorielle', dessous: 'dessous:pas_vu_reconnu', reaction: 'reaction:report_a_froid', intensite: 6, situation: 'situation privée', ceQuiAAide: 'aide privée' }));
  const symptomes = Array.from({ length: 12 }, (_, i) => ({ id: `s${i}`, date: journal[160 + i].date, symptome: 'symptome:difficulte_concentration', intensite: 5, duree: 'duree:plusieurs_jours' }));
  const traitements = Array.from({ length: 6 }, (_, i) => ({ id: `t${i}`, date: journal[150 + i * 5].date, changement: extreme ? long(150) : 'ajustement',
    effetsSecondaires: ['effetSecondaire:agitation_nervosite', 'effetSecondaire:troubles_digestifs', 'effetSecondaire:baisse_libido'], effetRessenti: 'effetRessenti:moins_bien' }));
  const rdvs = [
    { id: 'r1', date: journal[170].date, professionnel: 'professionnel:psychiatre', prochaineEtape: extreme ? long(200) : 'revoir dans un mois' },
    { id: 'r2', date: '2026-12-01', professionnel: 'professionnel:psychiatre', questions: Array.from({ length: 8 }, (_, i) => ({ texte: extreme ? long(200) : `question ${i}`, abordee: i === 0 })) },
  ];
  const data = { journal, episodes, symptomes, traitements };
  const analyse = analyze(data, { aujourdhui, items });
  // Noms fictifs : jamais de vrai médicament dans les tests.
  const traitementActuel = { depuis: '2026-09-01', lignes: Array.from({ length: extreme ? 8 : 2 }, (_, i) => ({
    id: `m${i}`, nom: extreme ? `Médicament fictif numéro ${i} au nom vraiment très long` : `Médicament ${i}`,
    doses: { matin: '½', midi: extreme ? '1' : null, apresMidi: '½', soir: '1', coucher: extreme ? '2 gouttes' : null } })) };
  return modeleSoignants(data, { aujourdhui, carte, analyse, professionnel: 'professionnel:psychiatre', prenom: '', rdvs, traitements, traitementActuel });
}

test('le modèle exclut tout texte libre privé et le signal', () => {
  const m = cas();
  const json = JSON.stringify(m);
  for (const prive of ['texte privé', 'note privée', 'situation privée', 'aide privée']) assert.ok(!json.includes(prive), prive);
  assert.ok(!/signal|ressembl/i.test(json));
  assert.equal(m.rdv.questions.length, 6, 'questions non abordées, 6 au plus');
  assert.ok(m.traitement.length <= 4);
  assert.ok(m.colonnes.some((c) => c.startsWith('Depuis le RDV du')));
  assert.ok(!json.includes('NaN') && !json.includes('undefined'));
});

test('une seule page : hauteur ≤ 273 mm, y compris dans le cas extrême', () => {
  for (const extreme of [false, true]) {
    const { hauteur, ops } = mettreEnPage(cas({ extreme }));
    assert.ok(hauteur <= A4.hauteurMax, `hauteur ${hauteur.toFixed(1)} mm (extrême : ${extreme})`);
    assert.ok(ops.every((o) => Object.values(o).every((v) => typeof v !== 'number' || Number.isFinite(v))));
  }
});

test('coupure des lignes sans perte de mots', () => {
  const lignes = couperLignes('un deux trois quatre cinq six sept huit neuf dix onze douze', 9, 30);
  assert.equal(lignes.join(' '), 'un deux trois quatre cinq six sept huit neuf dix onze douze');
  assert.ok(lignes.length > 1);
});

test('évolution (v5) : la frise par semaine, ou par mois sur un long historique ; légende du sommeil', () => {
  const m = cas({ extreme: false });
  assert.equal(m.titreEvolution, 'Évolution sur 12 semaines');
  assert.equal(m.frise.pas, 'semaine');
  assert.ok(m.frise.colonnes.length >= 12 && m.frise.colonnes.length <= 13);
  assert.ok(m.frise.colonnes.every((c) => !('entree' in c)), 'jamais le détail jour par jour');
  const { ops } = mettreEnPage(m);
  assert.ok(ops.some((o) => o.type === 'frise'));
  const texte = ops.filter((o) => o.type === 'texte').map((o) => o.texte).join(' ');
  assert.match(texte, /nuits Mal, Moyen, Bien, du plus clair au plus foncé/);
});

test('traitement actuel : une ligne par médicament, 4 au plus, et 3 changements', () => {
  const m = cas({ extreme: false });
  assert.deepEqual(m.traitementActuel, ['Médicament 0 : matin ½ · après-midi ½ · soir 1', 'Médicament 1 : matin ½ · après-midi ½ · soir 1']);
  const ex = cas({ extreme: true });
  assert.equal(ex.traitementActuel.length, 4);
  assert.equal(ex.traitement.length, 3);
});

// ---------- v6 : humeur du jour ----------

const releve = (date, heure, humeur) => ({ id: `${date}-${heure}`, date, heure, humeur, energie: null });
function casV6({ journal = [], humeurs = [], zeroDepuis = '2026-01-01' }) {
  const data = { journal, episodes: [], symptomes: [], traitements: [], humeurs };
  const aujourdhui = '2026-10-14';
  const analyse = analyze(data, { aujourdhui, items, zeroDepuis });
  return modeleSoignants(data, { aujourdhui, carte, analyse, professionnel: null, prenom: '', zeroDepuis });
}
const valeur7j = (m, nom) => m.indicateurs.find((l) => l.nom === nom).valeurs[0];

test('v6 : l\'en-tête dit comment se lit l\'humeur, et la page tient toujours sur une seule page', () => {
  const m = cas({ extreme: true });
  assert.equal(m.noteHumeur, 'Humeur : moyenne des relevés de chaque journée.');
  const { ops, hauteur } = mettreEnPage(m);
  const textes = ops.filter((o) => o.type === 'texte').map((o) => o.texte);
  assert.equal(textes.indexOf('Humeur : moyenne des relevés de chaque journée.'), textes.indexOf(m.sousTitre) + 1, 'juste sous le sous-titre');
  assert.ok(hauteur <= A4.hauteurMax, `hauteur ${hauteur.toFixed(1)} mm`);
});

test('v6 : « Humeur moyenne » porte sur l\'humeur du jour ; le plus bas et le plus haut, sur les valeurs notées', () => {
  // Le 13 : relevés 3, 6 et 8 (et un soir à 9, jamais mêlé) ; le 14 : un soir à 6 seulement.
  const m = casV6({
    journal: [{ date: '2026-10-13', humeur: 9 }, { date: '2026-10-14', humeur: 6 }],
    humeurs: [releve('2026-10-13', '09:00', 3), releve('2026-10-13', '14:00', 6), releve('2026-10-14', '01:30', 8)],
  });
  assert.equal(valeur7j(m, 'Humeur moyenne (min-max)'), '5,8 (3-8, sur 2 j)');
});

test('v6 : un jour qui n\'a que des relevés ne compte jamais « 0 explosion », et date le début des données', () => {
  const m = casV6({ humeurs: [releve('2026-10-12', '10:00', 4), releve('2026-10-12', '18:00', 6)] });
  assert.equal(valeur7j(m, 'Explosions (jours avec)'), '·');
  assert.equal(valeur7j(m, 'Humeur moyenne (min-max)'), '5 (4-6, sur 1 j)');
  assert.match(m.entete, /données depuis le 12\/10\/2026/);
  // Un jour noté le soir, lui, vaut 0.
  const avecSoir = casV6({ journal: [{ date: '2026-10-13', lieu: 'lieu:bureau' }], humeurs: [releve('2026-10-12', '10:00', 4)] });
  assert.equal(valeur7j(avecSoir, 'Explosions (jours avec)'), '0 (0)');
});
