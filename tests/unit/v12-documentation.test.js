import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { RACINE, lire } from '../aides/fichiers.js';

// v12 (9/9) · Ce que la v12 laisse écrit (plan v12, tâche 9 ; spec §8) : la règle « Zéro réseau » de CLAUDE.md et son exception
// étendue, le jeton jamais écrit, la ligne de l'accent ; l'entrée v12.0.0 de docs/decisions.md et ses règles levées, annotées
// dans leurs entrées d'origine ; les deux journaux de version ; la recette de l'iPhone ; la version 12.0.0.
const doc = (...p) => lire(join(RACINE, ...p));
const entrees = () => doc('docs', 'decisions.md').split(/^(?=## )/m);
const entreeV12 = () => entrees().find((e) => e.startsWith('## 2026-11-09 : v12.0.0'));
const section = (entree, titre) => {
  const i = entree.indexOf(`### ${titre}\n`);
  assert.ok(i > 0, `${titre} absent`);
  return entree.slice(i).split('\n### ')[0];
};

test('CLAUDE.md : « Zéro réseau » dit « Mettre à jour la liste », les morceaux et le jeton jamais écrit ; une ligne dit l\'accent vert et les couleurs des émotions', () => {
  const lignes = doc('CLAUDE.md').split('\n');
  const regle = lignes.find((l) => l.startsWith('- **Zéro réseau, zéro CDN.**'));
  assert.ok(regle, 'règle « Zéro réseau » absente de CLAUDE.md');
  for (const x of ['seule exception', '« Choisir dans mon compte »', '« Changer de playlist »', '« Mettre à jour la liste »', 'dans Mes refuges',
    'jamais à l\'ouverture ni dans Moment difficile', '`v1/playlists/{id}/items`', 'aucun jeton n\'est gardé',
    'jamais écrit ; en mémoire le temps de choisir une playlist, 10 min au plus', '`connect-src`', '`https://accounts.spotify.com`', '`https://api.spotify.com`']) {
    assert.ok(regle.includes(x), `CLAUDE.md, zéro réseau : ${x}`);
  }
  // L'accent, en une ligne, juste avant « Zéro réseau ».
  const i = lignes.indexOf(regle);
  const accent = lignes[i - 1];
  assert.ok(accent.startsWith('- **Une seule couleur d\'accent, le vert (v12).**'), accent);
  for (const x of ['« choisi » ou « agir », jamais une valeur', 'jamais un rond ni un point', 'écrans de l\'émotion', 'graphiques', '« Réveil la nuit »', 'coche',
    '4 zones', '7 familles', 'réservées aux émotions', '`--danger`', 'les rubriques n\'ont plus de couleur']) {
    assert.ok(accent.includes(x), `CLAUDE.md, accent : ${x}`);
  }
});

test('docs/decisions.md : l\'entrée v12.0.0, la liste de la spec §8, ses écarts, le contrôle global et ce qui attend l\'utilisateur', () => {
  const v12 = entreeV12();
  assert.ok(v12, 'entrée v12.0.0 absente');
  // Une seule entrée de version 12.0.0, la dernière, juste après celle de la v11.
  assert.deepEqual(entrees().filter((x) => x.includes('**Version 12.0.0**')).map((x) => x.split('\n', 1)[0]), ['## 2026-11-09 : v12.0.0, la musique de Détente et un design simple']);
  const titres = entrees().map((e) => e.split('\n', 1)[0]);
  assert.equal(titres.at(-1), '## 2026-11-09 : v12.0.0, la musique de Détente et un design simple');
  assert.equal(titres.at(-2), '## 2026-11-08 : v11.0.0, six retours après la v10');
  for (const x of ['docs/superpowers/specs/2026-11-09-emozio-v12-design.md', 'docs/superpowers/plans/2026-11-09-emozio-v12.md', '`FORMAT_VERSION` 9']) assert.ok(v12.includes(x), x);
  assert.match(v12, /`DB_VERSION` 6, confirmé/);
  // La spec §8 : les décisions du §2, les jetons, l'accent B et son sens, les graphiques, les icônes pleines (B1), la coche, les
  // écrans de l'émotion sans accent, la voie D, le format 9, la fin de la palette 2b.
  const decisions = section(v12, 'Décisions de l\'utilisateur (spec §2, 08 et 09/11)');
  for (const x of ['« Oui, ça me va »', '**Premium**', '« Trop de couleurs »', '**rien n\'est replié ni caché**', '« Oui, on part là-dessus. »', '« Vert iPhone »',
    'rendu **B**', '**La confiance et l\'estime de soi : annulées.**', '11.0.1']) {
    assert.ok(decisions.includes(x), `décisions : ${x}`);
  }
  const jetons = section(v12, 'Les jetons (spec §5.2 et §5.3, tâche 3)');
  for (const x of ['`--barre`', '`--contour`', '`--desactive`', '`--piste`', '`--fenetre`', '`--donnee`', '`--accent`, `--sur-accent`, `--accent-texte`', '#F2F2F7']) {
    assert.ok(jetons.includes(x), `jetons : ${x}`);
  }
  const accent = section(v12, 'L\'accent B et sa règle de sens (spec §5.3)');
  for (const x of ['#1C7D36', '#30D158', '« choisi » ou « agir », jamais une valeur', 'jamais un rond ni un point', '`--surface-2`',
    '**Les écrans de l\'émotion (`.moment-plein`) n\'ont pas d\'accent**', '« Réveil la nuit »']) {
    assert.ok(accent.includes(x), `accent : ${x}`);
  }
  assert.match(section(v12, 'La règle des graphiques (spec §5.5, tâche 5)'), /L'accent n'entre jamais dans un graphique/);
  const levees = section(v12, 'Règles levées ou changées');
  for (const x of ['**La palette 2b prend fin**', '**B1 · Icônes**', '**la coche gardée**', '« Jamais de rouge ni de vert pour dire bien ou mal »', '**`--danger`**']) {
    assert.ok(levees.includes(x), `règles levées : ${x}`);
  }
  const jeton = section(v12, 'La voie D du jeton (spec §6.4, tâches 2 et 6)');
  for (const x of ['`lireMorceaux(id)`', '**une fois**', '**10 minutes**', '**Le jeton n\'est jamais écrit**', '**Rien n\'est écrit avant la réponse des morceaux.**', '« Annuler »']) {
    assert.ok(jeton.includes(x), `voie D : ${x}`);
  }
  assert.match(section(v12, 'Le format 9 (tâche 1)'), /`MISES_A_NIVEAU\[8\]` ne transforme rien/);
  const controle = section(v12, 'Contrôle global (tâche 9)');
  for (const x of ['99 écrans', '33, 40, 47 et 53 px', '`HERITES`', 'la v12 n\'en ajoute aucun', '« Mouvement »', '**Le second correctif**', 'l\'empreinte de la version',
    '**Aucune trace des 12 couleurs de rubrique**',
    '**Version 12.0.0**', '`node scripts/temoins.mjs --verifier`']) {
    assert.ok(controle.includes(x), `contrôle global : ${x}`);
  }
  const ecarts = section(v12, 'Écarts au texte de la spec');
  for (const x of ['`fields`', '« Ce lien peut ne rien ouvrir depuis Emozio. »', '« Coller le code de Spotify »']) assert.ok(ecarts.includes(x), `écarts : ${x}`);
  const attente = section(v12, 'En attente de l\'utilisateur');
  for (const x of ['`docs/recette-iphone.md`', 'collaboratives', 'Premium', '« Morceau dans sa playlist »', 'fermer l\'onglet puis rouvrir l\'adresse', '**Hors de la v12**']) {
    assert.ok((attente + section(v12, 'À essayer sur l\'iPhone')).includes(x), `en attente : ${x}`);
  }
  const textes = section(v12, 'Textes nouveaux à relire après la publication');
  for (const x of ['« Un toucher ouvre Spotify. »', '« La suite est dans Spotify. »', '« Choisis ta playlist dans ton compte Spotify, ou colle son lien. »', '« Coller un lien »',
    '« Changer de playlist »', '« Mettre à jour la liste »', '« Ouvrir un morceau »', '« Morceau seul »', '« Morceau dans sa playlist »',
    'Ta liste reste.', 'Dans Safari, ferme l\'onglet d\'Emozio s\'il est ouvert, puis rouvre l\'adresse : la page se met à jour.']) {
    assert.ok(textes.includes(x), `textes : ${x}`);
  }
});

test('docs/decisions.md : les règles levées par la v12 sont annotées dans leurs entrées d\'origine (v7)', () => {
  const v7 = entrees().find((e) => e.startsWith('## 2026-10-22 : v7.0.0'));
  assert.ok(v7);
  const ligne = (debut) => v7.split('\n').find((l) => l.startsWith(debut));
  for (const debut of ['- **Apparence** : piste 2b', '- **B1 · Icônes**', '- **B5 · Couleurs**']) {
    assert.match(ligne(debut), /Levé en v12 : .*\(voir l'entrée v12\.0\.0, « Règles levées ou changées »\)\.$/, debut);
  }
  assert.match(ligne('- Piste 2b, police système'), /levé en v12 pour la couleur/);
  assert.match(ligne('- **Règle levée à sa demande**'), /Toujours vrai en v12/);
  assert.match(ligne('- **« Effacer définitivement » en rouge**'), /En v12, il reste rouge/);
});

test('les journaux de version ont leur section v12, qui renvoie à sa spécification et à docs/decisions.md, et dit la fin de la palette 2b', () => {
  const spec = doc('docs', 'v6-specification.md');
  const i = spec.indexOf('## 20. v12 (09/11)');
  assert.ok(i > 0, 'section v12 absente de docs/v6-specification.md');
  const v12 = spec.slice(i);
  for (const x of ['docs/superpowers/specs/2026-11-09-emozio-v12-design.md', 'docs/decisions.md', 'la palette 2b prend fin', '`v1/playlists/{id}/items`', 'format 9']) {
    assert.ok(v12.includes(x), x);
  }
  const design = doc('docs', 'design', 'integration.md');
  const titre = design.match(/^## v12 : .*\(09\/11\)$/m);
  assert.ok(titre, 'section v12 absente de docs/design/integration.md');
  const v12d = design.slice(titre.index);
  for (const x of ['docs/superpowers/specs/2026-11-09-emozio-v12-design.md', 'docs/decisions.md', '**La palette 2b prend fin**', '#1C7D36', '#30D158', '**la coche gardée**',
    '**La maquette est en violet**']) {
    assert.ok(v12d.includes(x), x);
  }
  // La palette des rubriques, dite plus haut pour la J2.0, dit jusqu'à quand.
  assert.match(design.slice(0, titre.index), /Levé en v12 : une base neutre/);
});

// La recette se coche à chaque jalon : la section v12 s'arrête à l'en-tête suivant, et ses huit points (spec §8) restent huit,
// cochés ou non.
const sectionV12 = (recette) => recette.slice(recette.indexOf('## v12')).split(/\n(?=## )/)[0];

test('docs/recette-iphone.md, « v12 » : les huit points de la spec §8, et leur compte tient quand l\'utilisateur en coche un', () => {
  const recette = doc('docs', 'recette-iphone.md');
  assert.ok(recette.includes('\n## v12\n'));
  const v12 = sectionV12(recette);
  for (const x of ['**Détente et un morceau ouvrent Spotify**', '**La lecture démarre-t-elle ?**', '**Ce qui joue après le morceau**', '**La forme « dans sa playlist », au Diagnostic**',
    '**« Mettre à jour la liste »**', '**Le vert, en clair et en sombre**', '**La page du soir**', '**L\'ajout à l\'écran d\'accueil depuis Safari**']) {
    assert.ok(v12.includes(x), `recette : ${x}`);
  }
  const cochee = recette.replace('- [ ] **La page du soir**', '- [x] **La page du soir**');
  const suivie = `${cochee.trimEnd()}\n\n## v13\n\n- [ ] Un point d'après.\n`;
  for (const r of [recette, cochee, suivie]) assert.equal((sectionV12(r).match(/^- \[[ xX]\] /gm) || []).length, 8);
});

test('la version 12.0.0 : package.json et js/version.js (écrit par npm run precache)', () => {
  assert.equal(JSON.parse(doc('package.json')).version, '12.0.0');
  assert.match(doc('public', 'js', 'version.js'), /^export const VERSION_APP = '12\.0\.0';$/m);
});
