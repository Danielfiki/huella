import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { estaEnAppAndroid } from '../pages/portada/destinoRaiz'

// ──────────────────────────────────────────────────────────────────────
// Google Play Billing en la app de Android (TWA), vía Digital Goods API.
//
// Regla: si algo falta o falla —no es la app de Android, Chrome no expone
// getDigitalGoodsService, Google no devuelve los productos— la respuesta es
// `null` y la app se comporta EXACTAMENTE como desde el 6 oct: sin ninguna
// opción de compra. La web y el iPhone nunca entran acá (Mercado Pago).
//
// Productos (Play Console): dos suscripciones, cada una con UN plan base y UNA
// oferta de prueba gratis. La librería de Google (androidbrowserhelper billing)
// solo mira el primer plan base de cada suscripción, por eso no se usan varios
// planes base dentro de una misma suscripción.
// ──────────────────────────────────────────────────────────────────────

const METODO = 'https://play.google.com/billing'
export const PRODUCTO = { mensual: 'huella_pro_mensual', anual: 'huella_pro_anual' }

let promesa = null      // se consulta a Google una sola vez por carga de la app
let resultado          // undefined = todavía consultando; null = sin Google Play
const oyentes = new Set()

function avisar() { oyentes.forEach((f) => f(resultado)) }

// Corta lo que Google tarde de más: sin respuesta, no hay compra que ofrecer.
const conTope = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('tope')), ms))])

// "P7D" → 7, "P1W" → 7. Lo que no se entienda da null y no se promete prueba.
export function diasDePrueba(periodo) {
  const m = /^P(?:(\d+)W)?(?:(\d+)D)?$/.exec(periodo || '')
  if (!m || (!m[1] && !m[2])) return null
  return Number(m[1] || 0) * 7 + Number(m[2] || 0)
}

// El precio tal como lo entrega Google, en el mismo formato que el resto de la
// app ("CLP 7.990"). Nunca escrito a mano.
export function formatoPrecio(precio) {
  const valor = Number(precio?.value)
  if (!precio?.currency || !Number.isFinite(valor)) return null
  try {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: precio.currency, currencyDisplay: 'code' })
      .format(valor).replace(/ /g, ' ')
  } catch {
    return `${precio.currency} ${valor}`
  }
}

// La hoja de pago de Google solo abre dentro de Chrome. Samsung Internet entrega
// los precios pero show() falla con "AbortError: invalid state" (9 oct), así que
// la app de Android abierta en Samsung Internet —u otro navegador, o sin
// PaymentRequest— queda como sin Google Play: sin ninguna opción de compra.
const NAVEGADOR_NO_CHROME = /SamsungBrowser|EdgA|OPR\/|YaBrowser|Firefox|UCBrowser|MiuiBrowser|HuaweiBrowser|Vivaldi/i
function hojaDePagoDisponible() {
  return typeof window.PaymentRequest === 'function' && !NAVEGADOR_NO_CHROME.test(navigator.userAgent || '')
}

async function consultar() {
  if (!estaEnAppAndroid() || typeof window.getDigitalGoodsService !== 'function' || !hojaDePagoDisponible()) return null
  try {
    const servicio = await conTope(window.getDigitalGoodsService(METODO), 5000)
    if (!servicio) return null
    const detalles = await conTope(servicio.getDetails(Object.values(PRODUCTO)), 8000)
    const de = (id) => (detalles || []).find((d) => d.itemId === id && formatoPrecio(d.price))
    const mensual = de(PRODUCTO.mensual), anual = de(PRODUCTO.anual)
    if (!mensual || !anual) return null
    let compras = []
    try {
      compras = (await conTope(servicio.listPurchases(), 8000) || [])
        .filter((c) => Object.values(PRODUCTO).includes(c.itemId))
    } catch { /* sin lista de compras: se ofrece igual, Google evita la doble compra */ }
    return { servicio, mensual, anual, compras }
  } catch (err) {
    console.warn('[play] Digital Goods no disponible:', err?.message)
    return null
  }
}

export function cargarPlay() {
  promesa ??= consultar().then((r) => { resultado = r; avisar(); return r })
  return promesa
}

// Hook: undefined mientras se consulta, null si no hay Google Play; si hay, los
// dos productos con su precio y las compras que Google ya tiene de esta cuenta.
export function usePlayBilling() {
  const [play, setPlay] = useState(resultado)
  useEffect(() => {
    oyentes.add(setPlay)
    // Lo que cambió entre el primer render y esta suscripción (ej. el error del
    // servidor justo después de comprar, mientras /cuenta lleva a Tú).
    setPlay(resultado)
    if (estaEnAppAndroid()) cargarPlay()
    return () => oyentes.delete(setPlay)
  }, [])
  return play
}

async function verificarEnServidor(purchaseToken) {
  const { data: { session } } = await supabase.auth.getSession()
  const r = await fetch('/api/play-verificar', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${session?.access_token ?? ''}` },
    body: JSON.stringify({ purchaseToken }),
  })
  const j = await r.json().catch(() => ({}))
  return { ok: r.ok, pro: Boolean(j.pro), code: j.code ?? null, detalle: j.detalle ?? null, status: r.status }
}

// Lo que respondió el servidor cuando no pudo activar la compra, tal cual.
function mensajeErrorServidor(v) {
  return `No se pudo activar tu plan: ${v.code || 'error'} ${v.detalle || ''} (${v.status})`.replace(/\s+/g, ' ')
}

// El último fallo del servidor queda en el resultado para que Tú lo muestre
// junto a "Administrar suscripción" (compra en Google, plan sin activar).
function anotarErrorServidor(mensaje) {
  if (!resultado || resultado.errorServidor === mensaje) return
  resultado = { ...resultado, errorServidor: mensaje }
  avisar()
}

// Compra con la hoja de pago de Google. Devuelve:
//   { estado: 'activo' }      Google cobró (o empezó la prueba) y el servidor activó Pro
//   { estado: 'pendiente' }   Google confirmó la compra pero el servidor aún no la activa
// y lanza si la hoja no se pudo abrir o se cerró sin comprar. Incluye el
// AbortError: Chrome usa ese mismo error cuando el papá cierra la hoja y cuando
// Google Play la cierra solo por un problema (8 oct: se abría y se cerraba sin
// aviso), así que se muestra en pantalla con mensajeErrorPlay.
export async function comprarConPlay(ciclo) {
  const itemId = PRODUCTO[ciclo]
  const play = await cargarPlay()
  if (!play || !itemId) throw new Error('Google Play no disponible')
  const detalle = ciclo === 'anual' ? play.anual : play.mensual
  const pedido = new PaymentRequest(
    [{ supportedMethods: METODO, data: { sku: itemId } }],
    { total: { label: 'Huella Pro', amount: { currency: detalle.price.currency, value: '0' } } },
  )
  const respuesta = await pedido.show()
  const token = respuesta?.details?.purchaseToken ?? respuesta?.details?.token
  // Ya comprado: deja de ofrecerse aunque el servidor tarde en activar.
  if (token && resultado) {
    resultado = { ...resultado, compras: [...resultado.compras, { itemId, purchaseToken: token }] }
    avisar()
  }
  let v = { ok: false }
  if (token) {
    try { v = await verificarEnServidor(token) } catch (err) { v = { ok: false, code: 'sin_conexion', detalle: err?.message, status: 0 } }
  }
  await respuesta.complete(v.ok ? 'success' : 'unknown').catch(() => {})
  // Se reintenta solo al abrir la app; mientras, se ve qué dijo el servidor.
  const error = token && !v.ok ? mensajeErrorServidor(v) : null
  anotarErrorServidor(error)
  return { estado: v.ok && v.pro ? 'activo' : 'pendiente', error }
}

// Al abrir la app: lo que Google ya tiene comprado por esta cuenta se manda al
// servidor para activar (o bajar) el Pro. Devuelve true si alguna quedó activa.
export async function restaurarComprasPlay() {
  const play = await cargarPlay()
  if (!play?.compras?.length) return false
  let activo = false, error = null
  for (const c of play.compras) {
    let v
    try { v = await verificarEnServidor(c.purchaseToken) } catch (err) { v = { ok: false, code: 'sin_conexion', detalle: err?.message, status: 0 } }
    activo = v.pro || activo
    if (!v.ok) error = mensajeErrorServidor(v)
  }
  anotarErrorServidor(activo ? null : error)
  return activo
}

// Todo lo que dicen las pantallas de compra en Android, con los precios de
// Google. La prueba gratis se promete solo si Google la trae para esta cuenta
// (quien ya la usó no la recibe).
export function textosPlay(play, ciclo) {
  const d = ciclo === 'anual' ? play.anual : play.mensual
  const precio = formatoPrecio(d.price)
  const dias = diasDePrueba(d.freeTrialPeriod)
  const cada = ciclo === 'anual' ? 'al año' : 'al mes'
  const m = Number(play.mensual.price.value), a = Number(play.anual.price.value)
  const meses = Math.floor((m * 12 - a) / m)
  return {
    precioMensual: formatoPrecio(play.mensual.price),
    precioAnual: formatoPrecio(play.anual.price),
    ahorro: meses >= 1 ? `${meses} ${meses === 1 ? 'mes' : 'meses'} gratis` : null,
    aviso: dias
      ? `Los primeros ${dias} días son gratis. Después se cobran ${precio} ${cada}, y puedes cancelar cuando quieras desde Google Play.`
      : `Se cobran ${precio} ${cada}. Puedes cancelar cuando quieras desde Google Play.`,
    cta: dias ? `Probar ${dias} días gratis` : 'Activar Huella Pro',
  }
}

export const MENSAJE_PENDIENTE = 'Google Play confirmó tu compra. Estamos activando tu plan, puede tardar unos minutos.'
// Con el nombre y el texto del error tal cual, para saber qué dijo Google.
export function mensajeErrorPlay(err) {
  return `No se pudo abrir el pago: ${err?.name || 'Error'} ${err?.message || ''}`.trim()
}

// Se ofrece comprar solo con Google Play disponible, sin Pro (por Mercado Pago,
// beta o Google) y sin una compra de Google ya hecha en esta cuenta.
export function ofrecerCompraPlay(play, esPro) {
  return Boolean(play && !esPro && !play.compras.length)
}

// Página de suscripciones de Google Play para esta app.
export function urlAdministrarSuscripcion(itemId) {
  const sku = itemId ? `sku=${encodeURIComponent(itemId)}&` : ''
  return `https://play.google.com/store/account/subscriptions?${sku}package=lat.huella.app`
}
