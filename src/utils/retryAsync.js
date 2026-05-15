// Reintentos para llamadas asíncronas (pensado para la generación de
// planes con IA). Solo reintenta si el predicado lo permite. Backoff
// fijo creciente: el intento 2 espera 1s, el 3 espera 2s.

const BACKOFF_MS = [0, 1000, 2000]; // espera ANTES del intento i (1-indexado)

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

// Heurística ajustada a cómo lanza errores src/services/anthropic.js
// (función llamarAPI):
//  - fetch caído (red/offline/DNS) → TypeError.
//  - !response.ok sin body útil (5xx/infra) → Error('Error al conectar con la IA').
//  - 429 → Error('Límite diario… Vuelve mañana.') — NO reintentable (cuota).
//  - El status real NO viaja en el Error (limitación conocida del backend),
//    por eso el match es por mensaje.
export function esErrorIAReintentable(err) {
  if (!err) return false;
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
