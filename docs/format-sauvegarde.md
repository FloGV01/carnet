# Format de sauvegarde de Carnet

## Fichiers

- **Sans mémo vocal** : un seul fichier `carnet-sauvegarde-AAAA-MM-JJ-HHMM.json`.
- **Avec des mémos** : un fichier `carnet-sauvegarde-AAAA-MM-JJ-HHMM.zip`, sans compression, qui contient :
  - `sauvegarde.json` ;
  - `audios/<id>.m4a`, un fichier par mémo.
- **Au-delà de 150 Mo** : plusieurs fichiers `…-partie-N-sur-T.zip`. Chaque partie contient le JSON complet et une tranche des audios, par ordre de date. À l'import, on choisit toutes les parties d'un coup.

## sauvegarde.json

```json
{ "format": "carnet-sauvegarde", "formatVersion": 5, "schemaVersion": 5,
  "exportedAt": "2026-10-20T19:02:11.412Z", "app": { "version": "7.0.0" },
  "partie": { "numero": 1, "total": 2 },
  "counts": { "journal": 2, "episodes": 1, "symptomes": 0, "traitements": 0, "rdv": 1, "humeurs": 3, "notes": 1, "seances": 2, "listes": 197, "meta": 2, "audios": 1 },
  "data": { "journal": [], "episodes": [], "symptomes": [], "traitements": [], "rdv": [], "humeurs": [], "notes": [], "seances": [], "listes": [], "meta": [],
            "audios": [ { "id": "au_…", "parentStore": "journal", "parentId": "2026-09-30", "dureeMs": 24000,
                          "mime": "audio/mp4", "taille": 192000, "fichier": "audios/au_….m4a" } ] } }
```

- **Champ `partie`** : présent seulement dans un export en plusieurs fichiers.
- **Enregistrements** : ils suivent le schéma du plan (§5.3). Les références de liste sont des identifiants (`liste:slug`), jamais des libellés.
- **Méta non exportées** : `schema`, `installation`, `derniereEcriture` et `derniereSauvegarde`.
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
3. **Identifiant de liste inconnu** : il recrée un élément archivé « Élément sans libellé (id) », pour qu'aucun enregistrement ne soit perdu.
4. **Aperçu** : contenu du fichier, ce qui serait effacé (notes et séances comprises), mémos absents des fichiers choisis, et les deux dates si le fichier est plus ancien que la dernière saisie.
5. **Application** :
   - copie de secours `avant-import`, 3 au maximum, sans les audios ;
   - puis une seule transaction qui vide et réécrit tout.
6. **Méta** : les clés de l'utilisateur (Mon plan, Ma journée, traitement actuel, réglages…) sont remplacées par celles du fichier ; une clé absente du fichier est retirée. `explosionsDepuis` est gardée si le fichier ne l'a pas.
7. **Retour arrière** : « Revenir à l'état d'avant l'import » restaure la dernière copie, méta de l'utilisateur comprise. L'état courant est lui-même copié avant.
   - Une copie prise avant la v4 n'a pas d'humeurs du moment, une copie prise avant la v6 n'a pas de notes, une copie prise avant la v7 n'a pas de séances : elles restent alors telles quelles.
   - Les listes par défaut absentes de la copie (v4, v6) sont ajoutées.
   - Dans une copie prise avant la v6, `'humeur'` rejoint les champs masqués de `journee`, comme à l'import d'un fichier au format 3. Une copie de la v6 garde le choix qu'elle contient.
