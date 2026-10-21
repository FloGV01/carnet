import { readFileSync } from 'node:fs';
import { test, expect } from '../aides/gardes.js';
import { toucher, groupe, viderBase, aller, entreeDuJour } from '../aides/saisie.js';
import { canaux, contraste, jetons } from '../aides/couleurs.js';

// v7 (4/9) · Aujourd'hui 2b : en-tête « Jeudi 15 octobre », rubriques du soir en cartes, replis en liste groupée,
// Ma journée et le résumé avec les émotions (spec §5), bande du bas avec « Émotion » (P5), changer de jour en glissant
// (B4). Données inventées. Horloge : jeudi 15 octobre 2026, 21:00 (390 × 844, sauf mention).
const { clair, sombre } = jetons(readFileSync(new URL('../../public/css/tokens.css', import.meta.url), 'utf8'));
const rgb = (hex) => `rgb(${canaux(hex).join(', ')})`;
const repo = (page, f, arg) => page.evaluate(f, arg);
const THEMES = [['light', clair], ['dark', sombre]];

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 15, 21, 0) });
  await page.goto('/');
  await viderBase(page);
});

const boite = (page, selecteur) => page.locator(selecteur).first().boundingBox();
// Le titre du jour tel qu'il est affiché, sans « Aujourd'hui, » (réservé à VoiceOver).
const titreVu = (page) => page.locator('h1').evaluate((h) => [...h.childNodes]
  .filter((n) => !n.classList || !n.classList.contains('visuellement-cache')).map((n) => n.textContent).join('').trim());

// ---------- Le soir en cartes, sans défilement ----------

// Une carte de rubrique : son fond, son rayon, son carré (taille, couleur, icône) et son titre.
const carteDe = (page, nom) => page.locator('.carte-champ', { has: groupe(page, nom) }).evaluate((c) => {
  const s = getComputedStyle(c);
  const carre = c.querySelector('.carre-rubrique');
  const titre = c.querySelector('.titre-rubrique');
  const r = carre.getBoundingClientRect();
  return {
    fond: s.backgroundColor, rayon: s.borderTopLeftRadius, carre: [Math.round(r.width), Math.round(r.height)], rayonCarre: getComputedStyle(carre).borderTopLeftRadius,
    fondCarre: getComputedStyle(carre).backgroundColor, icone: getComputedStyle(carre.querySelector('svg')).color,
    titre: titre.textContent, couleurTitre: getComputedStyle(titre).color, graisse: getComputedStyle(titre).fontWeight,
  };
});

test('le soir tient sans défilement à 390 × 797, en clair et en sombre : six rubriques en cartes 2b, au-dessus de la bande', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 797 });
  for (const [schema, t] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    await viderBase(page);
    await toucher(page, 'Lieu', 'Bureau');
    await toucher(page, 'Sommeil', 'Moyen');
    await toucher(page, 'Contact humain', 'Oui');
    await toucher(page, 'Sport / mouvement', 'Non');
    await toucher(page, 'Traitement pris', 'Oui');
    await expect.poll(async () => (await entreeDuJour(page))?.traitementPris).toBe('traitementPris:oui');
    expect(await page.evaluate(() => window.scrollY), schema).toBe(0);
    // De l'en-tête à la carte des points positifs, tout est à l'écran, au-dessus de la bande, sans débord de côté.
    const [titre, positifs, bande, onglets] = await Promise.all([boite(page, 'h1'), boite(page, '.carte-champ:has(#points-positifs)'),
      boite(page, '.actions-flottantes'), page.getByRole('navigation', { name: 'Navigation principale' }).boundingBox()]);
    expect(titre.y).toBeGreaterThanOrEqual(0);
    expect(positifs.y + positifs.height, schema).toBeLessThanOrEqual(bande.y);
    expect(Math.abs(bande.y + bande.height - onglets.y)).toBeLessThanOrEqual(0.5);
    expect(Math.round(bande.height)).toBe(64);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    // Chaque rubrique : une carte --surface de rayon 14, un carré de 28 (rayon 7) à sa couleur, l'icône en -on, le titre en 600.
    for (const [nom, couleur, libelle] of [['Lieu', 'lieu', 'Lieu'], ['Sommeil', 'sommeil', 'Sommeil'], ['Contact humain', 'contact', 'Contact humain'],
      ['Sport / mouvement', 'sport', 'Sport / mouvement'], ['Traitement pris', 'traitement', 'Traitement pris']]) {
      const c = await carteDe(page, nom);
      const quoi = `${schema} · ${nom}`;
      expect(c.fond, quoi).toBe(rgb(t.surface));
      expect(c.rayon, quoi).toBe('14px');
      expect(c.carre, quoi).toEqual([28, 28]);
      expect(c.rayonCarre, quoi).toBe('7px');
      expect(c.fondCarre, quoi).toBe(rgb(t[`c-${couleur}`]));
      expect(c.icone, quoi).toBe(rgb(t[`c-${couleur}-on`]));
      expect(c.titre, quoi).toBe(libelle);
      expect(c.graisse, quoi).toBe('600');
      expect(contraste(c.couleurTitre, c.fond), quoi).toBeGreaterThanOrEqual(4.5);
    }
    // Les choix d'une carte font 48 de haut, ceux de Lieu en grille de 3.
    const lieu = await groupe(page, 'Lieu').evaluate((g) => ({ colonnes: getComputedStyle(g).gridTemplateColumns.split(' ').length, h: [...g.children].map((b) => b.getBoundingClientRect().height) }));
    expect(lieu.colonnes).toBe(3);
    for (const h of lieu.h) expect(h).toBe(48);
    // Contact et Sport côte à côte, de même hauteur, leurs Oui / Non sur une même ligne.
    const [contact, sport] = await Promise.all(['Contact humain', 'Sport / mouvement'].map((n) => groupe(page, n).boundingBox()));
    expect(Math.abs(contact.y - sport.y)).toBeLessThanOrEqual(0.5);
    expect(sport.x).toBeGreaterThan(contact.x + contact.width);
  }
});

test('« J\'ai fini pour ce soir » : en couleur action, sans fond, avec son icône, sans défiler à 390 × 844', async ({ page }) => {
  for (const [schema, t] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    await viderBase(page);
    await toucher(page, 'Lieu', 'Bureau');
    const fini = page.getByRole('button', { name: 'J\'ai fini pour ce soir' });
    await expect(fini).toBeInViewport({ ratio: 1 });
    const s = await fini.evaluate((b) => ({ couleur: getComputedStyle(b).color, fond: getComputedStyle(b).backgroundColor, graisse: getComputedStyle(b).fontWeight, icone: Boolean(b.querySelector('svg')) }));
    expect(s.couleur, schema).toBe(rgb(t.action));
    expect(s.fond, schema).toBe('rgba(0, 0, 0, 0)');
    expect(s.graisse).toBe('600');
    expect(s.icone).toBe(true);
    const memo = await page.getByRole('button', { name: 'Mémo vocal' }).evaluate((b) => getComputedStyle(b).backgroundColor);
    expect(memo, `${schema} · Mémo vocal neutre`).toBe(rgb(t.surface));
  }
});

// ---------- En-tête ----------

test('en-tête 2b : « Jeudi 15 octobre » en 23/600 avec un chevron bas, ‹ en couleur action, › atténué sur aujourd\'hui', async ({ page }) => {
  for (const [schema, t] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    await page.reload();
    // Affiché : « Jeudi 15 octobre » ; lu par VoiceOver : « Aujourd'hui, Jeudi 15 octobre ».
    const titre = page.getByRole('heading', { level: 1 });
    await expect(titre).toHaveAccessibleName('Aujourd\'hui, Jeudi 15 octobre');
    expect(await titreVu(page)).toBe('Jeudi 15 octobre');
    const s = await page.locator('.entete-jour').evaluate((e) => {
      const h1 = e.querySelector('h1');
      const chevron = e.querySelector('h1 svg').getBoundingClientRect();
      const date = e.querySelector('input[type="date"]').getBoundingClientRect();
      const [precedent, suivant] = [...e.querySelectorAll('.nav-jour')];
      const r = h1.getBoundingClientRect();
      return {
        taille: Math.round(Number.parseFloat(getComputedStyle(h1).fontSize)), graisse: getComputedStyle(h1).fontWeight, chevron: [Math.round(chevron.width), chevron.right <= r.right && chevron.top >= r.top && chevron.bottom <= r.bottom],
        couleurChevron: getComputedStyle(e.querySelector('h1 svg')).color,
        dateCouvre: date.left <= r.left && date.right >= r.right && date.top <= r.top && date.bottom >= r.bottom,
        precedent: [getComputedStyle(precedent).color, precedent.getBoundingClientRect().width, precedent.getBoundingClientRect().left > r.right],
        suivant: [getComputedStyle(suivant).opacity, suivant.disabled, suivant.getBoundingClientRect().height],
      };
    });
    expect(s.taille).toBe(23);
    expect(s.graisse).toBe('600');
    expect(s.chevron).toEqual([16, true]);
    expect(s.couleurChevron, schema).toBe(rgb(t['text-2']));
    expect(s.dateCouvre, 'le titre ouvre le sélecteur de date').toBe(true);
    expect(s.precedent, schema).toEqual([rgb(t.action), 44, true]);
    expect(s.suivant).toEqual(['0.4', true, 44]);
  }
  await page.getByRole('button', { name: 'Jour précédent' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('Mercredi 14 octobre');
  expect(await page.getByRole('button', { name: 'Jour suivant' }).evaluate((b) => [b.disabled, getComputedStyle(b).opacity])).toEqual([false, '1']);
});

// ---------- Ma journée et le résumé (point de vigilance 5) ----------

test('point de vigilance 5 · Ma journée mêle un ancien relevé chiffré et des relevés à émotion, dans l\'ordre des heures ; le résumé montre les familles du jour', async ({ page }) => {
  await repo(page, async () => {
    const r = window.__carnet.repo;
    await r.journal.patch('2026-10-15', { lieu: 'lieu:bureau' });
    await r.humeurs.creer({ date: '2026-10-15', heure: '18:30', emotion: 'roue:serenite', energie: null });
    await r.humeurs.creer({ date: '2026-10-15', heure: '10:20', humeur: 6, energie: 'energie:moyenne' });
    await r.episodes.creer({ date: '2026-10-15', heure: '12:30', emotion: 'emotion:colere', intensite: 5 });
    await r.humeurs.creer({ date: '2026-10-15', heure: '09:05', emotion: 'roue:colere:irrite', energie: 'energie:basse' });
    await r.humeurs.creer({ date: '2026-10-15', heure: '14:00', vers: true, emotion: 'roue:colere:furieux', energie: null });
    // Le lendemain, avant 4 h : encore le 15 (jour logique).
    await r.humeurs.creer({ date: '2026-10-16', heure: '01:10', emotion: 'roue:peur:craintif', energie: null });
  });
  for (const [schema, t] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Ma journée' })).toBeVisible();
    const lignes = await page.locator('.liste-evenements > li').evaluateAll((els) => els.map((li) => {
      const point = li.querySelector('.point-evenement');
      const s = getComputedStyle(point);
      return {
        heure: li.querySelector('.heure').textContent, texte: li.querySelector('.resume').textContent, lien: Boolean(li.querySelector('a')),
        point: s.backgroundColor === 'rgba(0, 0, 0, 0)' ? `creux ${s.borderTopColor}` : s.backgroundColor,
      };
    }));
    expect(lignes, schema).toEqual([
      { heure: '09:05', texte: 'Irrité · énergie basse', lien: false, point: rgb(t['c-emo-colere']) },
      { heure: '10:20', texte: 'humeur 6 · énergie moyenne', lien: false, point: `creux ${rgb(t['text-2'])}` },
      { heure: '12:30', texte: 'Colère · 5', lien: true, point: rgb(t['c-episode']) },
      { heure: 'vers 14 h', texte: 'Furieux', lien: false, point: rgb(t['c-emo-colere']) },
      { heure: '18:30', texte: 'Sérénité', lien: false, point: rgb(t['c-emo-serenite']) },
      { heure: '01:10', texte: 'Craintif', lien: false, point: rgb(t['c-emo-peur']) },
    ]);
    // Colonne d'heures fixe de 70, textes alignés ; AA du texte et de l'heure sur la carte.
    const colonnes = await page.locator('.liste-evenements > li').evaluateAll((els) => els.map((li) => {
      const h = li.querySelector('.heure');
      const fond = getComputedStyle(li.closest('.liste-evenements')).backgroundColor;
      return { largeur: h.getBoundingClientRect().width, texte: Math.round(li.querySelector('.resume').getBoundingClientRect().left),
        aa: [getComputedStyle(h).color, getComputedStyle(li.querySelector('.resume')).color, fond] };
    }));
    for (const c of colonnes) {
      expect(c.largeur).toBe(70);
      expect(contraste(c.aa[0], c.aa[2])).toBeGreaterThanOrEqual(4.5);
      expect(contraste(c.aa[1], c.aa[2])).toBeGreaterThanOrEqual(4.5);
    }
    expect(new Set(colonnes.map((c) => c.texte)).size).toBe(1);

    // Le résumé : les familles du jour en points de couleur, dans l'ordre de la journée, puis le texte ; l'ancienne note
    // y reste (« humeur 6 »).
    const familles = page.getByRole('img', { name: 'Émotions : Colère, Sérénité, Peur' });
    await expect(familles).toBeVisible();
    expect(await familles.locator('i').evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor)), schema)
      .toEqual([rgb(t['c-emo-colere']), rgb(t['c-emo-serenite']), rgb(t['c-emo-peur'])]);
    await expect(page.locator('.resume-jour')).toHaveText('Bureau · humeur 6');
    const [points, resume] = await Promise.all([boite(page, '.familles-jour'), boite(page, '.resume-jour')]);
    expect(points.x + points.width).toBeLessThanOrEqual(resume.x);
  }
  await expect(page.locator('main')).not.toContainText(/NaN|undefined|null|roue:/);

  // Un jour qui n'a que des émotions : plus de note dans le résumé, seulement les points.
  await repo(page, async () => {
    const r = window.__carnet.repo;
    await r.journal.patch('2026-10-13', { lieu: 'lieu:teletravail' });
    await r.humeurs.creer({ date: '2026-10-13', heure: '11:00', emotion: 'roue:joie:curieux', energie: 'energie:haute' });
  });
  await aller(page, '#/jour/2026-10-13');
  await expect(page.getByRole('img', { name: 'Émotions : Joie' })).toBeVisible();
  await expect(page.locator('.resume-jour')).toHaveText('Télétravail');
  await expect(page.locator('.liste-evenements > li')).toHaveText(['11:00Curieux · énergie haute']);
  // Un jour sans relevé : ni points, ni texte de trop.
  await aller(page, '#/jour/2026-10-12');
  await expect.poll(() => titreVu(page)).toBe('Lundi 12 octobre');
  await expect(page.locator('.familles-jour')).toHaveCount(0);
});

// ---------- Replis en liste groupée ----------

test('replis en liste groupée 2b : une carte, des rangées de 58 au moins, un carré à la couleur de la rubrique, le résumé sous le libellé', async ({ page }) => {
  await repo(page, () => window.__carnet.repo.journal.patch('2026-10-15', {
    heureCoucher: '23:20', heureLever: '07:10', reveilsNocturnes: 1, sportMouvement: true, activites: [{ type: 'typeSport:marche', duree: 'dureeSport:de_30_a_60' }],
    pese: ['pese:bruit', 'pese:lumiere', 'pese:monde', 'pese:changement', 'pese:attente'], recharge: ['recharge:seul', 'recharge:calme'],
  }));
  for (const [schema, t] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    await page.reload();
    await expect(page.locator('.replis .repli-titre')).toHaveText(['Nuit en détail', 'Ce qui a pesé · ce qui a rechargé', 'Sport en détail', 'Contact en détail', 'Notes libres']);
    const m = await page.locator('.replis').evaluate((g) => {
      const carte = g.getBoundingClientRect();
      return {
        fond: getComputedStyle(g).backgroundColor, rayon: getComputedStyle(g).borderTopLeftRadius,
        rangees: [...g.querySelectorAll(':scope > .repli')].map((r, i) => {
          const tete = r.querySelector('.repli-tete');
          const carre = r.querySelector('.repli-icone');
          const titre = r.querySelector('.repli-titre').getBoundingClientRect();
          const resume = r.querySelector('.repli-resume');
          const filet = i > 0 ? getComputedStyle(r, '::before') : null;
          return {
            hauteur: tete.getBoundingClientRect().height, carre: getComputedStyle(carre).backgroundColor, icone: getComputedStyle(carre).color,
            taille: Math.round(carre.getBoundingClientRect().width), gauche: Math.round(carre.getBoundingClientRect().left - carte.left),
            graisse: getComputedStyle(r.querySelector('.repli-titre')).fontWeight,
            resume: resume && { dessous: resume.getBoundingClientRect().top >= titre.bottom - 1, gauche: Math.abs(resume.getBoundingClientRect().left - titre.left) < 1,
              taille: Math.round(Number.parseFloat(getComputedStyle(resume).fontSize)), ellipse: getComputedStyle(resume).textOverflow, couleur: getComputedStyle(resume).color },
            filet: filet && Number.parseFloat(getComputedStyle(r).paddingLeft) + Number.parseFloat(filet.marginLeft),
            chevron: Boolean(tete.querySelector(':scope > .repli-fleche')),
          };
        }),
      };
    });
    const quoi = (i) => `${schema} · rangée ${i + 1}`;
    expect(m.fond).toBe(rgb(t.surface));
    expect(m.rayon).toBe('14px');
    const couleurs = ['sommeil', 'energie', 'sport', 'contact'];
    m.rangees.forEach((r, i) => {
      expect(r.hauteur, quoi(i)).toBeGreaterThanOrEqual(58);
      expect(r.taille, quoi(i)).toBe(28);
      expect(r.gauche, quoi(i)).toBe(12);
      expect(r.graisse, quoi(i)).toBe('500');
      expect(r.chevron, quoi(i)).toBe(true);
      if (i > 0) expect(r.filet, `${quoi(i)} : filet décalé de 52`).toBe(52);
      if (couleurs[i]) {
        expect(r.carre, quoi(i)).toBe(rgb(t[`c-${couleurs[i]}`]));
        expect(r.icone, quoi(i)).toBe(rgb(t[`c-${couleurs[i]}-on`]));
      } else expect(r.carre, `${quoi(i)} : Notes libres, neutre`).toBe(rgb(t['surface-2']));
    });
    // Résumés : sous le libellé, en 14 px --text-2, une ligne coupée par une ellipse ; AA sur la carte.
    for (const i of [0, 1, 2]) {
      const r = m.rangees[i].resume;
      expect(r, quoi(i)).toMatchObject({ dessous: true, gauche: true, taille: 14, ellipse: 'ellipsis', couleur: rgb(t['text-2']) });
      expect(contraste(r.couleur, m.fond)).toBeGreaterThanOrEqual(4.5);
    }
  }
  // Un repli s'ouvre dans la carte, et se referme.
  const nuit = page.getByRole('button', { name: /^Nuit en détail/ });
  await nuit.click();
  await expect(page.locator('.replis #coucher')).toHaveValue('23:20');
  await nuit.click();
  await expect(page.locator('#coucher')).toHaveCount(0);
});

// ---------- Bande du bas (P5) ----------

test('bande du bas : « Émotion » est le plus large et ouvre Émotion du moment ; « Moment difficile » sur deux lignes ; « + Épisode » en couleur action', async ({ page }) => {
  for (const [schema, t] of THEMES) {
    await page.emulateMedia({ colorScheme: schema });
    await page.reload();
    const bande = page.locator('.actions-flottantes');
    await expect(bande.getByRole('link')).toHaveCount(3);
    const m = await bande.evaluate((b) => [...b.children].map((a) => {
      const r = a.getBoundingClientRect();
      const carre = a.querySelector('.carre-action');
      const libelle = a.querySelector('.libelle-action');
      return {
        nom: a.getAttribute('aria-label') || a.textContent.trim(), largeur: r.width, hauteur: r.height, fond: getComputedStyle(a).backgroundColor, texte: getComputedStyle(a).color,
        carre: carre && [Math.round(carre.getBoundingClientRect().width), getComputedStyle(carre).backgroundColor, getComputedStyle(carre).color],
        lignes: libelle && Math.round(libelle.getBoundingClientRect().height / Number.parseFloat(getComputedStyle(libelle).lineHeight)),
        taille: libelle && Math.round(Number.parseFloat(getComputedStyle(libelle).fontSize)), graisse: libelle && getComputedStyle(libelle).fontWeight,
      };
    }));
    const [difficile, emotion, episode] = m;
    expect(m.map((x) => x.nom)).toEqual(['Moment difficile', 'Émotion du moment', 'Épisode']);
    for (const x of m) expect(x.hauteur).toBe(48);
    expect(emotion.largeur).toBeGreaterThan(difficile.largeur);
    expect(emotion.largeur).toBeGreaterThan(episode.largeur);
    expect(difficile.largeur).toBeGreaterThanOrEqual(112);
    expect(difficile.largeur).toBeLessThanOrEqual(114);
    expect(difficile.lignes, 'Moment difficile sur deux lignes').toBe(2);
    expect([difficile.taille, difficile.graisse]).toEqual([13, '600']);
    for (const [x, couleur] of [[difficile, 'difficile'], [emotion, 'humeur']]) {
      expect(x.fond, `${schema} · ${x.nom}`).toBe(rgb(t.surface));
      expect(x.carre, `${schema} · ${x.nom}`).toEqual([28, rgb(t[`c-${couleur}`]), rgb(t[`c-${couleur}-on`])]);
      expect(contraste(x.texte, x.fond)).toBeGreaterThanOrEqual(4.5);
    }
    expect([episode.fond, episode.texte], schema).toEqual([rgb(t.action), rgb(t['action-on'])]);
  }
  await page.getByRole('link', { name: 'Émotion du moment' }).click();
  await expect(page.getByRole('dialog', { name: 'Émotion du moment' })).toBeVisible();
  // Sur un jour passé, pas de bouton Émotion : les deux autres se partagent la bande.
  await aller(page, '#/jour/2026-10-12');
  await expect.poll(() => titreVu(page)).toBe('Lundi 12 octobre');
  await expect(page.getByRole('link', { name: 'Émotion du moment' })).toHaveCount(0);
  await expect(page.locator('.actions-flottantes > *')).toHaveCount(2);
});

// ---------- Changer de jour en glissant (B4) ----------

// Un glissement au doigt : posé au centre de l'élément visé, déplacé de (dx, dy), levé après `duree` ms d'horloge.
async function glisser(page, selecteur, dx, dy = 0, duree = 300) {
  const depart = await page.locator(selecteur).first().evaluate((el, d) => {
    const r = el.getBoundingClientRect();
    const [x, y] = [r.left + r.width / 2, r.top + r.height / 2];
    el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true }));
    if (!d.duree) el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x + d.dx, clientY: y + d.dy, bubbles: true }));
    return [x, y];
  }, { dx, dy, duree });
  if (!duree) return;
  await page.clock.runFor(duree);
  await page.locator(selecteur).first().evaluate((el, [x, y, ddx, ddy]) => {
    el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x + ddx, clientY: y + ddy, bubbles: true }));
  }, [...depart, dx, dy]);
}


test('glisser change de jour : vers la droite la veille, vers la gauche le lendemain, jamais au-delà d\'aujourd\'hui', async ({ page }) => {
  await expect.poll(() => titreVu(page)).toBe('Jeudi 15 octobre');
  await glisser(page, '.carte-champ .tete-rubrique', 120, 8);
  await expect(page).toHaveURL(/#\/jour\/2026-10-14$/);
  await expect.poll(() => titreVu(page)).toBe('Mercredi 14 octobre');
  await glisser(page, '.carte-champ .tete-rubrique', 100);
  await expect(page).toHaveURL(/#\/jour\/2026-10-13$/);
  await glisser(page, '.carte-champ .tete-rubrique', -100);
  await expect(page).toHaveURL(/#\/jour\/2026-10-14$/);
  await glisser(page, '.liste-evenements, .evenements-jour', -100, -10);
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect.poll(() => titreVu(page)).toBe('Jeudi 15 octobre');
  // Jamais au-delà d'aujourd'hui.
  await glisser(page, '.carte-champ .tete-rubrique', -150);
  await page.clock.runFor(300);
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await expect.poll(() => titreVu(page)).toBe('Jeudi 15 octobre');
  // Un geste rapide de 40 px suffit ; un geste lent de 40 px, non.
  await glisser(page, '.carte-champ .tete-rubrique', 40, 0, 400);
  await page.clock.runFor(300);
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await glisser(page, '.carte-champ .tete-rubrique', 40, 0, 0);
  await expect(page).toHaveURL(/#\/jour\/2026-10-14$/);
  // ‹ et › ne changent pas.
  await page.getByRole('button', { name: 'Jour suivant' }).click();
  await expect(page).toHaveURL(/#\/aujourdhui$/);
});

test('glisser est ignoré dans un champ, une boîte de dialogue, ou quand le geste n\'est pas horizontal ; le défilement vertical reste celui d\'iOS', async ({ page }) => {
  await toucher(page, 'Lieu', 'Bureau');
  // Dans la zone de texte des points positifs, ou sur le titre (le sélecteur de date) : rien.
  await glisser(page, '#points-positifs', 150);
  await glisser(page, '.carte-champ .dicter', 150);
  await glisser(page, '.choix-date', 150);
  // Un geste plus vertical qu'horizontal : rien.
  await glisser(page, '.carte-champ .tete-rubrique', 80, 60);
  await glisser(page, '.carte-champ .tete-rubrique', 10, -250);
  await page.clock.runFor(300);
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  // Une boîte de dialogue ouverte (« Effacer cette journée ») : rien.
  await page.getByRole('button', { name: 'Effacer cette journée' }).click();
  const dialogue = page.getByRole('alertdialog');
  await expect(dialogue).toBeVisible();
  await glisser(page, '[role="alertdialog"]', 150);
  await page.clock.runFor(300);
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await dialogue.getByRole('button', { name: 'Annuler' }).click();
  // Un élément qui défile de côté garde son geste (ici, une bande posée pour le test au bas de la page).
  await page.evaluate(() => {
    const bande = document.createElement('div');
    bande.className = 'essai-defile';
    bande.style.overflowX = 'auto';
    bande.style.height = '60px';
    const large = document.createElement('div');
    large.style.width = '1200px';
    large.style.height = '50px';
    bande.append(large);
    document.querySelector('main.aujourdhui').append(bande);
  });
  await glisser(page, '.essai-defile > div', 150);
  await page.clock.runFor(300);
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  await page.evaluate(() => document.querySelector('.essai-defile').remove());
  // Un pointeur de souris ne glisse pas (seul le doigt compte).
  await page.locator('.carte-champ .tete-rubrique').first().evaluate((el) => {
    el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 2, pointerType: 'mouse', isPrimary: true, clientX: 100, clientY: 300, bubbles: true }));
    el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 2, pointerType: 'mouse', isPrimary: true, clientX: 260, clientY: 300, bubbles: true }));
  });
  await page.clock.runFor(300);
  await expect(page).toHaveURL(/#\/aujourdhui$/);
  // Le geste horizontal est gardé par la page (touch-action), le vertical laissé à iOS : la page défile comme avant.
  expect(await page.locator('main.aujourdhui').evaluate((m) => getComputedStyle(m).touchAction)).toBe('pan-y pinch-zoom');
  // Rien n'est empêché : un geste reçu par la page n'est jamais annulé, la page défile.
  expect(await page.locator('.carte-champ .tete-rubrique').first().evaluate((el) => {
    const evt = (type, y) => new PointerEvent(type, { pointerId: 9, pointerType: 'touch', isPrimary: true, clientX: 200, clientY: y, bubbles: true, cancelable: true });
    return [el.dispatchEvent(evt('pointerdown', 500)), el.dispatchEvent(evt('pointerup', 200))];
  })).toEqual([true, true]);
  await page.evaluate(() => { window.scrollTo(0, 0); window.scrollBy(0, 400); });
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await expect(page).toHaveURL(/#\/aujourdhui$/);
});

test('glisser sur un jour ouvert depuis l\'Historique reste dans l\'Historique ; le nouveau jour entre de son côté, sauf avec « Réduire les animations »', async ({ page }) => {
  await aller(page, '#/historique/jour/2026-10-10');
  await expect.poll(() => titreVu(page)).toBe('Samedi 10 octobre');
  // Les entrées de page jouées, notées à leur départ (l'horloge de l'app est factice, pas celle des animations).
  await page.evaluate(() => {
    window.__entrees = [];
    document.addEventListener('animationstart', (e) => {
      if (!e.animationName.startsWith('entree-')) return;
      window.__entrees.push({ nom: e.animationName, duree: Number.parseFloat(getComputedStyle(e.target).animationDuration) * 1000,
        page: e.target.parentElement.matches('main.aujourdhui'), bande: Boolean(e.target.closest('.actions-flottantes')) });
    });
  });
  const entrees = () => page.evaluate(() => window.__entrees);
  await glisser(page, '.carte-champ .tete-rubrique', 120);
  await expect(page).toHaveURL(/#\/historique\/jour\/2026-10-09$/);
  await expect(page.getByRole('button', { name: 'Retour', exact: true })).toBeVisible();
  await expect.poll(async () => (await entrees()).length).toBeGreaterThan(0);
  for (const e of await entrees()) expect(e).toEqual({ nom: 'entree-veille', duree: 200, page: true, bande: false });
  await page.evaluate(() => { window.__entrees = []; });
  await glisser(page, '.carte-champ .tete-rubrique', -120);
  await expect(page).toHaveURL(/#\/historique\/jour\/2026-10-10$/);
  await expect.poll(async () => (await entrees()).map((e) => e.nom)).toContain('entree-lendemain');

  // « Réduire les animations » : le jour change, sans mouvement.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => { window.__entrees = []; });
  await glisser(page, '.carte-champ .tete-rubrique', 120);
  await expect(page).toHaveURL(/#\/historique\/jour\/2026-10-09$/);
  await expect.poll(() => titreVu(page)).toBe('Vendredi 9 octobre');
  await expect(page.locator('main.aujourdhui > .carte-champ').first()).toBeVisible();
  expect(await page.locator('main.aujourdhui > .carte-champ').first().evaluate((c) => getComputedStyle(c).animationName)).toBe('none');
  expect(await entrees()).toEqual([]);
});
