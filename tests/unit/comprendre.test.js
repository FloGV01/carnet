import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, plageJours } from '../../public/js/domain/dates.js';
import { SEUILS } from '../../public/js/analyse/seuils.js';
import {
  periodeComprendre, facteursParJour, aligne, elementsFrequents,
  explosionsAvant, explosionsApres, energieAvant, retoursBureau,
} from '../../public/js/analyse/comprendre.js';

// Données inventées (aucune donnée réelle).
const AUJ = '2026-10-15';
const MAL = 'sommeil:mal';
const BIEN = 'sommeil:bien';
const COUTEUX = 'contactEffet:couteux';
const soir = (date, plus = {}) => ({
  date, humeur: null, explosions: null, sommeilRessenti: null, lieu: null, contactHumain: null, contacts: null, pese: null, recharge: null, ...plus,
});
const explosion = (date, heure = '15:00') => ({ id: `e-${date}-${heure}`, date, heure, reaction: 'reaction:explosion' });
const releve = (date, heure, plus = {}) => ({ id: `${date}-${heure}`, date, heure, humeur: null, energie: null, vers: null, faisais: null, ...plus });
const tout = (aujourdhui, premier) => periodeComprendre('tout', aujourdhui, premier);
const bloc = (g, cle) => g.blocs.find((b) => b.cle === cle);
// « oui/n » de chaque barre, dans l'ordre des décalages.
const barres = (b) => b.barres.map((x) => `${x.oui}/${x.n}`);
const barre = (b, decalage) => b.barres.find((x) => x.decalage === decalage);

test('seuils de Comprendre : dans seuils.js, valeurs de la spec (§9)', () => {
  assert.deepEqual(SEUILS.comprendre, { minEvenements: 3, minValeurs: 3, minColonnes: 2, minActivite: 3, minElement: 3 });
});

// ---------- Période ----------

test('periodeComprendre : « 3 mois » couvre [aujourd\'hui − 89, aujourd\'hui], « Tout » part du premier jour noté', () => {
  assert.deepEqual(periodeComprendre('3mois', AUJ, '2025-01-01'), { du: '2026-07-18', au: AUJ });
  assert.deepEqual(periodeComprendre('tout', AUJ, '2025-03-02'), { du: '2025-03-02', au: AUJ });
  assert.deepEqual(periodeComprendre('tout', AUJ, null), { du: AUJ, au: AUJ });
  assert.deepEqual(periodeComprendre('inconnu', AUJ, '2025-03-02'), { du: '2025-03-02', au: AUJ }, '« Tout » par défaut');
});

// ---------- Facteurs ----------

test('facteursParJour : nuit Mal, journée au bureau, humeur à 4 ou moins (humeur du jour), oui / non / inconnu', () => {
  const journal = [
    soir('2026-09-01', { sommeilRessenti: MAL, lieu: 'lieu:bureau', humeur: 4 }),
    soir('2026-09-02', { sommeilRessenti: 'sommeil:moyen', lieu: 'lieu:teletravail', humeur: 5 }),
    soir('2026-09-03', { sommeilRessenti: BIEN, lieu: 'lieu:conge_repos', humeur: 9 }),
    soir('2026-09-04'),
  ];
  // Le 03 : les relevés (moyenne 2) font l'humeur du jour, le soir (9) n'est pas lu. Le 05 : relevés seuls, 4,5.
  const humeurs = [releve('2026-09-03', '10:00', { humeur: 2 }), releve('2026-09-05', '10:00', { humeur: 4 }), releve('2026-09-05', '18:00', { humeur: 5 })];
  const jours = facteursParJour({ journal, humeurs, episodes: [] });
  const lire = (date) => { const j = jours.get(date); return [j.nuitMal, j.bureau, j.humeurBasse, j.humeur, j.lieu]; };
  assert.deepEqual(lire('2026-09-01'), [true, true, true, 4, 'lieu:bureau']);
  assert.deepEqual(lire('2026-09-02'), [false, false, false, 5, 'lieu:teletravail']);
  assert.deepEqual(lire('2026-09-03'), [false, false, true, 2, 'lieu:conge_repos']);
  assert.deepEqual(lire('2026-09-04'), [null, null, null, null, null]);
  assert.deepEqual(lire('2026-09-05'), [null, null, false, 4.5, null]);
});

test('facteursParJour : explosion selon la règle de l\'Analyse ; un jour de relevés seuls reste inconnu, jamais « non »', () => {
  const journal = [
    soir('2026-08-30'), // avant zeroDepuis, sans compteur : inconnu
    soir('2026-08-31', { explosions: 0 }), // compteur noté 0 : non, même avant zeroDepuis
    soir('2026-09-01'), // saisie du soir à partir de zeroDepuis, sans épisode : non
    soir('2026-09-02'), // épisode : oui
    soir('2026-09-03', { explosions: 2 }), // compteur : oui
  ];
  const episodes = [explosion('2026-09-02'), explosion('2026-09-06'), { id: 'x', date: '2026-09-07', heure: '10:00', reaction: 'reaction:rien_fait' }];
  const humeurs = [releve('2026-09-04', '10:00', { humeur: 6 }), releve('2026-09-05', '11:00', { energie: 'energie:haute' })];
  const jours = facteursParJour({ journal, humeurs, episodes, zeroDepuis: '2026-09-01' });
  const explosionDe = (date) => jours.get(date).explosion;
  assert.equal(explosionDe('2026-08-30'), null);
  assert.equal(explosionDe('2026-08-31'), false);
  assert.equal(explosionDe('2026-09-01'), false);
  assert.equal(explosionDe('2026-09-02'), true);
  assert.equal(explosionDe('2026-09-03'), true);
  assert.equal(explosionDe('2026-09-04'), null, 'relevé d\'humeur seul : pas de saisie du soir');
  assert.equal(explosionDe('2026-09-05'), null, 'relevé d\'énergie seul : pas de saisie du soir');
  assert.equal(explosionDe('2026-09-06'), true, 'épisode seul, sans saisie du soir');
  assert.equal(jours.has('2026-09-07'), false, 'un autre épisode ne crée pas de jour');
});

test('facteursParJour : énergie basse dès un relevé « basse » (« vers » compris), non avec des relevés sans « basse », inconnue sans relevé', () => {
  const humeurs = [
    releve('2026-09-01', '09:00', { energie: 'energie:haute' }), releve('2026-09-01', '17:00', { energie: 'energie:basse', humeur: 6 }),
    releve('2026-09-02', '09:00', { energie: 'energie:moyenne' }), releve('2026-09-02', '14:00', { energie: 'energie:haute', vers: true }),
    releve('2026-09-03', '14:00', { energie: 'energie:basse', vers: true }),
    releve('2026-09-04', '10:00', { humeur: 5 }), // humeur seule : pas un relevé d'énergie
  ];
  const jours = facteursParJour({ journal: [soir('2026-09-05')], humeurs, episodes: [] });
  assert.equal(jours.get('2026-09-01').energieBasse, true);
  assert.equal(jours.get('2026-09-02').energieBasse, false);
  assert.equal(jours.get('2026-09-03').energieBasse, true, 'relevé « vers »');
  assert.equal(jours.get('2026-09-04').energieBasse, null);
  assert.equal(jours.get('2026-09-05').energieBasse, null);
});

test('facteursParJour : un relevé « basse » à 01:00 le jour D+1 (ou « vers 0 h ») compte pour le jour D', () => {
  const journal = [soir('2026-09-10'), soir('2026-09-11'), soir('2026-09-12'), soir('2026-09-13')];
  const humeurs = [
    releve('2026-09-11', '01:00', { energie: 'energie:basse' }),
    releve('2026-09-13', '00:00', { energie: 'energie:basse', vers: true }),
    releve('2026-09-13', '04:00', { energie: 'energie:moyenne' }),
  ];
  const jours = facteursParJour({ journal, humeurs, episodes: [] });
  assert.equal(jours.get('2026-09-10').energieBasse, true);
  assert.equal(jours.get('2026-09-11').energieBasse, null, 'rien ne reste sur D+1');
  assert.equal(jours.get('2026-09-12').energieBasse, true);
  assert.equal(jours.get('2026-09-13').energieBasse, false, 'à 04:00, c\'est déjà le jour suivant');
});

test('facteursParJour : contact coûteux, un cas par ligne de la règle, dans l\'ordre de priorité', () => {
  const ligne = (effet, avec = ['contactAvec:amis']) => ({ avec, effet });
  const cas = [
    // 1) une ligne Coûteux : oui, quel que soit contactHumain
    ['Non + ligne Coûteux', { contactHumain: false, contacts: [ligne(COUTEUX)] }, true],
    ['non renseigné + ligne Coûteux', { contactHumain: null, contacts: [ligne(COUTEUX, null)] }, true],
    ['Oui + ligne Coûteux parmi une ligne sans effet', { contactHumain: true, contacts: [ligne(null), ligne(COUTEUX)] }, true],
    // 2) sinon contactHumain à Non : non
    ['Non sans ligne', { contactHumain: false, contacts: null }, false],
    ['Non + ligne sans effet', { contactHumain: false, contacts: [ligne(null)] }, false],
    // 3) sinon au moins une ligne, toutes avec un effet : non
    ['Oui + lignes toutes avec un effet', { contactHumain: true, contacts: [ligne('contactEffet:ressourcant'), ligne('contactEffet:neutre')] }, false],
    ['non renseigné + ligne avec un effet', { contactHumain: null, contacts: [ligne('contactEffet:neutre')] }, false],
    // 4) sinon : inconnu
    ['Oui avec une ligne sans effet', { contactHumain: true, contacts: [ligne(null)] }, null],
    ['Oui + une ligne avec effet, une sans', { contactHumain: true, contacts: [ligne('contactEffet:neutre'), ligne(null)] }, null],
    ['Oui sans ligne', { contactHumain: true, contacts: null }, null],
    ['rien de noté', {}, null],
  ];
  const journal = cas.map(([, champs], i) => soir(addDays('2026-09-01', i), champs));
  const jours = facteursParJour({ journal, humeurs: [], episodes: [] });
  cas.forEach(([nom, , attendu], i) => assert.equal(jours.get(addDays('2026-09-01', i)).contactCouteux, attendu, nom));
});

test('facteursParJour : pesé et rechargé sont connus séparément ; une liste vide est inconnue', () => {
  const journal = [
    soir('2026-09-01', { pese: ['pese:bruit'], recharge: null }),
    soir('2026-09-02', { pese: null, recharge: ['recharge:calme'] }),
    soir('2026-09-03', { pese: [], recharge: [] }),
  ];
  const jours = facteursParJour({ journal, humeurs: [], episodes: [] });
  assert.deepEqual([jours.get('2026-09-01').pese, jours.get('2026-09-01').recharge], [['pese:bruit'], null]);
  assert.deepEqual([jours.get('2026-09-02').pese, jours.get('2026-09-02').recharge], [null, ['recharge:calme']]);
  assert.deepEqual([jours.get('2026-09-03').pese, jours.get('2026-09-03').recharge], [null, null]);
});

test('facteursParJour : les jours sont rangés par date', () => {
  const jours = facteursParJour({
    journal: [soir('2026-09-03'), soir('2026-09-01')],
    humeurs: [releve('2026-09-02', '10:00', { energie: 'energie:basse' })],
    episodes: [explosion('2026-08-31')],
  });
  assert.deepEqual([...jours.keys()], ['2026-08-31', '2026-09-01', '2026-09-02', '2026-09-03']);
});

// ---------- Graphique aligné ----------

test('graphique aligné : un effet planté (nuit Mal la veille) donne les bonnes proportions', () => {
  // 60 soirs du 01/08 au 29/09. Une explosion tous les 6 jours à partir du 06/08 (10 en tout). Nuit Mal la
  // veille des 6 premières, et le 01/08 (un autre jour) ; Bien partout ailleurs.
  const debut = '2026-08-01';
  const dates = plageJours(debut, addDays(debut, 59));
  const exp = dates.filter((_, i) => i % 6 === 5);
  const veillesMal = new Set(exp.slice(0, 6).map((d) => addDays(d, -1)));
  const journal = dates.map((d) => soir(d, { sommeilRessenti: d === debut || veillesMal.has(d) ? MAL : BIEN }));
  const jours = facteursParJour({ journal, humeurs: [], episodes: exp.map((d) => explosion(d)), zeroDepuis: debut });
  const g = explosionsAvant(jours, tout(dates[59], debut));
  assert.equal(g.statut, 'ok');
  assert.deepEqual(g.blocs.map((b) => b.cle), ['nuitMal', 'energieBasse', 'contactCouteux', 'bureau']);
  const nuit = bloc(g, 'nuitMal');
  assert.deepEqual(barres(nuit), ['0/10', '0/10', '6/10', '0/10']);
  assert.deepEqual(barre(nuit, -1), { decalage: -1, oui: 6, n: 10, part: 0.6, peu: false, dates: exp.slice(0, 6) });
  // Autres jours : explosion connue à 0, hors des 3 jours qui précèdent une explosion. Il en reste 20
  // (les 01 et 02/08, puis les deux lendemains de chaque explosion sauf la dernière), dont le 01/08 Mal.
  assert.deepEqual(nuit.autres, { oui: 1, n: 20, part: 0.05, peu: false });
  // Aucun relevé d'énergie : le facteur est inconnu partout, rien n'est compté.
  assert.deepEqual(barre(bloc(g, 'energieBasse'), 0), { decalage: 0, oui: 0, n: 0, part: null, peu: true, dates: [] });
  assert.deepEqual(bloc(g, 'energieBasse').autres, { oui: 0, n: 0, part: null, peu: true });
});

test('graphique aligné : un facteur inconnu sort du compte, aux barres comme au repère des autres jours', () => {
  // Soirs du 01 au 15/09, explosions les 05, 10 et 15. Veilles : 04 Mal, 09 non notée, 14 Bien. Le 06 non noté.
  const nuits = { '2026-09-04': MAL, '2026-09-09': null, '2026-09-06': null };
  const journal = plageJours('2026-09-01', '2026-09-15').map((d) => soir(d, { sommeilRessenti: d in nuits ? nuits[d] : BIEN }));
  const episodes = ['2026-09-05', '2026-09-10', '2026-09-15'].map((d) => explosion(d));
  const jours = facteursParJour({ journal, humeurs: [], episodes, zeroDepuis: '2026-09-01' });
  const nuit = bloc(explosionsAvant(jours, tout('2026-09-15', '2026-09-01')), 'nuitMal');
  assert.deepEqual(barre(nuit, -1), { decalage: -1, oui: 1, n: 2, part: 0.5, peu: true, dates: ['2026-09-05'] });
  assert.deepEqual(barres(nuit), ['0/3', '0/3', '1/2', '0/3']);
  // Autres jours : 01, 06 et 11 ; le 06 n'a pas de nuit notée.
  assert.deepEqual(nuit.autres, { oui: 0, n: 2, part: 0, peu: true });
});

test('graphique aligné : des explosions rapprochées sont toutes comptées, chacune avec ses jours décalés', () => {
  // Soirs du 05 au 15/09, Bien sauf le 10 (Mal). Explosions : deux le 10, une le 11, une le 13.
  const journal = plageJours('2026-09-05', '2026-09-15').map((d) => soir(d, { sommeilRessenti: d === '2026-09-10' ? MAL : BIEN }));
  const episodes = [explosion('2026-09-10', '09:00'), explosion('2026-09-10', '18:00'), explosion('2026-09-11'), explosion('2026-09-13')];
  const jours = facteursParJour({ journal, humeurs: [], episodes, zeroDepuis: '2026-09-01' });
  const periode = tout('2026-09-15', '2026-09-05');
  const avant = bloc(explosionsAvant(jours, periode), 'nuitMal');
  // Trois jours d'explosion (deux le même jour comptent pour un). Le 10 est lu le jour même, la veille du 11
  // et 3 jours avant le 13.
  assert.deepEqual(barres(avant), ['1/3', '0/3', '1/3', '1/3']);
  assert.deepEqual(barre(avant, -3).dates, ['2026-09-13']);
  assert.deepEqual(barre(avant, -1).dates, ['2026-09-11']);
  assert.deepEqual(barre(avant, 0).dates, ['2026-09-10']);
  // Autres jours, avant : 05, 06, 14, 15 (07, 08, 09 et 12 précèdent une explosion).
  assert.equal(avant.autres.n, 4);
  // Après : +3 du 13 tombe après aujourd'hui (15/09) et n'est pas lu.
  const apres = bloc(explosionsApres(jours, periode), 'nuitMal');
  assert.deepEqual(barres(apres), ['0/3', '0/3', '0/2']);
  // Autres jours, après : 05 à 09 (12, 14 et 15 suivent une explosion).
  assert.equal(apres.autres.n, 5);
});

test('graphique aligné : les jours décalés sont lus avant la période, les jours repères pris dans la période', () => {
  // « 3 mois » au 15/10 : du 18/07. Nuit Mal le 17/07 (veille de l'explosion du 18/07) et le 04/07 (veille de
  // celle du 05/07, hors période).
  const journal = plageJours('2026-07-01', AUJ).map((d) => soir(d, { sommeilRessenti: ['2026-07-04', '2026-07-17'].includes(d) ? MAL : BIEN }));
  const episodes = ['2026-07-05', '2026-07-18', '2026-08-10', '2026-09-01'].map((d) => explosion(d));
  const jours = facteursParJour({ journal, humeurs: [], episodes, zeroDepuis: '2026-07-01' });
  const trois = bloc(explosionsAvant(jours, periodeComprendre('3mois', AUJ, '2026-07-01')), 'nuitMal');
  assert.deepEqual(barre(trois, -1), { decalage: -1, oui: 1, n: 3, part: 1 / 3, peu: false, dates: ['2026-07-18'] });
  const toutes = bloc(explosionsAvant(jours, tout(AUJ, '2026-07-01')), 'nuitMal');
  assert.deepEqual(barre(toutes, -1).dates, ['2026-07-05', '2026-07-18']);
  assert.equal(barre(toutes, -1).n, 4);
});

test('aligne : un jour décalé après aujourd\'hui n\'est pas lu ; un jour sans aucune donnée est inconnu', () => {
  const jours = new Map([
    ['2026-09-13', { nuitMal: true }], ['2026-09-14', { nuitMal: true }], ['2026-09-15', { nuitMal: false }], ['2026-09-16', { nuitMal: true }],
  ]);
  const [b] = aligne({
    jours, reperes: ['2026-09-11', '2026-09-13', '2026-09-15'], decalages: [1], facteurs: [{ cle: 'nuitMal', valeur: (j) => j.nuitMal }],
    autres: ['2026-09-13', '2026-09-15', '2026-09-01'], aujourdhui: '2026-09-15',
  });
  // +1 : le 12 n'a pas de donnée, le 14 oui, le 16 est après aujourd'hui.
  assert.deepEqual(b, {
    cle: 'nuitMal',
    barres: [{ decalage: 1, oui: 1, n: 1, part: 1, peu: true, dates: ['2026-09-13'] }],
    autres: { oui: 1, n: 2, part: 0.5, peu: true },
  });
});

// ---------- Les autres jours de chaque graphique ----------

test('autres jours, explosions : les jours qui suivent une explosion d\'avant la période en sont exclus (après), pas ceux d\'avant', () => {
  // « 3 mois » au 15/10 (du 18/07). Explosion le 17/07, hors période : les 18, 19 et 20/07 la suivent.
  // Nuit Mal le 19/07 seulement.
  const journal = plageJours('2026-07-01', AUJ).map((d) => soir(d, { sommeilRessenti: d === '2026-07-19' ? MAL : BIEN }));
  const episodes = ['2026-07-17', '2026-08-10', '2026-09-01', '2026-10-01'].map((d) => explosion(d));
  const jours = facteursParJour({ journal, humeurs: [], episodes, zeroDepuis: '2026-07-01' });
  const periode = periodeComprendre('3mois', AUJ, '2026-07-01');
  assert.equal(bloc(explosionsApres(jours, periode), 'nuitMal').autres.oui, 0);
  assert.equal(bloc(explosionsAvant(jours, periode), 'nuitMal').autres.oui, 1);
  // Autres jours : les 90 jours de la période, moins les 3 jours d'explosion et les jours qui en précèdent une
  // (3 × 3), ou qui en suivent une (3 × 3, plus les 3 qui suivent celle du 17/07).
  assert.equal(bloc(explosionsAvant(jours, periode), 'nuitMal').autres.n, 90 - 12);
  assert.equal(bloc(explosionsApres(jours, periode), 'nuitMal').autres.n, 90 - 3 - 12);
});

test('autres jours, énergie basse : énergie notée sans « basse », sans exclusion de fenêtre', () => {
  const humeurs = [
    releve('2026-09-01', '10:00', { energie: 'energie:moyenne' }),
    releve('2026-09-02', '10:00', { energie: 'energie:basse' }),
    releve('2026-09-03', '10:00', { energie: 'energie:haute' }),
    releve('2026-09-04', '10:00', { energie: 'energie:basse' }),
    releve('2026-09-06', '10:00', { energie: 'energie:basse' }),
    releve('2026-09-07', '10:00', { energie: 'energie:moyenne' }), releve('2026-09-07', '16:00', { energie: 'energie:basse' }),
  ];
  const journal = plageJours('2026-09-01', '2026-09-08').map((d) => soir(d, { sommeilRessenti: d === '2026-09-03' ? MAL : BIEN }));
  const jours = facteursParJour({ journal, humeurs, episodes: [] });
  const g = energieAvant(jours, tout('2026-09-08', '2026-09-01'));
  assert.equal(g.statut, 'ok');
  const nuit = bloc(g, 'nuitMal');
  // Jours repères : 02, 04, 06, 07. Autres : 01 et 03, même s'ils précèdent un jour bas ; ni le 05 ni le 08
  // (énergie non notée).
  assert.equal(barre(nuit, 0).n, 4);
  assert.deepEqual(nuit.autres, { oui: 1, n: 2, part: 0.5, peu: true });
  assert.deepEqual(g.blocs.map((b) => b.cle), ['nuitMal', 'contactCouteux', 'bureau', 'explosion']);
  assert.deepEqual(barre(nuit, -1).dates, ['2026-09-04'], 'la nuit Mal du 03 est la veille du 04');
});

test('autres jours, retour au bureau : hors des fenêtres de tous les retours ; un retour suit une veille notée ailleurs', () => {
  const lieux = {
    '2026-09-01': 'teletravail', '2026-09-02': 'bureau', '2026-09-03': 'bureau', '2026-09-04': 'conge_repos', '2026-09-05': null,
    '2026-09-06': 'bureau', '2026-09-07': 'teletravail', '2026-09-08': 'bureau', '2026-09-09': 'teletravail', '2026-09-10': 'teletravail',
    '2026-09-11': 'teletravail', '2026-09-12': 'bureau', '2026-09-13': 'teletravail', '2026-09-14': 'teletravail',
    '2026-09-15': 'teletravail', '2026-09-16': 'teletravail',
  };
  const journal = Object.entries(lieux).map(([d, l]) => soir(d, { lieu: l && `lieu:${l}`, sommeilRessenti: d === '2026-09-16' ? MAL : BIEN }));
  const jours = facteursParJour({ journal, humeurs: [], episodes: [] });
  const g = retoursBureau(jours, tout('2026-09-16', '2026-09-01'));
  assert.equal(g.statut, 'ok');
  assert.deepEqual(g.blocs.map((b) => b.cle), ['humeurBasse', 'nuitMal', 'energieBasse', 'explosion', 'contactCouteux']);
  const nuit = bloc(g, 'nuitMal');
  assert.deepEqual(nuit.barres.map((x) => x.decalage), [-1, 0, 1, 2]);
  // Retours : 02, 08 et 12 (le 03 suit un jour au bureau, le 06 une veille sans lieu).
  assert.deepEqual(barre(nuit, 0), { decalage: 0, oui: 0, n: 3, part: 0, peu: false, dates: [] });
  // Fenêtres : 01 à 04, 07 à 10, 11 à 14. Autres jours : 05 (sans lieu), 06, 15 et 16 (Mal).
  assert.deepEqual(nuit.autres, { oui: 1, n: 4, part: 0.25, peu: false });
});

// ---------- Éléments pesés et rechargés ----------

test('elementsFrequents : les éléments notés au moins `min` jours de la période, un jour comptant une fois', () => {
  const journal = [
    soir('2026-08-31', { pese: ['pese:monde'] }), // hors période
    soir('2026-09-01', { pese: ['pese:bruit', 'pese:bruit', 'pese:monde'] }),
    soir('2026-09-02', { pese: ['pese:bruit', 'pese:monde'], recharge: ['recharge:calme'] }),
    soir('2026-09-03', { pese: ['pese:trajets'], recharge: ['recharge:calme'] }),
    soir('2026-09-04', { pese: ['pese:trajets'], recharge: ['recharge:calme'] }),
    soir('2026-09-05', { pese: ['pese:trajets', 'pese:bruit'] }),
  ];
  const jours = facteursParJour({ journal, humeurs: [], episodes: [] });
  const periode = { du: '2026-09-01', au: '2026-09-05' };
  assert.deepEqual(elementsFrequents(jours, periode, 'pese', 3), ['pese:bruit', 'pese:trajets']);
  assert.deepEqual(elementsFrequents(jours, periode, 'pese', 2), ['pese:bruit', 'pese:monde', 'pese:trajets']);
  assert.deepEqual(elementsFrequents(jours, periode, 'recharge', 3), ['recharge:calme']);
  assert.deepEqual(elementsFrequents(jours, { du: '2026-09-02', au: '2026-09-05' }, 'recharge', 3), ['recharge:calme']);
  assert.deepEqual(elementsFrequents(jours, { du: '2026-09-03', au: '2026-09-05' }, 'recharge', 3), []);
});

test('graphique aligné : pesé et rechargé lus indépendamment, dans l\'ordre de leur liste', () => {
  // Jours à énergie basse : 02, 06, 10. Autres (énergie moyenne) : 12 et 14.
  const journal = [
    soir('2026-09-02', { pese: ['pese:bruit'], recharge: null }),
    soir('2026-09-06', { pese: null, recharge: ['recharge:seul'] }),
    soir('2026-09-10', { pese: ['pese:monde'], recharge: ['recharge:calme'] }),
    soir('2026-09-12', { pese: ['pese:trajets', 'pese:bruit'], recharge: ['recharge:calme'] }),
    soir('2026-09-14', { pese: ['pese:bruit', 'pese:trajets'], recharge: ['recharge:calme'] }),
    soir('2026-09-15', { pese: ['pese:trajets'] }),
  ];
  const humeurs = [
    ...['2026-09-02', '2026-09-06', '2026-09-10'].map((d) => releve(d, '10:00', { energie: 'energie:basse' })),
    ...['2026-09-12', '2026-09-14'].map((d) => releve(d, '10:00', { energie: 'energie:moyenne' })),
  ];
  // Liste réordonnée dans Réglages : Trajets avant Bruit.
  const items = [
    { id: 'pese:trajets', liste: 'pese', ordre: 10 }, { id: 'pese:monde', liste: 'pese', ordre: 30 },
    { id: 'pese:bruit', liste: 'pese', ordre: 50 }, { id: 'recharge:calme', liste: 'recharge', ordre: 20 },
  ];
  const jours = facteursParJour({ journal, humeurs, episodes: [] });
  const g = energieAvant(jours, tout('2026-09-15', '2026-09-02'), items);
  assert.deepEqual(g.blocs.map((b) => b.cle), ['nuitMal', 'contactCouteux', 'bureau', 'explosion', 'pese:trajets', 'pese:bruit', 'recharge:calme']);
  assert.deepEqual(g.blocs.slice(4).map((b) => b.liste), ['pese', 'pese', 'recharge']);
  // Le jour même : le 06 n'a rien de pesé (inconnu pour Bruit), le 02 rien de rechargé (inconnu pour Calme).
  assert.deepEqual(barre(bloc(g, 'pese:bruit'), 0), { decalage: 0, oui: 1, n: 2, part: 0.5, peu: true, dates: ['2026-09-02'] });
  assert.deepEqual(barre(bloc(g, 'recharge:calme'), 0), { decalage: 0, oui: 1, n: 2, part: 0.5, peu: true, dates: ['2026-09-10'] });
  assert.deepEqual(bloc(g, 'pese:bruit').autres, { oui: 2, n: 2, part: 1, peu: true });
  // Sans liste fournie : les éléments restent, rangés par identifiant.
  assert.deepEqual(energieAvant(jours, tout('2026-09-15', '2026-09-02')).blocs.slice(4).map((b) => b.cle), ['pese:bruit', 'pese:trajets', 'recharge:calme']);
});

test('graphique aligné : avant les explosions, les éléments pesés ; après, les éléments rechargés', () => {
  const dates = ['2026-09-02', '2026-09-06', '2026-09-10'];
  const journal = dates.flatMap((d) => [soir(d, { pese: ['pese:bruit'], recharge: ['recharge:calme'] }), soir(addDays(d, 1), { recharge: ['recharge:seul'] })]);
  const jours = facteursParJour({ journal, humeurs: [], episodes: dates.map((d) => explosion(d)), zeroDepuis: '2026-09-01' });
  const periode = tout('2026-09-15', '2026-09-02');
  assert.deepEqual(explosionsAvant(jours, periode).blocs.map((b) => b.cle), ['nuitMal', 'energieBasse', 'contactCouteux', 'bureau', 'pese:bruit']);
  const apres = explosionsApres(jours, periode);
  assert.deepEqual(apres.blocs.map((b) => b.cle), ['humeurBasse', 'energieBasse', 'nuitMal', 'recharge:calme', 'recharge:seul']);
  assert.deepEqual(barres(bloc(apres, 'recharge:seul')), ['3/3', '0/0', '0/0']);
  assert.deepEqual(apres.blocs[0].barres.map((x) => x.decalage), [1, 2, 3]);
});

// ---------- Seuils ----------

test('seuils : 3 jours d\'explosion (deux le même jour comptent pour un), 3 jours à énergie basse, 3 retours', () => {
  const periode = tout('2026-09-30', '2026-09-01');
  const avecExplosions = (dates) => facteursParJour({ journal: [soir('2026-09-01')], humeurs: [], episodes: dates.map((d, i) => explosion(d, `1${i}:00`)) });
  const deux = avecExplosions(['2026-09-05', '2026-09-05', '2026-09-10']);
  assert.deepEqual(explosionsAvant(deux, periode), { statut: 'insuffisant', blocs: [] });
  assert.deepEqual(explosionsApres(deux, periode), { statut: 'insuffisant', blocs: [] });
  const trois = avecExplosions(['2026-09-05', '2026-09-10', '2026-09-20']);
  assert.equal(explosionsAvant(trois, periode).statut, 'ok');
  assert.equal(explosionsApres(trois, periode).statut, 'ok');
  // Les repères se prennent dans la période : une explosion d'avant ne compte pas.
  assert.equal(explosionsAvant(trois, { du: '2026-09-06', au: '2026-09-30' }).statut, 'insuffisant');

  const basses = (dates) => facteursParJour({ journal: [], humeurs: dates.map((d) => releve(d, '10:00', { energie: 'energie:basse' })), episodes: [] });
  assert.equal(energieAvant(basses(['2026-09-05', '2026-09-08']), periode).statut, 'insuffisant');
  assert.equal(energieAvant(basses(['2026-09-05', '2026-09-08', '2026-09-12']), periode).statut, 'ok');

  const retours = (n) => facteursParJour({
    journal: Array.from({ length: n }, (_, i) => [soir(addDays('2026-09-01', 4 * i), { lieu: 'lieu:teletravail' }), soir(addDays('2026-09-02', 4 * i), { lieu: 'lieu:bureau' })]).flat(),
    humeurs: [], episodes: [],
  });
  assert.equal(retoursBureau(retours(2), periode).statut, 'insuffisant');
  assert.equal(retoursBureau(retours(3), periode).statut, 'ok');
});

test('seuils : une barre ou un repère qui repose sur moins de 3 valeurs est « peu de valeurs »', () => {
  // Rien le 05 : à +2, le repère du 03 n'est pas compté.
  const jours = new Map(['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04'].map((d, i) => [d, { nuitMal: i % 2 === 0 }]));
  const [b] = aligne({
    jours, reperes: ['2026-09-01', '2026-09-02', '2026-09-03'], decalages: [0, 2], facteurs: [{ cle: 'nuitMal', valeur: (j) => j.nuitMal }],
    autres: ['2026-09-02', '2026-09-04'], aujourdhui: '2026-09-05',
  });
  assert.deepEqual(b.barres.map((x) => [x.n, x.peu]), [[3, false], [2, true]]);
  assert.deepEqual([b.autres.n, b.autres.peu], [2, true]);
});

test('seuils : un élément pesé n\'apparaît qu\'à partir de 3 jours notés sur la période', () => {
  const dates = ['2026-09-02', '2026-09-06', '2026-09-10'];
  const journal = [...dates.map((d, i) => soir(d, { pese: i < 2 ? ['pese:bruit', 'pese:monde'] : ['pese:monde'] })), soir('2026-08-20', { pese: ['pese:bruit'] })];
  const jours = facteursParJour({ journal, humeurs: [], episodes: dates.map((d) => explosion(d)) });
  const g = explosionsAvant(jours, tout('2026-09-15', '2026-09-01'));
  assert.equal(bloc(g, 'pese:bruit'), undefined, 'noté 2 fois dans la période (le 20/08 est avant)');
  assert.ok(bloc(g, 'pese:monde'));
});
