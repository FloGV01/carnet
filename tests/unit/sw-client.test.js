// v12 (8/9, spec v12 §7) : la nouvelle version dans Safari. Hors de l'app installée, Emozio n'affiche que le guide
// d'installation (ou la page du code de Spotify) ; une version qui attend s'y applique seule, une fois, puis la page recharge
// une fois. Jamais en mode app (le bandeau reste), jamais sur la page du code de Spotify, jamais sur un écran de saisie.
// Point de vigilance 5 : jamais en boucle. Un faux service worker en mémoire : aucun réseau, aucun navigateur.
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Chaque essai charge son propre exemplaire du module : l'enregistrement et la demande de rechargement y sont des variables
// de module, qu'un essai ne doit pas laisser au suivant.
let n = 0;
const charger = () => import(`../../public/js/plateforme/sw-client.js?essai=${n += 1}`);

const SKIP = { type: 'SKIP_WAITING' };

// Une fenêtre factice : un enregistrement dont la version en attente note les messages reçus, et des écouteurs appelables.
function fenetre({ hostname = 'emozio.exemple.test', search = '', attend = true, controle = true } = {}) {
  const ecouteurs = { sw: {}, reg: {}, doc: {} };
  const messages = [];
  const enAttente = () => ({ postMessage: (m) => messages.push(m) });
  const reg = {
    waiting: attend ? enAttente() : null,
    installing: null,
    addEventListener: (t, f) => { ecouteurs.reg[t] = f; },
    update: async () => {},
  };
  const desinscrits = [];
  const win = {
    location: { hostname, search, reload: () => { win.recharges += 1; } },
    navigator: {
      serviceWorker: {
        controller: controle ? {} : null,
        register: async () => reg,
        getRegistrations: async () => [{ unregister: async () => { desinscrits.push(1); } }],
        addEventListener: (t, f) => { ecouteurs.sw[t] = f; },
      },
    },
    document: { visibilityState: 'visible', addEventListener: (t, f) => { ecouteurs.doc[t] = f; } },
    recharges: 0,
  };
  // Une nouvelle version arrive pendant que la page est ouverte : installée, elle attend.
  const nouvelleVersion = () => {
    const nouveau = { state: 'installing', addEventListener: (t, f) => { nouveau.surEtat = f; } };
    reg.installing = nouveau;
    ecouteurs.reg.updatefound();
    nouveau.state = 'installed';
    reg.installing = null;
    reg.waiting = enAttente();
    nouveau.surEtat();
  };
  const activer = () => ecouteurs.sw.controllerchange();
  return { win, reg, messages, ecouteurs, nouvelleVersion, activer, desinscrits };
}

test('doitAppliquerSeule : seulement sur le guide, hors mode app ; jamais en mode app, sur la page du code ou sur un écran de saisie', async () => {
  const { doitAppliquerSeule } = await charger();
  assert.equal(doitAppliquerSeule({ modeApp: false, guide: true, pageCode: false }), true, 'Safari, le guide');
  assert.equal(doitAppliquerSeule({ modeApp: true, guide: false, pageCode: false }), false, 'l\'app installée : le bandeau reste');
  assert.equal(doitAppliquerSeule({ modeApp: true, guide: true, pageCode: false }), false, 'l\'app installée, guide forcé en local');
  assert.equal(doitAppliquerSeule({ modeApp: false, guide: true, pageCode: true }), false, 'la page du code de Spotify : le code serait perdu');
  assert.equal(doitAppliquerSeule({ modeApp: false, guide: false, pageCode: false }), false, 'en local, hors mode app, l\'app et ses saisies');
  assert.equal(doitAppliquerSeule({ modeApp: false, guide: false, pageCode: true }), false);
});

test('hors mode app : une version qui attend déjà s\'applique seule, une fois, sans bandeau ; puis un seul rechargement', async () => {
  const { initialiserSw } = await charger();
  const f = fenetre();
  let bandeau = 0;
  await initialiserSw({ surMajDisponible: () => { bandeau += 1; }, appliquerSeule: true, win: f.win });
  assert.deepEqual(f.messages, [SKIP]);
  assert.equal(bandeau, 0, 'le bandeau n\'existe pas hors mode app');
  assert.equal(f.win.recharges, 0, 'rien ne recharge avant que la nouvelle version prenne la main');
  f.activer();
  assert.equal(f.win.recharges, 1);
  // Jamais en boucle : un second changement de version ne recharge pas une seconde fois cette page.
  f.activer();
  assert.equal(f.win.recharges, 1);
});

test('hors mode app : une version qui arrive pendant que la page est ouverte s\'applique seule ; une autre ensuite ne relance rien', async () => {
  const { initialiserSw } = await charger();
  const f = fenetre({ attend: false });
  let bandeau = 0;
  await initialiserSw({ surMajDisponible: () => { bandeau += 1; }, appliquerSeule: true, win: f.win });
  assert.deepEqual(f.messages, [], 'rien n\'attend à l\'ouverture');
  f.nouvelleVersion();
  assert.deepEqual(f.messages, [SKIP]);
  // Une seconde version avant la prise de main de la première : appliquerMaj n'est pas rappelée.
  f.nouvelleVersion();
  assert.deepEqual(f.messages, [SKIP], 'une fois');
  f.activer();
  f.activer();
  assert.equal(f.win.recharges, 1, 'un seul rechargement');
  assert.equal(bandeau, 0);
});

test('en mode app, rien ne change : le bandeau, et le rechargement seulement après son toucher', async () => {
  const { initialiserSw, appliquerMaj } = await charger();
  const f = fenetre();
  let bandeau = 0;
  await initialiserSw({ surMajDisponible: () => { bandeau += 1; }, win: f.win });
  assert.equal(bandeau, 1);
  assert.deepEqual(f.messages, [], 'jamais appliquée seule');
  // Une version prise par un autre onglet : pas de rechargement sans le toucher.
  f.activer();
  assert.equal(f.win.recharges, 0);
  f.nouvelleVersion();
  assert.equal(bandeau, 2);
  assert.deepEqual(f.messages, []);
  // « Recharger » : la version s'applique, puis la page recharge, une fois.
  assert.equal(appliquerMaj(), true);
  assert.deepEqual(f.messages, [SKIP]);
  f.activer();
  f.activer();
  assert.equal(f.win.recharges, 1);
});

test('la première installation n\'applique ni ne signale rien, dans les deux modes', async () => {
  for (const appliquerSeule of [true, false]) {
    const { initialiserSw } = await charger();
    const f = fenetre({ controle: false });
    let bandeau = 0;
    await initialiserSw({ surMajDisponible: () => { bandeau += 1; }, appliquerSeule, win: f.win });
    assert.deepEqual(f.messages, [], `appliquerSeule : ${appliquerSeule}`);
    assert.equal(bandeau, 0);
    // La première version prend la main (clients.claim) : la page ne recharge pas.
    f.activer();
    assert.equal(f.win.recharges, 0);
  }
});

test('en local sans ?sw : le service worker est retiré, rien n\'est appliqué', async () => {
  const { initialiserSw, appliquerMaj } = await charger();
  const f = fenetre({ hostname: '127.0.0.1' });
  assert.equal(await initialiserSw({ surMajDisponible: () => assert.fail('aucun bandeau'), appliquerSeule: true, win: f.win }), null);
  assert.equal(f.desinscrits.length, 1);
  assert.deepEqual(f.messages, []);
  assert.equal(appliquerMaj(), false);
});
