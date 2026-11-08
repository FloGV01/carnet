import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { RACINE, lister, rel, lire, sansCommentaires } from '../aides/fichiers.js';

// v11 (11/11) · Ce que la v11 laisse écrit : la règle « Zéro réseau » de CLAUDE.md et sa seule exception, l'entrée
// v11.0.0 de docs/decisions.md, les deux journaux de version et la recette de l'iPhone. Et les règles levées (spec v11
// §13) ne laissent aucune trace : ni `test.fail()`, ni « Marge du soir ».
const doc = (...p) => lire(join(RACINE, ...p));
const entreeV11 = () => doc('docs', 'decisions.md').split(/^(?=## )/m).find((e) => e.startsWith('## 2026-11-08 : v11.0.0'));
const section = (entree, titre) => {
  const i = entree.indexOf(`### ${titre}\n`);
  assert.ok(i > 0, `${titre} absent`);
  return entree.slice(i).split('\n### ')[0];
};

test('CLAUDE.md : « Zéro réseau » dit sa seule exception, la connexion à Spotify à son toucher, et le reste de la règle ne change pas', () => {
  const regle = doc('CLAUDE.md').split('\n').find((l) => l.startsWith('- **Zéro réseau, zéro CDN.**'));
  assert.ok(regle, 'règle « Zéro réseau » absente de CLAUDE.md');
  for (const x of ['Tout est vendorisé (`npm run vendor`)', 'Aucune analytics, aucun appel sortant', 'La CSP est dans `netlify.toml`, qui est la seule source des en-têtes.',
    'seule exception', '« Choisir dans mon compte »', '`public/js/plateforme/spotify.js` est le seul fichier réseau hors de `sw.js`', 'aucun jeton n\'est gardé',
    '`connect-src`', '`https://accounts.spotify.com`', '`https://api.spotify.com`']) {
    assert.ok(regle.includes(x), `CLAUDE.md : ${x}`);
  }
});

test('docs/decisions.md : l\'entrée v11.0.0, ses règles levées, l\'exception réseau et son risque, ses écarts, et ce qui attend l\'utilisateur', () => {
  const v11 = entreeV11();
  assert.ok(v11, 'entrée v11.0.0 absente');
  const entrees = doc('docs', 'decisions.md').split(/^(?=## )/m);
  assert.deepEqual(entrees.filter((x) => x.includes('**Version 11.0.0**')).map((x) => x.split('\n', 1)[0]), ['## 2026-11-08 : v11.0.0, six retours après la v10']);
  assert.ok(v11.includes('docs/superpowers/specs/2026-11-05-carnet-v11-design.md'));
  assert.match(v11, /`DB_VERSION` 6, confirmé/);
  const levees = section(v11, 'Règles levées ou changées (spec §13)');
  for (const x of ['**Le soir ne tient plus sans défiler**', '**la décision ouverte de la v8 sur le soir avec les zones sûres est close**', '« Marge du soir »',
    '**« Une seule zone, pas trois »**', '**« Quatre entrées » de Bien-être**', '**Dérogation**', '**Les écrans de l\'émotion noirs dans les deux thèmes**',
    '**« Zéro réseau, aucun appel sortant »**']) {
    assert.ok(levees.includes(x), `règles levées : ${x}`);
  }
  const reseau = section(v11, 'L\'exception réseau : la connexion à Spotify (spec §8.3)');
  for (const x of ['**Le risque accepté**', '`playlist-read-private`', '`script-src` reste `\'self\'`', '**`CLAUDE.md`**']) assert.ok(reseau.includes(x), `exception réseau : ${x}`);
  const icone = section(v11, 'L\'icône et « Revenir » (tâche 10)');
  assert.match(icone, /\*\*Le rouge et le vert des émotions sortent ici de leurs écrans\*\*/);
  // Relecture du nom : depuis le nom Emozio (entrée du 07/11), les étapes de l'Aide iPhone ne sont plus celles de la spec
  // mot pour mot. Aucune ligne du journal ne le dit plus sans dire l'exception du nom.
  assert.ok(icone.includes('les 5 étapes de la spec, mot pour mot sauf le nom Emozio et sa vérification sous l\'icône (étapes 1 et 3 ; entrée « 2026-11-07 : le nom Emozio »)'));
  const motPourMot = doc('docs', 'decisions.md').split('\n').filter((l) => l.includes('Changer d\'icône sans rien perdre') && l.includes('mot pour mot'));
  assert.ok(motPourMot.length >= 2, 'les deux entrées parlent des étapes');
  assert.deepEqual(motPourMot.filter((l) => !/mot pour mot sauf le nom Emozio|pour ce seul nom/.test(l)), []);
  const ecarts = section(v11, 'Écarts au texte de la spec');
  for (const x of ['`oubli*`', '« Retirer ces playlists »', '« Une seule lecture : Emozio ne garde pas la connexion. »',
    'le soir entier est contrôlé à 33 px ; à partir de 40 px, seul ce que la v11 y ajoute']) {
    assert.ok(ecarts.includes(x), `écarts : ${x}`);
  }
  assert.match(section(v11, 'Contrôle global (tâche 11)'), /Le soir non plus à 33 px, en entier, page comprise\. À partir de 40 px, seules les trois roues/);
  const attente = section(v11, 'En attente de l\'utilisateur');
  for (const x of ['**barre finale comprise**', '403', 'préparer ses playlists', '**jamais son mot de passe**', '**Le correctif 11.0.1**', '**Les limites assumées, à lui dire**',
    '**Le passage à la nouvelle icône**', '**Le nom Emozio**', 'tableau de bord développeur de Spotify', '**Les points de la v10 restent ouverts**']) {
    assert.ok(attente.includes(x), `en attente : ${x}`);
  }
  assert.ok(v11.includes('### Textes nouveaux à relire après la publication\n'));
});

test('les journaux de version ont leur section v11, qui renvoie à sa spécification et à docs/decisions.md, et dit que les écrans de l\'émotion suivent le thème', () => {
  const spec = doc('docs', 'v6-specification.md');
  const i = spec.indexOf('## 19. v11 (08/11)');
  assert.ok(i > 0, 'section v11 absente de docs/v6-specification.md');
  const v11 = spec.slice(i);
  for (const x of ['docs/superpowers/specs/2026-11-05-carnet-v11-design.md', 'docs/decisions.md', 'suivent désormais le thème']) assert.ok(v11.includes(x), x);
  const design = doc('docs', 'design', 'integration.md');
  const titre = design.match(/^## v11 : .*\(08\/11\)$/m);
  assert.ok(titre, 'section v11 absente de docs/design/integration.md');
  const v11d = design.slice(titre.index);
  for (const x of ['docs/superpowers/specs/2026-11-05-carnet-v11-design.md', 'docs/decisions.md', 'suivent désormais le thème']) assert.ok(v11d.includes(x), x);
});

// La recette se coche à chaque jalon : la section v11 s'arrête à l'en-tête suivant (une v12 plus bas n'y compte pas), et ses
// sept points restent sept, cochés ou non.
const sectionV11 = (recette) => recette.slice(recette.indexOf('## v11')).split(/\n(?=## )/)[0];

test('docs/recette-iphone.md, « v11 » : les six points de la spec §14, et le soir encore en moins de 30 s avec trois roues', () => {
  const recette = doc('docs', 'recette-iphone.md');
  const v11 = sectionV11(recette);
  assert.ok(recette.includes('## v11'));
  for (const x of ['**Le geste de retour, au doigt**', '**La roue, au doigt**', '**La connexion à Spotify et son retour dans Emozio**',
    '**L\'ouverture d\'une playlist et le retour dans Emozio**', '**La nouvelle icône et le passage sans perte**', 'au soleil', 'La barre du haut',
    '**Le soir, encore en moins de 30 s**']) {
    assert.ok(v11.includes(x), `recette : ${x}`);
  }
  assert.equal((v11.match(/^- \[[ xX]\] /gm) || []).length, 7);
});

test('docs/recette-iphone.md, « v11 » : le compte de ses points tient quand l\'utilisateur en coche un, et quand une section v12 vient après', () => {
  const recette = doc('docs', 'recette-iphone.md');
  const cochee = recette.replace('- [ ] **La roue, au doigt**', '- [x] **La roue, au doigt**').replace('- [ ] **Le geste de retour', '- [X] **Le geste de retour');
  assert.notEqual(cochee, recette);
  const suivie = `${cochee.trimEnd()}\n\n## v12\n\n- [ ] Un point de la v12.\n- [ ] Un autre.\n- [ ] Un troisième.\n`;
  for (const r of [recette, cochee, suivie]) assert.equal((sectionV11(r).match(/^- \[[ xX]\] /gm) || []).length, 7);
  assert.ok(!sectionV11(suivie).includes('## v12'));
});

// Spec v11 §13 : les 4 test.fail() de la v8 et la marge du soir du Diagnostic sont partis avec la règle du soir sans défiler.
test('les règles levées ne laissent aucune trace : aucun test.fail() dans les tests e2e, aucune « Marge du soir » dans l\'app', () => {
  const e2e = lister(join(RACINE, 'tests', 'e2e'), (p) => p.endsWith('.js'));
  assert.ok(e2e.length > 50);
  assert.deepEqual(e2e.filter((f) => /\btest\.fail\(/.test(sansCommentaires(lire(f)))).map(rel), []);
  const app = lister(join(RACINE, 'public', 'js'), (p) => p.endsWith('.js') && !p.includes(`${'/'}vendor${'/'}`));
  assert.deepEqual(app.filter((f) => /Marge du soir|Marge de « J'ai fini »/.test(sansCommentaires(lire(f)))).map(rel), []);
});
