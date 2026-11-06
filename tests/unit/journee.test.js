import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAMPS_JOURNEE, JOURNEE_DEFAUT, normaliserJournee, champsVisibles, champsAffiches, repliAffiche, repliNuitAffiche, nuitRenseignee, MASQUE_NUIT,
  changerPremiereLigne,
} from '../../public/js/domain/journee.js';
import { texteHeuresSommeil, VALEURS_HEURES_SOMMEIL } from '../../public/js/domain/champs.js';

test('le masque peseRecharge survit à normaliserJournee, hors de l\'ordre des champs', () => {
  const j = normaliserJournee({ ordre: ['humeur', 'lieu'], masques: ['explosions', 'peseRecharge'], heuresMoment: [] });
  assert.deepEqual(j.masques, ['explosions', 'peseRecharge']);
  assert.ok(!j.ordre.includes('peseRecharge'));
  assert.deepEqual([...j.ordre].sort(), [...CHAMPS_JOURNEE].sort());
  assert.equal(j.ordre[0], 'humeur');
});

test('peseRecharge seul, doublons et clés inconnues : seul le masque connu est gardé', () => {
  assert.deepEqual(normaliserJournee({ masques: ['peseRecharge', 'peseRecharge', 'inconnu', 'humeur'] }).masques, ['peseRecharge', 'humeur']);
  assert.deepEqual(normaliserJournee({ masques: [] }).masques, []);
  assert.deepEqual(normaliserJournee({ masques: ['peseRecharge'] }).masques, ['peseRecharge']);
});

test('sans réglage, les masques par défaut s\'appliquent (copie, jamais l\'objet figé)', () => {
  for (const brut of [undefined, null, {}, { masques: 'explosions' }]) {
    const j = normaliserJournee(brut);
    assert.deepEqual(j.masques, [...JOURNEE_DEFAUT.masques]);
    assert.notEqual(j.masques, JOURNEE_DEFAUT.masques);
    assert.deepEqual(j.ordre, CHAMPS_JOURNEE);
  }
});

test('un masque peseRecharge ne change ni les champs visibles ni les champs affichés', () => {
  const j = normaliserJournee({ masques: ['explosions', 'peseRecharge'] });
  assert.deepEqual(champsVisibles(j), CHAMPS_JOURNEE.filter((c) => c !== 'explosions'));
  assert.deepEqual(champsAffiches(j, null), CHAMPS_JOURNEE.filter((c) => c !== 'explosions'));
});

test('repliAffiche : visible sauf masqué', () => {
  const visible = normaliserJournee({ masques: ['explosions'] });
  assert.equal(repliAffiche(visible, null), true);
  assert.equal(repliAffiche(visible, { pese: null, recharge: null }), true);
  const masque = normaliserJournee({ masques: ['explosions', 'peseRecharge'] });
  assert.equal(repliAffiche(masque, null), false);
  assert.equal(repliAffiche(masque, undefined), false);
  assert.equal(repliAffiche(masque, {}), false);
  assert.equal(repliAffiche(masque, { pese: null, recharge: null }), false);
});

test('repliAffiche : masqué mais portant des valeurs ce jour-là, il reste affiché', () => {
  const masque = normaliserJournee({ masques: ['peseRecharge'] });
  assert.equal(repliAffiche(masque, { pese: ['pese:bruit'], recharge: null }), true);
  assert.equal(repliAffiche(masque, { pese: null, recharge: ['recharge:calme'] }), true);
  assert.equal(repliAffiche(masque, { pese: ['pese:bruit'], recharge: ['recharge:calme'] }), true);
});

test('v6 : le champ Humeur du soir est masqué par défaut, avec le compteur d\'explosions (et, depuis la v8, « Nuit en détail »)', () => {
  assert.deepEqual(JOURNEE_DEFAUT.masques, ['explosions', 'humeur', 'nuit']);
  const j = normaliserJournee(null);
  assert.ok(!champsVisibles(j).includes('humeur'));
  assert.ok(!champsAffiches(j, { date: '2026-10-14', lieu: 'lieu:bureau' }).includes('humeur'));
});

test('v6 : un jour passé noté le soir garde son champ Humeur', () => {
  const j = normaliserJournee(null);
  assert.ok(champsAffiches(j, { date: '2026-09-30', humeur: 6 }).includes('humeur'));
  assert.ok(!champsAffiches(j, { date: '2026-09-30', humeur: null }).includes('humeur'));
});

// ---------- v8 : « Nuit en détail » masqué par défaut, la durée de la nuit dans la carte Sommeil (spec §7 bis) ----------

test('v8 : « Nuit en détail » est masqué par défaut, réaffichable, hors de l\'ordre des champs', () => {
  assert.equal(MASQUE_NUIT, 'nuit');
  const defaut = normaliserJournee(undefined);
  assert.ok(defaut.masques.includes('nuit'));
  assert.ok(!defaut.ordre.includes('nuit'));
  assert.deepEqual(champsVisibles(defaut), CHAMPS_JOURNEE.filter((c) => !['explosions', 'humeur'].includes(c)), 'aucun champ en moins');
  assert.equal(repliNuitAffiche(defaut, { date: '2026-10-25' }), false);
  assert.equal(repliNuitAffiche(defaut, null), false);
  // Réaffiché dans Réglages › Le soir : le masque part, et il le reste.
  const reaffiche = normaliserJournee({ masques: ['explosions', 'humeur'] });
  assert.deepEqual(reaffiche.masques, ['explosions', 'humeur']);
  assert.equal(repliNuitAffiche(reaffiche, { date: '2026-10-25' }), true);
  assert.deepEqual(normaliserJournee({ masques: ['nuit', 'nuit', 'peseRecharge'] }).masques, ['nuit', 'peseRecharge']);
});

test('v8 : une nuit déjà notée (coucher, lever ou réveils) garde son repli, masqué ou non, carte Sommeil masquée comprise', () => {
  const defaut = normaliserJournee(null);
  for (const nuit of [{ heureCoucher: '23:40' }, { heureLever: '07:10' }, { reveilsNocturnes: 0 }, { reveilsNocturnes: 2, heureCoucher: '23:00', heureLever: '06:30' }]) {
    assert.equal(nuitRenseignee(nuit), true, JSON.stringify(nuit));
    assert.equal(repliNuitAffiche(defaut, nuit), true, JSON.stringify(nuit));
    assert.equal(repliNuitAffiche(normaliserJournee({ masques: ['sommeil', 'nuit'] }), nuit), true, `Sommeil masqué : ${JSON.stringify(nuit)}`);
  }
  // Les heures et la qualité ne sont pas « Nuit en détail ».
  assert.equal(nuitRenseignee({ heuresSommeil: 6, sommeilRessenti: 'sommeil:mal', heureCoucher: null }), false);
  assert.equal(repliNuitAffiche(defaut, { heuresSommeil: 6 }), false);
  // Réaffiché mais la carte Sommeil masquée : le repli suit la carte, sauf une nuit notée.
  const sansSommeil = normaliserJournee({ masques: ['sommeil'] });
  assert.equal(repliNuitAffiche(sansSommeil, {}), false);
  assert.equal(repliNuitAffiche(sansSommeil, { heureLever: '07:00' }), true);
});

test('v8 : la durée de la nuit tient la carte Sommeil affichée, même masquée', () => {
  const masque = normaliserJournee({ masques: ['sommeil'] });
  assert.ok(!champsAffiches(masque, {}).includes('sommeil'));
  assert.ok(champsAffiches(masque, { heuresSommeil: 7 }).includes('sommeil'));
  assert.ok(champsAffiches(masque, { sommeilRessenti: 'sommeil:bien' }).includes('sommeil'));
});

test('v8 : les libellés de la durée, de « 4 h ou moins » à « 10 h ou plus », rien hors bornes', () => {
  assert.deepEqual([4, 5, 6, 7, 8, 9, 10].map(texteHeuresSommeil), ['4 h ou moins', '5 h', '6 h', '7 h', '8 h', '9 h', '10 h ou plus']);
  for (const h of [3, 11, 6.25, '6', null, undefined]) assert.equal(texteHeuresSommeil(h), null, String(h));
});

test('v11 : les demi-heures disent « 7 h 30 », jamais « 7,5 » ; rien hors de la liste', () => {
  assert.deepEqual([4, 4.5, 5, 7.5, 9.5, 10].map(texteHeuresSommeil), ['4 h ou moins', '4 h 30', '5 h', '7 h 30', '9 h 30', '10 h ou plus']);
  for (const h of VALEURS_HEURES_SOMMEIL) assert.doesNotMatch(texteHeuresSommeil(h), /[,.]/, String(h));
  for (const h of [3.5, 10.5, 7.25, '7.5', true, NaN, Infinity]) assert.equal(texteHeuresSommeil(h), null, String(h));
});

// v11 (3/11, spec §5.4) : la roue d'une carte Sport ou Contact écrit la durée ou l'effet de la première ligne seulement.
test('v11 : changerPremiereLigne change la première ligne seule, sans toucher à l\'entrée reçue', () => {
  const marche = { type: 'typeSport:marche', duree: null };
  const lignes = [marche];
  assert.deepEqual(changerPremiereLigne(lignes, 'duree', 'dureeSport:de_30_a_60'), [{ type: 'typeSport:marche', duree: 'dureeSport:de_30_a_60' }]);
  assert.deepEqual(lignes, [{ type: 'typeSport:marche', duree: null }], 'pur : l\'entrée reste telle quelle');
  // Deux lignes : la seconde intacte, la même.
  const velo = { type: 'typeSport:velo', duree: 'dureeSport:moins_15' };
  const deux = changerPremiereLigne([marche, velo], 'duree', 'dureeSport:plus_60');
  assert.deepEqual(deux, [{ type: 'typeSport:marche', duree: 'dureeSport:plus_60' }, velo]);
  assert.equal(deux[1], velo);
  // Un contact : l'effet, « avec qui » gardé.
  assert.deepEqual(changerPremiereLigne([{ avec: ['contactAvec:amis'], effet: 'contactEffet:neutre' }], 'effet', 'contactEffet:couteux'),
    [{ avec: ['contactAvec:amis'], effet: 'contactEffet:couteux' }]);
});

test('v11 : changerPremiereLigne sur rien de noté crée la première ligne ; effacer la seule valeur d\'une ligne la retire, et plus aucune ligne donne null', () => {
  for (const vide of [null, undefined, []]) {
    assert.deepEqual(changerPremiereLigne(vide, 'duree', 'dureeSport:de_15_a_30'), [{ duree: 'dureeSport:de_15_a_30' }], String(vide));
    assert.equal(changerPremiereLigne(vide, 'effet', null), null, String(vide));
  }
  // Une ligne vidée sort ; la suivante devient la première.
  assert.equal(changerPremiereLigne([{ type: null, duree: 'dureeSport:moins_15' }], 'duree', null), null);
  const velo = { type: 'typeSport:velo', duree: null };
  assert.deepEqual(changerPremiereLigne([{ type: null, duree: 'dureeSport:moins_15' }, velo], 'duree', null), [velo]);
  // Effacer la durée garde le type : la ligne reste.
  assert.deepEqual(changerPremiereLigne([{ type: 'typeSport:marche', duree: 'dureeSport:moins_15' }], 'duree', null), [{ type: 'typeSport:marche', duree: null }]);
  // « avec qui » vide compte comme vide, comme en base.
  assert.equal(changerPremiereLigne([{ avec: [], effet: 'contactEffet:neutre' }], 'effet', null), null);
  assert.equal(changerPremiereLigne([{ avec: null, effet: 'contactEffet:neutre' }], 'effet', null), null);
  assert.deepEqual(changerPremiereLigne([{ avec: ['contactAvec:famille'], effet: 'contactEffet:neutre' }], 'effet', null), [{ avec: ['contactAvec:famille'], effet: null }]);
});
