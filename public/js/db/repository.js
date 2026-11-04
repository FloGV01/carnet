// Accès aux données. Chaque écriture tient dans une seule transaction, qui vérifie aussi
// les références de liste. Les erreurs remontent en DataError (code) ou ErreurValidation.
import { req, dansTx } from './idb.js';
import { ouvrirBase } from './migrations.js';
import { DataError } from './erreurs.js';
import { normaliser, ErreurValidation, estVide, referencesDe } from '../domain/champs.js';
import { jourLogique, jourEvenement, addDays } from '../domain/dates.js';
import { nouvelId, nouvelIdListe } from '../domain/ids.js';
import { LISTES, estListe } from '../domain/listes-def.js';
import { normLabel } from '../domain/vocabulaire.js';
import { carteLibelles } from '../domain/libelles.js';
import { effacerMot } from '../domain/mots-perso.js';

export { DataError };

const PREFIXES = { episodes: 'ep', symptomes: 'sy', traitements: 'tr', rdv: 'rdv', audios: 'au', humeurs: 'hu', notes: 'no', seances: 'se' };
const AVEC_HEURE = new Set(['episodes', 'humeurs', 'notes', 'seances']);
const ERREURS_CONNEXION = new Set(['InvalidStateError', 'UnknownError', 'TransactionInactiveError']);
const PARENTS_AUDIO = ['journal', 'episodes', 'symptomes', 'traitements', 'rdv'];
// Méta qui ne comptent pas comme une saisie (pas de mise à jour de derniereEcriture).
const META_SANS_MARQUE = new Set(['schema', 'installation', 'derniereEcriture', 'derniereSauvegarde', 'constatsAffiches', 'signalMasque', 'explosionsDepuis', 'favorisBienEtre']);
const nonNuls = (o) => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => v !== null && v !== undefined));

export function creerRepository({
  nom = 'carnet',
  fabrique = globalThis.indexedDB,
  cles = globalThis.IDBKeyRange,
  now = () => new Date(),
  alea = globalThis.crypto,
  surChangement = () => {},
  surVersionChange = () => {},
} = {}) {
  let dbP = null;
  const horo = () => now().toISOString();

  function getDb() {
    if (!dbP) {
      dbP = ouvrirBase({ nom, fabrique, horodatage: horo(), surVersionChange: async () => { try { await surVersionChange(); } finally { dbP = null; } } })
        .catch((e) => { dbP = null; throw e; });
    }
    return dbP;
  }

  // Rouvre la connexion une fois si WebKit l'a perdue (bug iOS 17.4+), puis rejoue.
  async function tx(stores, mode, travail) {
    for (let essai = 0; ; essai++) {
      const db = await getDb();
      try {
        return await dansTx(db, stores, mode, travail);
      } catch (e) {
        if (essai === 0 && e && ERREURS_CONNEXION.has(e.name)) {
          try { db.close(); } catch { /* déjà fermée */ }
          dbP = null;
          continue;
        }
        throw e;
      }
    }
  }

  function signaler(store, cle) {
    try { surChangement({ store, cle }); } catch { /* l'abonné ne doit pas casser l'écriture */ }
  }

  const marquer = (t) => t.objectStore('meta').put({ cle: 'derniereEcriture', valeur: horo() });

  async function verifierRefs(t, store, valeur) {
    const listes = t.objectStore('listes');
    for (const id of referencesDe(store, valeur)) {
      if (!(await req(listes.get(id)))) throw new ErreurValidation([`référence inconnue : ${id}`]);
    }
  }

  function preparer(store, fusion, contexte = {}) {
    const { valeur, erreurs } = normaliser(store, fusion, { origine: 'app', ...contexte });
    if (erreurs.length) throw new ErreurValidation(erreurs);
    return valeur;
  }

  // v9 : un relevé qui cite un mot à soi n'est valable que si ce mot est dans la méta `motsPerso`, lue dans la
  // transaction de l'écriture (spec §9). Les autres magasins ne citent aucun mot.
  async function contexteDe(t, store) {
    if (store !== 'humeurs') return {};
    const r = await req(t.objectStore('meta').get('motsPerso'));
    return { perso: r ? r.valeur : null };
  }

  async function nbAudios(t, parentStore, parentId) {
    return req(t.objectStore('audios').index('parent').count([parentStore, parentId]));
  }

  // ---------- journal ----------
  const journal = {
    lire: (date) => tx(['journal'], 'readonly', async (t) => (await req(t.objectStore('journal').get(date))) || null),

    patch: async (date, changements) => {
      const res = await tx(['journal', 'listes', 'meta', 'audios'], 'readwrite', async (t) => {
        const os = t.objectStore('journal');
        const existant = await req(os.get(date));
        const valeur = preparer('journal', { ...(existant || {}), ...changements, date });
        await verifierRefs(t, 'journal', valeur);
        marquer(t);
        if (estVide('journal', valeur) && (await nbAudios(t, 'journal', date)) === 0) {
          if (existant) os.delete(date);
          return null;
        }
        const h = horo();
        const enreg = { ...valeur, createdAt: (existant && existant.createdAt) || h, updatedAt: h };
        os.put(enreg);
        return enreg;
      });
      signaler('journal', date);
      return res;
    },

    supprimer: async (date) => {
      let photo = null;
      const res = await tx(['journal', 'audios', 'meta'], 'readwrite', async (t) => {
        const entree = (await req(t.objectStore('journal').get(date))) || null;
        const audios = await req(t.objectStore('audios').index('parent').getAll(['journal', date]));
        t.objectStore('journal').delete(date);
        for (const a of audios) t.objectStore('audios').delete(a.id);
        marquer(t);
        if (entree || audios.length) photo = { entree, audios };
        return photo || { entree, audios };
      });
      signaler('journal', date);
      return res;
    },

    // Une saisie faite entre la suppression et « Annuler » n'est jamais écrasée : elle prime.
    restaurer: async ({ entree, audios = [] }) => {
      await tx(['journal', 'audios', 'meta'], 'readwrite', async (t) => {
        if (entree) {
          const actuelle = await req(t.objectStore('journal').get(entree.date));
          t.objectStore('journal').put(actuelle ? { ...entree, ...nonNuls(actuelle), updatedAt: horo() } : entree);
        }
        for (const a of audios) t.objectStore('audios').put(a);
        marquer(t);
      });
      if (entree) signaler('journal', entree.date);
    },

    plage: (du, au) => tx(['journal'], 'readonly', (t) => req(t.objectStore('journal').getAll(cles.bound(du, au)))),
    tous: () => tx(['journal'], 'readonly', (t) => req(t.objectStore('journal').getAll())),
    dates: () => tx(['journal'], 'readonly', (t) => req(t.objectStore('journal').getAllKeys())),
  };

  // ---------- événements datés (épisodes, symptômes, traitements, humeurs, notes, séances) et rendez-vous ----------
  function evenements(store) {
    const stores = [store, 'listes', 'meta', 'audios'];
    return {
      // L'id est tiré une seule fois : un nouvel essai réécrit la même clé, sans doublon.
      creer: async (brut = {}, { id = nouvelId(PREFIXES[store], alea) } = {}) => {
        const res = await tx(stores, 'readwrite', async (t) => {
          const valeur = preparer(store, { ...brut, id }, await contexteDe(t, store));
          await verifierRefs(t, store, valeur);
          const h = horo();
          const enreg = { ...valeur, createdAt: h, updatedAt: h };
          t.objectStore(store).put(enreg);
          marquer(t);
          return enreg;
        });
        signaler(store, res.id);
        return res;
      },

      modifier: async (id, changements) => {
        const res = await tx(stores, 'readwrite', async (t) => {
          const os = t.objectStore(store);
          const existant = await req(os.get(id));
          if (!existant) throw new DataError('INTROUVABLE', `${store} ${id} introuvable`);
          const valeur = preparer(store, { ...existant, ...changements, id }, await contexteDe(t, store));
          await verifierRefs(t, store, valeur);
          marquer(t);
          if (estVide(store, valeur) && (await nbAudios(t, store, id)) === 0) { os.delete(id); return null; }
          const enreg = { ...valeur, createdAt: existant.createdAt, updatedAt: horo() };
          os.put(enreg);
          return enreg;
        });
        signaler(store, id);
        return res;
      },

      supprimer: async (id) => {
        let photo = null;
        const res = await tx([store, 'audios', 'meta'], 'readwrite', async (t) => {
          const entree = (await req(t.objectStore(store).get(id))) || null;
          const audios = await req(t.objectStore('audios').index('parent').getAll([store, id]));
          t.objectStore(store).delete(id);
          for (const a of audios) t.objectStore('audios').delete(a.id);
          marquer(t);
          if (entree || audios.length) photo = { entree, audios };
          return photo || { entree, audios };
        });
        signaler(store, id);
        return res;
      },

      restaurer: async ({ entree, audios = [] }) => {
        await tx([store, 'audios', 'meta'], 'readwrite', async (t) => {
          if (entree) t.objectStore(store).put(entree);
          for (const a of audios) t.objectStore('audios').put(a);
          marquer(t);
        });
        if (entree) signaler(store, entree.id);
      },

      lire: (id) => tx([store], 'readonly', async (t) => (await req(t.objectStore(store).get(id))) || null),
      tous: () => tx([store], 'readonly', (t) => req(t.objectStore(store).getAll())),

      // Événements rattachés aux jours [du, au] (règle unique : avant 04:00, c'est la veille).
      parJour: (du, au) => tx([store], 'readonly', async (t) => {
        if (store === 'rdv') return [];
        const fin = AVEC_HEURE.has(store) ? addDays(au, 1) : au;
        const liste = await req(t.objectStore(store).index('date').getAll(cles.bound(du, fin)));
        return liste
          .filter((e) => { const j = jourEvenement(e.date, e.heure); return j >= du && j <= au; })
          .sort((a, b) => `${a.date} ${a.heure || ''}`.localeCompare(`${b.date} ${b.heure || ''}`));
      }),
    };
  }

  // ---------- listes ----------
  const trierItems = (items) => items.sort((a, b) => (a.liste === b.liste ? a.ordre - b.ordre : a.liste.localeCompare(b.liste)));
  const correspond = (it, cible) => normLabel(it.libelle) === cible || (it.alias || []).some((a) => normLabel(a) === cible);
  function exigerModifiable(liste) {
    if (!estListe(liste)) throw new DataError('LISTE_INCONNUE', `Liste inconnue : ${liste}`);
    if (LISTES[liste].sensFixe) throw new DataError('SENS_FIXE', 'Cette liste se renomme seulement.');
  }
  async function itemsDe(t, liste) { return req(t.objectStore('listes').index('liste').getAll(liste)); }

  const listes = {
    items: (liste) => tx(['listes'], 'readonly', async (t) => trierItems(
      liste ? await itemsDe(t, liste) : await req(t.objectStore('listes').getAll()))),

    libelles: async (liste) => carteLibelles(await listes.items(liste)),

    trouver: (liste, texte) => tx(['listes'], 'readonly', async (t) => {
      const cible = normLabel(texte);
      const items = (await itemsDe(t, liste)).filter((it) => correspond(it, cible));
      return items.find((it) => !it.archive) || items[0] || null;
    }),

    creer: async (liste, texte, { origine = 'utilisateur' } = {}) => {
      exigerModifiable(liste);
      const propre = String(texte ?? '').normalize('NFC').trim();
      if (!propre) throw new ErreurValidation(['libellé vide']);
      const res = await tx(['listes', 'meta'], 'readwrite', async (t) => {
        const os = t.objectStore('listes');
        const items = await itemsDe(t, liste);
        const cible = normLabel(propre);
        const existant = items.find((it) => correspond(it, cible) && !it.archive) || items.find((it) => correspond(it, cible));
        if (existant) {
          if (existant.archive) { const maj = { ...existant, archive: false, updatedAt: horo() }; os.put(maj); marquer(t); return maj; }
          return existant;
        }
        const h = horo();
        const item = {
          id: nouvelIdListe(liste, alea), liste, libelle: propre, ordre: Math.max(0, ...items.map((i) => i.ordre)) + 10,
          archive: false, alias: [], exclusif: false, horsClassement: false, agreable: false, origine, createdAt: h, updatedAt: h,
        };
        os.put(item);
        marquer(t);
        return item;
      });
      signaler('listes', res.id);
      return res;
    },

    renommer: async (id, texte) => {
      const propre = String(texte ?? '').normalize('NFC').trim();
      if (!propre) throw new ErreurValidation(['libellé vide']);
      const res = await tx(['listes', 'meta'], 'readwrite', async (t) => {
        const os = t.objectStore('listes');
        const item = await req(os.get(id));
        if (!item) throw new DataError('INTROUVABLE', `Élément ${id} introuvable`);
        const cible = normLabel(propre);
        const autres = (await itemsDe(t, item.liste)).filter((it) => it.id !== id);
        if (autres.some((it) => correspond(it, cible))) throw new DataError('LIBELLE_EXISTANT', 'Ce libellé existe déjà dans la liste.');
        const alias = normLabel(item.libelle) === cible ? item.alias : [...new Set([...(item.alias || []), item.libelle])]
          .filter((a) => normLabel(a) !== cible);
        const maj = { ...item, libelle: propre, alias, updatedAt: horo() };
        os.put(maj);
        marquer(t);
        return maj;
      });
      signaler('listes', id);
      return res;
    },

    reordonner: async (liste, ids) => {
      exigerModifiable(liste);
      await tx(['listes', 'meta'], 'readwrite', async (t) => {
        const os = t.objectStore('listes');
        const items = trierItems(await itemsDe(t, liste));
        const ordre = [...ids.filter((id) => items.some((i) => i.id === id)), ...items.map((i) => i.id).filter((id) => !ids.includes(id))];
        const h = horo();
        ordre.forEach((id, i) => { const it = items.find((x) => x.id === id); os.put({ ...it, ordre: (i + 1) * 10, updatedAt: h }); });
        marquer(t);
      });
      signaler('listes', liste);
    },

    archiver: (id) => basculerArchive(id, true),
    restaurer: (id) => basculerArchive(id, false),
  };

  async function basculerArchive(id, archive) {
    const res = await tx(['listes', 'meta'], 'readwrite', async (t) => {
      const os = t.objectStore('listes');
      const item = await req(os.get(id));
      if (!item) throw new DataError('INTROUVABLE', `Élément ${id} introuvable`);
      exigerModifiable(item.liste);
      const maj = { ...item, archive, updatedAt: horo() };
      os.put(maj);
      marquer(t);
      return maj;
    });
    signaler('listes', id);
    return res;
  }

  // ---------- mémos vocaux ----------
  const audios = {
    // Crée le mémo. Le parent du journal est créé s'il n'existe pas encore. La date du mémo
    // est celle de sa fiche (jamais une valeur libre).
    creer: async ({ parentStore, parentId, dureeMs, mime, taille, data }) => {
      if (!PARENTS_AUDIO.includes(parentStore)) throw new DataError('VALIDATION', 'parent invalide');
      if (!(data instanceof ArrayBuffer)) throw new DataError('VALIDATION', 'données audio invalides');
      const id = nouvelId(PREFIXES.audios, alea);
      const stores = ['audios', 'meta', parentStore];
      const res = await tx(stores, 'readwrite', async (t) => {
        const parent = await req(t.objectStore(parentStore).get(parentId));
        const h = horo();
        if (!parent) {
          if (parentStore !== 'journal') throw new DataError('INTROUVABLE', 'Fiche introuvable pour ce mémo.');
          const vide = preparer('journal', { date: parentId });
          t.objectStore('journal').put({ ...vide, createdAt: h, updatedAt: h });
        }
        const enreg = {
          id, parentStore, parentId, date: parentStore === 'journal' ? parentId : (parent.date ?? null),
          dureeMs: Math.max(0, Math.round(dureeMs || 0)), mime: mime || 'audio/mp4', taille: taille ?? data.byteLength, data, createdAt: h,
        };
        t.objectStore('audios').put(enreg);
        marquer(t);
        return enreg;
      });
      signaler('audios', res.id);
      return res;
    },

    parParent: (parentStore, parentId) => tx(['audios'], 'readonly', async (t) =>
      (await req(t.objectStore('audios').index('parent').getAll([parentStore, parentId])))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))),

    lire: (id) => tx(['audios'], 'readonly', async (t) => (await req(t.objectStore('audios').get(id))) || null),

    // Supprime le mémo ; une fiche restée vide sans autre mémo part avec lui.
    supprimer: async (id) => {
      let photo = null;
      const res = await tx(['audios', 'meta', ...PARENTS_AUDIO], 'readwrite', async (t) => {
        const audio = await req(t.objectStore('audios').get(id));
        if (!audio) return photo || { audio: null, parent: null };
        t.objectStore('audios').delete(id);
        const os = t.objectStore(audio.parentStore);
        const fiche = await req(os.get(audio.parentId));
        let parent = null;
        if (fiche && estVide(audio.parentStore, fiche) && (await nbAudios(t, audio.parentStore, audio.parentId)) === 0) {
          os.delete(audio.parentId);
          parent = fiche;
        }
        marquer(t);
        photo = { audio, parent };
        return photo;
      });
      signaler('audios', id);
      if (res.parent) signaler(res.audio.parentStore, res.audio.parentId);
      return res;
    },

    // Remet le mémo. La fiche supprimée avec lui n'est remise que si elle n'a pas été recréée
    // entre-temps (une saisie faite pendant les 5 s prime). Jamais de mémo orphelin.
    restaurer: async ({ audio, parent }) => {
      if (!audio) return false;
      const ok = await tx(['audios', 'meta', ...PARENTS_AUDIO], 'readwrite', async (t) => {
        const os = t.objectStore(audio.parentStore);
        const actuelle = await req(os.get(audio.parentId));
        if (!actuelle) {
          if (parent) os.put(parent);
          else if (audio.parentStore === 'journal') { const h = horo(); os.put({ ...preparer('journal', { date: audio.parentId }), createdAt: h, updatedAt: h }); }
          else return false;
        }
        t.objectStore('audios').put(audio);
        marquer(t);
        return true;
      });
      if (ok) { signaler(audio.parentStore, audio.parentId); signaler('audios', audio.id); }
      return ok;
    },

    // Les fiches qui ont au moins un mémo, en clés « magasin:id ». Curseur de clés sur l'index
    // « parent » : les sons ne sont jamais lus, quel que soit le nombre de mémos.
    parents: () => tx(['audios'], 'readonly', (t) => new Promise((ok, ko) => {
      const res = new Set();
      const r = t.objectStore('audios').index('parent').openKeyCursor();
      r.onerror = () => ko(r.error);
      r.onsuccess = () => {
        const c = r.result;
        if (!c) { ok(res); return; }
        res.add(`${c.key[0]}:${c.key[1]}`);
        c.continue();
      };
    })),

    // Métadonnées seules (sans les octets), pour l'espace utilisé dans Réglages. Parcourt tout
    // le magasin : à ne pas appeler pour un simple « a un mémo ? » (voir parents).
    metas: () => tx(['audios'], 'readonly', (t) => new Promise((ok, ko) => {
      const res = [];
      const r = t.objectStore('audios').openCursor();
      r.onerror = () => ko(r.error);
      r.onsuccess = () => {
        const c = r.result;
        if (!c) { ok(res); return; }
        const { data, ...meta } = c.value;
        res.push(meta);
        c.continue();
      };
    })),
  };

  // ---------- méta ----------
  const meta = {
    lire: (cle) => tx(['meta'], 'readonly', async (t) => { const r = await req(t.objectStore('meta').get(cle)); return r ? r.valeur : null; }),
    ecrire: async (cle, valeur) => {
      await tx(['meta'], 'readwrite', (t) => {
        t.objectStore('meta').put({ cle, valeur });
        if (!META_SANS_MARQUE.has(cle)) marquer(t);
      });
      signaler('meta', cle);
    },
    // Lecture et écriture dans la même transaction (transformer est pur et synchrone) : deux écrans
    // qui changent la même clé (Mon plan) ne s'écrasent pas.
    modifier: async (cle, transformer) => {
      const valeur = await tx(['meta'], 'readwrite', async (t) => {
        const os = t.objectStore('meta');
        const r = await req(os.get(cle));
        const v = transformer(r ? r.valeur : null);
        os.put({ cle, valeur: v });
        if (!META_SANS_MARQUE.has(cle)) marquer(t);
        return v;
      });
      signaler('meta', cle);
      return valeur;
    },
  };

  // ---------- mots à soi (v9, spec §4.5) ----------
  // Un mot à soi s'efface seulement s'il ne sert dans aucun relevé ; sinon il se met de côté (domain/mots-perso.js). La
  // vérification et l'effacement tiennent dans la même transaction : un relevé écrit entre les deux ne perd pas son mot.
  const motsPerso = {
    effacer: async (id) => {
      const valeur = await tx(['humeurs', 'meta'], 'readwrite', async (t) => {
        const utilise = (await req(t.objectStore('humeurs').getAll())).some((h) => h.emotion === id);
        const os = t.objectStore('meta');
        const r = await req(os.get('motsPerso'));
        const v = effacerMot(r ? r.valeur : null, id, utilise);
        os.put({ cle: 'motsPerso', valeur: v });
        marquer(t);
        return v;
      });
      signaler('meta', 'motsPerso');
      return valeur;
    },
  };

  return {
    aujourdhui: () => jourLogique(now()),
    maintenant: () => now(),
    journal,
    episodes: evenements('episodes'),
    symptomes: evenements('symptomes'),
    traitements: evenements('traitements'),
    rdv: evenements('rdv'),
    humeurs: evenements('humeurs'),
    notes: evenements('notes'),
    seances: evenements('seances'),
    listes,
    audios,
    meta,
    motsPerso,
    tx,
    ouvrir: getDb,
    fermer: async () => { if (dbP) { const db = await dbP.catch(() => null); if (db) db.close(); dbP = null; } },
  };
}
