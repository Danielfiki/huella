// JSX falso: devuelve un descriptor y no renderiza. AuthProvider solo envuelve
// a sus children, asi que no hace falta nada mas.
export function jsx(tipo, props) { return { tipo, props } }
export const jsxs = jsx
export const jsxDEV = jsx
export const Fragment = Symbol('Fragment')
