import { useEffect, useRef, useState, useCallback } from './lib.js';
import { etatApp } from '../store.js';

export function useEtatApp(selecteur = (e) => e) {
  const [val, setVal] = useState(() => selecteur(etatApp.lire()));
  useEffect(() => etatApp.abonner((e) => setVal(selecteur(e))), []);
  return val;
}

// Charge des données et recharge quand la base change (sauf si `suivre` est faux).
export function useDonnees(charger, deps = [], { suivre = true } = {}) {
  const version = useEtatApp((e) => (suivre ? e.versionDonnees || 0 : 0));
  const [etat, setEtat] = useState({ chargement: true, donnees: null, erreur: null });
  useEffect(() => {
    let actif = true;
    Promise.resolve().then(charger).then(
      (donnees) => { if (actif) setEtat({ chargement: false, donnees, erreur: null }); },
      (erreur) => { if (actif) setEtat((p) => ({ ...p, chargement: false, erreur })); },
    );
    return () => { actif = false; };
  }, [...deps, version]);
  return etat;
}

// Indicateur discret « Enregistré » (1,5 s) ou message d'échec.
export function useIndicateur() {
  const [etat, setEtat] = useState('repos');
  const minuteur = useRef(null);
  const signaler = useCallback((e) => {
    clearTimeout(minuteur.current);
    setEtat(e);
    if (e === 'ok') minuteur.current = setTimeout(() => setEtat('repos'), 1500);
  }, []);
  useEffect(() => () => clearTimeout(minuteur.current), []);
  return [etat, signaler];
}

// Écriture avec nouvel essai : 3 tentatives espacées, l'indicateur suit.
export async function ecrireAvecEssais(action, signaler, { essais = 3, delaiMs = 1500 } = {}) {
  for (let i = 0; i < essais; i++) {
    try {
      const r = await action();
      signaler('ok');
      return r;
    } catch (e) {
      if (e && (e.code === 'VALIDATION' || e.name === 'ErreurValidation')) { signaler('echec'); throw e; }
      signaler('echec');
      if (i === essais - 1) throw e;
      await new Promise((ok) => setTimeout(ok, delaiMs));
    }
  }
  return undefined;
}

export function lireLocal(cle, defaut = null) {
  if (!cle) return defaut;
  try { const v = localStorage.getItem(cle); return v == null ? defaut : JSON.parse(v); } catch { return defaut; }
}
export function ecrireLocal(cle, valeur) {
  if (!cle) return;
  try { if (valeur == null) localStorage.removeItem(cle); else localStorage.setItem(cle, JSON.stringify(valeur)); } catch { /* stockage indisponible */ }
}
