import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modeleSoignants, NOM_EMOTIONS, NOM_NOTES } from '../../public/js/export/soignants.js';
import { mettreEnPage, A4, couperLignes, couperListe } from '../../public/js/export/page-a4.js';
import { FAMILLES } from '../../public/js/domain/roue.js';
import { trouverInterdits } from '../aides/mots-interdits.js';
import { analyze } from '../../public/js/analyse/index.js';
import { frise } from '../../public/js/analyse/frise.js';
import { numeroCercle } from '../../public/js/analyse/reperes.js';
import { SEED_V1, seedItems } from '../../public/js/domain/vocabulaire.js';
import { carteLibelles } from '../../public/js/domain/libelles.js';
import { generer } from '../fixtures/generateur.js';

const items = seedItems(SEED_V1, 'x');
const carte = carteLibelles(items);

const SEPT = (date) => date >= '2026-09-01' && date <= '2026-09-30';

// energie (v6) : des relevés d'énergie sans humeur (dont des « basse »), un jour sur deux, et tous les jours de septembre.
// trou : aucune saisie du soir en septembre 2026 (et aucun épisode : ils tombent de juillet à début août) : des semaines
// et un mois qui n'ont, avec energie, que de l'énergie.
// jours : 200 pour que l'évolution passe par mois (au-delà de 26 semaines d'historique).
// emotions (v7) : parJour relevés à émotion par jour, des 7 familles, tous les jours (6 : des comptes à 3 chiffres « depuis
// le début » ; 40 : à 4 chiffres, ce qui arrive après quelques années).
function donnees({ extreme = false, energie = false, trou = false, jours = 180, emotions = false, parJour = 6 } = {}) {
  const journal = generer({ jours, seed: 7, scenario: 'bureau', debut: '2026-04-03' }).map((j) => ({ ...j, pointsPositifs: 'texte privé', notes: 'note privée' }));
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
  const humeurs = [
    ...(energie ? journal.filter((j, i) => i % 2 === 0 || SEPT(j.date)).map((j, i) => ({ id: `h${i}`, date: j.date, heure: '15:00', humeur: null, energie: i % 3 ? 'energie:basse' : 'energie:haute' })) : []),
    ...(emotions ? journal.flatMap((j, i) => Array.from({ length: parJour }, (_, r) => ({ id: `e${i}-${r}`, date: j.date,
      heure: `${String(8 + 2 * (r % 8)).padStart(2, '0')}:${String(5 * Math.floor(r / 8)).padStart(2, '0')}`,
      emotion: FAMILLES[(i + r) % 7].mots[0].id, humeur: null, energie: 'energie:basse' }))) : []),
  ];
  const data = { journal: trou ? journal.filter((j) => !SEPT(j.date)) : journal, episodes, symptomes, traitements, ...(energie || emotions ? { humeurs } : {}) };
  const analyse = analyze(data, { aujourdhui, items });
  // Noms fictifs : jamais de vrai médicament dans les tests.
  const traitementActuel = { depuis: '2026-09-01', lignes: Array.from({ length: extreme ? 8 : 2 }, (_, i) => ({
    id: `m${i}`, nom: extreme ? `Médicament fictif numéro ${i} au nom vraiment très long` : `Médicament ${i}`,
    doses: { matin: '½', midi: extreme ? '1' : null, apresMidi: '½', soir: '1', coucher: extreme ? '2 gouttes' : null } })) };
  return { data, aujourdhui, analyse, rdvs, traitements, traitementActuel };
}

function cas(options) {
  const { data, aujourdhui, analyse, rdvs, traitements, traitementActuel } = donnees(options);
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

test('une seule page : hauteur ≤ 273 mm, y compris dans le cas extrême (v7 : les 7 familles, des comptes à 3 et à 4 chiffres, les notes)', () => {
  for (const extreme of [false, true]) {
    for (const parJour of [0, 6, 40]) {
      const emotions = parJour > 0;
      const m = cas({ extreme, emotions, parJour });
      const { hauteur, ops } = mettreEnPage(m);
      assert.ok(hauteur <= A4.hauteurMax, `hauteur ${hauteur.toFixed(1)} mm (extrême : ${extreme}, relevés par jour : ${parJour})`);
      assert.ok(ops.every((o) => Object.values(o).every((v) => typeof v !== 'number' || Number.isFinite(v))));
      if (emotions) {
        assert.equal(m.frise.familles.length, 7);
        const chiffres = new RegExp(`^\\S+ \\d{${parJour === 40 ? 4 : 3}}$`);
        assert.ok(m.indicateurs[0].valeurs.at(-1).split(' · ').every((x) => chiffres.test(x)), m.indicateurs[0].valeurs.at(-1));
        assert.ok(m.frise.avecHumeur, 'et les anciennes notes');
        assert.ok(m.frise.reperes.length > 0, 'et des repères');
      }
    }
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
  assert.match(texte, /nuits Mal, Moyen, Bien : du plus clair au plus foncé/);
});

test('v6 · l\'énergie basse reste à l\'écran : même modèle, même page, avec ou sans relevés d\'énergie', () => {
  // Par semaine, puis par mois : en septembre, des semaines (le 14) et un mois (« 2026-09 ») n'ont que de l'énergie.
  const cas2 = [[180, 'semaine', '2026-07-13', '2026-09-29', '2026-09-14'], [200, 'mois', '2025-11-01', '2026-10-19', '2026-09']];
  for (const [jours, pas, du, au, cle] of cas2) {
    // Le jeu d'essai est bon : à l'écran, cette colonne ne se touche que grâce à l'énergie.
    const colonne = (opts) => frise(donnees({ trou: true, jours, ...opts }).data, du, au).colonnes.find((c) => c.cle === cle);
    assert.equal(colonne({}).aDonnee, false, `${pas} : sans relevé, la colonne est vide`);
    assert.equal(colonne({ energie: true }).aDonnee, true, `${pas} : avec l'énergie, elle se touche`);
    // Le PDF ne voit rien : même modèle (octet pour octet), même page.
    const sans = cas({ trou: true, jours });
    const avec = cas({ trou: true, jours, energie: true });
    assert.equal(avec.frise.pas, pas);
    assert.ok(avec.frise.colonnes.some((c) => c.cle === cle), 'la colonne est dans la frise du PDF');
    assert.equal(JSON.stringify(avec), JSON.stringify(sans), `${pas} : le modèle ne change pas`);
    assert.ok(!JSON.stringify(avec).includes('energieBasse'));
    const page = mettreEnPage(avec);
    assert.equal(JSON.stringify(page.ops), JSON.stringify(mettreEnPage(sans).ops), `${pas} : la page ne change pas d'un trait`);
    assert.ok(page.hauteur <= A4.hauteurMax);
  }
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

test('v7 : l\'en-tête dit comment se lisent les émotions, et les notes seulement s\'il y en a ; la page tient sur une page', () => {
  const m = cas({ extreme: true });
  const NOTE = 'Émotions : relevés notés, par famille de la roue. Humeur (notes) : anciennes notes de 1 à 10, moyenne de chaque journée.';
  assert.equal(m.noteLecture, NOTE);
  const { ops, hauteur } = mettreEnPage(m);
  const textes = ops.filter((o) => o.type === 'texte').map((o) => o.texte);
  assert.equal(textes.indexOf(NOTE), textes.indexOf(m.sousTitre) + 1, 'juste sous le sous-titre, sur une ligne');
  assert.ok(hauteur <= A4.hauteurMax, `hauteur ${hauteur.toFixed(1)} mm`);
  assert.equal(casV6({ humeurs: [{ id: 'a', date: '2026-10-12', heure: '10:00', emotion: 'roue:joie', humeur: null }] }).noteLecture,
    'Émotions : relevés notés, par famille de la roue.', 'sans note, rien sur les notes');
});

test('v6 : « Humeur moyenne » porte sur l\'humeur du jour ; le plus bas et le plus haut, sur les valeurs notées', () => {
  // Le 13 : relevés 3, 6 et 8 (et un soir à 9, jamais mêlé) ; le 14 : un soir à 6 seulement.
  const m = casV6({
    journal: [{ date: '2026-10-13', humeur: 9 }, { date: '2026-10-14', humeur: 6 }],
    humeurs: [releve('2026-10-13', '09:00', 3), releve('2026-10-13', '14:00', 6), releve('2026-10-14', '01:30', 8)],
  });
  assert.equal(valeur7j(m, NOM_NOTES), '5,8 (3-8, sur 2 j)');
});

test('v6 : un jour qui n\'a que des relevés ne compte jamais « 0 explosion », et date le début des données', () => {
  const m = casV6({ humeurs: [releve('2026-10-12', '10:00', 4), releve('2026-10-12', '18:00', 6)] });
  assert.equal(valeur7j(m, 'Explosions (jours avec)'), '·');
  assert.equal(valeur7j(m, NOM_NOTES), '5 (4-6, sur 1 j)');
  assert.match(m.entete, /données depuis le 12\/10\/2026/);
  // Un jour noté le soir, lui, vaut 0.
  const avecSoir = casV6({ journal: [{ date: '2026-10-13', lieu: 'lieu:bureau' }], humeurs: [releve('2026-10-12', '10:00', 4)] });
  assert.equal(valeur7j(avecSoir, 'Explosions (jours avec)'), '0 (0)');
});

// ---------- v6 : repères de traitement (spec §3) ----------
// Textes inventés : jamais un vrai médicament. Aujourd'hui le mercredi 14/10 : la frise va du lundi 27/07 au
// 14/10, la section Traitement reprend les 90 derniers jours (depuis le 17/07), 4 lignes au plus, 3 avec un
// traitement actuel.

const fiche = (id, date, changement, extra = {}) => ({ id, date, changement, effetsSecondaires: [], effetRessenti: null, ...extra });
const CERCLE = /^[①-⑳㉑-㉟㊱-㊿]/u;
function casReperes(traitements, { actuel = false } = {}) {
  const data = { journal: [{ date: '2026-10-01', humeur: 6 }], episodes: [], symptomes: [], traitements, humeurs: [] };
  const aujourdhui = '2026-10-14';
  const analyse = analyze(data, { aujourdhui, items });
  const traitementActuel = actuel ? { depuis: '2026-09-01', lignes: [{ id: 'm0', nom: 'Médicament 0', doses: { matin: '½' } }] } : null;
  return modeleSoignants(data, { aujourdhui, carte, analyse, professionnel: null, prenom: '', traitements, traitementActuel });
}
// Les numéros des traits de la frise, et ceux des lignes de la section Traitement.
const numerosTraits = (m) => m.frise.reperes.flatMap((r) => r.numeros).map(numeroCercle);
const numerosLignes = (m) => m.traitement.map((l) => (l.match(CERCLE) || [])[0]).filter(Boolean).reverse();

const FICHES = [
  fiche('g', '2026-10-14', 'retour à la dose initiale'),
  fiche('a', '2026-10-13', 'passage à la dose du soir'),
  fiche('b', '2026-10-12', null, { effetRessenti: 'effetRessenti:moins_bien' }), // des effets seulement : pas de repère
  fiche('c', '2026-10-06', 'ajout d\'une prise le matin'),
  fiche('f', '2026-08-10', 'essai d\'un horaire décalé'), // dans la frise, mais sans ligne : ni trait, ni numéro
];

test('v6 · repères : les lignes de la section Traitement reprennent leur numéro, et seules elles sont tracées', () => {
  const m = casReperes(FICHES);
  assert.deepEqual(m.traitement, [
    '③ mer 14/10 · retour à la dose initiale',
    '② mar 13/10 · passage à la dose du soir',
    'lun 12/10 · Moins bien',
    '① mar 06/10 · ajout d\'une prise le matin',
  ]);
  // Le 13 et le 14 sont dans la même semaine : un seul trait.
  assert.deepEqual(m.frise.reperes.map((r) => [r.cle, r.etiquette]), [['2026-10-05', '①'], ['2026-10-12', '②–③']]);
  // Avec un traitement actuel, 3 lignes : le 06/10 n'a plus de ligne, donc plus de trait, et la numérotation suit.
  const avec = casReperes(FICHES, { actuel: true });
  assert.deepEqual(avec.traitement, ['② mer 14/10 · retour à la dose initiale', '① mar 13/10 · passage à la dose du soir', 'lun 12/10 · Moins bien']);
  assert.deepEqual(avec.frise.reperes.map((r) => r.etiquette), ['①–②']);
});

test('v6 · repères : aucun trait sans légende, aucune ligne numérotée sans trait', () => {
  const cas2 = [
    casReperes(FICHES), casReperes(FICHES, { actuel: true }),
    // Une ligne d'avant la frise (le 20/07, dans les 90 jours) : sans numéro, et rien sur la frise.
    casReperes([fiche('d', '2026-07-20', 'arrêt de la prise du midi'), fiche('b', '2026-10-12', null, { effetRessenti: 'effetRessenti:moins_bien' })]),
    casReperes([]),
  ];
  for (const m of cas2) {
    assert.deepEqual(numerosTraits(m), numerosLignes(m));
    for (const r of m.frise.reperes) assert.ok(m.frise.colonnes[r.i] && m.frise.colonnes[r.i].cle === r.cle, 'le trait est dans une colonne de la frise');
  }
  assert.deepEqual(cas2[2].traitement, ['lun 12/10 · Moins bien', 'lun 20/07 · arrêt de la prise du midi']);
  assert.deepEqual(cas2[2].frise.reperes, []);
});

test('v6 · repères : sur la page, la frise porte les traits et sa légende les annonce ; la page reste unique', () => {
  const m = casReperes(FICHES);
  const { ops, hauteur } = mettreEnPage(m);
  const op = ops.find((o) => o.type === 'frise');
  assert.deepEqual(op.frise.reperes.map((r) => r.etiquette), ['①', '②–③']);
  const textes = ops.filter((o) => o.type === 'texte').map((o) => o.texte);
  assert.match(textes.join(' '), /trait numéroté : changement de traitement/);
  for (const ligne of m.traitement) assert.ok(textes.includes(ligne), ligne);
  assert.ok(hauteur <= A4.hauteurMax);
  // Sans repère, la légende n'en parle pas.
  assert.doesNotMatch(mettreEnPage(casReperes([])).ops.filter((o) => o.type === 'texte').map((o) => o.texte).join(' '), /trait numéroté/);
});

test('v6 · repères : le cas extrême porte des traits et des lignes numérotées, et tient sur une seule page', () => {
  const m = cas({ extreme: true });
  assert.equal(m.traitement.length, 3);
  assert.ok(m.traitement.every((l) => CERCLE.test(l)), 'les trois lignes sont numérotées');
  assert.deepEqual(numerosTraits(m), numerosLignes(m));
  const { hauteur } = mettreEnPage(m);
  assert.ok(hauteur <= A4.hauteurMax, `hauteur ${hauteur.toFixed(1)} mm`);
});

// ---------- v7 : les émotions du moment (spec §5) ----------

const emo = (date, heure, emotion, o = {}) => ({ id: `${date}-${heure}`, date, heure, emotion, humeur: null, energie: null, ...o });
const nomsIndicateurs = (m) => m.indicateurs.map((l) => l.nom);

test('v7 : « Émotions par famille » en tête des indicateurs, un compte de relevés par colonne, dans l\'ordre de la roue', () => {
  const m = casV6({
    humeurs: [
      emo('2026-10-14', '09:00', 'roue:serenite:calme'), emo('2026-10-14', '12:00', 'roue:colere:irrite'), emo('2026-10-13', '10:00', 'roue:colere'),
      emo('2026-10-15', '02:00', 'roue:joie:amuse'), // le 15 à 2 h : encore le 14
      emo('2026-08-20', '10:00', 'roue:peur:craintif'), // dans « Depuis le début » seulement
      emo('2026-10-16', '10:00', 'roue:tristesse:vide'), // après aujourd'hui : jamais
    ],
  });
  assert.equal(m.indicateurs[0].nom, NOM_EMOTIONS);
  assert.equal(m.indicateurs[0].multiligne, true);
  assert.deepEqual(m.colonnes, ['7 j', '30 j', 'Depuis le début']);
  assert.deepEqual(m.indicateurs[0].valeurs, ['colère 2 · joie 1 · sérénité 1', 'colère 2 · joie 1 · sérénité 1', 'colère 2 · joie 1 · peur 1 · sérénité 1']);
  assert.match(m.entete, /données depuis le 20\/08\/2026/, 'un jour qui n\'a qu\'un relevé à émotion date le début');
  // Sans relevé à émotion : « · ».
  assert.deepEqual(casV6({ journal: [{ date: '2026-10-13', lieu: 'lieu:bureau' }] }).indicateurs[0].valeurs, ['·', '·', '·']);
});

test('v7 : « Humeur (notes) » seulement si une colonne a d\'anciennes notes ; « Journées à 7 ou plus » est retirée', () => {
  const sans = casV6({ humeurs: [emo('2026-10-13', '10:00', 'roue:colere')], journal: [{ date: '2026-10-13', lieu: 'lieu:bureau' }] });
  assert.ok(!nomsIndicateurs(sans).includes(NOM_NOTES), 'aucune note : pas de ligne');
  // Une note ancienne, hors des 7 et 30 jours : la ligne, avec « · » là où il n'y en a pas.
  const avec = casV6({ journal: [{ date: '2026-08-01', humeur: 6 }, { date: '2026-10-13', lieu: 'lieu:bureau' }], humeurs: [emo('2026-10-13', '10:00', 'roue:colere')] });
  assert.deepEqual(nomsIndicateurs(avec).slice(0, 2), [NOM_EMOTIONS, NOM_NOTES]);
  assert.deepEqual(avec.indicateurs[1].valeurs, ['·', '·', '6 (6-6, sur 1 j)']);
  for (const m of [sans, avec, cas({ extreme: true, emotions: true })]) {
    assert.ok(!nomsIndicateurs(m).some((n) => /Journées à 7|à 4 ou moins|Humeur moyenne/.test(n)), nomsIndicateurs(m).join(', '));
  }
});

test('v7 : aucune phrase retirée, aucun mot interdit, rien sur le Bien-être, jamais « positive » ni « négative »', () => {
  const m = cas({ extreme: true, emotions: true });
  const textes = mettreEnPage(m).ops.filter((o) => o.type === 'texte').map((o) => o.texte).join('\n');
  assert.doesNotMatch(textes, /REPÈRES|Repères|journées à 7|Journées à 7|à 4 ou moins|Sommeil et humeur|Tendances|Signal|ressembl|bonnes journées|Bien-être|séance|positi|négati/i);
  assert.deepEqual(trouverInterdits(textes), []);
  assert.match(textes, /Émotions \(épisodes\)/, 'les émotions des épisodes se distinguent de celles du moment');
});

test('v7 : la frise porte les familles par semaine (sans énergie), « Humeur (notes) » si sa période a des notes, et la légende des familles', () => {
  const { data, aujourdhui, analyse } = donnees({ emotions: true, energie: true });
  const m = modeleSoignants(data, { aujourdhui, carte, analyse, professionnel: null, prenom: '' });
  assert.equal(m.frise.pas, 'semaine');
  assert.ok(m.frise.colonnes.every((c) => !('emotions' in c) && !('energieBasse' in c) && !('entree' in c)));
  assert.ok(m.frise.colonnes.every((c) => c.nEmotions === 0 ? c.familles === null : Object.keys(c.familles).join() === FAMILLES.map((f) => f.cle).join()));
  assert.ok(m.frise.colonnes.some((c) => c.nEmotions > 0));
  assert.deepEqual(m.frise.familles.map((f) => f.cle), FAMILLES.map((f) => f.cle), 'dans l\'ordre de la roue');
  assert.equal(m.frise.avecHumeur, true);
  assert.ok(!JSON.stringify(m.frise).includes('energieBasse'));
  // Sans note sur la période : pas de rangée, et une frise moins haute.
  const sansNote = { ...data, journal: data.journal.map(({ humeur, ...j }) => j) };
  const m2 = modeleSoignants(sansNote, { aujourdhui, carte, analyse, professionnel: null, prenom: '' });
  assert.equal(m2.frise.avecHumeur, false);
  const frise = (x) => mettreEnPage(x).ops.find((o) => o.type === 'frise');
  assert.ok(frise(m2).hauteur < frise(m).hauteur);
  // Sans émotion : aucune famille dans la légende.
  assert.deepEqual(cas().frise.familles, []);
});

test('v7 : la légende des familles, au bout du titre de l\'évolution, une case à motif par famille, dans l\'ordre de la roue', () => {
  const m = cas({ emotions: true });
  const { ops } = mettreEnPage(m);
  const cases = ops.filter((o) => o.type === 'emotion');
  assert.deepEqual(cases.map((o) => o.famille), FAMILLES.map((f) => f.cle));
  const titre = ops.find((o) => o.type === 'texte' && o.texte === m.titreEvolution.toUpperCase());
  assert.ok(cases.every((o) => o.y < titre.y && o.y + o.h > titre.y - 2.6), 'sur la ligne du titre');
  assert.ok(cases.every((o, i) => i === 0 || o.x > cases[i - 1].x), 'de gauche à droite');
  assert.ok(cases.at(-1).x + cases.at(-1).l < A4.largeur - A4.marge, 'dans la page');
  for (const f of FAMILLES) assert.ok(ops.some((o) => o.type === 'texte' && o.texte === f.libelle), f.libelle);
  const textes = ops.filter((o) => o.type === 'texte').map((o) => o.texte).join(' ');
  assert.match(textes, /Émotions : relevés par semaine, de bas en haut dans l'ordre de la légende/);
  assert.match(textes, /Humeur \(notes\) : 1 en bas, 10 en haut/);
});

test('v7 : une valeur « colère 3 · joie 4 » passe à la ligne entre deux familles, jamais au milieu', () => {
  const v = 'colère 154 · dégoût 154 · tristesse 154 · joie 154 · surprise 155 · peur 155 · sérénité 154';
  const lignes = couperListe(v, 7, 31.5);
  assert.ok(lignes.length > 1);
  assert.equal(lignes.join(' · '), v);
  assert.ok(lignes.every((l) => l.split(' · ').every((x) => /^\S+ \d+$/.test(x))));
  // Des comptes à 4 chiffres (après quelques années) : toujours deux familles par ligne. L'estimation de la largeur est
  // prudente, et la page réduit au besoin la police d'une ligne un peu trop large.
  assert.deepEqual(couperListe('colère 1028 · dégoût 1028 · tristesse 1028 · joie 1029 · surprise 1030 · peur 1029 · sérénité 1028', 7, 31.5),
    ['colère 1028 · dégoût 1028', 'tristesse 1028 · joie 1029', 'surprise 1030 · peur 1029', 'sérénité 1028']);
  // Sur la page : la rangée prend la hauteur de sa plus longue valeur, la suivante vient dessous.
  const m = cas({ extreme: true, emotions: true });
  const { ops } = mettreEnPage(m);
  const t = ops.filter((o) => o.type === 'texte');
  const yNotes = t.find((o) => o.texte === NOM_NOTES).y;
  const yEmotions = t.find((o) => o.texte === NOM_EMOTIONS).y;
  const morceaux = t.filter((o) => o.y >= yEmotions && o.y < yNotes && /^\S+ \d+( · \S+ \d+)*$/.test(o.texte));
  assert.ok(morceaux.length >= 4 * 2, 'plusieurs lignes par colonne');
  assert.ok(Math.max(...morceaux.map((o) => o.y)) < yNotes - 2);
});
