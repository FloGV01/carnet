import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { IDBObjectStore, IDBIndex } from 'fake-indexeddb';
import { nouveauRepo } from '../aides/repo.js';
import { RACINE, lire, sansCommentaires } from '../aides/fichiers.js';

const memo = (parentStore, parentId) => ({ parentStore, parentId, dureeMs: 1000, mime: 'audio/mp4', data: new ArrayBuffer(32) });

// Espionne les lectures de valeurs sur le magasin « audios » (fiche ou index), le temps de `travail`.
async function lecturesDeValeurs(travail) {
  const lectures = [];
  const origines = [];
  const surveiller = (proto, nom, magasinDe) => {
    const origine = proto[nom];
    origines.push([proto, nom, origine]);
    proto[nom] = function espion(...args) {
      if (magasinDe(this) === 'audios') lectures.push(nom);
      return origine.apply(this, args);
    };
  };
  for (const nom of ['openCursor', 'getAll', 'get']) {
    surveiller(IDBObjectStore.prototype, nom, (s) => s.name);
    surveiller(IDBIndex.prototype, nom, (i) => i.objectStore.name);
  }
  try { await travail(); } finally { for (const [proto, nom, origine] of origines) proto[nom] = origine; }
  return lectures;
}

test('parents() : une clé par fiche qui a un mémo, ensemble vide sans mémo', async () => {
  const { repo } = nouveauRepo();
  const vide = await repo.audios.parents();
  assert.ok(vide instanceof Set);
  assert.equal(vide.size, 0);

  const ep = await repo.episodes.creer({ date: '2026-09-30', emotion: 'emotion:honte' });
  await repo.audios.creer(memo('journal', '2026-09-30'));
  await repo.audios.creer(memo('episodes', ep.id));
  await repo.audios.creer(memo('episodes', ep.id)); // deux mémos sur la même fiche : une seule clé
  const parents = await repo.audios.parents();
  assert.deepEqual([...parents].sort(), ['episodes:' + ep.id, 'journal:2026-09-30'].sort());
  assert.equal(parents.has('journal:2026-10-01'), false);
});

test('parents() suit les suppressions de mémos', async () => {
  const { repo } = nouveauRepo();
  const a = await repo.audios.creer(memo('journal', '2026-09-30'));
  assert.equal((await repo.audios.parents()).has('journal:2026-09-30'), true);
  await repo.audios.supprimer(a.id);
  assert.equal((await repo.audios.parents()).size, 0);
});

test('parents() ne lit aucune valeur du magasin audios (curseur de clés seulement)', async () => {
  const { repo } = nouveauRepo();
  await repo.audios.creer(memo('journal', '2026-09-30'));
  await repo.audios.creer(memo('journal', '2026-10-01'));
  await repo.journal.tous(); // ouvre la base : le test ne mesure que parents()

  // Témoin : l'espion voit bien les lectures de valeurs de metas().
  assert.ok((await lecturesDeValeurs(() => repo.audios.metas())).includes('openCursor'));

  let parents;
  const lectures = await lecturesDeValeurs(async () => { parents = await repo.audios.parents(); });
  assert.deepEqual(lectures, []);
  assert.equal(parents.size, 2);
});

// v8 (Q26) : l'Historique lit la base par ui/lecture.js, qui appelle parents().
test('Aujourd\'hui, Soins et Historique lisent repo.audios.parents(), plus metas()', () => {
  for (const f of ['ecrans/aujourdhui', 'ecrans/soins', 'lecture']) {
    const code = sansCommentaires(lire(join(RACINE, 'public', 'js', 'ui', `${f}.js`)));
    assert.match(code, /repo\.audios\.parents\(\)/, `${f}.js appelle parents()`);
    assert.doesNotMatch(code, /audios\.metas\(/, `${f}.js n'appelle plus metas()`);
  }
});
