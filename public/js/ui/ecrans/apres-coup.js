// « Après coup » (v4) : revenir à froid sur un épisode, à la manière de la TCC (analyse en
// chaîne, tableau de pensées, plan « si… alors… »). Une question par écran, chaque étape se
// passe, rien n'est rappelé ni compté. Les réponses sont les mots de l'utilisateur : l'app ne
// dit jamais quoi faire. Enregistré à chaque toucher dans episodes.apresCoup.
import { html, useEffect, useRef, useState } from '../lib.js';
import { repo } from '../../donnees.js';
import { etatApp } from '../../store.js';
import { useIndicateur, ecrireAvecEssais } from '../hooks.js';
import { formaterJour, jourEvenement } from '../../domain/dates.js';
import { carteLibelles, libelle } from '../../domain/libelles.js';
import { phraseResume } from '../../domain/phrase.js';
import { estExplosion } from '../../domain/explosions.js';
import { avecHumeurDuJour } from '../../analyse/humeur-jour.js';
import { resumeEmotions } from '../../domain/releves.js';
import { ajouterSiAlors, retirerSiAlors, normaliserPlan } from '../../domain/mon-plan.js';
import { versHash } from '../../routeur.js';
import { CadreParcours } from '../composants/parcours.js';
import { Pastilles } from '../composants/pastilles.js';
import { PastillesMultiples } from '../composants/multiples.js';
import { ChampTexte } from '../composants/texte.js';
import { afficherToast } from '../composants/toast.js';
import { EnParler } from '../composants/en-parler.js';
import { Icones } from '../icones.js';
import { options } from './aujourdhui.js';

const ECHELLE = Array.from({ length: 10 }, (_, i) => ({ valeur: i + 1, libelle: String(i + 1) }));
const DELAI_SUIVANT_MS = 250;
const COLERE = 'typeExplosion:colere';
const SURCHARGE = ['typeExplosion:surcharge', 'typeExplosion:fige'];

// Étapes. L'étape 6 dépend de l'étape 1 : 6a si Colère est cochée, 6b si Surcharge ou Figé l'est ;
// aucun type, ou « Je ne sais pas » seul : pas d'étape 6. Une branche décochée qui porte des
// réponses reste affichée (rien n'est caché ni effacé en silence). Le repère compte ces écrans.
// recap : les lignes du récapitulatif, [libellé court à la première personne, champs…] (spec §8) ; la question
// complète reste sur l'écran de l'étape. courte : quelques réponses (types, échelles), posées en bas de l'écran,
// près du pouce (2b, P6) ; les autres étapes remplissent l'écran depuis le haut.
const rempli = (v) => v != null && !(Array.isArray(v) && v.length === 0);
export function etapesPour(ac = {}) {
  const t = ac.types || [];
  const colere = t.includes(COLERE) || ['pieges', 'pensees', 'autreFacon'].some((c) => rempli(ac[c]));
  const surcharge = t.some((x) => SURCHARGE.includes(x)) || ['tropDe', 'besoins'].some((c) => rempli(ac[c]));
  return [
    { cle: 'types', courte: true, question: 'C\'était plutôt…', sous: 'Plusieurs choix possibles.', blocs: [{ type: 'multi', champ: 'types', liste: 'typeExplosion' }],
      recap: [['C\'était plutôt', 'types']] },
    { cle: 'fragilites', question: 'Ce jour-là, ce qui me fragilisait déjà…', contexte: true, blocs: [{ type: 'multi', champ: 'fragilites', liste: 'fragilite' }],
      recap: [['Ce qui me fragilisait', 'fragilites']] },
    { cle: 'declencheur', question: 'Le déclencheur', sous: 'Repris de l\'épisode, tu peux le compléter.', blocs: [{ type: 'declencheur' }],
      recap: [['Le déclencheur', 'declencheur']] },
    { cle: 'signes', question: 'Mes premiers signes', sous: 'Dans le corps, les gestes, la tête.', blocs: [{ type: 'multi', champ: 'signes', liste: 'signe' }, { type: 'texte', champ: 'signesTexte', etiquette: 'Autre chose' }],
      recap: [['Mes signes', 'signes', 'signesTexte']] },
    { cle: 'repereA', courte: true, question: 'Quand j\'ai remarqué que ça montait, j\'en étais à…', sous: '1 = à peine, 10 = maximum', blocs: [{ type: 'echelle', champ: 'repereA' }],
      recap: [['Ça montait à', 'repereA']] },
    colere && { cle: 'pensees', question: 'Ce que je me suis dit', blocs: [{ type: 'multi', champ: 'pieges', liste: 'piegePensee', titre: 'Ça ressemble à…' }, { type: 'texte', champ: 'pensees', etiquette: 'Avec mes mots' }],
      recap: [['Ce que je me suis dit', 'pensees'], ['Mes pièges', 'pieges']] },
    surcharge && { cle: 'tropDe', question: 'Ce qui était trop', blocs: [{ type: 'multi', champ: 'tropDe', liste: 'sourceSurcharge' }, { type: 'multi', champ: 'besoins', liste: 'besoin', titre: 'Ce dont j\'avais besoin' }],
      recap: [['Ce qui était trop', 'tropDe'], ['Ce dont j\'avais besoin', 'besoins']] },
    { cle: 'consequences', question: 'Ce que ça a donné', blocs: [{ type: 'multi', champ: 'surLeMoment', liste: 'consequenceCourt', titre: 'Sur le moment' }, { type: 'multi', champ: 'plusTard', liste: 'consequenceLong', titre: 'Plus tard' }],
      recap: [['Sur le moment', 'surLeMoment'], ['Plus tard', 'plusTard']] },
    colere && { cle: 'autreFacon', question: 'Une autre façon de voir', sous: 'Ce qui est sûr, ce que je suppose. Si un ami me racontait ça, je lui dirais…', blocs: [{ type: 'texte', champ: 'autreFacon', etiquette: 'Une autre façon de voir', lignes: 3 }],
      recap: [['Une autre façon de voir', 'autreFacon']] },
    { cle: 'siAlors', question: 'Pour la prochaine fois', blocs: [{ type: 'siAlors' }],
      recap: [['La prochaine fois', 'siAlors']] },
    { cle: 'tensionApres', courte: true, question: 'Maintenant, en y repensant, c\'est à…', sous: '1 = à peine, 10 = maximum', blocs: [{ type: 'echelle', champ: 'tensionApres' }],
      recap: [['Tension après', 'tensionApres']] },
  ].filter(Boolean);
}

function retourner(id) {
  const precedente = etatApp.lire().routePrecedente;
  location.hash = precedente && !/#\/apres-coup\//.test(precedente) && !/#\/mon-plan/.test(precedente) ? precedente : versHash('episode', { id });
}

export function ApresCoup({ id }) {
  const [items, setItems] = useState(null);
  const [ep, setEp] = useState(null);
  const [jour, setJour] = useState(null);
  const [etape, setEtape] = useState(0);
  const [versRecap, setVersRecap] = useState(false);
  const [, signaler] = useIndicateur();
  const file = useRef(Promise.resolve());
  const suivant = useRef(null);
  const acRef = useRef({});

  useEffect(() => {
    let actif = true;
    (async () => {
      const [liste, lu] = await Promise.all([repo.listes.items(), repo.episodes.lire(id)]);
      if (!actif) return;
      if (!lu) { location.hash = '#/aujourdhui'; return; }
      setItems(liste);
      acRef.current = lu.apresCoup || {};
      setEp(lu);
      const j = jourEvenement(lu.date, lu.heure);
      const [entree, duJour, humeurs] = await Promise.all([repo.journal.lire(j), repo.episodes.parJour(j, j), repo.humeurs.parJour(j, j)]);
      if (!actif) return;
      // « Ce jour-là » dit l'humeur du jour (v6), comme tous les écrans, et non celle du soir ; depuis la v7, seuls les
      // anciens relevés ont une note. Il dit aussi les émotions du jour (v7), chacune une fois, dans l'ordre des heures.
      const jourLu = avecHumeurDuJour([entree || { date: j }], humeurs).find((x) => x.date === j);
      setJour({ entree: jourLu, nExplosions: duJour.filter(estExplosion).length, emotions: resumeEmotions(humeurs, Infinity) });
      if (lu.apresCoup) setEtape('recap');
    })();
    return () => { actif = false; clearTimeout(suivant.current); };
  }, [id]);

  // Écritures en file. La promesse rendue rejette si l'écriture échoue : un champ texte garde
  // alors son brouillon local. Les choix (pastilles) ignorent l'échec, déjà signalé.
  const ecrire = (changements) => {
    const travail = file.current.then(() => ecrireAvecEssais(() => repo.episodes.modifier(id, changements), signaler));
    file.current = travail.catch(() => {});
    return travail;
  };
  const sansErreur = (p) => p.catch(() => {});
  // La version courante vit dans une référence : deux touchers rapprochés ne s'écrasent pas.
  // jour : jour logique de la dernière écriture (un Après coup tardif part dans l'export PSY).
  const ecrireAC = (champ, v) => {
    acRef.current = { ...acRef.current, [champ]: v, jour: repo.aujourdhui() };
    const copie = acRef.current;
    setEp((e) => ({ ...e, apresCoup: copie }));
    return ecrire({ apresCoup: copie });
  };

  if (!items || !ep) return html`<div class="parcours"></div>`;
  const carte = carteLibelles(items);
  const ac = ep.apresCoup || {};
  const etapes = etapesPour(ac);
  const fermer = async () => { clearTimeout(suivant.current); await file.current; retourner(id); };
  const avancer = (depuis) => {
    if (versRecap) { setVersRecap(false); setEtape('recap'); return; }
    setEtape(depuis + 1 < etapes.length ? depuis + 1 : 'recap');
  };
  const ligneDate = html`<p class="ligne-date ligne-date-fixe">Épisode du ${formaterJour(jourEvenement(ep.date, ep.heure))}${ep.heure ? ` · ${ep.heure}` : ''}</p>`;

  if (etape === 'recap') {
    // Une ligne du récapitulatif : ses champs (un bloc de l'étape chacun, « declencheur » et « siAlors » par leur type).
    const resume = (et, champs) => champs.map((champ) => {
      const b = et.blocs.find((x) => (x.champ || x.type) === champ);
      const v = b.type === 'declencheur' ? ep.declencheur : b.type === 'siAlors' ? (ac.siJe || ac.alorsJe) && `si ${ac.siJe || '…'}, alors ${ac.alorsJe || '…'}` : ac[b.champ];
      if (v == null) return null;
      if (Array.isArray(v)) return v.map((x) => libelle(carte, x)).join(', ');
      if (b.type === 'echelle') return `${v}/10`;
      if (b.type === 'declencheur') return libelle(carte, v);
      return String(v);
    }).filter(Boolean).join(' · ');
    return html`<${CadreParcours} titre="Après coup" teinte="ep" etape="recap" nbEtapes=${etapes.length} surFermer=${fermer} sousTitre=${ligneDate}
      pied=${html`<button type="button" class="btn btn-plein terminer" onClick=${fermer}>Terminer</button>`}>
      <div class="etape-recap">
        <h2 class="titre-question">Récapitulatif</h2>
        <ul class="liste recap">${etapes.flatMap((et, i) => et.recap.map(([nom, ...champs]) => {
          const r = resume(et, champs);
          return html`<li><button type="button" class="ligne-recap" onClick=${() => { setVersRecap(true); setEtape(i); }}>
            <span class="recap-nom">${nom}</span><span class=${r ? 'recap-val' : 'recap-val discret'}>${r || '·'}</span>${Icones.chevron({ trait: 2 })}
          </button></li>`;
        }))}</ul>
        <p class="note-carte-interne">Ce sont tes mots. Tu peux les relire avec ton soignant, ou les envoyer à PSY avec l'export.</p>
        <${EnParler} store="episodes" element=${ep} carte=${carte} />
      </div>
    </${CadreParcours}>`;
  }

  const et = etapes[etape];
  // Les émotions du jour : leurs familles en points de couleur (masqués aux lecteurs d'écran), puis les mots.
  const phraseJour = jour && phraseResume('jour', jour.entree, carte, { nExplosions: jour.nExplosions, emotions: jour.emotions })
    .map((s) => (s.rubrique === 'emotions' ? html`<span class="emotions-jour"><span class="familles-jour" aria-hidden="true">${s.familles.map((f) => html`<i key=${f.cle} class=${`emo-${f.cle}`}></i>`)}</span>${s.texte}</span>` : s.texte));
  const remplie = et.blocs.some((b) => (b.type === 'declencheur' ? ep.declencheur : b.type === 'siAlors' ? ac.siJe || ac.alorsJe : ac[b.champ]) != null);
  const bloc = (b, i) => {
    if (b.type === 'multi') {
      return html`<div class="bloc-etape" key=${`${et.cle}-${i}`}>${b.titre && html`<h3 class="sous-titre-etape">${b.titre}</h3>`}
        <${PastillesMultiples} etiquette=${b.titre || et.question} options=${options(items, b.liste, ac[b.champ])} valeurs=${ac[b.champ]} surChoix=${(v) => sansErreur(ecrireAC(b.champ, v))} teinte="ep"
          exclusifs=${new Set(items.filter((x) => x.liste === b.liste && x.exclusif).map((x) => x.id))} />
      </div>`;
    }
    if (b.type === 'echelle') {
      return html`<${Pastilles} key=${et.cle} etiquette=${et.question} ariaPrefixe="Sur 10 :" options=${ECHELLE} valeur=${ac[b.champ] ?? null} colonnes=${5} classe="chiffres grille-choix" teinte="ep"
        surChoix=${(v) => { sansErreur(ecrireAC(b.champ, v)); clearTimeout(suivant.current); if (v != null) suivant.current = setTimeout(() => avancer(etape), DELAI_SUIVANT_MS); }} />`;
    }
    if (b.type === 'texte') {
      return html`<div class="bloc-etape" key=${`${et.cle}-${b.champ}`}><${ChampTexte} id=${`ac-${b.champ}`} etiquette=${b.etiquette} valeur=${ac[b.champ]} lignes=${b.lignes || 2}
        cleBrouillon=${`carnet:brouillon:${id}:ac:${b.champ}`} surEnregistrer=${(v) => ecrireAC(b.champ, v)} /></div>`;
    }
    if (b.type === 'declencheur') {
      return html`<div class="bloc-etape" key="declencheur">
        <${Pastilles} etiquette="Déclencheur" options=${options(items, 'declencheur', ep.declencheur)} valeur=${ep.declencheur ?? null} colonnes=${2} classe="grille-choix" teinte="ep"
          surChoix=${(v) => { setEp((e) => ({ ...e, declencheur: v })); sansErreur(ecrire({ declencheur: v })); }} />
        <${ChampTexte} id="ac-situation" etiquette="Ce qui s'est passé" valeur=${ep.situation} lignes=${2}
          cleBrouillon=${`carnet:brouillon:${id}:situation`} surEnregistrer=${(v) => { setEp((e) => ({ ...e, situation: v })); return ecrire({ situation: v }); }} />
      </div>`;
    }
    if (b.type === 'siAlors') {
      const versPlan = async () => {
        await file.current;
        const { siJe, alorsJe } = ac;
        let avant = null;
        const apres = await repo.meta.modifier('monPlan', (p) => { avant = normaliserPlan(p); return ajouterSiAlors(avant, siJe, alorsJe); });
        if (apres.siAlors.length === avant.siAlors.length) { afficherToast('Déjà dans Mon plan', null, 2500); return; }
        afficherToast('Ajouté à Mon plan', { libelle: 'Annuler', faire: () => repo.meta.modifier('monPlan', (p) => retirerSiAlors(p, siJe, alorsJe)) });
      };
      return html`<div class="bloc-etape" key="siAlors">
        <${ChampTexte} id="ac-siJe" etiquette="Si je remarque…" valeur=${ac.siJe} lignes=${2} cleBrouillon=${`carnet:brouillon:${id}:ac:siJe`} surEnregistrer=${(v) => ecrireAC('siJe', v)} />
        <${ChampTexte} id="ac-alorsJe" etiquette="…alors je" valeur=${ac.alorsJe} lignes=${2} cleBrouillon=${`carnet:brouillon:${id}:ac:alorsJe`} surEnregistrer=${(v) => ecrireAC('alorsJe', v)} />
        <button type="button" class="btn-lien action" disabled=${!(ac.siJe || ac.alorsJe)} onClick=${versPlan}>${Icones.plus({ trait: 2 })}Ajouter à Mon plan</button>
      </div>`;
    }
    return null;
  };

  return html`<${CadreParcours} titre="Après coup" teinte="ep" etape=${etape} nbEtapes=${etapes.length} surFermer=${fermer} sousTitre=${ligneDate}
    pied=${html`<button type="button" class="btn-lien" disabled=${etape === 0} onClick=${() => setEtape(etape - 1)}>${Icones.retour({ trait: 2 })}Retour</button>
      <button type="button" class="btn-lien" onClick=${() => avancer(etape)}>${remplie ? 'Suivant' : 'Passer'}${Icones.chevron({ trait: 2 })}</button>`}>
    <div class=${`etape${et.courte ? ' courte' : ''}`} key=${et.cle}>
      ${et.contexte && phraseJour && phraseJour.length > 0 && html`<p class="phrase-resume">Ce jour-là : ${phraseJour}</p>`}
      <div class="reponses-etape">
        <div><h2 class="titre-question">${et.question}</h2>${et.sous && html`<p class="sous-question">${et.sous}</p>`}</div>
        ${et.blocs.map(bloc)}
      </div>
    </div>
  </${CadreParcours}>`;
}
