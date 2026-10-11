// Precios de Huella Pro en la web (Mercado Pago), desde el 11 oct 2026. Sin
// prueba gratis: Mercado Pago no la acepta en suscripciones sin plan, que es
// como las crea api/mp-crear-suscripcion.js (ver ESTADO.md, 11 oct). El monto
// que se cobra vive allá; si cambia uno, cambia el otro.
//
// La app de Android no usa esto: muestra los precios que entrega Google Play.

export const PRECIO_WEB = { mensual: 7990, anual: 59990 }

const formato = (monto) => `CLP ${monto.toLocaleString('es-CL')}`

// Mismo cálculo que el "Ahorras X%" de Android (playBilling.textosPlay).
const porcentaje = Math.round((1 - PRECIO_WEB.anual / (PRECIO_WEB.mensual * 12)) * 100)

export function textosWeb(ciclo) {
  const anual = ciclo === 'anual'
  return {
    precioMensual: formato(PRECIO_WEB.mensual),
    precioAnual: formato(PRECIO_WEB.anual),
    ahorro: `Ahorras ${porcentaje}%`,
    aviso: `Se cobran ${formato(anual ? PRECIO_WEB.anual : PRECIO_WEB.mensual)} ${anual ? 'al año' : 'al mes'}. Se renueva automáticamente hasta que canceles.`,
  }
}
