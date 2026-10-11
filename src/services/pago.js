import { supabase } from '../lib/supabase'
import { estaEnAppAndroid } from '../pages/portada/destinoRaiz'

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
  // En la app de Android no se cobra fuera de Google Play (politica de pagos).
  if (estaEnAppAndroid()) throw new Error('Pago no disponible en la app de Android')
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

// Pro pagado con Mercado Pago: si viene de ahí, si ya está cancelado y hasta
// cuándo está pagado. accion 'consultar' | 'cancelar' (POST /api/mp-suscripcion).
async function llamarSuscripcion(accion) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/mp-suscripcion', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({ accion }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error('mp-suscripcion ' + accion + ' ' + res.status)
    err.detail = data
    throw err
  }
  return data
}

export const consultarSuscripcionMP = () => llamarSuscripcion('consultar')
export const cancelarSuscripcionMP = () => llamarSuscripcion('cancelar')
