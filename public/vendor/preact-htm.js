// Point d'entrée unique de la vue. Seul ui/ importe ce fichier.
import { h, render, Fragment, createContext, createRef } from './preact.module.js';
import htm from './htm.module.js';
export { h, render, Fragment, createContext, createRef };
export { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, useReducer, useContext } from './hooks.module.js';
export const html = htm.bind(h);
