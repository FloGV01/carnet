// Repository branché sur fake-indexeddb, avec une horloge maîtrisée.
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { creerRepository } from '../../public/js/db/repository.js';

export function nouveauRepo({ date = new Date(2026, 8, 30, 21, 0), ...options } = {}) {
  const horloge = { t: date };
  const fabrique = new IDBFactory();
  const changements = [];
  const repo = creerRepository({
    fabrique, cles: IDBKeyRange, now: () => horloge.t, surChangement: (c) => changements.push(c), ...options,
  });
  return { repo, horloge, fabrique, changements };
}
