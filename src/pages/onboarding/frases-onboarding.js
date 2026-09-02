// frases-onboarding.js
// Frases rotatorias del estado de carga del slide 3 + respuesta de fallback.
//
// Idioma: español neutro/chileno con tuteo. NUNCA voseo argentino.
// Cada frase rota cada 2.5s mientras la API responde.
//
// Path: src/pages/onboarding/frases-onboarding.js
//
// ⚠️ Este archivo no comparte espacio con `src/pages/loading/frases.js`
// (el de la pantalla de generación de plan). Son sistemas independientes.

/**
 * Frases mostradas mientras Claude procesa el texto del padre/madre.
 * Tono: validante, en presente continuo, en primera persona de Huella.
 * Largo objetivo: 5–8 palabras · una frase completa.
 */
export const FRASES_ONBOARDING = [
  'Te estoy leyendo con calma.',
  'Buscando lo que tiene sentido aquí.',
  'Pensándolo con quienes saben de esto.',
  'Acercándome a lo que sentiste.',
];

/**
 * Respuesta de fallback si la API falla por cualquier motivo (sin conexion,
 * timeout de 15s, 429 de limite diario, 5xx, parse error, payload
 * incompleto) y tambien la que usa el MODO ENSAYO (?onboarding=1), donde no
 * se llama a la red a proposito.
 *
 * Es una FUNCION y no un objeto fijo desde el 2 sep 2026: ahora recibe el
 * nombre del hijo o hija y lo interpola. El acto A ya lo pidio, asi que un
 * fallback impersonal se notaba justo despues de una pantalla que si sabia
 * como se llama.
 *
 * Misma forma que el payload de exito: { comprension, cita, autor, marco }.
 *
 * Reglas del fallback:
 *   - El usuario NUNCA debe percibir que algo fallo.
 *   - La comprension es calida y lo bastante general para encajar con
 *     cualquier cosa que el padre/madre haya escrito (rabieta, sueno,
 *     comida, vinculo) — pero NO vacia.
 *   - La cita sale del banco AUTORES, igual que en el camino de exito.
 *   - El marco va en minusculas, breve, sin "marco de" ni comillas.
 *
 * @param {string} [nombre] Nombre del hijo o hija. Si no viene, se usa una
 *                         redaccion neutra que no deja el hueco a la vista.
 */
export function fallbackResponse(nombre) {
  const quien = (nombre || '').trim()
  const sujeto = quien || 'tu hijo o hija'
  return {
    comprension:
      `Te leo, y lo que cuentas es mucho más común de lo que parece desde adentro. ` +
      `A la edad de ${sujeto}, el freno que permite parar a tiempo todavía se está ` +
      `construyendo: no es algo que ya tenga y decida no usar.`,
    // Textual del pool de Daniel Siegel en AUTORES (src/services/anthropic.js).
    // Si esa entrada cambia, esta copia hay que actualizarla a mano.
    cita: 'conectar primero, redirigir después — no al revés',
    autor: 'Daniel Siegel',
    marco: 'desarrollo cerebral',
  }
}
