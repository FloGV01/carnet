# Cahier des charges — application personnelle de suivi AuDHD

*Document de référence du projet. À donner à toute session Claude qui reprend le développement.*

---

## 1. Contexte

Application **personnelle**, pour un seul utilisateur : l'utilisateur, adulte, diagnostiqué **TSA + TDAH (AuDHD)** à l'âge adulte, sous traitement, suivi par un psychiatre et une neuropsychologue.

Elle remplace un tableau de bord Numbers déjà en service, dont elle reprend le modèle de données. Elle sert trois usages :
1. **Saisie quotidienne** de son état — en moins de 30 secondes ;
2. **Analyse réelle** des données accumulées, pas seulement des courbes ;
3. **Support de consultation** — à montrer au psychiatre et à l'équipe de réhabilitation.

## 2. Décisions déjà arbitrées (ne pas rouvrir)

| Sujet | Décision | Raison |
|---|---|---|
| Plateforme | **PWA** (web app installable sur l'écran d'accueil iPhone) | Gratuit à vie, pas de compte développeur Apple |
| Données | **100 % locales** (IndexedDB), rien sur un serveur | Données de santé mentale |
| Hors ligne | **Obligatoire** | Doit marcher partout, tout le temps |
| Langue | **Français** | — |
| IA | **Export texte → collé dans le projet Claude « PSY »** | Zéro infra, zéro coût, et PSY a déjà tout l'historique |
| Périmètre v1 | Journal quotidien **+ log d'épisodes émotionnels** | C'est le log d'épisodes qui rend l'outil unique |
| Rôles | Claude code, l'utilisateur pilote et teste | — |

## 3. Contraintes non négociables

Ces règles priment sur toute autre considération de design.

- **Saisie quotidienne en moins de 30 secondes.** Menus déroulants et boutons partout, saisie libre réduite au minimum. Choisir est beaucoup plus accessible que formuler — l'utilisateur a une alexithymie.
- **Aucune mécanique de streak, de série, de score, de badge.** Un compteur rompu deviendrait une source de honte, et la honte est précisément le mécanisme qu'on cherche à désamorcer.
- **Silence total sur les jours manqués.** L'app ne dit jamais « tu n'as pas rempli hier ». Elle n'envoie aucune notification culpabilisante.
- **Aucun jugement dans les formulations.** Pas de « bien joué », pas de « tu peux mieux faire ». Ton neutre et chaleureux.
- **Tout est optionnel.** Un champ vide est une donnée valide, jamais une erreur.

## 4. Modèle de données

### Entrée quotidienne (une par jour)
| Champ | Type | Valeurs |
|---|---|---|
| date | date | — |
| lieu | choix | Bureau · Télétravail · Congé/repos · Arrêt · Autre |
| sommeilRessenti | choix | Bien · Moyen · Mal |
| humeur | entier | 1 à 10 |
| contactHumain | booléen | — |
| sportMouvement | booléen | — |
| explosions | entier | 0 à 5 |
| traitementPris | choix | Oui · Non · Partiel |
| pointsPositifs | texte libre | une seule zone, pas trois |
| heureCoucher, heureLever | texte court | optionnel |
| reveilsNocturnes | entier | optionnel |
| notes | texte libre | optionnel |

### Épisode émotionnel (zéro à plusieurs par jour)
| Champ | Type | Valeurs |
|---|---|---|
| dateHeure | datetime | — |
| situation | texte libre | court |
| emotion | choix | Colère · Frustration · Sentiment d'injustice · Honte · Culpabilité · Tristesse · Anxiété · Peur · Vide/rien · Épuisement · Surcharge · Irritabilité · Soulagement · Joie · Fierté · Calme · Enthousiasme |
| intensite | entier | 1 à 10 |
| declencheur | choix | **Me sentir pris pour un con** · Injustice · Ne pas être compris · Imprévu/changement · Surcharge sensorielle · Manque de sommeil · Trop de sollicitations · Conflit · Attente/lenteur · Erreur/échec · Solitude · Rien d'identifié |
| dessous | choix | Injustice · Ne pas être vu/reconnu · Honte · Peur · Tristesse · Fatigue/débordement · Je ne sais pas |
| reaction | choix | Explosion · Retrait/isolement · Masquage · J'ai réussi à en parler · Rien fait · Report (revenu à froid) |
| ceQuiAAide | texte libre | optionnel |

> Les colonnes **declencheur** et **dessous** sont le cœur de l'outil : elles n'existent dans aucune application du marché et viennent d'un travail clinique propre à cet utilisateur. Leur vocabulaire ne doit pas être « lissé » ni remplacé par des termes génériques.

### Symptôme (occasionnel)
date · symptôme (liste) · intensité 1-10 · durée · contexte · note

Liste : Crise d'angoisse · Vide/shutdown · Paralysie · Ruminations · Explosion de colère · Surcharge sensorielle · Hyperfocus · Endormissement difficile · Réveil non reposé · Irritabilité · Fatigue extrême · Difficulté de concentration · Évitement social · Douleurs/tensions

### Traitement (occasionnel)
date · changement/ajustement · effet secondaire (liste) · effet ressenti (Mieux/Stable/Moins bien) · notes

**Toutes les listes doivent être modifiables par l'utilisateur** depuis l'app, sans toucher au code.

## 5. Écrans

1. **Aujourd'hui** — écran d'ouverture. L'entrée du jour, pré-remplie si elle existe déjà. Un bouton unique et visible « + épisode » pour ajouter un épisode émotionnel.
2. **Analyse** — les visualisations et les constats (voir §6).
3. **Historique** — liste des jours, filtrable, chaque entrée éditable.
4. **Réglages** — modification des listes, export, import, remise à zéro.

L'app s'ouvre **toujours** sur « Aujourd'hui ». Aucun écran d'accueil intermédiaire, aucun onboarding à répétition.

## 6. Moteur d'analyse — la partie qui compte

Calculs **entièrement locaux**, en JavaScript. Pas d'IA nécessaire ici : ce sont des statistiques.

- **Fenêtres glissantes** : 7 jours / 30 jours / depuis le début, pour chaque indicateur.
- **Courbes** : humeur (moyenne hebdomadaire), explosions par semaine, qualité du sommeil.
- **Ce que les bonnes journées ont en commun** — comparer les jours où l'humeur est ≥ 7 aux jours ≤ 4, et faire ressortir les facteurs qui diffèrent (lieu, sommeil, contact humain, sport). C'est la fonction la plus précieuse de l'app.
- **Corrélations décalées** : une mauvaise nuit pèse-t-elle sur le jour même ou sur le lendemain ? Tester un décalage de 0 et de 1 jour.
- **Classements** : déclencheur n°1, émotion n°1, symptôme n°1, effet secondaire n°1.
- **Alerte précoce** : si les 3-4 derniers jours ressemblent statistiquement aux périodes ayant précédé un décrochage passé, le signaler **avec douceur et sans alarmisme** — une phrase factuelle, jamais un avertissement anxiogène.

> Avec peu de données, ne rien affirmer. En dessous d'un seuil raisonnable, afficher « pas encore assez de données » plutôt qu'une corrélation fragile. Une fausse certitude serait pire que rien.

## 7. Export

- **Vers PSY** (usage hebdomadaire) : un bouton qui génère un bloc de texte compact des 7 derniers jours et le copie dans le presse-papier, prêt à coller dans le projet Claude « PSY » pour la synthèse écrite.
- **Vers les soignants** : une vue imprimable / PDF d'une page — les indicateurs sur 7/30 jours, les classements, les courbes. Doit tenir sur une page.
- **Sauvegarde** : export/import JSON complet, pour ne jamais perdre les données.
- **Import initial** : reprise du fichier Numbers existant (CSV).

## 8. Technique

- HTML/CSS/JavaScript, sans framework lourd. Pas de build compliqué.
- **IndexedDB** pour les données, **Service Worker** pour le hors-ligne, **manifest** pour l'installation sur l'écran d'accueil.
- Graphiques : bibliothèque légère, ou SVG écrit à la main.
- Design sobre, contrasté, gros boutons tactiles. Mode sombre. Respect des zones sûres de l'iPhone.
- Hébergement : n'importe quel hébergeur statique gratuit, ou même en local. Aucune donnée ne transite.

## 9. Phasage

**v1 — la boucle quotidienne.** Écran Aujourd'hui, saisie complète, stockage local, historique, installation sur l'écran d'accueil. Objectif : remplacer le fichier Numbers.
**v2 — l'analyse.** Fenêtres glissantes, courbes, classements, « ce que les bonnes journées ont en commun », export vers PSY.
**v3 — les finitions.** Alerte précoce, export soignants, import Numbers, listes personnalisables.

Ne pas commencer une phase avant que la précédente soit utilisée en vrai pendant au moins une semaine.

## 10. Ce qu'il ne faut PAS faire

- Pas de compte, pas de connexion, pas de cloud, pas de synchronisation.
- Pas de notifications autres qu'un unique rappel du soir, désactivable.
- Pas de contenu éditorial, pas de conseils automatiques, pas de méditations.
- Pas de fonctionnalité sociale.
- **L'app ne donne aucun avis clinique et ne remplace aucun soignant.** Elle observe et restitue, rien de plus.
