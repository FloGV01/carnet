import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, basename } from 'node:path';
import { RACINE, lister, rel, lire, sansCommentaires } from '../aides/fichiers.js';

// v7 · Fondations 2b (B1) : les 39 icônes du lot entrent dans le module d'icônes, sans métadonnées, au trait de 2 ;
// s'y ajoutent « bien-etre » (une feuille) et « emotion ». Toute icône nommée dans l'app existe.
const MODULE = lire(join(RACINE, 'public', 'js', 'ui', 'icones.js'));
const TRACES = Object.fromEntries([...MODULE.matchAll(/^ {2}(\w+): '([^']+)',$/gm)].map((m) => [m[1], m[2]]));
const LOT = lister(join(RACINE, 'docs', 'design', 'retour-claude-design-v2', 'design_handoff_carnet_refonte', 'icons'), (p) => p.endsWith('.svg'));
// Clés plus anciennes que le lot, gardées pour ne pas renommer leurs usages.
const ANCIENNES = {
  'onglet-aujourdhui': 'aujourdhui', 'onglet-analyse': 'analyse', 'onglet-historique': 'historique', 'onglet-soins': 'soins',
  'onglet-reglages': 'reglages', 'points-positifs': 'positifs', 'notes-libres': 'note', 'moment-difficile': 'respiration',
  'en-consultation': 'bulle', 'chevron-droite': 'chevron', 'chevron-gauche': 'retour', 'memo-vocal': 'onde', dicter: 'micro',
};
const cle = (fichier) => ANCIENNES[fichier] || fichier.replace(/-(\w)/g, (_, c) => c.toUpperCase());
const nombre = (x) => String(+Number(x).toFixed(3));

test('les 39 icônes du lot sont dans le module, avec leurs tracés', () => {
  assert.equal(LOT.length, 39);
  for (const f of LOT) {
    const nom = basename(f, '.svg');
    const d = TRACES[cle(nom)];
    assert.ok(d, `${nom} → ${cle(nom)}`);
    const svg = lire(f);
    for (const m of svg.matchAll(/<path d="([^"]+)"/g)) assert.ok(d.includes(m[1]), `${nom} : tracé ${m[1]}`);
    // Un cercle devient deux arcs de son rayon.
    for (const m of svg.matchAll(/<circle cx="[^"]+" cy="[^"]+" r="([^"]+)"/g)) {
      const r = nombre(m[1]);
      assert.ok(d.includes(`a${r} ${r} 0 1 0 ${nombre(2 * m[1])} 0`), `${nom} : cercle de rayon ${r}`);
    }
    assert.equal((svg.match(/<(path|circle|rect)\b/g) || []).length > 0, true);
  }
});

test('le module : au trait de 2 par défaut, sans métadonnées ni style ; « bien-etre » et « emotion » en plus', () => {
  assert.match(MODULE, /trait = 2,/);
  assert.ok(!/metadata|c2pa|style=/i.test(sansCommentaires(MODULE)));
  for (const n of ['bienEtre', 'emotion']) assert.match(TRACES[n] || '', /^M/, n);
  for (const d of Object.values(TRACES)) assert.match(d, /^M[\d.\s,MmLlHhVvCcSsQqTtAaZz-]+$/);
});

// Noms d'icônes employés dans l'interface : Icones.x, icone="x" (ou icone: 'x'), et les onglets (Icones[o.id]).
const UI = lister(join(RACINE, 'public', 'js', 'ui'), (p) => p.endsWith('.js') && !p.endsWith('/icones.js'));
const employees = new Set(UI.flatMap((f) => {
  const code = sansCommentaires(lire(f));
  return [...code.matchAll(/Icones\.(\w+)/g), ...code.matchAll(/\bicone[=:]\s*["'](\w+)["']/g), ...code.matchAll(/\bid: '(\w+)'/g)].map((m) => m[1]);
}));

test('chaque usage qui a son icône dans le lot l\'emploie : « En parler au rendez-vous » n\'emprunte plus celle d\'« En consultation »', () => {
  // [fichier de public/js/ui, libellé, clé de l'icône du lot] ; chaque ligne qui porte le libellé et une icône emploie celle-là.
  const USAGES = [
    ['composants/en-parler.js', 'En parler au rendez-vous', 'enParlerAuRdv'],
    ['composants/questions.js', 'En consultation', 'bulle'],
    ['ecrans/rdv.js', 'En consultation', 'bulle'],
    ['ecrans/rdv.js', 'Questions', 'questions'],
    ['ecrans/reglages.js', 'Mon plan', 'monPlan'],
    ['ecrans/reglages.js', 'Moment difficile', 'respiration'],
    ['ecrans/reglages.js', 'Aide iPhone', 'aideIphone'],
  ];
  for (const [fichier, libelle, icone] of USAGES) {
    const lignes = lire(join(RACINE, 'public', 'js', 'ui', fichier)).split('\n')
      .filter((l) => new RegExp(`[>}"]${libelle}[<"]`).test(l) && /Icones\.\w+|\bicone=/.test(l));
    assert.ok(lignes.length > 0, `${fichier} : ${libelle}`);
    for (const l of lignes) assert.match(l, new RegExp(`Icones\\.${icone}\\(|icone="${icone}"`), `${fichier} : ${libelle} → ${icone}`);
  }
});

test('chaque icône du module sert dans l\'app, sauf celles qui attendent leur écran (plan v7) et les lieux (B1)', () => {
  const EN_ATTENTE = {
    lieuBureau: 'B1', lieuTeletravail: 'B1', lieuCongeRepos: 'B1', lieuArret: 'B1', lieuClinique: 'B1', lieuAutre: 'B1',
    energie: 'tâche 5, portes de l\'Analyse', rythmes: 'tâche 5, portes de l\'Analyse',
  };
  for (const n of Object.keys(EN_ATTENTE)) assert.ok(TRACES[n], `${n} : pas dans le module`);
  assert.deepEqual(Object.keys(TRACES).filter((n) => !employees.has(n) && !EN_ATTENTE[n]), []);
  // Celles des tâches 3 et 4 servent : Émotion du moment, bande du bas, « J'ai fini pour ce soir », replis d'Aujourd'hui.
  for (const n of ['emotion', 'replierSoiree', 'peseRecharge', 'note']) assert.ok(employees.has(n), n);
  // Celle de la tâche 7 sert : la feuille de l'onglet Bien-être, et le titre d'un exercice.
  assert.ok(employees.has('bienEtre'), 'bienEtre');
  // v9 (5/8) : « Ce que je faisais » est revenu, en titre de l'écran 3 de l'Émotion du moment.
  assert.ok(employees.has('ceQueJeFaisais'), 'ceQueJeFaisais');
  // v10 (4/9) : l'épingle d'un favori, hors du lot, dans la même famille (au trait, un seul tracé).
  assert.ok(employees.has('epingle'), 'epingle');
  assert.ok(TRACES.epingle, 'epingle : pas dans le module');
  // v11 (6/11) : la sortie d'un lien de Mes refuges (pas le caractère ↗, compté comme emoji) et la note de musique de l'entrée
  // de Bien-être, hors du lot, dans la même famille.
  for (const n of ['sortie', 'musique']) assert.ok(employees.has(n), n);
});

// v11 (6/11) : les deux tracés décidés au plan (en-tête, « Identifiants »), au trait, sans remplissage.
test('les icônes de Mes refuges : « sortie » et « musique », avec leurs tracés exacts', () => {
  assert.equal(TRACES.sortie, 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5');
  assert.equal(TRACES.musique, 'M9 18V5l11-2v13 M3 18a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M14 16a3 3 0 1 0 6 0a3 3 0 1 0-6 0');
});

test('toute icône nommée dans l\'app existe dans le module', () => {
  const connues = new Set([...Object.keys(TRACES), 'stop']);
  const fautes = [];
  for (const f of lister(join(RACINE, 'public', 'js', 'ui'), (p) => p.endsWith('.js'))) {
    const code = sansCommentaires(lire(f));
    const noms = [...code.matchAll(/Icones\.(\w+)/g), ...code.matchAll(/\bicone[=:]\s*["'](\w+)["']/g)].map((m) => m[1]);
    for (const n of noms) if (!connues.has(n)) fautes.push(`${rel(f)} : ${n}`);
  }
  assert.deepEqual(fautes, []);
});
