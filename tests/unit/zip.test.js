import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crc32, creerZip, lireZip, concatener, ErreurZip } from '../../public/js/db/zip.js';

const enc = new TextEncoder();
const date = new Date(2026, 8, 30, 21, 15, 42);

test('CRC32 contre des valeurs connues', () => {
  assert.equal(crc32(enc.encode('')), 0);
  assert.equal(crc32(enc.encode('123456789')), 0xcbf43926);
  assert.equal(crc32(enc.encode('The quick brown fox jumps over the lazy dog')), 0x414fa339);
});

test('aller-retour écriture puis lecture, octet pour octet, noms UTF-8', () => {
  const audio = new Uint8Array(70000).map((_, i) => (i * 31) % 256);
  const entrees = [
    { nom: 'sauvegarde.json', donnees: enc.encode('{"é":"à"}') },
    { nom: 'audios/mémo-1.m4a', donnees: audio },
    { nom: 'vide.txt', donnees: new Uint8Array(0) },
  ];
  const { morceaux, taille } = creerZip(entrees, { date });
  const octets = concatener(morceaux);
  assert.equal(octets.length, taille);
  const lu = lireZip(octets);
  assert.deepEqual(lu.map((e) => e.nom), entrees.map((e) => e.nom));
  lu.forEach((e, i) => assert.deepEqual(Buffer.from(e.donnees), Buffer.from(entrees[i].donnees)));
});

test('archive tronquée ou contrôle faux : refus', () => {
  const octets = concatener(creerZip([{ nom: 'a.bin', donnees: new Uint8Array([1, 2, 3, 4]) }], { date }).morceaux);
  assert.throws(() => lireZip(octets.subarray(0, octets.length - 5)), ErreurZip);
  const abime = octets.slice();
  abime[31 + 'a.bin'.length - 1] ^= 0xff;
  assert.throws(() => lireZip(abime), /intégrité/);
  assert.throws(() => lireZip(enc.encode('pas une archive du tout, vraiment pas')), ErreurZip);
});

test('date requise', () => {
  assert.throws(() => creerZip([], {}), TypeError);
});
