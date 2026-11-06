import { test, expect } from '../aides/gardes.js';
import { toucher, groupe, entreeDuJour, viderBase } from '../aides/saisie.js';

test.beforeEach(async ({ page }) => { await page.goto('/'); await viderBase(page); });

// La bande flottante au-dessus des onglets, sur une ligne ; les champs passent au-dessus d'elle, la page défilée jusqu'en
// bas (v11, spec §13 : le soir ne tient plus sans défiler), jusqu'à la dernière carte, « Mes gratitudes » (v11).
async function atteignable(page, dernier = '#gratitudes') {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const zone = await page.locator(dernier).boundingBox();
  const flottants = await page.locator('.actions-flottantes').boundingBox();
  const onglets = await page.getByRole('navigation', { name: 'Navigation principale' }).boundingBox();
  expect(flottants.y + flottants.height).toBeLessThanOrEqual(onglets.y + 1);
  expect(zone.y + zone.height).toBeLessThanOrEqual(flottants.y);
  expect(await page.locator('.actions-flottantes').evaluate((b) => b.scrollWidth <= b.clientWidth)).toBe(true);
  // Chaque action reste dans la marge de droite (la bande ne déborde pas sous le bord de l'écran).
  const droite = await page.locator('.actions-flottantes').evaluate((b) => {
    const marge = parseFloat(getComputedStyle(b).paddingRight);
    return [...b.children].every((k) => k.getBoundingClientRect().right <= b.getBoundingClientRect().right - marge + 0.5);
  });
  expect(droite).toBe(true);
  for (const h of await page.locator('.actions-flottantes > *').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) {
    expect(h).toBeGreaterThanOrEqual(44);
    expect(h).toBeLessThan(60);
  }
}

test('les 5 champs du soir en 5 touchers, sans frappe, sans bouton Enregistrer ; la page défile jusqu\'aux points positifs et aux gratitudes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 797 });
  await toucher(page, 'Lieu', 'Bureau');
  await toucher(page, 'Sommeil', 'Moyen');
  await toucher(page, 'Contact humain', 'Oui');
  await toucher(page, 'Sport / mouvement', 'Non');
  await toucher(page, 'Traitement pris', 'Oui');
  // Le compteur d'explosions est masqué par défaut : les épisodes « Explosion » font foi. L'Humeur du
  // soir aussi (v6) : l'humeur du jour est la moyenne des humeurs du moment.
  await expect(groupe(page, 'Explosions')).toHaveCount(0);
  await expect(groupe(page, 'Humeur')).toHaveCount(0);
  await atteignable(page);
  // À 390 px : « Moment difficile » et « Émotion » en toutes lettres, chacun avec son carré.
  await expect(page.locator('.actions-flottantes .moment-difficile .libelle-action')).toBeVisible();
  await expect(page.locator('.actions-flottantes .moment .libelle-action')).toBeVisible();
  await expect(page.locator('.actions-flottantes .carre-action')).toHaveCount(2);
  await expect(page.getByRole('button', { name: /enregistrer/i })).toHaveCount(0);
  await expect(page.getByText('Enregistré')).toBeVisible();
  const entree = await entreeDuJour(page);
  expect(entree).toMatchObject({
    lieu: 'lieu:bureau', sommeilRessenti: 'sommeil:moyen', humeur: null, contactHumain: true,
    sportMouvement: false, explosions: null, traitementPris: 'traitementPris:oui',
  });
  await page.reload();
  await expect(groupe(page, 'Lieu').getByRole('button', { name: 'Bureau' })).toHaveAttribute('aria-pressed', 'true');
});

// Exigence v4 (docs/v4-specification.md) : ce pire cas tenait sans défiler à 390 et 375 × 797. En v7, chaque rubrique est
// une carte 2b : même resserrées (choix de 44, marges de 8), les 8 rubriques (9 depuis les gratitudes de la v11)
// dépassent d'environ 270 px, et aucune mise en page en cartes ne les fait tenir avec des cibles de 44. Cette exigence est
// EN ATTENTE de l'arbitrage de l'utilisateur (docs/decisions.md, « v7 : en attente de l'utilisateur ») ; en attendant, la
// page défile et chaque champ peut passer au-dessus de la bande du bas. L'ordre écrit ci-dessous n'a que 8 champs :
// normaliserJournee y ajoute « Mes gratitudes » juste après les points positifs.
test('pire cas : 9 champs (v11 : Mes gratitudes, ajoutée par normaliserJournee), Contact et Sport séparés : la page défile, rien ne reste sous la bande (390 et 375)', async ({ page }) => {
  await page.evaluate(() => window.__carnet.repo.meta.ecrire('journee', {
    ordre: ['lieu', 'contact', 'sommeil', 'humeur', 'sport', 'explosions', 'traitement', 'positifs'], masques: [],
  }));
  for (const largeur of [390, 375]) {
    await page.setViewportSize({ width: largeur, height: 797 });
    await page.reload();
    await expect(groupe(page, 'Explosions')).toHaveCount(1);
    await expect(page.locator('.deux-colonnes')).toHaveCount(0);
    // Chaque champ peut venir au-dessus de la bande : on fait défiler la page pour l'y poser, 8 px au-dessus.
    const auDessus = (selecteur) => page.evaluate((s) => {
      const el = document.querySelector(s);
      const bande = document.querySelector('.actions-flottantes').getBoundingClientRect().top;
      window.scrollBy(0, el.getBoundingClientRect().bottom - (bande - 8));
      return el.getBoundingClientRect().bottom <= bande;
    }, selecteur);
    for (const nom of ['Lieu', 'Contact humain', 'Sommeil', 'Humeur', 'Sport / mouvement', 'Explosions', 'Traitement pris']) {
      expect(await auDessus(`[role="group"][aria-label="${nom}"]`), nom).toBe(true);
    }
    expect(await auDessus('#points-positifs')).toBe(true);
    expect(await auDessus('#gratitudes')).toBe(true);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await toucher(page, 'Explosions', '0');
  await expect.poll(async () => (await entreeDuJour(page))?.explosions).toBe(0);
});

// 21 px (xxxLarge), 28 (AX1) et 33 (AX2) : d'abord « Moment difficile » ne garde que son carré, puis « + Épisode » que son
// « + ». « Émotion » garde son nom en entier et reste le plus large (P5) ; rien ne sort de son bouton.
test('grand texte iOS : la bande garde ses trois actions sur une ligne, « Moment difficile » puis « + Épisode » réduits', async ({ page }) => {
  for (const largeur of [390, 375]) {
    await page.setViewportSize({ width: largeur, height: 797 });
    for (const px of [21, 28, 33]) {
      const quoi = `${largeur} · ${px} px`;
      await page.evaluate((t) => { document.documentElement.style.fontSize = `${t}px`; document.body.style.fontSize = `${t}px`; }, px);
      const bande = page.locator('.actions-flottantes');
      await expect(bande.locator('.moment-difficile .libelle-action'), quoi).toBeHidden();
      if (px === 21) await expect(bande.locator('.fab .libelle-action'), quoi).toBeVisible();
      else await expect(bande.locator('.fab .libelle-action'), quoi).toBeHidden();
      await expect(page.getByRole('link', { name: 'Moment difficile' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Émotion du moment' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Épisode', exact: true })).toBeVisible();
      const m = await bande.evaluate((b) => {
        const marge = parseFloat(getComputedStyle(b).paddingRight);
        const emotion = b.querySelector('.moment');
        const libelle = emotion.querySelector('.libelle-action');
        return {
          dedans: [...b.children].every((k) => k.getBoundingClientRect().right <= b.getBoundingClientRect().right - marge + 0.5),
          debords: [...b.children].filter((k) => k.scrollWidth > k.clientWidth).map((k) => k.className),
          emotionEntier: libelle.scrollWidth <= libelle.clientWidth && libelle.getBoundingClientRect().width > 0,
          emotionPlusLarge: [...b.children].every((k) => k === emotion || k.getBoundingClientRect().width < emotion.getBoundingClientRect().width),
        };
      });
      expect(m, quoi).toEqual({ dedans: true, debords: [], emotionEntier: true, emotionPlusLarge: true });
    }
  }
});

test('un champ masqué qui porte une valeur reste affiché, et un second toucher l\'efface', async ({ page }) => {
  const hier = await page.evaluate(async () => {
    const { addDays } = await import('/js/domain/dates.js');
    const d = addDays(window.__carnet.repo.aujourdhui(), -1);
    await window.__carnet.repo.journal.patch(d, { explosions: 1, humeur: 5 });
    return d;
  });
  await page.evaluate((d) => { location.hash = `#/jour/${d}`; }, hier);
  await expect(groupe(page, 'Explosions').getByRole('button', { name: 'Explosions 1' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('link', { name: 'Émotion du moment' })).toHaveCount(0);
  await toucher(page, 'Explosions', '1');
  await expect.poll(async () => (await entreeDuJour(page, hier))?.explosions).toBeNull();
});

test('un second toucher efface le choix', async ({ page }) => {
  await toucher(page, 'Lieu', 'Bureau');
  await expect.poll(async () => (await entreeDuJour(page))?.lieu).toBe('lieu:bureau');
  await toucher(page, 'Lieu', 'Bureau');
  await expect(groupe(page, 'Lieu').getByRole('button', { name: 'Bureau' })).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => entreeDuJour(page)).toBeNull();
});

test('les points positifs sont enregistrés à la frappe et survivent au rechargement', async ({ page }) => {
  await page.locator('#points-positifs').fill('marche de 20 min');
  await expect.poll(async () => (await entreeDuJour(page))?.pointsPositifs).toBe('marche de 20 min');
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes('brouillon')))).toEqual([]);
  await page.reload();
  await expect(page.locator('#points-positifs')).toHaveValue('marche de 20 min');
});

test('un brouillon non enregistré est repris au retour', async ({ page }) => {
  const date = await page.evaluate(() => window.__carnet.repo.aujourdhui());
  await page.evaluate((d) => localStorage.setItem(`carnet:brouillon:${d}:pointsPositifs`, JSON.stringify('texte rattrapé')), date);
  await page.reload();
  await expect(page.locator('#points-positifs')).toHaveValue('texte rattrapé');
  await expect.poll(async () => (await entreeDuJour(page))?.pointsPositifs).toBe('texte rattrapé');
});

test('Dicter place le curseur dans le champ et affiche l\'aide', async ({ page }) => {
  await page.getByRole('button', { name: 'Dicter' }).first().click();
  await expect(page.locator('#points-positifs')).toBeFocused();
  await expect(page.getByText('Touche le micro du clavier pour parler.')).toBeVisible();
  await page.keyboard.insertText('dicté au clavier');
  await expect(page.getByText('Touche le micro du clavier pour parler.')).toHaveCount(0);
  await expect.poll(async () => (await entreeDuJour(page))?.pointsPositifs).toBe('dicté au clavier');
});

// v8 : « Nuit en détail » est masqué par défaut (spec §7 bis) ; réaffiché dans Réglages › Le soir, il reste le même.
test('nuit en détail, réaffiché : heures effaçables, réveils, résumé du repli', async ({ page }) => {
  await page.evaluate(() => window.__carnet.repo.meta.ecrire('journee', { masques: ['explosions', 'humeur'] }));
  await page.reload();
  await page.getByRole('button', { name: /Nuit en détail/ }).click();
  await page.locator('#coucher').fill('23:40');
  await page.locator('#lever').fill('07:10');
  await toucher(page, 'Réveils', '1');
  await expect.poll(async () => (await entreeDuJour(page))?.heureLever).toBe('07:10');
  await page.getByRole('button', { name: 'Effacer Lever' }).click();
  await expect.poll(async () => (await entreeDuJour(page))?.heureLever).toBeNull();
  await page.getByRole('button', { name: /Nuit en détail/ }).click();
  await expect(page.getByText('23:40 → · · 1 réveil')).toBeVisible();
});

