// Définitions des 79 mots de la roue (v8, spec §4) : écrites pour Carnet, une phrase courte et neutre, au masculin
// comme les mots. Elles décrivent ce qu'on ressent ou la situation, sans juger ni conseiller. Pur, figé comme la roue :
// l'utilisateur les corrige dans Réglages › Émotions, et ses corrections vivent dans la méta `definitionsRoue`
// ({ [idMot]: texte }), sauvegardée avec le reste. Le texte de Carnet ne change pas ; il revient quand une correction
// est retirée.
// v9 (spec §6 et §13.3) : 144 mots, les 65 ajouts à la fin de chaque famille, puis les deux mots sans famille. Seule une
// nouvelle version change un texte de Carnet : la v9 en change six (« // v9 »), qui contenaient le mot d'une nouvelle
// bulle (Craintif, Accompli, Mécontent, Extasié) ou le sens d'un ajout (Libéré, celui de Soulagé ; Tranquille, celui
// d'Insouciant). Aucune définition ne reprend celles de How We Feel ou de Yale.
import { motPerso } from './roue.js';

export const DEFINITIONS = Object.freeze({
  // Colère
  'roue:colere:embarrasse': 'Gêné devant les autres, au point d\'en rougir.',
  'roue:colere:devaste': 'Bouleversé, comme si tout s\'était effondré d\'un coup.',
  'roue:colere:insecurise': 'Pas sûr de soi ni de sa place, sur le qui-vive.',
  'roue:colere:jaloux': 'Contrarié de voir un autre avoir ce qu\'on voudrait, ou de craindre de perdre quelqu\'un.',
  'roue:colere:amer': 'Plein de rancœur après une déception ou une injustice.',
  'roue:colere:defiant': 'Qui tient tête, prêt à s\'opposer.',
  'roue:colere:furieux': 'En très grande colère, avec du mal à se contenir.',
  'roue:colere:enrage': 'Submergé par la colère, au point de ne plus penser à autre chose.',
  'roue:colere:provocateur': 'Qui cherche à piquer les autres ou à les faire réagir.',
  'roue:colere:hostile': 'Fermé, prêt à se défendre ou à attaquer face à quelqu\'un.',
  'roue:colere:mecontent': 'Ce qui se passe, ou ce qu\'on a reçu, ne convient pas.', // v9
  'roue:colere:irrite': 'Agacé par quelque chose qui gêne ou qui se répète.',
  'roue:colere:retire': 'En retrait, à distance des autres.',
  'roue:colere:suspect': 'Soupçonneux, sur ses gardes, on doute des intentions des autres.',
  'roue:colere:sceptique': 'Qui doute, pas convaincu par ce qu\'on entend.',
  'roue:colere:sarcastique': 'Qui se moque avec des mots piquants, souvent pour dire un agacement.',
  // Colère, v9
  'roue:colere:en-colere': 'Remonté contre quelqu\'un ou quelque chose, ça chauffe à l\'intérieur.',
  'roue:colere:frustre': 'Empêché d\'arriver à ce qu\'on voulait, l\'envie reste coincée.',
  // Dégoût
  'roue:degout:juge': 'Regardé et évalué par les autres, comme sous un examen.',
  'roue:degout:aversion': 'Une forte envie de s\'éloigner de quelque chose ou de quelqu\'un.',
  'roue:degout:repugnant': 'Écœuré par quelque chose qui repousse.',
  'roue:degout:revolte': 'Choqué par ce qui paraît injuste, au point de vouloir s\'y opposer.',
  'roue:degout:degout': 'Un écœurement, l\'envie de se détourner de quelque chose.',
  'roue:degout:detestable': 'On se trouve, ou on trouve une chose, difficile à supporter.',
  'roue:degout:hesitant': 'Partagé entre plusieurs choix, du mal à se décider.',
  // Dégoût, v9
  'roue:degout:mepris': 'On regarde quelqu\'un ou quelque chose de haut, avec froideur.',
  // Tristesse
  'roue:tristesse:fautif': 'Avec le sentiment d\'avoir fait du tort ou d\'être responsable de ce qui arrive.',
  'roue:tristesse:honteux': 'L\'envie de se cacher, de disparaître du regard des autres.',
  'roue:tristesse:ignore': 'Ni vu ni entendu par les autres, comme si on n\'était pas là.',
  'roue:tristesse:replie': 'Refermé sur soi, sans envie d\'aller vers les autres.',
  'roue:tristesse:impuissant': 'Sans prise sur ce qui arrive, rien ne semble possible.',
  'roue:tristesse:vulnerable': 'Exposé, à découvert, facile à blesser.',
  'roue:tristesse:minable': 'Petit et piteux à ses propres yeux.',
  'roue:tristesse:vide': 'Plus rien à l\'intérieur, comme engourdi.',
  'roue:tristesse:abandonne': 'Laissé seul par quelqu\'un sur qui on comptait.',
  'roue:tristesse:isole': 'Seul, à l\'écart, loin des autres.',
  'roue:tristesse:amorphe': 'Sans élan, le corps et l\'esprit au ralenti.',
  'roue:tristesse:indifferent': 'Rien ne touche ni n\'intéresse vraiment, pour le moment.',
  // Tristesse, v9
  'roue:tristesse:ennui': 'Le temps paraît long, rien n\'accroche.',
  'roue:tristesse:triste': 'Le cœur lourd, avec parfois l\'envie de pleurer.',
  'roue:tristesse:decourage': 'Plus le cœur à continuer, l\'effort semble ne mener à rien.',
  'roue:tristesse:desespere': 'Plus aucun espoir que les choses s\'arrangent.',
  // Joie
  'roue:joie:inspire': 'Plein d\'idées et d\'élan, l\'envie de créer ou d\'agir.',
  'roue:joie:ouvert': 'Disponible, prêt à accueillir les autres et ce qui vient.',
  'roue:joie:espiegle': 'D\'humeur joueuse, l\'envie de taquiner gentiment.',
  'roue:joie:sensible': 'Touché, réceptif à ce qui se passe et aux autres.',
  'roue:joie:optimiste': 'Confiant dans la suite de ce qui se passe.',
  'roue:joie:aimant': 'Plein d\'affection pour quelqu\'un.',
  'roue:joie:provocant': 'Audacieux et taquin, qui ose.',
  'roue:joie:courageux': 'Prêt à faire face à quelque chose de difficile.',
  'roue:joie:accompli': 'Ce qu\'on avait entrepris est achevé, on en voit le résultat.', // v9
  'roue:joie:respecte': 'Pris au sérieux et considéré par les autres.',
  'roue:joie:important': 'Compter pour les autres, avoir sa place.',
  'roue:joie:curieux': 'L\'envie de découvrir, de comprendre, d\'en savoir plus.',
  'roue:joie:amuse': 'Quelque chose fait sourire ou rire.',
  'roue:joie:extasie': 'Transporté par une joie immense.', // v9
  'roue:joie:libere': 'Libre de ses mouvements, plus rien ne retient.', // v9
  'roue:joie:confiant': 'Sûr de soi ou des autres, on peut compter dessus.',
  // Joie, v9
  'roue:joie:euphorique': 'Une joie vive, un peu étourdissante.',
  'roue:joie:electrise': 'Un frisson de joie qui parcourt tout le corps.',
  'roue:joie:aux-anges': 'Débordant de bonheur, comme en apesanteur.',
  'roue:joie:determine': 'Décidé à aller au bout de ce qu\'on a choisi.',
  'roue:joie:fort': 'Avec prise sur ce qui arrive, on peut agir.',
  'roue:joie:enthousiaste': 'Plein d\'ardeur pour ce qu\'on est en train de faire.',
  'roue:joie:joyeux': 'Le sourire facile, une joie qui se voit.',
  'roue:joie:productif': 'Les choses avancent, on fait ce qu\'on voulait faire.',
  'roue:joie:fier': 'La tête haute pour ce qu\'on a fait ou ce qu\'on est.',
  'roue:joie:heureux': 'La vie paraît belle en ce moment, on en profite.',
  'roue:joie:motive': 'Prêt à s\'y mettre, avec l\'envie de le faire.',
  'roue:joie:gai': 'Une humeur légère et agréable, sans raison particulière.',
  'roue:joie:concentre': 'L\'esprit tout entier pris par ce qu\'on fait.',
  'roue:joie:vivant': 'Plein de vie, présent dans son corps et dans le moment.',
  'roue:joie:stimule': 'Tiré vers le haut par quelque chose d\'exigeant.',
  'roue:joie:rejoui': 'Une petite joie, quelque chose fait plaisir.',
  'roue:joie:ravi': 'Enchanté par ce qui arrive, la joie est franche.',
  'roue:joie:competent': 'Capable de faire ce qu\'on a à faire, et on le sent.',
  'roue:joie:compris': 'Ce qu\'on vit ou ce qu\'on pense est saisi par quelqu\'un d\'autre.',
  'roue:joie:epanoui': 'Avec le sentiment de grandir et d\'être pleinement soi.',
  'roue:joie:comble': 'Un bonheur plein et doux, qui enveloppe tout.',
  'roue:joie:apprecie': 'Ce qu\'on fait ou ce qu\'on est plaît aux autres, et ils le montrent.',
  'roue:joie:soutenu': 'Quelqu\'un est là, sur qui s\'appuyer.',
  'roue:joie:aime': 'Avec la sensation de recevoir l\'affection de quelqu\'un.',
  'roue:joie:relie': 'Proche des autres, quelque chose passe entre eux et soi.',
  'roue:joie:compatissant': 'La peine d\'un autre résonne en soi, avec l\'envie de l\'aider.',
  'roue:joie:inclus': 'Accueilli dans un groupe, on en fait partie.',
  'roue:joie:reconnaissant': 'L\'envie de dire merci pour ce qu\'on a reçu.',
  'roue:joie:bienveillant': 'Tourné vers les autres avec douceur, sans arrière-pensée.',
  'roue:joie:ecoute': 'Ce qu\'on dit est entendu et pris en compte.',
  'roue:joie:content': 'Ce qu\'on a suffit, sans chercher plus loin.',
  'roue:joie:accepte': 'Reçu tel qu\'on est, sans avoir à changer.',
  'roue:joie:emu': 'Le cœur chaviré par quelque chose de beau ou de tendre.',
  'roue:joie:chanceux': 'La vie a été généreuse, on le mesure.',
  'roue:joie:satisfait': 'Ce qu\'on attendait est arrivé, tel qu\'on le voulait.',
  // Surprise
  'roue:surprise:energique': 'Plein d\'élan, le corps prêt à bouger.',
  'roue:surprise:avide': 'Impatient, plein d\'envie pour ce qui arrive.',
  'roue:surprise:effraye': 'Saisi d\'un coup, le sursaut de la peur.',
  'roue:surprise:abasourdi': 'Sonné par une nouvelle inattendue, sans voix.',
  'roue:surprise:perplexe': 'Sans savoir quoi penser, les idées s\'embrouillent.',
  'roue:surprise:desillusionne': 'Ce qu\'on espérait ne s\'est pas réalisé, l\'élan retombe.',
  'roue:surprise:consterne': 'Abattu et sans voix devant ce qui arrive.',
  'roue:surprise:choque': 'Secoué par quelque chose de brutal ou d\'inattendu.',
  // Surprise, v9
  'roue:surprise:surpris': 'Pris de court par quelque chose d\'inattendu.',
  'roue:surprise:emerveille': 'Saisi par quelque chose de grand ou de beau, qui dépasse.',
  'roue:surprise:emballe': 'Conquis par une idée ou un projet, l\'envie de s\'y lancer tout de suite.',
  'roue:surprise:epate': 'Impressionné par quelque chose qu\'on n\'aurait pas cru possible.',
  // Peur
  'roue:peur:terrifie': 'Envahi par une peur très forte.',
  'roue:peur:craintif': 'Sur la réserve, on redoute ce qui pourrait arriver.', // v9
  'roue:peur:accable': 'Écrasé par trop de choses à la fois.',
  'roue:peur:preoccupe': 'L\'esprit pris par un souci qui revient.',
  'roue:peur:incapable': 'Avec l\'impression de ne pas pouvoir y arriver.',
  'roue:peur:inferieur': 'Moins que les autres, à ses propres yeux.',
  'roue:peur:sans-valeur': 'Avec l\'impression de ne compter pour rien.',
  'roue:peur:inadequat': 'Pas à la hauteur de ce qui est attendu.',
  'roue:peur:insignifiant': 'Tout petit, comme si on ne comptait pas.',
  'roue:peur:exclus': 'Laissé en dehors d\'un groupe ou de ce qui se fait.',
  'roue:peur:non-respecte': 'Pas considéré : ses limites ou sa parole sont mises de côté.',
  'roue:peur:ridiculise': 'Moqué devant les autres, rendu ridicule.',
  // Peur, v9
  'roue:peur:panique': 'La peur fait perdre ses moyens, on ne sait plus quoi faire.',
  'roue:peur:survolte': 'Trop d\'énergie, le corps et la tête n\'arrivent plus à ralentir.',
  'roue:peur:stresse': 'Mobilisé sans relâche, sans pouvoir souffler.',
  'roue:peur:sous-pression': 'Poussé par ce que les autres attendent ou par un délai qui approche.',
  'roue:peur:anxieux': 'Une peur sans objet précis, qui serre la gorge ou le ventre.',
  'roue:peur:agite': 'Impossible de tenir en place, le corps a besoin de bouger.',
  'roue:peur:apeure': 'Face à quelque chose ou à quelqu\'un qui fait peur.',
  'roue:peur:tendu': 'Les muscles crispés, le corps prêt à réagir.',
  'roue:peur:inquiet': 'Dans l\'attente, on se demande comment ça va tourner.',
  'roue:peur:mal-a-l-aise': 'Pas bien dans la situation, quelque chose cloche.',
  // Sérénité
  'roue:serenite:calme': 'Rien ne s\'agite, ni dedans ni autour.',
  'roue:serenite:apaise': 'La tension est retombée, le corps se relâche.',
  'roue:serenite:detendu': 'Les muscles et l\'esprit relâchés.',
  'roue:serenite:repose': 'Le corps a récupéré, l\'énergie est revenue.',
  'roue:serenite:tranquille': 'Un moment paisible, sans bruit ni dérangement.', // v9
  'roue:serenite:serein': 'En paix avec ce qui est, sans inquiétude.',
  'roue:serenite:pose': 'Stable et réfléchi, on prend son temps.',
  'roue:serenite:en-securite': 'À l\'abri, rien ne menace.',
  // Sérénité, v9
  'roue:serenite:a-l-aise': 'Bien dans la situation, rien ne gêne.',
  'roue:serenite:bien': 'Ça va, tout simplement.',
  'roue:serenite:pensif': 'Absorbé par ses pensées, calmement, sans qu\'elles tournent en rond.',
  'roue:serenite:equilibre': 'Chaque chose à sa place, ni trop ni trop peu.',
  'roue:serenite:solide': 'D\'aplomb, sur des bases qui tiennent.',
  'roue:serenite:insouciant': 'L\'esprit léger, sans aucun souci en tête.',
  'roue:serenite:soulage': 'Ce qui pesait ou faisait mal vient de s\'arrêter.',
  // Sans famille, v9
  'roue:aucune:fatigue': 'Le corps ou la tête demandent du repos.',
  'roue:aucune:epuise': 'À bout de forces, même les petites choses coûtent.',
});

const aDefinition = (id) => Object.prototype.hasOwnProperty.call(DEFINITIONS, id);
// Une correction lisible : un texte qui n'est pas vide une fois les espaces retirés.
const correctionDe = (id, corrections) => {
  const c = corrections && typeof corrections === 'object' && Object.prototype.hasOwnProperty.call(corrections, id) ? corrections[id] : null;
  return typeof c === 'string' && c.trim() !== '' ? c.trim() : null;
};

// La définition affichée : la correction de l'utilisateur, sinon la définition d'un mot à soi (méta `motsPerso`, v9),
// sinon le texte de Carnet ; null pour un id inconnu, et pour un mot à soi sans définition.
export function definition(id, corrections, perso) {
  if (aDefinition(id)) return correctionDe(id, corrections) ?? DEFINITIONS[id];
  const mot = motPerso(id, perso);
  if (!mot) return null;
  const sienne = typeof mot.definition === 'string' && mot.definition.trim() !== '' ? mot.definition.trim() : null;
  return correctionDe(id, corrections) ?? sienne;
}

// Le mot a-t-il une correction (différente du texte de Carnet) ?
export const estCorrigee = (id, corrections) => aDefinition(id) && correctionDe(id, corrections) !== null
  && correctionDe(id, corrections) !== DEFINITIONS[id];

// Les corrections après un changement, sans modifier l'objet reçu : un texte vide, ou le texte de Carnet, retire la
// correction (« Revenir au texte de Carnet »). Les clés inconnues ou illisibles sont laissées telles quelles.
export function corriger(corrections, id, texte) {
  const suivantes = corrections && typeof corrections === 'object' && !Array.isArray(corrections) ? { ...corrections } : {};
  const t = typeof texte === 'string' ? texte.trim() : '';
  if (!aDefinition(id) || t === '' || t === DEFINITIONS[id]) delete suivantes[id];
  else suivantes[id] = t;
  return suivantes;
}
