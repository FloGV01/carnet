# Carnet v5 : spécification (construite, version 5.0.0)

Retours après la v4.0.0 (6 octobre 2026), choix faits point par point, puis « go ». L'écran Analyse a été
conçu par quatre angles (TCC et auto-observation, statistique, lisibilité iPhone, AuDHD), puis relu par deux
critiques (règles et ton, statistique et faisabilité). Rien de clinique : Carnet observe, range et rend les
mots de l'utilisateur ; il ne conseille ni n'explique jamais.

## 0. Décisions

| Sujet | Décision |
|---|---|
| Valider la journée | Bouton « J'ai fini pour ce soir » en bas d'Aujourd'hui : affiche la phrase résumé du jour et replie la page. Rien n'est compté ni marqué ailleurs (aucun jour « validé » dans l'Historique). |
| Stress important | Bouton « Moment difficile » toujours visible sur Aujourd'hui : cohérence cardiaque guidée (cercle, 5 s inspire / 5 s expire, 5 min, visuel seul, sans son ni vibration), puis Mon plan tel qu'écrit, puis « Noter un épisode » si voulu. Rien de calculé sur cet écran. |
| Contacts | Plusieurs par jour : une ligne par contact `{ avec, effet }`, comme les activités. Migration : un jour à un seul « avec qui » devient le contact 1 avec son effet ; un jour à plusieurs « avec qui » ne recopie jamais l'effet unique sur chacun (lignes sans effet, ou une ligne « à plusieurs », à trancher à l'implémentation). |
| Pas à pas | Retiré (route, écran, bande flottante). |
| Après coup | Proposé sur tous les épisodes, pas seulement « Explosion ». |
| Perte de données | Cause constatée : icône supprimée puis réinstallée (iOS efface alors le stockage). Bandeau de mise à jour avec « Sauvegarder d'abord » avant « Recharger » ; Réglages › Sauvegarde : « Supprimer l'icône efface tout ce qui est noté ici. Pour une mise à jour, le bandeau suffit. » |
| Analyse | Voir §1. Tendances prudente ; points positifs dans un repli fermé ; vue soignants : la frise par semaine ou par mois, sans phrase. |
| Plus tard | Croisements testés du lendemain, horaires de nuit, page « Depuis ton dernier rendez-vous ». |

## 1. Écran Analyse, de haut en bas

1. **Pour info** : la carte du signal, inchangée. Ni bloc ni lien vers Mon plan, Moment difficile ou « Tes moments » (plan §7.7 et §11.3).
2. **Ma semaine** (7 derniers jours, hors sélecteur), trois lignes dans un ordre fixe, chacune absente sans donnée :
   - « Humeur du soir : de 4 à 8, 6,1 en moyenne » (« (peu de valeurs) » sous 3) ;
   - « Nuits Mal : 2 » seulement (jamais Mal + Moyen + Bien, dont la somme révélerait le nombre de nuits notées) ;
   - « Explosions : 1 (mardi) · Épisodes : 3 » (jours nommés jusqu'à 2, règle v4 ; « 0 » seulement si un jour de la semaine est connu).
   - Repli **fermé** « Tes points positifs » : au plus 2 textes, les plus récents, avec leur jour.
   - Aucune comparaison avec la semaine d'avant, aucun graphique dans la carte.
3. **Tendances** (hors sélecteur), version prudente :
   - une seule famille : l'humeur du soir. Fenêtres fixes R = [J-27, J], B = [J-83, J-28] ;
   - historique : au moins 12 semaines depuis la première humeur ; avant, « Pas encore assez de données pour le dire. », avec « Pourquoi ? » sans quota de jours (« La règle : comparer les 4 dernières semaines aux 8 d'avant, une fois 12 semaines réunies. ») ;
   - si R ou B a trop peu de valeurs ensuite : rien (jamais de « x/28 ») ; garde silencieuse : la part de soirs avec une humeur dans R entre 0,6 et 1/0,6 fois celle de B, sinon « Pas d'écart net » ;
   - erreur-type tirée de l'historique de l'utilisateur, pas d'un modèle AR(1) (en simulation, la règle AR(1) donnait 15 à 60 % de journaux avec une fausse phrase) : moyennes de lots de 28 jours consécutifs sur [J-365, J-28] (lot retenu avec au moins 16 humeurs, au moins 6 lots), V28 = variance de ces moyennes (plancher 0,04), SE = √(1,5 × V28), écart d = moyenne de R − moyenne de B ;
   - seuils exacts, hystérésis (entrée / maintien) et stabilité sur troncatures fixés par une calibration de bout en bout (ci-dessous), dans le budget actuel de faux constats ;
   - phrase symétrique, sans adjectif : « Ces 4 dernières semaines, ton humeur du soir est plus basse que sur les 8 semaines d'avant : 4,6 en moyenne, contre 6,1. » (ou « plus haute ») ; haltère existant ; pied « Une observation sur tes chiffres, pas une explication. » ; « Pourquoi ? » : « Un changement d'emploi du temps (congé, arrêt, reprise) peut suffire à faire bouger ces chiffres. Les moyennes ne portent que sur les soirs où une humeur est notée. » ;
   - aucune ligne de contexte (lieu) sous la phrase ; nuits Mal et explosions sans phrase (visibles sur la frise) ;
   - désactivable dans Réglages comme le signal ; jamais sur Aujourd'hui ; dans l'export PSY : « - Tendances (4 dernières semaines contre les 8 d'avant) : … » en voix « je » ; pas dans la vue soignants ;
   - au plus deux phrases d'observation au-dessus de la frise, toutes sources confondues ; si la carte « Pour info » est visible, Tendances se replie et la phrase sommeil de Ma semaine est omise.
4. **Sélecteur** 7 j · 30 j · 3 mois · Tout : pilote tout ce qui suit, sauf ce qui est marqué « sur tout ton historique ».
5. **Mes jours** (frise), visible dès le premier soir, remplace les 3 graphiques hebdomadaires et le tableau Évolution :
   - une colonne par jour jusqu'à 31 jours, par semaine jusqu'à 26 semaines (3 mois compris), par mois au-delà (`SEUILS.frise`) ;
   - rangées : humeur du soir (un point par soir, axe 1-10, filets à 4 et 7 ; trait « moyenne des 7 jours » seulement avec au moins 4 valeurs, sans interpolation) ; nuit (Mal / Moyen / Bien sur la rampe du sommeil) ; explosions (encoche, règle v4, seulement ≥ 1) et autres épisodes (repère creux). Option « Plus de rangées » : humeur du moment (trait min-max du jour, jamais relié) ;
   - **jamais de rangée oui / non** (contact, sport) : effet « traqueur d'habitudes » ;
   - jour vide : colonne blanche, sans gris, zéro ni croix ; zones de toucher et lignes de tableau seulement sur les jours avec une donnée ; bulle : « jeu. 18 sept. · humeur du soir 3 · nuit Mal · 2 réveils · 1 explosion · Contact : Famille, Collègues · coûteux · Marche, 15 à 30 min · Voir ce jour » (effet accolé à une catégorie seulement si une seule est notée) ;
   - « Voir en tableau » (en vue Tout : l'ancien tableau Évolution), résumé accessible, légende ; aucune bande « d'habitude ».
6. **Ta journée heure par heure**, remplace la liste « Profil de ta journée » :
   - 12 créneaux de 2 h, de 4 h à 4 h ; humeur du moment : un point par créneau (moyenne des moyennes de chaque jour), **sans segments** entre créneaux, anneau sous 5 jours ; créneau affiché avec des relevés d'au moins 3 jours ;
   - énergie : une seule unité, le nombre de jours où la modalité est notée dans le créneau, identique dans la barre et la bulle ;
   - pas de rail des épisodes (leur heure est souvent celle de l'écriture) ; le nombre de jours par créneau va dans « Voir les chiffres » ;
   - ni rang ni superlatif ; rien ne compare les relevés aux heures de rappel.
7. **Avec qui, comment c'était · Mouvement** : barres horizontales, ordre fixe des listes, comptes en **jours** (comme `fenetres.js`). Contacts : segments Ressourçant / Neutre / Coûteux / non précisé (une teinte en rampe + les mots), ligne « Sans précision » pour un effet sans « avec qui ». Mouvement : un segment par durée. Aucun total, aucune comparaison, aucun croisement avec l'humeur. Les tuiles détaillées passent dans « Tous les chiffres ».
8. **Tes moments, étape par étape** (ancien « Avant tes explosions ») :
   - pastilles Explosions · Colère · Surcharge · Figé ; groupe Explosions au seuil actuel (3 explosions, avec ou sans Après coup) ; groupes par type à partir de 3 épisodes dont l'Après coup porte ce type, sans message s'ils n'apparaissent pas (jamais de quota d'Après coup) ;
   - lignes dans l'ordre de l'Après coup : Ce qui fragilisait déjà · Ça a démarré avec · En dessous · Ce qui était trop · Premiers signes (avec le repère, valeur du milieu) · Ce dont tu avais besoin ; « 3 sur 5 » = sur les épisodes du groupe où l'étape est remplie ; élément affiché s'il est noté au moins 2 fois ;
   - tes « si… alors… » (3 au plus), « Ce qui a aidé, d'autres fois » (3 citations datées au plus), lien « Voir Mon plan » ;
   - jamais rassemblés : pieges, pensees, plusTard, surLeMoment, autreFacon, tensionApres ; aucun croisement besoins × tension (« ce qui marche » serait un conseil) ;
   - pied : « Ce sont tes notes, rassemblées : pas des causes. »
9. **Sur tout ton historique** : « Ce que tes journées à 7 ou plus ont en commun », « Sommeil et humeur », sans changement.
10. **Les plus fréquents**, sans changement.
11. **Tous les chiffres** (replié) : les tuiles, dont le détail contact et sport, et le n de chaque indicateur.
12. Export PSY · Vue soignants (la vue soignants reçoit la frise par semaine ou par mois, sans phrase ni détail jour par jour).

## 2. Calibration

Test de bout en bout (`npm run test:calibration`) : `analyze()` recalculé tous les 3 jours pendant un an sur 30
journaux sans changement, scénarios ar1, ar1Long (φ = 0,9), composante lente (φ = 0,98) + bruit rapide, emploi du
temps, 18 % de trous. Compte des journaux qui affichent au moins une phrase parmi bonnes journées, sommeil (jour
même et lendemain) et Tendances : dans le budget actuel (au plus 10 %). Plus un scénario « changement réel » de
2 points sur 4 semaines pour mesurer la puissance de Tendances.

## 3. Plus tard (non construit en v5)

- **Ce qui va avec tes lendemains** : contact (part de lignes Coûteux) × humeur du lendemain, mouvement (« 30 à 60 min » ou « Plus d'1 h », libellés de l'utilisateur) × humeur du lendemain, nuit × explosions ; jamais le jour même (biais de notation) ; « va avec », jamais « provoque » ; mêmes garde-fous que `sommeil.js`.
- **Mes nuits** : barres du coucher au lever ; jamais de phrase sur l'heure de coucher, ni d'heure idéale.
- **Depuis ton dernier rendez-vous** : prochaine étape notée, questions non abordées, frise et chiffres de la période, « si… alors… » en citations ; jamais « dont N revus après coup » ni compteur d'ajouts.

## 4. Écarté

Comparaison semaine / semaine d'avant ; bande « d'habitude » ; nommer le créneau ou le jour « le plus bas » ;
nuage humeur × activité sans test ; « nuit Mal la veille : 4 sur 5 » sans taux de référence ; bloc « ce que tu as
écrit » sous le signal ou sous une phrase Tendances ; sélection calculée de besoins ou de « ce qui a aidé » dans
Moment difficile ; bande horaire de la journée sur Aujourd'hui.

## 5. Ce qui a été construit, et les écarts

- **Base v3** (`MIGRATIONS[3]`, figée) et **sauvegarde formatVersion 3** (`MISES_A_NIVEAU[2]`) : `contactAvec` et `contactEffet` deviennent une ligne `contacts: [{ avec, effet }]`, telle quelle ; `avec` reste un choix multiple par ligne (un effet noté pour « Famille, Collègues » reste attaché aux deux ensemble). « Revenir à l'état d'avant l'import » convertit aussi une copie d'avant la v5.
- **Tendances** : fenêtres de 28 jours glissant de 7 jours sur l'année avant R (au moins 6, donc environ 13 semaines d'historique) ; entrée à |z| ≥ 3,5 et |d| ≥ 1, net et de même sens sur 7 jours ; maintien à |z| ≥ 2 et |d| ≥ 0,7 ; garde silencieuse sur le rythme de saisie (0,6). Calibration (`tests/calibration`) : 0 à 1 journal sur 40 avec une fausse phrase en un an (AR(1) φ = 0,6, φ = 0,9, composante lente φ = 0,98) ; budget de bout en bout (bonnes journées, sommeil et Tendances ensemble) tenu sous 10 % : 2 journaux sur 30 au plus (AR(1), φ = 0,9, composante lente), 1 sur 30 pour un emploi du temps sans effet ; un changement durable de 3 points retrouvé 16 fois sur 40, un changement de 2 points rarement. Le seuil est passé de 3,25 à 3,5 après la revue de code, pour tenir ce budget. C'est le prix de « rarement à tort ».
- **Mes jours** : sans l'option « Plus de rangées » (humeur du moment sur la frise), laissée pour plus tard. Le tableau donne le détail de chaque colonne avec une donnée.
- **Ta journée heure par heure** : points et anneaux, énergie en jours ; pas de trait de dispersion.
- **Bande du bas** : « Moment difficile » · « Humeur » · « + Épisode » ; en largeur étroite ou en grand texte, « Humeur » puis « Moment difficile » perdent leur libellé (icône et nom accessible gardés).
- **Réglages › Analyse** : interrupteur « Tendances », comme le signal.

### Après la revue de code

- **Barres « Avec qui, comment c'était »** : l'effet d'une ligne à plusieurs personnes n'est jamais attribué à chacune ; il va dans une rangée « À plusieurs », et chaque personne de la ligne est comptée « non précisé ». La longueur d'une barre est le nombre de jours distincts (jamais une somme de paires).
- **Tendances** : quand les 4 dernières semaines ou les 8 d'avant ont trop peu de soirs notés, rien n'est affiché (ni phrase, ni « Pas d'écart net »). Sous une phrase, un « Pourquoi ? » donne la mise en garde (emploi du temps, soirs notés seulement).
- **« Sauvegarder d'abord »** : les fichiers sont refaits après chaque saisie ; la date de « Dernière sauvegarde » est celle des données incluses.
- **Moment difficile** : l'écran reste allumé pendant l'exercice si l'iPhone le permet (Wake Lock) ; au retour au premier plan, le cercle repart d'un début de cycle sans perdre le temps fait.
- **Vue soignants** : la frise est dessinée à échelle uniforme.
