import { test } from 'node:test';
import assert from 'node:assert/strict';
import { phraseResume } from '../../public/js/domain/phrase.js';
import { carteLibelles } from '../../public/js/domain/libelles.js';

const carte = carteLibelles([
  { id: 'declencheur:injustice', libelle: 'Injustice' },
  { id: 'emotion:frustration', libelle: 'Frustration' },
  { id: 'dessous:pas_vu_reconnu', libelle: 'Ne pas être vu / reconnu' },
  { id: 'reaction:rien_fait', libelle: 'Rien fait' },
  { id: 'emotion:u-sigle', libelle: 'TDAH en roue libre' },
  { id: 'symptome:ruminations', libelle: 'Ruminations' },
  { id: 'duree:quelques_heures', libelle: 'Quelques heures' },
  { id: 'lieu:bureau', libelle: 'Bureau' },
  { id: 'sommeil:moyen', libelle: 'Moyen' },
  { id: 'traitementPris:partiel', libelle: 'Partiel' },
]);
const texte = (s) => s.map((x) => x.texte).join('');
const valeurs = (s) => s.filter((x) => x.valeur).map((x) => x.texte);

test('rien de choisi : aucune phrase', () => {
  assert.deepEqual(phraseResume('episode', { declencheur: null, emotion: null }, carte), []);
  assert.deepEqual(phraseResume('jour', { date: '2026-09-30' }, carte), []);
});

test('épisode : segments omis quand vides, déclencheur et dessous gardés tels quels', () => {
  const s = phraseResume('episode', { declencheur: 'declencheur:injustice', emotion: 'emotion:frustration', intensite: 7, dessous: 'dessous:pas_vu_reconnu', reaction: 'reaction:rien_fait' }, carte);
  assert.equal(texte(s), 'Ça a démarré avec Injustice, ça ressemblait à frustration, intensité 7, en dessous, Ne pas être vu / reconnu, réaction : rien fait.');
  assert.deepEqual(valeurs(s), ['Injustice', 'frustration', '7', 'Ne pas être vu / reconnu', 'rien fait']);
  const seule = phraseResume('episode', { emotion: 'emotion:frustration', intensite: null }, carte);
  assert.equal(texte(seule), 'Ça ressemblait à frustration.');
});

test('un sigle garde sa casse', () => {
  assert.equal(texte(phraseResume('episode', { declencheur: 'declencheur:injustice', emotion: 'emotion:u-sigle' }, carte)),
    'Ça a démarré avec Injustice, ça ressemblait à TDAH en roue libre.');
});

test('symptôme : valeur en tête de phrase, durée en minuscule', () => {
  assert.equal(texte(phraseResume('symptome', { symptome: 'symptome:ruminations', intensite: 5, duree: 'duree:quelques_heures' }, carte)),
    'Ruminations, intensité 5, quelques heures.');
  assert.equal(texte(phraseResume('symptome', { duree: 'duree:quelques_heures' }, carte)), 'Quelques heures.');
  assert.equal(texte(phraseResume('symptome', { intensite: 3 }, carte)), 'Intensité 3.');
});

test('journée : faits connus seulement, 0 et false sont des valeurs', () => {
  const s = phraseResume('jour', { lieu: 'lieu:bureau', sommeilRessenti: 'sommeil:moyen', humeur: 6, contactHumain: false, sportMouvement: null, explosions: 0, traitementPris: 'traitementPris:partiel' }, carte);
  assert.equal(texte(s), 'Bureau · nuit moyen · humeur 6 · contact non · explosions 0 · traitement partiel');
  assert.deepEqual(s.filter((x) => x.valeur).map((x) => x.rubrique), ['lieu', 'sommeil', 'humeur', 'contact', 'expl', 'trt']);
});

test('journée v4 : les épisodes « Explosion » s\'affichent sans jamais s\'additionner au compteur', () => {
  assert.equal(texte(phraseResume('jour', { humeur: 6 }, carte, { nExplosions: 2 })), 'humeur 6 · explosions 2');
  assert.equal(texte(phraseResume('jour', { humeur: 6, explosions: 1 }, carte, { nExplosions: 2 })), 'humeur 6 · explosions 2');
  assert.equal(texte(phraseResume('jour', { humeur: 6, explosions: 3 }, carte, { nExplosions: 2 })), 'humeur 6 · explosions 3');
  assert.equal(texte(phraseResume('jour', { humeur: 6 }, carte, { nExplosions: 0 })), 'humeur 6', 'rien à montrer sans compteur ni épisode');
});

test('journée v6 : l\'humeur du jour s\'écrit avec une décimale au plus', () => {
  assert.equal(texte(phraseResume('jour', { humeur: 5.6 }, carte)), 'humeur 5,6');
  assert.equal(texte(phraseResume('jour', { humeur: 17 / 3 }, carte)), 'humeur 5,7');
  assert.equal(texte(phraseResume('jour', { humeur: 6 }, carte)), 'humeur 6', 'une humeur ronde reste sans décimale');
  assert.equal(texte(phraseResume('jour', { humeur: 6.04 }, carte)), 'humeur 6');
  assert.deepEqual(valeurs(phraseResume('jour', { lieu: 'lieu:bureau', humeur: 5.5 }, carte)), ['Bureau', 'humeur 5,5']);
  assert.equal(texte(phraseResume('jour', { humeur: '7' }, carte)), 'humeur 7', 'une valeur abîmée ne casse pas la phrase');
});

test('réglages du soir : un champ masqué reste affiché tant qu\'il porte une valeur', async () => {
  const { normaliserJournee, champsAffiches, champsVisibles } = await import('../../public/js/domain/journee.js');
  const j = normaliserJournee({ masques: ['explosions', 'sport'] });
  assert.ok(!champsVisibles(j).includes('explosions'));
  assert.ok(!champsAffiches(j, { humeur: 5 }).includes('explosions'));
  assert.ok(champsAffiches(j, { explosions: 0 }).includes('explosions'), '0 est une valeur');
  assert.ok(champsAffiches(j, { activites: [{ type: 'typeSport:marche', duree: null }] }).includes('sport'));
  assert.equal(normaliserJournee(null).masques[0], 'explosions');
});

test('élément inconnu : libellé de repli, jamais undefined', () => {
  const s = phraseResume('episode', { declencheur: 'declencheur:disparu' }, carte);
  assert.ok(!texte(s).includes('undefined'));
});

test('journée v7 : les émotions du jour (Après coup, « Ce jour-là »), après l\'humeur, avec leurs zones (v9) ; sans elles, rien ne change', async () => {
  const { resumeEmotions } = await import('../../public/js/domain/releves.js');
  const releves = [
    { date: '2026-10-14', heure: '18:00', emotion: 'roue:serenite:calme' }, { date: '2026-10-14', heure: '09:00', emotion: 'roue:colere:irrite' },
    { date: '2026-10-14', heure: '12:00', humeur: 6 }, { date: '2026-10-15', heure: '01:00', emotion: 'roue:colere:irrite' },
  ];
  const emotions = resumeEmotions(releves, Infinity);
  const entree = { lieu: 'lieu:bureau', humeur: 6, explosions: 1 };
  const s = phraseResume('jour', entree, carte, { emotions });
  assert.equal(texte(s), 'Bureau · humeur 6 · irrité, calme · explosions 1', 'un jour mêlé garde sa note (vigilance 5)');
  const seg = s.find((x) => x.rubrique === 'emotions');
  assert.deepEqual(seg.zones.map((z) => z.cle), ['rouge', 'vert']);
  assert.equal(texte(phraseResume('jour', { lieu: 'lieu:bureau' }, carte, { emotions })), 'Bureau · irrité, calme');
  assert.equal(texte(phraseResume('jour', {}, carte, { emotions })), 'irrité, calme', 'un jour qui n\'a que des émotions');
  assert.deepEqual(phraseResume('jour', entree, carte, { emotions: resumeEmotions([], Infinity) }), phraseResume('jour', entree, carte));
});

// v8 (spec §7 bis) : la nuit dit aussi ses heures, en un seul segment de la rubrique Sommeil (une seule puce dans l'Historique).
test('v8 : « nuit moyen · 6 h » en un segment ; les heures seules disent « nuit 6 h » ; hors bornes, rien', () => {
  const nuit = (o) => phraseResume('jour', { date: '2026-10-25', ...o }, carte).filter((x) => x.rubrique === 'sommeil');
  assert.deepEqual(nuit({ sommeilRessenti: 'sommeil:moyen', heuresSommeil: 6 }).map((x) => x.texte), ['nuit moyen · 6 h']);
  assert.deepEqual(nuit({ heuresSommeil: 4 }).map((x) => x.texte), ['nuit 4 h ou moins']);
  assert.deepEqual(nuit({ heuresSommeil: 10, lieu: 'lieu:bureau' }).map((x) => x.texte), ['nuit 10 h ou plus']);
  assert.deepEqual(nuit({ sommeilRessenti: 'sommeil:moyen' }).map((x) => x.texte), ['nuit moyen']);
  assert.deepEqual(nuit({ heuresSommeil: 12 }), []);
  assert.deepEqual(nuit({ heureCoucher: '23:00', heureLever: '07:00' }), [], 'le coucher et le lever ne sont pas dans la phrase');
  assert.equal(texte(phraseResume('jour', { date: '2026-10-25', lieu: 'lieu:bureau', heuresSommeil: 7, contactHumain: true }, carte)), 'Bureau · nuit 7 h · contact oui');
});

// v11 (spec §5.5) : la demi-heure, « nuit 7 h 30 », jamais « 7,5 ».
test('v11 : « nuit 7 h 30 » à la demi-heure ; hors de la liste, rien', () => {
  const nuit = (o) => phraseResume('jour', { date: '2026-10-25', ...o }, carte).filter((x) => x.rubrique === 'sommeil');
  assert.deepEqual(nuit({ heuresSommeil: 7.5 }).map((x) => x.texte), ['nuit 7 h 30']);
  assert.deepEqual(nuit({ sommeilRessenti: 'sommeil:moyen', heuresSommeil: 4.5 }).map((x) => x.texte), ['nuit moyen · 4 h 30']);
  assert.deepEqual(nuit({ heuresSommeil: 7.25 }), []);
  assert.equal(texte(phraseResume('jour', { date: '2026-10-25', lieu: 'lieu:bureau', heuresSommeil: 7.5, contactHumain: true }, carte)), 'Bureau · nuit 7 h 30 · contact oui');
});
