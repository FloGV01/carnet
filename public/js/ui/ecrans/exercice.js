// Un exercice de Bien-être (v7, spec §6.2), dans le lecteur (v8, spec §5 : ui/composants/lecteur.js). La route accepte
// d'autres identifiants : un exercice inconnu ramène à Bien-être.
import { html, useEffect } from '../lib.js';
import { Lecteur } from '../composants/lecteur.js';
import { exerciceDe } from '../../domain/exercices.js';

export function Exercice({ id }) {
  const ex = exerciceDe(id);
  useEffect(() => { if (!ex) location.hash = '#/bien-etre'; }, [ex]);
  return ex ? html`<${Lecteur} seance=${ex} />` : null;
}
