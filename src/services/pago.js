import { supabase } from '../lib/supabase'

// Inicia una suscripción de Huella Pro en Mercado Pago para el ciclo elegido
// ('mensual' | 'anual'). Reutiliza el patrón validado de CuentaPage:
// sesión de Supabase → POST /api/mp-crear-suscripcion → init_point.
//
// NO hace el redirect adentro a propósito: devuelve el init_point y deja que
// cada UI (CuentaPage, UpgradeModal) maneje su propio estado de carga y el
// window.location.href. Así hay UNA sola fuente de verdad del flujo de pago.
//
// Lanza un Error si la pasarela no responde con un init_point; el caller lo
// captura y muestra un error suave.
export async function iniciarSuscripcion(ciclo) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/mp-crear-suscripcion', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({ ciclo }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.init_point) {
    const err = new Error('No se pudo iniciar la suscripción')
    err.detail = data
    throw err
  }
  return data.init_point
}
