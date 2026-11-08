import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { addDays, jourSemaine, plageJours } from '../../public/js/domain/dates.js';
import { SEUILS } from '../../public/js/analyse/seuils.js';
import {
  periodeComprendre, facteursParJour, aligne, elementsFrequents,
  explosionsAvant, explosionsApres, energieAvant, retoursBureau,
  MESURES, parColonnes, energieParActivite, peseRecharge, mesNuits, periodeMesNuits,
} from '../../public/js/analyse/comprendre.js';
import { texteNuit, texteHeuresNuit } from '../../public/js/analyse/textes.js';
import { analyserFichiers, remplacer } from '../../public/js/db/sauvegarde.js';
import { RACINE } from '../aides/fichiers.js';
import { nouveauRepo } from '../aides/repo.js';

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
  assert.deepEqual(SEUILS.comprendre, { minEvenements: 3, minValeurs: 3, minColonnes: 2, minActivite: 3, minElement: 3, nuitsSemaines: 4 });
});

// ---------- Période ----------

test('periodeComprendre : « 3 mois » couvre [aujourd\'hui − 89, aujourd\'hui], « Tout » part du premier jour noté', () => {
  assert.deepEqual(periodeComprendre('3mois', AUJ, '2025-01-01'), { du: '2026-07-18', au: AUJ });
  assert.deepEqual(periodeComprendre('tout', AUJ, '2025-03-02'), { du: '2025-03-02', au: AUJ });
  assert.deepEqual(periodeComprendre('tout', AUJ, null), { du: AUJ, au: AUJ });
  assert.deepEqual(periodeComprendre('inconnu', AUJ, '2025-03-02'), { du: '2025-03-02', au: AUJ }, '« Tout » par défaut');
});

// ---------- Facteurs ----------

test('facteursParJour : nuit Mal, journée au bureau, oui / non / inconnu ; v7, les familles du jour, plus la note', () => {
  const journal = [
    soir('2026-09-01', { sommeilRessenti: MAL, lieu: 'lieu:bureau', humeur: 4 }),
    soir('2026-09-02', { sommeilRessenti: 'sommeil:moyen', lieu: 'lieu:teletravail', humeur: 5 }),
    soir('2026-09-03', { sommeilRessenti: BIEN, lieu: 'lieu:conge_repos', humeur: 9 }),
    soir('2026-09-04'),
  ];
  // Le 03 : deux émotions, dans l'ordre des heures. Le 05 : une émotion seule (un jour de relevés seuls). Le 06 : une
  // ancienne note seule, qui ne crée plus de jour.
  const humeurs = [
    releve('2026-09-03', '18:00', { emotion: 'roue:serenite:calme' }), releve('2026-09-03', '10:00', { emotion: 'roue:colere' }),
    releve('2026-09-05', '10:00', { emotion: 'roue:joie:amuse' }), releve('2026-09-06', '10:00', { humeur: 4 }),
  ];
  const jours = facteursParJour({ journal, humeurs, episodes: [] });
  const lire = (date) => { const j = jours.get(date); return [j.nuitMal, j.bureau, j.lieu, j.familles]; };
  assert.deepEqual(lire('2026-09-01'), [true, true, 'lieu:bureau', []]);
  assert.deepEqual(lire('2026-09-02'), [false, false, 'lieu:teletravail', []]);
  assert.deepEqual(lire('2026-09-03'), [false, false, 'lieu:conge_repos', ['colere', 'serenite']]);
  assert.deepEqual(lire('2026-09-04'), [null, null, null, []]);
  assert.deepEqual(lire('2026-09-05'), [null, null, null, ['joie']]);
  assert.equal(jours.has('2026-09-06'), false);
  for (const j of jours.values()) for (const cle of ['humeur', 'humeurBasse']) assert.equal(cle in j, false, cle);
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
  const humeurs = [releve('2026-09-04', '10:00', { emotion: 'roue:peur' }), releve('2026-09-05', '11:00', { energie: 'energie:haute' })];
  const jours = facteursParJour({ journal, humeurs, episodes, zeroDepuis: '2026-09-01' });
  const explosionDe = (date) => jours.get(date).explosion;
  assert.equal(explosionDe('2026-08-30'), null);
  assert.equal(explosionDe('2026-08-31'), false);
  assert.equal(explosionDe('2026-09-01'), false);
  assert.equal(explosionDe('2026-09-02'), true);
  assert.equal(explosionDe('2026-09-03'), true);
  assert.equal(explosionDe('2026-09-04'), null, 'relevé d\'émotion seul : pas de saisie du soir');
  assert.equal(explosionDe('2026-09-05'), null, 'relevé d\'énergie seul : pas de saisie du soir');
  assert.equal(explosionDe('2026-09-06'), true, 'épisode seul, sans saisie du soir');
  assert.equal(jours.has('2026-09-07'), false, 'un autre épisode ne crée pas de jour');
});

test('facteursParJour : énergie basse dès un relevé « basse » (« vers » compris), non avec des relevés sans « basse », inconnue sans relevé', () => {
  const humeurs = [
    releve('2026-09-01', '09:00', { energie: 'energie:haute' }), releve('2026-09-01', '17:00', { energie: 'energie:basse', humeur: 6 }),
    releve('2026-09-02', '09:00', { energie: 'energie:moyenne' }), releve('2026-09-02', '14:00', { energie: 'energie:haute', vers: true }),
    releve('2026-09-03', '14:00', { energie: 'energie:basse', vers: true }),
    releve('2026-09-04', '10:00', { emotion: 'roue:surprise' }), // émotion seule : pas un relevé d'énergie
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
  assert.deepEqual(g.blocs.map((b) => b.cle), ['nuitMal', 'contactCouteux', 'bureau', 'explosion', 'energieHaute', 'hyperfocus']);
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
  assert.deepEqual(g.blocs.map((b) => b.cle), ['nuitMal', 'energieBasse', 'explosion', 'contactCouteux'], 'v7 : plus d\'« humeur à 4 ou moins »');
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
  assert.deepEqual(g.blocs.map((b) => b.cle), ['nuitMal', 'contactCouteux', 'bureau', 'explosion', 'energieHaute', 'hyperfocus', 'pese:trajets', 'pese:bruit', 'recharge:calme']);
  assert.deepEqual(g.blocs.slice(6).map((b) => b.liste), ['pese', 'pese', 'recharge']);
  // Le jour même : le 06 n'a rien de pesé (inconnu pour Bruit), le 02 rien de rechargé (inconnu pour Calme).
  assert.deepEqual(barre(bloc(g, 'pese:bruit'), 0), { decalage: 0, oui: 1, n: 2, part: 0.5, peu: true, dates: ['2026-09-02'] });
  assert.deepEqual(barre(bloc(g, 'recharge:calme'), 0), { decalage: 0, oui: 1, n: 2, part: 0.5, peu: true, dates: ['2026-09-10'] });
  assert.deepEqual(bloc(g, 'pese:bruit').autres, { oui: 2, n: 2, part: 1, peu: true });
  // Sans liste fournie : les éléments restent, rangés par identifiant.
  assert.deepEqual(energieAvant(jours, tout('2026-09-15', '2026-09-02')).blocs.slice(6).map((b) => b.cle), ['pese:bruit', 'pese:trajets', 'recharge:calme']);
});

test('graphique aligné : avant les explosions, les éléments pesés ; après, les éléments rechargés', () => {
  const dates = ['2026-09-02', '2026-09-06', '2026-09-10'];
  const journal = dates.flatMap((d) => [soir(d, { pese: ['pese:bruit'], recharge: ['recharge:calme'] }), soir(addDays(d, 1), { recharge: ['recharge:seul'] })]);
  const jours = facteursParJour({ journal, humeurs: [], episodes: dates.map((d) => explosion(d)), zeroDepuis: '2026-09-01' });
  const periode = tout('2026-09-15', '2026-09-02');
  assert.deepEqual(explosionsAvant(jours, periode).blocs.map((b) => b.cle), ['nuitMal', 'energieBasse', 'contactCouteux', 'bureau', 'pese:bruit']);
  const apres = explosionsApres(jours, periode);
  assert.deepEqual(apres.blocs.map((b) => b.cle), ['energieBasse', 'nuitMal', 'recharge:calme', 'recharge:seul'], 'v7 : plus d\'« humeur à 4 ou moins »');
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

// ---------- Colonnes : jour de la semaine, lieu, mois (§2.5, graphiques 1, 2 et 5) ----------

// Le 07/09/2026 est un lundi : 07, 14, 21 et 28 sont des lundis, 08, 15, 22 et 29 des mardis, 09, 16, 23 et 30 des mercredis.
const colonnesDe = (journal, humeurs = []) => facteursParJour({ journal, humeurs, episodes: [] });

test('mesures de Comprendre : émotions (v7, à la place de l\'humeur), nuits Mal, explosions, énergie basse', () => {
  assert.deepEqual(MESURES, ['emotions', 'nuitMal', 'explosion', 'energieBasse']);
});

test('colonnes, semaine : sept colonnes du lundi au dimanche ; la mesure « emotions » compte les relevés par famille (v7)', () => {
  assert.equal(jourSemaine('2026-09-07'), 0);
  // Lundis 07 et 14 : colère, colère ; sérénité. Mardi 08 : joie (et une ancienne note, qui ne compte pas). Le 10/09 à 01:00
  // est le mercredi 09.
  const humeurs = [
    releve('2026-09-07', '10:00', { emotion: 'roue:colere:irrite' }), releve('2026-09-07', '18:00', { emotion: 'roue:colere' }),
    releve('2026-09-14', '10:00', { emotion: 'roue:serenite:calme' }), releve('2026-09-08', '10:00', { emotion: 'roue:joie', humeur: null }),
    releve('2026-09-08', '12:00', { humeur: 6 }), releve('2026-09-10', '01:00', { emotion: 'roue:peur' }),
  ];
  const g = parColonnes(colonnesDe([], humeurs), tout('2026-09-23', '2026-09-07'), { cle: 'semaine', mesure: 'emotions' });
  assert.equal(g.statut, 'ok');
  assert.deepEqual(g.colonnes.map((c) => c.cle), [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual([g.colonnes[0].n, g.colonnes[0].jours, g.colonnes[0].familles.colere, g.colonnes[0].familles.serenite], [3, 2, 2, 1]);
  assert.deepEqual([g.colonnes[1].n, g.colonnes[1].familles.joie], [1, 1]);
  assert.deepEqual([g.colonnes[2].n, g.colonnes[2].familles.peur], [1, 1], 'le relevé de 01:00 compte pour la veille');
  assert.deepEqual([g.colonnes[3].n, g.colonnes[3].jours], [0, 0], 'un jeudi sans émotion : colonne vide');
  // Sous 5 relevés : aucune colonne.
  assert.deepEqual(parColonnes(colonnesDe([], humeurs.slice(0, 4)), tout('2026-09-23', '2026-09-07'), { cle: 'semaine', mesure: 'emotions' }),
    { statut: 'insuffisant', colonnes: [] });
});

test('colonnes, semaine : une barre par colonne, libellée par le seul compte ; aucun dénominateur', () => {
  const journal = [
    // Lundis : explosion oui, oui, non, inconnu. Mardis : non, non, oui. Un mercredi : non.
    ...[['2026-09-07', 1], ['2026-09-14', 1], ['2026-09-21', 0], ['2026-09-28', null],
      ['2026-09-08', 0], ['2026-09-15', 0], ['2026-09-22', 2], ['2026-09-09', 0]].map(([d, x]) => soir(d, { explosions: x })),
  ];
  const g = parColonnes(colonnesDe(journal), tout('2026-09-30', '2026-09-01'), { cle: 'semaine', mesure: 'explosion' });
  assert.equal(g.statut, 'ok');
  assert.deepEqual(g.colonnes[0], { cle: 0, n: 3, oui: 2, part: 2 / 3, fragile: false, libelle: '2 lundis' });
  assert.deepEqual(g.colonnes[1], { cle: 1, n: 3, oui: 1, part: 1 / 3, fragile: false, libelle: '1 mardi' });
  assert.deepEqual(g.colonnes[2], { cle: 2, n: 1, oui: 0, part: 0, fragile: true, libelle: '0 mercredi' });
  assert.deepEqual(g.colonnes[3], { cle: 3, n: 0, oui: 0, part: null, fragile: true, libelle: null }); // aucune valeur : pas d'étiquette, jamais « 0 jeudi »
  // Un compte et un nom de jour : jamais « 2 sur 3 », jamais le nombre de jours connus. Il n'est que dans `n`.
  for (const c of g.colonnes.filter((x) => x.n > 0)) {
    assert.match(c.libelle, /^\d+ [a-z]+$/);
    assert.ok(!/ sur |\//.test(c.libelle), c.libelle);
  }
  // Un jour sans valeur connue est un silence : pas d'étiquette, donc pas de zéro. Un vrai zéro (n > 0) reste dit.
  assert.deepEqual(g.colonnes.map((c) => c.libelle === null), g.colonnes.map((c) => c.n === 0));
});

test('colonnes, semaine : une nuit notée Mal compte au jour noté ; une énergie basse notée « vers » compte aussi', () => {
  // Trois nuits Mal notées les mardis 08, 15, 22 (« la nuit qui précède ce jour » : jamais le lundi), Bien les lundis.
  const journal = [
    ...['2026-09-08', '2026-09-15', '2026-09-22'].map((d) => soir(d, { sommeilRessenti: MAL })),
    ...['2026-09-07', '2026-09-14', '2026-09-21'].map((d) => soir(d, { sommeilRessenti: BIEN })),
  ];
  const g = parColonnes(colonnesDe(journal), tout('2026-09-22', '2026-09-07'), { cle: 'semaine', mesure: 'nuitMal' });
  assert.deepEqual(g.colonnes.slice(0, 2).map((c) => [c.cle, c.oui, c.n, c.libelle]), [[0, 0, 3, '0 lundi'], [1, 3, 3, '3 mardis']]);

  const humeurs = ['2026-09-07', '2026-09-14', '2026-09-21'].map((d) => releve(d, '10:00', { energie: 'energie:basse', vers: true }));
  const basse = parColonnes(colonnesDe([], [...humeurs, ...['2026-09-08', '2026-09-15', '2026-09-22'].map((d) => releve(d, '10:00', { energie: 'energie:haute' }))]),
    tout('2026-09-22', '2026-09-07'), { cle: 'semaine', mesure: 'energieBasse' });
  assert.deepEqual(basse.colonnes.slice(0, 2).map((c) => [c.oui, c.n]), [[3, 3], [0, 3]]);
});

test('colonnes, semaine : minuit et bascule de 4 h, un relevé à 01:00 ou 03:59 compte pour la veille, à 04:00 pour le jour', () => {
  // Relevés « basse » le 08 à 01:00 (jour logique : le lundi 07), le 15 à 03:59 (le lundi 14) et le 22 à 04:00 (le mardi 22) ;
  // relevés « haute » à 10:00 les mardis 08, 15 et 22 et le lundi 21, pour que chaque colonne ait 3 jours connus.
  const humeurs = [
    releve('2026-09-08', '01:00', { energie: 'energie:basse' }), // lundi 07
    releve('2026-09-15', '03:59', { energie: 'energie:basse' }), // lundi 14
    releve('2026-09-22', '04:00', { energie: 'energie:basse' }), // mardi 22
    releve('2026-09-08', '10:00', { energie: 'energie:haute' }), // mardi 08
    releve('2026-09-15', '10:00', { energie: 'energie:haute' }), // mardi 15
    releve('2026-09-21', '10:00', { energie: 'energie:haute' }), // lundi 21
    releve('2026-09-22', '10:00', { energie: 'energie:haute' }), // mardi 22 (aussi une journée « basse »)
  ];
  const g = parColonnes(colonnesDe([], humeurs), tout('2026-09-30', '2026-09-01'), { cle: 'semaine', mesure: 'energieBasse' });
  assert.equal(g.statut, 'ok');
  assert.deepEqual([g.colonnes[0].oui, g.colonnes[0].n], [2, 3], 'les lundis 07 et 14 (relevés après minuit), 21 non');
  assert.deepEqual([g.colonnes[1].oui, g.colonnes[1].n], [1, 3], 'le mardi 22 seulement (04:00)');
});

test('colonnes, semaine : seuls les jours de la période comptent, bornes comprises (aujourd\'hui compris)', () => {
  // Nuits Mal les lundis 07, 14, 21 et 28/09, Bien le 31/08 et le 05/10 ; mardis Bien. Période du 07 au 28/09 (le 28 est aujourd'hui).
  const journal = [
    ...['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28'].map((d) => soir(d, { sommeilRessenti: MAL })),
    ...['2026-08-31', '2026-10-05', '2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22', '2026-09-29'].map((d) => soir(d, { sommeilRessenti: BIEN })),
  ];
  const g = parColonnes(colonnesDe(journal), { du: '2026-09-07', au: '2026-09-28' }, { cle: 'semaine', mesure: 'nuitMal' });
  assert.deepEqual([g.colonnes[0].oui, g.colonnes[0].n], [4, 4]);
  assert.deepEqual([g.colonnes[1].oui, g.colonnes[1].n], [0, 3], 'mardis 08, 15 et 22 : ni le 01 ni le 29');
});

test('colonnes, lieu : une colonne par lieu présent, dans l\'ordre de la liste ; un lieu hors liste va à la fin ; jour sans lieu écarté', () => {
  const lieu = (d, l, sommeil) => soir(d, { lieu: l && `lieu:${l}`, sommeilRessenti: sommeil });
  const journal = [
    lieu('2026-09-01', 'teletravail', MAL), lieu('2026-09-02', 'teletravail', BIEN), lieu('2026-09-03', 'teletravail', BIEN),
    lieu('2026-09-04', 'bureau', MAL), lieu('2026-09-05', 'bureau', MAL), lieu('2026-09-06', 'bureau', 'sommeil:moyen'), lieu('2026-09-08', 'bureau', null),
    lieu('2026-09-07', 'ailleurs', BIEN),
    lieu('2026-09-09', null, MAL),
  ];
  const items = [
    { id: 'lieu:bureau', liste: 'lieu', ordre: 20 }, { id: 'lieu:teletravail', liste: 'lieu', ordre: 10 },
    { id: 'lieu:conge_repos', liste: 'lieu', ordre: 30 }, // dans la liste, absent des données : pas de colonne
  ];
  const periode = tout('2026-09-30', '2026-09-01');
  const g = parColonnes(colonnesDe(journal), periode, { cle: 'lieu', mesure: 'nuitMal' }, items);
  assert.equal(g.statut, 'ok');
  assert.deepEqual(g.colonnes.map((c) => c.cle), ['lieu:teletravail', 'lieu:bureau', 'lieu:ailleurs']);
  assert.deepEqual(g.colonnes.map((c) => [c.oui, c.n, c.libelle]), [[1, 3, '1 jour'], [2, 3, '2 jours'], [0, 1, '0 jour']]);
  assert.equal(g.colonnes[2].fragile, true);
  // Sans liste fournie : rangés par identifiant.
  assert.deepEqual(parColonnes(colonnesDe(journal), periode, { cle: 'lieu', mesure: 'nuitMal' }).colonnes.map((c) => c.cle),
    ['lieu:ailleurs', 'lieu:bureau', 'lieu:teletravail']);
});

test('colonnes, lieu : les émotions par lieu, des jours où le lieu est noté (v7)', () => {
  const journal = [
    ...['2026-09-01', '2026-09-02', '2026-09-03'].map((d) => soir(d, { lieu: 'lieu:bureau' })),
    ...['2026-09-04', '2026-09-05'].map((d) => soir(d, { lieu: 'lieu:teletravail' })),
    soir('2026-09-06'),
  ];
  const humeurs = [
    ...['2026-09-01', '2026-09-02', '2026-09-03'].map((d) => releve(d, '10:00', { emotion: 'roue:colere:hostile' })),
    ...['2026-09-04', '2026-09-05'].map((d) => releve(d, '10:00', { emotion: 'roue:serenite' })),
    releve('2026-09-06', '10:00', { emotion: 'roue:joie' }), // sans lieu noté : écarté
  ];
  const g = parColonnes(colonnesDe(journal, humeurs), tout('2026-09-30', '2026-09-01'), { cle: 'lieu', mesure: 'emotions' });
  assert.deepEqual(g.colonnes.map((c) => [c.cle, c.n, c.familles.colere, c.familles.serenite, c.familles.joie]),
    [['lieu:bureau', 3, 3, 0, 0], ['lieu:teletravail', 2, 0, 2, 0]]);
});

test('colonnes, mois : une colonne par mois calendaire de la période, vide ou non ; le jour logique fait foi', () => {
  const humeurs = [
    // Juillet : basse, haute, basse (3 jours).
    releve('2026-07-20', '10:00', { energie: 'energie:basse' }), releve('2026-07-21', '10:00', { energie: 'energie:haute' }), releve('2026-07-22', '10:00', { energie: 'energie:basse' }),
    // Août : rien. Septembre : basse les 10 et 12, moyenne le 11, et un relevé du 01/10 à 03:59, qui est le 30/09.
    releve('2026-09-10', '10:00', { energie: 'energie:basse' }), releve('2026-09-11', '10:00', { energie: 'energie:moyenne' }), releve('2026-09-12', '10:00', { energie: 'energie:basse' }),
    releve('2026-10-01', '03:59', { energie: 'energie:basse' }),
    // Octobre : le 01/10 à 04:00 est bien le 01/10.
    releve('2026-10-01', '04:00', { energie: 'energie:haute' }),
  ];
  const g = parColonnes(colonnesDe([], humeurs), { du: '2026-07-01', au: AUJ }, { cle: 'mois', mesure: 'energieBasse' });
  assert.equal(g.statut, 'ok');
  assert.deepEqual(g.colonnes.map((c) => [c.cle, c.oui, c.n, c.libelle]), [
    ['2026-07', 2, 3, '2 jours'], ['2026-08', 0, 0, null], ['2026-09', 3, 4, '3 jours'], ['2026-10', 0, 1, '0 jour'],
  ]);
  assert.deepEqual(g.colonnes.map((c) => c.fragile), [false, true, false, true]);
});

test('colonnes, mois : les émotions d\'un mois à cheval sur la bascule de 4 h (v7)', () => {
  // Le relevé du 01/10 à 02:00 est du 30/09.
  const humeurs = [
    releve('2026-09-28', '10:00', { emotion: 'roue:peur' }), releve('2026-09-29', '10:00', { emotion: 'roue:peur' }), releve('2026-10-01', '02:00', { emotion: 'roue:tristesse:vide' }),
    releve('2026-10-02', '10:00', { emotion: 'roue:joie' }), releve('2026-10-03', '10:00', { emotion: 'roue:joie' }), releve('2026-10-04', '04:00', { emotion: 'roue:surprise' }),
  ];
  const g = parColonnes(colonnesDe([], humeurs), tout('2026-10-15', '2026-09-28'), { cle: 'mois', mesure: 'emotions' });
  assert.deepEqual(g.colonnes.map((c) => [c.cle, c.n, c.familles.peur, c.familles.tristesse, c.familles.joie]), [['2026-09', 3, 2, 1, 0], ['2026-10', 3, 0, 0, 2]]);
});

test('colonnes, seuils : 2 colonnes à au moins 3 valeurs (jour de la semaine, lieu), 2 mois à au moins 3 valeurs', () => {
  const nuits = (dates, sommeil = MAL) => dates.map((d) => soir(d, { sommeilRessenti: sommeil }));
  const lundis = ['2026-09-07', '2026-09-14', '2026-09-21'];
  const mardis = ['2026-09-08', '2026-09-15', '2026-09-22'];
  const semaine = (journal) => parColonnes(colonnesDe(journal), tout('2026-09-30', '2026-09-01'), { cle: 'semaine', mesure: 'nuitMal' });
  assert.deepEqual(semaine(nuits(lundis)), { statut: 'insuffisant', colonnes: [] }, 'une colonne');
  assert.deepEqual(semaine([...nuits(lundis), ...nuits(mardis.slice(0, 2))]), { statut: 'insuffisant', colonnes: [] }, 'une colonne et une de 2 valeurs');
  assert.equal(semaine([...nuits(lundis), ...nuits(mardis)]).statut, 'ok');
  assert.deepEqual(semaine([]), { statut: 'insuffisant', colonnes: [] });

  // Les valeurs inconnues ne comptent pas : trois jours sans nuit notée ne font pas une colonne.
  assert.equal(semaine([...nuits(lundis), ...mardis.map((d) => soir(d))]).statut, 'insuffisant');

  const lieux = (l1, l2) => [...l1.map((d) => soir(d, { lieu: 'lieu:bureau', sommeilRessenti: MAL })), ...l2.map((d) => soir(d, { lieu: 'lieu:teletravail', sommeilRessenti: MAL }))];
  const parLieu = (journal) => parColonnes(colonnesDe(journal), tout('2026-09-30', '2026-09-01'), { cle: 'lieu', mesure: 'nuitMal' });
  assert.equal(parLieu(lieux(lundis, mardis.slice(0, 2))).statut, 'insuffisant');
  assert.equal(parLieu(lieux(lundis, mardis)).statut, 'ok');

  const septembre = ['2026-09-01', '2026-09-02', '2026-09-03'];
  const octobre = ['2026-10-01', '2026-10-02', '2026-10-03'];
  const parMois = (journal) => parColonnes(colonnesDe(journal), tout(AUJ, '2026-09-01'), { cle: 'mois', mesure: 'nuitMal' });
  assert.deepEqual(parMois(nuits(septembre)), { statut: 'insuffisant', colonnes: [] }, 'un seul mois');
  assert.equal(parMois([...nuits(septembre), ...nuits(octobre.slice(0, 2))]).statut, 'insuffisant', 'un mois de 3 valeurs, un de 2');
  assert.equal(parMois([...nuits(septembre), ...nuits(octobre)]).statut, 'ok');
});

// ---------- Énergie selon ce que je faisais (§2.4, graphique 3) ----------

const TRAVAIL = 'activiteMoment:travail';
const TRAJET = 'activiteMoment:trajet';
const REPOS = 'activiteMoment:repos';
const COURSES = 'activiteMoment:courses';

test('energieParActivite : une barre par activité à partir de 3 relevés avec énergie, découpée en basse, moyenne et haute', () => {
  const humeurs = [
    // Travail : 4 relevés (un « vers »), dont un qui nomme aussi le trajet et un qui nomme deux fois le travail.
    releve('2026-09-01', '09:00', { energie: 'energie:basse', faisais: [TRAVAIL] }),
    releve('2026-09-02', '09:00', { energie: 'energie:basse', faisais: [TRAVAIL, TRAJET] }),
    releve('2026-09-03', '14:00', { energie: 'energie:moyenne', faisais: [TRAVAIL], vers: true }),
    releve('2026-09-04', '09:00', { energie: 'energie:haute', faisais: [TRAVAIL, TRAVAIL] }),
    // Trajet : 3 relevés avec le premier. Repos : 2 relevés seulement.
    releve('2026-09-05', '08:00', { energie: 'energie:basse', faisais: [TRAJET] }),
    releve('2026-09-06', '08:00', { energie: 'energie:moyenne', faisais: [TRAJET] }),
    releve('2026-09-07', '20:00', { energie: 'energie:haute', faisais: [REPOS] }),
    releve('2026-09-08', '20:00', { energie: 'energie:haute', faisais: [REPOS] }),
    // Courses : 3 relevés, mais l'un n'a pas d'énergie.
    releve('2026-09-09', '11:00', { energie: 'energie:basse', faisais: [COURSES] }),
    releve('2026-09-10', '11:00', { energie: 'energie:haute', faisais: [COURSES] }),
    releve('2026-09-11', '11:00', { humeur: 6, faisais: [COURSES] }),
    // Énergie sans activité : ne compte pour aucune activité.
    releve('2026-09-12', '11:00', { energie: 'energie:basse' }),
    releve('2026-09-13', '11:00', { energie: 'energie:basse', faisais: [] }),
  ];
  const items = [{ id: TRAVAIL, liste: 'activiteMoment', ordre: 10 }, { id: TRAJET, liste: 'activiteMoment', ordre: 20 }];
  const periode = tout('2026-09-30', '2026-09-01');
  const g = energieParActivite(humeurs, periode, items);
  assert.equal(g.statut, 'ok');
  assert.deepEqual(g.activites, [
    { id: TRAVAIL, n: 4, basse: 2, moyenne: 1, haute: 1, libelle: '4 relevés' },
    { id: TRAJET, n: 3, basse: 2, moyenne: 1, haute: 0, libelle: '3 relevés' },
  ]);
  // Dans l'ordre de la liste ; sans liste, par identifiant.
  assert.deepEqual(energieParActivite(humeurs, periode).activites.map((a) => a.id), [TRAJET, TRAVAIL]);
  assert.deepEqual(energieParActivite(humeurs, periode, [{ id: TRAJET, liste: 'activiteMoment', ordre: 10 }, { id: TRAVAIL, liste: 'activiteMoment', ordre: 20 }]).activites.map((a) => a.id), [TRAJET, TRAVAIL]);
});

test('energieParActivite : minuit et bascule de 4 h, le relevé d\'après minuit est du jour d\'avant', () => {
  const humeurs = [
    releve('2026-09-01', '03:59', { energie: 'energie:basse', faisais: [REPOS] }), // 31/08 : avant la période
    releve('2026-09-01', '04:00', { energie: 'energie:basse', faisais: [REPOS] }),
    releve('2026-09-01', '10:00', { energie: 'energie:moyenne', faisais: [REPOS] }),
    releve('2026-09-02', '01:00', { energie: 'energie:haute', faisais: [REPOS], vers: true }), // encore le 01/09
    releve('2026-09-02', '04:00', { energie: 'energie:haute', faisais: [REPOS] }), // 02/09 : après la période
  ];
  const g = energieParActivite(humeurs, { du: '2026-09-01', au: '2026-09-01' });
  assert.deepEqual(g.activites, [{ id: REPOS, n: 3, basse: 1, moyenne: 1, haute: 1, libelle: '3 relevés' }]);
});

test('energieParActivite : sous 3 relevés avec énergie, pas assez de données', () => {
  const humeurs = [
    releve('2026-09-01', '09:00', { energie: 'energie:basse', faisais: [TRAVAIL] }),
    releve('2026-09-02', '09:00', { energie: 'energie:basse', faisais: [TRAVAIL] }),
    releve('2026-09-03', '09:00', { humeur: 5, faisais: [TRAVAIL] }),
  ];
  assert.deepEqual(energieParActivite(humeurs, tout('2026-09-30', '2026-09-01')), { statut: 'insuffisant', activites: [] });
  assert.deepEqual(energieParActivite([], tout('2026-09-30', '2026-09-01')), { statut: 'insuffisant', activites: [] });
});

// ---------- Ce qui a pesé, ce qui a rechargé (§2.4, graphique 1) ----------

test('peseRecharge : des jours distincts par élément, dans l\'ordre des listes, dès un jour noté', () => {
  const journal = [
    soir('2026-08-31', { pese: ['pese:trajets'] }), // avant la période
    soir('2026-09-01', { pese: ['pese:bruit', 'pese:bruit', 'pese:monde'], recharge: ['recharge:calme'] }),
    soir('2026-09-02', { pese: ['pese:bruit'], recharge: null }),
    soir('2026-09-03', { pese: [], recharge: ['recharge:calme', 'recharge:musique'] }),
    soir('2026-09-04'),
  ];
  const items = [
    { id: 'pese:monde', liste: 'pese', ordre: 10 }, { id: 'pese:bruit', liste: 'pese', ordre: 20 },
    { id: 'recharge:musique', liste: 'recharge', ordre: 10 }, { id: 'recharge:calme', liste: 'recharge', ordre: 20 },
  ];
  const periode = tout('2026-09-30', '2026-09-01');
  assert.deepEqual(peseRecharge(journal, periode, items), {
    statut: 'ok',
    pese: [{ id: 'pese:monde', n: 1, libelle: '1 jour' }, { id: 'pese:bruit', n: 2, libelle: '2 jours' }],
    recharge: [{ id: 'recharge:musique', n: 1, libelle: '1 jour' }, { id: 'recharge:calme', n: 2, libelle: '2 jours' }],
  });
  // Sans liste fournie : par identifiant. Un élément absent de la liste va à la fin.
  assert.deepEqual(peseRecharge(journal, periode).pese.map((e) => e.id), ['pese:bruit', 'pese:monde']);
  assert.deepEqual(peseRecharge(journal, periode, [{ id: 'pese:monde', liste: 'pese', ordre: 10 }]).pese.map((e) => e.id), ['pese:monde', 'pese:bruit']);
});

test('peseRecharge : les deux listes sont lues séparément ; rien de noté, pas assez de données', () => {
  const periode = tout('2026-09-30', '2026-09-01');
  assert.deepEqual(peseRecharge([soir('2026-09-01', { recharge: ['recharge:calme'] })], periode),
    { statut: 'ok', pese: [], recharge: [{ id: 'recharge:calme', n: 1, libelle: '1 jour' }] });
  assert.deepEqual(peseRecharge([soir('2026-09-01'), soir('2026-09-02', { pese: [], recharge: [] })], periode), { statut: 'insuffisant', pese: [], recharge: [] });
  assert.deepEqual(peseRecharge([], periode), { statut: 'insuffisant', pese: [], recharge: [] });
});

// ---------- v8 · Q17 : l'énergie haute et l'hyperfocus avant les jours à énergie basse ----------

const HYPERFOCUS = 'symptome:hyperfocus';
const symptome = (date, id = HYPERFOCUS) => ({ id: `s-${date}-${id}`, date, symptome: id, intensite: 5 });

test('facteursParJour (v8) : énergie haute comme la basse (« vers » et bascule de 4 h compris), oui / non / inconnue', () => {
  const humeurs = [
    releve('2026-09-01', '09:00', { energie: 'energie:haute' }), releve('2026-09-01', '17:00', { energie: 'energie:basse' }),
    releve('2026-09-02', '09:00', { energie: 'energie:moyenne' }), releve('2026-09-02', '14:00', { energie: 'energie:basse', vers: true }),
    releve('2026-09-04', '01:00', { energie: 'energie:haute' }), // à 01:00 le 04 : encore le 03
    releve('2026-09-05', '14:00', { energie: 'energie:haute', vers: true }),
    releve('2026-09-06', '10:00', { emotion: 'roue:surprise' }), // émotion seule : pas un relevé d'énergie
  ];
  const jours = facteursParJour({ journal: [soir('2026-09-07')], humeurs, episodes: [] });
  const haute = (d) => jours.get(d).energieHaute;
  assert.deepEqual(['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-05', '2026-09-06', '2026-09-07'].map(haute), [true, false, true, true, null, null]);
  assert.equal(jours.has('2026-09-04'), false, 'rien ne reste sur le 04');
  // Un jour peut avoir une énergie haute et une énergie basse : chacune est lue à part.
  assert.equal(jours.get('2026-09-01').energieBasse, true);
});

test('facteursParJour (v8) : hyperfocus oui avec la fiche (même seule), non un soir noté ou avec une autre fiche, jamais « non » sur des relevés seuls', () => {
  const symptomes = [
    symptome('2026-09-01'), symptome('2026-09-01', 'symptome:crise_angoisse'),
    symptome('2026-09-02', 'symptome:crise_angoisse'),
    symptome('2026-09-05'), // un jour qui n'a que la fiche : il entre dans les jours
  ];
  const humeurs = [releve('2026-09-04', '10:00', { energie: 'energie:basse' })];
  const jours = facteursParJour({ journal: [soir('2026-09-01'), soir('2026-09-03')], humeurs, episodes: [], symptomes });
  const hyper = (d) => jours.get(d).hyperfocus;
  assert.equal(hyper('2026-09-01'), true);
  assert.equal(hyper('2026-09-02'), false, 'une autre fiche ce jour-là');
  assert.equal(hyper('2026-09-03'), false, 'un soir noté sans fiche');
  assert.equal(hyper('2026-09-04'), null, 'un jour de relevés seuls reste inconnu');
  assert.equal(hyper('2026-09-05'), true);
  // Le jour ajouté pour sa fiche n'a rien d'autre de connu.
  const j5 = jours.get('2026-09-05');
  assert.deepEqual([j5.nuitMal, j5.energieBasse, j5.energieHaute, j5.explosion, j5.bureau, j5.contactCouteux], [null, null, null, null, null, null]);
  // Sans fiche du tout (comme avant la v8) : rien ne change pour les autres facteurs.
  assert.equal(facteursParJour({ journal: [soir('2026-09-01')], humeurs, episodes: [] }).get('2026-09-01').hyperfocus, false);
});

test('graphique aligné (v8) : une énergie haute deux jours avant et un hyperfocus la veille des jours bas se lisent à leur décalage', () => {
  // Jours bas : 10, 15, 20 ; énergie haute les 08, 13, 18 ; hyperfocus les 09, 14, 19 (énergie moyenne). Autres jours
  // (énergie notée sans « basse ») : ces six-là, et les 22 à 25 (énergie moyenne), dont un hyperfocus le 23.
  const bas = ['2026-09-10', '2026-09-15', '2026-09-20'];
  const humeurs = [
    ...bas.map((d) => releve(d, '10:00', { energie: 'energie:basse' })),
    ...bas.map((d) => releve(addDays(d, -2), '10:00', { energie: 'energie:haute' })),
    ...bas.map((d) => releve(addDays(d, -1), '10:00', { energie: 'energie:moyenne' })),
    ...plageJours('2026-09-22', '2026-09-25').map((d) => releve(d, '10:00', { energie: 'energie:moyenne' })),
  ];
  const journal = plageJours('2026-09-05', '2026-09-25').map((d) => soir(d));
  const symptomes = [...bas.map((d) => symptome(addDays(d, -1))), symptome('2026-09-23')];
  const jours = facteursParJour({ journal, humeurs, episodes: [], symptomes });
  const g = energieAvant(jours, tout('2026-09-25', '2026-09-05'));
  assert.equal(g.statut, 'ok');
  const haute = bloc(g, 'energieHaute');
  assert.deepEqual(barres(haute), ['0/0', '3/3', '0/3', '0/3']);
  assert.deepEqual(barre(haute, -2).dates, bas, 'les jours repères dont l\'avant-veille a une énergie haute');
  assert.deepEqual(haute.autres, { oui: 3, n: 10, part: 0.3, peu: false });
  const hyper = bloc(g, 'hyperfocus');
  assert.deepEqual(barres(hyper), ['0/3', '0/3', '3/3', '0/3']);
  assert.deepEqual(barre(hyper, -1).dates, bas);
  assert.deepEqual(hyper.autres, { oui: 4, n: 10, part: 0.4, peu: false });
});

// ---------- v8 · Q15 : Mes nuits ----------

test('periodeMesNuits : les 4 dernières semaines, aujourd\'hui compris ; 2 sur demande', () => {
  assert.deepEqual(periodeMesNuits('2026-10-28'), { du: '2026-10-01', au: '2026-10-28' });
  assert.deepEqual(periodeMesNuits('2026-10-28', 2), { du: '2026-10-15', au: '2026-10-28' });
  assert.equal(plageJours(periodeMesNuits(AUJ).du, AUJ).length, 7 * SEUILS.comprendre.nuitsSemaines);
});

test('mesNuits : les nuits notées de la période, dans l\'ordre des jours ; les heures du soir, sinon du coucher au lever ; ni nuit vide, ni valeur hors bornes', () => {
  const journal = [
    soir('2026-10-07', { heuresSommeil: 6, heureCoucher: '22:00', heureLever: '08:00' }), // les heures du soir d'abord
    soir('2026-09-30', { sommeilRessenti: MAL, heuresSommeil: 6 }), // avant la période
    soir('2026-10-01', { sommeilRessenti: MAL, heuresSommeil: 4 }),
    soir('2026-10-02', { heuresSommeil: 10 }),
    soir('2026-10-03', { sommeilRessenti: BIEN }), // la qualité seule : une ligne, sans durée
    soir('2026-10-04', { sommeilRessenti: 'sommeil:moyen', heureCoucher: '23:30', heureLever: '07:10' }), // une nuit d'avant la v8
    soir('2026-10-05', { heureCoucher: '23:30', heureLever: '00:30' }), // une heure : hors de la règle des 2 à 16 h
    soir('2026-10-06', { lieu: 'lieu:bureau', reveilsNocturnes: 2 }), // rien sur la nuit qui compte
    soir('2026-10-08', { heuresSommeil: 12 }), soir('2026-10-09', { heuresSommeil: 6.25 }), // hors de la liste
    soir('2026-10-10', { sommeilRessenti: 'sommeil:inconnu', heuresSommeil: 7 }),
    soir('2026-10-29', { heuresSommeil: 8 }), // après aujourd'hui
  ];
  assert.deepEqual(mesNuits(journal, periodeMesNuits('2026-10-28')), [
    { date: '2026-10-01', heures: 4, qualite: MAL },
    { date: '2026-10-02', heures: 10, qualite: null },
    { date: '2026-10-03', heures: null, qualite: BIEN },
    { date: '2026-10-04', heures: 460 / 60, qualite: 'sommeil:moyen' },
    { date: '2026-10-07', heures: 6, qualite: null },
    { date: '2026-10-10', heures: 7, qualite: null },
  ]);
  assert.deepEqual(mesNuits([], periodeMesNuits(AUJ)), []);
  assert.deepEqual(mesNuits(null, periodeMesNuits(AUJ)), []);
});

test('mesNuits : le texte d\'une nuit, la qualité d\'abord, les heures comme le soir, une nuit ancienne en heures et minutes', () => {
  const lib = (id) => ({ [MAL]: 'Mal', [BIEN]: 'Bien' }[id] || id);
  assert.equal(texteNuit({ heures: 6, qualite: MAL }, lib), 'Mal · 6 h');
  assert.equal(texteNuit({ heures: 4, qualite: null }, lib), '4 h ou moins');
  assert.equal(texteNuit({ heures: 10, qualite: BIEN }, lib), 'Bien · 10 h ou plus');
  assert.equal(texteNuit({ heures: null, qualite: BIEN }, lib), 'Bien');
  assert.equal(texteNuit({ heures: 460 / 60, qualite: null }, lib), '7 h 40');
  assert.equal(texteNuit({ heures: 13, qualite: null }, lib), '13 h', 'une nuit ancienne à l\'heure ronde, comme les heures du soir');
  assert.equal(texteNuit({ heures: 3.5, qualite: MAL }, lib), 'Mal · 3 h 30');
  assert.equal(texteHeuresNuit(null), null);
});

test('v11 : Mes nuits garde les demi-heures notées le soir et les dit « Mal · 7 h 30 », jamais « 7,5 »', () => {
  const lib = (id) => ({ [MAL]: 'Mal', [BIEN]: 'Bien' }[id] || id);
  const journal = [soir('2026-10-20', { sommeilRessenti: MAL, heuresSommeil: 7.5 }), soir('2026-10-21', { heuresSommeil: 4.5 }), soir('2026-10-22', { heuresSommeil: 9.5 })];
  const nuits = mesNuits(journal, periodeMesNuits('2026-10-28'));
  assert.deepEqual(nuits, [
    { date: '2026-10-20', heures: 7.5, qualite: MAL },
    { date: '2026-10-21', heures: 4.5, qualite: null },
    { date: '2026-10-22', heures: 9.5, qualite: null },
  ]);
  assert.deepEqual(nuits.map((n) => texteNuit(n, lib)), ['Mal · 7 h 30', '4 h 30', '9 h 30']);
  for (const n of nuits) assert.doesNotMatch(texteNuit(n, lib), /7,5|,/);
});

test('vigilance 1 · une sauvegarde v7 (format 5) importée : Mes nuits compte les heures du coucher au lever, garde la qualité seule', async () => {
  const fichier = 'format-5.json';
  const octets = new Uint8Array(readFileSync(join(RACINE, 'tests', 'fixtures', 'temoins', fichier)));
  const { repo } = nouveauRepo();
  await remplacer(repo, analyserFichiers([{ nom: fichier, octets }]));
  const journal = await repo.journal.tous();
  assert.ok(journal.every((j) => j.heuresSommeil == null), 'aucune heure notée en v7');
  const nuits = mesNuits(journal, periodeMesNuits('2026-10-20'));
  assert.deepEqual(nuits, [
    { date: '2026-09-26', heures: 460 / 60, qualite: 'sommeil:moyen' },
    { date: '2026-09-28', heures: null, qualite: MAL },
    { date: '2026-09-29', heures: null, qualite: BIEN },
  ]);
  assert.equal(texteNuit(nuits[0], (id) => id.slice(8)), 'moyen · 7 h 40');
});
