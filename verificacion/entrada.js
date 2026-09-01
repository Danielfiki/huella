// Punto de entrada del bundle de verificacion. Expone los DOS AuthProvider
// reales (el de antes del fix, rescatado de git, y el de ahora) mas los shims,
// para que el harness de Node los maneje con el mismo driver.

export { AuthProvider as AuthProviderDespues } from '../src/context/AuthContext.jsx'
export { AuthProvider as AuthProviderAntes } from './AuthContext.ANTES.jsx'
export { default as SplashArranque } from '../src/components/ui/SplashArranque.jsx'

export * as react from './shim/react.js'
export * as supa from './shim/supabase.js'

// ── Voz ────────────────────────────────────────────────────────────────────
// Los DOS VoiceTextarea reales: el de antes del fix de la escalera (rescatado
// de git) y el de ahora. Mismo driver para los dos.
export { default as VoiceTextareaDespues } from '../src/components/ui/VoiceTextarea.jsx'
export { default as VoiceTextareaAntes } from './VoiceTextarea.ANTES.jsx'
export * as voz from './shim/speech.js'
// El fix 01ad956: paso la suite y fallo en el Android real. Se congela para que
// la suite demuestre POR QUE fallo, no solo que ya no falla.
export { default as VoiceTextareaQaFallado } from './VoiceTextarea.QA-FALLADO.jsx'
