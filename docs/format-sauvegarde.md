# Format de sauvegarde de Carnet

## Fichiers

- **Sans mémo vocal** : un seul fichier `carnet-sauvegarde-AAAA-MM-JJ-HHMM.json`.
- **Avec des mémos** : un fichier `carnet-sauvegarde-AAAA-MM-JJ-HHMM.zip`, sans compression, qui contient :
  - `sauvegarde.json` ;
  - `audios/<id>.m4a`, un fichier par mémo.
- **Au-delà de 150 Mo** : plusieurs fichiers `…-partie-N-sur-T.zip`. Chaque partie contient le JSON complet et une tranche des audios, par ordre de date. À l'import, on choisit toutes les parties d'un coup.

## sauvegarde.json

```json
{ "format": "carnet-sauvegarde", "formatVersion": 8, "schemaVersion": 6,
  "exportedAt": "2026-11-12T19:02:11.412Z", "app": { "version": "11.0.0" },
  "partie": { "numero": 1, "total": 2 },
  "counts": { "journal": 2, "episodes": 1, "symptomes": 0, "traitements": 0, "rdv": 1, "humeurs": 3, "notes": 1, "seances": 2, "listes": 204, "meta": 2, "audios": 1 },
  "data": { "journal": [], "episodes": [], "symptomes": [], "traitements": [], "rdv": [], "humeurs": [], "notes": [], "seances": [], "listes": [], "meta": [],
            "audios": [ { "id": "au_…", "parentStore": "journal", "parentId": "2026-09-30", "dureeMs": 24000,
                          "mime": "audio/mp4", "taille": 192000, "fichier": "audios/au_….m4a" } ] } }
```

- **Champ `partie`** : présent seulement dans un export en plusieurs fichiers.
- **Enregistrements** : ils suivent le schéma du plan (§5.3). Les références de liste sont des identifiants (`liste:slug`), jamais des libellés.
- **Méta non exportées** : `schema`, `installation`, `derniereEcriture` et `derniereSauvegarde`.
- **formatVersion 8 (v11)** :
  - champ `heuresSommeil` dans le journal : la durée de la nuit, de 4 à 10 **par demi-heure** (4, 4,5, 5, … 9,5, 10, soit 13 valeurs), où 4 veut dire « 4 h ou moins » et 10 « 10 h ou plus », ou `null`. Les bornes de la v8 ne bougent pas. Un autre nombre, un texte (`"7"`) ou un booléen rend la journée illisible, avec le message « heuresSommeil : de 4 à 10 par demi-heure attendu ». Une demi-heure s'écrit « 7 h 30 » dans l'app et l'Export PSY, jamais « 7,5 » ;
  - champ `gratitudes` dans le journal (« Mes gratitudes ») : un texte, ou `null`. Il n'entre ni dans l'Export PSY ni dans la vue soignants ;
  - champ `ceQueJeRetiens` dans les épisodes (« Ce que j'en retiens ») : un texte, ou `null`. Il est rangé sur l'épisode, à part de `apresCoup` : l'écrire ne touche pas à `apresCoup.jour`. Il n'entre ni dans l'Export PSY, ni dans la vue soignants ;
  - méta `refuges` (« Mes refuges ») : `{ "titres": "Une chanson calme\nUne autre", "playlists": [ { "nom": "Pour souffler", "lien": "https://open.spotify.com/playlist/…", "source": "spotify" } ] }`. `titres` est un texte ou `null` ; `playlists` compte 3 lignes au plus, chacune avec un `nom` (texte ou `null`), un `lien` (`https:`, `spotify:` ou `music:`, ou `null`) et une `source` (`"spotify"` pour une playlist choisie depuis le compte Spotify, sinon `null`). Aucun jeton n'y est jamais écrit. Elle est remplacée à l'import comme toute clé de l'utilisateur, remise d'abord dans cette forme (un fichier abîmé ou écrit à la main peut tout y mettre), sans erreur : une valeur qui n'est pas un objet compte pour des refuges vides ; un lien d'un autre schéma (`javascript:`, `data:`, `http:`…) devient `null`, et « ?si=… » en est retiré ; avec la source `"spotify"`, seul un lien `https:` vers l'hôte exact `open.spotify.com`, sans compte ni port, est gardé, et un lien refusé fait aussi perdre la source (le nom reste) ; une autre source devient `null` ; un nom est coupé à 200 signes (un emoji compte pour un) et reste du texte ; une ligne sans nom ni lien disparaît, et seules les 3 premières restent. Des refuges vides (ni titre ni playlist) ne sont pas gardés.

  Une sauvegarde en formatVersion 7 passe au format 8 à l'import sans aucun changement : ses nuits sont à l'heure ronde, et `gratitudes` et `ceQueJeRetiens` se lisent `null`. Le numéro change pour qu'une app de la v10 refuse proprement un fichier de la v11 (« plus récent que l'app »).
- **Ce que la v10 ajoute, sans changer de format** : une sauvegarde de la v10 reste en formatVersion 7, et rien n'est à transformer à l'import.
  - méta `favorisBienEtre` : les éléments épinglés dans Bien-être, dans l'ordre où ils l'ont été, `["soupir", "reveil-nuit", "sons-de-fond"]`. Chacun est l'identifiant d'un exercice, ou `coherence`, `minuteur`, `concentration`, `sons-de-fond`. Elle est remplacée à l'import comme toute clé de l'utilisateur. Elle n'est pas validée à l'import, mais à la lecture : un identifiant inconnu, un doublon ou une valeur qui n'est pas une liste sont ignorés, sans erreur ni ligne vide. Une épingle touchée ne compte pas comme une saisie : `derniereEcriture` ne bouge pas ;
  - méta `respiration` : champ `voix` (booléen, « Lire les consignes à voix haute »), faux s'il est absent ;
  - séances : `exercice` peut aussi valoir `minuteur` (le minuteur silencieux) ou l'identifiant d'un des dix exercices nouveaux. `origine` garde ses valeurs : `moment-difficile` pour Panique, Colère, Trop-plein et Réveil la nuit lancés depuis Moment difficile, `bien-etre` pour le reste. Le minuteur de concentration et les sons de fond n'écrivent aucune séance ;
  - hors de la sauvegarde, comme les réglages du lecteur : « Reprendre » (`carnet:bien-etre:dernier`), les durées retenues (`carnet:duree:<id>`) et les réglages des minuteurs et des sons (`carnet:minuteur`, `carnet:concentration`, `carnet:sons`) restent sur l'appareil, perdus à la réinstallation.
- **formatVersion 7 (v9)** :
  - champ `emotion` des humeurs du moment : un des 144 mots de la carte (`domain/roue.js`), `roue:<famille>:<mot>` ou, pour Fatigué et Épuisé, qui n'ont pas de famille, `roue:aucune:fatigue` et `roue:aucune:epuise` ; une famille seule `roue:<famille>` (relevés de la v7) ; ou un mot à soi, `roue:perso:u-<8 chiffres hexadécimaux>`. Un mot à soi n'est valable que s'il est dans la méta `motsPerso` du même fichier ;
  - méta `motsPerso` : les mots ajoutés à la carte des émotions, `{ "roue:perso:u-0a1b2c3d": { "libelle": "Flottant", "zone": "vert", "famille": null, "definition": null, "archive": false, "createdAt": "2026-10-28T19:02:11.412Z" } }`. `zone` vaut `rouge`, `jaune`, `bleu` ou `vert` (`null` pour un mot recréé à l'import, sans couleur) ; `famille`, la clé d'une des 7 familles ou `null` ; `definition`, un texte ou `null` ; `archive` vaut `true` pour un mot mis de côté (il a quitté la carte et la loupe, ses relevés le gardent). L'identifiant ne porte ni le libellé, ni la zone, ni la famille : un mot renommé ou changé de zone garde ses relevés, qui ne sont pas réécrits. Elle est remplacée à l'import comme toute clé de l'utilisateur, remise d'abord dans cette forme (un fichier écrit à la main peut tout y mettre) : une entrée sans libellé ou dont l'identifiant n'a pas cette forme est écartée, un libellé est coupé à 40 signes, une famille ou une définition hors de ces valeurs devient `null`, une zone hors de ces valeurs devient `null`, et le mot est mis de côté (il revient par sa couleur, puis « Remettre sur la carte », qui refuse un nom déjà pris), sinon seul `true` met de côté, et un mot de la carte dont le nom est déjà pris (par un des 144 mots, ou par un mot à soi créé avant lui, sans tenir compte des accents ni de la casse) est mis de côté ;
  - un relevé qui cite un mot à soi absent de `motsPerso` (ou sans libellé) ne se perd pas : le mot est recréé à l'import, mis de côté, « Mot sans libellé », sans zone ni famille, daté de l'export du fichier.

  Une sauvegarde en formatVersion 6 passe au format 7 à l'import sans aucun changement : elle ne cite aucun mot à soi, et ses relevés gardent leur mot et leur énergie. Le numéro change pour qu'une app de la v8, qui ne connaît pas les mots à soi, refuse proprement un fichier de la v9 (« plus récent que l'app »).
- **formatVersion 6 (v8)** :
  - champ `heuresSommeil` dans le journal : la durée de la nuit qui précède le jour, un entier de 4 à 10, où 4 veut dire « 4 h ou moins » et 10 « 10 h ou plus », ou `null` (à la demi-heure depuis le format 8). Un autre nombre rend la journée illisible. `heureCoucher`, `heureLever` et `reveilsNocturnes` restent pour les nuits déjà notées ;
  - champs `fin` et `programme` dans les séances : `fin` vaut `true` pour une séance menée jusqu'au bout, sinon `null` (une séance de la v7 n'en a pas) ; `programme` est l'identifiant de la séance du Programme d'où elle a été lancée, sinon `null` ;
  - liste `sujetRdv` (sujets d'un rendez-vous : Sommeil, Traitement, Explosions, Fatigue, Travail, Émotions, Autre chose), comme les autres listes ;
  - méta `definitionsRoue` : les définitions des émotions corrigées par l'utilisateur, `{ "roue:<famille>:<mot>": "texte" }`. Elle est remplacée à l'import comme toute clé de l'utilisateur.

  Une sauvegarde en formatVersion 5 passe au format 6 à l'import :
  - liste `sujetRdv` ajoutée si absente, `counts.listes` augmenté d'autant, comme la migration 6 de la base ;
  - `'nuit'` (le repli « Nuit en détail », masqué par défaut en v8) ajouté aux champs masqués de `journee`, s'ils sont réglés et ne l'ont pas déjà, comme la migration 6 de la base ;
  - aucune fiche transformée : `heuresSommeil`, `fin` et `programme` se lisent `null`. Une nuit ancienne garde son coucher, son lever et ses réveils, une séance de la v7 n'est pas « Faite ».
- **formatVersion 5 (v7)** :
  - champ `emotion` dans les humeurs du moment : un identifiant de la roue des émotions (`domain/roue.js`), `roue:<famille>` pour une famille seule ou `roue:<famille>:<mot>`, ou `null`. Un id inconnu rend le relevé illisible. `humeur` (note de 1 à 10) reste pour les anciens relevés et vaut `null` dans les nouveaux ;
  - tableau `seances` (séances de Bien-être) : `{ id, date, heure, exercice, dureeS, origine, createdAt, updatedAt }`, avec la date calendaire réelle et l'heure, comme les humeurs du moment. `exercice` vaut `coherence` ou l'identifiant d'un exercice ; il est obligatoire, comme `id`, `date` et `heure` : une séance sans exercice (absent ou vide) est illisible. `dureeS` est un entier de 0 à 86400, `origine` vaut `bien-etre`, `moment-difficile` ou `ressourcer`.

  Une sauvegarde en formatVersion 4 passe au format 5 à l'import :
  - `seances: []` et `counts.seances: 0` ;
  - `emotion: null` ajouté à chaque humeur du moment, dont la note de 1 à 10 reste telle quelle.
- **formatVersion 4 (v6)** :
  - tableau `notes` (notes en vrac) : `{ id, date, heure, texte, createdAt, updatedAt }`, avec la date calendaire réelle et l'heure, comme les humeurs du moment ;
  - champs `pese` et `recharge` dans le journal, `vers` et `faisais` dans les humeurs, `lien` (`{ store, id }`, facultatif) dans les questions d'un rendez-vous ;
  - méta `respiration`, `uneChoseALaFois` et `ressourcer`.

  Une sauvegarde en formatVersion 3 passe au format 4 à l'import :
  - `notes: []` et `counts.notes: 0` ;
  - listes v6 (`pese`, `recharge`, `activiteMoment`) ajoutées si absentes, `counts.listes` augmenté d'autant ;
  - `'humeur'` ajouté aux champs masqués de `journee`, s'ils sont réglés et ne l'ont pas déjà, comme la migration de la base.
- **formatVersion 3 (v5)** : plusieurs contacts par jour, `journal.contacts: [{ avec, effet }]`. Une sauvegarde en formatVersion 2 est mise à niveau à l'import : `contactAvec` et `contactEffet` deviennent une ligne, telle quelle.
- **formatVersion 2 (v4)** : tableau `humeurs` (humeurs du moment), champs `activites`, `contactAvec`, `contactEffet` dans le journal et `apresCoup` dans les épisodes. Une sauvegarde en formatVersion 1 est mise à niveau à l'import : `humeurs: []`, listes v4 ajoutées si absentes, `counts.listes` augmenté d'autant.

## Import

L'import remplace toujours, il ne fusionne jamais. Les étapes :

1. **Contrôles** :
   - le JSON est lisible et son format est `carnet-sauvegarde` ;
   - `formatVersion` n'est pas plus récent que l'app ;
   - `counts` correspond à la longueur des tableaux ;
   - les ZIP sont intègres (CRC).
2. **Normalisation** : chaque enregistrement passe par `normaliser` en mode import. Les éléments illisibles sont listés puis ignorés.
3. **Identifiant de liste inconnu** : il recrée un élément archivé « Élément sans libellé (id) », pour qu'aucun enregistrement ne soit perdu. De même, un mot à soi cité par un relevé et absent de `motsPerso` est recréé mis de côté, « Mot sans libellé » (v9). Les méta `motsPerso` et `refuges` (v11) sont remises dans la forme que l'app écrit, sans erreur.
4. **Aperçu** : contenu du fichier, ce qui serait effacé (notes et séances comprises), mémos absents des fichiers choisis, et les deux dates si le fichier est plus ancien que la dernière saisie.
5. **Application** :
   - copie de secours `avant-import`, 3 au maximum, sans les audios ;
   - puis une seule transaction qui vide et réécrit tout.
6. **Méta** : les clés de l'utilisateur (Mon plan, Ma journée, traitement actuel, réglages, définitions des émotions, mots ajoutés à la carte, exercices épinglés, Mes refuges…) sont remplacées par celles du fichier ; une clé absente du fichier est retirée. `explosionsDepuis` est gardée si le fichier ne l'a pas.
7. **Retour arrière** : « Revenir à l'état d'avant l'import » restaure la dernière copie, méta de l'utilisateur comprise. L'état courant est lui-même copié avant.
   - Une copie prise avant la v4 n'a pas d'humeurs du moment, une copie prise avant la v6 n'a pas de notes, une copie prise avant la v7 n'a pas de séances : elles restent alors telles quelles.
   - Les listes par défaut absentes de la copie (v4, v6, v8) sont ajoutées.
   - Dans une copie prise avant la v6, `'humeur'` rejoint les champs masqués de `journee`, comme à l'import d'un fichier au format 3. Une copie de la v6 garde le choix qu'elle contient.
   - Dans une copie prise avant la v8, `'nuit'` rejoint de même les champs masqués de `journee`, comme à l'import d'un fichier au format 5. Une copie de la v8 garde le choix qu'elle contient.
