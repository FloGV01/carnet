# Carnet v11 : six retours après la v10 (conception)

Date : 05/11/2026. Version visée : 11.0.0. Repérages (non suivis par git, dans `.superpowers/v11/`) :
- `exploration.json` : l'état du code v10.0.0 et les propositions sur chaque sujet, avec les fichiers et les lignes ;
- `planches/`, `icone/`, `theme-carte/`, `compteur/`, `gratitudes/`, `refuges/`, `episodes/` : les captures et les maquettes montrées à l'utilisateur.

## 1. Intention

Ce sont les premiers retours d'usage après la v10. L'utilisateur veut une icône qui ressemble à l'app d'aujourd'hui, ses chansons refuges à portée de main, pouvoir revenir sur ses épisodes depuis l'Analyse, des écrans d'émotion qui suivent le thème comme le reste de l'app, une durée de nuit qu'on fait défiler, et une place pour ses gratitudes, et revenir en arrière d'un geste.

Réussite :
- le soir, il fait glisser la durée jusqu'à 7 h 30 sans viser, et il écrit une gratitude sous ses points positifs ;
- quand ça monte, il ouvre Moment difficile et lance sa playlist d'un toucher ;
- sur n'importe quel écran ouvert depuis un onglet, il revient en arrière d'un glissement du doigt vers la droite ;
- un jour calme, il ouvre l'Analyse, touche « Épisodes », rouvre un épisode et écrit ce qu'il en retient ;
- en thème clair, passer d'Aujourd'hui à la carte des émotions ne l'éblouit plus d'un noir à l'autre : tout reste clair.

Échec, même si tout marche : un soir qui devient une corvée, une liste d'épisodes qui ressemble à une liste de tâches, une gratitude qu'on se sent tenu d'écrire.

## 2. Décisions de l'utilisateur (04 et 05/11)

Retours d'origine : « autre chose quand je suis sur l'onlget des jours, si je défile à gauche j'ai le jour précédent et si je défile à droite le jour suiviant. Pour tout autre fenêtre c'est précédent » ; « Changer l'icône » ; « Lien vers playlist Spotify ou mes chansons réconfortantes ou refuges » ; « Accès à revenir sur « épisodes » pour travailler dessus (mettre dans analyse) » ; « Thème fond carte émotions selon système comme le reste de l'application » ; « Sommeil, sport —> mettre un compteur déroulante » ; « En plus des idées positives du jour ajoute les gratitudes du jour que j'ai à donner ».

Réponses aux formulaires :
- **Icône** : piste B, « Les quatre zones » (`.superpowers/v11/icone/icone-b.svg`).
- **Écrans de l'émotion en thème clair** : « Le fond passe en clair comme le reste de l'application (comme les prototypes) » (`planches/carte-emotions-clair.png`, ligne du bas), avec le mot choisi sur une capsule de sa couleur (`theme-carte/planche-variantes-du-mot.png`, B).
- **Compteur** : une roue dans la carte, **toujours visible, couchée sur le côté**. Il a vu le coût : le soir défile davantage.
- **Sommeil** : à la demi-heure.
- **Sport et contact humain** : les 4 tranches du sport sur une roue, « comme pour le sommeil », dans la carte ; « pareil pour le contact humain », avec « Comment c'était » sur la roue.
- **Gratitudes** : « les deux », ce pour quoi il est reconnaissant et à qui il dit merci, dans une carte « en dessous de points positifs, toujours visible ».
- **Épisodes** : « Relire et compléter » et « Écrire ce que j'en retiens ». Il n'a retenu ni « Voir les fois semblables » ni « Préparer pour le psy ».
- **Refuges** : sa liste de titres **et** ses playlists, dans **Moment difficile et Bien-être**.
- **Connexion à son compte Spotify** : il l'a choisie, le coût affiché (une app à créer chez Spotify, la règle « zéro réseau » levée pour cela), puis, informé de Premium, de la reconnexion et du retour incertain sur iPhone : « Ca peut fonctionner en 5G si besoin. Et j'ai un compte premium ». Il prépare ses playlists de son côté.
- **« Revenir à l'état d'avant l'import »** demande confirmation.
- **Export PSY** : ni les gratitudes, ni « ce que j'en retiens ».
- **Gestes** : sur l'onglet des jours, garder le sens actuel ; sur les autres écrans, le doigt vers la droite revient en arrière ; sur Analyse, Bien-être, Soins et Réglages, le geste ne fait rien. Sur les écrans ouverts par-dessus l'app, le geste vaut « là où on relit », jamais pendant une saisie, un exercice ou un minuteur, ni sur la carte des émotions.
- **« Ce que j'en retiens »** : sur l'épisode rouvert, sans passer par les étapes de l'Après coup.
- **« Réveil la nuit »** : reste noir dans les deux thèmes.

## 3. Hors périmètre

- Les fois semblables (« D'autres fois »), la préparation pour le psy, de nouveaux filtres, la recherche dans les mots de l'Après coup, et un extrait de l'Après coup sur les lignes de la liste.
- Le sport en minutes. Un bouton « Dit » ou un rappel sur les gratitudes. Écouter de la musique dans Carnet.
- Proposé le 05/11, non retenu pour la v11 : « Réveil la nuit » noir jusqu'au bout, Moment difficile sans saut à l'ouverture, retrouver sa place au retour de la musique, le très grand texte, rouvrir sans relancer une respiration, les roues sans accident (geste de jour parti à côté d'une roue), Carnet dit quand ça coince, l'Après coup en entier dans l'Export PSY (il est coupé à 280 signes, alors que la v4 le voulait entier), l'export sans coupure avec sa période, En consultation depuis le dernier rendez-vous.
- Les points laissés ouverts par la v10 : le ▶ d'un favori, l'épingle du Programme, les écrans hérités qui débordent en très grand texte (`docs/decisions.md`, entrée v10, « En attente de l'utilisateur »).

## 4. Règles qui restent

Elles s'appliquent à toute la v11 : un toucher enregistre, jamais de bouton « Enregistrer » ; tout est facultatif et un champ vide est valide ; ni série, ni score, ni badge, ni compteur, ni rappel ; aucun avis clinique, aucun contenu proposé par l'app ; zéro réseau venant de Carnet et CSP inchangée, sauf la seule exception de la connexion à Spotify (§8.3) ; `domain/`, `analyse/`, `db/` et `export/` restent purs ; aucun prénom ni donnée réelle dans le code, les tests ou les docs ; `tests/aides/mots-interdits.js` s'applique aux nouveaux textes.

Les textes nouveaux sont des propositions, à relire par l'utilisateur après la publication.

## 5. La roue

### 5.1 Ce qu'il voit

Une bande sur une ligne, sous Mal · Moyen · Bien, qui glisse à gauche et à droite (`compteur/14-D-regle.png`). La carte Sommeil grandit d'environ 54 px et la roue reste visible en permanence, ce qui remplace le lien « Durée › » et sa rangée.

Valeurs : 4 h ou moins, 4 h 30, 5 h, … 9 h 30, 10 h ou plus, soit 13 valeurs. Les bornes de la v8 ne bougent pas, pour que les nuits déjà notées gardent leur sens.

### 5.2 Comment elle enregistre

- **Vide** : aucune valeur n'est marquée. La bande est centrée sur 7 h, en teinte neutre, et cela ne note rien. La valeur de la veille n'est jamais reprise.
- **Glisser** : la valeur au centre s'enregistre quand la bande s'arrête.
- **Toucher une valeur** : elle s'enregistre et vient au centre.
- **Retoucher la valeur notée** : elle s'efface, et la journée redevient vide. C'est le geste des autres choix de l'app.
- Faire défiler la page verticalement avec le doigt posé sur la bande ne change rien : seul le geste horizontal la fait glisser.
- La fin du glissement ne doit pas dépendre du seul événement `scrollend`, qui n'existe dans Safari que depuis 26.2.
- Avec « Réduire les animations », la valeur vient au centre sans animation.

### 5.3 Accessibilité

Chaque valeur est un vrai bouton, avec `aria-pressed` et une cible d'au moins 44 pt : VoiceOver les parcourt un par un et les active. On n'écrit pas de curseur ARIA fait main, car VoiceOver y répond mal sur iPhone. La bande reste utilisable de 17 à 53 px de texte.

### 5.4 Sport et contact humain

Sa demande : « comme pour le sommeil », et « pareil pour le contact humain ». Les deux cartes restent côte à côte. Sous Oui / Non, chacune a sa roue, toujours visible, avec les règles du §5.2. Comme les cartes sont étroites, on voit surtout la valeur du milieu. La rangée grandit d'environ 54 px.

- **Sport** : Moins de 15 min · 15 à 30 min · 30 à 60 min · Plus d'1 h. La roue écrit la durée de la première activité (`activites[0].duree`).
- **Contact humain** : Ressourçant · Neutre · Coûteux. La roue écrit l'effet du premier contact (`contacts[0].effet`).
- **Comme aujourd'hui**, choisir une valeur met Oui si rien n'était noté, et un Non reste un Non.
- **Le détail reste** pour le reste : type d'activité et autres activités, « avec qui » et autres contacts. La durée et l'effet s'y règlent avec la même roue, sur les mêmes données. Avec plusieurs lignes, la roue de la carte montre la première.
- Les listes et le format de ces champs ne changent pas.

### 5.5 Là où la durée s'affiche

`heuresSommeil` accepte les demi-heures (4 ; 4,5 ; … ; 10). Tout ce qui suppose un entier est à revoir : `T.int` dans `domain/champs.js`, `texteHeuresSommeil`, `dureeNuit` (`analyse/fenetres.js`), l'Analyse, Comprendre, l'Historique, l'Export PSY. Le texte dit « 7 h 30 », jamais « 7,5 h ».

## 6. Mes gratitudes

- Une carte « Mes gratitudes » juste sous « Mes points positifs », toujours visible, de même forme : une zone de texte, la dictée, l'enregistrement seul au fil de la frappe.
- Consigne proposée : « Ce pour quoi je suis reconnaissant. À qui je dis merci. »
- Un nouveau champ de la journée. Rien ne passe d'un jour à l'autre, et il n'y a ni nombre, ni « Dit », ni partage.
- Elle se règle dans Réglages › Le soir comme les autres champs (déplacer, masquer), et elle est **affichée par défaut**. `normaliserJournee` ajoute un champ nouveau en fin d'ordre : pour une app déjà installée, elle doit arriver juste après « Mes points positifs », pas à la fin.
- **Appels du concepteur** : comme les points positifs, elle est citée sous « J'ai fini pour ce soir », visible dans l'Historique et sa recherche, et relue dans un repli fermé « Tes gratitudes » de l'Analyse (les 2 plus récentes de la semaine, avec leur jour, sans nombre).
- **Jamais** dans l'Export PSY (sa décision) ni dans la vue soignants.

## 7. Revenir sur ses épisodes

- **Une porte « Épisodes »** en haut de l'Analyse, à côté d'« Historique ». Un toucher ouvre l'Historique, forcé sur le segment « Épisodes » quel que soit le dernier segment retenu, avec ses filtres et sa position au retour : aucune liste nouvelle. Depuis l'Analyse, un épisode s'ouvre donc toujours en 3 touchers. Rien ne change sur Aujourd'hui, où la ligne « Après coup » reste.
- **« Ce que j'en retiens »** : un texte libre facultatif, avec la dictée, directement sur l'épisode rouvert, sous la carte Après coup, sur tout épisode, même ancien et même sans Après coup. Un toucher pour rouvrir, on écrit, cela s'enregistre seul. Il ne fait pas partie des étapes de l'Après coup. Un champ vide ne dit rien : aucune invitation à le remplir, aucune mention de ce qui n'est pas écrit.
- Il est rangé sur l'épisode, à part de `apresCoup` : l'écrire ne touche pas à `apresCoup.jour` (`apres-coup.js:124`), donc **ne refait pas partir un vieil épisode vers PSY** (`psy.js:174`).
- Il reste dans l'app : ni Export PSY (sa décision), ni vue soignants, ni feuille « Voir » d'En consultation (**appel du concepteur**, pour rester cohérent).
- **Interdit** : un filtre « sans Après coup », une marque « fait » ou « travaillé », un nombre d'Après coup, ou tout ce qui ferait de la liste des choses à faire (v4 et v5). Rien ne s'ouvre ni ne se rappelle seul.

## 8. Mes refuges

### 8.1 L'écran

Un écran « Mes refuges », ouvert depuis Réglages › Mon plan et depuis Bien-être. Tout y est facultatif, et ses contenus partent dans la sauvegarde avec Mon plan. Carnet ne propose aucune chanson.
- **Mes titres** : une liste qu'il écrit, un par ligne.
- **Mes playlists** : jusqu'à 3 (**appel du concepteur**), chacune avec un nom et un lien.

Il y a deux façons de remplir une playlist, pour les mêmes données : la choisir depuis son compte (§8.3), ou coller son lien et lui donner un nom. Ainsi, tout continue de marcher si la connexion échoue, si elle n'est pas refaite, ou si l'abonnement s'arrête.

### 8.2 Le lien

- Seuls `https:`, `spotify:` et `music:` sont acceptés, à la saisie **et à la lecture** d'une sauvegarde. Le reste est ignoré, sans erreur. Un lien reçu de Spotify n'est gardé que s'il vient de son lecteur public (`open.spotify.com`). « ?si=… » est retiré d'un lien collé.
- Écouter, c'est toucher un lien qui fait sortir de Carnet vers l'app de musique. Aucune requête n'est faite pour cela : ni aperçu, ni image.
- Les tests ne suivent jamais un lien (`tests/aides/gardes.js`).

### 8.3 La connexion à Spotify

C'est la **seule exception** à « zéro réseau », écrite dans `docs/decisions.md`, et `CLAUDE.md` est mis à jour.

- **Ce qui s'ouvre** : `connect-src` gagne exactement `https://accounts.spotify.com` et `https://api.spotify.com` (`netlify.toml`). `script-src`, `img-src` et le reste ne bougent pas : ni pochette, ni script de Spotify, ni lecture dans Carnet.
- **Quand** : uniquement à son toucher sur « Choisir dans mon compte », dans l'écran Mes refuges. Jamais à l'ouverture de l'app ni dans Moment difficile, où l'heure d'une demande dirait à Spotify l'heure d'un moment difficile. La garde réseau des tests reste active partout ailleurs et le prouve.
- **Comment** : la connexion PKCE de Spotify, sans secret, avec le seul droit de lire ses playlists (`playlist-read-private`). L'identifiant de l'app (Client ID, qui n'est pas un secret) est écrit dans un seul fichier, `plateforme/spotify.js`, le seul qui appelle `fetch` hors de `sw.js`. `tests/unit/architecture.test.js` reçoit une exception étroite : ce fichier, ces deux hôtes.
- **Aucun jeton gardé** (**appel du concepteur**) : on se connecte, Carnet lit la liste des playlists, il en choisit jusqu'à 3, et le jeton est jeté. Il n'y a rien à voler ni à renouveler, et la reconnexion de 6 mois imposée par Spotify ne le concerne plus. En échange, chaque mise à jour repasse par la page de Spotify. Un jeton n'entre jamais dans `meta` ni dans une sauvegarde : un test le vérifie.
- **Ce qui est lu** : le nom et le lien de ses playlists, pas leurs chansons. Ces noms s'affichent comme du texte, jamais comme du HTML. Spotify est nommé à côté de ce qui vient de lui. « Oublier ces playlists » les retire.
- **Le retour** : `?code=` et `?state=` sont traités et retirés avant le guide d'installation et avant le retour sur Aujourd'hui (`main.js:13-16`, `plateforme/mode.js:19`). **Si le retour n'arrive pas dans l'app**, c'est le point incertain sur iPhone : la page affiche un code à copier, qu'il colle dans Mes refuges, et Carnet finit la connexion. Le geste est plus long, mais il ne dépend pas de l'endroit où arrive le retour.
- **Ce que Spotify apprend** : l'usage de cette app par son compte, l'adresse de Carnet, son adresse IP et l'heure de ces demandes. Aucune requête ne contient de donnée du journal, des émotions ou des épisodes.
- **Le risque accepté** : aujourd'hui, un script malveillant ne pourrait rien envoyer en silence. Avec cette ouverture, il pourrait écrire vers un compte Spotify. Cela suppose qu'un script hostile tourne déjà dans Carnet : `script-src` reste `'self'`, et l'app ne charge aucun script tiers.

**Ce qu'il fait lui-même, une fois :** avec son compte Premium, créer une app sur le site développeur de Spotify, avec un nom neutre, sans mot de santé ; y inscrire l'adresse de retour exacte, celle du site de production ; donner le Client ID. Jamais son mot de passe : la connexion, c'est lui seul qui la fait. Si Spotify répond 403, s'ajouter à la liste d'utilisateurs de l'app.

### 8.4 Où il les voit

- **Moment difficile** : une ligne par playlist sous « Une chose à la fois », avec une petite icône SVG de sortie (pas le caractère ↗, compté comme emoji par `tests/aides/mots-interdits.js`) : un toucher l'ouvre, sans réseau venant de Carnet. Les titres sont avec le reste de Mon plan. Les quatre boutons restent en tête. Sans playlist ni titre, rien n'apparaît.
- **Bien-être** : une 5e entrée « Mes refuges » après Programme, qui ouvre l'écran du §8.1. C'est une dérogation à « quatre entrées » de la v10, à noter dans `docs/decisions.md`.
- Ni « dernière écoute », ni nombre, ni suggestion d'écouter.

### 8.5 Ce qu'on ne sait pas

Ces deux points ne se vérifient que sur l'iPhone, une fois la v11 publiée :
- **Le retour de la connexion**. Si ni le retour ni le code à coller ne marchent, un correctif 11.0.1 retire la connexion, et les liens collés restent.
- **L'ouverture d'un lien** : un lien https peut s'ouvrir dans une page Safari au-dessus de Carnet plutôt que dans Spotify. Une entrée du Diagnostic (appui long sur la version) essaie trois formes : lien web, lien web dans une nouvelle fenêtre, lien direct vers l'app. La v11 sort avec le lien web, et le correctif change de forme si une autre marche mieux.

Limites assumées, à lui dire :
- si iOS a fermé Carnet pendant l'écoute, il se rouvre sur Aujourd'hui (`main.js`) ;
- lancer un exercice ou un son de fond peut couper la musique ;
- sans réseau, la connexion et la playlist ne marchent pas, mais la liste écrite et les liens déjà notés restent lisibles ;
- Spotify a changé ces règles trois fois en 2026, et l'app resterait en mode développement, à la merci d'un prochain changement.

## 9. Les écrans de l'émotion en clair

- **Ce qui suit le système** : l'écran 1 aux quatre bulles, la carte, l'écran 3, un relevé rouvert, la loupe, Mon mot. « Tes zones », dans l'Analyse, suit déjà le thème : il n'y a qu'à la contrôler. En thème clair, ils prennent le fond gris clair d'Aujourd'hui et des cartes blanches, comme sur le prototype. **En thème sombre, rien ne change.** Il n'y a pas de réglage dans l'app : le thème reste celui du système (décision B2 de la v7).
- **Ce qui ne bouge pas** : les couleurs des 144 bulles et leur texte noir (`couleurCase`).
- **En clair** : les boutons en verre deviennent blancs translucides, le voile du haut prend la couleur du fond, la carte du bas devient blanche avec un rond « Continuer » foncé, « Terminer » devient foncé, et le mot choisi s'écrit en noir sur une capsule de sa couleur d'origine, à la carte du bas et à l'écran 3 (sa décision : le jaune reste jaune pâle ; écrit tel quel sur le clair, il n'aurait que 1,4:1). Rien n'est à recalculer si le thème change, écran ouvert.
- **Tous les textes hors bulles** gardent au moins 4,5:1. Le contrôle global (`v7-controle`) passe ces écrans en clair et en sombre.
- **Limites vues sur le prototype, à juger sur l'iPhone** : des bulles pâles se détachent moins du fond, et les halos jaune et vert de l'écran 1 presque plus.
- **« Réveil la nuit » reste noir** dans les deux thèmes (sa décision), car ce noir sert à ne pas éclairer la chambre.
- Les deux `theme-color` d'`index.html` passent aux couleurs actuelles (`#e7eaee` en clair, `#000000` en sombre), pour que la barre du haut s'accorde au fond. Le manifest n'a qu'une valeur par couleur : il prend celles du clair. Le rendu réel de la barre n'est vérifiable que sur l'iPhone.

## 10. L'icône

- `public/icons/icone.svg` reprend la piste B, et `npm run icones` refait les PNG. Le script impose aujourd'hui un fond `#3B4A6B` à l'icône masquable (`scripts/icones.mjs:20`) : il passe au noir de la piste B, sinon elle garderait un cadre bleu. Le rouge et le vert des émotions sortent ici de leurs écrans : c'est son choix, à noter dans `docs/decisions.md`.
- **Une icône déjà sur l'écran d'accueil ne change sans doute pas toute seule**, et supprimer l'ancienne efface ses données : c'est déjà arrivé, et l'app l'écrit elle-même dans Réglages. Aucune étape ne doit lui faire supprimer quoi que ce soit avant d'avoir vérifié la copie.
- **Passage, à lui donner après la publication**, et aussi en pas-à-pas fixe dans Réglages › Aide iPhone (**appel du concepteur**) :
  1. Redémarrer l'iPhone : l'icône a peut-être changé. Si oui, c'est fini.
  2. Dans l'ancien Carnet : Réglages › Exporter, enregistrer dans Fichiers.
  3. Dans Safari : ouvrir l'adresse de Carnet, Partager › Sur l'écran d'accueil. Vérifier l'aperçu : s'il montre la nouvelle icône, Ajouter. Sinon, annuler, fermer l'onglet, rouvrir l'adresse et recommencer.
  4. Ouvrir le nouveau Carnet, qui doit être vide : Réglages › Importer. Vérifier quelques jours dans l'Historique.
  5. Ranger l'ancien dans un dossier, et ne plus y écrire. Le supprimer plus tard, ou jamais.
- Ce que la copie perd : brouillons en cours, réglages du lecteur et replis ouverts (localStorage). Le micro sera sans doute à réautoriser.
- Dans Safari, un service worker v10 déjà présent servirait encore l'ancienne page, donc l'ancienne icône, jusqu'à ce que l'onglet soit fermé : d'où la consigne de l'étape 3. Les fichiers d'icône prennent un nouveau nom (`scripts/icones.mjs`, `tests/unit/precache.test.js`, `index.html`, manifest). On n'ajoute pas d'activation d'office d'une nouvelle version : elle ne servirait pas au passage de la v10 à la v11, et elle irait contre la règle de `sw.js`, où une nouvelle version n'arrive qu'à la demande de l'utilisateur.
- **« Revenir à l'état d'avant l'import »** (`ui/ecrans/reglages.js:57-62` et `:77`) remplace tout d'un seul toucher, juste sous « Importer », et la ligne apparaîtra après ce passage, car la copie se fait même sur une base vide (`db/sauvegarde.js:322`). Elle demande désormais confirmation (composant `Confirmation`), avec ce qui sera remplacé. Elle n'apparaît plus après un import sur un Carnet vide.

## 11. Le geste de retour

- Sur un écran qui a un bouton « Retour », le doigt qui glisse **vers la droite**, partout sur l'écran, fait la même chose que ce bouton. Le doigt vers la gauche ne fait rien. Pas d'animation qui suit le doigt : le retour se fait au lâcher.
- Mêmes seuils que pour changer de jour, et mêmes écouteurs passifs : 60 px, ou un geste rapide, et nettement plus horizontal que vertical (`ui/glissement.js`). Le défilement vertical n'est jamais gêné.
- **L'onglet des jours ne change pas** : doigt vers la droite la veille, vers la gauche le lendemain (décision B4 de la v7, confirmée le 05/11). La page d'un jour ouverte depuis l'Historique garde aussi ce geste.
- **Analyse, Bien-être, Soins et Réglages** : le geste ne fait rien.
- **Un geste ignoré** s'il part d'un champ de texte, d'une feuille, d'une boîte de dialogue ou d'une zone qui défile de côté (la roue, un tableau) : `departIgnore` le fait déjà.
- **Les écrans ouverts par-dessus l'app** (`CadreParcours`, tous ignorés par `departIgnore` aujourd'hui) se partagent en deux, selon sa décision :
  - **là où on relit**, le geste fait comme « Fermer » : l'épisode rouvert, le récapitulatif de l'Après coup, un relevé ou un symptôme rouvert à relire ;
  - **ailleurs, aucun geste** : une saisie en cours (étapes d'un épisode, de l'Après coup, d'une fiche), Moment difficile et ses exercices, le lecteur, les minuteurs, les sons, les écrans de l'émotion et leur carte, où le doigt la fait déjà glisser. Un glissement involontaire n'y doit ni couper un exercice, ni quitter une saisie.

## 12. Les données

- `FORMAT_VERSION` passe de 7 à **8** : demi-heures de `heuresSommeil`, champ des gratitudes, « ce que j'en retiens », titres et playlists de Mes refuges. Une sauvegarde v10 s'importe en v11. Une sauvegarde v11 est refusée par une app plus ancienne.
- **Avant de changer le format**, ajouter le témoin `tests/fixtures/temoins/format-7.json`, produit depuis l'étiquette v10.0.0 (`scripts/temoins.mjs`) : aujourd'hui, les témoins s'arrêtent au format 6.
- `DB_VERSION` reste à 6 si aucune migration n'est nécessaire, au constructeur de le confirmer.
- `docs/format-sauvegarde.md` est à jour. L'Export PSY ne change pas, sauf le texte des demi-heures.

## 13. Règles levées ou changées

- **Le soir ne tient plus sans défiler** à 390 × 844 (`docs/decisions.md`, P2 et P3) : les roues ajoutent environ 54 px au Sommeil et 54 px à la rangée Contact et Sport, la carte des gratitudes environ 111 px. C'est son choix. Les tests qui l'exigent sont réécrits sans être affaiblis ailleurs, et « J'ai fini pour ce soir » reste atteignable. Le Diagnostic « Marge du soir » et les 4 `test.fail()` de la v8 sont à revoir en conséquence.
- « Une seule zone, pas trois » pour le texte du soir (cahier §4) : levée pour les gratitudes.
- « Quatre entrées » de Bien-être (v10) : cinq.
- Les écrans de l'émotion noirs dans les deux thèmes (appel du concepteur en v9) : levé.
- « Zéro réseau, aucun appel sortant » (`CLAUDE.md`, cahier §2 et §8) : levée pour la seule connexion à Spotify, à son toucher (§8.3). « Hors ligne : obligatoire » reste vrai pour tout le reste.

## 14. Vérifié et non vérifié

Tests habituels : `npm run precache`, `npm test`, contrôle global étendu aux écrans nouveaux et à l'émotion en clair.

Seulement sur l'iPhone, entrées dans `docs/recette-iphone.md` :
- le geste de retour au doigt, sans retour involontaire en faisant défiler un écran ;
- le glissement de la roue au doigt, sa fin et la page qui défile dessous ;
- la connexion à Spotify et son retour dans Carnet ;
- l'ouverture d'un lien (Diagnostic) et le retour dans Carnet ;
- la nouvelle icône et le passage sans perte ;
- les bulles pâles au soleil et la barre du haut en clair.

## 15. Laissé au constructeur

Le nom des nouveaux champs et composants, le découpage en tâches, l'emplacement exact des textes dans le code, tant que cela reste conforme aux sections ci-dessus.
