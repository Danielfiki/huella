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
 * Respuesta de fallback si la API falla por cualquier motivo
 * (sin conexión, timeout, 5xx, parse error, payload incompleto).
 *
 * Misma forma que el payload de éxito esperado:
 *   { comprension: string, cita: string, autor: string, marco: string }
 *
 * Reglas del fallback:
 *   - El usuario NUNCA debe percibir que algo falló.
 *   - La comprensión es cálida y suficientemente genérica para encajar con
 *     cualquier cosa que el padre/madre haya escrito (rabieta, sueño, comida,
 *     vínculo, etc.) — pero NO vacía.
 *   - La cita es real, atribuida correctamente. Janet Lansbury fue elegida
 *     porque su voz es transversal a la edad y al tipo de episodio.
 *   - El marco aplicado se nombra en minúsculas, breve, sin "marco de" ni
 *     citas internas.
 */
export const FALLBACK_RESPONSE = {
  comprension:
    'Te leo. A esta edad, la corteza prefrontal de tu hijo aún está en construcción — por eso no puede frenar el impulso cuando algo lo desborda. El grito es desregulación, no desafío.\n\nEn Huella vas a entender por qué pasa cada episodio, y qué hacer con eso.',
  cita: 'Los berrinches son el resultado de una inmadurez cerebral, no de una mala crianza.',
  autor: 'Daniel Siegel',
  marco: 'desarrollo cerebral',
};
