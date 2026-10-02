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

test('élément inconnu : libellé de repli, jamais undefined', () => {
  const s = phraseResume('episode', { declencheur: 'declencheur:disparu' }, carte);
  assert.ok(!texte(s).includes('undefined'));
});
