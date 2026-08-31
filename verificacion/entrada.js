// Punto de entrada del bundle de verificacion. Expone los DOS AuthProvider
// reales (el de antes del fix, rescatado de git, y el de ahora) mas los shims,
// para que el harness de Node los maneje con el mismo driver.

export { AuthProvider as AuthProviderDespues } from '../src/context/AuthContext.jsx'
export { AuthProvider as AuthProviderAntes } from './AuthContext.ANTES.jsx'
export { default as SplashArranque } from '../src/components/ui/SplashArranque.jsx'

export * as react from './shim/react.js'
export * as supa from './shim/supabase.js'
