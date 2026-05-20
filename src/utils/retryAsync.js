// Reintentos para llamadas asíncronas (pensado para la generación de
// planes con IA). Solo reintenta si el predicado lo permite. Backoff
// fijo creciente: el intento 2 espera 1s, el 3 espera 2s.

const BACKOFF_MS = [0, 1000, 3000]; // espera ANTES del intento i (1-indexado, exponencial suave)

export async function retryAsync(fn, { maxAttempts = 3, esReintentable = () => false } = {}) {
  let ultimoError;
  for (let intento = 1; intento <= maxAttempts; intento++) {
    try {
      return await fn();
    } catch (err) {
      ultimoError = err;
      const quedanIntentos = intento < maxAttempts;
      if (!quedanIntentos || !esReintentable(err)) throw err;
      const espera = BACKOFF_MS[intento] ?? 2000;
      if (espera > 0) await new Promise((r) => setTimeout(r, espera));
    }
  }
  throw ultimoError;
}

// Códigos semánticos que adjunta llamarAPI (post-fix de manejo de
// errores). Si el Error trae `code`, esa es la fuente de verdad y
// la heurística por mensaje queda como fallback.
//
// Política: blindar la generación de plan contra blips transitorios.
// Reintentamos cualquier code que pueda ser un blip — incluso cuota
// Anthropic transitoria o 4xx genérico. Un retry barato no perjudica
// y cubre clasificaciones imperfectas del backend (p. ej. un 403
// momentáneo que se resuelve solo). Solo el rate limit propio
// (`limite_diario`) NO se reintenta — eso no cambia hasta mañana.
const CODES_NO_REINTENTABLES = new Set([
  'limite_diario',          // rate limit propio (20/día) — no se arregla reintentando
])
const CODES_REINTENTABLES = new Set([
  'servicio_saturado',      // 429/529 upstream (sobrecarga Anthropic)
  'servicio_inaccesible',   // 5xx, timeout, abort
  'servicio_no_disponible', // cuota/billing/401/403 (puede ser blip transitorio)
  'error_servicio',         // 4xx genérico (intentamos por las dudas)
  'red',                    // red caída en cliente / TypeError de fetch
])

// Heurística ajustada a cómo lanza errores src/services/anthropic.js
// (función llamarAPI):
//  - Errores con `code` semántico → decide por code (camino preferido).
//  - fetch caído (red/offline/DNS) → TypeError.
//  - 5xx/infra sin body útil → Error con status y mensaje en español.
//  - 429 propio (límite diario) → code='limite_diario', NO reintentable.
//  - JSON malformado de la IA → Error('parse'), NO reintentable.
export function esErrorIAReintentable(err) {
  if (!err) return false;

  // Camino preferido: code semántico.
  if (err.code) {
    if (CODES_NO_REINTENTABLES.has(err.code)) return false;
    if (CODES_REINTENTABLES.has(err.code)) return true;
  }

  const msg = String(err.message || err).toLowerCase();

  // Blacklist (tiene prioridad): cuota, auth, validación, JSON malformado.
  if (/parse|invalid|inválid|unauthorized|no autoriz|l[íi]mite|vuelve mañana|no se gener/.test(msg)) {
    return false;
  }
  if (typeof err.status === 'number' && err.status >= 400 && err.status < 500) {
    return false;
  }

  // Whitelist: red, timeout, 5xx, y el fallback genérico del backend.
  if (err instanceof TypeError || err.name === 'TypeError') return true;
  if (/fetch|network|timeout|failed to fetch|networkerror|load failed|error al conectar con la ia/.test(msg)) {
    return true;
  }
  if (typeof err.status === 'number' && err.status >= 500) return true;

  return false; // default conservador: ante la duda, no reintentar
}
