// Écran Analyse (v5 ; v7 en 2b) : en haut, la porte « Historique › » et les trois portes de Comprendre ; Ma semaine en
// tuiles (dont « Tes émotions ») ; puis, selon la période : Tes zones (v9), Mes jours, ta journée heure par heure, contacts
// et mouvement, tes moments, les plus fréquents (dont les mots de l'émotion du moment), tous les chiffres. v7 : plus aucune
// phrase calculée sur la note de 1 à 10 (tendances, bonnes journées, sommeil et humeur, signal de ressemblance).
// Avec peu de données, l'écran le dit au lieu d'affirmer. Le calcul est mis en cache jusqu'à la prochaine écriture, et la
// base n'est pas relue avant (v8).
import { html, useEffect, useState } from '../lib.js';
import { Entete } from '../composants/entete.js';
import { Segmente } from '../composants/segmente.js';
import { Repli } from '../composants/repli.js';
import { Pourquoi } from '../composants/pourquoi.js';
import { Icones } from '../icones.js';
import { repo } from '../../donnees.js';
import { useEtatApp } from '../hooks.js';
import { analyze } from '../../analyse/index.js';
import { nombreDeReleves, nombreParZone, selonSeuilEmotions } from '../../analyse/emotions.js';
import { nombre, duree, moyenneReveils, phraseClassement, REGLES, PIED_EXPLOSIONS } from '../../analyse/textes.js';
import { carteLibelles } from '../../domain/libelles.js';
import { FAMILLES, libelleEmotion } from '../../domain/roue.js';
import { JOURS, jourSemaine, formaterPlage } from '../../domain/dates.js';
import { MesJours, TaJournee, Barres, ZonesParSemaine } from '../graphes/graphes.js';
import { QuatreBulles } from '../composants/quatre-bulles.js';
import { ONGLETS as PORTES_COMPRENDRE } from './comprendre.js';
import { versHash } from '../../routeur.js';
import { pourAffichage } from '../../domain/typographie.js';
import { lireSiChange, lireBase } from '../lecture.js';

const FENETRES = [{ valeur: '7', libelle: '7 j' }, { valeur: '30', libelle: '30 j' }, { valeur: '90', libelle: '3 mois' }, { valeur: 'tout', libelle: 'Tout' }];
// Les plus fréquents : l'émotion du moment (les mots de la roue), puis les listes des épisodes, symptômes et traitements.
const NOMS_CLASSEMENT = { emotionMoment: 'Émotion du moment', declencheur: 'Déclencheur', dessous: 'En dessous', emotion: 'Émotion (épisodes)', reaction: 'Réaction', symptome: 'Symptôme', effetSecondaire: 'Effet secondaire' };

// Le calcul, et avant lui la lecture de la base, ne se refont que si la base a changé (v8, Q26, ui/lecture.js).
export const calculerAnalyse = () => lireSiChange('analyse', async () => {
  // perso (v9) : la méta `motsPerso`, pour le libellé, la famille et la zone d'un relevé de mot à soi.
  const { journal, episodes, symptomes, traitements, humeurs, seances, items, explosionsDepuis: zeroDepuis, perso } = await lireBase();
  await new Promise((ok) => setTimeout(ok, 0));
  const resultat = analyze({ journal, episodes, symptomes, traitements, humeurs, seances, perso }, { aujourdhui: repo.aujourdhui(), items, zeroDepuis });
  return { resultat, items, carte: carteLibelles(items), zeroDepuis, perso };
});

// En haut (2b) : « Historique › » (v7 : l'Historique a quitté la barre d'onglets), puis les trois portes de Comprendre, chacune
// avec le carré de sa couleur (deux touchers pour chaque onglet, v6.1). Elles passent à la ligne en grand texte.
const COULEURS_PORTES = { explosions: ['explosions', 'expl'], energie: ['energie', 'energie'], rythmes: ['rythmes', 'sommeil'] };
const Portes = () => html`<nav class="portes-analyse" aria-label="Historique et Comprendre">
  <a class="porte-historique" href="#/historique">
    <span class="carre-porte" aria-hidden="true">${Icones.historique()}</span><span class="porte-titre">Historique</span>${Icones.chevron({ trait: 2 })}
  </a>
  <div class="portes" role="group" aria-label="Comprendre">${PORTES_COMPRENDRE.map((o) => {
    const [icone, teinte] = COULEURS_PORTES[o.valeur];
    return html`<a class=${`porte teinte-${teinte}`} href=${versHash('comprendre', { onglet: o.valeur })}>
      <span class="porte-haut" aria-hidden="true"><span class="carre-porte">${Icones[icone]()}</span>${Icones.chevron({ trait: 2 })}</span>
      <span class="porte-titre">${o.libelle}</span>
    </a>`;
  })}</div>
</nav>`;

const Tuile = ({ titre, valeur, detail, fragile, rubrique, classe = '' }) => html`<div class=${`tuile teinte-${rubrique} ${classe}`}>
  <span class="tuile-titre"><span class="point-rubrique petit" aria-hidden="true"></span>${titre}</span>
  <span class=${valeur === '·' ? 'tuile-valeur vide-chiffre' : 'tuile-valeur'}>${valeur}</span>
  ${(detail || fragile) && html`<span class="tuile-detail">${detail || ''}${detail && fragile ? ' ' : ''}${fragile ? '(peu de valeurs)' : ''}</span>`}
</div>`;

// Une barre par famille notée, longue comme son nombre de relevés, et ce nombre. Ni pourcentage, ni total, ni famille
// mise en avant : l'ordre est celui de la roue. Aussi dans « En consultation » (v7).
export function BarresFamilles({ compte }) {
  const familles = FAMILLES.filter((f) => compte[f.cle] > 0);
  const max = Math.max(1, ...familles.map((f) => compte[f.cle]));
  return html`<ul class="barres-familles">${familles.map((f) => html`<li class=${`emo-${f.cle}`}>
    <span class="nom-famille">${f.libelle}</span>
    <svg class="barre-famille" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><rect class="g-emo" x="0" y="0" width=${((compte[f.cle] / max) * 100).toFixed(1)} height="10" /></svg>
    <span class="compte-famille">${compte[f.cle]}</span>
  </li>`)}</ul>`;
}

// « Tes émotions » (v7) : les barres par famille de la semaine.
function TuileEmotions({ compte }) {
  return html`<div class="tuile tuile-emotions">
    <span class="tuile-titre">Tes émotions</span>
    <${BarresFamilles} compte=${compte} />
  </div>`;
}

// Ma semaine (v5 ; v7 en tuiles 2b) : les 7 derniers jours, quelle que soit la période choisie. Jamais de comparaison
// avec la semaine d'avant ; « nuits Mal » seules (Mal + Moyen + Bien donnerait le nombre de nuits notées). Les points
// positifs restent dans un repli fermé.
function MaSemaine({ f, frise7, semaine, carte }) {
  const lib = (id) => carte.get(id) || id;
  const nEmotions = nombreDeReleves(semaine.emotions);
  const joursExpl = frise7.colonnes.filter((c) => c.explosions > 0).map((c) => JOURS[jourSemaine(c.cle)]);
  if (!nEmotions && !f.nuits.n && !f.explosions.n && !f.episodes.nombre && !semaine.positifs.length) return null;
  return html`<section class="carte ma-semaine" aria-label="Ma semaine">
    <div class="carte-entete"><h2 class="titre-carte">Ma semaine</h2><span class="note-carte-interne">${formaterPlage(semaine.du, semaine.au)}</span></div>
    <div class="tuiles-semaine">
      ${nEmotions > 0 && html`<${TuileEmotions} compte=${semaine.emotions} />`}
      <${Tuile} rubrique="sommeil" titre=${`nuits ${lib('sommeil:mal')}`} valeur=${f.nuits.n ? String(f.nuits.mal) : '·'} />
      <${Tuile} rubrique="expl" titre="explosions" valeur=${f.explosions.n ? String(f.explosions.total) : '·'}
        detail=${joursExpl.length && joursExpl.length <= 2 ? joursExpl.join(', ') : ''} />
      <${Tuile} rubrique="ep" titre="épisodes" valeur=${String(f.episodes.nombre)} />
    </div>
    ${semaine.positifs.length > 0 && html`<${Repli} cle="positifs-semaine" titre="Tes points positifs" icone="positifs" teinte="pos" memoriser=${false}>
      <ul class="lignes-semaine">${semaine.positifs.map((p) => html`<li>« ${p.texte} » <span class="note-carte-interne">${JOURS[jourSemaine(p.date)]}</span></li>`)}</ul>
    </${Repli}>`}
  </section>`;
}

// Tes zones (v9, spec §8 et §13.2), juste après « Tes émotions » (Ma semaine), en tête de ce que règle la période : les
// quatre bulles de l'émotion en petit, chacune avec son nombre de relevés de la période ; dessous, la barre par semaine,
// toujours sur les 12 dernières semaines. Seuls comptent les relevés dont le mot a une zone. Sous 5 relevés, « Pas encore
// assez de données pour le dire. » et sa règle ; rien du tout tant qu'aucun relevé n'a de zone. Ni pourcentage, ni zone
// mise en avant : l'ordre est fixe.
function TesZones({ compte, semaines, avecZone }) {
  if (!avecZone) return null;
  const bullesOk = selonSeuilEmotions(nombreParZone(compte)) === 'ok';
  const semainesOk = selonSeuilEmotions(semaines.reduce((s, x) => s + nombreParZone(x), 0)) === 'ok';
  return html`<section class="carte tes-zones" aria-label="Tes zones">
    <div class="carte-entete"><h2 class="titre-carte">Tes zones</h2></div>
    ${bullesOk ? html`<${QuatreBulles} comptes=${compte} etiquette="Relevés par zone, sur la période" />` : html`<${Pourquoi} regle=${REGLES.zones} />`}
    ${semainesOk ? html`<${ZonesParSemaine} semaines=${semaines} />`
      : bullesOk && html`<figure class="graphe g-zones-semaines"><figcaption><span class="graphe-titre">Par semaine</span></figcaption><${Pourquoi} regle=${REGLES.zonesSemaines} /></figure>`}
  </section>`;
}

// Tes moments, étape par étape (v5) : par groupe (Explosions, Colère, Surcharge, Figé), ce que
// tu as noté, dans l'ordre de l'Après coup. « 3 sur 5 » : sur les épisodes où l'étape est remplie.
const LISTES_MOMENTS = [
  ['fragilites', 'Ce qui fragilisait déjà'], ['declencheurs', 'Ça a démarré avec'], ['dessous', 'En dessous'],
  ['tropDe', 'Ce qui était trop'], ['signes', 'Premiers signes'], ['besoins', 'Ce dont tu avais besoin'],
];
const NOMS_GROUPES = { explosions: 'Explosions' };
function TesMoments({ m, carte }) {
  const lib = (id) => carte.get(id) || id;
  const groupes = m.groupes.filter((g) => g.statut === 'ok');
  const [choix, setChoix] = useState(null);
  if (!groupes.length) return html`<${Pourquoi} regle=${REGLES.explosions} />`;
  const g = groupes.find((x) => x.cle === choix) || groupes[0];
  const lignes = LISTES_MOMENTS.filter(([cle]) => g[cle] && g[cle].elements.length > 0);
  return html`${groupes.length > 1 && html`<${Segmente} etiquette="Groupe" options=${groupes.map((x) => ({ valeur: x.cle, libelle: NOMS_GROUPES[x.cle] || lib(x.cle) }))}
      valeur=${g.cle} surChoix=${(v) => v && setChoix(v)} classe="large" sansVide=${true} />`}
    ${lignes.length > 0
      ? html`<ul class="liste carte carte-groupe classements">${lignes.map(([cle, nom]) => html`<li class="ligne-classement">
        <span class="nom-classement">${nom}</span><span>${g[cle].elements.map((x) => `${lib(x.id)} (${x.n} sur ${g[cle].n})`).join(' · ')}</span></li>`)}</ul>`
      : html`<p class="texte-secondaire">Rien n'est encore noté au moins 2 fois.</p>`}
    ${g.repere != null && html`<p class="phrase">Tu as remarqué que ça montait vers ${nombre(g.repere)} sur 10 (valeur du milieu).</p>`}
    ${g.siAlors.length > 0 && html`<div class="mots-utilisateur"><h3 class="libelle-section">Tes « si… alors… »</h3>
      <ul>${g.siAlors.map((x) => html`<li>Si ${x.si || '…'}, alors ${x.alors || '…'}</li>`)}</ul></div>`}
    ${g.aide.length > 0 && html`<div class="mots-utilisateur"><h3 class="libelle-section">Ce qui a aidé, d'autres fois</h3>
      <ul>${g.aide.map((a) => html`<li>« ${a.texte} » <span class="note-carte-interne">${a.date}</span></li>`)}</ul></div>`}
    <a class="lien" href="#/mon-plan">Voir Mon plan</a>
    <p class="pied-section">${PIED_EXPLOSIONS}</p>`;
}

// Avec qui, comment c'était · Mouvement (v5) : comptes en jours, ordre fixe des listes.
function DetailsBarres({ f, items, carte }) {
  const lib = (id) => carte.get(id) || id;
  const ordre = (liste) => items.filter((i) => i.liste === liste).sort((a, b) => a.ordre - b.ordre).map((i) => i.id);
  const ligne = (p, id, nom) => p.par[id] && { nom, par: p.par[id], total: p.jours[id] };
  const contacts = [...ordre('contactAvec').map((id) => ligne(f.contactDetail.paires, id, lib(id))),
    ligne(f.contactDetail.paires, 'plusieurs', 'À plusieurs'), ligne(f.contactDetail.paires, 'sans', 'Sans précision')].filter(Boolean);
  const sport = [...ordre('typeSport').map((id) => ligne(f.sportDetail.paires, id, lib(id))), ligne(f.sportDetail.paires, 'sans', 'Sans précision')].filter(Boolean);
  const effets = [
    { id: 'contactEffet:ressourcant', classe: 'rampe-3' }, { id: 'contactEffet:neutre', classe: 'rampe-2' },
    { id: 'contactEffet:couteux', classe: 'rampe-1' }, { id: 'aucun', classe: 'rampe-0', nom: 'non précisé' },
  ].map((p) => ({ ...p, nom: p.nom || lib(p.id).toLowerCase() }));
  const durees = [...ordre('dureeSport').map((id, i) => ({ id, classe: `rampe-${Math.min(4, i + 1)}`, nom: lib(id).toLowerCase() })), { id: 'aucun', classe: 'rampe-0', nom: 'durée non précisée' }];
  if (!contacts.length && !sport.length) return null;
  return html`<section class="section-analyse">
    <h2 class="titre-section equilibre">Avec qui, comment c'était · Mouvement</h2>
    ${contacts.length > 0 && html`<${Barres} titre="Avec qui, comment c'était" rubrique="contact" lignes=${contacts} precisions=${effets} lib=${lib} pied="En jours, selon tes réponses à « Comment c'était »." />`}
    ${sport.length > 0 && html`<${Barres} titre="Mouvement" rubrique="sport" lignes=${sport} precisions=${durees} lib=${lib} pied="En jours, par durée notée." />`}
  </section>`;
}

const jours = (n) => `${n} jour${n > 1 ? 's' : ''}`;

// Tous les chiffres : les anciennes tuiles de l'humeur (moyenne, journées à 7 ou plus, à 4 ou moins) sont retirées (v7).
// v8 : la durée de nuit vient aussi des heures notées le soir ; Réveils, Coucher et Lever, qui ne se notent plus le soir, ne
// gardent leur tuile que pour une période qui en a.
function Tuiles({ f, carte }) {
  const lib = (id) => carte.get(id) || id;
  const r = f.nuits.reveils;
  return html`<div class="tuiles">
    <${Tuile} rubrique="expl" titre="Explosions" valeur=${f.explosions.n ? String(f.explosions.total) : '·'} detail=${f.explosions.jours ? `${jours(f.explosions.jours)} avec` : ''} />
    <${Tuile} rubrique="sommeil" titre=${`Nuits ${lib('sommeil:mal')}`} valeur=${f.nuits.n ? String(f.nuits.mal) : '·'}
      detail=${f.nuits.n ? `${lib('sommeil:moyen')} ${f.nuits.moyen} · ${lib('sommeil:bien')} ${f.nuits.bien}` : ''} />
    ${r.n > 0 && html`<${Tuile} rubrique="sommeil" titre="Réveils" valeur=${moyenneReveils(r)} detail="moyenne" fragile=${r.fragile} />`}
    ${f.nuits.nCoucher > 0 && html`<${Tuile} rubrique="sommeil" titre="Coucher" valeur=${f.nuits.coucher || '·'} detail=${f.nuits.coucher ? 'médian' : ''} />`}
    ${f.nuits.nLever > 0 && html`<${Tuile} rubrique="sommeil" titre="Lever" valeur=${f.nuits.lever || '·'} detail=${f.nuits.lever ? 'médian' : ''} />`}
    <${Tuile} rubrique="sommeil" titre="Durée de nuit" valeur=${f.nuits.duree ? duree(f.nuits.duree) : '·'} detail=${f.nuits.duree ? 'médiane' : ''} />
    <${Tuile} rubrique="contact" titre="Contact humain" valeur=${f.contact.n ? jours(f.contact.oui) : '·'} detail=${detailJours(f.contactDetail.avec, lib)} />
    ${f.contactDetail.effet.jours > 0 && html`<${Tuile} rubrique="contact" titre="Comment c'était" valeur=${jours(f.contactDetail.effet.jours)} detail=${detailJours(f.contactDetail.effet, lib)} />`}
    <${Tuile} rubrique="lieu" titre=${lib('lieu:bureau')} valeur=${f.lieux.n ? jours(f.lieux.bureau) : '·'} detail=${f.lieux.n ? `${lib('lieu:teletravail').toLowerCase()} ${f.lieux.teletravail}` : ''} />
    <${Tuile} rubrique="sport" titre="Sport / mouvement" valeur=${f.sport.n ? jours(f.sport.oui) : '·'} detail=${detailJours(f.sportDetail.types, lib)} />
    <${Tuile} rubrique="trt" titre="Traitement pris" valeur=${f.traitement.n ? `${f.traitement.oui} · ${f.traitement.partiel} · ${f.traitement.non}` : '·'}
      detail=${f.traitement.n ? `${lib('traitementPris:oui')} · ${lib('traitementPris:partiel')} · ${lib('traitementPris:non')}` : ''} />
    <${Tuile} rubrique="ep" titre="Épisodes" valeur=${String(f.episodes.nombre)} detail=${f.episodes.nIntensite ? `intensité moyenne ${nombre(f.episodes.intensite)}` : ''} fragile=${f.episodes.nIntensite > 0 && f.episodes.fragile} />
    <${Tuile} rubrique="sy" titre="Symptômes" valeur=${String(f.symptomes.nombre)} />
  </div>`;
}

// Détails du soir (v4) : « Marche 4 j · Vélo 2 j » (en jours, les 3 premiers).
const detailJours = (d, lib) => d.par.slice(0, 3).map((x) => `${lib(x.id)} ${x.n} j`).join(' · ');

function Chiffres({ f, nEmotions }) {
  const lignes = [
    ['Émotions du moment', nEmotions], ['Explosions', f.explosions.n], ['Nuits', f.nuits.n], ['Durée de nuit', f.nuits.nDuree], ['Réveils', f.nuits.reveils.n],
    ['Coucher', f.nuits.nCoucher], ['Lever', f.nuits.nLever], ['Contact humain', f.contact.n], ['Lieu', f.lieux.n],
    ['Sport / mouvement', f.sport.n], ['Traitement pris', f.traitement.n], ['Intensité des épisodes', f.episodes.nIntensite],
  ];
  return html`<table class="tableau-lignes chiffres-base"><thead><tr><th scope="col">Indicateur</th><th scope="col">Valeurs prises en compte</th></tr></thead>
    <tbody>${lignes.map(([n, v]) => html`<tr><td>${n}</td><td>${v}</td></tr>`)}</tbody></table>`;
}

export function Analyse() {
  const version = useEtatApp((e) => e.versionDonnees || 0);
  const [fenetre, setFenetre] = useState('30');
  const [etat, setEtat] = useState(null);
  useEffect(() => { let actif = true; calculerAnalyse().then((v) => { if (actif) setEtat(v); }); return () => { actif = false; }; }, [version]);

  if (!etat) return html`<main class="ecran analyse"><${Entete} titre="Analyse" /><${Portes} /><p class="texte-secondaire centre">Calcul…</p></main>`;
  const { resultat: r, carte, items, perso } = etat;
  const f = r.fenetres[fenetre];
  const cl = { emotionMoment: r.emotions[fenetre].mots, ...r.classements[fenetre] };
  const libRoue = (id) => libelleEmotion(id, perso) || carte.get(id) || id;
  // Ta journée : les émotions à leur heure, à partir de 5 relevés (hors « vers ») ; l'énergie par créneau, à partir de
  // relevés de 3 jours (moments.js).
  const parHeure = r.emotions[fenetre].parHeure;
  const nHeure = Object.values(parHeure).reduce((s, c) => s + nombreDeReleves(c), 0);
  const journeeOk = selonSeuilEmotions(nHeure) === 'ok';
  const journeeTout = selonSeuilEmotions(Object.values(r.emotions.tout.parHeure).reduce((s, c) => s + nombreDeReleves(c), 0)) === 'ok' || r.moments.tout.statut === 'ok';

  return html`<main class="ecran analyse">
    <${Entete} titre="Analyse" />
    <${Portes} />
    <${MaSemaine} f=${r.fenetres['7']} frise7=${r.frise['7']} semaine=${r.semaine} carte=${carte} />

    <div class="selon-periode">
      <div class="selecteur-periode"><${Segmente} etiquette="Période" options=${FENETRES} valeur=${fenetre} surChoix=${(v) => v && setFenetre(v)} classe="large" sansVide=${true} /></div>
      <${TesZones} compte=${r.emotions[fenetre].parZone} semaines=${r.zonesSemaines} avecZone=${nombreParZone(r.emotions.tout.parZone) > 0} />
      <${MesJours} key=${`frise-${fenetre}`} frise=${r.frise[fenetre]} reperes=${r.reperesTraitement[fenetre]} carte=${carte} perso=${perso} aujourdhui=${r.aujourdhui} />
      ${journeeOk || r.moments[fenetre].statut === 'ok'
        ? html`<${TaJournee} key=${`journee-${fenetre}`} parHeure=${journeeOk ? parHeure : null} profil=${r.moments[fenetre]} carte=${carte} />`
        : journeeTout && html`<section class="section-analyse"><h2 class="titre-section">Ta journée heure par heure</h2><${Pourquoi} regle=${REGLES.emotionsJournee} /></section>`}
      <${DetailsBarres} f=${f} items=${items} carte=${carte} />

      <section class="section-analyse">
        <h2 class="titre-section">Tes moments, étape par étape</h2>
        <${TesMoments} key=${`moments-${fenetre}`} m=${r.tesMoments[fenetre]} carte=${carte} />
      </section>

      <section class="section-analyse">
        <h2 class="titre-section">Les plus fréquents</h2>
        <ul class="liste carte carte-groupe classements">${Object.entries(NOMS_CLASSEMENT).map(([liste, nom]) => html`<li class="ligne-classement">
          <span class="nom-classement">${nom}</span><span>${pourAffichage(phraseClassement(liste, cl[liste], carte, liste === 'emotionMoment' ? libRoue : undefined))}</span></li>`)}</ul>
      </section>

      <${Repli} cle="tous-chiffres" titre="Tous les chiffres" memoriser=${false}>
        <${Tuiles} f=${f} carte=${carte} />
        <${Chiffres} f=${f} nEmotions=${r.emotions[fenetre].n} />
      </${Repli}>
    </div>
  </main>`;
}
