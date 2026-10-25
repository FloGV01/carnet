// Exercices de Bien-être (v7, spec §6.2) : rédigés pour Carnet, relus par l'utilisateur (titres et étapes repris dans
// docs/decisions.md). Une consigne par écran ; chaque étape a sa durée, en secondes : l'étape passe seule à la suivante à
// la fin de cette durée (v8 : voix allumée ou non). La somme des durées est proche de la durée annoncée (dureeMin). Règles
// d'écriture : phrases courtes, tutoiement, ton neutre, aucune promesse d'effet ni conseil de santé. Les identifiants sont
// figés : une séance les garde (store `seances`). Pur.
// v8 (spec §5 et §12.3) : `posture` (« 8 min · assis ou allongé ») et, sur une étape dont le texte donne un rythme, son
// `souffle` en quatre temps ({ inspi, retiens1, expi, retiens2 }, en secondes, ceux du texte) : le lecteur y montre le
// disque et y joue le souffle. Une étape rythmée dure un nombre entier de cycles : elle finit poumons vides, après
// l'expiration, et la suivante commence par « Inspire » (jamais deux inspirations de suite). Les textes de la v7 ne
// changent pas ; les deux étapes rythmées de la respiration carrée passent de 52 à 48 s (trois cycles de 16 s).
// v8, Programme (spec §6 et §12.4) : 8 séances nouvelles, ajoutées à la fin, rédigées depuis les brouillons de l'annexe
// programme-sophro.md (§5), avec ses précautions (§1.6) : les yeux ouverts permis, bouger permis, aucune rétention
// imposée, rien sur le cœur, les souvenirs par les sens, avec une sortie écrite, et « Tu peux t'arrêter à tout moment. »
// dans chacune. Deux blocs communs, « Arriver » (60 s) et « Revenir » (55 s), en ouvrent et en ferment cinq. Aucune
// n'a de rythme écrit : ni disque ni souffle. « Premiers pas » n'est pas écrite (§12.4) : Respiration abdominale ouvre
// le Programme. Elles ne se lancent que depuis le Programme (domain/programme.js).

const e = (texte, dureeS, souffle) => Object.freeze(souffle ? { texte, dureeS, souffle: Object.freeze(souffle) } : { texte, dureeS });

// Quatre temps de quatre secondes (respiration carrée).
const CARRE = { inspi: 4, retiens1: 4, expi: 4, retiens2: 4 };

// Les blocs communs des séances nouvelles (v8) : l'accueil et le retour d'une séance de sophrologie, copiés dans chacune.
const ARRIVER = [
  e('Installe-toi assis, les pieds à plat. Debout ou allongé, c\'est possible aussi.', 15),
  e('Garde les yeux ouverts, posés sur un point, ou ferme-les. Les deux vont.', 10),
  e('Sens les endroits où ton corps touche le siège, le sol ou le lit.', 20),
  e('Laisse ta respiration comme elle est, sans rien changer. Tu peux t\'arrêter à tout moment.', 15),
];
const REVENIR = [
  e('Inspire un peu plus fort. Bouge les doigts et les orteils.', 15),
  e('Étire-toi comme tu en as envie : les bras, le dos, le cou.', 15),
  e('Si tes yeux sont fermés, ouvre-les. Regarde trois choses autour de toi.', 15),
  e('Reprends ce que tu faisais quand tu veux.', 10),
];
export const BLOCS = Object.freeze({ arriver: Object.freeze(ARRIVER), revenir: Object.freeze(REVENIR) });

export const EXERCICES = Object.freeze([
  {
    id: 'respiration-abdominale',
    titre: 'Respiration abdominale',
    dureeMin: 3,
    posture: 'assis ou allongé',
    description: 'Respirer avec le ventre, une main posée dessus.',
    etapes: [
      e('Installe-toi assis ou allongé. Ferme les yeux si tu veux.', 15),
      e('Pose une main sur ton ventre, l\'autre sur ta poitrine.', 15),
      e('Inspire par le nez. Laisse le ventre se gonfler sous ta main.', 20),
      e('Expire lentement par la bouche. Le ventre redescend.', 20),
      e('Garde ce rythme, sans forcer. La main sur la poitrine bouge peu.', 40),
      e('Inspire, le ventre se gonfle. Expire, il redescend.', 40),
      e('Laisse la respiration revenir à son rythme habituel.', 20),
      e('Quand tu veux, ouvre les yeux et bouge doucement.', 10),
    ],
  },
  {
    id: 'respiration-carree',
    titre: 'Respiration carrée',
    dureeMin: 3,
    posture: 'assis',
    description: 'Inspirer, retenir, expirer, retenir : quatre temps chacun.',
    etapes: [
      e('Installe-toi, le dos droit sans être raide. Les épaules restent basses.', 15),
      e('Vide doucement l\'air de tes poumons.', 10),
      e('Inspire par le nez en comptant jusqu\'à quatre.', 9),
      e('Retiens l\'air en comptant jusqu\'à quatre.', 9),
      e('Expire par la bouche en comptant jusqu\'à quatre.', 9),
      e('Garde les poumons vides en comptant jusqu\'à quatre.', 9),
      e('Recommence ces quatre temps, à ton rythme. Si retenir te gêne, compte jusqu\'à deux.', 48, CARRE),
      e('Inspire, quatre. Retiens, quatre. Expire, quatre. Retiens, quatre.', 48, CARRE),
      e('Laisse ta respiration redevenir libre.', 15),
    ],
  },
  {
    id: 'epaules',
    titre: 'Relaxation dynamique des épaules',
    dureeMin: 5,
    posture: 'debout ou assis',
    description: 'Hausser puis relâcher les épaules, avec la respiration.',
    etapes: [
      e('Mets-toi debout ou assis, les pieds à plat, les bras le long du corps.', 20),
      e('Inspire et monte les deux épaules vers les oreilles.', 10),
      e('Garde-les en haut quelques secondes, en retenant l\'air.', 10),
      e('Expire par la bouche et laisse-les retomber d\'un coup.', 10),
      e('Observe les sensations dans tes épaules et tes bras.', 20),
      e('Recommence : inspire, monte les épaules, retiens.', 15),
      e('Expire et relâche. Laisse retomber.', 15),
      e('Observe de nouveau ce que tu sens.', 20),
      e('Une dernière fois : inspire, monte les épaules, retiens.', 15),
      e('Expire et relâche tout.', 15),
      e('Fais rouler les épaules vers l\'arrière, lentement.', 30),
      e('Puis vers l\'avant, lentement.', 30),
      e('Laisse les bras pendre. Remarque ce qui a changé, ou ce qui est pareil.', 40),
      e('Respire normalement quelques instants.', 30),
      e('Quand tu veux, reprends ce que tu faisais.', 20),
    ],
  },
  {
    id: 'tension-detente',
    titre: 'Tension et détente',
    dureeMin: 8,
    posture: 'assis ou allongé',
    description: 'Serrer un groupe de muscles, puis le relâcher, des pieds au visage.',
    etapes: [
      e('Installe-toi assis ou allongé. Ferme les yeux si tu veux.', 20),
      e('Respire lentement quelques instants.', 20),
      e('Serre les orteils et contracte les pieds, sans forcer. Garde la tension.', 15),
      e('Relâche d\'un coup. Observe la différence.', 30),
      e('Contracte les mollets en tirant les pointes de pied vers toi.', 15),
      e('Relâche. Observe les sensations dans les jambes.', 30),
      e('Serre les cuisses et les fesses.', 15),
      e('Relâche. Laisse les jambes posées.', 30),
      e('Rentre le ventre et contracte-le.', 15),
      e('Relâche. Laisse la respiration revenir dans le ventre.', 30),
      e('Serre les poings et contracte les bras.', 15),
      e('Relâche. Ouvre les mains.', 30),
      e('Monte les épaules vers les oreilles et serre.', 15),
      e('Relâche. Laisse les épaules redescendre.', 30),
      e('Serre la mâchoire, plisse les yeux et le front.', 15),
      e('Relâche le visage. Desserre les dents.', 30),
      e('Parcours ton corps des pieds à la tête. Remarque ce que tu sens.', 60),
      e('Respire tranquillement.', 35),
      e('Bouge les doigts, les pieds, puis ouvre les yeux quand tu veux.', 30),
    ],
  },
  {
    id: 'scan-corporel',
    titre: 'Scan corporel',
    dureeMin: 10,
    posture: 'allongé ou assis',
    description: 'Passer d\'une partie du corps à l\'autre, sans rien changer.',
    etapes: [
      e('Installe-toi allongé ou assis. Ferme les yeux si tu veux.', 30),
      e('Remarque les points d\'appui de ton corps : le sol, le siège ou le lit.', 40),
      e('Va vers tes pieds : les orteils, la plante, les talons. Remarque ce qui est là, ou rien de particulier.', 50),
      e('Monte vers les chevilles, les mollets, les genoux.', 45),
      e('Les cuisses, puis le bassin.', 45),
      e('Le ventre, qui bouge avec la respiration.', 45),
      e('Si ton esprit part ailleurs, reviens au corps, sans te juger.', 40),
      e('La poitrine, et le dos contre son appui.', 45),
      e('Les mains, les bras, jusqu\'aux épaules.', 50),
      e('Le cou et la nuque.', 40),
      e('Le visage : la mâchoire, les joues, les yeux, le front.', 50),
      e('Le haut de la tête.', 30),
      e('Le corps entier, d\'un seul coup, tel qu\'il est maintenant.', 60),
      e('Bouge doucement les doigts et les pieds. Ouvre les yeux quand tu veux.', 30),
    ],
  },
  {
    id: 'lieu-ressource',
    titre: 'Lieu ressource',
    dureeMin: 8,
    posture: 'assis ou allongé',
    description: 'Imaginer un lieu, réel ou inventé, et le parcourir par les sens.',
    etapes: [
      e('Installe-toi confortablement. Ferme les yeux si tu veux.', 20),
      e('Respire lentement, quelques fois.', 30),
      e('Choisis un lieu, réel ou imaginé, où tu aimes être. S\'il n\'en vient aucun, invente-le.', 40),
      e('Regarde autour de toi : les formes, les couleurs, la lumière.', 60),
      e('Écoute les sons de ce lieu, proches ou lointains.', 60),
      e('Remarque les odeurs, la température de l\'air.', 50),
      e('Sens ce que tu touches : le sol sous tes pieds, une matière, un objet.', 60),
      e('Reste là un moment, sans rien faire de particulier.', 60),
      e('Ce lieu reste là : tu peux y revenir en pensée.', 30),
      e('Reviens doucement dans la pièce. Remarque les appuis de ton corps.', 40),
      e('Bouge les doigts, puis ouvre les yeux quand tu veux.', 30),
    ],
  },
  {
    id: 'ancrage-54321',
    titre: 'Ancrage 5-4-3-2-1',
    dureeMin: 3,
    posture: 'là où tu es',
    description: 'Nommer ce que tu perçois autour de toi, un sens après l\'autre.',
    etapes: [
      e('Garde les yeux ouverts. Regarde autour de toi.', 10),
      e('Nomme cinq choses que tu vois.', 35),
      e('Nomme quatre choses que tu peux toucher. Touche-les si tu veux.', 35),
      e('Nomme trois sons que tu entends.', 30),
      e('Nomme deux odeurs. S\'il n\'y en a pas, deux odeurs que tu aimes.', 25),
      e('Nomme un goût, dans ta bouche en ce moment.', 20),
      e('Respire une fois, lentement.', 15),
      e('Reprends ce que tu faisais quand tu veux.', 10),
    ],
  },
  {
    id: 'pause-une-minute',
    titre: 'Pause d\'une minute',
    dureeMin: 1,
    posture: 'là où tu es',
    description: 'Un arrêt bref, là où tu es.',
    etapes: [
      e('Arrête ce que tu fais. Pose ce que tu as dans les mains.', 10),
      e('Sens tes pieds sur le sol.', 10),
      e('Inspire lentement par le nez.', 10),
      e('Expire plus longuement, par la bouche.', 10),
      e('Encore une fois : inspire, puis expire.', 15),
      e('Reprends quand tu veux.', 5),
    ],
  },
  // v8 : les séances nouvelles du Programme.
  {
    id: 'les-sons',
    titre: 'Les sons',
    dureeMin: 5,
    posture: 'assis',
    description: 'Écouter les sons proches, puis plus loin, sans les nommer.',
    etapes: [
      ...ARRIVER,
      e('Écoute les sons proches : dans la pièce, sur toi, ta respiration.', 40),
      e('Écoute les sons plus loin : le bâtiment, la rue, dehors.', 40),
      e('Pas besoin de les nommer. Remarque quand un son commence et quand il s\'arrête.', 45),
      e('Si un son te gêne, tu peux te boucher les oreilles, changer de pièce ou t\'arrêter.', 15),
      e('Remarque les moments plus calmes entre deux sons, s\'il y en a.', 30),
      e('Écoute tous les sons à la fois, sans en choisir un.', 30),
      ...REVENIR,
    ],
  },
  {
    id: 'cinq-zones',
    titre: 'Les cinq zones',
    dureeMin: 6,
    posture: 'assis ou allongé',
    description: 'Passer par cinq zones du corps, puis le corps entier.',
    etapes: [
      ...ARRIVER,
      e('Cinq zones du corps, l\'une après l\'autre. Dans chacune, remarque ce qui est là, ou rien.', 15),
      e('La tête et le visage : le front, les yeux, la mâchoire.', 30),
      e('Si la mâchoire est serrée, laisse les dents se séparer un peu.', 15),
      e('Le cou, les épaules, les bras, jusqu\'aux mains.', 35),
      e('La poitrine et le dos. Remarque le dos contre son appui, s\'il y en a un.', 35),
      e('Le ventre, qui bouge avec la respiration.', 30),
      e('Le bassin, les jambes, jusqu\'aux pieds.', 35),
      e('Le corps entier, d\'un coup, tel qu\'il est maintenant.', 30),
      ...REVENIR,
    ],
  },
  {
    id: 'mouvements-lents',
    titre: 'Mouvements lents',
    dureeMin: 4,
    posture: 'debout ou assis',
    description: 'Tourner la tête et le buste, hausser les épaules, lentement.',
    etapes: [
      e('Mets-toi debout, les pieds écartés, les genoux souples. Assis, c\'est possible aussi. Tu peux t\'arrêter à tout moment.', 20),
      e('Tourne lentement la tête vers la droite, puis vers la gauche, sans forcer. Trois fois.', 30),
      e('Remets la tête au milieu. Remarque ce que tu sens dans le cou.', 20),
      e('Laisse les bras pendre. Tourne doucement le haut du corps à droite, puis à gauche. Les bras suivent sans effort.', 45),
      e('Arrête-toi au milieu. Remarque ce que tu sens dans le dos et les bras.', 20),
      e('Inspire et monte les épaules. Expire et laisse-les retomber. Trois fois, à ton rythme.', 40),
      e('Laisse les bras le long du corps. Remarque les épaules et les mains.', 25),
      e('Fais quelques pas sur place. Sens le poids passer d\'un pied à l\'autre.', 30),
      e('Reste immobile. Respire comme d\'habitude.', 20),
      e('Reprends ce que tu faisais quand tu veux.', 10),
    ],
  },
  {
    id: 'point-corps',
    titre: 'Faire le point avec mon corps',
    dureeMin: 3,
    posture: 'là où tu es',
    description: 'Une question à la fois : faim, soif, chaud ou froid, fatigue.',
    etapes: [
      e('Fais une pause là où tu es, les yeux ouverts si tu veux. Tu peux t\'arrêter à tout moment.', 15),
      e('As-tu faim ? Un peu, beaucoup, pas du tout ou « je ne sais pas » : tout se vaut.', 20),
      e('As-tu soif ?', 15),
      e('As-tu besoin d\'aller aux toilettes ?', 15),
      e('As-tu chaud, froid, ou ni l\'un ni l\'autre ?', 15),
      e('Y a-t-il un endroit tendu ou douloureux : la mâchoire, les épaules, le ventre ?', 25),
      e('Es-tu fatigué ?', 15),
      e('Y a-t-il trop de bruit, de lumière ou de monde autour de toi ?', 20),
      e('Si quelque chose est apparu, tu peux t\'en occuper maintenant : boire, manger, te couvrir, sortir.', 25),
      e('Reprends quand tu veux.', 10),
    ],
  },
  {
    id: 'marche-lente',
    titre: 'Marche lente',
    dureeMin: 5,
    posture: 'en marchant',
    description: 'Marcher lentement, en remarquant chaque pas.',
    etapes: [
      e('Trouve un endroit pour faire quelques pas : un couloir, une pièce, un chemin calme. Tu peux t\'arrêter à tout moment.', 20),
      e('Debout, sens le poids du corps sur tes deux pieds.', 20),
      e('Marche plus lentement que d\'habitude. Les bras comme tu veux.', 30),
      e('Remarque le talon qui touche le sol, puis la plante du pied, puis les orteils.', 60),
      e('Au bout de l\'espace, arrête-toi, puis fais demi-tour.', 15),
      e('Remarque le pied qui se lève, avance, puis se pose.', 60),
      e('Si ton esprit part ailleurs, reviens aux pieds, sans te juger.', 20),
      e('Si marcher lentement te gêne, marche à ton pas habituel. Continue de remarquer tes pieds.', 60),
      e('Arrête-toi. Sens tes deux pieds sur le sol.', 20),
      e('Reprends ce que tu faisais quand tu veux.', 10),
    ],
  },
  {
    id: 'bon-moment-passe',
    titre: 'Un bon moment passé',
    dureeMin: 6,
    posture: 'assis ou allongé',
    description: 'Retrouver un moment passé, même petit, par les sens et les gestes.',
    etapes: [
      ...ARRIVER,
      e('Choisis un moment passé qui s\'est bien passé, même petit : un repas, un trajet, une conversation.', 40),
      e('Si rien ne vient, prends un moment neutre et récent : ce matin, un café, une douche.', 15),
      e('Où étais-tu ? Regarde le lieu : les formes, les couleurs, la lumière.', 45),
      e('Écoute les sons de ce moment. Remarque les odeurs, la température.', 45),
      e('Que faisais-tu ? Repasse les gestes, un par un.', 45),
      e('Si un souvenir pénible arrive, ouvre les yeux et regarde autour de toi. Tu peux t\'arrêter là.', 15),
      e('Remarque ton corps maintenant : les épaules, le ventre, la respiration. Il peut y avoir quelque chose, ou rien.', 40),
      e('Laisse ce moment. Reviens aux appuis de ton corps.', 20),
      ...REVENIR,
    ],
  },
  {
    id: 'moment-a-venir',
    titre: 'Un moment à venir',
    dureeMin: 6,
    posture: 'assis ou allongé',
    description: 'Imaginer un moment simple des prochains jours, par les sens.',
    etapes: [
      ...ARRIVER,
      e('Choisis un moment simple des prochains jours : un repas, une promenade, un moment seul.', 40),
      e('Prends un moment qui ne t\'inquiète pas. Si celui-ci te tend, choisis-en un plus petit.', 15),
      e('Où seras-tu ? Regarde le lieu : les formes, les couleurs, la lumière.', 45),
      e('Qu\'y aura-t-il autour de toi : les objets, les sons, la température ?', 45),
      e('Que feras-tu ? Repasse les gestes, un par un.', 45),
      e('Remarque ton corps maintenant, pendant que tu y penses : les épaules, le ventre, la respiration.', 40),
      e('Laisse ce moment. Reviens aux appuis de ton corps.', 20),
      ...REVENIR,
    ],
  },
  {
    id: 'ce-qui-compte',
    titre: 'Ce qui compte pour moi',
    dureeMin: 6,
    posture: 'assis',
    description: 'Choisir un mot qui compte pour toi, et une chose qui va avec.',
    etapes: [
      ...ARRIVER,
      e('Voici des mots : calme, honnêteté, curiosité, justice, liberté, ordre, création, lien. Choisis-en un, ou un autre à toi.', 40),
      e('Si aucun mot ne vient, remarque ta respiration jusqu\'à la fin.', 15),
      e('Cherche une chose faite ces derniers jours qui va avec ce mot, même petite.', 45),
      e('Où étais-tu ? Que faisais-tu, geste par geste ?', 45),
      e('Remarque ton corps en y pensant : les épaules, le ventre, la respiration.', 40),
      e('Imagine une petite chose des prochains jours qui irait avec ce mot. Tu n\'as rien à décider.', 40),
      e('Laisse le mot. Reviens aux appuis de ton corps.', 20),
      ...REVENIR,
    ],
  },
].map((x) => Object.freeze({ ...x, etapes: Object.freeze(x.etapes) })));

export const exerciceDe = (id) => EXERCICES.find((x) => x.id === id) || null;

// « 3 min · assis ou allongé » : la durée annoncée et la posture.
export const dureeEtPosture = (ex) => [`${ex.dureeMin}\u00a0min`, ex.posture].filter(Boolean).join(' · ');

// La durée d'un exercice, en secondes : la somme de ses étapes (une étape sans durée compte pour rien).
export const dureeExerciceS = (ex) => (ex ? ex.etapes.reduce((s, x) => s + (x.dureeS || 0), 0) : 0);

// Un exercice est mené au bout quand sa dernière étape est atteinte après la moitié de sa durée au moins, en temps actif
// (pauses exclues) : parcourir les textes, pour les relire, ne fait pas une séance. Sinon, la règle des 60 s joue.
export const PART_MENEE_AU_BOUT = 0.5;
export const exerciceMeneAuBout = (ex, { derniereAtteinte, dureeS } = {}) => Boolean(ex) && derniereAtteinte === true
  && Number.isFinite(dureeS) && dureeS >= dureeExerciceS(ex) * PART_MENEE_AU_BOUT;
